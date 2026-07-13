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

生产环境统一通过 GitHub Actions 和腾讯云 TAT 部署，不开放 SSH 密码登录。

1. 将通过校验的改动提交并推送到 `main`
2. GitHub Actions 执行 lint、测试、构建和生产依赖审计
3. TAT 在服务器专用目录检出本次精确提交
4. Docker 构建前端并更新 1Panel 站点目录
5. Docker Compose 重建 API，最后执行公网健康检查

`npm run deploy:web` 仅保留给已单独配置受限 SSH 账号的本地维护场景，不用于生产自动部署。

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

- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`

该受限腾讯云账号只允许在指定轻量应用服务器上执行 TAT 命令并读取执行结果，不需要保存服务器密码。

After secrets are set, any new push to `main` will deploy automatically.
