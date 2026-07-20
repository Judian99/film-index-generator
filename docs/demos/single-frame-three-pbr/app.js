import { FilmRendererController } from "./renderer/index.js";

const DEFAULTS = Object.freeze({ filmFormat: "135", previewScale: 1, pose: Object.freeze({ rotation: 0.35, lift: 0 }) });
const controls = {
  imageInput: document.getElementById("imageInput"), restoreSample: document.getElementById("restoreSample"), resetAll: document.getElementById("resetAll"),
  previewScale: document.getElementById("previewScale"), previewScaleValue: document.getElementById("previewScaleValue"), filmFormat: document.getElementById("filmFormat"),
  rendererBadge: document.getElementById("rendererBadge"), stage: document.getElementById("canvasStage"), webglCanvas: document.getElementById("webglCanvas"),
  fallbackCanvas: document.getElementById("fallbackCanvas"), toggleStructure: document.getElementById("toggleStructure"), resetPose: document.getElementById("resetPose"),
  filmTitle: document.getElementById("filmTitle"), filmRatio: document.getElementById("filmRatio"), formatNote: document.getElementById("formatNote"),
  dropOverlay: document.getElementById("dropOverlay"), status: document.getElementById("status"),
};

const state = {
  source: null, release: null, filmFormat: DEFAULTS.filmFormat, previewScale: DEFAULTS.previewScale,
  pose: { ...DEFAULTS.pose }, showStructure: false, drag: null, dragDepth: 0,
  renderFrameId: null, assetsDirty: true, sizeDirty: true,
};

const renderer = new FilmRendererController({
  webglCanvas: controls.webglCanvas,
  fallbackCanvas: controls.fallbackCanvas,
  statusBadge: controls.rendererBadge,
  onModeChange(mode, reason) {
    controls.status.textContent = mode === "webgl2" ? "已启用 Three.js WebGL2 PBR 渲染。" : `已启用 Canvas 2D 回退。${reason || ""}`;
  },
});

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function createSampleImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600; canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#456f83"); sky.addColorStop(.46, "#d9aa76"); sky.addColorStop(.67, "#d67a52"); sky.addColorStop(1, "#263936");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sun = ctx.createRadialGradient(1130, 360, 0, 1130, 360, 240);
  sun.addColorStop(0, "rgba(255,244,190,.96)"); sun.addColorStop(.18, "rgba(255,203,136,.54)"); sun.addColorStop(1, "rgba(255,180,120,0)");
  ctx.fillStyle = sun; ctx.fillRect(800, 30, 660, 660);
  ctx.fillStyle = "rgba(52,63,61,.55)"; ctx.beginPath(); ctx.moveTo(0,710); ctx.lineTo(240,500); ctx.lineTo(405,650); ctx.lineTo(670,420); ctx.lineTo(920,660); ctx.lineTo(1180,470); ctx.lineTo(1420,650); ctx.lineTo(1600,530); ctx.lineTo(1600,1100); ctx.lineTo(0,1100); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(20,39,38,.85)"; ctx.beginPath(); ctx.moveTo(0,820); ctx.bezierCurveTo(350,735,570,850,860,760); ctx.bezierCurveTo(1120,680,1330,790,1600,705); ctx.lineTo(1600,1100); ctx.lineTo(0,1100); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(17,29,27,.82)";
  for (let i = 0; i < 18; i += 1) { const noise = FilmFrame135.deterministicNoise(70 + i * 8.1); const x = 30 + i * 93 + noise * 26; const h = 115 + FilmFrame135.deterministicNoise(24 + i * 3.7) * 150; ctx.fillRect(x - 5, 850 - h * .18, 10, h * .42); ctx.beginPath(); ctx.moveTo(x, 850 - h); ctx.lineTo(x - 46, 850 - h * .2); ctx.lineTo(x + 46, 850 - h * .2); ctx.closePath(); ctx.fill(); }
  return canvas;
}

function releaseSource() { if (typeof state.release === "function") state.release(); state.release = null; }
function setSample(announce = true) { releaseSource(); state.source = createSampleImage(); state.assetsDirty = true; if (announce) controls.status.textContent = "已恢复内置样片。"; scheduleRender(); }

async function decodeFile(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if ("createImageBitmap" in window) {
    try { const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); return { source: bitmap, release: () => bitmap.close() }; } catch (error) {}
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("图片解码失败。")); element.src = url; });
    return { source: image, release: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

async function loadFile(file) {
  const previous = { source: state.source, release: state.release };
  try { controls.status.textContent = `正在读取 ${file.name}。`; const decoded = await decodeFile(file); state.source = decoded.source; state.release = decoded.release; previous.release?.(); state.assetsDirty = true; controls.status.textContent = `已载入 ${file.name}。`; scheduleRender(); }
  catch (error) { state.source = previous.source; state.release = previous.release; controls.status.textContent = error.message || "图片载入失败。"; }
  finally { controls.imageInput.value = ""; }
}

function getFormatSelection() { const inputMode = state.filmFormat === "half-uncropped" ? "uncropped" : "cropped"; const formatId = state.filmFormat.startsWith("half-") ? "half" : state.filmFormat; return { formatId, inputMode, format: FilmFrame.getFormat(formatId), adapter: FilmFrame.getInputAdapter(formatId, inputMode) }; }
function updateCopy() { const { format, adapter } = getFormatSelection(); controls.filmTitle.textContent = format.label; controls.filmRatio.textContent = adapter.id === "uncropped" ? "完整 3 : 2" : format.sizeLabel.replace(" mm", ""); controls.formatNote.textContent = `${format.label} · ${adapter.sourceMeaning}`; }
function getSize() { const width = Math.max(300, Math.round(controls.stage.clientWidth)); const height = Math.max(320, Math.round(Math.min(680, Math.max(width * .62, controls.stage.clientHeight)))); return { width, height }; }

function render() {
  state.renderFrameId = null;
  const size = getSize();
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const snapshot = { source: state.source, filmFormat: state.filmFormat, pose: state.pose, previewScale: state.previewScale, showStructure: state.showStructure, width: size.width, height: size.height, dpr, maxTextureSize: innerWidth < 700 ? 1536 : 2048 };
  if (state.assetsDirty || !renderer.snapshot) { renderer.applySnapshot(snapshot); state.assetsDirty = false; state.sizeDirty = false; }
  else {
    if (state.sizeDirty || renderer.snapshot.width !== size.width || renderer.snapshot.height !== size.height || renderer.snapshot.dpr !== dpr) { renderer.resize(size.width, size.height, dpr); state.sizeDirty = false; }
    renderer.updatePose(state.pose, state.previewScale, state.showStructure);
  }
  renderer.render();
}
function scheduleRender() { if (state.renderFrameId !== null) return; state.renderFrameId = requestAnimationFrame(render); }

function resetPose() { state.pose = { ...DEFAULTS.pose }; controls.status.textContent = "已恢复默认片基姿态。"; scheduleRender(); }
function resetAll() { state.filmFormat = DEFAULTS.filmFormat; state.previewScale = DEFAULTS.previewScale; state.pose = { ...DEFAULTS.pose }; state.showStructure = false; controls.filmFormat.value = state.filmFormat; controls.previewScale.value = "100"; controls.previewScaleValue.value = "100%"; controls.toggleStructure.setAttribute("aria-pressed", "false"); controls.toggleStructure.textContent = "显示结构层"; updateCopy(); state.assetsDirty = true; controls.status.textContent = "已重置画幅、尺寸和姿态。"; scheduleRender(); }
function toggleStructure() { state.showStructure = !state.showStructure; controls.toggleStructure.setAttribute("aria-pressed", String(state.showStructure)); controls.toggleStructure.textContent = state.showStructure ? "隐藏结构层" : "显示结构层"; controls.status.textContent = `结构层已${state.showStructure ? "显示" : "隐藏"}。`; scheduleRender(); }

controls.imageInput.addEventListener("change", () => { const file = controls.imageInput.files?.[0]; if (file) loadFile(file); });
controls.restoreSample.addEventListener("click", () => setSample()); controls.resetAll.addEventListener("click", resetAll); controls.resetPose.addEventListener("click", resetPose); controls.toggleStructure.addEventListener("click", toggleStructure);
controls.previewScale.addEventListener("input", () => { state.previewScale = Number(controls.previewScale.value) / 100; controls.previewScaleValue.value = `${controls.previewScale.value}%`; scheduleRender(); });
controls.filmFormat.addEventListener("change", () => { state.filmFormat = controls.filmFormat.value; updateCopy(); state.assetsDirty = true; controls.status.textContent = `底片画幅已切换为${controls.filmFormat.selectedOptions[0].textContent}。`; scheduleRender(); });

controls.stage.addEventListener("pointerdown", event => { if (event.button !== 0) return; controls.stage.setPointerCapture(event.pointerId); state.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, rotation: state.pose.rotation, lift: state.pose.lift }; });
controls.stage.addEventListener("pointermove", event => { if (!state.drag || state.drag.pointerId !== event.pointerId) return; state.pose.rotation = clamp(state.drag.rotation + (event.clientX - state.drag.x) * .035, -6, 6); state.pose.lift = clamp(state.drag.lift - (event.clientY - state.drag.y) * .008, -.2, 1); scheduleRender(); });
const finishDrag = event => { if (!state.drag || state.drag.pointerId !== event.pointerId) return; state.drag = null; controls.status.textContent = "片基姿态已调整。"; };
controls.stage.addEventListener("pointerup", finishDrag); controls.stage.addEventListener("pointercancel", finishDrag);
controls.stage.addEventListener("keydown", event => { let handled = true; const step = event.shiftKey ? 1 : .25; if (event.key === "ArrowLeft") state.pose.rotation = clamp(state.pose.rotation - step, -6, 6); else if (event.key === "ArrowRight") state.pose.rotation = clamp(state.pose.rotation + step, -6, 6); else if (event.key === "ArrowUp") state.pose.lift = clamp(state.pose.lift + .08, -.2, 1); else if (event.key === "ArrowDown") state.pose.lift = clamp(state.pose.lift - .08, -.2, 1); else if (event.key === "Home") resetPose(); else if (event.key === "Enter" || event.key === " ") toggleStructure(); else handled = false; if (handled) { event.preventDefault(); scheduleRender(); } });

document.addEventListener("dragenter", event => { if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return; event.preventDefault(); state.dragDepth += 1; controls.dropOverlay.classList.add("is-visible"); });
document.addEventListener("dragover", event => { if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
document.addEventListener("dragleave", event => { if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return; state.dragDepth = Math.max(0, state.dragDepth - 1); if (!state.dragDepth) controls.dropOverlay.classList.remove("is-visible"); });
document.addEventListener("drop", event => { event.preventDefault(); state.dragDepth = 0; controls.dropOverlay.classList.remove("is-visible"); const file = event.dataTransfer?.files?.[0]; if (file) loadFile(file); });

const resizeObserver = new ResizeObserver(() => { state.sizeDirty = true; scheduleRender(); }); resizeObserver.observe(controls.stage);
window.addEventListener("beforeunload", () => { releaseSource(); renderer.dispose(); resizeObserver.disconnect(); });
updateCopy(); setSample(false); controls.status.textContent = "已载入内置样片。可拖动片基调整姿态。";
