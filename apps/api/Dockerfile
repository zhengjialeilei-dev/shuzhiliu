FROM node:20-alpine
WORKDIR /app

RUN sed -i \
      's#https://dl-cdn.alpinelinux.org/alpine#https://mirrors.cloud.tencent.com/alpine#g' \
      /etc/apk/repositories \
    && apk add --no-cache chromium font-noto-cjk

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npm config set registry https://registry.npmmirror.com \
  && npm install --omit=dev --no-audit --no-fund

CMD ["npm", "run", "start"]
