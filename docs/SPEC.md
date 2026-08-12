# SPEC.md — 白模三维练习工程需求说明

> **执行规则**：分 5 个阶段，一次只做一个阶段。每阶段有可勾选的验收清单，
> 全部达标并 `git commit` 之后才进入下一阶段。
> 标注 `[自己写]` 的函数由作者本人实现，Codex 只留桩，具体见 STUBS.md。

---

## 零、目录结构（阶段 1 一次建好）

```
cesium-baimo/
├── AGENTS.md
├── SPEC.md
├── STUBS.md
├── PERF-LOG.md              阶段 5 才填
├── backend/                 阶段 4
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    ├── index.html
    ├── public/
    │   ├── buildings-sample.geojson
    │   └── tileset/         阶段 5 放 3D Tiles 样例
    ├── scripts/
    │   └── gen-buildings.mjs    阶段 5
    └── src/
        ├── main.js          入口，只做装配，不写业务逻辑
        ├── viewer.js        Viewer 初始化与底图
        ├── buildings.js     GeoJSON 加载与白模拉伸
        ├── picking.js       拾取与高亮
        ├── panel.js         左侧信息面板渲染
        ├── theme.js         专题着色（阶段 4）
        ├── tileset.js       3D Tiles 加载（阶段 5）
        ├── perf.js          性能监测（阶段 5）
        ├── api.js           后端接口封装
        └── style.css
```

**`main.js` 只允许做装配**：创建 viewer、调用各模块的 enable/load 函数、
把回调串起来。不允许在 main.js 里写高度计算、材质设置、DOM 拼接。

---

## 阶段 1：工程骨架

### 1.1 初始化

用 Vite 原生模板初始化，`package.json` 的 scripts 为
`dev` / `build` / `preview`。`vite.config.js`：

```js
import { defineConfig } from "vite";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [cesium()],
  server: { port: 5173, open: true },
});
```

### 1.2 `viewer.js`

导出两个函数：

```js
/**
 * 创建 Viewer。必须关闭所有会请求 Cesium Ion 的控件。
 * @param {string} containerId - DOM 容器 id
 * @returns {Cesium.Viewer}
 */
export function createViewer(containerId)

/**
 * 切换到天地图底图。token 缺失时打印警告并直接返回，不抛异常。
 * @param {Cesium.Viewer} viewer
 * @param {string} token - 天地图申请的 key
 */
export function useTiandituBasemap(viewer, token)
```

`createViewer` 内部要求：

- 底图：`OpenStreetMapImageryProvider`，url `https://tile.openstreetmap.org/`
- 关闭：`baseLayerPicker`、`geocoder`、`homeButton`、`sceneModePicker`、
  `navigationHelpButton`、`animation`、`timeline`、`fullscreenButton`、
  `infoBox`、`selectionIndicator`
- `scene.debugShowFramesPerSecond = true`
- `scene.globe.depthTestAgainstTerrain = false`

`useTiandituBasemap` 用 `UrlTemplateImageryProvider`，url 模板：
```
https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk={token}
subdomains: ["0","1","2","3","4","5","6","7"]
maximumLevel: 18
```
token 从 `import.meta.env.VITE_TIANDITU_TOKEN` 读，`.env.example` 里给出示例。

### 1.3 页面布局

```
┌─────────────────────────────────────────────────┐
│ ┌──────────────┐                      [FPS: 60] │
│ │ 建筑白模·属性 │                                │
│ │ 已加载 12 栋  │                                │
│ ├──────────────┤        三维视口（全屏）          │
│ │              │                                │
│ │  信息面板     │                                │
│ │  （可滚动）   │                                │
│ │              │                                │
│ ├──────────────┤                                │
│ │ 图例 / 主题   │                                │
│ └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

- 面板固定左上，`top:16px; left:16px`，宽 320px，最大高度 `calc(100% - 32px)`
- 深色半透明（`rgba(14,22,32,0.92)`）+ `backdrop-filter: blur(12px)`
- 三维场景下**不要用亮色面板**，看不清
- FPS 显示挪到右上角（覆写 `.cesium-performanceDisplay-defaultContainer`）

### 1.4 验收清单

- [ ] 在 `frontend/` 下 `npm install && npm run dev` 能启动，浏览器自动打开
- [ ] 3 秒内出现地球和 OSM 底图
- [ ] **打开 DevTools → Network，过滤 `cesium.com`，请求数为 0**
- [ ] 右上角显示实时 FPS
- [ ] 控制台无 error（warning 可接受）
- [ ] `npm run build` 无报错

---

## 阶段 2：数据加载与白模拉伸

> 这是整个练习的核心阶段，慢慢做。

### 2.1 示例数据 `public/buildings-sample.geojson`

- 位置：武汉光谷附近，中心约 `114.4005, 30.5075`
- 数量：12–20 个 Polygon feature
- 建筑尺寸：边长 30–60 米的矩形，带随机旋转角，网格排布不要重叠

每个 feature 的 properties 严格按下表：

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `code` | string | 业务编码，后端联查主键 | `"WH420180003"` |
| `name` | string | 建筑名称 | `"光谷公寓1栋"` |
| `use` | string | 用途，六选一 | `"住宅"` |
| `building` | string | 固定 `"yes"` | `"yes"` |
| `building:levels` | string | 层数，**故意留 2–3 栋没有这个字段** | `"18"` |
| `year` | number | 竣工年份 2005–2022 | `2015` |

`use` 取值范围：`办公` / `住宅` / `商业` / `教育` / `医疗` / `公共服务`

### 2.2 `buildings.js` 常量

```js
export const FLOOR_HEIGHT = 3.0;    // 层高（米）。作者会改这个值观察天际线变化
export const DEFAULT_LEVELS = 3;    // 属性缺失时的兜底层数
export const NORMAL_ALPHA = 0.88;
```

### 2.3 `buildings.js` 导出

```js
/**
 * 加载 GeoJSON 并拉伸成白模。
 * @param {Cesium.Viewer} viewer
 * @param {string} url - GeoJSON 路径
 * @returns {Promise<{dataSource: Cesium.GeoJsonDataSource, count: number}>}
 * @throws {Error} 坐标系非法时抛出，message 见 SPEC 2.5
 */
export async function loadBuildings(viewer, url)

/**
 * 按高度分档取色。<25m / 25-50m / 50-90m / >90m
 * @param {number} height
 * @returns {Cesium.Color}
 */
export function colorByHeight(height)

/**
 * [自己写] 见 STUBS.md 第 1 节
 */
export function resolveHeight(properties)
```

`loadBuildings` 处理流程（严格按此顺序）：

1. `GeoJsonDataSource.load(url, { clampToGround: false })`
2. 校验坐标系（见 2.5），非法直接 throw
3. `viewer.dataSources.add(dataSource)`
4. 遍历 `dataSource.entities.values`：
   - `if (!entity.polygon) continue;` 跳过点线要素
   - 调 `resolveHeight(entity.properties)` 拿 `{height, source}`
   - 设 `polygon.height = 0`、`polygon.extrudedHeight = height`
   - 设 `polygon.material = new Cesium.ColorMaterialProperty(colorByHeight(height).withAlpha(NORMAL_ALPHA))`
   - 设 `polygon.outline = true`，`outlineColor` 为深色半透明
   - 挂载 `entity._baseColor` / `entity._computedHeight` / `entity._heightSource`
5. `await viewer.zoomTo(dataSource)`
6. 再 `scene.camera.setView` 拉斜视角（见 2.6）
7. 返回 `{ dataSource, count }`

### 2.4 分色规则

| 高度 | 颜色 |
|---|---|
| < 25 m | `#8fb08c` |
| 25–50 m | `#6f9bc4` |
| 50–90 m | `#d99a4e` |
| > 90 m | `#c94f4f` |

### 2.5 坐标系校验

取第一个 Polygon 的第一个坐标点，判断经度是否在 `[-180,180]`、
纬度是否在 `[-90,90]`。超范围时抛出：

```
Error: GeoJSON 坐标超出经纬度范围（读到 x=12735621.5, y=3579210.3）。
数据可能是投影坐标系（如 EPSG:3857 或 CGCS2000 高斯投影），
请在导出时改成 EPSG:4326。
```

面板要把这段 message 原样显示出来。

### 2.6 相机

```js
viewer.scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(114.4005, 30.5010, 900),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
});
```

正上方俯视看不出体块，必须斜视角。

### 2.7 验收清单

- [ ] 页面出现有明显高度差的彩色体块，不是平面色块
- [ ] 缺 `building:levels` 的那 2–3 栋明显比周围矮
- [ ] 面板上方显示"已加载 N 栋"，N 与 GeoJSON feature 数一致
- [ ] 把 `FLOOR_HEIGHT` 从 3.0 改成 3.5，重载后天际线整体抬高
- [ ] 手动造一个坐标是 EPSG:3857 的 GeoJSON，面板显示 2.5 的报错文案而非白屏
- [ ] `resolveHeight` 仍是 `throw new Error("未实现")` 状态（作者未实现前）

---

## 阶段 3：拾取、高亮与属性联查

### 3.1 `picking.js` 导出

```js
/**
 * 开启左键拾取。命中则高亮并回调实体，未命中则取消高亮并回调 null。
 * @param {Cesium.Viewer} viewer
 * @param {{onPick: (entity: Cesium.Entity|null) => void}} options
 * @returns {() => void} 返回销毁函数，调用后解绑事件
 */
export function enablePicking(viewer, { onPick })

/**
 * [自己写] 见 STUBS.md 第 2 节
 */
export function pickEntity(viewer, windowPosition)
```

### 3.2 高亮规则

- 高亮色：`#ffd54a`，alpha `0.95`
- 切换到新实体前，先把上一个实体的 material 还原为 `entity._baseColor`
- **还原必须用 `_baseColor` 而不是读当前 material**，否则连点两次会把高亮色存成底色
- 点击空白处（`pickEntity` 返回 undefined）时取消高亮

### 3.3 `panel.js` 导出

```js
/**
 * 渲染左侧信息面板。
 * @param {Object|null} data - null 表示回到初始提示态
 * @param {string} data.code
 * @param {string} data.name
 * @param {number} data.height
 * @param {string} data.heightSource
 * @param {Object|null} [data.detail] - 后端返回的业务属性，未到达时为 null
 * @param {string} [data.error] - 有值时整个面板显示错误态
 */
export function renderPanel(data)

/** 更新面板顶部的"已加载 N 栋" */
export function setBuildingCount(n)
```

面板内容结构：

```
光谷公寓1栋                        ← h2
WH420180003                       ← 等宽字体，弱化色
─────────────────────
建筑高度            54.0 m
高度来源       18 层 × 3.0m        ← 灰色小字
─────────────────────
权属单位     东湖高新管委会
用途                 住宅
竣工年份             2015
实有单位数              7
```

三种状态必须都实现：
- `data === null` → `点击任意建筑查看属性`
- `data.detail === null` → 上半部分正常显示，下半部分显示 `正在查询业务属性…`
- `data.error` → 整个面板显示错误文案（红色），并附一行"详情见控制台"

### 3.4 `api.js`

```js
/**
 * 查询建筑业务属性。
 * 阶段 3 返回 mock，阶段 4 换成真实 fetch：
 *   const res = await fetch(`${BASE}/api/building/${code}`);
 *   if (!res.ok) throw new Error(`后端返回 ${res.status}`);
 *   return await res.json();
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
export async function queryBuildingDetail(code)
```

mock 版本延迟 180ms，返回：
```js
{ 权属单位: "...", 用途: "...", 竣工年份: 2015, 实有单位数: 7, 数据来源: "（示例数据）" }
```

### 3.5 串联（写在 `main.js`）

```
点击 → pickEntity → 高亮 → renderPanel(基础信息, detail=null)
     → await queryBuildingDetail(code) → renderPanel(基础信息 + detail)
```

注意**竞态**：快速连点两栋楼时，先发的请求可能后返回，导致面板显示错的楼。
用一个递增的 `requestSeq` 变量，回调时比对是否仍是最新请求，不是就丢弃。
这段逻辑由 Codex 实现，但要在注释里说明为什么需要。

### 3.6 验收清单

- [ ] 点任意建筑 → 该建筑变黄色高亮，面板显示属性
- [ ] 点第二栋 → 第一栋恢复原色（不是变成别的颜色）
- [ ] 同一栋连点三次 → 颜色正常，不会越点越怪
- [ ] 点空白处 → 高亮取消，面板回到初始提示
- [ ] 面板上的编码和 GeoJSON 里 `code` 字段一致
- [ ] 快速连点两栋不同的楼，最终面板显示的是后点的那栋
- [ ] `pickEntity` 仍是未实现状态（作者未实现前）

---

## 阶段 4：接后端 + 专题着色

### 4.1 `backend/` 最小 Spring Boot

- Java 17，Spring Boot 3.2.x，Maven
- 只有一个 `BuildingController`，数据用内存 `Map` 硬编码 12 条
  （code 与前端 GeoJSON 一一对应）
- **不要**引入数据库、MyBatis、JPA、Swagger、Lombok、Security

接口一：

```
GET /api/building/{code}
200 → {
  "code": "WH420180003",
  "name": "光谷公寓1栋",
  "owner": "东湖高新管委会",
  "use": "住宅",
  "year": 2015,
  "unitCount": 7
}
404 → { "message": "未找到编码 WH420180003" }
```

接口二（专题着色用）：

```
GET /api/buildings/theme?field=use
200 → { "WH420180001": "办公", "WH420180002": "住宅", ... }

field 支持 use / year 两种，其他值返回 400
```

CORS 放开 `http://localhost:5173`，写在 `WebMvcConfigurer` 里。

`backend/README.md` 写清：怎么跑（`mvn spring-boot:run`）、端口、
以及怎么用 curl 验证两个接口。

### 4.2 前端接入

- `api.js` 的 base url 从 `import.meta.env.VITE_API_BASE` 读，默认 `http://localhost:8080`
- 后端未启动时（fetch 抛 TypeError），面板显示：
  `后端未启动。请在 backend/ 目录执行 mvn spring-boot:run`
- 404 时显示：`后端未找到该编码，检查 GeoJSON 的 code 与后端数据是否一致`

### 4.3 专题着色

面板底部加一行切换按钮：`按高度` / `按用途` / `按年份`

切换逻辑：
- `按高度`：恢复 `colorByHeight` 的原始配色
- `按用途`：调 `/api/buildings/theme?field=use`，六类用途各配一色
- `按年份`：调 `field=year`，按年代分四档配色（<2010 / 2010-2014 / 2015-2018 / >2018）

图例跟着当前主题变化。

用途配色：
| 用途 | 色值 |
|---|---|
| 办公 | `#6f9bc4` |
| 住宅 | `#8fb08c` |
| 商业 | `#d99a4e` |
| 教育 | `#a48fc4` |
| 医疗 | `#c47f8f` |
| 公共服务 | `#7fb8b0` |

### 4.4 `theme.js` 导出

```js
/**
 * [自己写] 见 STUBS.md 第 3 节
 */
export function applyTheme(dataSource, colorMap)

/** 生成 code → Color 的映射 */
export function buildColorMap(themeData, palette)
```

### 4.5 验收清单

- [ ] 后端启动后点建筑，面板显示后端数据（改后端硬编码值能看到变化）
- [ ] 后端关掉后点建筑，面板显示"后端未启动"提示而非白屏
- [ ] 切"按用途"，同类建筑同色，图例正确更新
- [ ] **切主题后点选某栋再点空白取消，该栋恢复的是主题色而不是默认色**
- [ ] `field=xxx` 传非法值，后端返回 400，前端有提示
- [ ] `applyTheme` 仍是未实现状态（作者未实现前）

---

## 阶段 5：性能实测与 3D Tiles 过渡

### 5.1 数据生成脚本

```bash
node frontend/scripts/gen-buildings.mjs 5000
# 输出 frontend/public/buildings-5000.geojson
```

- 在光谷周边按网格生成，间距随数量自适应（保证不重叠）
- 属性字段与阶段 2 一致，`code` 顺序编号
- 随机 10% 的建筑缺 `building:levels`

### 5.2 数据集切换

面板顶部加下拉框：`示例(12)` / `500` / `2000` / `5000` / `20000`
切换后销毁旧 dataSource 再加载新的，**必须真正 `viewer.dataSources.remove(ds, true)`**，
否则旧数据还在渲染，测出来的性能是错的。

### 5.3 `perf.js`

```js
/**
 * 启动性能监测，每 500ms 更新一次。
 * @param {Cesium.Viewer} viewer
 * @param {(stats: {fps: number, entityCount: number}) => void} onUpdate
 * @returns {() => void} 停止函数
 */
export function startPerfMonitor(viewer, onUpdate)
```

FPS 取近 60 帧平均（用 `scene.postRender` 累计帧间隔）。
加载耗时由 `loadBuildings` 内部计时并返回，面板显示。

### 5.4 `PERF-LOG.md`

只给表头模板，**Codex 不许预填任何数字**：

```markdown
| 数据量 | 加载耗时 | 静止 FPS | 旋转时 FPS | 主观感受 |
|---|---|---|---|---|
| 12 |  |  |  |  |
| 500 |  |  |  |  |
| 2000 |  |  |  |  |
| 5000 |  |  |  |  |
| 20000 |  |  |  |  |

## 结论
（作者填写：Entity 方式在多少量级开始明显掉帧？瓶颈在 CPU 还是 GPU？）
```

### 5.5 3D Tiles

- 从 `https://github.com/CesiumGS/3d-tiles-samples` 取一个 b3dm 数据集
  放到 `public/tileset/`（README 里写清取的是哪个、怎么下）
- `tileset.js`：

```js
/**
 * @returns {Promise<Cesium.Cesium3DTileset>}
 */
export async function loadTileset(viewer, url)

/** 调整屏幕空间误差阈值 */
export function setScreenSpaceError(tileset, value)

/** 读取当前统计信息 */
export function getTilesetStats(tileset)
// → { tilesLoaded, tilesVisible, geometryMemory, textureMemory }
```

- 页面加 SSE 滑块：范围 2–64，默认 16，实时显示当前值和
  `tileset.statistics.numberOfTilesLoaded`

### 5.6 拾取扩展

`pickEntity` 增加 3D Tiles 分支——**仍是 [自己写]**，Codex 只加 TODO 注释
和一段说明两种返回结构差异的文档。

### 5.7 倾斜摄影对照

同屏加载两份 3D Tiles 做对比，验证「倾斜摄影为什么必须做单体化」：

- A. 本地 `public/tileset/batched/`，带 batchTable，点选**能**拿到属性
- B. 法国 CRAIG 圣艾蒂安实景三维，真实倾斜摄影，点选**拿不到**属性
  `https://3d.craig.fr/datasets/St-Etienne_oblique/3dtiles/tileset.json`
  （Etalab 开放许可，实测已开 `Access-Control-Allow-Origin: *`）

这是全项目**唯一**的远程运行时资源。它不是 Ion 服务，与 3.1 的禁令不冲突；
断网时按钮会报错并在面板给出原因，属预期行为，不影响其余功能。

实测得到的几个结论，都是踩过才知道的：

- 该数据 b3dm 的 `BATCH_LENGTH` 为 0、不含 batch table，
  `scene.pick` 返回的不是 `Cesium3DTileFeature` 而是 `Cesium3DTileset`
- 所以 `pickEntity` 必须多一个 `tileMesh` 分支，把「点中了但没属性」
  和「压根没点中」区分开。不加这个分支，现象会被当成拾取失败，
  教学点反而被淹没
- **不把它搬到光谷**。光谷没有公开的真实倾斜摄影数据源（国内成果基本不以
  开放 3D Tiles 发布），把法国数据挪过来会让场景在地理上失真，
  当学习素材容易形成错误直觉。数据留在圣艾蒂安原地，靠相机飞过去看，
  「整张蒙皮无单体」照样验证得了
- 数据实测 3750×3905m，比 200m 的白模研究区大近 20 倍，
  这也是它没法和白模并排摆的原因
- 该数据用 `region` 包围盒。region 是地理坐标，不跟随 `modelMatrix`，
  一旦搬迁容易出现「几何走了、剔除盒没走」——又一条别乱搬的理由

在 `PERF-LOG.md` 里记录两者的差异现象。

### 5.8 验收清单

- [ ] 五档数据量能自由切换，切换后实体数正确（不是累加）
- [ ] 性能面板 FPS / 实体数 / 加载耗时都在实时更新
- [ ] `PERF-LOG.md` 表格里没有任何预填数字
- [ ] SSE 滑块从 8 拖到 48，**肉眼能看到模型变粗糙**，已加载瓦片数明显下降
- [ ] 3D Tiles 和 GeoJSON 白模能同时显示在场景里
- [ ] 作者实现 3D Tiles 分支后，点选 tileset 建筑能拿到属性
- [ ] 点本地 batched 样例能拿到属性；点在线倾斜摄影明确提示「无单体」，
      且这两种提示与「没点中」三者互不混淆

---

## 全局非目标

以下明确**不做**，即使看起来很自然：

- 用户登录、权限、多租户
- Docker、CI、部署脚本
- 单元测试框架（验收靠肉眼和控制台）
- 倾斜摄影的单体化实现（5.7 只做对照观察，不做切割）
- OSGB 等原始成果的格式转换（面试问的是概念，不是现场转数据）
- 移动端适配
- 国际化
- 生产环境的错误上报、埋点
