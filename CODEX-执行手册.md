# CODEX 执行手册

> 用法：一次贴一段提示词，验收通过并 commit 之后再贴下一段。
> 提示词可以直接复制，方括号里的内容按需替换。

---

## 零、开工前

```bash
mkdir cesium-baimo && cd cesium-baimo
git init
# 把 AGENTS.md、SPEC.md、STUBS.md 三个文件拷进来
git add . && git commit -m "docs: 需求与约束"
codex
```

Codex CLI 会自动读 `AGENTS.md`。**先验证它真的读进去了**：

```
读一下 AGENTS.md、SPEC.md、STUBS.md，回答我三个问题，不要写任何代码：
1. 这个项目为什么禁止 Cesium Ion？
2. 一共有几个函数是留给我自己实现的，分别叫什么？
3. 阶段 2 的验收清单里，哪一条是用来验证"数据质量问题"的？
```

三个都答对再往下走。答不对说明文件没被读到，检查路径。

---

## 一、阶段 1：工程骨架

### 提示词

```
按 docs/SPEC.md 阶段 1 实现工程骨架，只做阶段 1。

重点确认：
- AGENTS.md 3.1 禁止 Ion 的所有要求
- viewer.js 要导出 createViewer 和 useTiandituBasemap 两个函数
- 目录结构按 docs/SPEC.md 第零节建好，src 下的文件先建空壳（带模块注释即可）
- main.js 只做装配，不写业务逻辑

完成后告诉我：怎么在 DevTools 里验证确实没有 Ion 请求。
```

### 你要验的

打开 DevTools → Network → 过滤框输入 `cesium.com` → 刷新页面 → **请求数必须是 0**。

如果有请求，把 URL 贴给 Codex：

```
Network 里还有这个请求：[粘贴 URL]
是哪个 Viewer 配置项触发的？改掉它，不要用 try/catch 绕过。
```

### commit

```bash
git add . && git commit -m "feat: 阶段1 工程骨架与 Viewer 初始化"
```

---

## 二、阶段 2：白模拉伸

### 提示词

```
按 docs/SPEC.md 阶段 2 实现数据加载与白模拉伸，只做阶段 2。

特别注意：
- resolveHeight 在 SPEC 和 STUBS.md 里都标了 [自己写]，
  你只写函数签名、完整 JSDoc 和调用点，函数体写 throw new Error("resolveHeight 未实现，见 STUBS.md")。
  不要因为程序跑不起来就帮我实现，跑不起来是预期的。
- 示例数据严格按 SPEC 2.1 的字段表生成，记得故意留 2-3 栋缺 building:levels
- 坐标系校验的报错文案按 SPEC 2.5 原样输出
- AGENTS.md 第七节的坑位表逐条对照检查一遍

完成后列出：我需要手动改哪个常量来观察天际线变化。
```

### 然后你自己写 `resolveHeight`

打开 `STUBS.md` 第 1 节，照着实现。写完让 Codex 审：

```
我实现了 resolveHeight，代码如下：

[粘贴你的实现]

按 STUBS.md 第 1 节的验证用例表逐条检查，告诉我哪些会挂、为什么。
只指出问题，不要直接改代码。
另外补充：真实 OSM 数据里还有哪些脏值形式是我没考虑到的？
```

### 你要验的

对照 SPEC 2.7 的六条清单，逐条打勾。

特别是这条：**把 `FLOOR_HEIGHT` 从 3.0 改成 3.5，重载看天际线整体抬高。**
这一步是让你亲身体会"层高估算误差"，别跳过。

### commit

```bash
git add . && git commit -m "feat: 阶段2 白模拉伸与高度推算"
```

---

## 三、阶段 3：拾取与面板

### 提示词

```
按 docs/SPEC.md 阶段 3 实现拾取、高亮与信息面板，只做阶段 3。

特别注意：
- pickEntity 标了 [自己写]，留桩，见 STUBS.md 第 2 节
- 高亮还原必须用 entity._baseColor，不能读当前 material（AGENTS.md 第七节最后一行）
- SPEC 3.5 提到的请求竞态问题要处理，并在注释里说明为什么需要
- 面板三种状态（初始/加载中/错误）都要实现

完成后告诉我：如果我连续快速点击两栋楼，代码里哪一行保证了面板不会显示错的那栋。
```

### 然后你自己写 `pickEntity`

STUBS.md 第 2 节。**写的时候一定要临时加 `console.log(picked)`**，
把点建筑侧面、点顶面、点地面、点天空四种情况的返回结构都打出来看一遍。

看完再让 Codex 解释：

```
我在 scene.pick 的返回值上打了 log，点建筑时是这个结构：

[粘贴 console 输出]

解释一下 picked.id、picked.primitive、picked.collection 分别是什么，
以及为什么 GeoJSON 数据要通过 picked.id 拿实体。
```

### commit

```bash
git add . && git commit -m "feat: 阶段3 拾取高亮与属性面板"
```

---

## 四、阶段 4：后端与专题着色

### 提示词（分两次）

**第一次，只做后端：**

```
按 docs/SPEC.md 阶段 4.1 实现 backend/ 下的最小 Spring Boot 工程，
前端部分先不动。

约束：
- 只要 spring-boot-starter-web 一个依赖，不要 Lombok、Swagger、数据库
- 数据用内存 Map 硬编码，code 必须和 public/buildings-sample.geojson 里的一一对应
- 两个接口按 SPEC 4.1 的响应结构实现
- CORS 只放开 http://localhost:5173
- backend/README.md 里给出 curl 验证命令

完成后把两条 curl 命令直接给我，我要复制着跑。
```

**第二次，前端接入：**

```
按 SPEC.md 阶段 4.2 到 4.4 实现前端接入与专题着色。

特别注意：
- applyTheme 标了 [自己写]，留桩，见 STUBS.md 第 3 节
- 后端未启动、404 两种错误的提示文案按 SPEC 4.2 原样输出
- 主题切换后图例要跟着变
- 用途配色严格按 SPEC 4.3 的色值表
```

### 然后你自己写 `applyTheme`

STUBS.md 第 3 节。**这个函数只有十来行，但有一个必踩的坑**，
先自己实现，然后专门验这条：

> 切主题 → 点选某栋 → 点空白取消 → 看它恢复成什么颜色

如果恢复成了上一个主题的颜色，说明你漏了 `_baseColor` 那行。
**建议先故意写错跑一遍看现象，再改对**，印象会深得多。

### commit

```bash
git add . && git commit -m "feat: 阶段4 后端接入与专题着色"
```

---

## 五、阶段 5：性能实测与 3D Tiles

### 提示词（分两次）

**第一次，性能工具：**

```
按 SPEC.md 阶段 5.1 到 5.4 实现数据生成脚本、数据集切换和性能面板。

强制要求：
- PERF-LOG.md 只给表头模板，任何单元格都不许预填数字，我要自己实测
- 数据集切换必须真正 remove 旧 dataSource（第二个参数传 true），
  否则测出来的性能是错的
- FPS 取近 60 帧平均，不要用瞬时值

完成后告诉我：怎么确认旧数据真的被销毁了，而不是叠加在场景里。
```

**第二次，3D Tiles：**

```
按 SPEC.md 阶段 5.5 到 5.6 实现 3D Tiles 加载与 SSE 滑块。

特别注意：
- pickEntity 的 3D Tiles 分支仍然是 [自己写]，只加 TODO 和文档说明
- tileset 数据从 CesiumGS/3d-tiles-samples 拿，README 里写清取的是哪个、怎么下载
- SSE 滑块要实时显示 tileset.statistics.numberOfTilesLoaded
```

### 你要做的实测

打开 `PERF-LOG.md`，五档数据量各测一遍，填进去。

**这张表是这个项目最值钱的产出。** 面试时能说出
"我实测到大概 X 栋开始明显掉帧"，比任何背诵都有说服力。

SSE 滑块从 8 拖到 48，观察两件事：模型变粗糙的程度、已加载瓦片数的变化。
把观察结果也记在 PERF-LOG.md 里。

### commit

```bash
git add . && git commit -m "feat: 阶段5 性能实测与 3D Tiles"
```

---

## 六、卡住时的提示词

### 出 bug 了，别急着让它改

```
现在的现象是：[描述现象，比如"点建筑没反应，控制台无报错"]

先不要改代码。告诉我：
1. 这个现象可能有哪几种原因
2. 我应该在哪一行加什么 log 来区分这几种原因
```

### 想弄懂某段代码

```
解释 buildings.js 第 [N] 行到第 [M] 行：
为什么要这么写？如果改成 [你的另一种想法] 会发生什么？
```

### 它写复杂了

```
这段实现比 SPEC 要求复杂。按最小可读实现重写，
去掉 [具体指出的抽象]，直接内联就行。
```

### 它偷偷实现了 [自己写] 的函数

```
resolveHeight 是 STUBS.md 里标了留给我实现的，你把它实现了。
恢复成 throw new Error 的桩，其他改动保留。
```

### 每阶段收尾

```
总结这个阶段：
1. 改了哪些文件，各自做了什么
2. 我需要手动验证什么（对照 SPEC 的验收清单）
3. 有没有偏离 SPEC 的地方，为什么
```

---

## 七、纪律（违反了这个项目就白做了）

1. **一个阶段一个 commit。** 出问题能回退，比让 Codex 反复修同一处强得多。
2. **四个 `[自己写]` 的函数不许让它代劳。** 加起来不到 60 行，
   但对应了面试会问的绝大部分内容。Codex 要是偷偷实现了，用第六节的提示词让它还原。
3. **每次它改完，把 diff 从头读一遍。** 读不懂的地方就追问。
   这是整个项目唯一有价值的部分——代码本身谁写的不重要，你懂不懂才重要。
4. **PERF-LOG.md 必须自己实测填。** 让 Codex 编性能数字，
   等于把简历里刚删掉的夸大成分从另一个口子加了回来，而且这次是你自己加的。
5. **验收清单逐条打勾，不要目测"看起来对"。** 尤其是这三条：

   - 阶段 2：改层高看天际线变化
   - 阶段 3：连点两栋楼看颜色还原
   - 阶段 4：切主题后点选再取消看恢复成什么色

   这三条都是"看起来对但其实错了"的高发区。
