FROM node:12-alpine

WORKDIR /app

COPY [".env","package.json", "package-lock.json*", "./"]

RUN apk --no-cache add \
      bash \
      g++ \
      ca-certificates \
      lz4-dev \
      musl-dev \
      cyrus-sasl-dev \
      openssl-dev \
      make \
      py3-pip

RUN apk add --no-cache --virtual .build-deps gcc zlib-dev libc-dev bsd-compat-headers py-setuptools bash

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]