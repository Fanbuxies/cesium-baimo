# 阶段 4 后端接入与专题着色 Implementation Plan

> **For agentic workers:** Execute the steps task-by-task with verification checkpoints.

**Goal:** 用最小 Spring Boot 服务替换阶段 3 mock，并为 12 栋建筑增加高度、用途、年份三种专题配色和图例。

**Architecture:** 后端只包含启动类、一个内存数据控制器和一个 CORS 配置，不接数据库。前端 `api.js` 负责 HTTP 与错误翻译，`theme.js` 负责 code 到 Cesium Color 的转换和实体换色，`panel.js/main.js` 负责交互装配。

**Tech Stack:** Java 17、Spring Boot 3.2.x、Maven、原生 JavaScript ESM、CesiumJS 1.121、Vite。

---

### Task 1: 最小 Spring Boot 后端

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/example/cesiumbaimo/BackendApplication.java`
- Create: `backend/src/main/java/com/example/cesiumbaimo/BuildingController.java`
- Create: `backend/src/main/java/com/example/cesiumbaimo/WebConfig.java`
- Create: `backend/src/main/resources/application.properties`
- Create: `backend/README.md`

- [ ] 创建只含 `spring-boot-starter-web` 的 Spring Boot 3.2.x Maven 工程，编译版本固定为 Java 17。
- [ ] 在 `BuildingController` 中定义不可变的 12 条 `Building` 记录和 code 索引；详情接口返回记录或 404 `{message}`。
- [ ] 主题接口只接受 `use/year`；返回 `LinkedHashMap<code,value>`，非法字段返回 400 `{message}`。
- [ ] `WebConfig` 只为 `/api/**` 放开 `http://localhost:5173` 的 GET 请求。
- [ ] README 写明 `mvn spring-boot:run`、8080 端口以及详情、主题、非法字段的 curl 命令。
- [ ] 运行 `mvn -f backend/pom.xml package -DskipTests`，预期 `BUILD SUCCESS`。

### Task 2: 前端真实 API

**Files:**
- Modify: `src/api.js`
- Modify: `src/main.js`
- Modify: `src/panel.js`

- [ ] `queryBuildingDetail(code)` 请求 `${BASE}/api/building/${encodeURIComponent(code)}`。
- [ ] `queryTheme(field)` 请求 `${BASE}/api/buildings/theme?field=${encodeURIComponent(field)}`。
- [ ] fetch 的 `TypeError` 转成“后端未启动”提示；详情 404 和主题 400 转成 SPEC 指定的人类可读错误。
- [ ] 把后端英文键 `owner/use/year/unitCount` 转换成面板现有中文字段，并保留请求序号竞态保护。

### Task 3: 专题配色与面板控件

**Files:**
- Modify: `src/theme.js`
- Modify: `src/buildings.js`
- Modify: `src/panel.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/style.css`

- [ ] `buildColorMap(themeData, palette)` 将后端值映射为 code→Color；年份先按 `<2010/2010-2014/2015-2018/>2018` 分档。
- [ ] `applyTheme(dataSource, colorMap)` 遍历 polygon Entity，设置 `ColorMaterialProperty` 并同步 `_baseColor`；缺色使用灰色。
- [ ] 高度主题按 `_computedHeight` 重新生成默认色并同步 `_baseColor`。
- [ ] 面板底部增加三个按钮和图例容器，切换时更新激活态、请求后端主题并渲染图例。
- [ ] 主题请求失败时显示可读错误并在控制台保留完整 Error。

### Task 4: 验证

- [ ] 用 Node 断言验证 `buildColorMap/applyTheme` 的映射、灰色兜底和 `_baseColor` 更新。
- [ ] 运行 `npm run build`，预期 Vite 构建退出码 0。
- [ ] 启动后端后验证详情 200、未知 code 404、use/year 主题 200、非法 field 400 和 CORS 响应头。
- [ ] 手动验证后端关闭提示、三种主题、图例，以及高亮取消后恢复当前主题色。

