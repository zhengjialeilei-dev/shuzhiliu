# 隔离作品的模块资源加载

ZIP 作品的 HTML 通过 `/api/html-proxy` 在不含 `allow-same-origin` 的 iframe 中运行。
该 iframe 的请求来源为 `null`；COS 未配置相应 CORS 时，模块脚本和带 crossorigin 的 CSS 会被浏览器拒绝，导致白屏。

修复保持 iframe 隔离和存储桶权限不变。对数据库已登记的 `apps/bundles/<bundle>/` 作品，代理 HTML 的 base 改为 `/api/preview-assets/<resource-id>/<version>/`。
嵌套模块、CSS 中相对路径及懒加载模块自然沿该目录解析。未打包的旧单页不改变行为。

新通道只接受当前登记作品、当前版本、允许的静态扩展名；目标限于配置的资源主机和当前 bundle 目录。拒绝路径穿越、HTML、任意 URL、上游跳转及超过 16 MiB 的响应；超时覆盖响应体读取。
请求不转发 Cookie/Authorization，响应不透传 Set-Cookie。仅此静态通道返回 `Access-Control-Allow-Origin: *` 且不允许携带凭据，后台接口的 CORS 策略不变。
静态响应缓存 5 分钟，HTML 入口继续 no-store。未通过校验时不使用旧数据或 demo 数据兜底。

发布检查器对首个抽样的 bundle 作品进一步请求入口 JS/CSS，并以 Origin: null 检查类型与 CORS；浏览器验收仍需检查实际交互及延迟加载资源。
此修复不为作品硬编码的外部绝对链接添加代理，也不授予存储、摄像头或同源访问权限。
