# 生产部署说明

MathFlow 生产环境固定使用 GitHub Actions、腾讯云 TAT 和 1Panel，不再使用 SSH 密码手工上传。

## 日常操作

### 上传作品或教学文件

打开 `https://sparkaiedu.com/admin/upload`：

1. 选择资源分区并填写标题、描述。
2. HTML 单文件直接上传；带图片、音频或脚本的作品上传包含 `index.html` 的 ZIP。
3. 封面可留空，服务端会从作品页面自动截图。
4. 教学资源支持 PDF、Word、PowerPoint 和可信 HTTPS 官方外链，添加成功后立即写入数据库。

资源上传不需要重新部署网站。

### 发布代码更新

```bash
npm run lint
npm test
npm run build
git push origin main
```

推送 `main` 后，GitHub Actions 会自动：

1. 重新校验、测试、构建并执行生产依赖审计。
2. 通过腾讯云 TAT 将精确提交传到服务器。
3. 备份数据库并执行所有尚未应用的 SQL 迁移。
4. 更新 1Panel 静态站点，重建 API 容器。
5. 检查 API 和公网 HTTPS 页面。

## 生产结构

- 网站：`https://sparkaiedu.com`
- 静态目录：`/opt/1panel/www/sites/sparkaiedu.com/index`
- 环境配置：`/opt/1panel/apps/mathflow-sparkaiedu/shuzhiliu/deploy/.env`
- API 容器：`mathflow-api`
- PostgreSQL 容器：`mathflow-postgres`
- OpenResty 容器：`1Panel-openresty-z1xG`

前端由 1Panel OpenResty 直接提供静态文件，Docker Compose 只管理 PostgreSQL 和 API。

## 数据库迁移

新迁移放到 `deploy/db/migrations/`，文件名使用 `YYYYMMDD_description.sql`。部署时
`deploy/run_migrations.sh` 会按文件名顺序执行未记录的迁移，成功后写入
`schema_migrations`；执行前会自动生成数据库备份。

不要在生产数据库中手工执行零散 SQL，也不要直接覆盖站点目录。
