import * as Cesium from "cesium";

export const FLOOR_HEIGHT = 3.5; // 层高（米）。作者会改这个值观察天际线变化
export const DEFAULT_LEVELS = 3; // 属性缺失时的兜底层数
export const NORMAL_ALPHA = 0.88;

const LOW_COLOR = Cesium.Color.fromCssColorString("#8fb08c");
const MEDIUM_COLOR = Cesium.Color.fromCssColorString("#6f9bc4");
const HIGH_COLOR = Cesium.Color.fromCssColorString("#d99a4e");
const VERY_HIGH_COLOR = Cesium.Color.fromCssColorString("#c94f4f");
const OUTLINE_COLOR = Cesium.Color.fromCssColorString("#17242d").withAlpha(0.72);

/**
 * 加载 GeoJSON 并拉伸成白模。
 * @param {Cesium.Viewer} viewer
 * @param {string} url - GeoJSON 路径
 * @param {{adjustView?: boolean}} [options]
 * @returns {Promise<{dataSource: Cesium.GeoJsonDataSource, count: number, loadTime: number}>}
 * @throws {Error} 坐标系非法时抛出，message 见 SPEC 2.5
 */
export async function loadBuildings(viewer, url, { adjustView = true } = {}) {
  const startedAt = performance.now();
  const geoJson = await fetchSourceGeoJson(url);
  validateFirstPolygonCoordinate(geoJson);
  // clampToGround 必须 false，贴地和拉伸互斥，设 true 会让 extrudedHeight 失效
  const dataSource = await Cesium.GeoJsonDataSource.load(geoJson, {
    clampToGround: false,
  });

  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue;
    applyBuildingStyle(entity);
  }
  await viewer.dataSources.add(dataSource);
  const loadTime = performance.now() - startedAt;

  if (adjustView) {
    // zoomTo 是异步的，不等待会覆盖后面的斜视角
    await viewer.zoomTo(dataSource);
    setObliqueView(viewer);
  }
  return {
    dataSource,
    count: dataSource.entities.values.length,
    loadTime,
  };
}

/**
 * 按高度分档取色。<25m / 25-50m / 50-90m / >90m
 * @param {number} height
 * @returns {Cesium.Color}
 */
export function colorByHeight(height) {
  if (height < 25) return LOW_COLOR;
  if (height < 50) return MEDIUM_COLOR;
  if (height <= 90) return HIGH_COLOR;
  return VERY_HIGH_COLOR;
}

/**
 * 推算建筑高度。实现时需通过 PropertyBag 的 getValue() 读取属性，并按
 * height、building:levels、默认层数的优先级返回高度和来源说明。
 * @param {Cesium.PropertyBag} properties - 实体属性包
 * @returns {{height: number, source: string}}
 * TODO(作者实现)：见 STUBS.md 第 1 节
 */
export function resolveHeight(properties) {
  const height = readPositiveNumber(properties?.height);
  if (height !== undefined) {
    return { height, source: "height 字段（实测）" };
  }

  const levels = readPositiveNumber(properties?.["building:levels"]);
  if (levels !== undefined) {
    return {
      height: levels * FLOOR_HEIGHT,
      source: `${levels} 层 × ${FLOOR_HEIGHT}m`,
    };
  }

  return {
    height: DEFAULT_LEVELS * FLOOR_HEIGHT,
    source: `属性缺失，按默认 ${DEFAULT_LEVELS} 层估算`,
  };
}

function readPositiveNumber(property) {
  // PropertyBag 中存的是 ConstantProperty，必须先 getValue() 才能拿到原始值
  const rawValue = property?.getValue instanceof Function ? property.getValue() : property;
  if (typeof rawValue !== "number" && typeof rawValue !== "string") return undefined;

  const text = String(rawValue).trim();
  if (!text) return undefined;

  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function fetchSourceGeoJson(url) {
  // Cesium 加载后已转为 Cartesian3，需要读取原始坐标才能识别投影坐标系
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`读取 GeoJSON 失败（HTTP ${response.status}）`);
  }
  return response.json();
}

function validateFirstPolygonCoordinate(geoJson) {
  const feature = geoJson.features?.find(
    (item) => item.geometry?.type === "Polygon",
  );
  const coordinate = feature?.geometry?.coordinates?.[0]?.[0];
  if (!coordinate || coordinate.length < 2) {
    throw new Error("GeoJSON 中未找到可校验的 Polygon 坐标。");
  }

  const [x, y] = coordinate;
  if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90) {
    return;
  }
  throw new Error(
    `GeoJSON 坐标超出经纬度范围（读到 x=${x}, y=${y}）。\n` +
      "数据可能是投影坐标系（如 EPSG:3857 或 CGCS2000 高斯投影），\n" +
      "请在导出时改成 EPSG:4326。",
  );
}

function applyBuildingStyle(entity) {
  const { height, source } = resolveHeight(entity.properties);
  const baseColor = colorByHeight(height).withAlpha(NORMAL_ALPHA);
  const { polygon } = entity;
  // height 必须同时设为 0，否则部分 Cesium 版本的拉伸底面位置异常
  polygon.height = 0;
  polygon.extrudedHeight = height;
  // material 需要包装为 Property，直接赋 Color 会静默不生效
  polygon.material = new Cesium.ColorMaterialProperty(baseColor);
  polygon.outline = true;
  polygon.outlineColor = OUTLINE_COLOR;
  entity._baseColor = baseColor;
  entity._computedHeight = height;
  entity._heightSource = source;
}

/**
 * 把相机摆到光谷研究区的斜视角。看完远处的倾斜摄影后靠它飞回来。
 * @param {Cesium.Viewer} viewer
 */
export function setObliqueView(viewer) {
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(114.4005, 30.501, 900),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-35),
      roll: 0,
    },
  });
}
