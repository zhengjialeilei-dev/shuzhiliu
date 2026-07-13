# 1Panel 部署说明

这份说明对应当前已经跑通的线上环境。

## 当前线上约定

- 域名: `https://sparkaiedu.com`
- 服务器工作区: `/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu`
- 1Panel 站点实际静态目录: `/opt/1panel/www/sites/sparkaiedu.com/index`
- OpenResty 容器: `1Panel-openresty-z1xG`
- API 容器: `mathflow-api`
- PostgreSQL 容器: `mathflow-postgres`

## 为什么要用固定脚本

之前出现过一次典型问题：

- 新前端已经构建完成
- 但文件被传到了 `/var/www/sparkaiedu.com`
- 真正对外服务的却是 1Panel 目录 `/opt/1panel/www/sites/sparkaiedu.com/index`

结果就是：

- 数据库里的新短链已经生效
- 线上浏览器仍在加载旧前端
- 页面出现白屏

所以现在统一要求：

- 前端部署只走 `python deploy/deploy_web_site.py`
- 不再手工往任意 `www` 目录上传文件

## 前端发布

先设置部署环境变量：

```bash
export MATHFLOW_DEPLOY_HOST=119.29.152.213
export MATHFLOW_DEPLOY_USER=root
export MATHFLOW_DEPLOY_PASSWORD='你的密码'
export MATHFLOW_SITE_URL=https://sparkaiedu.com
export MATHFLOW_REMOTE_REPO_ROOT=/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu
export MATHFLOW_REMOTE_SITE_ROOT=/opt/1panel/www/sites/sparkaiedu.com/index
export MATHFLOW_OPENRESTY_CONTAINER=1Panel-openresty-z1xG
export MATHFLOW_POSTGRES_CONTAINER=mathflow-postgres
```

然后执行：

```bash
npm run deploy:web
```

脚本会自动：

1. 构建前端
2. 上传 `dist` 到真正站点目录
3. 同步关键源码到服务器工作区
4. 重载 OpenResty
5. 用线上 URL 回查当前入口 JS/CSS 是否就是本次构建产物

## 资源导入

批量导入资源时，优先用下面两个脚本：

- `python deploy/import_ai_apps_collection.py ...`
- `python deploy/import_legacy_assets.py ...`

这两个脚本已经统一接入部署目标配置：

- 服务器地址
- SSH 用户
- SSH 密码
- PostgreSQL 容器名

以后如果要新增导入脚本，也要复用 `deploy/deploy_shared.py`，不要再自己写死一套新的远端目录和容器名。

## 推荐工作流

### 改了前端代码

```bash
npm run test
npm run lint
npm run build
npm run deploy:web
```

### 只导入资源，不改前端代码

```bash
python deploy/import_ai_apps_collection.py ...
```

### 改了数据库迁移

先把迁移脚本放到 `deploy/db/migrations/`，再通过统一的 SSH 容器命令执行，不要随手在服务器上直接敲散命令。

执行迁移前先备份数据库，并在容器内运行：

```bash
docker exec -i mathflow-postgres pg_dump -U mathflow -d mathflow -Fc > mathflow-before-migration.dump
docker exec -i mathflow-postgres psql -v ON_ERROR_STOP=1 -U mathflow -d mathflow \
  < deploy/db/migrations/20260714_harden_resource_schema.sql
```

迁移完成后检查版本和关键约束：

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
SELECT route_path, COUNT(*) FROM resources
WHERE route_path IS NOT NULL
GROUP BY route_path HAVING COUNT(*) > 1;
```

## 以后新增项目时的要求

以后新增 HTML 应用、封面图、短链接或资源导入，都遵守这套逻辑：

1. 资源文件上传到 COS
2. 数据库存 `file_path / image_url / route_path`
3. 前端如果有代码变更，必须运行 `npm run deploy:web`
4. 线上验证以公网地址为准，不以本地 `dist` 或某个临时目录为准

这样可以避免“本地看起来对、服务器某个目录也对，但线上实际还在跑旧版本”的问题。
