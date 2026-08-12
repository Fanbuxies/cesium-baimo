import * as Cesium from "cesium";

const OSM_URL = "https://tile.openstreetmap.org/";
const TIANDITU_URL =
  "https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk={token}";
const TIANDITU_SUBDOMAINS = ["0", "1", "2", "3", "4", "5", "6", "7"];

/**
 * 创建 Viewer。必须关闭所有会请求 Cesium Ion 的控件。
 * @param {string} containerId - DOM 容器 id
 * @returns {Cesium.Viewer}
 */
export function createViewer(containerId) {
  const baseLayer = new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({ url: OSM_URL }),
  );
  const viewer = new Cesium.Viewer(containerId, {
    baseLayer,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
  });

  viewer.scene.debugShowFramesPerSecond = true;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  return viewer;
}

/**
 * 切换到天地图底图。token 缺失时打印警告并直接返回，不抛异常。
 * @param {Cesium.Viewer} viewer
 * @param {string} token - 天地图申请的 key
 */
export function useTiandituBasemap(viewer, token) {
  if (!token?.trim()) {
    console.warn("未配置 VITE_TIANDITU_TOKEN，继续使用 OpenStreetMap 底图。");
    return;
  }

  const provider = new Cesium.UrlTemplateImageryProvider({
    url: TIANDITU_URL.replace("{token}", encodeURIComponent(token.trim())),
    subdomains: TIANDITU_SUBDOMAINS,
    maximumLevel: 18,
  });

  viewer.imageryLayers.removeAll(true);
  viewer.imageryLayers.addImageryProvider(provider);
}
