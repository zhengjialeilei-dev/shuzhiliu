# MathFlow Monorepo

面向腾讯云服务器和 1Panel 的前后端同仓项目。

## 项目结构

- `apps/web`: React + Vite 前端，包含前台页面、HTML 应用入口和后台管理页
- `apps/api`: Fastify + PostgreSQL 后端，负责资源接口、鉴权、上传和 HTML 代理
- `packages/shared`: 前后端共享类型
- `deploy`: Docker Compose、数据库脚本、导入脚本和部署脚本

## 本地开发

1. 复制 `apps/api/.env.example` 为 `apps/api/.env`
2. 填写数据库、管理员密码、`CORS_ORIGINS` 和存储配置
3. 安装依赖并启动

```bash
npm install
npm run dev
```

默认地址：

- 前端: `http://localhost:5173`
- 后端: `http://localhost:3001`
- 健康检查页: `http://localhost:5173/test-connection`

## 常用校验

```bash
npm run test
npm run lint
npm run build
```

## 固定部署流程

前端上线必须走统一脚本，不要再手动猜目录。

### 1. 准备部署环境变量

复制 `deploy/.deploy.env.example`，按实际服务器信息设置：

- `MATHFLOW_DEPLOY_HOST`
- `MATHFLOW_DEPLOY_USER`
- `MATHFLOW_DEPLOY_PASSWORD`
- `MATHFLOW_SITE_URL`
- `MATHFLOW_REMOTE_REPO_ROOT`
- `MATHFLOW_REMOTE_SITE_ROOT`
- `MATHFLOW_OPENRESTY_CONTAINER`
- `MATHFLOW_POSTGRES_CONTAINER`

### 2. 发布前端

```bash
npm run deploy:web
```

这个脚本会自动完成：

1. 本地构建 `@mathflow/web`
2. 把 `apps/web/dist` 上传到 1Panel 真正对外服务的站点目录
3. 同步关键前端源码到服务器工作区
4. 重载 OpenResty
5. 用公网地址回查，确认线上真的在吃当前构建产物

如果你已经提前构建过，也可以用：

```bash
npm run deploy:web:skip-build
```

## 资源导入

已有两个导入脚本：

- `deploy/import_ai_apps_collection.py`: 批量导入 AI 应用和封面
- `deploy/import_legacy_assets.py`: 导入旧项目 HTML/PDF 资源

这两个脚本现在也会复用同一套部署目标配置，不再重复写服务器地址和容器名。

## 重要说明

- 当前 1Panel 实际站点目录是 `/opt/1panel/www/sites/sparkaiedu.com/index`
- 当前服务器工作区目录是 `/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu`
- 当前 OpenResty 容器名是 `1Panel-openresty-z1xG`
- 当前 PostgreSQL 容器名是 `mathflow-postgres`

以后只要前端代码有变动，就统一运行 `npm run deploy:web`，不要再直接手工传到 `/var/www/...`

## GitHub Auto Deploy (Tencent Cloud)

Push to `main` now triggers GitHub Actions auto deployment to `https://sparkaiedu.com`.

### Required GitHub Secrets

In GitHub repository settings: `Settings -> Secrets and variables -> Actions`, add:

- `MATHFLOW_DEPLOY_HOST` (example: `119.29.152.213`)
- `MATHFLOW_DEPLOY_USER` (example: `root`)
- `MATHFLOW_DEPLOY_PASSWORD` (your server SSH password)
- `MATHFLOW_SITE_URL` (use `https://sparkaiedu.com`)
- `MATHFLOW_REMOTE_REPO_ROOT` (example: `/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu`)
- `MATHFLOW_REMOTE_SITE_ROOT` (example: `/opt/1panel/www/sites/sparkaiedu.com/index`)
- `MATHFLOW_OPENRESTY_CONTAINER` (example: `1Panel-openresty-z1xG`)
- `MATHFLOW_POSTGRES_CONTAINER` (example: `mathflow-postgres`)

After secrets are set, any new push to `main` will deploy automatically.
