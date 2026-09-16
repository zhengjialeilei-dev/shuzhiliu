# 本次重构发布候选清单

状态：2026-09-17 用户确认“直接一起发布”，包含架构重构、推荐页与教学内容；按下表选择文件提交并走现有 main → CI → 腾讯云发布流程。最终部署结果以 Actions 和线上验收为准。不能直接 `git add .`。

## 范围分组（已确认）

| 组别 | 文件或目录 | 处理建议 |
| --- | --- | --- |
| 主站资源数据重构 | `apps/api/src/domain/resourceSearch.js`、`services/resourceCatalog.js`、`routes/catalog.js`、`routes/public.js`、`config.js`；前台分页 hook、资源页面、API/shared 类型与相关测试 | 纳入 |
| 作品版本与发布保护 | API `routes/admin.js`、`services/uploadAssets.js`；Web `HtmlViewer*`、`lib/htmlContent.ts`；`deploy/web_release.sh`、`check_release.mjs`；发布工作流与测试 | 纳入 |
| 新增兼容迁移 | `20260916_preserve_resource_revisions.sql`、`20260917_catalog_lookup_indexes.sql` | 纳入，保留旧表字段和旧接口 |
| 工程门禁与独立作品 | 教学项目 registry/runner/tests、teaching workflow，以及四个未跟踪的文言文/物理/数学城市/气候工程源码目录 | 按前期阶段一起核对；CI 会依赖这些目录，不能只提交 registry 而漏掉源码 |
| 测试、文档、依赖 | `scripts/*postgres.test.mjs`、`resource-revisions.test.mjs`、`test-database*`、`web-release.test.mjs`、`release-smoke.test.mjs`；相关文档、package/lockfile、`.env.example` | 纳入；按内容核对根 README/package 的混合改动 |
| 推荐页内容 | `apps/web/src/pages/Recommend.tsx`、`Recommend.test.tsx`、`lib/recommendedLinks.ts` | 已确认纳入 |
| 教材内容 | `deploy/db/init/01-schema.sql`、`02-seed.sql`、`20260816_add_official_math_teaching_resources.sql` | 已确认纳入；仅执行待执行迁移，不重放 seed 来恢复被删除资源 |
| 临时或运营素材 | `deploy/_textbook_uploads/`、`deploy/preview-*.html`、截图、`deploy/xxxxx_*_report.json` | 不纳入本次代码发布；保留原文件，不删除 |

这是一份人工审核清单，不是自动提交脚本。目录中的既有改动归用户所有，不通过重置工作区进行拆分。
当前本地验证基于完整工作区；若剔除推荐页或教材等改动，应对最终选定的候选提交重新运行验证，不能直接沿用整个工作区的结果。
独立作品源码纳入 CI 不代表其作品已上传上线：现有生产压缩包不含 `project-library`，作品发布仍是独立流程。

## 本轮修复的发布阻断点

1. 依赖审计：`fastify` 从 5.10.0 更新至 5.12.5；`fast-uri` 两个依赖实例从 3.1.5/4.1.2 更新至 3.1.8/4.1.5，附带 `process-warning` 5.1.0。
   仅在既有版本范围内更新 lockfile；没有执行强制跨主版本升级。生产依赖审计已返回 0 项漏洞。
   相关上游公告：[fast-uri](https://github.com/advisories/GHSA-5jgf-p345-68v8)、[Fastify](https://github.com/advisories/GHSA-w2qp-rph6-63g4)。
2. 发布健康检查：HTTP 200 不足以证明服务可用。新增只读检查器验证 API/auth/database/storage 状态，以及三个资源分区、四个教学专区和可用作品的预览身份/版本。
3. 前端版本核对：切换后核对公网首页 SHA-256 与本次构建一致，并验证入口 JS/CSS 返回正确类型，防止旧缓存或 SPA 回退 HTML 冒充脚本成功。
   本机 API 检查在切换前执行，公网完整检查在撤销错误回滚 trap 前执行。

## 迁移与回滚审查

- 新历史表及索引是增量、可重复执行变更；不删除资源、旧字段或历史数据。历史表会从迁移后首次更新开始记录，不补造过去历史。
- 索引迁移是普通 `CREATE INDEX`，并非 `CONCURRENTLY`；大表上可能阻塞写入。上线前需读实际数据规模，在维护窗口执行。
- 迁移执行器的 SQL 与 `schema_migrations` 写入目前分两次调用，并非同一事务。失败重试依赖迁移幂等；本轮两项迁移符合这一约束。不要宣称整个迁移框架已实现事务原子性。
- 历史内容迁移可能改变课程资料；必须根据线上 `schema_migrations` 只读清单核对待执行项，目前未查询生产数据库。
- 发布前备份数据库并保留旧 API 镜像；失败恢复前端入口与旧 API，不自动回灌数据库。
- 回滚旧 API 后，已打开的新版页面可能访问不存在的分页接口，需刷新回旧前端；保留旧脚本不等于跨版本 API 始终兼容。
- 前端只原子切换入口，非哈希 public 文件仍原地复制；不是完整蓝绿发布。

## 上线前仍需完成

1. 以上范围已确认，按文件暂存并核对，CI 对最终提交重新验证。
2. 用户已授权推送 main 触发生产部署。
3. 只读核对线上迁移状态、数据库规模、磁盘/COS 空间、备份可恢复性与旧镜像存在性。
4. CI 在 Node 20/PostgreSQL 16 上验证并构建实际镜像；本机 Docker 故障尚未修复，本地 WSL 联调不替代容器构建验收。
5. 发布后自动检查 + 人工课堂验收：分页/筛选、作品打开、古诗场景、移动端、管理员增删改。自动只读检查不执行生产写操作，也不渲染所有课堂作品。

## 本轮验证结果（2026-09-17）

- `npm run test:all`：发布/回滚/检查器 13、API 43、前端 40、教学工程 14，共 110 项通过。
- `npm run test:db:wsl`：真实 PostgreSQL/API 3 项通过、0 跳过，包含新发布检查器对真实 API 的调用；临时库已停止并清理。
- `npm run lint`、`npm run build` 通过；`npm audit --omit=dev --audit-level=high` 返回 0 项漏洞。
- 发布远程 shell 语法及检查器所在阶段已由本地测试验证。未运行真实生产回滚、未构建 Docker 镜像、未触发线上检查或部署。
