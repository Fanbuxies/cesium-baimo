# 阶段 5：性能实测与 3D Tiles 设计

## 目标

在不新增依赖、不请求 Cesium Ion 的前提下，完成多档 GeoJSON 白模性能实测，并加载本地 Cesium 官方 `BatchedWithBatchTable` 3D Tiles 样例。两类数据需要同屏显示、统一拾取和高亮。

## 数据与资源

- `scripts/gen-buildings.mjs` 根据数量生成 EPSG:4326 Polygon，输出到 `public/buildings-{count}.geojson`。
- 支持 500、2000、5000、20000 四档，建筑按不重叠网格排布，10% 缺少 `building:levels`。
- `public/tileset/` 保存 Cesium 官方 `BatchedWithBatchTable` 属性样例和 `TilesetWithDiscreteLOD` 层级细节样例，并记录来源，不使用远程运行时地址。
- `PERF-LOG.md` 只提供空表，不写入任何实测数字。

## 模块边界

### 白模加载与切换

`loadBuildings` 增加加载耗时返回值。数据集控制器保存当前 `GeoJsonDataSource`，切换前调用 `viewer.dataSources.remove(dataSource, true)`，再加载新数据并更新实体数、耗时和当前专题。

### 性能监测

`src/perf.js` 使用 `scene.postRender` 收集近 60 帧时间戳，每 500ms 计算平均 FPS，并回调当前 Entity 数量。停止函数同时解绑事件和定时器。

### 3D Tiles

`src/tileset.js` 负责从本地 `tileset.json` 创建 `Cesium3DTileset`、调整 `maximumScreenSpaceError`，以及读取已加载瓦片数、可见瓦片数、几何与纹理内存。`BatchedWithBatchTable` 用于验证属性拾取，`TilesetWithDiscreteLOD` 用于验证 SSE。页面滑块范围 2–64、默认 16，变更立即生效。

### 统一拾取

`pickEntity` 返回统一结构：

```js
{
  type: "entity" | "tileFeature",
  raw,
  code,
  getProperty,
}
```

Entity 通过 `PropertyBag.getValue()` 读取属性并修改 `polygon.material`；`Cesium3DTileFeature` 通过 `getProperty()` 读取属性并修改 `feature.color`。切换选中对象或点击空白时，各自恢复保存的基础颜色。面板只依赖统一结构，不直接判断底层数据类型。

## 页面与数据流

面板新增数据量下拉框、FPS/实体数/加载耗时显示、3D Tiles SSE 滑块及瓦片统计。初始化顺序为：创建 Viewer、加载 12 栋白模、加载本地 Tileset、启动性能监测、绑定数据切换/专题/拾取控件。单个模块失败时在面板显示中文原因，并在控制台输出完整错误对象；白模或 Tileset 一方失败不吞掉错误。

## 验证

- 运行生成脚本并检查四个输出文件数量、坐标范围和缺层比例。
- 连续切换五档数据，确认实体数不是累加，性能面板持续更新。
- 拖动 SSE 8→48，观察模型精度和已加载瓦片数变化。
- 分别点击白模、TileFeature 和空白，确认高亮、属性读取和颜色恢复正确。
- 检查 Network 中无 `cesium.com` 请求。
- 运行 `npm run build`。

## 范围限制

不引入测试框架、第三方 UI 库或远程运行时资源；不自动填写性能结论；不修改阶段 4 后端接口。
