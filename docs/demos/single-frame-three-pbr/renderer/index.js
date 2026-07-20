import { ThreeFilmRenderer } from "./three-renderer.js";
import { CanvasFallbackRenderer } from "./canvas-fallback.js";

export class FilmRendererController {
  constructor({ webglCanvas, fallbackCanvas, statusBadge, onModeChange }) {
    this.webglCanvas = webglCanvas;
    this.fallbackCanvas = fallbackCanvas;
    this.statusBadge = statusBadge;
    this.onModeChange = onModeChange;
    this.mode = null;
    this.renderer = null;
    this.snapshot = null;
    this.forceFallback = new URLSearchParams(location.search).get("renderer") === "canvas2d";
    this.initialize();
  }

  initialize() {
    if (location.protocol === "file:") {
      this.activateFallback("请通过本地 HTTP 打开；当前使用 Canvas 2D 回退。");
      return;
    }
    if (this.forceFallback) {
      this.activateFallback("已通过查询参数强制使用 Canvas 2D 回退。");
      return;
    }
    try {
      this.renderer = new ThreeFilmRenderer({
        canvas: this.webglCanvas,
        onContextLost: error => this.activateFallback(error.message),
      });
      this.mode = "webgl2";
      this.webglCanvas.hidden = false;
      this.fallbackCanvas.hidden = true;
      this.setBadge("Three.js · WebGL2 PBR", "webgl");
      this.onModeChange?.(this.mode);
    } catch (error) {
      this.activateFallback(error.message || "WebGL2 初始化失败。");
    }
  }

  activateFallback(reason) {
    this.renderer?.dispose();
    this.renderer = new CanvasFallbackRenderer({ canvas: this.fallbackCanvas });
    this.mode = "canvas2d";
    this.webglCanvas.hidden = true;
    this.fallbackCanvas.hidden = false;
    this.setBadge("Canvas 2D 回退", "fallback", reason);
    this.onModeChange?.(this.mode, reason);
    if (this.snapshot) this.applySnapshot(this.snapshot);
  }

  setBadge(label, mode, reason = "") {
    this.statusBadge.textContent = label;
    this.statusBadge.dataset.mode = mode;
    this.statusBadge.title = reason;
  }

  applySnapshot(snapshot) {
    this.snapshot = {
      ...snapshot,
      pose: { ...snapshot.pose },
    };
    this.renderer.setSize(snapshot.width, snapshot.height, snapshot.dpr);
    this.renderer.setFilm({
      source: snapshot.source,
      filmFormat: snapshot.filmFormat,
      maxTextureSize: snapshot.maxTextureSize,
    });
    this.renderer.setPose(snapshot.pose, snapshot.previewScale);
    this.renderer.setStructureVisible(snapshot.showStructure);
  }

  updatePose(pose, previewScale, showStructure) {
    if (!this.snapshot) return;
    this.snapshot.pose = { ...pose };
    this.snapshot.previewScale = previewScale;
    this.snapshot.showStructure = showStructure;
    this.renderer.setPose(pose, previewScale);
    this.renderer.setStructureVisible(showStructure);
  }

  resize(width, height, dpr) {
    if (!this.snapshot) return;
    this.snapshot.width = width;
    this.snapshot.height = height;
    this.snapshot.dpr = dpr;
    this.renderer.setSize(width, height, dpr);
  }

  render() {
    try {
      this.renderer.render();
    } catch (error) {
      if (this.mode === "webgl2") {
        this.activateFallback(error.message || "WebGL 渲染失败。");
        this.renderer.render();
        return;
      }
      throw error;
    }
  }

  dispose() {
    this.renderer?.dispose();
  }
}
