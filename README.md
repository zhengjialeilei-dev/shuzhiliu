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

## 上传作品

日常新增内容不需要修改代码或重新部署。登录
`https://sparkaiedu.com/admin/upload` 后直接上传：

- 单页作品上传 HTML。
- 包含图片、音频或脚本目录的作品上传 ZIP，压缩包内需要有 `index.html`。
- 封面可选；不上传时后端会自动打开作品并生成截图。
- 教学专区支持 PDF、DOC、DOCX、PPT、PPTX 和可信 HTTPS 官方外链。

上传成功后，文件进入对象存储，资源信息写入 PostgreSQL，并立即出现在网站对应分区。

## 固定部署流程

生产环境统一通过 GitHub Actions 和腾讯云 TAT 部署，不开放 SSH 密码登录。

1. 将通过校验的改动提交并推送到 `main`
2. GitHub Actions 执行 lint、测试、构建和生产依赖审计
3. TAT 在服务器专用目录检出本次精确提交
4. 自动备份数据库并执行尚未应用的迁移
5. 更新 1Panel 站点目录并重建 API，最后执行公网健康检查

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

生产发布只需将校验通过的代码推送到 `main`，不要直接手工上传到服务器目录。

## GitHub Auto Deploy (Tencent Cloud)

Push to `main` now triggers GitHub Actions auto deployment to `https://sparkaiedu.com`.

### Required GitHub Secrets

In GitHub repository settings: `Settings -> Secrets and variables -> Actions`, add:

- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`

该受限腾讯云账号只允许在指定轻量应用服务器上执行 TAT 命令并读取执行结果，不需要保存服务器密码。

After secrets are set, any new push to `main` will deploy automatically.
