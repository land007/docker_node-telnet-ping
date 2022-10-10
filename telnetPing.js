const net = require('net');
const ping = require("net-ping");
const EventProxy = require('eventproxy');
const Bagpipe = require('bagpipe');
const ep = new EventProxy();
const session = ping.createSession ();

var HostPipeMax = parseInt(process.env['HOSTPIPEMAX'] || '500');// 同时任务数
var PortPipeMax = parseInt(process.env['PORTPIPEMAX'] || '5');// 同时任务数
var CDuans = (process.env['CDUANS'] || '192.168.1.').split(',');// C类IP段

var OutTime = 10 * 1000;
var hosts = [];
var ip_duan = function(duan) {
	for(let j = 0; j < 255; j++) {
		hosts[hosts.length] = duan + j;
	}
};

for(let c in CDuans) {
	ip_duan(CDuans[c]);
}

var ports = [];
//for(let k = 1; k < 65535; k++) {
//	ports[ports.length] = k;
//}

for(let k = 1; k <= 1024; k++) {
	ports[ports.length] = k;
}
//ip_duan('192.168.1.');

//var ports = [1, 65535];
//var ports = [22];
//var ports = [65022];
//var ports = [22, 65022];
//var ports = [3389];
//var ports = [33890];
//var ports = [3389, 33890];
ports = [21, 22, 23,  80, 443, 1433, 1521, 3306, 6379, 7001, 8080, 9080, 27017, 65022, 3389, 33890, 65089];
PortPipeMax = ports.length;
console.log('PortPipeMax', PortPipeMax);
//var ports = [22, 80];
//var ports = [79, 80];
//var ports = [445, 445];
//var ports = [1, 1000];
//var ports = [80, 554];
//var ports = [9999];
HostPipeMax = 4000/PortPipeMax;
console.log('HostPipeMax', HostPipeMax);
var hostBagpipe = new Bagpipe(HostPipeMax);
var TimeOut = {};

var _scanPort = function (j, _host, _port, callback) {
	   let port = undefined;
	   TimeOut[_host+':'+_port] = setTimeout(function(){
			callback({j, host: _host, port: _port, info: undefined});
		}, OutTime);
	    let item = net.connect({
	            host: _host,
	            port: _port
	        },
	        function(_port) {
	            return function() {
	            	port = _port;
	                this.destroy();
	            };
	        }(_port)
	    );
	    item.on('error', function(err) {
//	        console.log('error' + err);
	        if (err.errno == 'ECONNREFUSED') {
	            this.destroy();
	        }
	    });
	    item.on('close', function() {
//	    	console.log('close', { j, host: _host, port: _port, info: port});
	    	callback({j, host: _host, port: _port, info: port});
            clearTimeout(TimeOut[_host+':'+_port]);
	    });
};

var _scanPorts = function(i, host, ports, callback) {
	let portBagpipe = new Bagpipe(PortPipeMax);
//	let timeOut = setTimeout(function(){
//		callback({i, host , info: undefined});
//	}, 6 * 10 * 1000);
    ep.after('get_ports' + host, ports.length, function (infos) {
//    	console.log('get_ports(2)' + host, infos);
		let result = [];
        //console.log('infos', infos);
        // infos [ { j: 0, host: '198.10.71.254', port: 21, info: undefined },
        // { j: 1, host: '198.10.71.254', port: 22, info: undefined },
        // { j: 2, host: '198.10.71.254', port: 23, info: undefined },
        // { j: 3, host: '198.10.71.254', port: 80, info: undefined },
        // { j: 4, host: '198.10.71.254', port: 443, info: undefined },
        // { j: 5, host: '198.10.71.254', port: 1433, info: undefined },
        // { j: 6, host: '198.10.71.254', port: 1521, info: undefined },
        // { j: 7, host: '198.10.71.254', port: 3306, info: undefined },
        // { j: 8, host: '198.10.71.254', port: 6379, info: undefined },
        // { j: 9, host: '198.10.71.254', port: 7001, info: undefined },
        // { j: 10, host: '198.10.71.254', port: 8080, info: undefined },
        // { j: 11, host: '198.10.71.254', port: 9080, info: undefined },
        // { j: 12, host: '198.10.71.254', port: 27017, info: undefined },
        // { j: 13, host: '198.10.71.254', port: 65022, info: undefined },
        // { j: 14, host: '198.10.71.254', port: 3389, info: undefined },
        // { j: 15, host: '198.10.71.254', port: 33890, info: undefined },
        // { j: 16, host: '198.10.71.254', port: 65089, info: undefined } ]
        infos.sort(compare('j'));
        for(let k in infos) {
            let info = infos[k];
            if(info.info) {
                result.push(info.port);
            }
        }
        ////console.log('get_ports(2)', {i, host , info: result});
		if(result.length > 0) {
			callback({i, host , info: result});
		} else {//没扫描到端口ping
            //console.log('=============', host);
			session.pingHost (host, function (error, target) {
			    if (!error) {
					result.push(0);
				}
				callback({i, host , info: result});
			});
		}
//		clearTimeout(timeOut);
	});
//	console.log('host' + host);
//	console.log('ports' + ports);
	for (let j = 0; j < ports.length; j++) {
		let port = ports[j];
		portBagpipe.push(_scanPort, j, host, port, function (info) {
//			console.log('get_ports(1)' + host, j, host, port, info);
			ep.emit('get_ports' + host, {j: info.j, host: info.host, port: info.port, info: info.info});
		});
	}
};

var compare = function (name){
    return function(a,b){
        var value1 = a[name];
        var value2 = b[name];
        return value1 - value2;
    }
};

var start = function(hosts, ports) {
	ep.after('get_hosts', hosts.length, function (infos) {
		infos.sort(compare('i'));
		let count = 0;
		for(let i in infos) {
			let info = infos[i];
			if(info.info.length > 0) {
				count++;
				console.log('get_hosts{2}', count, info.host , info.info);
			}
		}
	});
	for (let i = 0; i < hosts.length; i++) {
		let host = hosts[i];
		////console.log('get_hosts(0)', i, host, ports);
		hostBagpipe.push(_scanPorts, i, host, ports, function (info) {
			////console.log('get_hosts(1)', i, host, ports, info);
			ep.emit('get_hosts', {i: info.i, host: info.host, info: info.info});
		});
	}
};

start(hosts, ports);