FROM node:20-alpine
WORKDIR /app

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npm config set registry https://registry.npmmirror.com \
  && npm install --omit=dev --no-audit --no-fund

CMD ["npm", "run", "start"]
