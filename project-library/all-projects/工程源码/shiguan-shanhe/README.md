# 诗贯山河

以中国地图为主工作区的古诗地理互动项目。读者可按区域、朝代和主题筛选诗歌，在地图上查看创作地点、地理背景与诗人行旅线索，进入“诗境剧场”观看动态场景、了解创作来历和调用系统中文语音朗读，还可播放逐站点亮的诗人行旅动画。

## 项目结构

- `src/data/poems.ts`：诗歌、地点与筛选配置
- `src/data/china.geo.json`：省级地图边界数据（来源：阿里云 DataV 地理数据服务）
- `src/services/map.ts`：地图投影、点位、诗路线与逐帧行旅动画
- `src/services/narration.ts`：可替换的浏览器语音朗读服务
- `src/views/app.ts`：界面编排与状态交互
- `scripts/inline-build.mjs`：生成沙箱 iframe 可运行的单文件发布物

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```
