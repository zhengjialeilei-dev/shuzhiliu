# 算式合并练习

对应线上 `/xxxxx-120015`。保留原来的三道题，扩展为十道分步算式合并练习。

## 开发和构建

运行 `npm ci`、`npm run dev`。运行 `npm run build` 生成自包含的 `dist/index.html`；不请求旧站接口，不加载外部字体、图片或脚本，可在网站沙箱 iframe 内运行。

## 维护边界

- `src/questions.js`：题库和讲解。新增题目只需增加配置；引用只能指向前面的步骤。
- `src/engine.js`：表达式树、运算、引用替换和必要括号，不使用 eval。按步骤身份匹配，而不是只比较数值。
- `src/main.js`：点选、拖动、撤销、提示和题目导航。
- `src/style.css`：响应式课堂界面。支持键盘点选和减少动态效果偏好。
- 根目录 `scripts/teaching/expression-merge.test.ts`：计算与交互回归测试。

本次完成进度只存在当前页面会话，不采集或上传学生信息。刷新后清空。

发布使用手动工作流 `Publish Teaching Project`，选择 `expression-merge` 并填写当前线上资源版本。发布前运行测试、备份数据库、验证文件散列；只更新此资源的文件地址，保留旧文件和版本快照。若线上版本已变化则拒绝覆盖。
