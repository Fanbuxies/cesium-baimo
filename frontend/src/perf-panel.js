const datasetSelect = document.querySelector("#dataset-select");
const fpsElement = document.querySelector('[data-perf="fps"]');
const entityCountElement = document.querySelector('[data-perf="entities"]');
const loadTimeElement = document.querySelector('[data-perf="load-time"]');
const sseRange = document.querySelector("#sse-range");
const sseValueElement = document.querySelector('[data-tileset="sse"]');
const tilesLoadedElement = document.querySelector('[data-tileset="loaded"]');
const tilesVisibleElement = document.querySelector('[data-tileset="visible"]');
const geometryMemoryElement = document.querySelector('[data-tileset="geometry"]');
const textureMemoryElement = document.querySelector('[data-tileset="texture"]');
const tilesetMessageElement = document.querySelector(".tileset-message");
const obliqueToggle = document.querySelector("#oblique-toggle");
const obliqueReturn = document.querySelector("#oblique-return");
const obliqueMessageElement = document.querySelector(".oblique-message");

/** @param {(dataset: string) => void} onSelect */
export function enableDatasetControl(onSelect) {
  const listener = () => onSelect(datasetSelect.value);
  datasetSelect.addEventListener("change", listener);
  return () => datasetSelect.removeEventListener("change", listener);
}

/** @param {boolean} disabled */
export function setDatasetControlDisabled(disabled) {
  datasetSelect.disabled = disabled;
}

/** @param {{fps: number, entityCount: number}} stats */
export function renderPerfStats({ fps, entityCount }) {
  fpsElement.textContent = String(fps);
  entityCountElement.textContent = String(entityCount);
}

/** @param {number} milliseconds */
export function renderLoadTime(milliseconds) {
  loadTimeElement.textContent = `${milliseconds.toFixed(1)} ms`;
}

/** @param {(value: number) => void} onInput */
export function enableSseControl(onInput) {
  const listener = () => onInput(Number(sseRange.value));
  sseRange.addEventListener("input", listener);
  return () => sseRange.removeEventListener("input", listener);
}

/** @param {boolean} disabled */
export function setSseControlDisabled(disabled) {
  sseRange.disabled = disabled;
}

/**
 * @param {{tilesLoaded: number, tilesVisible: number, geometryMemory: number, textureMemory: number}} stats
 * @param {number} sse
 */
export function renderTilesetStats(stats, sse) {
  sseValueElement.textContent = String(sse);
  tilesLoadedElement.textContent = String(stats.tilesLoaded);
  tilesVisibleElement.textContent = String(stats.tilesVisible);
  geometryMemoryElement.textContent = formatMegabytes(stats.geometryMemory);
  textureMemoryElement.textContent = formatMegabytes(stats.textureMemory);
}

/** @param {string} message @param {boolean} [isError] */
export function renderTilesetStatus(message, isError = false) {
  tilesetMessageElement.textContent = message;
  tilesetMessageElement.classList.toggle("is-error", isError);
}

/** @param {() => void} onToggle @param {() => void} onReturn */
export function enableObliqueControl(onToggle, onReturn) {
  obliqueToggle.addEventListener("click", onToggle);
  obliqueReturn.addEventListener("click", onReturn);
  return () => {
    obliqueToggle.removeEventListener("click", onToggle);
    obliqueReturn.removeEventListener("click", onReturn);
  };
}

/** @param {boolean} disabled */
export function setObliqueControlDisabled(disabled) {
  obliqueToggle.disabled = disabled;
}

/**
 * 同步倾斜摄影按钮的文案与「飞回光谷」的可用状态。
 * @param {boolean} loaded
 */
export function setObliqueLoaded(loaded) {
  obliqueToggle.textContent = loaded ? "移除倾斜摄影" : "加载在线倾斜摄影";
  obliqueToggle.classList.toggle("is-active", loaded);
  obliqueReturn.disabled = !loaded;
}

/** @param {string} message @param {boolean} [isError] */
export function renderObliqueStatus(message, isError = false) {
  obliqueMessageElement.textContent = message;
  obliqueMessageElement.classList.toggle("is-error", isError);
}

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
