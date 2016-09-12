FROM node

RUN mkdir -p /usr/src/nodejs/exchangeIO
COPY . /usr/src/nodejs/exchangeIO
WORKDIR /usr/src/nodejs/exchangeIO/lib

EXPOSE 8000
