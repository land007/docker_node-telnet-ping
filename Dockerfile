FROM land007/node:latest

MAINTAINER Yiqiu Jia <yiqiujia@hotmail.com>

RUN . $HOME/.nvm/nvm.sh && cd / && npm install net-ping
ADD telnetPing.js /node_

ENV HOSTPIPEMAX=500\
	PORTPIPEMAX=5\
	CDUANS=192.168.1.

#docker build -t land007/node-telnet-ping:latest .
#> docker buildx build --platform linux/amd64,linux/arm64/v8,linux/arm/v7 -t land007/node-telnet-ping --push .
#> docker buildx build --platform linux/amd64 -t land007/node-telnet-ping --push .
#docker run --rm -it --name node-telnet-ping -v ~/docker/node-telnet-ping:/node land007/node-telnet-ping:latest
#docker exec -it node-telnet-ping bash
#docker save -o node-telnet-ping.tar land007/node-telnet-ping:latest
#chmod 777 node-telnet-ping.tar
#gzip node-telnet-ping.tar
#docker load -i node-telnet-ping.tar.gz
