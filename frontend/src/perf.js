const SAMPLE_INTERVAL = 500;
const FRAME_SAMPLE_SIZE = 61;

/**
 * 启动性能监测，每 500ms 更新一次。
 * @param {import("cesium").Viewer} viewer
 * @param {(stats: {fps: number, entityCount: number}) => void} onUpdate
 * @returns {() => void} 停止函数
 */
export function startPerfMonitor(viewer, onUpdate) {
  const frameTimes = [];
  const removePostRender = viewer.scene.postRender.addEventListener(() => {
    frameTimes.push(performance.now());
    if (frameTimes.length > FRAME_SAMPLE_SIZE) frameTimes.shift();
  });
  const timer = window.setInterval(() => {
    onUpdate({
      fps: calculateFps(frameTimes),
      entityCount: countEntities(viewer),
    });
  }, SAMPLE_INTERVAL);

  return () => {
    removePostRender();
    window.clearInterval(timer);
  };
}

function calculateFps(frameTimes) {
  if (frameTimes.length < 2) return 0;
  const duration = frameTimes.at(-1) - frameTimes[0];
  if (duration <= 0) return 0;
  return Math.round(((frameTimes.length - 1) * 1000) / duration);
}

function countEntities(viewer) {
  let count = 0;
  for (let index = 0; index < viewer.dataSources.length; index += 1) {
    count += viewer.dataSources.get(index).entities.values.length;
  }
  return count;
}
