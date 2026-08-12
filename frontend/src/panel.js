const countElement = document.querySelector(".building-count strong");
const contentElement = document.querySelector(".panel-content");
const themeButtons = [...document.querySelectorAll("[data-theme]")];
const themeMessageElement = document.querySelector(".theme-message");
const legendElement = document.querySelector(".theme-legend");

const STATUS_TITLES = {
  loading: "正在加载建筑数据…",
  ready: "白模加载完成",
  error: "加载失败",
};

/**
 * 更新面板顶部的建筑数量。
 * @param {number} count
 */
export function setBuildingCount(count) {
  countElement.textContent = String(count);
}


/**
 * 绑定专题切换按钮。
 * @param {(theme: "height"|"use"|"year") => void} onSelect
 * @returns {() => void} 解绑函数
 */
export function enableThemeControls(onSelect) {
  const listeners = themeButtons.map((button) => {
    const listener = () => onSelect(button.dataset.theme);
    button.addEventListener("click", listener);
    return [button, listener];
  });
  return () => {
    for (const [button, listener] of listeners) {
      button.removeEventListener("click", listener);
    }
  };
}

/**
 * 更新当前专题按钮状态。
 * @param {"height"|"use"|"year"} theme
 */
export function setActiveTheme(theme) {
  for (const button of themeButtons) {
    const active = button.dataset.theme === theme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

/**
 * 渲染专题图例。
 * @param {Array<{label: string, color: string}>} items
 */
export function renderLegend(items) {
  const elements = items.map(({ label, color }) => {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = color;
    const text = document.createElement("span");
    text.textContent = label;
    item.append(swatch, text);
    return item;
  });
  legendElement.replaceChildren(...elements);
}

/**
 * 更新专题切换提示。
 * @param {string} message
 * @param {boolean} [isError]
 */
export function renderThemeStatus(message, isError = false) {
  themeMessageElement.textContent = message;
  themeMessageElement.classList.toggle("is-error", isError);
}

/**
 * 渲染左侧建筑信息面板。
 * @param {Object|null} data - null 表示回到初始提示态
 * @param {"entity"|"tileFeature"} [data.type]
 * @param {string} [data.code]
 * @param {string} [data.name]
 * @param {number} [data.height]
 * @param {string} [data.heightSource]
 * @param {Array<[string, any]>} [data.properties]
 * @param {Object|null} [data.detail] - 业务属性，未返回时为 null
 * @param {string} [data.error] - 查询失败时的错误信息
 */
export function renderPanel(data) {
  contentElement.classList.toggle("is-error", Boolean(data?.error));
  if (!data) {
    renderInitialPanel();
    return;
  }

  if (data.error) {
    renderErrorPanel(data.error);
    return;
  }

  if (data.type === "tileFeature") {
    renderTilePanel(data);
    return;
  }

  renderEntityPanel(data);
}

function renderInitialPanel() {
  contentElement.replaceChildren(
    createLabel("阶段 5"),
    createHeading("选择建筑"),
    createHint("点击白模或 3D Tiles 建筑查看属性"),
  );
}

function renderErrorPanel(message) {
  contentElement.replaceChildren(
    createLabel("阶段 5"),
    createHeading("查询失败"),
    createHint(`${message}\n详情见控制台`),
  );
}

function renderTilePanel(data) {
  contentElement.replaceChildren(
    createLabel("3D Tiles"),
    createHeading(data.name ?? "3D Tiles 建筑"),
    createCode(data.code),
    createRows(data.properties ?? []),
  );
}

function renderEntityPanel(data) {
  const children = [
    createLabel("Entity 白模"),
    createHeading(data.name),
    createCode(data.code),
    createRows([
      ["建筑高度", `${data.height} m`],
      ["高度来源", data.heightSource],
    ]),
  ];

  if (data.detail === null) {
    children.push(createHint("正在查询业务属性…"));
  } else {
    children.push(
      createRows([
        ["权属单位", data.detail?.["权属单位"]],
        ["用途", data.detail?.["用途"]],
        ["竣工年份", data.detail?.["竣工年份"]],
        ["实有单位数", data.detail?.["实有单位数"]],
        ["数据来源", data.detail?.["数据来源"]],
      ]),
    );
  }
  contentElement.replaceChildren(...children);
}

/**
 * 渲染阶段 2 的加载状态。
 * @param {"loading"|"ready"|"error"} status
 * @param {string} [detail]
 */
export function renderLoadStatus(status, detail = "") {
  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = "阶段 2";

  const title = document.createElement("h2");
  title.textContent = STATUS_TITLES[status];
  const message = document.createElement("p");
  message.className = "panel-hint";
  message.textContent = detail;

  contentElement.classList.toggle("is-error", status === "error");
  contentElement.replaceChildren(label, title, message);
}

function createLabel(text) {
  const element = document.createElement("p");
  element.className = "section-label";
  element.textContent = text;
  return element;
}

function createHeading(text) {
  const element = document.createElement("h2");
  element.textContent = text ?? "未命名建筑";
  return element;
}

function createCode(text) {
  const element = document.createElement("p");
  element.className = "building-code";
  element.textContent = text ?? "未知编码";
  return element;
}

function createHint(text) {
  const element = document.createElement("p");
  element.className = "panel-hint";
  element.textContent = text;
  return element;
}

function createRows(rows) {
  const element = document.createElement("dl");
  element.className = "property-list";
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value == null || value === "" ? "—" : String(value);
    element.append(term, description);
  }
  return element;
}
