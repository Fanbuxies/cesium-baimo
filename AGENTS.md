# AGENTS.md

本仓库是**个人学习用工程**，目标是让作者掌握 Cesium 白模构建与三维业务集成。
不是交付产品。所有代码修改必须遵守以下约束。

---

## 一、项目定位

- 单人学习项目，纯前端为主，第 4 阶段才接一个最小 Spring Boot
- 作者是 Java 后端出身（7 年），前端框架熟悉，**三维与图形是新领域**
- 代码要求：**可读性 > 精巧性 > 性能**
- 允许"不够健壮"，但不允许"看起来能跑实际算错"

---

## 二、技术栈（禁止替换）

| 项 | 选型 | 版本 |
|---|---|---|
| 构建 | Vite | ^5.4 |
| 三维 | CesiumJS | ^1.121 |
| Cesium 集成 | vite-plugin-cesium | ^1.2 |
| 语言 | 原生 JavaScript ESM | — |
| 样式 | 原生 CSS | — |
| 后端（阶段 4） | Spring Boot 3.x / Java 17 | — |
| 包管理 | npm | — |

**禁止引入**：TypeScript、React/Vue、Tailwind、任何 UI 组件库、任何状态管理库、
lodash、moment、axios（用原生 fetch）、测试框架。

需要新增依赖时，先在回复里说明理由并等待确认，不要直接装。

---

## 三、硬性技术约束

### 3.1 禁止任何 Cesium Ion 请求

作者在中国大陆，Ion 服务不可用，会导致页面长时间转圈。

```js
new Cesium.Viewer(container, {
  baseLayer: new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })
  ),
  baseLayerPicker: false,   // 会拉取 Ion 资产清单
  geocoder: false,          // 会调 Ion 地名搜索
  // ... 其余控件一并关闭
});
```

同时**禁止**使用：`Cesium.createWorldTerrain()`、`Cesium.createWorldImagery()`、
`Cesium.IonResource`、`Cesium.IonImageryProvider`、`Cesium.Ion.defaultAccessToken`。

地形一律使用默认椭球（不显式设置 `terrainProvider`）。

### 3.2 坐标系

GeoJSON 统一按 **EPSG:4326**（经纬度）处理。必须对坐标范围做校验，
超出 `[-180,180] × [-90,90]` 时给出明确报错，不允许静默失败。

### 3.3 异常处理

不允许空 catch 或吞异常。加载失败必须在 UI 面板上显示人能看懂的原因，
并在 console 打印完整 error 对象。

### 3.4 不要过度设计

这个项目**不需要**：工厂模式、依赖注入、事件总线、插件系统、配置中心、
抽象基类、装饰器。看到自己在写"为了以后好扩展"的代码就停下。

---

## 四、代码风格

- 注释一律**中文**
- 注释解释"为什么"，不解释"是什么"
  - 好：`// clampToGround 必须 false，贴地和拉伸互斥，设 true 会让 extrudedHeight 失效`
  - 差：`// 加载 GeoJSON 数据源`
- **Cesium API 的坑必须写进注释**，例如 PropertyBag 取值要 `.getValue()`、
  `scene.pick` 返回结构因数据类型而异、材质要用 `ColorMaterialProperty` 包装
- 单文件不超过 300 行，超了拆
- 单函数不超过 40 行
- 可调参数提成文件顶部的大写常量，方便作者改了看效果

---

## 五、教学约束（最重要，违反即返工）

SPEC.md 中标注 `[自己写]` 的函数**必须留给作者本人实现**。
你只写：函数签名、JSDoc 注释、调用点。函数体统一为：

```js
/**
 * ...（完整 JSDoc，说明入参出参与实现要点）
 * TODO(作者实现)：见 STUBS.md 第 N 节
 */
function resolveHeight(properties) {
  throw new Error("resolveHeight 未实现，见 STUBS.md");
}
```

**不要因为"程序跑不起来"就顺手实现掉。** 跑不起来是预期状态。

当前留给作者的函数共 4 个：

1. `resolveHeight`（阶段 2）
2. `pickEntity`（阶段 3）
3. `applyTheme`（阶段 4）
4. `pickEntity` 的 3D Tiles 分支扩展（阶段 5）

---

## 六、工作节奏

- **一次只做一个阶段**，即使提示词看起来可以顺手多做一点
- 每阶段完成后跑 `npm run build` 确认无报错
- 每阶段回复末尾固定给三段：
  1. **改动清单**：新增/修改哪些文件，各自做了什么
  2. **需要手动验证**：作者要点开看什么、点什么、观察什么
  3. **偏离说明**：有没有和 SPEC 不一致的地方，为什么

---

## 七、已知坑位（这些错误不要犯）

| 错误写法 | 后果 | 正确写法 |
|---|---|---|
| `polygon.material = Cesium.Color.RED` | 静默不生效 | `new Cesium.ColorMaterialProperty(Cesium.Color.RED)` |
| `properties["height"]` 直接当数值 | 拿到的是 ConstantProperty 对象 | `properties["height"]?.getValue()` |
| `clampToGround: true` + `extrudedHeight` | 拉伸失效，只剩贴地面片 | `clampToGround: false` |
| 只设 `extrudedHeight` 不设 `height` | 部分版本下底面位置异常 | 两个都设，`height = 0` |
| `viewer.zoomTo()` 后立刻 `setView` | zoomTo 是异步的，setView 会被覆盖 | `await viewer.zoomTo()` 之后再 setView |
| 高亮时直接存 `polygon.material` | 存的是引用，还原拿到的还是高亮色 | 单独存 `_baseColor` 色值 |
| 属性名含冒号用点号访问 | `properties.building:levels` 是语法错误 | `properties["building:levels"]` |
