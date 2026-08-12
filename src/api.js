const API_BASE = import.meta.env?.VITE_API_BASE ?? "http://localhost:8080";
const BACKEND_OFFLINE_MESSAGE =
  "后端未启动。请在 backend/ 目录执行 mvn spring-boot:run";

/**
 * 查询建筑业务属性。
 * @param {string} code
 * @returns {Promise<Object>}
 */
export async function queryBuildingDetail(code) {
  const response = await request(
    `${API_BASE}/api/building/${encodeURIComponent(code)}`,
  );
  if (response.status === 404) {
    throw new Error("后端未找到该编码，检查 GeoJSON 的 code 与后端数据是否一致");
  }
  if (!response.ok) {
    throw new Error(`后端返回 ${response.status}`);
  }

  const data = await response.json();
  return {
    "权属单位": data.owner,
    "用途": data.use,
    "竣工年份": data.year,
    "实有单位数": data.unitCount,
    "数据来源": "后端接口",
  };
}

/**
 * 查询用途或年份专题数据。
 * @param {"use"|"year"|string} field
 * @returns {Promise<Object>}
 */
export async function queryTheme(field) {
  const response = await request(
    `${API_BASE}/api/buildings/theme?field=${encodeURIComponent(field)}`,
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? `后端返回 ${response.status}`);
  }
  return response.json();
}

async function request(url) {
  try {
    return await fetch(url);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(BACKEND_OFFLINE_MESSAGE, { cause: error });
    }
    throw error;
  }
}
