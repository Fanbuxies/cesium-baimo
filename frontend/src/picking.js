import * as Cesium from "cesium";

const HIGHLIGHT_COLOR = Cesium.Color.fromCssColorString("#ffd54a").withAlpha(0.95);
const tileBaseColors = new WeakMap();

/**
 * @typedef {Object} PickResult
 * @property {"entity"|"tileFeature"|"tileMesh"} type
 * @property {Cesium.Entity|Cesium.Cesium3DTileFeature|Cesium.Cesium3DTileset} raw
 * @property {string|undefined} code
 * @property {(key: string) => any} getProperty
 */

/**
 * 开启左键拾取。命中则高亮并回调实体，未命中则取消高亮并回调 null。
 * @param {Cesium.Viewer} viewer
 * @param {{onPick: (result: PickResult|null) => void}} options
 * @returns {() => void} 返回销毁函数，调用后解绑事件
 */
export function enablePicking(viewer, { onPick }) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  let activeResult;

  handler.setInputAction((movement) => {
    const result = pickEntity(viewer, movement.position);
    restoreResult(activeResult);
    activeResult = result;

    highlightResult(result);
    onPick(result ?? null);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return () => {
    restoreResult(activeResult);
    activeResult = undefined;
    handler.destroy();
  };
}

/**
 * 拾取窗口坐标下的 Entity 或 3D Tiles Feature。
 * @param {Cesium.Viewer} viewer
 * @param {Cesium.Cartesian2} windowPosition - 鼠标点击的窗口坐标
 * @returns {PickResult|undefined} 未命中建筑时返回 undefined
 */
export function pickEntity(viewer, windowPosition) {
  const picked = viewer.scene.pick(windowPosition);
  if (!Cesium.defined(picked)) return undefined;

  if (picked instanceof Cesium.Cesium3DTileFeature) {
    // 3D Tiles 属性在 batch table 中，不能按 Entity 的 PropertyBag 方式读取
    const propertyIds = picked.getPropertyIds();
    console.info("3D Tiles 属性名：", propertyIds);
    return {
      type: "tileFeature",
      raw: picked,
      code: readTileCode(picked),
      getProperty: (key) => picked.getProperty(key),
    };
  }

  // 真实倾斜摄影是一整张连续蒙皮：b3dm 的 BATCH_LENGTH 为 0、没有 batch table，
  // 所以拾取结果不是 Cesium3DTileFeature，拿不到任何单体属性。
  // 这一分支必须放在 Cesium3DTileFeature 判断之后——feature 的 primitive 同样是 tileset。
  if (picked.primitive instanceof Cesium.Cesium3DTileset) {
    return {
      type: "tileMesh",
      raw: picked.primitive,
      code: undefined,
      getProperty: () => undefined,
    };
  }

  if (!(picked.id instanceof Cesium.Entity) || !picked.id.polygon) return undefined;
  const entity = picked.id;
  return {
    type: "entity",
    raw: entity,
    code: readEntityProperty(entity, "code", viewer.clock.currentTime),
    getProperty: (key) => readEntityProperty(entity, key, viewer.clock.currentTime),
  };
}

function highlightResult(result) {
  if (result?.type === "entity") {
    result.raw.polygon.material = new Cesium.ColorMaterialProperty(HIGHLIGHT_COLOR);
    return;
  }
  if (result?.type === "tileFeature") {
    tileBaseColors.set(result.raw, Cesium.Color.clone(result.raw.color));
    result.raw.color = HIGHLIGHT_COLOR;
  }
}

function restoreResult(result) {
  if (result?.type === "entity") {
    const entity = result.raw;
    if (!entity.polygon || !entity._baseColor) return;
    // 必须使用独立保存的底色，不能从当前 material 取值，否则会把高亮色保存下来
    entity.polygon.material = new Cesium.ColorMaterialProperty(entity._baseColor);
    return;
  }
  if (result?.type === "tileFeature") {
    const baseColor = tileBaseColors.get(result.raw);
    if (baseColor) result.raw.color = baseColor;
    tileBaseColors.delete(result.raw);
  }
}

function readEntityProperty(entity, key, time) {
  const property = entity.properties?.[key];
  return property?.getValue ? property.getValue(time) : undefined;
}

function readTileCode(feature) {
  const keys = ["code", "id", "name", "buildingId"];
  const key = keys.find((candidate) => feature.hasProperty(candidate));
  const value = key ? feature.getProperty(key) : undefined;
  return value == null ? undefined : String(value);
}
