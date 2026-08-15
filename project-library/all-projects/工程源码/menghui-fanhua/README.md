# 《梦回繁华》沉浸式长卷课堂

语文课文《梦回繁华》的沉浸式互动课堂，围绕《清明上河图》和北宋汴京展开。

## 开发

```bash
npm ci
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在 `dist/`，Vite 使用相对路径，可直接打包为 ZIP 并上传到数智流后台。

## 站点发布信息

- 分类：其他
- 年级：拓展
- 短链接：`menghui-fanhua`
- 发布标题：《梦回繁华》沉浸式长卷课堂

## 结构

- `src/data`：课堂内容与场景数据。
- `src/services`：导航、资源与全景交互。
- `src/views`：页面模板与渲染。
- `src/core`：共享类型。
