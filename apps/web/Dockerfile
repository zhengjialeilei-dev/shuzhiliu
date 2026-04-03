FROM node:20-alpine AS build
WORKDIR /app

COPY packages/shared packages/shared
COPY apps/web apps/web

WORKDIR /app/apps/web
RUN npm install
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
