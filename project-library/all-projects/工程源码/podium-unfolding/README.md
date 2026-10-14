# 领奖台展开图

2026-10 修复：三个展开图先分开再绕公共棱展开，修正面重叠、阴影条纹和展开后镜头裁切。完全展开与分离观察自动切到俯视；镜头按模型范围和画面比例适配。几何测试位于 `scripts/teaching/podium-layout.test.ts`。

发布使用手动工作流 `Publish Podium Project`，传入线上资源当前版本。工作流构建单文件 HTML，校验散列，备份数据库，上传唯一地址，并仅更新 `/xxxxx-140054` 对应资源。版本不符时拒绝覆盖；原文件与版本快照保留。

可维护的 Three.js 教学互动项目，用于观察领奖台中三个长方体从立体形态到完整展开图的变化。

## 结构

- `src/data`：教学内容和领奖台尺寸配置
- `src/services/layout.ts`：立体、半展开、完全展开、分离观察的几何变换
- `src/services/scene.ts`：Three.js 场景、动画和相机控制
- `src/views`：界面渲染与交互编排

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建结束后会自动把 CSS 与 JavaScript 内联到 `dist/index.html`。该单文件发布物可在不授予同源权限的沙箱 iframe 中运行，不依赖对象存储的跨域模块加载。
