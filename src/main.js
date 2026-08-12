import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { createViewer, useTiandituBasemap } from "./viewer.js";
import { loadBuildings } from "./buildings.js";
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
  enableSseControl,
  renderLoadTime,
  renderPerfStats,
  renderTilesetStats,
  renderTilesetStatus,
  setDatasetControlDisabled,
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

const viewer = createViewer("cesium-container");
// 网络响应返回顺序不固定，旧请求晚到时不能覆盖用户最后点击的建筑
let requestSeq = 0;
let themeRequestSeq = 0;
let datasetRequestSeq = 0;
let currentDataSource;
let currentTheme = "height";
let detailTileset;
let lodTileset;

useTiandituBasemap(viewer, import.meta.env.VITE_TIANDITU_TOKEN);

async function initializeBuildings() {
  enablePicking(viewer, { onPick: handlePick });
  enableThemeControls((theme) => void switchTheme(theme));
  enableDatasetControl((dataset) => void switchDataset(dataset));
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
    lodTileset = await loadTileset(viewer, "/tileset/lod/tileset.json");
    moveTileset(lodTileset, 114.4022, 30.5055);
    setSseControlDisabled(false);
    renderTilesetStatus("属性样例与 LOD 样例已加载");
    refreshTilesetStats();
    window.setInterval(refreshTilesetStats, TILE_STATS_INTERVAL);
  } catch (error) {
    console.error("3D Tiles 初始化失败：", error);
    removeTilesets();
    renderTilesetStatus(error.message, true);
  }
}

function handleSseChange(value) {
  if (!lodTileset) return;
  try {
    setScreenSpaceError(lodTileset, value);
    refreshTilesetStats();
  } catch (error) {
    console.error("SSE 调整失败：", error);
    renderTilesetStatus(error.message, true);
  }
}

function refreshTilesetStats() {
  if (!lodTileset) return;
  renderTilesetStats(getTilesetStats(lodTileset), lodTileset.maximumScreenSpaceError);
}

function removeTilesets() {
  if (detailTileset) viewer.scene.primitives.remove(detailTileset);
  if (lodTileset) viewer.scene.primitives.remove(lodTileset);
  detailTileset = undefined;
  lodTileset = undefined;
}

function formatPropertyValue(value) {
  if (value == null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

initializeBuildings();
void initializeTilesets();
