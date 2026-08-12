# 阶段 3 拾取、高亮与属性联查 Implementation Plan

> **For agentic workers:** Execute the steps task-by-task with verification checkpoints.

**Goal:** 为阶段 2 的建筑白模增加 Entity 拾取、可逆高亮、属性面板和 mock 业务查询。

**Architecture:** `picking.js` 负责 Cesium 鼠标事件、Entity 判定与高亮状态；`panel.js` 只负责 DOM 渲染；`api.js` 提供 180ms 延迟的 mock 查询；`main.js` 串联点击、面板状态和递增请求序号，丢弃过期响应。3D Tiles 与专题着色保持不动。

**Tech Stack:** 原生 JavaScript ESM、CesiumJS 1.121、原生 DOM/CSS、Node 内置断言脚本、Vite。

---

### Task 1: Picking API and highlight lifecycle

**Files:** `src/picking.js`

- [ ] Add `pickEntity(viewer, windowPosition)` using `Cesium.defined`, `scene.pick`, `Cesium.Entity`, and `polygon` checks; leave the 3D Tiles branch for stage 5.
- [ ] Add `enablePicking(viewer, { onPick })` with a `ScreenSpaceEventHandler`, restoring the previous entity from `_baseColor` before highlighting a new entity, clearing on misses, and returning a destroy function.
- [ ] Run a Node assertion script with a fake scene pick result to verify entity, miss, and handler teardown behavior.

### Task 2: Panel rendering

**Files:** `src/panel.js`, `src/style.css`

- [ ] Keep `setBuildingCount` and add `renderPanel(data)` for null, loading-detail, ready-detail, and error states.
- [ ] Render code, name, computed height, height source, and mock business fields using text nodes (no HTML interpolation).
- [ ] Add only the CSS needed for the detail rows and error state, preserving the existing panel style.
- [ ] Run a DOM-free structural check by importing the module source and then verify the browser build.

### Task 3: Mock query and application wiring

**Files:** `src/api.js`, `src/main.js`

- [ ] Implement `queryBuildingDetail(code)` with a 180ms delay and deterministic mock data based on the matching GeoJSON code, including `权属单位`、`用途`、`竣工年份`、`实有单位数`、`数据来源`.
- [ ] After buildings load, call `enablePicking`; on pick, render base data with `detail: null`, increment `requestSeq`, await the mock, and ignore responses whose sequence is stale.
- [ ] On query failure, log the complete error and render a human-readable error state.
- [ ] Run `npm run build` and manually verify all six stage-3 acceptance items.

