# STUBS.md — 留给作者自己实现的函数

> 这四个函数 Codex **不会**帮你写，只会留桩。
> 加起来不到 60 行，但覆盖了面试会问的大部分内容。每个都附了验证用例，
> 写完照着跑一遍。

---

## 第 1 节：`resolveHeight(properties)` — 阶段 2

**文件**：`src/buildings.js`

### 要解决的问题

GeoJSON 里的建筑高度信息有三种可能：有 `height` 字段（实测值）、
有 `building:levels`（层数）、两个都没有。要按优先级推算出一个高度，
并说明这个高度是怎么来的。

### 签名

```js
/**
 * 推算建筑高度。
 * @param {Cesium.PropertyBag} properties - 实体属性包
 * @returns {{height: number, source: string}}
 *   height: 米
 *   source: 人类可读的来源说明，会显示在面板上
 */
export function resolveHeight(properties)
```

### 实现要点

1. **PropertyBag 取值要 `.getValue()`**。
   `properties["height"]` 拿到的是 `ConstantProperty` 对象不是数值，
   直接 `parseFloat` 会得到 `NaN`。写个小工具函数处理这层。
2. 属性名含冒号必须用中括号：`properties["building:levels"]`，
   点号访问是语法错误。
3. 优先级：`height` > `building:levels × FLOOR_HEIGHT` > `DEFAULT_LEVELS × FLOOR_HEIGHT`
4. `source` 三种文案：
   - `"height 字段（实测）"`
   - `"18 层 × 3.0m"`（层数和层高要代入实际值）
   - `"属性缺失，按默认 3 层估算"`

### 验证用例

写完后在控制台跑一遍（可以临时 export 出去测）：

| 输入 properties | 期望 height | 期望 source 含 |
|---|---|---|
| `{ height: "54.5" }` | 54.5 | 实测 |
| `{ "building:levels": "18" }` | 54.0 | 18 层 |
| `{}` | 9.0 | 默认 |
| `{ "building:levels": "" }` | 9.0 | 默认 |
| `{ "building:levels": "abc" }` | 9.0 | 默认 |
| `{ "building:levels": "-3" }` | 9.0 | 默认 |
| `{ "building:levels": "3.5" }` | 10.5 | 3.5 层 |
| `{ height: "0" }` | 9.0 | 默认（0 不算有效高度） |
| `{ height: "54.5", "building:levels": "18" }` | 54.5 | 实测（height 优先） |

**脏数据是重点。** 真实 OSM 数据里会出现 `"约5层"`、`"5-8"`、`"5;6"` 这类值，
你的实现要保证它们不会让整个加载流程崩掉。

### 这道题对应的面试问题

> "白模的高度是怎么来的？精度怎么样？"

答案就是你写的这个函数：依赖属性质量，缺失时只能估算，误差可能到几十米。

---

## 第 2 节：`pickEntity(viewer, windowPosition)` — 阶段 3

**文件**：`src/picking.js`

### 要解决的问题

`viewer.scene.pick()` 的返回结构因数据类型而异，这是新手最容易卡住的地方。

### 签名

```js
/**
 * 拾取窗口坐标下的建筑实体。
 * @param {Cesium.Viewer} viewer
 * @param {Cesium.Cartesian2} windowPosition - 鼠标点击的窗口坐标
 * @returns {Cesium.Entity|undefined} 未命中建筑时返回 undefined
 */
export function pickEntity(viewer, windowPosition)
```

### 实现要点

1. 调 `viewer.scene.pick(windowPosition)`
2. 返回值可能是：
   - `undefined` — 点到空白或地球表面
   - `{ id: Cesium.Entity, primitive: ... }` — **GeoJSON / Entity 数据走这条**
   - `Cesium3DTileFeature` 实例 — 3D Tiles 数据走这条（阶段 5 才用到）
3. 只有 `picked.id instanceof Cesium.Entity` 且该实体有 `polygon` 时才算命中建筑
4. 用 `Cesium.defined()` 判空，不要用 `if (picked)`（Cesium 的惯例）

### 阶段 5 要补的分支

```js
if (picked instanceof Cesium.Cesium3DTileFeature) {
  // 3D Tiles 的属性不在 entity.properties 里，要用 getProperty
  // const code = picked.getProperty("code");
  // 高亮方式也不同：改 picked.color 而不是 material
}
```

### 验证用例

- 点建筑侧面 → 返回该实体
- 点建筑顶面 → 返回同一个实体
- 点两栋楼之间的地面 → 返回 undefined
- 点天空 → 返回 undefined
- 快速拖动旋转后再点 → 仍能正确命中（说明没缓存过期坐标）

调试技巧：在函数里临时 `console.log(picked)`，把三种情况的返回结构都打出来看一遍。
**这一步别跳过**，看过实际结构以后，面试问"倾斜摄影为什么点不了单栋楼"你会答得很稳。

### 这道题对应的面试问题

> "倾斜摄影为什么点不了单栋楼？Entity 和 3DTileFeature 有什么区别？"

---

## 第 3 节：`applyTheme(dataSource, colorMap)` — 阶段 4

**文件**：`src/theme.js`

### 要解决的问题

按业务属性给一批建筑批量换色。这就是数公基里说的"专题着色"。

### 签名

```js
/**
 * 按 code → Color 的映射批量更新建筑配色。
 * @param {Cesium.GeoJsonDataSource} dataSource
 * @param {Map<string, Cesium.Color>} colorMap - key 是业务编码
 * @returns {number} 实际更新的实体数量
 */
export function applyTheme(dataSource, colorMap)
```

### 实现要点

1. 遍历 `dataSource.entities.values`，跳过没有 polygon 的
2. 从 `entity.properties["code"]` 取编码（记得 `.getValue()`）
3. colorMap 里没有该编码时，用一个"其他"灰色，不要跳过不处理
4. **必须同时更新 `entity._baseColor`**

第 4 点是这个函数唯一的坑，也是最值得记住的一点：

```js
entity.polygon.material = new Cesium.ColorMaterialProperty(color);
entity._baseColor = color;   // ← 忘了这行，取消高亮时会还原成旧主题的颜色
```

因为高亮逻辑是「切换时把上一个还原成 `_baseColor`」，主题变了但 `_baseColor`
没变的话，点选再取消，那栋楼就会变回上一个主题的颜色。

### 验证用例

- [ ] 切到"按用途"，六类用途颜色各不相同
- [ ] 切换后图例与实际颜色一致
- [ ] **切主题 → 点选某栋 → 点空白取消 → 该栋恢复的是新主题色**
- [ ] 后端返回的 theme 数据里少了某个 code，那栋楼显示灰色而不是保持旧色
- [ ] 连续切换主题五次，颜色不会错乱

### 这道题对应的面试问题

> "专题着色怎么实现的？一标三实数据怎么和三维实体挂接？"

答案：靠业务编码做主键关联，后端返回 code→分类值的映射，前端按 code 找实体换色。

---

## 第 4 节：3D Tiles 拾取分支 — 阶段 5

**文件**：`src/picking.js`（扩展第 2 节的函数）

### 要解决的问题

3D Tiles 的属性存在 batchTable 里，取值方式和 Entity 完全不同。

### 要实现的内容

1. `pickEntity` 增加 `Cesium3DTileFeature` 分支，返回一个统一结构：

```js
{
  type: "entity" | "tileFeature",
  raw: 原始对象,
  code: string | undefined,
  getProperty: (key) => any    // 统一的属性读取方法
}
```

2. 高亮方式也要分支：
   - Entity：改 `polygon.material`
   - TileFeature：改 `feature.color`（是 `Cesium.Color` 不是 MaterialProperty）

### 验证用例

- [ ] 点 3D Tiles 建筑，控制台能打出它的属性名列表
      （用 `feature.getPropertyIds()`）
- [ ] 点 tileset 建筑变高亮，点白模建筑也变高亮，两者切换时都能正确还原
- [ ] 面板对两种数据源显示的字段结构一致

### 这道题对应的面试问题

> "3D Tiles 的属性怎么读？batchTable 是什么？"

---

## 总结：为什么是这四个

| 函数 | 覆盖的面试点 |
|---|---|
| `resolveHeight` | 白模高度精度、数据质量问题、矢量面拉伸路线的固有缺陷 |
| `pickEntity` | 拾取机制、Entity vs 3DTileFeature、倾斜摄影单体化的必要性 |
| `applyTheme` | 专题着色、编码挂接、一标三实与三维实体的关联方式 |
| 3D Tiles 分支 | batchTable、属性存储方式差异 |

写这四个函数花的时间，比读完十篇 Cesium 教程有用得多。
**关键是每写完一个，把验证用例真的跑一遍**，观察到的现象就是你面试时的素材。
