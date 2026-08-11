import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { createViewer, useTiandituBasemap } from "./viewer.js";

const viewer = createViewer("cesium-container");

useTiandituBasemap(viewer, import.meta.env.VITE_TIANDITU_TOKEN);
