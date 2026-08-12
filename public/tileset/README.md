# 本地 3D Tiles 样例

本目录使用两个 CesiumGS 官方样例，运行时不访问 Cesium Ion 或 GitHub。

## batched

- 用途：验证 batch table 属性读取和 `Cesium3DTileFeature` 拾取。
- 来源仓库：`CesiumGS/cesium`
- 来源目录：`Specs/Data/Cesium3DTiles/Batched/BatchedWithBatchTable`
- 本地入口：`batched/tileset.json`
- 文件：`tileset.json`、`batchedWithBatchTable.b3dm`

## lod

- 用途：验证调整 SSE 后的层级细节和瓦片数量变化。
- 来源仓库：`CesiumGS/3d-tiles-samples`
- 来源目录：`1.0/TilesetWithDiscreteLOD`
- 本地入口：`lod/tileset.json`
- 文件：`tileset.json`、`dragon_low.b3dm`、`dragon_medium.b3dm`、`dragon_high.b3dm`

样例文件必须连同目录内被 `tileset.json` 引用的全部 b3dm 文件一起下载，不能改用远程 URL。
两个来源仓库均采用 Apache-2.0 许可证，版权归 CesiumGS, Inc. 及其贡献者所有。

## 下载

在项目根目录运行：

```powershell
New-Item -ItemType Directory -Force public/tileset/batched,public/tileset/lod
$cesiumRaw = "https://raw.githubusercontent.com/CesiumGS/cesium/main/packages/engine/Specs/Data/Cesium3DTiles/BatchedWithBatchTable"
Invoke-WebRequest "$cesiumRaw/tileset.json" -OutFile public/tileset/batched/tileset.json
Invoke-WebRequest "$cesiumRaw/batchedWithBatchTable.b3dm" -OutFile public/tileset/batched/batchedWithBatchTable.b3dm

$samplesRaw = "https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/1.0/TilesetWithDiscreteLOD"
Invoke-WebRequest "$samplesRaw/tileset.json" -OutFile public/tileset/lod/tileset.json
Invoke-WebRequest "$samplesRaw/dragon_low.b3dm" -OutFile public/tileset/lod/dragon_low.b3dm
Invoke-WebRequest "$samplesRaw/dragon_medium.b3dm" -OutFile public/tileset/lod/dragon_medium.b3dm
Invoke-WebRequest "$samplesRaw/dragon_high.b3dm" -OutFile public/tileset/lod/dragon_high.b3dm
```
