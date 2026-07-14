/**
 * 海带索引图 FILM - 胶片索引图生成器
 *
 * 作者: Judian99
 * 小红书: 3661182800
 * 抖音: 69530829181
 * 邮箱: 1946378724@qq.com
 * GitHub: https://github.com/Judian99/film-index-generator
 * 许可证: MIT
 *
 * 图片只在浏览器本地处理，不上传服务器。
 */

(function () {
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const previewWrap = document.getElementById("previewWrap");
  const previewCanvas = document.getElementById("previewCanvas");
  const emptyState = document.getElementById("emptyState");
  const statusTitle = document.getElementById("statusTitle");
  const imageCounter = document.getElementById("imageCounter");
  const exportButton = document.getElementById("exportButton");
  const reverseSort = document.getElementById("reverseSort");
  const showEdgeText = document.getElementById("showEdgeText");
  const showSprockets = document.getElementById("showSprockets");
  const sprocketsHint = document.getElementById("sprocketsHint");
  const showLeader = document.getElementById("showLeader");
  const leaderHint = document.getElementById("leaderHint");
  const stockSelect = document.getElementById("stockSelect");
  const stockName = document.getElementById("stockName");
  const stockEdgeText = document.getElementById("stockEdgeText");
  const stockProcess = document.getElementById("stockProcess");
  const stockInkEnabled = document.getElementById("stockInkEnabled");
  const stockInkField = document.getElementById("stockInkField");
  const stockInkColor = document.getElementById("stockInkColor");
  const stockPresets = document.getElementById("stockPresets");
  const stockFrameNumber = document.getElementById("stockFrameNumber");
  const stockSaveButton = document.getElementById("stockSaveButton");
  const stockDeleteButton = document.getElementById("stockDeleteButton");
  const stockExportButton = document.getElementById("stockExportButton");
  const stockImportButton = document.getElementById("stockImportButton");
  const stockImportInput = document.getElementById("stockImportInput");
  const frameAspect = document.getElementById("frameAspect");
  const halfFrameModeField = document.getElementById("halfFrameModeField");
  const halfFrameModeInputs = document.querySelectorAll("input[name='halfFrameMode']");
  const columnsSelect = document.getElementById("columnsSelect");
  const columnsHint = document.getElementById("columnsHint");
  const frameWidthInput = document.getElementById("frameWidth");
  const exportScale = document.getElementById("exportScale");
  const formatSelect = document.getElementById("formatSelect");
  const qualityField = document.getElementById("qualityField");
  const jpgQuality = document.getElementById("jpgQuality");
  const zoomRange = document.getElementById("zoomRange");
  const zoomOut = document.getElementById("zoomOut");
  const zoomIn = document.getElementById("zoomIn");
  const zoomFit = document.getElementById("zoomFit");
  const photoListPanel = document.getElementById("photoListPanel");
  const photoList = document.getElementById("photoList");
  const clearButton = document.getElementById("clearButton");
  const noticeEl = document.getElementById("notice");
  const frameMenu = document.getElementById("frameMenu");
  const cropModal = document.getElementById("cropModal");
  const cropCanvas = document.getElementById("cropCanvas");
  const cropOverlay = document.getElementById("cropOverlay");
  const cropClose = document.getElementById("cropClose");
  const cropCancel = document.getElementById("cropCancel");
  const cropReset = document.getElementById("cropReset");
  const cropApply = document.getElementById("cropApply");
  const filmStage = document.getElementById("filmStage");
  const filmTitle = document.getElementById("filmTitle");
  const filmDescription = document.getElementById("filmDescription");

  let activeCanvas = previewCanvas;
  let ctx = previewCanvas.getContext("2d");

  const state = {
    items: [],
    renderTimer: 0,
    animationTimer: 0,
    noticeTimer: 0,
    nextId: 1,
    dragId: null,
    previewZoom: Number(zoomRange.value) / 100,
    // 画布交互：预览帧的命中区域、画布拖拽状态
    frameRects: [],
    canvasDrag: null,
    dragItemId: null,
    dropIndex: null,
    // 胶卷型号：自定义型号数组 + 当前选中 id（启动时从 localStorage 恢复）
    customStocks: [],
    stockId: null,
    // 帧操作菜单与裁切工具
    contextItemId: null,
    cropState: null,
    reprocessGeneration: 0,
  };

  // ---- 胶卷型号：内置与自定义同构的型号对象，按冲洗工艺分档取默认外观 ----

  // 每档工艺的默认外观；型号对象省略（null/缺省）的字段从这里取
  const PROCESS_DEFAULTS = {
    "C-41": {
      // 彩负边字是曝光后的橙色染料影像
      edgeInk: { color: "rgba(255, 176, 64, 0.92)", glow: "rgba(255, 170, 60, 0.45)" },
      edgePresets: ["135-36", "C-41", "DX 5063", "SAFETY FILM", "135"],
      edgePresets120: ["120", "C-41", "SAFETY FILM"],
      frameNumberStyle: "N/NA",
    },
    BW: {
      // 黑白负片边字是银盐影像，呈亮白/浅灰，无橙色染料
      edgeInk: { color: "rgba(238, 238, 232, 0.92)", glow: "rgba(240, 240, 235, 0.35)" },
      edgePresets: ["135-36", "SAFETY FILM", "DX 5063", "PANCHROMATIC", "135"],
      edgePresets120: ["120", "SAFETY FILM", "PANCHROMATIC"],
      frameNumberStyle: "N/NA",
    },
    "E-6": {
      // 反转片边字取暖肤色 #f9c394（可读性优先，非严格拟真的暗色）
      edgeInk: { color: "rgba(249, 195, 148, 0.92)", glow: "rgba(249, 195, 148, 0.4)" },
      edgePresets: ["135-36", "E-6", "SAFETY FILM", "135"],
      edgePresets120: ["120", "E-6"],
      frameNumberStyle: "N",
    },
    "ECN-2": {
      edgeInk: { color: "rgba(250, 230, 190, 0.92)", glow: "rgba(250, 230, 190, 0.35)" },
      edgePresets: ["EASTMAN", "KEEP FILM 5219", "ECN-2", "SAFETY FILM"],
      edgePresets120: ["EASTMAN", "ECN-2", "SAFETY FILM"],
      frameNumberStyle: "N",
    },
  };
  const PROCESS_NAMES = Object.keys(PROCESS_DEFAULTS);

  const BUILTIN_STOCKS = [
    // Kodak 彩色负片
    { id: "kodak-portra-400", name: "Kodak Portra 400", edgeText: "KODAK PORTRA 400", process: "C-41" },
    { id: "kodak-portra-800", name: "Kodak Portra 800", edgeText: "KODAK PORTRA 800", process: "C-41" },
    { id: "kodak-gold-200", name: "Kodak Gold 200", edgeText: "KODAK GOLD 200", process: "C-41" },
    { id: "kodak-colorplus-200", name: "Kodak ColorPlus 200", edgeText: "KODAK COLORPLUS 200", process: "C-41" },
    { id: "kodak-ultramax-400", name: "Kodak UltraMax 400", edgeText: "KODAK ULTRAMAX 400", process: "C-41" },
    { id: "kodak-ektar-100", name: "Kodak Ektar 100", edgeText: "KODAK EKTAR 100", process: "C-41" },

    // Kodak 黑白胶片
    { id: "kodak-tri-x-400", name: "Kodak Tri-X 400", edgeText: "KODAK TRI-X 400", process: "BW" },
    { id: "kodak-tmax-100", name: "Kodak T-Max 100", edgeText: "KODAK T-MAX 100", process: "BW" },
    { id: "kodak-tmax-400", name: "Kodak T-Max 400", edgeText: "KODAK T-MAX 400", process: "BW" },
    { id: "kodak-px-125", name: "Kodak P3200", edgeText: "KODAK P3200", process: "BW" },

    // Fujifilm 彩色负片
    { id: "fujifilm-400", name: "Fujifilm 400", edgeText: "FUJIFILM 400", process: "C-41" },
    { id: "fujifilm-c400", name: "Fujifilm C400", edgeText: "FUJIFILM C400", process: "C-41" },
    { id: "fujicolor-c200", name: "Fujicolor C200", edgeText: "FUJICOLOR C200", process: "C-41" },
    { id: "fujifilm-superia-400", name: "Fujifilm Superia 400", edgeText: "FUJIFILM SUPERIA 400", process: "C-41" },

    // Fujifilm 反转片
    { id: "fujichrome-velvia-50", name: "Fujichrome Velvia 50", edgeText: "FUJICHROME VELVIA 50", process: "E-6" },
    { id: "fujichrome-provia-100f", name: "Fujichrome Provia 100F", edgeText: "FUJICHROME PROVIA 100F", process: "E-6" },

    // Ilford 黑白胶片
    { id: "ilford-hp5-plus-400", name: "Ilford HP5 Plus 400", edgeText: "ILFORD HP5 PLUS 400", process: "BW" },
    { id: "ilford-fp4-plus-125", name: "Ilford FP4 Plus 125", edgeText: "ILFORD FP4 PLUS 125", process: "BW" },
    { id: "ilford-delta-400", name: "Ilford Delta 400", edgeText: "ILFORD DELTA 400", process: "BW" },
    { id: "ilford-delta-100", name: "Ilford Delta 100", edgeText: "ILFORD DELTA 100", process: "BW" },
    { id: "ilford-delta-3200", name: "Ilford Delta 3200", edgeText: "ILFORD DELTA 3200", process: "BW" },
    { id: "ilford-pan-f-plus-50", name: "Ilford Pan F Plus 50", edgeText: "ILFORD PAN F PLUS 50", process: "BW" },
    { id: "ilford-xp2-super", name: "Ilford XP2 Super", edgeText: "ILFORD XP2 SUPER", process: "C-41" },

    // Harman 彩色负片
    { id: "harman-phoenix-200", name: "Harman Phoenix Ⅱ 200", edgeText: "HARMAN PHOENIX Ⅱ 200", process: "C-41", edgePresets: ["HARMAN PHOENIX Ⅱ 200"] },

    // 电影卷
    { id: "cinestill-800t", name: "CineStill 800T", edgeText: "CINESTILL 800T", process: "ECN-2", sprocketsIn120: true },
    { id: "cinestill-50d", name: "CineStill 50D", edgeText: "CINESTILL 50D", process: "ECN-2", sprocketsIn120: true },
    { id: "cinestill-400d", name: "CineStill 400D", edgeText: "CINESTILL 400D", process: "ECN-2", sprocketsIn120: true },

    // Foma 黑白胶片
    { id: "fomapan-100", name: "Fomapan 100", edgeText: "FOMAPAN 100", process: "BW" },
    { id: "fomapan-200", name: "Fomapan 200", edgeText: "FOMAPAN 200", process: "BW" },
    { id: "fomapan-400", name: "FOMAPAN 400", edgeText: "FOMAPAN 400", process: "BW" },

    // 乐凯
    { id: "lucky-c200", name: "Lucky C200 乐凯彩色负片", edgeText: "LUCKY C200", process: "C-41" },
    { id: "lucky-shd-100", name: "Lucky SHD 100 乐凯黑白", edgeText: "LUCKY SHD 100", process: "BW" },

    // Lomography
    { id: "lomography-color-400", name: "Lomography Color 400", edgeText: "LOMOGRAPHY COLOR 400", process: "C-41" },
    { id: "lomography-color-800", name: "Lomography Color 800", edgeText: "LOMOGRAPHY COLOR 800", process: "C-41" },

    // 其他
    { id: "kentmere-400", name: "Kentmere 400", edgeText: "KENTMERE 400", process: "BW" },
  ].map((stock) => ({ ...stock, builtin: true }));

  const DEFAULT_STOCK_ID = "kodak-portra-400";
  const STORAGE_STOCKS_KEY = "filmIndex.customStocks";
  const STORAGE_SELECTED_KEY = "filmIndex.selectedStock";
  const EDGE_NUMBER_SUFFIX_SCALE = 0.68;

  // 可调渲染参数（均为相对"单张宽度"或所在分区的比例）。
  // 侧栏"高级设置"菜单内有滑块可实时调整。
  const TUNE = {
    sprocketH: 0.1, // 齿孔带高度 / frameW
    holeH: 0.76, // 齿孔高度 / 齿孔带高度
    holeW: 0.058, // 齿孔宽度 / frameW
    textH: 0.068, // 边字带高度 / frameW
    fontSize: 0.86, // 字号 / 边字带高度
    fontSize120: 0.74, // 120 字号 / 边字带高度
    textOffsetY: 0.38, // 边字中线到胶片外缘的距离 / 边字带高度（真实底片边字几乎贴着片边）
    textSprocketGap: 0.022, // 齿孔带向边字方向收紧的距离 / frameW（越大边字与齿孔离得越近）
    band120: 0.044, // 120 边字带高度 / 画幅高
    gap120: 0.085, // 120 帧间隙 / 画幅高
  };

  // 浏览器 canvas 尺寸安全上限（保守取值，超出后 toBlob 会得到 null）
  const MAX_CANVAS_SIDE = 16384;
  const MAX_CANVAS_AREA = 16384 * 16384;

  const filmStageStates = {
    intro: {
      title: "装入你的底片扫描件",
      description: "图片只在浏览器本地整理，生成一张可导出的胶片索引图。",
    },
    dragging: {
      title: "释放以装入扫描件",
      description: "检片轨道已就绪，支持 JPG、PNG 与 WebP。",
    },
    reading: {
      title: "正在读取扫描件",
      description: "正在本地解码图片并准备胶片索引预览。",
    },
  };

  function setFilmStageState(nextState) {
    const next = filmStageStates[nextState];
    if (!filmStage || !next) return;
    filmStage.dataset.filmState = nextState;
    filmTitle.textContent = next.title;
    filmDescription.textContent = next.description;
  }

  function hasFileDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes("Files");
  }

  // ---- 文件导入事件绑定 ----

  fileInput.addEventListener("change", async (event) => {
    const insertBeforeId = fileInput.getAttribute("data-insert-before");
    fileInput.removeAttribute("data-insert-before");

    const files = Array.from(event.target.files || []);
    if (!files.length) {
      fileInput.value = "";
      return;
    }

    await loadFiles(files, insertBeforeId ? Number(insertBeforeId) : null);
    fileInput.value = "";
  });

  let fileDragDepth = 0;

  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    if (!hasFileDrag(event)) return;
    fileDragDepth += 1;
    dropZone.classList.add("is-dragging");
    if (!state.items.length) setFilmStageState("dragging");
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!hasFileDrag(event)) return;
    dropZone.classList.add("is-dragging");
    if (!state.items.length) setFilmStageState("dragging");
  });

  dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    if (!hasFileDrag(event)) return;
    fileDragDepth = Math.max(0, fileDragDepth - 1);
    if (fileDragDepth) return;
    dropZone.classList.remove("is-dragging");
    if (!state.items.length) setFilmStageState("intro");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    fileDragDepth = 0;
    dropZone.classList.remove("is-dragging");
    const files = Array.from(event.dataTransfer.files || []);
    loadFiles(files);
  });

  // 防止文件被拖到 dropZone 之外时浏览器直接打开图片、丢掉当前页面
  ["dragover", "drop"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName !== "drop") return;
      fileDragDepth = 0;
      dropZone.classList.remove("is-dragging");
      if (!state.items.length && !previewWrap.classList.contains("is-loading")) {
        setFilmStageState("intro");
      }
    });
  });

  document.querySelectorAll("input[name='sortMode']").forEach((control) => {
    control.addEventListener("change", () => {
      scheduleRender();
      renderPhotoList();
    });
  });

  reverseSort.addEventListener("change", () => {
    scheduleRender();
    renderPhotoList();
  });

  [
    showEdgeText,
    showSprockets,
    showLeader,
    columnsSelect,
    frameWidthInput,
    formatSelect,
    jpgQuality,
  ].forEach((control) => {
    control.addEventListener("input", scheduleRender);
    control.addEventListener("change", scheduleRender);
  });

  frameAspect.addEventListener("change", handleFrameModeChange);
  halfFrameModeInputs.forEach((control) => {
    control.addEventListener("change", handleFrameModeChange);
  });

  formatSelect.addEventListener("change", () => {
    qualityField.style.display = formatSelect.value === "image/jpeg" ? "grid" : "none";
  });

  zoomRange.addEventListener("input", () => {
    setPreviewZoom(Number(zoomRange.value) / 100);
  });

  zoomOut.addEventListener("click", () => {
    setPreviewZoom(clamp(state.previewZoom - 0.1, 0.25, 2));
  });

  zoomIn.addEventListener("click", () => {
    setPreviewZoom(clamp(state.previewZoom + 0.1, 0.25, 2));
  });

  zoomFit.addEventListener("click", fitPreviewToViewport);

  exportButton.addEventListener("click", () => {
    if (!state.items.length) return;
    exportIndexImage();
  });

  clearButton.addEventListener("click", () => {
    state.reprocessGeneration += 1;
    state.items.forEach(releaseItem);
    state.items = [];
    render();
    renderPhotoList();
  });

  // ---- 画布交互：背景拖拽平移，帧拖拽调序 ----

  previewCanvas.addEventListener("pointerdown", onCanvasPointerDown);
  previewCanvas.addEventListener("pointermove", onCanvasPointerMove);
  previewCanvas.addEventListener("pointerup", onCanvasPointerUp);
  previewCanvas.addEventListener("pointercancel", cancelCanvasDrag);
  previewCanvas.addEventListener("contextmenu", onCanvasContextMenu);

  function canvasPoint(event) {
    const rect = previewCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / state.previewZoom,
      y: (event.clientY - rect.top) / state.previewZoom,
    };
  }

  function hitFrame(point) {
    return state.frameRects.find(
      (r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h,
    );
  }

  function onCanvasPointerDown(event) {
    if (event.button !== 0 || !state.items.length) return;
    const hit = hitFrame(canvasPoint(event));
    state.canvasDrag = {
      mode: hit ? "pending" : "pan",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: previewWrap.scrollLeft,
      scrollTop: previewWrap.scrollTop,
      itemId: hit ? hit.id : null,
      ghost: null,
    };
    previewCanvas.setPointerCapture(event.pointerId);
    if (!hit) previewWrap.classList.add("is-panning");
    event.preventDefault();
  }

  function onCanvasPointerMove(event) {
    const drag = state.canvasDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (drag.mode === "pan") {
      previewWrap.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
      previewWrap.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
      return;
    }

    if (drag.mode === "pending") {
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (moved < 6) return;
      drag.mode = "reorder";
      state.dragItemId = drag.itemId;
      drag.ghost = createDragGhost(drag.itemId);
      previewWrap.classList.add("is-reordering");
    }

    if (drag.mode === "reorder") {
      if (drag.ghost) {
        drag.ghost.style.left = `${event.clientX}px`;
        drag.ghost.style.top = `${event.clientY}px`;
      }
      const dropIndex = computeDropIndex(canvasPoint(event));
      if (dropIndex !== state.dropIndex) {
        state.dropIndex = dropIndex;
        render();
      }
    }
  }

  function onCanvasPointerUp(event) {
    const drag = state.canvasDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    // 如果是 pending 状态且没有移动过，说明是点击而非拖拽 → 弹出菜单
    if (drag.mode === "pending") {
      const hit = hitFrame(canvasPoint(event));
      if (hit) {
        showFrameMenu(hit.id, event.clientX, event.clientY);
      }
      cancelCanvasDrag();
      return;
    }

    if (drag.mode === "reorder" && state.dropIndex !== null) {
      moveItemToIndex(drag.itemId, state.dropIndex);
    }
    cancelCanvasDrag();
  }

  function onCanvasContextMenu(event) {
    event.preventDefault();
    const hit = hitFrame(canvasPoint(event));
    if (hit) {
      showFrameMenu(hit.id, event.clientX, event.clientY);
    }
  }

  function cancelCanvasDrag() {
    const drag = state.canvasDrag;
    if (drag && drag.ghost) drag.ghost.remove();
    const needsRedraw = state.dragItemId !== null || state.dropIndex !== null;
    state.canvasDrag = null;
    state.dragItemId = null;
    state.dropIndex = null;
    previewWrap.classList.remove("is-panning", "is-reordering");
    if (needsRedraw) {
      render();
      renderPhotoList();
    }
  }

  function createDragGhost(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return null;
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    const img = document.createElement("img");
    img.src = item.thumbUrl;
    img.alt = "";
    ghost.appendChild(img);
    document.body.appendChild(ghost);
    return ghost;
  }

  // 根据画布坐标求插入位置（0..items.length）
  function computeDropIndex(point) {
    const options = getRenderOptions(1);
    const layout = computeLayout(state.items.length, options);
    const stripStride = layout.stripH + options.rowGap;
    const row = clamp(
      Math.floor((point.y - options.sheetPad + options.rowGap / 2) / stripStride),
      0,
      layout.rows.length - 1,
    );
    const rowInfo = layout.rows[row];
    const frameStartX = options.sheetPad + options.stripPadX;
    const contentStartX = getRowContentStartX(frameStartX, rowInfo, options);
    const slot = clamp(
      Math.round((point.x - contentStartX) / (options.slotW + options.slotGap)),
      0,
      rowInfo.count,
    );
    return clamp(rowInfo.start + slot, 0, state.items.length);
  }

  // 拖拽落点：先固化当前显示顺序并切到自定义模式，再移动
  function moveItemToIndex(itemId, dropIndex) {
    solidifyCustomOrder();
    const fromIndex = state.items.findIndex((item) => item.id === itemId);
    if (fromIndex < 0) return;
    let toIndex = dropIndex;
    if (fromIndex < toIndex) toIndex -= 1;
    toIndex = clamp(toIndex, 0, state.items.length - 1);
    if (toIndex === fromIndex) return;
    const [moved] = state.items.splice(fromIndex, 1);
    state.items.splice(toIndex, 0, moved);
  }

  function solidifyCustomOrder() {
    if (getSortMode() === "custom") return;
    state.items = getSortedItems();
    reverseSort.checked = false;
    document.querySelector("input[name='sortMode'][value='custom']").checked = true;
  }

  function isHalfFrameMode() {
    return Boolean(getFormat().half);
  }

  // 120 中画幅：由 FORMATS 表的 medium 标志判断（6×6 / 6×4.5 / 6×7 / 6×9）
  function is120Format() {
    return Boolean(getFormat().medium);
  }

  function getHalfFrameInputMode() {
    return document.querySelector("input[name='halfFrameMode']:checked")?.value || "cropped";
  }

  function isCroppedHalfFrameMode() {
    return isHalfFrameMode() && getHalfFrameInputMode() === "cropped";
  }

  // 画幅格式表：ratio 为槽位宽高比；medium 标记 120 中画幅并锁定每行张数；
  // portrait 标记竖幅槽位（645 真实帧为 41.5×56mm 竖幅，横图自动旋转进槽）
  const FORMATS = {
    "135": { ratio: 1.5 },
    half: { ratio: 0.75, half: true },
    "645": { ratio: 41.5 / 56, medium: true, columns: 4, portrait: true },
    "66": { ratio: 1, medium: true, columns: 3 },
    "67": { ratio: 69.5 / 56, medium: true, columns: 2 },
    "69": { ratio: 84 / 56, medium: true, columns: 2 },
    xpan: { ratio: 65 / 24 },
  };

  function getFormat() {
    return FORMATS[frameAspect.value] || FORMATS["135"];
  }

  function updateFrameModeControls() {
    const halfFrame = isHalfFrameMode();
    const cropped = isCroppedHalfFrameMode();
    const format120 = is120Format();
    halfFrameModeField.hidden = !halfFrame;
    columnsSelect.disabled = cropped;
    if (columnsHint) {
      columnsHint.textContent = cropped
        ? "单张裁切固定每行 12 张（片头首行 10 张）"
        : halfFrame
          ? "每个文件按一张包含两格的横向扫描图处理"
          : "";
      columnsHint.hidden = !halfFrame;
    }
    // 120 画幅：按格式表锁定每行张数
    if (format120 && !halfFrame) {
      const defaultCols = getFormat().columns;
      if (defaultCols) columnsSelect.value = String(defaultCols);
      columnsSelect.disabled = true;
      if (columnsHint) {
        columnsHint.textContent = `120 画幅固定每行 ${defaultCols || "?"} 张`;
        columnsHint.hidden = false;
      }
    }
    // 120 画幅：隐藏片头片尾选项
    showLeader.disabled = format120;
    if (format120) showLeader.checked = false;
    if (leaderHint) {
      leaderHint.textContent = format120 ? "120 胶片无片头片尾" : "";
      leaderHint.hidden = !format120;
    }
    // 120 画幅：非 ECN-2 型号无齿孔，禁用复选框并提示
    const stock = resolveStock(getActiveStock());
    const sprocketsLocked = format120 && !stock.sprocketsIn120;
    showSprockets.disabled = sprocketsLocked;
    if (sprocketsLocked) showSprockets.checked = false;
    if (sprocketsHint) {
      sprocketsHint.textContent = sprocketsLocked
        ? "120 画幅默认无齿孔，仅电影卷（ECN-2）保留"
        : "";
      sprocketsHint.hidden = !sprocketsLocked;
    }
  }

  async function handleFrameModeChange() {
    updateFrameModeControls();
    closeCropModal();
    if (!state.items.length) {
      render();
      return;
    }
    await rebuildAllItemSources(true);
  }

  function getRowContentStartX(frameStartX, rowInfo, options) {
    return frameStartX + (rowInfo.leader ? options.leaderAdvance : 0);
  }

  function getSlotX(contentStartX, slot, options) {
    return contentStartX + slot * (options.slotW + options.slotGap);
  }

  qualityField.style.display = "none";
  updateFrameModeControls();
  drawEmptyCanvas();
  applyPreviewZoom();

  async function readImageFile(file) {
    const [originalSource, taken] = await Promise.all([
      decodeImage(file),
      readExifDate(file).catch(() => null),
    ]);
    const item = {
      id: state.nextId++,
      file,
      originalSource,
      originalWidth: originalSource.width,
      originalHeight: originalSource.height,
      editSource: null,
      editWidth: originalSource.width,
      editHeight: originalSource.height,
      manualTurns: 0,
      autoTurns: 0,
      editVersion: 0,
      source: originalSource,
      width: originalSource.width,
      height: originalSource.height,
      name: file.name,
      modified: file.lastModified || 0,
      taken,
      thumbUrl: URL.createObjectURL(file),
    };
    await rebuildItemSource(item, state.reprocessGeneration, item.editVersion);
    return item;
  }

  function closeSource(source) {
    if (source && typeof source.close === "function") source.close();
  }

  function closeDistinctSources(...sources) {
    const seen = new Set();
    sources.forEach((source) => {
      if (!source || seen.has(source)) return;
      seen.add(source);
      closeSource(source);
    });
  }

  async function canvasToSource(canvas) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(canvas);
      } catch (error) {
        // 落回直接把 canvas 当作绘制源
      }
    }
    return canvas;
  }

  async function rotateSourceClockwise(source) {
    const canvas = document.createElement("canvas");
    canvas.width = source.height;
    canvas.height = source.width;
    const rotCtx = canvas.getContext("2d");
    rotCtx.translate(canvas.width, 0);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(source, 0, 0);
    return canvasToSource(canvas);
  }

  function targetPortraitMode() {
    // 裁切半格与 645 竖幅槽位都需要竖向源图（645 横拍照片像真底片一样转竖进槽）
    return isCroppedHalfFrameMode() || Boolean(getFormat().portrait);
  }

  async function rebuildItemSource(item, generation, editVersion) {
    const base = item.editSource || item.originalSource;
    let candidate = base;
    const derived = [];
    let autoTurns = 0;
    const portrait = targetPortraitMode();
    const matches = portrait ? base.height >= base.width : base.width >= base.height;

    if (!matches) {
      candidate = await rotateSourceClockwise(candidate);
      derived.push(candidate);
      autoTurns = 1;
    }

    for (let turn = 0; turn < item.manualTurns; turn += 1) {
      const next = await rotateSourceClockwise(candidate);
      if (candidate !== base) closeSource(candidate);
      candidate = next;
      derived.push(candidate);
    }

    const current = generation === state.reprocessGeneration && editVersion === item.editVersion;
    if (!current) {
      if (candidate !== base) closeSource(candidate);
      return false;
    }

    const previous = item.source;
    item.source = candidate;
    item.width = candidate.width;
    item.height = candidate.height;
    item.autoTurns = autoTurns;
    if (previous !== item.originalSource && previous !== item.editSource && previous !== candidate) {
      closeSource(previous);
    }
    return true;
  }

  async function rebuildAllItemSources(fitAfter = false) {
    const generation = ++state.reprocessGeneration;
    previewWrap.classList.add("is-loading");
    exportButton.disabled = true;
    const items = [...state.items];
    await Promise.all(items.map((item) => rebuildItemSource(item, generation, item.editVersion)));
    if (generation !== state.reprocessGeneration) return;
    render();
    renderPhotoList();
    if (fitAfter) fitPreviewToViewport();
  }

  async function decodeImage(file) {
    // createImageBitmap 会应用 EXIF 方向，且不经过 base64，内存开销更小
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (error) {
        // 落回 <img> 解码
      }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        // 与 ImageBitmap 对齐 width/height 接口
        image.width = image.naturalWidth;
        image.height = image.naturalHeight;
        resolve(image);
      };
      image.onerror = (event) => {
        URL.revokeObjectURL(url);
        reject(event);
      };
      image.src = url;
    });
  }

  // 从 JPEG APP1 段读取 EXIF 拍摄时间（DateTimeOriginal），失败返回 null
  async function readExifDate(file) {
    if (file.type !== "image/jpeg") return null;
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
        return parseTiffDate(view, offset + 10, size - 8);
      }
      if ((marker & 0xff00) !== 0xff00) break;
      offset += 2 + size;
    }
    return null;
  }

  function parseTiffDate(view, tiffStart, tiffLength) {
    if (tiffLength < 8 || tiffStart + tiffLength > view.byteLength) return null;
    const littleEndian = view.getUint16(tiffStart) === 0x4949;
    const read16 = (o) => view.getUint16(o, littleEndian);
    const read32 = (o) => view.getUint32(o, littleEndian);

    const readIfd = (ifdOffset, wantedTag) => {
      const base = tiffStart + ifdOffset;
      if (base + 2 > view.byteLength) return null;
      const count = read16(base);
      for (let i = 0; i < count; i += 1) {
        const entry = base + 2 + i * 12;
        if (entry + 12 > view.byteLength) return null;
        if (read16(entry) === wantedTag) return entry;
      }
      return null;
    };

    const readAsciiValue = (entry) => {
      const size = read32(entry + 4);
      const valueOffset = size > 4 ? tiffStart + read32(entry + 8) : entry + 8;
      if (valueOffset + size > view.byteLength) return null;
      let text = "";
      for (let i = 0; i < size; i += 1) {
        const code = view.getUint8(valueOffset + i);
        if (!code) break;
        text += String.fromCharCode(code);
      }
      return text;
    };

    const ifd0 = read32(tiffStart + 4);
    // ExifIFD 里的 DateTimeOriginal (0x9003)，退回 IFD0 的 DateTime (0x0132)
    const exifPointer = readIfd(ifd0, 0x8769);
    let entry = exifPointer ? readIfd(read32(exifPointer + 8), 0x9003) : null;
    if (!entry) entry = readIfd(ifd0, 0x0132);
    if (!entry) return null;

    const text = readAsciiValue(entry);
    const match = text && text.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    const timestamp = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function getSortMode() {
    return document.querySelector("input[name='sortMode']:checked").value;
  }

  function getSortedItems() {
    const sortMode = getSortMode();
    const direction = reverseSort.checked ? -1 : 1;
    if (sortMode === "custom") {
      return direction === 1 ? [...state.items] : [...state.items].reverse();
    }
    return [...state.items].sort((a, b) => {
      const timeA = a.taken ?? a.modified;
      const timeB = b.taken ?? b.modified;
      const result =
        sortMode === "time"
          ? timeA - timeB || a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true })
          : a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }) || timeA - timeB;
      return result * direction;
    });
  }

  // 控件高频输入时防抖，避免每个 input 事件都全量重绘
  function scheduleRender() {
    window.clearTimeout(state.renderTimer);
    state.renderTimer = window.setTimeout(render, 80);
  }

  function render() {
    if (!state.items.length) {
      drawEmptyCanvas();
      return;
    }

    const options = getRenderOptions(1);
    const items = getSortedItems();
    drawIndex(items, options);

    const rowCount = buildRows(items.length, options).length;
    statusTitle.textContent = `${rowCount} 行索引已生成`;
    imageCounter.textContent = `${items.length} 张`;
    emptyState.classList.add("is-hidden");
    previewWrap.classList.remove("is-empty", "is-loading");
    exportButton.disabled = false;
    applyPreviewZoom();
  }

  function exportIndexImage() {
    const scale = clamp(Number(exportScale.value) || 1, 1, 3);
    const options = getRenderOptions(scale);
    const layout = computeLayout(state.items.length, options);

    if (
      layout.canvasW > MAX_CANVAS_SIDE ||
      layout.canvasH > MAX_CANVAS_SIDE ||
      layout.canvasW * layout.canvasH > MAX_CANVAS_AREA
    ) {
      showNotice("导出尺寸超出浏览器画布上限，请降低输出质量或单张宽度后重试");
      return;
    }

    const previousCanvas = activeCanvas;
    const previousCtx = ctx;
    const mimeType = formatSelect.value;
    const quality = Number(jpgQuality.value) / 100;
    const extension = mimeType === "image/jpeg" ? "jpg" : "png";
    const outputCanvas = document.createElement("canvas");

    activeCanvas = outputCanvas;
    ctx = outputCanvas.getContext("2d");
    drawIndex(getSortedItems(), options);

    activeCanvas = previousCanvas;
    ctx = previousCtx;

    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          showNotice("导出失败：画布尺寸过大，请降低输出质量或单张宽度");
          return;
        }
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `film-index-${new Date().toISOString().slice(0, 10)}.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      },
      mimeType,
      quality,
    );
  }

  function getRenderOptions(scale) {
    const baseFrameW = clamp(Number(frameWidthInput.value) || 420, 180, 1200) * scale;
    const format = getFormat();
    const ratio = format.ratio || 1.5;
    const is120 = Boolean(format.medium);
    const isHalfFrame = isHalfFrameMode();
    const isCroppedHalfFrame = isCroppedHalfFrameMode();
    const baseFrameH = Math.round(baseFrameW / 1.5);
    const slotH = isHalfFrame ? baseFrameH : Math.round(baseFrameW / ratio);
    // 120 帧间隙按真实底片取窄值（≈2mm / 56mm 画幅高，帧几乎相贴）；135 维持原有间隙
    const normalGap = is120
      ? Math.round(slotH * TUNE.gap120)
      : Math.max(10 * scale, Math.round(baseFrameW * 0.045));
    const selectedColumns = clamp(Number(columnsSelect.value) || 6, 2, 8);
    const slotCount = isCroppedHalfFrame ? 12 : selectedColumns;
    const slotW = isCroppedHalfFrame ? baseFrameW / 2 : baseFrameW;
    const normalSixFrameAreaW = 6 * baseFrameW + 5 * normalGap;
    const slotGap = isCroppedHalfFrame
      ? (normalSixFrameAreaW - slotCount * slotW) / (slotCount - 1)
      : normalGap;
    const frameAreaW = isCroppedHalfFrame
      ? normalSixFrameAreaW
      : slotCount * slotW + (slotCount - 1) * slotGap;

    // 型号 edgeText 为空表示底片无边字：只跳过边字绘制，边字带仍照常占位，布局与有边字时一致
    const stock = resolveStock(getActiveStock());
    const hasEdgeText = showEdgeText.checked && Boolean(stock.edgeText);
    // 120 画幅：仅 ECN-2 电影卷保留齿孔；135 画幅由复选框控制
    const showSprocketHoles = showSprockets.checked && (!is120 || stock.sprocketsIn120);

    // 上下带分为两个不重叠的分区：外侧边字带 + 内侧齿孔带（边字印在齿孔外缘）
    let sprocketH;
    let textH;
    let textSprocketShift;
    let bandH;
    let stripPadX;
    let sprocketPitch;
    let sprocketHoleW;
    if (is120) {
      // 120：上下留边极窄（真实各约 2.75mm，对 56mm 画幅高≈5%），所有比例以画幅高 slotH 为基准，
      // 四种 120 画幅共享同一物理片宽
      sprocketH = showSprocketHoles ? Math.round(slotH * 0.09) : 0;
      textH = showEdgeText.checked ? Math.round(slotH * TUNE.band120) : 0;
      textSprocketShift = 0;
      // 关掉边字后窄黑留边（物理 rebate）仍占位
      bandH = Math.max(sprocketH + textH, Math.round(slotH * 0.02));
      stripPadX = Math.round(slotH * 0.05);
      // 齿孔节距按 135 物理孔距 4.75mm 对 56mm 画幅高换算（仅 ECN-2 电影卷可见）
      sprocketPitch = slotH * (4.75 / 56);
      sprocketHoleW = Math.round(slotH * (2.8 / 56));
    } else {
      sprocketH = showSprocketHoles ? Math.round(baseFrameW * TUNE.sprocketH) : 0;
      textH = showEdgeText.checked ? Math.round(baseFrameW * TUNE.textH) : 0;
      // 齿孔带向外缘方向收紧，让齿孔更贴近边字（仅两者都显示时生效）
      textSprocketShift =
        sprocketH && textH ? Math.min(Math.round(baseFrameW * TUNE.textSprocketGap), textH) : 0;
      bandH = Math.max(sprocketH + textH - textSprocketShift, Math.round(baseFrameW * 0.055));
      stripPadX = Math.round(baseFrameW * 0.085);
      // 按 135 规格连续排列齿孔：孔距≈4.75mm，对应画幅宽 38mm 的 1/8
      sprocketPitch = baseFrameW * 0.125;
      sprocketHoleW = Math.round(baseFrameW * TUNE.holeW);
    }

    const sheetPad = Math.round(baseFrameW * 0.18);
    const rowGap = Math.round(baseFrameW * 0.14);

    return {
      frameW: baseFrameW,
      frameH: slotH,
      baseFrameW,
      baseFrameH,
      ratio,
      gap: normalGap,
      slotW,
      slotH,
      slotGap,
      slotCount,
      frameAreaW,
      // 120 边字按帧对齐（slotW === baseFrameW、slotGap === normalGap），与 135 的独立物理节距共用同一字段
      edgeMarkW: baseFrameW,
      edgeMarkGap: normalGap,
      edgeMarkSlotSpan: isCroppedHalfFrame ? 2 : 1,
      isHalfFrame,
      isCroppedHalfFrame,
      is120,
      leaderSlots: isCroppedHalfFrame ? 2 : 1,
      bandH,
      sprocketH,
      textH,
      textSprocketShift,
      sprocketPitch,
      sprocketHoleW,
      stripPadX,
      sheetPad,
      rowGap,
      columns: slotCount,
      showEdgeText: hasEdgeText,
      showSprockets: showSprocketHoles,
      // 120 胶片无片头片尾
      showLeader: showLeader.checked && !is120,
      // 片头舌保持普通 135 单格宽；半格下占两个半格槽位
      leaderW: baseFrameW + normalGap,
      leaderAdvance: isCroppedHalfFrame ? 2 * (slotW + slotGap) : baseFrameW + normalGap,
      stock,
    };
  }

  // 把图片分配到各行：开启片头片尾时首行留出片头舌的位置，末行标记剪切
  function buildRows(itemCount, options) {
    const rows = [];
    let index = 0;
    let rowIdx = 0;
    do {
      const leader = options.showLeader && rowIdx === 0;
      const leaderSlots = leader ? options.leaderSlots : 0;
      const capacity = options.slotCount - leaderSlots;
      const count = Math.min(capacity, itemCount - index);
      rows.push({ start: index, count, capacity, leader, leaderSlots, trailer: false, trimmed: false });
      index += count;
      rowIdx += 1;
    } while (index < itemCount);
    const lastRow = rows[rows.length - 1];
    lastRow.trailer = options.showLeader;
    lastRow.trimmed = lastRow.count < lastRow.capacity;
    return rows;
  }

  function computeLayout(itemCount, options) {
    const rows = buildRows(itemCount, options);
    const frameAreaW = options.frameAreaW;
    const stripW = frameAreaW + options.stripPadX * 2;
    const stripH = options.bandH * 2 + options.slotH;
    const canvasW = Math.round(stripW + options.sheetPad * 2);
    const canvasH = Math.round(rows.length * stripH + (rows.length - 1) * options.rowGap + options.sheetPad * 2);
    return { rows, stripW, stripH, canvasW, canvasH };
  }

  function drawIndex(items, options) {
    const layout = computeLayout(items.length, options);
    const isPreview = activeCanvas === previewCanvas;

    activeCanvas.width = layout.canvasW;
    activeCanvas.height = layout.canvasH;
    ctx.clearRect(0, 0, layout.canvasW, layout.canvasH);
    drawSheetBackground(layout.canvasW, layout.canvasH);

    if (isPreview) state.frameRects = [];

    layout.rows.forEach((rowInfo, row) => {
      const rowItems = items.slice(rowInfo.start, rowInfo.start + rowInfo.count);
      const x = options.sheetPad;
      const y = options.sheetPad + row * (layout.stripH + options.rowGap);
      drawFilmRow(rowItems, rowInfo, x, y, layout, row, options, isPreview);
    });

    if (isPreview && state.dropIndex !== null) {
      drawDropIndicator(layout, options);
    }
  }

  function drawSheetBackground(width, height) {
    ctx.fillStyle = "#f7f1e6";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(45, 40, 32, 0.035)";
    for (let y = 0; y < height; y += 18) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.fillRect(0, 0, width, Math.max(80, height * 0.08));
  }

  function drawFilmRow(items, rowInfo, x, y, layout, rowIndex, options, isPreview) {
    const stripH = layout.stripH;
    const contentWidth = rowInfo.count
      ? rowInfo.count * options.slotW + (rowInfo.count - 1) * options.slotGap
      : 0;
    const usedWidth = (rowInfo.leader ? options.leaderAdvance : 0) + contentWidth;
    // 未填满的末行在最后一帧后截断；trailer 仅控制模拟片尾的剪切外观
    const stripW = rowInfo.trimmed
      ? options.stripPadX * 2 + usedWidth
      : layout.stripW;

    // 胶片条投影，让条从纸面上"浮"起来
    ctx.save();
    ctx.shadowColor = "rgba(25, 20, 12, 0.35)";
    ctx.shadowBlur = Math.round(options.frameW * 0.05);
    ctx.shadowOffsetY = Math.round(options.frameW * 0.018);
    buildStripPath(x, y, stripW, stripH, rowInfo, options);
    ctx.fillStyle = "#131110";
    ctx.fill();
    ctx.restore();

    // 之后的所有内容都裁剪在条轮廓内（片头舌、剪切口都能正确截断齿孔/边字/画面）
    ctx.save();
    buildStripPath(x, y, stripW, stripH, rowInfo, options);
    ctx.clip();

    // 片基色：略带棕调的深色 + 纵向光泽渐变
    const baseGradient = ctx.createLinearGradient(0, y, 0, y + stripH);
    baseGradient.addColorStop(0, "#231e19");
    baseGradient.addColorStop(0.12, "#161311");
    baseGradient.addColorStop(0.5, "#191512");
    baseGradient.addColorStop(0.88, "#151210");
    baseGradient.addColorStop(1, "#241f1a");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(x, y, stripW, stripH);

    // 斜向高光，模拟片基反光
    const sheen = ctx.createLinearGradient(x, y, x + stripW * 0.55, y + stripH);
    sheen.addColorStop(0, "rgba(255, 250, 235, 0.05)");
    sheen.addColorStop(0.35, "rgba(255, 250, 235, 0)");
    sheen.addColorStop(0.8, "rgba(255, 250, 235, 0.025)");
    sheen.addColorStop(1, "rgba(255, 250, 235, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, stripW, stripH);

    drawFilmTexture(x, y, stripW, stripH, rowIndex);

    if (rowInfo.leader) {
      drawLeaderZone(x, y, stripH, options);
    }

    // 齿孔位于内侧分区（紧贴画面），边字在齿孔外缘；齿孔带向边字方向收紧 textSprocketShift
    if (options.showSprockets) {
      const topZoneY = y + options.textH - options.textSprocketShift;
      const bottomZoneY = y + stripH - options.textH - options.sprocketH + options.textSprocketShift;
      // 下排齿孔贯穿整条，片头行的舌部落在下半，也保留完整下排孔（与参考图一致）
      drawSprockets(x, bottomZoneY, stripW, options);
      if (rowInfo.leader) {
        // 片头行：上半条在舌区被裁掉，上排孔只在恢复全高之后出现，避开过渡弧线
        const geo = leaderGeometry(x, y, stripH, options);
        drawSprockets(x, topZoneY, stripW, options, geo.footX, null);
      } else {
        drawSprockets(x, topZoneY, stripW, options);
      }
    }

    if (options.showEdgeText) {
      if (options.is120) {
        drawEdgeTextTop120(x, y, stripW, rowInfo, options);
        drawEdgeTextBottom120(x, y + stripH - options.textH, stripW, rowInfo, rowIndex, options);
      } else {
        drawEdgeTextTop(x, y, stripW, rowInfo, rowIndex, options);
        drawEdgeTextBottom(x, y + stripH - options.textH, stripW, rowInfo, options);
      }
    }

    const frameStartX = x + options.stripPadX;
    const contentStartX = getRowContentStartX(frameStartX, rowInfo, options);
    items.forEach((item, index) => {
      const frameX = getSlotX(contentStartX, index, options);
      const frameY = y + options.bandH;
      drawFrame(item, frameX, frameY, options.slotW, options.slotH, isPreview);
      if (isPreview) {
        state.frameRects.push({
          id: item.id,
          x: frameX,
          y: frameY,
          w: options.slotW,
          h: options.slotH,
        });
      }
    });

    // 截断行无需空帧；只有未截断的普通行才用未曝光纯黑补足空位
    if (!rowInfo.trimmed) {
      for (let slot = rowInfo.count; slot < rowInfo.capacity; slot += 1) {
        const frameX = getSlotX(contentStartX, slot, options);
        const frameY = y + options.bandH;
        drawBlankFrame(frameX, frameY, options.slotW, options.slotH);
      }
    }

    ctx.restore();

    // 条边缘一圈细微亮边
    buildStripPath(x + 0.5, y + 0.5, stripW - 1, stripH - 1, rowInfo, options);
    ctx.strokeStyle = "rgba(255, 248, 230, 0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 构建胶片条轮廓：普通行是圆角矩形；片头行左端是半宽片舌（上半条裁掉，舌落在下半）；片尾行右端是剪刀切口
  function buildStripPath(x, y, stripW, stripH, rowInfo, options) {
    // 120 条带是平切端头，圆角取极小值
    const r = options.is120
      ? Math.max(2, Math.round(options.frameW * 0.004))
      : Math.max(6, Math.round(options.frameW * 0.015));
    const xr = x + stripW;

    ctx.beginPath();

    if (rowInfo.leader) {
      // 片头舌：上半条被裁掉，舌部保留下半（含完整下排齿孔），过渡弧线位于上方。
      // 从舌部左缘起，沿切边（上）走到弧脚，S 形弧线平滑升到全高上缘，
      // 再走完整上缘 → 右缘 → 下缘 → 回到舌尖，两角圆角收尾（经典 135 片舌形状）
      const { cutY, footX, curveW, tongueR } = leaderGeometry(x, y, stripH, options);
      ctx.moveTo(x, cutY + tongueR);
      ctx.arcTo(x, cutY, x + tongueR, cutY, tongueR);
      ctx.lineTo(footX - curveW, cutY);
      ctx.bezierCurveTo(footX - curveW * 0.5, cutY, footX - curveW * 0.5, y, footX, y);
      ctx.lineTo(xr - r, y);
      ctx.arcTo(xr, y, xr, y + stripH, r);
      ctx.lineTo(xr, y + stripH - r);
      ctx.arcTo(xr, y + stripH, xr - r, y + stripH, r);
      ctx.lineTo(x + tongueR, y + stripH);
      ctx.arcTo(x, y + stripH, x, y + stripH - tongueR, tongueR);
      ctx.lineTo(x, cutY + tongueR);
      ctx.closePath();
      return;
    }

    ctx.moveTo(x + r, y);

    if (rowInfo.trailer) {
      // 剪刀切口：略斜的锯齿状右缘
      const cut = options.frameW * 0.1;
      ctx.lineTo(xr - cut * 0.2, y);
      ctx.lineTo(xr - cut * 0.75, y + stripH * 0.16);
      ctx.lineTo(xr - cut * 0.3, y + stripH * 0.33);
      ctx.lineTo(xr - cut * 0.95, y + stripH * 0.5);
      ctx.lineTo(xr - cut * 0.4, y + stripH * 0.66);
      ctx.lineTo(xr - cut * 0.9, y + stripH * 0.84);
      ctx.lineTo(xr - cut * 0.55, y + stripH);
    } else {
      ctx.lineTo(xr - r, y);
      ctx.arcTo(xr, y, xr, y + stripH, r);
      ctx.lineTo(xr, y + stripH - r);
      ctx.arcTo(xr, y + stripH, xr - r, y + stripH, r);
    }

    ctx.lineTo(x + r, y + stripH);
    ctx.arcTo(x, y + stripH, x, y, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);

    ctx.closePath();
  }

  // 片头舌几何参数：轮廓与齿孔排布共用，保证孔永远不会压到舌部切口
  function leaderGeometry(x, y, stripH, options) {
    const r = Math.max(6, Math.round(options.frameW * 0.015));
    // 舌部切边：略过片宽中线（参考图约 0.48），切掉的上半部分高度即过渡弧高
    const cutY = y + Math.round(stripH * 0.48);
    const curveH = cutY - y;
    return {
      cutY,
      curveH,
      // 弧宽 ≈ 弧高，近似四分之一圆的平滑过渡
      curveW: curveH,
      // 弧线与全高上缘的交点：舌区到此结束，其后恢复完整上排齿孔
      footX: x + options.leaderW,
      tongueR: Math.min(r * 3, stripH * 0.12),
    };
  }

  // 片头区域：舌部装片时曝光成浓黑，经不规则的曝光边缘过渡到未曝光片基
  function drawLeaderZone(x, y, stripH, options) {
    const firstFrameX = x + options.stripPadX + options.leaderW;
    const baseStart = x + options.leaderW * 0.55;

    // 未曝光片基统一按纯黑处理，不随型号分化
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(baseStart, y, firstFrameX - baseStart - options.gap * 0.4, stripH);

    // 曝光的舌部：浓黑，边缘带轻微倾斜的渐变过渡（曝光边缘）；舌落在下半，渐变偏下
    const fog = ctx.createLinearGradient(x, y + stripH, x + options.leaderW * 0.92, y + stripH * 0.65);
    fog.addColorStop(0, "rgba(4, 3, 2, 0.97)");
    fog.addColorStop(0.62, "rgba(5, 4, 3, 0.94)");
    fog.addColorStop(0.85, "rgba(8, 6, 4, 0.5)");
    fog.addColorStop(1, "rgba(10, 7, 4, 0)");
    ctx.fillStyle = fog;
    ctx.fillRect(x, y, options.leaderW * 1.1, stripH);
  }

  function drawFrame(item, x, y, width, height, isPreview) {
    const sourceRatio = item.width / item.height;
    const targetRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = item.width;
    let sh = item.height;

    if (sourceRatio > targetRatio) {
      sw = Math.round(item.height * targetRatio);
      sx = Math.round((item.width - sw) / 2);
    } else if (sourceRatio < targetRatio) {
      sh = Math.round(item.width / targetRatio);
      sy = Math.round((item.height - sh) / 2);
    }

    const radius = Math.max(2, Math.round(width * 0.008));

    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(x, y, width, height);
    // 画布内拖拽调序时，被拖的帧半透明显示
    if (isPreview && state.dragItemId === item.id) {
      ctx.globalAlpha = 0.35;
    }
    ctx.drawImage(item.source, sx, sy, sw, sh, x, y, width, height);
    ctx.globalAlpha = 1;

    // 画面四角轻微暗角
    const vignette = ctx.createRadialGradient(
      x + width / 2,
      y + height / 2,
      Math.min(width, height) * 0.42,
      x + width / 2,
      y + height / 2,
      Math.hypot(width, height) / 2,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(10, 6, 2, 0.22)");
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // 帧边缘一圈极细的暖色亮边，模拟片窗透光
    roundedRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
    ctx.strokeStyle = "rgba(255, 214, 150, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 空帧 = 未曝光区域，与片基统一显示为纯黑
  function drawBlankFrame(x, y, width, height) {
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(x, y, width, height);
    // 与片基之间极淡的分界
    ctx.strokeStyle = "rgba(255, 248, 230, 0.03)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  // 齿孔节距与孔宽由 getRenderOptions 按画幅派生（135 按孔距 4.75mm≈画幅宽 1/8；120 仅 ECN-2 电影卷可见）
  // minX/maxX：只画完整落在 [minX, maxX] 区间内的孔（片头行用来避开舌部切口弧线），不改变孔距相位
  function drawSprockets(x, zoneY, stripW, options, minX = null, maxX = null) {
    const pitch = options.sprocketPitch;
    const holeW = options.sprocketHoleW;
    const holeH = Math.round(options.sprocketH * TUNE.holeH);
    const holeY = zoneY + Math.round((options.sprocketH - holeH) / 2);
    const holeR = Math.max(2, Math.round(holeW * 0.28));
    const margin = Math.round(options.frameW * 0.04);

    for (let hx = x + margin; hx + holeW < x + stripW - margin; hx += pitch) {
      if (minX !== null && hx < minX) continue;
      if (maxX !== null && hx + holeW > maxX) continue;
      // 孔内先铺一层深色内阴影再露出纸底，边缘更立体
      roundedRect(ctx, hx, holeY, holeW, holeH, holeR);
      ctx.fillStyle = "#f4eddf";
      ctx.fill();
      const inner = ctx.createLinearGradient(0, holeY, 0, holeY + holeH);
      inner.addColorStop(0, "rgba(40, 30, 18, 0.4)");
      inner.addColorStop(0.35, "rgba(40, 30, 18, 0)");
      inner.addColorStop(1, "rgba(255, 255, 255, 0.25)");
      roundedRect(ctx, hx, holeY, holeW, holeH, holeR);
      ctx.fillStyle = inner;
      ctx.fill();
    }
  }

  function edgeFont(options, scale = 1) {
    const sizeRatio = options.is120 ? TUNE.fontSize120 : TUNE.fontSize;
    const regularSize = Math.max(options.is120 ? 1 : 11, Math.round(options.textH * sizeRatio));
    const fontSize = Math.max(options.is120 ? 1 : 7, Math.round(regularSize * scale));
    return { fontSize, font: `700 ${fontSize}px "Courier New", monospace` };
  }

  // 图片槽位与胶片出厂边字的物理节距相互独立：裁切半格每两个图片槽共用一个标准 135 边字格。
  function getEdgeMarkLayout(x, stripW, rowInfo, options) {
    const markPitch = options.edgeMarkW + options.edgeMarkGap;
    const startX = x + options.stripPadX + (rowInfo.leader ? markPitch : 0);
    const markCount = Math.ceil(rowInfo.capacity / options.edgeMarkSlotSpan);
    const endX = x + stripW;
    const marks = [];

    for (let mark = 0; mark < markCount; mark += 1) {
      const markX = startX + mark * markPitch;
      // 片尾可能在一个物理边字格中间剪断；保留已开始的边字，让条带轮廓负责裁切。
      if (markX >= endX) break;
      marks.push({
        x: markX,
        index: Math.floor(rowInfo.start / options.edgeMarkSlotSpan) + mark,
      });
    }

    return marks;
  }

  function drawFrameNumberWithSuffix(frameNumber, x, baseline, options) {
    const digits = `${frameNumber}`;
    const regularFont = edgeFont(options).font;
    ctx.font = regularFont;
    ctx.fillText(digits, x, baseline);

    const digitWidth = ctx.measureText(digits).width;
    const suffixFont = edgeFont(options, EDGE_NUMBER_SUFFIX_SCALE).font;
    ctx.font = suffixFont;
    ctx.fillText("A", x + digitWidth, baseline);
    ctx.font = regularFont;
  }

  function setEdgeInk(options) {
    // 边字颜色随型号工艺：彩负染料橙、黑白银盐白、E-6 暖肤色、ECN-2 偏黄白
    ctx.shadowColor = options.stock.edgeInk.glow;
    ctx.shadowBlur = 3;
    ctx.fillStyle = options.stock.edgeInk.color;
  }

  // 上边字（齿孔外缘）：型号字样逐帧交替印刷
  function drawEdgeTextTop(x, zoneY, stripW, rowInfo, rowIndex, options) {
    const { font } = edgeFont(options);
    // 边字紧贴胶片外缘：中线距上缘 textOffsetY × 边字带高度
    const baseline = zoneY + Math.round(options.textH * TUNE.textOffsetY);
    const presets = options.stock.edgePresets;
    const preset = presets[rowIndex % presets.length];
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    marks.forEach((mark, index) => {
      const label = index % 2 === 0 ? options.stock.edgeText : preset;
      ctx.fillText(label, mark.x, baseline, options.edgeMarkW * 0.94);
    });
    ctx.restore();
  }

  // 下边字（齿孔外缘）：帧号 N / NA + 帧界标记点（边字为出厂预曝光，空帧上也有）
  function drawEdgeTextBottom(x, zoneY, stripW, rowInfo, options) {
    const { fontSize, font } = edgeFont(options);
    // 下边字同样贴外缘（即靠近胶片下边）：与上边字对称
    const baseline = zoneY + options.textH - Math.round(options.textH * TUNE.textOffsetY);
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    marks.forEach((mark) => {
      const frameNumber = mark.index + 1;
      ctx.fillText(`${frameNumber}`, mark.x + Math.round(options.edgeMarkW * 0.03), baseline);
      // 半格双号（N/NA）是 135 负片惯例；正片和电影卷只有单号
      if (options.stock.frameNumberStyle === "N/NA") {
        drawFrameNumberWithSuffix(
          frameNumber,
          mark.x + Math.round(options.edgeMarkW * 0.52),
          baseline,
          options,
        );
      }
      // 帧界处的小方点标记
      ctx.fillRect(
        mark.x + options.edgeMarkW - Math.round(fontSize * 0.45),
        baseline - Math.round(fontSize * 0.16),
        Math.round(fontSize * 0.32),
        Math.round(fontSize * 0.32),
      );
    });
    ctx.restore();
  }

  // 120 上边字：按帧对齐 —— 帧左「型号字样」、帧右大号帧号、右角品牌词（对齐 Ektar 66 参考）
  function drawEdgeTextTop120(x, zoneY, stripW, rowInfo, options) {
    const { font } = edgeFont(options);
    const numberFont = edgeFont(options, 1.15).font;
    const baseline = zoneY + Math.round(options.textH * 0.52);
    const brand = options.stock.edgeText.split(" ")[0] || "";
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    marks.forEach((mark) => {
      ctx.font = font;
      ctx.textAlign = "left";
      ctx.fillText(options.stock.edgeText, mark.x + Math.round(options.edgeMarkW * 0.02), baseline, options.edgeMarkW * 0.6);
      ctx.font = numberFont;
      ctx.fillText(`${mark.index + 1}`, mark.x + Math.round(options.edgeMarkW * 0.7), baseline);
      if (brand) {
        ctx.font = font;
        ctx.textAlign = "right";
        ctx.fillText(brand, mark.x + options.edgeMarkW, baseline, options.edgeMarkW * 0.22);
      }
    });
    ctx.restore();
  }

  // 120 下边字：按帧对齐 —— ▶箭头 + 帧号，隔帧交替字样，右段 DX 条码刻线簇（对齐 645 Fuji 参考）
  function drawEdgeTextBottom120(x, zoneY, stripW, rowInfo, rowIndex, options) {
    const { fontSize, font } = edgeFont(options);
    const baseline = zoneY + Math.round(options.textH * 0.52);
    const presets = options.stock.edgePresets120;
    const preset = presets[rowIndex % presets.length];
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    marks.forEach((mark, index) => {
      // 实心三角箭头（canvas path 而非 ▶ 字符，避免字体差异）
      const triW = Math.round(fontSize * 0.55);
      const triH = Math.round(fontSize * 0.5);
      const triX = mark.x + Math.round(options.edgeMarkW * 0.03);
      ctx.beginPath();
      ctx.moveTo(triX, baseline - triH / 2);
      ctx.lineTo(triX + triW, baseline);
      ctx.lineTo(triX, baseline + triH / 2);
      ctx.closePath();
      ctx.fill();

      ctx.textAlign = "left";
      ctx.fillText(`${mark.index + 1}`, triX + triW + Math.round(fontSize * 0.3), baseline);

      // 隔帧印一条 120 交替字样（120 / SAFETY FILM 等）
      if (index % 2 === 1) {
        ctx.fillText(preset, mark.x + Math.round(options.edgeMarkW * 0.34), baseline, options.edgeMarkW * 0.32);
      }

      // DX 条码刻线簇：粗细与间隔由确定性伪随机决定，保证预览与导出一致
      const barZoneX = mark.x + options.edgeMarkW * 0.72;
      const barZoneW = options.edgeMarkW * 0.24;
      const barH = Math.round(options.textH * 0.55);
      const barY = baseline - Math.round(barH / 2);
      const barCount = 14;
      let bx = barZoneX;
      for (let i = 0; i < barCount && bx < barZoneX + barZoneW; i += 1) {
        const seed = mark.index * 197 + i * 13;
        const barW = Math.max(1, Math.round(fontSize * (0.05 + deterministicNoise(seed) * 0.1)));
        ctx.fillRect(Math.round(bx), barY, barW, barH);
        bx += barW + Math.max(1, Math.round(fontSize * (0.06 + deterministicNoise(seed + 7) * 0.12)));
      }
    });
    ctx.restore();
  }

  // 颗粒噪点 + 细划痕（确定性伪随机，保证预览与导出一致）
  function drawFilmTexture(x, y, width, height, rowIndex) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#26211c";
    for (let i = 0; i < 90; i += 1) {
      const px = x + deterministicNoise(i * 17 + rowIndex * 131) * width;
      const py = y + deterministicNoise(i * 31 + rowIndex * 37) * height;
      const size = 1 + deterministicNoise(i * 47 + rowIndex) * 2;
      ctx.fillRect(px, py, size, size);
    }
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = "#fff6e0";
    for (let i = 0; i < 3; i += 1) {
      const sx = x + deterministicNoise(rowIndex * 53 + i * 97) * width;
      ctx.fillRect(sx, y, 1, height);
    }
    ctx.restore();
  }

  // 拖拽调序时的插入位置指示线
  function drawDropIndicator(layout, options) {
    const dropIndex = state.dropIndex;
    let row = layout.rows.findIndex(
      (info) => dropIndex >= info.start && dropIndex <= info.start + info.count,
    );
    if (row < 0) row = layout.rows.length - 1;
    const rowInfo = layout.rows[row];
    const slot = dropIndex - rowInfo.start;
    const frameStartX = options.sheetPad + options.stripPadX;
    const contentStartX = getRowContentStartX(frameStartX, rowInfo, options);
    const lineX = getSlotX(contentStartX, slot, options) - options.slotGap / 2;
    const frameY = options.sheetPad + row * (layout.stripH + options.rowGap) + options.bandH;
    const inset = Math.round(options.slotH * 0.06);

    ctx.save();
    ctx.shadowColor = "rgba(255, 176, 64, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffb040";
    const lineW = Math.max(3, Math.round(options.frameW * 0.012));
    roundedRect(ctx, lineX - lineW / 2, frameY - inset, lineW, options.slotH + inset * 2, lineW / 2);
    ctx.fill();
    ctx.restore();
  }

  function renderPhotoList() {
    photoListPanel.style.display = state.items.length ? "grid" : "none";
    photoList.innerHTML = "";

    getSortedItems().forEach((item) => {
      const li = document.createElement("li");
      li.className = "photo-item";
      li.draggable = true;
      li.dataset.id = String(item.id);

      const thumb = document.createElement("img");
      thumb.className = "photo-thumb";
      thumb.src = item.thumbUrl;
      thumb.alt = "";
      thumb.draggable = false;

      const name = document.createElement("span");
      name.className = "photo-name";
      name.textContent = item.name;
      name.title = item.name;

      const remove = document.createElement("button");
      remove.className = "photo-remove";
      remove.type = "button";
      remove.setAttribute("aria-label", `移除 ${item.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => removeItem(item.id));

      li.append(thumb, name, remove);
      photoList.appendChild(li);
    });

    attachListDragHandlers();
  }

  function attachListDragHandlers() {
    photoList.querySelectorAll(".photo-item").forEach((li) => {
      li.addEventListener("dragstart", (event) => {
        state.dragId = Number(li.dataset.id);
        li.classList.add("is-dragged");
        event.dataTransfer.effectAllowed = "move";
      });
      li.addEventListener("dragend", () => {
        state.dragId = null;
        li.classList.remove("is-dragged");
      });
      li.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      li.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const targetId = Number(li.dataset.id);
        if (state.dragId === null || state.dragId === targetId) return;
        reorderItems(state.dragId, targetId);
      });
    });
  }

  // 照片列表拖拽排序：先固化当前显示顺序，再切到自定义模式
  function reorderItems(dragId, targetId) {
    solidifyCustomOrder();
    const fromIndex = state.items.findIndex((item) => item.id === dragId);
    const toIndex = state.items.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = state.items.splice(fromIndex, 1);
    state.items.splice(toIndex, 0, moved);
    render();
    renderPhotoList();
  }

  function removeItem(id) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    state.reprocessGeneration += 1;
    releaseItem(state.items[index]);
    state.items.splice(index, 1);
    render();
    renderPhotoList();
  }

  function releaseItem(item) {
    closeDistinctSources(item.source, item.editSource, item.originalSource);
    URL.revokeObjectURL(item.thumbUrl);
  }

  function showNotice(message) {
    noticeEl.textContent = message;
    noticeEl.classList.add("is-visible");
    window.clearTimeout(state.noticeTimer);
    state.noticeTimer = window.setTimeout(() => {
      noticeEl.classList.remove("is-visible");
    }, 5200);
  }

  function drawEmptyCanvas() {
    activeCanvas = previewCanvas;
    ctx = previewCanvas.getContext("2d");
    previewCanvas.width = 1200;
    previewCanvas.height = 720;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    state.frameRects = [];
    emptyState.classList.remove("is-hidden");
    previewWrap.classList.remove("is-loading");
    previewWrap.classList.add("is-empty");
    setFilmStageState("intro");
    statusTitle.textContent = "等待导入扫描件";
    imageCounter.textContent = "0 张";
    exportButton.disabled = true;
    applyPreviewZoom();
  }

  function setPreviewZoom(value) {
    state.previewZoom = clamp(value, 0.25, 2);
    zoomRange.value = Math.round(state.previewZoom * 100);
    applyPreviewZoom();
  }

  function applyPreviewZoom() {
    previewCanvas.style.width = `${Math.round(previewCanvas.width * state.previewZoom)}px`;
    previewCanvas.style.height = `${Math.round(previewCanvas.height * state.previewZoom)}px`;
  }

  function fitPreviewToViewport() {
    if (!previewCanvas.width || !previewWrap.clientWidth) return;
    const available = Math.max(240, previewWrap.clientWidth - 56);
    setPreviewZoom(clamp(available / previewCanvas.width, 0.25, 2));
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function deterministicNoise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  // ---- 帧操作菜单：点击/右键单帧弹出操作选项 ----

  function showFrameMenu(itemId, clientX, clientY) {
    state.contextItemId = itemId;
    frameMenu.hidden = false;

    // 先设置菜单位置在点击处，如果超出视口再调整
    const menuRect = frameMenu.getBoundingClientRect();
    let x = clientX;
    let y = clientY;

    if (x + menuRect.width > window.innerWidth - 10) {
      x = window.innerWidth - menuRect.width - 10;
    }
    if (y + menuRect.height > window.innerHeight - 10) {
      y = window.innerHeight - menuRect.height - 10;
    }

    frameMenu.style.left = `${x}px`;
    frameMenu.style.top = `${y}px`;
  }

  function hideFrameMenu() {
    frameMenu.hidden = true;
    state.contextItemId = null;
  }

  frameMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const itemId = state.contextItemId;
      hideFrameMenu();
      if (!itemId) return;

      switch (action) {
        case "crop":
          openCropModal(itemId);
          break;
        case "rotate":
          rotateItem(itemId);
          break;
        case "insert":
          insertBeforeItem(itemId);
          break;
        case "delete":
          removeItem(itemId);
          break;
      }
    });
  });

  previewWrap.addEventListener("scroll", hideFrameMenu, { passive: true });
  window.addEventListener("scroll", hideFrameMenu, { passive: true });
  window.addEventListener("resize", hideFrameMenu);

  // 点击菜单外关闭
  document.addEventListener("pointerdown", (event) => {
    if (!frameMenu.hidden && !frameMenu.contains(event.target)) {
      hideFrameMenu();
    }
  });

  // ---- 裁切工具：交互式裁切框 ----

  function openCropModal(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;

    cropModal.hidden = false;
    document.body.style.overflow = "hidden";

    // 在 canvas 上绘制原图
    const maxW = 640;
    const maxH = 480;
    const scale = Math.min(1, maxW / item.width, maxH / item.height);
    const displayW = Math.round(item.width * scale);
    const displayH = Math.round(item.height * scale);

    cropCanvas.width = displayW;
    cropCanvas.height = displayH;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(item.source, 0, 0, displayW, displayH);

    // 计算初始裁切区域,保持当前底片画幅比例
    const aspectRatio = getFormat().ratio;
    let cropW, cropH, cropX, cropY;

    if (aspectRatio >= 1) {
      // 横图或方图
      cropH = Math.round(displayH * 0.8);
      cropW = Math.round(cropH * aspectRatio);
      if (cropW > displayW) {
        cropW = displayW;
        cropH = Math.round(cropW / aspectRatio);
      }
    } else {
      // 竖图
      cropW = Math.round(displayW * 0.8);
      cropH = Math.round(cropW / aspectRatio);
      if (cropH > displayH) {
        cropH = displayH;
        cropW = Math.round(cropH * aspectRatio);
      }
    }
    cropX = Math.round((displayW - cropW) / 2);
    cropY = Math.round((displayH - cropH) / 2);

    state.cropState = {
      itemId,
      displayW,
      displayH,
      cropX,
      cropY,
      cropW,
      cropH,
      aspectRatio,
      editVersion: item.editVersion,
      drag: null,
      // 保存初始状态用于重置
      initialCropX: cropX,
      initialCropY: cropY,
      initialCropW: cropW,
      initialCropH: cropH,
    };

    updateCropOverlay();
  }

  function closeCropModal() {
    cropModal.hidden = true;
    document.body.style.overflow = "";
    state.cropState = null;
  }

  function updateCropOverlay() {
    if (!state.cropState) return;
    const { cropX, cropY, cropW, cropH, displayW, displayH } = state.cropState;
    const canvasRect = cropCanvas.getBoundingClientRect();
    const wrapRect = cropCanvas.parentElement.getBoundingClientRect();
    const scaleX = canvasRect.width / displayW;
    const scaleY = canvasRect.height / displayH;
    const originX = canvasRect.left - wrapRect.left;
    const originY = canvasRect.top - wrapRect.top;

    cropOverlay.style.left = `${originX + cropX * scaleX}px`;
    cropOverlay.style.top = `${originY + cropY * scaleY}px`;
    cropOverlay.style.width = `${cropW * scaleX}px`;
    cropOverlay.style.height = `${cropH * scaleY}px`;
  }

  cropOverlay.addEventListener("pointerdown", (event) => {
    if (!state.cropState) return;
    event.preventDefault();

    // 标记正在拖拽,防止误触发关闭
    state.cropState.isDragging = false;

    const rect = cropCanvas.getBoundingClientRect();
    // 保存 canvas 渲染尺寸信息
    const renderW = rect.width;
    const renderH = rect.height;
    const { displayW, displayH } = state.cropState;

    const startX = event.clientX;
    const startY = event.clientY;
    const { cropX, cropY, cropW, cropH } = state.cropState;
    // 最小尺寸为图片较小边的 10%
    const minSize = Math.min(displayW, displayH) * 0.1;

    let mode = "move";
    if (event.target.classList.contains("crop-handle")) {
      if (event.target.classList.contains("nw")) mode = "nw";
      else if (event.target.classList.contains("ne")) mode = "ne";
      else if (event.target.classList.contains("sw")) mode = "sw";
      else if (event.target.classList.contains("se")) mode = "se";
    }

    state.cropState.drag = {
      mode,
      startX,
      startY,
      startCropX: cropX,
      startCropY: cropY,
      startCropW: cropW,
      startCropH: cropH,
      // 保存缩放比例
      scaleX: displayW / renderW,
      scaleY: displayH / renderH,
    };

    const onMove = (e) => {
      if (!state.cropState || !state.cropState.drag) return;
      // 标记正在拖拽
      state.cropState.isDragging = true;

      // 计算鼠标在 canvas 渲染坐标系中的移动量
      const dxRender = e.clientX - startX;
      const dyRender = e.clientY - startY;

      const { mode, startCropX, startCropY, startCropW, startCropH, scaleX, scaleY } = state.cropState.drag;
      const { displayW, displayH, aspectRatio } = state.cropState;

      // 将渲染坐标移动量转换为内部像素坐标移动量
      const dx = dxRender * scaleX;
      const dy = dyRender * scaleY;

      if (mode === "move") {
        state.cropState.cropX = clamp(startCropX + dx, 0, displayW - cropW);
        state.cropState.cropY = clamp(startCropY + dy, 0, displayH - cropH);
      } else {
        const anchors = {
          nw: [startCropX + startCropW, startCropY + startCropH, -1, -1],
          ne: [startCropX, startCropY + startCropH, 1, -1],
          sw: [startCropX + startCropW, startCropY, -1, 1],
          se: [startCropX, startCropY, 1, 1],
        };
        const [anchorX, anchorY, directionX, directionY] = anchors[mode];
        const pointerX = startCropX + (mode.includes("w") ? 0 : startCropW) + dx;
        const pointerY = startCropY + (mode.includes("n") ? 0 : startCropH) + dy;
        const projectedH = (
          directionX * aspectRatio * (pointerX - anchorX) +
          directionY * (pointerY - anchorY)
        ) / (aspectRatio * aspectRatio + 1);
        const maxH = Math.min(
          directionY < 0 ? anchorY : displayH - anchorY,
          (directionX < 0 ? anchorX : displayW - anchorX) / aspectRatio,
        );
        const minH = Math.min(
          maxH,
          minSize / Math.min(1, aspectRatio),
        );
        const newH = clamp(projectedH, minH, maxH);
        const newW = newH * aspectRatio;

        state.cropState.cropX = directionX < 0 ? anchorX - newW : anchorX;
        state.cropState.cropY = directionY < 0 ? anchorY - newH : anchorY;
        state.cropState.cropW = newW;
        state.cropState.cropH = newH;
      }

      updateCropOverlay();
    };

    const onEnd = () => {
      if (state.cropState) state.cropState.drag = null;
      // 延迟清除拖拽标志,避免 pointerup 后的 click 事件触发关闭
      setTimeout(() => {
        if (state.cropState) {
          state.cropState.isDragging = false;
        }
      }, 10);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
  });

  cropClose.addEventListener("click", closeCropModal);
  cropCancel.addEventListener("click", closeCropModal);
  cropReset.addEventListener("click", () => {
    if (!state.cropState) return;
    // 恢复到初始裁剪区域
    state.cropState.cropX = state.cropState.initialCropX;
    state.cropState.cropY = state.cropState.initialCropY;
    state.cropState.cropW = state.cropState.initialCropW;
    state.cropState.cropH = state.cropState.initialCropH;
    updateCropOverlay();
  });

  // 点击背景关闭裁切模态框
  cropModal.addEventListener("click", (event) => {
    // 如果正在拖拽,不关闭(防止拖拽到背景区域后释放鼠标触发关闭)
    if (state.cropState && state.cropState.isDragging) {
      return;
    }
    if (event.target === cropModal || event.target.classList.contains("crop-backdrop")) {
      closeCropModal();
    }
  });

  cropApply.addEventListener("click", async () => {
    if (!state.cropState) return;
    const { itemId, displayW, displayH, cropX, cropY, cropW, cropH, editVersion } = state.cropState;
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || item.editVersion !== editVersion) {
      closeCropModal();
      showNotice("图片状态已变化，请重新打开裁切工具");
      return;
    }

    const sourceW = item.width;
    const sourceH = item.height;
    const realX = Math.round(cropX * sourceW / displayW);
    const realY = Math.round(cropY * sourceH / displayH);
    const realRight = Math.round((cropX + cropW) * sourceW / displayW);
    const realBottom = Math.round((cropY + cropH) * sourceH / displayH);
    const realW = Math.max(1, realRight - realX);
    const realH = Math.max(1, realBottom - realY);
    const canvas = document.createElement("canvas");
    canvas.width = realW;
    canvas.height = realH;
    const cropCtx = canvas.getContext("2d");
    cropCtx.drawImage(item.source, realX, realY, realW, realH, 0, 0, realW, realH);
    const newEditSource = await canvasToSource(canvas);

    const oldEditSource = item.editSource;
    const oldRenderSource = item.source;
    item.editSource = newEditSource;
    item.editWidth = realW;
    item.editHeight = realH;
    item.manualTurns = 0;
    item.editVersion += 1;
    const generation = ++state.reprocessGeneration;
    await rebuildItemSource(item, generation, item.editVersion);
    if (oldEditSource && oldEditSource !== item.originalSource && oldEditSource !== item.source) {
      closeSource(oldEditSource);
    }
    if (
      oldRenderSource !== item.originalSource &&
      oldRenderSource !== oldEditSource &&
      oldRenderSource !== item.source
    ) {
      closeSource(oldRenderSource);
    }

    closeCropModal();
    render();
    renderPhotoList();
    showNotice("已应用裁切");
  });

  // ---- 旋转图片：顺时针 90 度 ----

  async function rotateItem(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    item.manualTurns = (item.manualTurns + 1) % 4;
    item.editVersion += 1;
    const generation = ++state.reprocessGeneration;
    await rebuildItemSource(item, generation, item.editVersion);
    render();
    renderPhotoList();
    showNotice("已旋转 90°");
  }

  // ---- 在指定帧前插入图片 ----

  function insertBeforeItem(itemId) {
    fileInput.setAttribute("data-insert-before", itemId);
    fileInput.click();
  }

  async function loadFiles(files, insertBeforeId = null) {
    if (!files.length) {
      if (!state.items.length) setFilmStageState("intro");
      return;
    }
    const imageFiles = files.filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    const skipped = files.length - imageFiles.length;
    if (!imageFiles.length) {
      if (!state.items.length) setFilmStageState("intro");
      if (skipped) {
        showNotice(`跳过了 ${skipped} 个不支持的文件（仅支持 JPG / PNG / WebP）`);
      }
      return;
    }

    statusTitle.textContent = "正在读取扫描件...";
    previewWrap.classList.add("is-loading");
    if (!state.items.length) setFilmStageState("reading");
    exportButton.disabled = true;

    const loaded = await Promise.allSettled(imageFiles.map(readImageFile));
    const succeeded = loaded
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const failed = loaded.length - succeeded.length;

    // 插入模式：在指定帧前插入
    if (insertBeforeId !== null) {
      const index = state.items.findIndex((item) => item.id === insertBeforeId);
      if (index >= 0) {
        state.items.splice(index, 0, ...succeeded);
      } else {
        state.items.push(...succeeded);
      }
    } else {
      // 追加而非覆盖，支持分批导入
      state.items.push(...succeeded);
    }

    const messages = [];
    if (skipped) messages.push(`跳过了 ${skipped} 个不支持的文件（仅支持 JPG / PNG / WebP）`);
    if (failed) messages.push(`${failed} 个文件读取失败`);
    if (messages.length) showNotice(messages.join("；"));

    render();
    renderPhotoList();
    await rebuildAllItemSources(true);
  }

  // ---- 胶卷型号：数据层 + 自定义型号面板 ----

  function getAllStocks() {
    return [...BUILTIN_STOCKS, ...state.customStocks];
  }

  function findStock(id) {
    return getAllStocks().find((stock) => stock.id === id) || null;
  }

  function getActiveStock() {
    return findStock(state.stockId) || findStock(DEFAULT_STOCK_ID) || BUILTIN_STOCKS[0];
  }

  // 渲染层只消费合并结果：省略的外观字段落回工艺默认；edgeText 为空表示无边字
  function resolveStock(stock) {
    const defaults = PROCESS_DEFAULTS[stock.process] || PROCESS_DEFAULTS["C-41"];
    return {
      ...stock,
      edgeText: stock.edgeText || "",
      edgeInk: stock.edgeInk || defaults.edgeInk,
      edgePresets:
        Array.isArray(stock.edgePresets) && stock.edgePresets.length
          ? stock.edgePresets
          : defaults.edgePresets,
      // 120 交替字样不开放自定义，一律随工艺默认
      edgePresets120: defaults.edgePresets120,
      frameNumberStyle: stock.frameNumberStyle || defaults.frameNumberStyle,
      sprocketsIn120: Boolean(stock.sprocketsIn120),
    };
  }

  // 校验并整形外部数据（localStorage / JSON 导入），非法返回 null；edgeText 允许为空（无边字）
  function sanitizeStock(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const text = typeof raw.edgeText === "string" ? raw.edgeText.trim() : "";
    if (!name || !PROCESS_NAMES.includes(raw.process)) return null;

    const stock = {
      id: typeof raw.id === "string" && raw.id ? raw.id : makeStockId(name),
      name: name.slice(0, 60),
      edgeText: text.slice(0, 60).toUpperCase(),
      process: raw.process,
      builtin: false,
    };
    if (
      raw.edgeInk &&
      typeof raw.edgeInk.color === "string" &&
      typeof raw.edgeInk.glow === "string"
    ) {
      stock.edgeInk = { color: raw.edgeInk.color, glow: raw.edgeInk.glow };
    }
    if (Array.isArray(raw.edgePresets)) {
      const presets = raw.edgePresets
        .filter((entry) => typeof entry === "string" && entry.trim())
        .map((entry) => entry.trim().slice(0, 40));
      if (presets.length) stock.edgePresets = presets.slice(0, 8);
    }
    if (raw.frameNumberStyle === "N/NA" || raw.frameNumberStyle === "N") {
      stock.frameNumberStyle = raw.frameNumberStyle;
    }
    if (raw.sprocketsIn120 === true) {
      stock.sprocketsIn120 = true;
    }
    return stock;
  }

  function makeStockId(name) {
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "stock";
    let id = `custom-${slug}-${state.nextStockSeq++}`;
    while (findStock(id)) id = `custom-${slug}-${state.nextStockSeq++}`;
    return id;
  }

  function loadStoredStocks() {
    state.nextStockSeq = 1;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_STOCKS_KEY) || "[]");
      if (Array.isArray(parsed)) {
        const seen = new Set(BUILTIN_STOCKS.map((stock) => stock.id));
        parsed.forEach((raw) => {
          const stock = sanitizeStock(raw);
          if (!stock) return;
          if (seen.has(stock.id)) stock.id = makeStockId(stock.name);
          seen.add(stock.id);
          state.customStocks.push(stock);
        });
      }
    } catch (error) {
      // 坏数据静默丢弃，回落到仅内置型号
    }
    // id 序号避开已恢复的自定义型号，防止新 id 与旧数据撞名
    state.nextStockSeq = state.customStocks.length + 1;

    // 迁移已合并到内置型号的自定义型号
    const builtinIds = new Set(BUILTIN_STOCKS.map((s) => s.id));
    const mergedStocks = state.customStocks.filter((s) => !builtinIds.has(s.id));
    if (mergedStocks.length !== state.customStocks.length) {
      state.customStocks = mergedStocks;
      try {
        localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(state.customStocks));
      } catch (error) {
        // 忽略存储错误
      }
    }

    const selected = localStorage.getItem(STORAGE_SELECTED_KEY);
    state.stockId = findStock(selected) ? selected : DEFAULT_STOCK_ID;
  }

  function persistStocks() {
    try {
      localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(state.customStocks));
      localStorage.setItem(STORAGE_SELECTED_KEY, state.stockId);
    } catch (error) {
      showNotice("型号保存失败：浏览器本地存储不可用");
    }
  }

  function renderStockSelect() {
    stockSelect.innerHTML = "";
    const builtinGroup = document.createElement("optgroup");
    builtinGroup.label = "内置型号";
    BUILTIN_STOCKS.forEach((stock) => builtinGroup.appendChild(stockOption(stock)));
    stockSelect.appendChild(builtinGroup);

    if (state.customStocks.length) {
      const customGroup = document.createElement("optgroup");
      customGroup.label = "自定义型号";
      state.customStocks.forEach((stock) => customGroup.appendChild(stockOption(stock)));
      stockSelect.appendChild(customGroup);
    }
    stockSelect.value = getActiveStock().id;
  }

  function stockOption(stock) {
    const option = document.createElement("option");
    option.value = stock.id;
    option.textContent = stock.name;
    return option;
  }

  // 把当前选中型号填进表单：内置型号作为"另存为"的底稿，自定义型号可编辑/删除
  function fillStockForm(stock) {
    const resolved = resolveStock(stock);
    stockName.value = stock.builtin ? `${stock.name} 副本` : stock.name;
    stockEdgeText.value = stock.edgeText;
    stockProcess.value = stock.process;
    stockInkEnabled.checked = Boolean(stock.edgeInk);
    stockInkColor.value = inkToHex(resolved.edgeInk.color);
    stockPresets.value = stock.edgePresets ? stock.edgePresets.join(", ") : "";
    stockFrameNumber.value = stock.frameNumberStyle || "";
    stockSaveButton.textContent = stock.builtin ? "另存为自定义型号" : "保存修改";
    stockDeleteButton.style.display = stock.builtin ? "none" : "inline-flex";
    updateInkFieldVisibility();
  }

  function updateInkFieldVisibility() {
    stockInkField.style.display = stockInkEnabled.checked ? "grid" : "none";
  }

  function inkToHex(color) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return "#ffb040";
    return `#${match
      .slice(1, 4)
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function hexToInk(hex) {
    const value = parseInt(hex.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return {
      color: `rgba(${r}, ${g}, ${b}, 0.92)`,
      glow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    };
  }

  // 从表单读出型号对象；编辑已有自定义型号时传入其 id。边字字样留空表示底片无边字
  function readStockForm(existingId) {
    const name = stockName.value.trim();
    const text = stockEdgeText.value.trim();
    if (!name) {
      showNotice("请填写型号名称");
      return null;
    }
    const stock = {
      id: existingId || makeStockId(name),
      name: name.slice(0, 60),
      edgeText: text.slice(0, 60).toUpperCase(),
      process: stockProcess.value,
      builtin: false,
    };
    if (stockInkEnabled.checked) stock.edgeInk = hexToInk(stockInkColor.value);
    const presets = stockPresets.value
      .split(/[,，]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (presets.length) stock.edgePresets = presets.slice(0, 8).map((entry) => entry.slice(0, 40));
    if (stockFrameNumber.value) stock.frameNumberStyle = stockFrameNumber.value;
    return stock;
  }

  function exportStocksJson() {
    if (!state.customStocks.length) {
      showNotice("还没有自定义型号可导出");
      return;
    }
    const blob = new Blob([JSON.stringify(state.customStocks, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "film-stocks.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  async function importStocksJson(file) {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      showNotice("导入失败：不是有效的 JSON 文件");
      return;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const existingIds = new Set(getAllStocks().map((stock) => stock.id));
    let imported = 0;
    let skipped = 0;
    list.forEach((raw) => {
      const stock = sanitizeStock(raw);
      if (!stock) {
        skipped += 1;
        return;
      }
      if (existingIds.has(stock.id)) stock.id = makeStockId(stock.name);
      existingIds.add(stock.id);
      state.customStocks.push(stock);
      imported += 1;
    });
    if (imported) {
      persistStocks();
      renderStockSelect();
    }
    const messages = [];
    if (imported) messages.push(`导入了 ${imported} 个型号`);
    if (skipped) messages.push(`跳过了 ${skipped} 条无效数据`);
    showNotice(messages.length ? messages.join("；") : "文件中没有可导入的型号");
  }

  function setupStockPanel() {
    loadStoredStocks();
    renderStockSelect();
    fillStockForm(getActiveStock());

    stockSelect.addEventListener("change", () => {
      state.stockId = stockSelect.value;
      persistStocks();
      fillStockForm(getActiveStock());
      updateFrameModeControls();
      scheduleRender();
    });

    stockInkEnabled.addEventListener("change", updateInkFieldVisibility);

    stockSaveButton.addEventListener("click", () => {
      const active = getActiveStock();
      const existingId = active.builtin ? null : active.id;
      const stock = readStockForm(existingId);
      if (!stock) return;
      if (existingId) {
        const index = state.customStocks.findIndex((entry) => entry.id === existingId);
        if (index >= 0) state.customStocks[index] = stock;
        else state.customStocks.push(stock);
      } else {
        state.customStocks.push(stock);
      }
      state.stockId = stock.id;
      persistStocks();
      renderStockSelect();
      fillStockForm(stock);
      showNotice(existingId ? `已更新型号「${stock.name}」` : `已新增型号「${stock.name}」`);
      scheduleRender();
    });

    stockDeleteButton.addEventListener("click", () => {
      const active = getActiveStock();
      if (active.builtin) return;
      state.customStocks = state.customStocks.filter((entry) => entry.id !== active.id);
      state.stockId = DEFAULT_STOCK_ID;
      persistStocks();
      renderStockSelect();
      fillStockForm(getActiveStock());
      showNotice(`已删除型号「${active.name}」`);
      scheduleRender();
    });

    stockExportButton.addEventListener("click", exportStocksJson);

    stockImportButton.addEventListener("click", () => stockImportInput.click());
    stockImportInput.addEventListener("change", () => {
      const [file] = stockImportInput.files || [];
      if (file) importStocksJson(file);
      stockImportInput.value = "";
    });
  }

  // ---- 调参面板：常驻侧栏"高级设置"菜单（默认收起），实时作用于预览与导出 ----
  function setupTunePanel() {
    const container = document.getElementById("tuneFields");
    if (!container) return;

    const fields = [
      { key: "sprocketH", label: "齿孔带高度 (×frameW)", min: 0.04, max: 0.2, step: 0.002 },
      { key: "holeH", label: "齿孔高度 (×齿孔带)", min: 0.3, max: 1, step: 0.02 },
      { key: "holeW", label: "齿孔宽度 (×frameW)", min: 0.02, max: 0.1, step: 0.002 },
      { key: "textH", label: "边字带高度 (×frameW)", min: 0.03, max: 0.16, step: 0.002 },
      { key: "fontSize", label: "字号 (×边字带)", min: 0.4, max: 1.2, step: 0.02 },
      { key: "textOffsetY", label: "边字到片边距离 (×边字带)", min: 0.2, max: 0.8, step: 0.02 },
      { key: "textSprocketGap", label: "齿孔向边字收紧 (×frameW)", min: 0, max: 0.05, step: 0.002 },
    ];
    const defaults = { ...TUNE };

    fields.forEach((field) => {
      const row = document.createElement("label");
      row.className = "tune-row";

      const caption = document.createElement("span");
      const value = document.createElement("b");
      value.textContent = ` ${TUNE[field.key]}`;
      caption.textContent = field.label;
      caption.appendChild(value);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.value = TUNE[field.key];
      slider.addEventListener("input", () => {
        TUNE[field.key] = Number(slider.value);
        value.textContent = ` ${slider.value}`;
        scheduleRender();
      });

      row.append(caption, slider);
      container.appendChild(row);
      field.slider = slider;
      field.valueEl = value;
    });

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "text-button";
    resetButton.textContent = "恢复默认";
    resetButton.addEventListener("click", () => {
      fields.forEach((field) => {
        TUNE[field.key] = defaults[field.key];
        field.slider.value = defaults[field.key];
        field.valueEl.textContent = ` ${defaults[field.key]}`;
      });
      scheduleRender();
    });
    container.appendChild(resetButton);
  }

  setupStockPanel();
  setupTunePanel();

  // 确保裁切模态框和菜单初始状态为隐藏
  cropModal.hidden = true;
  frameMenu.hidden = true;
})();
