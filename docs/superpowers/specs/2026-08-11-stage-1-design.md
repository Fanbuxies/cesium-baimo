# 阶段 1：工程骨架与 Viewer 初始化设计

## 目标

按 `SPEC.md` 阶段 1 创建最小可运行的 Vite + CesiumJS 工程骨架。启动后默认显示 OSM 底图，在右上角显示 FPS，并确保浏览器不向 Cesium Ion 发起任何请求。

本阶段只建立工程结构、Viewer 初始化、底图切换入口和基础页面布局，不加载或渲染建筑数据，也不实现后续阶段业务逻辑。

## 技术选型

- Vite `^5.4`
- CesiumJS `^1.121`
- vite-plugin-cesium `^1.2`
- 原生 JavaScript ESM
- 原生 CSS
- npm

不引入测试框架、前端框架、UI 组件库或其他依赖。

## 工程结构

阶段 1 创建以下内容：

```text
cesium-baimo/
├── package.json
├── vite.config.js
├── .env.example
├── index.html
├── public/
│   └── buildings-sample.geojson
└── src/
    ├── main.js
    ├── viewer.js
    ├── buildings.js
    ├── picking.js
    ├── panel.js
    ├── theme.js
    ├── tileset.js
    ├── perf.js
    ├── api.js
    └── style.css
```

`buildings.js`、`picking.js`、`panel.js`、`theme.js`、`tileset.js`、`perf.js` 和 `api.js` 本阶段只包含模块用途说明，不导出或实现后续阶段功能。`public/buildings-sample.geojson` 仅作为后续阶段数据准备，本阶段不加载。

## 模块职责

### `index.html`

提供 Cesium 全屏容器和左上角静态信息面板。页面结构保持简单，不在 HTML 中编写运行时业务逻辑。

### `src/main.js`

只负责装配：导入样式、创建 Viewer，并将 `import.meta.env.VITE_TIANDITU_TOKEN` 传给天地图切换函数。高度计算、材质设置、DOM 拼接等业务逻辑不得进入该文件。

### `src/viewer.js`

导出两个函数：

- `createViewer(containerId)`：使用 OSM 创建 Viewer，关闭所有可能触发 Ion 请求的控件，启用 FPS 显示。
- `useTiandituBasemap(viewer, token)`：Token 存在时将当前影像层替换为天地图；Token 缺失时输出 warning 并直接返回，继续保留 OSM。

Viewer 使用 `OpenStreetMapImageryProvider`，地址固定为 `https://tile.openstreetmap.org/`。关闭 `baseLayerPicker`、`geocoder`、`homeButton`、`sceneModePicker`、`navigationHelpButton`、`animation`、`timeline`、`fullscreenButton`、`infoBox` 和 `selectionIndicator`。不设置 `terrainProvider`，保持默认椭球地形；`depthTestAgainstTerrain` 设为 `false`。

天地图使用 `UrlTemplateImageryProvider`，URL 模板、子域列表和最大层级严格采用 `SPEC.md` 1.2 的配置。`.env.example` 只声明 `VITE_TIANDITU_TOKEN` 占位符，不包含真实密钥。

## 数据流

1. 浏览器加载 `index.html` 和 `src/main.js`。
2. `main.js` 调用 `createViewer()`，Viewer 立即以 OSM 作为底图完成初始化。
3. `main.js` 读取 `VITE_TIANDITU_TOKEN` 并调用 `useTiandituBasemap()`。
4. Token 缺失时维持 OSM；Token 存在时清除当前影像层并加载天地图影像层。
5. 本阶段不进入 GeoJSON、拾取、面板动态渲染、专题着色、3D Tiles、性能统计或后端数据流。

## 页面布局与视觉

Cesium 视口铺满浏览器窗口，整体采用深色界面。信息面板固定在左上角，`top` 和 `left` 均为 `16px`，宽度为 `320px`，最大高度为 `calc(100% - 32px)`，内容超出时允许滚动。

面板背景使用 `rgba(14, 22, 32, 0.92)`，配合 `backdrop-filter: blur(12px)`。面板显示项目标题、当前阶段说明和后续建筑信息的占位内容，不使用亮色大面积背景。Cesium FPS 容器通过覆盖 `.cesium-performanceDisplay-defaultContainer` 固定到右上角。

## 异常处理

- 天地图 Token 缺失属于允许状态：输出清晰的 warning，不抛异常，也不移除 OSM。
- Viewer 初始化异常不得通过空 `catch` 或降级逻辑吞掉，应保留完整错误供控制台定位。
- 阶段 1 没有自定义异步数据加载，因此不增加重试机制、错误面板或通用异常框架。
- 网络底图自身的请求失败由 Cesium 和浏览器报告，本阶段不增加超出规格的自动切换逻辑。

## 验证方式

自动验证仅执行 `npm run build`，不引入测试框架。

手动验收严格对应 `SPEC.md` 1.4：

1. `npm install` 后运行 `npm run dev`，浏览器能够自动打开。
2. 页面在 3 秒内显示地球和 OSM 底图。
3. DevTools 的 Network 面板过滤 `cesium.com` 后，请求数为 0。
4. 实时 FPS 显示在右上角。
5. 控制台没有 error；缺少天地图 Token 时的 warning 可以接受。
6. `npm run build` 无报错。

## 范围边界

- 不实现任何标记为 `[自己写]` 的函数。
- 不加载 `buildings-sample.geojson`。
- 不创建 `backend/`、`scripts/`、`public/tileset/` 或 `PERF-LOG.md`，这些属于后续阶段。
- 不提交真实 Token，不使用 Cesium Ion Token，也不调用任何 Cesium Ion API。
- 不提前实现阶段 2 至阶段 5 的功能。
