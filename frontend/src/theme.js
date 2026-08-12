import * as Cesium from "cesium";
import { colorByHeight, NORMAL_ALPHA } from "./buildings.js";
import { queryTheme } from "./api.js";

export const OTHER_COLOR = createColor("#7f858a");
export const USE_PALETTE = new Map([
  ["办公", createColor("#6f9bc4")],
  ["住宅", createColor("#8fb08c")],
  ["商业", createColor("#d99a4e")],
  ["教育", createColor("#a48fc4")],
  ["医疗", createColor("#c47f8f")],
  ["公共服务", createColor("#7fb8b0")],
]);
export const YEAR_PALETTE = new Map([
  ["2010 年前", createColor("#7f9db5")],
  ["2010–2014", createColor("#8fb08c")],
  ["2015–2018", createColor("#d99a4e")],
  ["2018 年后", createColor("#c47f8f")],
]);

/**
 * 按 code → Color 的映射批量更新建筑配色。
 * @param {Cesium.GeoJsonDataSource} dataSource
 * @param {Map<string, Cesium.Color>} colorMap
 * @returns {number} 实际更新的实体数量
 */
export function applyTheme(dataSource, colorMap) {
  let updatedCount = 0;
  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue;
    // PropertyBag 里的 code 是 ConstantProperty，直接读取会拿到包装对象
    const code = entity.properties?.["code"]?.getValue();
    const color = colorMap.get(code) ?? OTHER_COLOR;
    entity.polygon.material = new Cesium.ColorMaterialProperty(color);
    entity._baseColor = color;
    updatedCount += 1;
  }
  return updatedCount;
}

/**
 * 生成 code → Color 的映射。
 * @param {Object} themeData - code → 分类值
 * @param {Map<unknown, Cesium.Color>} palette - 分类值 → 颜色
 * @returns {Map<string, Cesium.Color>}
 */
export function buildColorMap(themeData, palette) {
  const colorMap = new Map();
  for (const [code, value] of Object.entries(themeData)) {
    colorMap.set(code, palette.get(value) ?? OTHER_COLOR);
  }
  return colorMap;
}

/**
 * 将年份转换为专题图例分档。
 * @param {number|string} value
 * @returns {string}
 */
export function categorizeYear(value) {
  const year = Number(value);
  if (year < 2010) return "2010 年前";
  if (year <= 2014) return "2010–2014";
  if (year <= 2018) return "2015–2018";
  return "2018 年后";
}

/**
 * 创建指定专题的建筑配色和图例。
 * @param {Cesium.GeoJsonDataSource} dataSource
 * @param {"height"|"use"|"year"} theme
 * @returns {Promise<{colorMap: Map<string, Cesium.Color>, legend: Array<{label: string, color: string}>}>}
 */
export async function createTheme(dataSource, theme) {
  if (theme === "height") {
    return {
      colorMap: buildHeightColorMap(dataSource),
      legend: heightLegend(),
    };
  }
  const themeData = await queryTheme(theme);
  if (theme === "use") {
    return {
      colorMap: buildColorMap(themeData, USE_PALETTE),
      legend: paletteLegend(USE_PALETTE),
    };
  }
  const categorized = Object.fromEntries(
    Object.entries(themeData).map(([code, year]) => [code, categorizeYear(year)]),
  );
  return {
    colorMap: buildColorMap(categorized, YEAR_PALETTE),
    legend: paletteLegend(YEAR_PALETTE),
  };
}

function buildHeightColorMap(dataSource) {
  const colorMap = new Map();
  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue;
    const code = entity.properties?.code?.getValue();
    colorMap.set(
      code,
      colorByHeight(entity._computedHeight).withAlpha(NORMAL_ALPHA),
    );
  }
  return colorMap;
}

function heightLegend() {
  return [
    ["低于 25m", 0],
    ["25–50m", 25],
    ["50–90m", 50],
    ["高于 90m", 91],
  ].map(([label, height]) => ({
    label,
    color: colorByHeight(height).withAlpha(NORMAL_ALPHA).toCssColorString(),
  }));
}

function paletteLegend(palette) {
  return [...palette].map(([label, color]) => ({
    label,
    color: color.toCssColorString(),
  }));
}

function createColor(cssColor) {
  return Cesium.Color.fromCssColorString(cssColor).withAlpha(NORMAL_ALPHA);
}
