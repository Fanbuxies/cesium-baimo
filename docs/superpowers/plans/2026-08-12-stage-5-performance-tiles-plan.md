# 阶段 5 性能实测与 3D Tiles Implementation Plan

> **For agentic workers:** Execute inline task-by-task with verification checkpoints. Do not add a test framework.

**Goal:** 增加五档 GeoJSON 白模切换、实时性能监测、本地 3D Tiles 与统一拾取，满足 `docs/SPEC.md` 阶段 5 验收清单。

**Architecture:** `buildings.js` 只负责单个数据源加载和计时，`main.js` 保存当前数据源并装配切换流程；`perf.js` 采集场景帧率，`tileset.js` 封装 Tileset API，`picking.js` 用统一结构屏蔽 Entity 与 TileFeature 差异。所有运行时资源来自 `public/`，不访问 Cesium Ion。

**Tech Stack:** 原生 JavaScript ESM、Node.js、CesiumJS 1.121、Vite 5。

---

### Task 1: 生成性能数据

**Files:**
- Modify: `scripts/gen-buildings.mjs`
- Create: `public/buildings-500.geojson`
- Create: `public/buildings-2000.geojson`
- Create: `public/buildings-5000.geojson`
- Create: `public/buildings-20000.geojson`

- [ ] 校验 CLI 数量为正整数，只允许 500/2000/5000/20000，错误时退出码非 0。
- [ ] 在光谷中心附近生成不重叠矩形网格，输出 EPSG:4326 Polygon；`code` 按顺序编号，属性与阶段 2 相同，每第十栋缺少 `building:levels`。
- [ ] 依次运行四档生成命令，再用 Node 读取 JSON 验证 feature 数、坐标范围和缺层比例。

### Task 2: 白模切换和加载计时

**Files:**
- Modify: `src/buildings.js`
- Modify: `index.html`
- Modify: `src/panel.js`
- Modify: `src/main.js`
- Modify: `src/style.css`

- [ ] `loadBuildings` 用 `performance.now()` 返回 `loadTime`，并支持调用方决定是否调整相机。
- [ ] 面板增加五档下拉框和 FPS、实体数、加载耗时字段，`panel.js` 提供绑定及更新函数。
- [ ] `main.js` 保存当前 DataSource；切换时先执行 `viewer.dataSources.remove(currentDataSource, true)`，再加载目标文件、恢复当前专题并更新面板。
- [ ] 用递增请求序号阻止快速切换时旧请求覆盖新数据。

### Task 3: 近 60 帧性能监测

**Files:**
- Modify: `src/perf.js`
- Modify: `src/main.js`

- [ ] `startPerfMonitor` 通过 `scene.postRender` 记录最多 61 个时间戳，每 500ms 以时间跨度计算平均 FPS。
- [ ] 每次回调统计所有 `viewer.dataSources` 中的 Entity 数量；停止函数解绑 postRender 并清除定时器。
- [ ] 初始化时启动监测并把数据传给面板。

### Task 4: 本地 3D Tiles 与 SSE

**Files:**
- Replace: `public/tileset/.gitkeep`
- Create: `public/tileset/tileset.json`
- Create: `public/tileset/batchedWithBatchTable.b3dm`
- Create: `public/tileset/README.md`
- Modify: `src/tileset.js`
- Modify: `index.html`
- Modify: `src/panel.js`
- Modify: `src/main.js`
- Modify: `src/style.css`

- [ ] 从 CesiumGS 官方仓库下载 `BatchedWithBatchTable` 的 JSON 和 b3dm，README 记录仓库、目录与下载地址。
- [ ] `loadTileset` 使用 `Cesium3DTileset.fromUrl` 并加入 `viewer.scene.primitives`；失败时移除已创建对象并抛出可读错误。
- [ ] `setScreenSpaceError` 校验 2–64 后设置 `maximumScreenSpaceError`；`getTilesetStats` 从 statistics 读取加载/可见瓦片和几何/纹理内存。
- [ ] 面板增加 2–64、默认 16 的 SSE 滑块，每 500ms 同步当前值和瓦片统计。

### Task 5: Entity 与 TileFeature 统一拾取

**Files:**
- Modify: `src/picking.js`
- Modify: `src/main.js`
- Modify: `src/panel.js`

- [ ] `pickEntity` 返回 `{type, raw, code, getProperty}`；Entity 使用 PropertyBag，TileFeature 使用 `getProperty`，同时在控制台输出 TileFeature 的 `getPropertyIds()`。
- [ ] Entity 高亮修改 `ColorMaterialProperty`，TileFeature 高亮修改 `feature.color`；切换对象或点空白时恢复各自基础颜色。
- [ ] 面板读取统一结构；Entity 继续查询后端详情，TileFeature 直接显示 batch table 属性且不请求阶段 4 后端。

### Task 6: 性能记录与验收

**Files:**
- Create: `PERF-LOG.md`

- [ ] 只写 SPEC 给出的空表和作者结论提示，不填写任何数字。
- [ ] 运行 `npm run build`，预期退出码 0。
- [ ] 启动页面后检查五档切换、实体不累加、FPS/耗时更新、SSE 变化、双数据源同屏、两类拾取与颜色恢复。
- [ ] 检查浏览器 Network 中 `cesium.com` 请求数为 0，控制台无 error。
- [ ] 排除 `.env.example` 和用户编辑器配置，只暂存阶段 2–5 明确文件；按用户指定信息提交并推送 `develop`。
