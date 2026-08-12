import * as Cesium from "cesium";

const DEFAULT_SCREEN_SPACE_ERROR = 16;
const MIN_SCREEN_SPACE_ERROR = 2;
const MAX_SCREEN_SPACE_ERROR = 64;

/**
 * 加载本地 3D Tiles 并加入场景。
 * @param {Cesium.Viewer} viewer
 * @param {string} url
 * @returns {Promise<Cesium.Cesium3DTileset>}
 */
export async function loadTileset(viewer, url) {
  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
      maximumScreenSpaceError: DEFAULT_SCREEN_SPACE_ERROR,
    });
    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch (error) {
    throw new Error(`3D Tiles 加载失败：${error.message}`, { cause: error });
  }
}

/**
 * 将 tileset 的局部东-北-天坐标系移动到目标经纬度。
 * @param {Cesium.Cesium3DTileset} tileset
 * @param {number} longitude
 * @param {number} latitude
 * @param {number} [height]
 */
export function moveTileset(tileset, longitude, latitude, height = 0) {
  const sourceCenter = tileset.boundingSphere.center;
  const sourcePosition = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(sourceCenter);
  if (!sourcePosition) {
    throw new Error("3D Tiles 包围球中心无法转换为地表坐标。");
  }
  const sourceFrame = Cesium.Transforms.eastNorthUpToFixedFrame(sourcePosition);
  const targetPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
  const targetFrame = Cesium.Transforms.eastNorthUpToFixedFrame(targetPosition);
  const inverseSource = Cesium.Matrix4.inverseTransformation(
    sourceFrame,
    new Cesium.Matrix4(),
  );
  tileset.modelMatrix = Cesium.Matrix4.multiply(
    targetFrame,
    inverseSource,
    new Cesium.Matrix4(),
  );
}

/**
 * 调整屏幕空间误差阈值。
 * @param {Cesium.Cesium3DTileset} tileset
 * @param {number|string} value
 */
export function setScreenSpaceError(tileset, value) {
  const numericValue = Number(value);
  if (
    !Number.isFinite(numericValue) ||
    numericValue < MIN_SCREEN_SPACE_ERROR ||
    numericValue > MAX_SCREEN_SPACE_ERROR
  ) {
    throw new Error("SSE 必须是 2–64 之间的数值。");
  }
  tileset.maximumScreenSpaceError = numericValue;
}

/**
 * 读取当前 Tileset 统计信息。
 * @param {Cesium.Cesium3DTileset} tileset
 * @returns {{tilesLoaded: number, tilesVisible: number, geometryMemory: number, textureMemory: number}}
 */
export function getTilesetStats(tileset) {
  const statistics = tileset.statistics;
  return {
    tilesLoaded: statistics.numberOfTilesWithContentReady,
    tilesVisible: statistics.selected,
    geometryMemory: statistics.geometryByteLength,
    textureMemory: statistics.texturesByteLength,
  };
}
