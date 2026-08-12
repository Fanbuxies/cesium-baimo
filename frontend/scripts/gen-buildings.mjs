import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_COUNTS = new Set([500, 2000, 5000, 20000]);
const CENTER_LONGITUDE = 114.4005;
const CENTER_LATITUDE = 30.5075;
const METERS_PER_LATITUDE_DEGREE = 111_320;
const USES = ["办公", "住宅", "商业", "教育", "医疗", "公共服务"];

const count = Number(process.argv[2]);
if (!Number.isInteger(count) || !ALLOWED_COUNTS.has(count)) {
  console.error("数量必须是 500、2000、5000 或 20000。");
  process.exitCode = 1;
} else {
  await generateGeoJson(count);
}

async function generateGeoJson(featureCount) {
  const columns = Math.ceil(Math.sqrt(featureCount));
  const rows = Math.ceil(featureCount / columns);
  const spacing = Math.max(44, 1800 / Math.sqrt(featureCount));
  const random = createRandom(featureCount);
  const features = Array.from({ length: featureCount }, (_, index) =>
    createFeature(index, columns, rows, spacing, random),
  );
  const outputDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../public",
  );
  const outputPath = path.join(outputDirectory, `buildings-${featureCount}.geojson`);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify({ type: "FeatureCollection", features }),
    "utf8",
  );
  console.log(`已生成 ${featureCount} 栋建筑：${outputPath}`);
}

function createFeature(index, columns, rows, spacing, random) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = (column - (columns - 1) / 2) * spacing;
  const y = (row - (rows - 1) / 2) * spacing;
  const width = 22 + random() * 9;
  const depth = 22 + random() * 9;
  const angle = random() * Math.PI;
  const properties = {
    code: `WH-PERF-${String(index + 1).padStart(5, "0")}`,
    name: `性能测试建筑${index + 1}栋`,
    use: USES[index % USES.length],
    building: "yes",
    year: 2005 + (index % 18),
  };
  if (index % 10 !== 0) {
    properties["building:levels"] = String(3 + (index % 28));
  }
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [rectangleCoordinates(x, y, width, depth, angle)],
    },
  };
}

function rectangleCoordinates(centerX, centerY, width, depth, angle) {
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ].map(([x, y]) => rotateAndProject(centerX, centerY, x, y, angle));
  corners.push(corners[0]);
  return corners;
}

function rotateAndProject(centerX, centerY, x, y, angle) {
  const east = centerX + x * Math.cos(angle) - y * Math.sin(angle);
  const north = centerY + x * Math.sin(angle) + y * Math.cos(angle);
  const metersPerLongitudeDegree =
    METERS_PER_LATITUDE_DEGREE * Math.cos((CENTER_LATITUDE * Math.PI) / 180);
  return [
    CENTER_LONGITUDE + east / metersPerLongitudeDegree,
    CENTER_LATITUDE + north / METERS_PER_LATITUDE_DEGREE,
  ];
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
