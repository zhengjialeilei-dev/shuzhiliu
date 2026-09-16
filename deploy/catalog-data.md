# 资源目录：数据库权威与分页

前台 AI 赋能、互动游戏、互动工具使用 `GET /api/resources/page`；教学专区使用
`GET /api/teaching-resources/page`。默认每页 20 条，上限 50 条。响应包含
`items/total/page/pageSize/hasMore/source`，教学专区额外返回各专区数量 `zones`。
筛选条件变化重新请求第 1 页，旧请求可取消，加载更多按 ID 去重。

资源筛选：`section=all|ai|games|tools`、`category`、`grade`、`q`。
年级筛选包含“通用”；专区之间隔离。教学筛选：`zone=standard|textbook|plan|courseware`。
无关键词时由 PostgreSQL 直接分页，总量和当前页使用同一语句快照。
有关键词时暂时读取符合分类条件的文本元数据，在 API 内按中文、拼音/首字母、
模糊匹配排序，再只取当前页的完整记录；尚不是专用搜索索引，超大目录仍需后续优化。
日期相同时按 ID 确定顺序。Offset 分页不保证跨请求快照；浏览中有新增/删除时刷新可重置列表。

数据库成功返回空列表就是空列表；异常返回 503，页面提供重试，不补入本地教材或种子数据。
仅非 production 且显式设置 `ALLOW_SEED_WITHOUT_DB=true` 时允许资源目录使用种子演示，
分页响应标记 `source=demo`，前台显示演示提示。教学专区不启用演示回退。
以前的 12 本本地教材已有历史 SQL 迁移，本次不重新导入，避免恢复已删除条目。

旧 `/api/resources` 和 `/api/teaching-resources` 数组接口保留供后台管理兼容使用，
同样以数据库为准；因此本阶段并未消除所有全量接口。后台增删改后使前台分页及预览缓存失效。
预览显式路径/文件 URL 直接查询数据库；仅旧 `/zhijing/` 自动短链需要扫描无显式路径的 HTML 元数据。

部署顺序仍是先迁移与 API、再前端。本次附加索引迁移不修改资源内容。
API 与前端需一起发布；旧 API 不支持新分页接口。按现有发布流程保留旧 API 镜像及静态资源用于回滚。

## 本地验证（2026-09-17）

- `npm run lint`、`npm run build` 通过。
- `npm run test:all`：发布安全 5、API 43、前端 40、教学项目 14，共 102 项通过。
- Playwright 使用本地拦截测试数据验证了 20→40 条加载、搜索回到第 1 页且保持焦点、空教材专区不补入本地条目；不是线上或真实数据库验收。
- `npm run test:revisions` 中版本历史与分页 SQL 两项集成测试本地跳过：无专用数据库连接，本机 Docker 未启动。CI 使用独立 PostgreSQL 16 执行，尚未触发 CI。
- 未提交、推送或部署。

## 真实数据库联调入口

- `npm run test:db`：要求本机 Docker 引擎已可用，创建随机名称的 PostgreSQL 16 容器，
  数据放在临时内存挂载中，使用随机密码、随机 localhost 端口，无宿主目录挂载。
  退出前按本轮唯一标签验证归属后清理容器；Docker 不可用时返回失败，不记为通过。
- `npm run test:db:wsl`：Windows + Ubuntu 24.04 WSL + WSL 内 Node.js 20+ 的备用路径。
  在临时目录刷新已验签的包索引、下载并解包 PostgreSQL 16，无需 sudo，不安装系统服务。
  数据库和 Node 测试均在 WSL 内执行，不依赖 Windows/WSL 端口转发，结束后停止并删除临时库。
- 两个入口都不读取项目数据库配置，测试自身仅接受 `REVISION_TEST_DATABASE_URL`。
  API 集成测试在导入应用前显式覆盖数据库、认证和文件存储为隔离测试配置。
- 三项集成测试串行运行，避免各临时 schema 的 pgcrypto 扩展创建/清理互相干扰。
  覆盖真实分页 SQL、拼音搜索、空库、教材排序、版本迁移重复执行/事务回滚，以及
  完整 API 登录、新增、冲突检测、搜索、更新版本、删除和历史保留。

Docker 启动诊断：本机 Docker Desktop 的 Inference manager 报 `dockerInference` 通信文件访问错误。
本轮未重置 Docker、未删除其数据，使用 WSL 备用路径进行验证。

### 联调结果（2026-09-17，本轮补验）

- `npm run test:db:wsl`：3 项真实 PostgreSQL 16.15 + API 集成测试全部通过，0 跳过。
  运行环境为 Ubuntu 24.04 WSL / Node.js 24.13.0；Docker 路径因宿主 Docker 启动错误未完成正向验证。
- 原有 `npm run test:all` 102 项再次通过；加上数据库集成测试共 105 项。
- `npm run lint`、`npm run build` 再次通过。构建仍有非阻断的 Browserslist 数据过期提示。
- 临时 PostgreSQL 已停止并删除本轮下载文件及测试数据；未安装数据库系统服务。
- 本轮未触发 CI、未提交、未推送、未部署。上线前仍需审核工作区中混合的历史改动，
  按既有发布流程执行迁移/API/前端发布及线上冒烟验收。
