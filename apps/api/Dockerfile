FROM node:20-alpine
WORKDIR /app

RUN sed -i \
      's#https://dl-cdn.alpinelinux.org/alpine#https://mirrors.cloud.tencent.com/alpine#g' \
      /etc/apk/repositories \
    && apk add --no-cache chromium font-noto-cjk

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm config set registry https://registry.npmmirror.com \
  && npm ci --omit=dev --workspace=@mathflow/api \
    --include-workspace-root=false --no-audit --no-fund

COPY apps/api apps/api

WORKDIR /app/apps/api

CMD ["npm", "run", "start"]
