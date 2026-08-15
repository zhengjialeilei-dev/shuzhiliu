# 领奖台展开工坊

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
