(() => {
  "use strict";

  const renderer = window.FilmFrameStyles;
  if (!renderer) throw new Error("FilmFrameStyles renderer is unavailable.");

  const DEFAULTS = {
    previewScale: 1,
    filmFormat: "135",
  };

  const controls = {
    imageInput: document.getElementById("imageInput"),
    restoreSample: document.getElementById("restoreSample"),
    resetAll: document.getElementById("resetAll"),
    previewScale: document.getElementById("previewScale"),
    filmFormat: document.getElementById("filmFormat"),
    filmTitle: document.getElementById("filmTitle"),
    filmRatio: document.getElementById("filmRatio"),
    filmDesc: document.getElementById("filmDesc"),
    previewScaleValue: document.getElementById("previewScaleValue"),
    dropOverlay: document.getElementById("dropOverlay"),
    status: document.getElementById("status"),
  };

  const canvases = new Map(
    Array.from(document.querySelectorAll("[data-style-canvas]")).map((canvas) => [canvas.dataset.styleCanvas, canvas]),
  );
  const stages = new Map(
    Array.from(document.querySelectorAll("[data-style-stage]")).map((stage) => [stage.dataset.styleStage, stage]),
  );

  const state = {
    image: null,
    imageRelease: null,
    imageLabel: "内置样片",
    dragDepth: 0,
    renderFrameId: null,
    settings: { ...DEFAULTS },
    cards: Object.fromEntries(
      Object.entries(renderer.STYLE_DEFINITIONS).map(([styleId, style]) => [
        styleId,
        {
          pose: { ...style.defaultPose },
          showStructure: false,
          drag: null,
        },
      ]),
    ),
  };

  function createSampleImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");

    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#4d7484");
    sky.addColorStop(0.46, "#d6a26f");
    sky.addColorStop(0.65, "#d8744e");
    sky.addColorStop(1, "#263936");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sun = ctx.createRadialGradient(1130, 370, 0, 1130, 370, 240);
    sun.addColorStop(0, "rgba(255,241,186,.94)");
    sun.addColorStop(0.14, "rgba(255,204,138,.55)");
    sun.addColorStop(1, "rgba(255,180,120,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(800, 40, 650, 650);

    ctx.fillStyle = "rgba(52, 63, 61, .56)";
    ctx.beginPath();
    ctx.moveTo(0, 700);
    ctx.lineTo(210, 505);
    ctx.lineTo(390, 645);
    ctx.lineTo(625, 430);
    ctx.lineTo(890, 660);
    ctx.lineTo(1120, 480);
    ctx.lineTo(1390, 650);
    ctx.lineTo(1600, 525);
    ctx.lineTo(1600, 1100);
    ctx.lineTo(0, 1100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(20, 39, 38, .84)";
    ctx.beginPath();
    ctx.moveTo(0, 820);
    ctx.bezierCurveTo(350, 735, 565, 845, 850, 758);
    ctx.bezierCurveTo(1120, 675, 1325, 790, 1600, 700);
    ctx.lineTo(1600, 1100);
    ctx.lineTo(0, 1100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(18, 30, 28, .8)";
    for (let i = 0; i < 18; i += 1) {
      const seed = renderer.primitives.deterministicNoise(70 + i * 8.1);
      const x = 30 + i * 93 + seed * 26;
      const height = 115 + renderer.primitives.deterministicNoise(24 + i * 3.7) * 150;
      ctx.fillRect(x - 5, 850 - height * 0.18, 10, height * 0.42);
      ctx.beginPath();
      ctx.moveTo(x, 850 - height);
      ctx.lineTo(x - 46, 850 - height * 0.2);
      ctx.lineTo(x + 46, 850 - height * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    const haze = ctx.createLinearGradient(0, 560, 0, 930);
    haze.addColorStop(0, "rgba(255,213,173,.12)");
    haze.addColorStop(1, "rgba(255,213,173,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 500, canvas.width, 460);

    ctx.globalCompositeOperation = "soft-light";
    for (let y = 0; y < canvas.height; y += 5) {
      const opacity = 0.008 + renderer.primitives.deterministicNoise(900 + y) * 0.012;
      ctx.fillStyle = `rgba(255,245,224,${opacity})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.globalCompositeOperation = "source-over";
    return canvas;
  }

  function releaseCurrentImage() {
    if (typeof state.imageRelease === "function") state.imageRelease();
    state.imageRelease = null;
  }

  function setSampleImage(announce = true) {
    releaseCurrentImage();
    state.image = createSampleImage();
    state.imageLabel = "内置样片";
    if (announce) controls.status.textContent = "已恢复内置样片。";
    scheduleRender();
  }

  async function decodeFile(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      throw new Error("请选择 JPG、PNG 或 WebP 图片。");
    }
    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return { image: bitmap, release: () => bitmap.close() };
      } catch (error) {
        // Fall through to the object URL decoder for browsers with partial ImageBitmap support.
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("图片解码失败。"));
        element.src = url;
      });
      return { image, release: () => URL.revokeObjectURL(url) };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function loadFile(file) {
    const previousImage = state.image;
    const previousRelease = state.imageRelease;
    try {
      controls.status.textContent = `正在读取 ${file.name}。`;
      const decoded = await decodeFile(file);
      state.image = decoded.image;
      state.imageRelease = decoded.release;
      state.imageLabel = file.name;
      if (typeof previousRelease === "function") previousRelease();
      controls.status.textContent = `已载入 ${file.name}，片基预览已更新。`;
      scheduleRender();
    } catch (error) {
      state.image = previousImage;
      state.imageRelease = previousRelease;
      controls.status.textContent = error.message || "图片载入失败，已保留当前预览。";
    } finally {
      controls.imageInput.value = "";
    }
  }

  function updateFilmCopy() {
    const selected = state.settings.filmFormat;
    const formatId = selected.startsWith("half-") ? "half" : selected;
    const inputMode = selected === "half-uncropped" ? "uncropped" : "cropped";
    const format = renderer.getFilmFormat(formatId);
    const adapter = renderer.getFilmInputAdapter(formatId, inputMode);
    controls.filmTitle.textContent = `${format.label} 单帧`;
    controls.filmRatio.textContent = adapter.id === "uncropped" ? "完整 3 : 2" : format.sizeLabel.replace(" mm", "");
    if (adapter.id === "uncropped") {
      controls.filmDesc.textContent = adapter.sourceMeaning;
    } else if (format.family === "120") {
      controls.filmDesc.textContent = `${format.sizeLabel} 曝光窗；120 片基默认无齿孔、无片头，并采用平切端头。`;
    } else if (format.wide) {
      controls.filmDesc.textContent = `${format.sizeLabel} 宽幅曝光窗，沿用 135 片基、齿孔节距和边字体系。`;
    } else if (format.half) {
      controls.filmDesc.textContent = `${format.sizeLabel} 半格曝光窗，每个文件对应一格竖幅画面。`;
    } else {
      controls.filmDesc.textContent = "保留棕黑片基、上下齿孔、橙色边字与中央 3:2 曝光窗。";
    }
  }

  function syncControlValues() {
    controls.previewScale.value = Math.round(state.settings.previewScale * 100);
    controls.previewScaleValue.value = `${Math.round(state.settings.previewScale * 100)}%`;
    controls.filmFormat.value = state.settings.filmFormat;
    updateFilmCopy();
  }

  function resetPose(styleId) {
    const style = renderer.STYLE_DEFINITIONS[styleId];
    state.cards[styleId].pose = { ...style.defaultPose };
    scheduleRender();
  }

  function resetAll() {
    state.settings = { ...DEFAULTS };
    Object.keys(state.cards).forEach((styleId) => {
      state.cards[styleId].pose = { ...renderer.STYLE_DEFINITIONS[styleId].defaultPose };
      state.cards[styleId].showStructure = false;
      const button = document.querySelector(`[data-style="${styleId}"] [data-action="structure"]`);
      button.setAttribute("aria-pressed", "false");
      button.textContent = "显示结构层";
    });
    syncControlValues();
    controls.status.textContent = "已重置画幅、预览尺寸和片基姿态。";
    scheduleRender();
  }

  function getCanvasSize(canvas) {
    const stage = canvas.parentElement;
    const width = Math.max(280, stage.clientWidth - 24);
    return { width, height: Math.max(300, Math.min(560, width * 0.7)) };
  }

  function render() {
    state.renderFrameId = null;
    canvases.forEach((canvas, styleId) => {
      const size = getCanvasSize(canvas);
      const card = state.cards[styleId];
      renderer.renderFrame(canvas, state.image, styleId, {
        ...size,
        ...state.settings,
        pose: card.pose,
        showStructure: card.showStructure,
      });
    });
  }

  function scheduleRender() {
    if (state.renderFrameId !== null) return;
    state.renderFrameId = requestAnimationFrame(render);
  }

  function bindControls() {
    controls.imageInput.addEventListener("change", () => {
      const file = controls.imageInput.files && controls.imageInput.files[0];
      if (file) loadFile(file);
    });
    controls.restoreSample.addEventListener("click", () => setSampleImage());
    controls.resetAll.addEventListener("click", resetAll);
    controls.previewScale.addEventListener("input", () => {
      state.settings.previewScale = Number(controls.previewScale.value) / 100;
      controls.previewScaleValue.value = `${controls.previewScale.value}%`;
      scheduleRender();
    });
    controls.filmFormat.addEventListener("change", () => {
      state.settings.filmFormat = controls.filmFormat.value;
      updateFilmCopy();
      controls.status.textContent = `底片画幅已切换为${controls.filmFormat.selectedOptions[0].textContent}。`;
      scheduleRender();
    });

    document.querySelectorAll(".style-card").forEach((card) => {
      const styleId = card.dataset.style;
      card.querySelector('[data-action="structure"]').addEventListener("click", (event) => {
        const visible = !state.cards[styleId].showStructure;
        state.cards[styleId].showStructure = visible;
        event.currentTarget.setAttribute("aria-pressed", String(visible));
        event.currentTarget.textContent = visible ? "隐藏结构层" : "显示结构层";
        controls.status.textContent = `片基结构层已${visible ? "显示" : "隐藏"}。`;
        scheduleRender();
      });
      card.querySelector('[data-action="reset"]').addEventListener("click", () => {
        resetPose(styleId);
        controls.status.textContent = "已恢复片基的默认姿态。";
      });
    });
  }

  function bindStageInteraction(styleId, stage) {
    const card = state.cards[styleId];
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      stage.setPointerCapture(event.pointerId);
      card.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        rotation: card.pose.rotation,
        lift: card.pose.lift,
      };
    });
    stage.addEventListener("pointermove", (event) => {
      if (!card.drag || card.drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - card.drag.startX;
      const dy = event.clientY - card.drag.startY;
      card.pose.rotation = renderer.primitives.clamp(card.drag.rotation + dx * 0.035, -6, 6);
      card.pose.lift = renderer.primitives.clamp(card.drag.lift - dy * 0.008, -0.2, 1);
      scheduleRender();
    });
    const finishDrag = (event) => {
      if (!card.drag || card.drag.pointerId !== event.pointerId) return;
      card.drag = null;
      controls.status.textContent = "片基姿态已调整。";
    };
    stage.addEventListener("pointerup", finishDrag);
    stage.addEventListener("pointercancel", finishDrag);

    stage.addEventListener("keydown", (event) => {
      let handled = true;
      const step = event.shiftKey ? 1 : 0.25;
      switch (event.key) {
        case "ArrowLeft":
          card.pose.rotation = renderer.primitives.clamp(card.pose.rotation - step, -6, 6);
          break;
        case "ArrowRight":
          card.pose.rotation = renderer.primitives.clamp(card.pose.rotation + step, -6, 6);
          break;
        case "ArrowUp":
          card.pose.lift = renderer.primitives.clamp(card.pose.lift + 0.08, -0.2, 1);
          break;
        case "ArrowDown":
          card.pose.lift = renderer.primitives.clamp(card.pose.lift - 0.08, -0.2, 1);
          break;
        case "Home":
          resetPose(styleId);
          break;
        case "Enter":
        case " ": {
          card.showStructure = !card.showStructure;
          const button = document.querySelector(`[data-style="${styleId}"] [data-action="structure"]`);
          button.setAttribute("aria-pressed", String(card.showStructure));
          button.textContent = card.showStructure ? "隐藏结构层" : "显示结构层";
          break;
        }
        default:
          handled = false;
      }
      if (handled) {
        event.preventDefault();
        scheduleRender();
      }
    });
  }

  function bindDropZone() {
    document.addEventListener("dragenter", (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return;
      event.preventDefault();
      state.dragDepth += 1;
      controls.dropOverlay.classList.add("is-visible");
    });
    document.addEventListener("dragover", (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    document.addEventListener("dragleave", (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return;
      state.dragDepth = Math.max(0, state.dragDepth - 1);
      if (state.dragDepth === 0) controls.dropOverlay.classList.remove("is-visible");
    });
    document.addEventListener("drop", (event) => {
      event.preventDefault();
      state.dragDepth = 0;
      controls.dropOverlay.classList.remove("is-visible");
      const file = event.dataTransfer && event.dataTransfer.files[0];
      if (file) loadFile(file);
    });
  }

  function setupResizeObserver() {
    if (!("ResizeObserver" in window)) {
      window.addEventListener("resize", scheduleRender);
      return;
    }
    const observer = new ResizeObserver(scheduleRender);
    stages.forEach((stage) => observer.observe(stage));
  }

  function initialize() {
    syncControlValues();
    bindControls();
    stages.forEach((stage, styleId) => bindStageInteraction(styleId, stage));
    bindDropZone();
    setupResizeObserver();
    setSampleImage(false);
    controls.status.textContent = "已载入内置样片。可拖动片基调整姿态。";
  }

  window.addEventListener("beforeunload", releaseCurrentImage);
  initialize();
})();
