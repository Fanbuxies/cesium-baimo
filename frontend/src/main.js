import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { createViewer, useTiandituBasemap } from "./viewer.js";
import { loadBuildings, setObliqueView } from "./buildings.js";
import { enablePicking } from "./picking.js";
import { queryBuildingDetail } from "./api.js";
import {
  enableThemeControls,
  renderLegend,
  renderLoadStatus,
  renderPanel,
  renderThemeStatus,
  setActiveTheme,
  setBuildingCount,
} from "./panel.js";
import {
  enableDatasetControl,
  enableObliqueControl,
  enableSseControl,
  renderLoadTime,
  renderObliqueStatus,
  renderPerfStats,
  renderTilesetStats,
  renderTilesetStatus,
  setDatasetControlDisabled,
  setObliqueControlDisabled,
  setObliqueLoaded,
  setSseControlDisabled,
} from "./perf-panel.js";
import { applyTheme, createTheme } from "./theme.js";
import { startPerfMonitor } from "./perf.js";
import {
  getTilesetStats,
  loadTileset,
  moveTileset,
  setScreenSpaceError,
} from "./tileset.js";

const DATASETS = {
  sample: "/buildings-sample.geojson",
  500: "/buildings-500.geojson",
  2000: "/buildings-2000.geojson",
  5000: "/buildings-5000.geojson",
  20000: "/buildings-20000.geojson",
};
const TILE_STATS_INTERVAL = 500;
// 法国 CRAIG 公开的圣艾蒂安实景三维（Etalab 开放许可），已开 CORS。
// 这是唯一一处远程运行时资源，用于对照本地 batched 样例：它点不出属性。
const OBLIQUE_URL =
  "https://3d.craig.fr/datasets/St-Etienne_oblique/3dtiles/tileset.json";
// 不搬迁：光谷没有公开的真实倾斜摄影，把法国数据挪过来会让场景在地理上失真。
// 数据留在圣艾蒂安原地，靠相机飞过去看，「整张蒙皮无单体」照样验证得了

const viewer = createViewer("cesium-container");
// 网络响应返回顺序不固定，旧请求晚到时不能覆盖用户最后点击的建筑
let requestSeq = 0;
let themeRequestSeq = 0;
let datasetRequestSeq = 0;
let currentDataSource;
let currentTheme = "height";
let detailTileset;
let obliqueTileset;
let obliqueBusy = false;

useTiandituBasemap(viewer, import.meta.env.VITE_TIANDITU_TOKEN);

async function initializeBuildings() {
  enablePicking(viewer, { onPick: handlePick });
  enableThemeControls((theme) => void switchTheme(theme));
  enableDatasetControl((dataset) => void switchDataset(dataset));
  enableObliqueControl(
    () => void toggleOblique(),
    () => void returnToStudyArea(),
  );
  startPerfMonitor(viewer, renderPerfStats);
  await switchDataset("sample");
}

async function switchDataset(dataset) {
  const url = DATASETS[dataset];
  if (!url) return;
  datasetRequestSeq += 1;
  const currentRequest = datasetRequestSeq;
  setDatasetControlDisabled(true);
  renderLoadStatus("loading", `正在读取 ${datasetLabel(dataset)} GeoJSON…`);
  removeCurrentDataSource();
  try {
    const result = await loadBuildings(viewer, url);
    if (currentRequest !== datasetRequestSeq) {
      viewer.dataSources.remove(result.dataSource, true);
      return;
    }
    const { dataSource, count, loadTime } = result;
    currentDataSource = dataSource;
    setBuildingCount(count);
    renderLoadTime(loadTime);
    renderLoadStatus("ready", `已生成 ${count} 栋建筑白模。`);
    await switchTheme(currentTheme);
  } catch (error) {
    console.error("建筑数据加载失败：", error);
    if (currentRequest === datasetRequestSeq) {
      renderLoadStatus("error", error.message);
      setBuildingCount(0);
    }
  } finally {
    if (currentRequest === datasetRequestSeq) {
      setDatasetControlDisabled(false);
    }
  }
}

function removeCurrentDataSource() {
  if (!currentDataSource) return;
  // remove 的 destroy 参数必须是 true，否则旧实体仍占用资源，性能数据会失真
  viewer.dataSources.remove(currentDataSource, true);
  currentDataSource = undefined;
}

function datasetLabel(dataset) {
  return dataset === "sample" ? "示例（12）" : dataset;
}

async function switchTheme(theme) {
  currentTheme = theme;
  const dataSource = currentDataSource;
  if (!dataSource) return;
  themeRequestSeq += 1;
  const currentRequest = themeRequestSeq;
  renderThemeStatus("正在切换专题…");
  try {
    const { colorMap, legend } = await createTheme(dataSource, theme);
    if (currentRequest !== themeRequestSeq) return;
    const updatedCount = applyTheme(dataSource, colorMap);
    setActiveTheme(theme);
    renderLegend(legend);
    renderThemeStatus(`已更新 ${updatedCount} 栋建筑`);
  } catch (error) {
    console.error("专题着色失败：", error);
    if (currentRequest === themeRequestSeq) {
      renderThemeStatus(error.message, true);
    }
  }
}

function handlePick(result) {
  requestSeq += 1;
  const currentRequest = requestSeq;
  if (!result) {
    renderPanel(null);
    return;
  }
  if (result.type === "tileFeature") {
    renderTileFeature(result);
    return;
  }
  // 倾斜摄影没有单体，不能按 Entity 那样拿 code 去查后端
  if (result.type === "tileMesh") {
    renderPanel({ type: "tileMesh" });
    return;
  }

  const entity = result.raw;
  const baseData = {
    type: "entity",
    code: result.code ?? "未知编码",
    name: result.getProperty("name") ?? "未命名建筑",
    height: entity._computedHeight,
    heightSource: entity._heightSource,
  };
  if (baseData.code.startsWith("WH-PERF-")) {
    renderPanel({ ...baseData, detail: createGeneratedDetail(result) });
    return;
  }
  renderPanel({ ...baseData, detail: null });
  void loadDetail(baseData, currentRequest);
}

function renderTileFeature(result) {
  const properties = result.raw.getPropertyIds().map((key) => [
    key,
    formatPropertyValue(result.getProperty(key)),
  ]);
  renderPanel({
    type: "tileFeature",
    code: result.code ?? "无业务编码",
    name: findTileName(result),
    properties,
  });
}

function findTileName(result) {
  const keys = ["name", "Name", "id", "buildingId"];
  const key = keys.find((candidate) => result.raw.hasProperty(candidate));
  return key ? String(result.getProperty(key)) : "3D Tiles 建筑";
}

function createGeneratedDetail(result) {
  return {
    权属单位: "性能测试数据",
    用途: result.getProperty("use"),
    竣工年份: result.getProperty("year"),
    实有单位数: "—",
    数据来源: "本地生成脚本",
  };
}

async function loadDetail(baseData, currentRequest) {
  try {
    const detail = await queryBuildingDetail(baseData.code);
    if (currentRequest !== requestSeq) return;
    renderPanel({ ...baseData, detail });
  } catch (error) {
    console.error("建筑业务属性查询失败：", error);
    if (currentRequest === requestSeq) {
      renderPanel({ ...baseData, error: `业务属性查询失败：${error.message}` });
    }
  }
}

async function initializeTilesets() {
  setSseControlDisabled(true);
  enableSseControl(handleSseChange);
  renderTilesetStatus("正在加载本地 3D Tiles 样例…");
  try {
    detailTileset = await loadTileset(viewer, "/tileset/batched/tileset.json");
    moveTileset(detailTileset, 114.3988, 30.5055);
    setSseControlDisabled(false);
    renderTilesetStatus("属性样例已加载");
    refreshTilesetStats();
    window.setInterval(refreshTilesetStats, TILE_STATS_INTERVAL);
  } catch (error) {
    console.error("3D Tiles 初始化失败：", error);
    removeTilesets();
    renderTilesetStatus(error.message, true);
  }
}

function handleSseChange(value) {
  if (!detailTileset) return;
  try {
    setScreenSpaceError(detailTileset, value);
    refreshTilesetStats();
  } catch (error) {
    console.error("SSE 调整失败：", error);
    renderTilesetStatus(error.message, true);
  }
}

function refreshTilesetStats() {
  if (!detailTileset) return;
  renderTilesetStats(
    getTilesetStats(detailTileset),
    detailTileset.maximumScreenSpaceError,
  );
}

function removeTilesets() {
  if (detailTileset) viewer.scene.primitives.remove(detailTileset);
  detailTileset = undefined;
}

async function toggleOblique() {
  if (obliqueBusy) return;
  if (obliqueTileset) {
    removeOblique();
    renderObliqueStatus("已移除。点「加载」可重新拉取。");
    await returnToStudyArea();
    return;
  }

  obliqueBusy = true;
  setObliqueControlDisabled(true);
  renderObliqueStatus("正在拉取法国 CRAIG 的瓦片，海外服务器较慢…");
  const startedAt = performance.now();
  try {
    obliqueTileset = await loadTileset(viewer, OBLIQUE_URL);
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    setObliqueLoaded(true);
    renderObliqueStatus(
      `已加载（${seconds}s），镜头飞到法国圣艾蒂安。点击模型看看能否取到属性。`,
    );
    await viewer.zoomTo(obliqueTileset);
  } catch (error) {
    console.error("倾斜摄影加载失败：", error);
    removeOblique();
    renderObliqueStatus(`加载失败：${error.message}`, true);
  } finally {
    obliqueBusy = false;
    setObliqueControlDisabled(false);
  }
}

function removeOblique() {
  if (obliqueTileset) viewer.scene.primitives.remove(obliqueTileset);
  obliqueTileset = undefined;
  setObliqueLoaded(false);
}

/** 看完倾斜摄影后把镜头摆回白模研究区。 */
async function returnToStudyArea() {
  if (!currentDataSource) return;
  await viewer.zoomTo(currentDataSource);
  setObliqueView(viewer);
}

function formatPropertyValue(value) {
  if (value == null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

initializeBuildings();
void initializeTilesets();
