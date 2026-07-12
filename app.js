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
  const showLeader = document.getElementById("showLeader");
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
  const columnsSelect = document.getElementById("columnsSelect");
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
  const cropApply = document.getElementById("cropApply");

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
  };

  // ---- 胶卷型号：内置与自定义同构的型号对象，按冲洗工艺分档取默认外观 ----

  // 每档工艺的默认外观；型号对象省略（null/缺省）的字段从这里取
  const PROCESS_DEFAULTS = {
    "C-41": {
      // 彩负边字是曝光后的橙色染料影像
      edgeInk: { color: "rgba(255, 176, 64, 0.92)", glow: "rgba(255, 170, 60, 0.45)" },
      edgePresets: ["135-36", "C-41", "DX 5063", "SAFETY FILM", "135"],
      frameNumberStyle: "N/NA",
    },
    BW: {
      // 黑白负片边字是银盐影像，呈亮白/浅灰，无橙色染料
      edgeInk: { color: "rgba(238, 238, 232, 0.92)", glow: "rgba(240, 240, 235, 0.35)" },
      edgePresets: ["135-36", "SAFETY FILM", "DX 5063", "PANCHROMATIC", "135"],
      frameNumberStyle: "N/NA",
    },
    "E-6": {
      // 反转片边字取暖肤色 #f9c394（可读性优先，非严格拟真的暗色）
      edgeInk: { color: "rgba(249, 195, 148, 0.92)", glow: "rgba(249, 195, 148, 0.4)" },
      edgePresets: ["135-36", "E-6", "SAFETY FILM", "135"],
      frameNumberStyle: "N",
    },
    "ECN-2": {
      edgeInk: { color: "rgba(250, 230, 190, 0.92)", glow: "rgba(250, 230, 190, 0.35)" },
      edgePresets: ["EASTMAN", "KEEP FILM 5219", "ECN-2", "SAFETY FILM"],
      frameNumberStyle: "N",
    },
  };
  const PROCESS_NAMES = Object.keys(PROCESS_DEFAULTS);

  const BUILTIN_STOCKS = [
    { id: "kodak-portra-160", name: "Kodak Portra 160", edgeText: "KODAK PORTRA 160", process: "C-41" },
    { id: "kodak-portra-400", name: "Kodak Portra 400", edgeText: "KODAK PORTRA 400", process: "C-41" },
    { id: "kodak-portra-800", name: "Kodak Portra 800", edgeText: "KODAK PORTRA 800", process: "C-41" },
    { id: "kodak-gold-200", name: "Kodak Gold 200", edgeText: "KODAK GOLD 200", process: "C-41" },
    { id: "kodak-colorplus-200", name: "Kodak ColorPlus 200", edgeText: "KODAK COLORPLUS 200", process: "C-41" },
    { id: "kodak-ultramax-400", name: "Kodak UltraMax 400", edgeText: "KODAK ULTRAMAX 400", process: "C-41" },
    { id: "kodak-ektar-100", name: "Kodak Ektar 100", edgeText: "KODAK EKTAR 100", process: "C-41" },
    { id: "kodak-tri-x-400", name: "Kodak Tri-X 400", edgeText: "KODAK TRI-X 400", process: "BW" },
    { id: "ilford-hp5-plus-400", name: "Ilford HP5 Plus 400", edgeText: "ILFORD HP5 PLUS 400", process: "BW" },
    { id: "ilford-fp4-plus-125", name: "Ilford FP4 Plus 125", edgeText: "ILFORD FP4 PLUS 125", process: "BW" },
    { id: "ilford-delta-400", name: "Ilford Delta 400", edgeText: "ILFORD DELTA 400", process: "BW" },
    { id: "fujifilm-400", name: "Fujifilm 400", edgeText: "FUJIFILM 400", process: "C-41" },
    { id: "fujicolor-c200", name: "Fujicolor C200", edgeText: "FUJICOLOR C200", process: "C-41" },
    { id: "lucky-c200", name: "Lucky C200 乐凯彩色负片", edgeText: "LUCKY C200", process: "C-41" },
    { id: "fujichrome-velvia-50", name: "Fujichrome Velvia 50", edgeText: "FUJICHROME VELVIA 50", process: "E-6" },
    { id: "fujichrome-provia-100f", name: "Fujichrome Provia 100F", edgeText: "FUJICHROME PROVIA 100F", process: "E-6" },
    { id: "cinestill-800t", name: "CineStill 800T", edgeText: "CINESTILL 800T", process: "ECN-2" },
    { id: "lomography-color-400", name: "Lomography Color 400", edgeText: "LOMOGRAPHY COLOR 400", process: "C-41" },
  ].map((stock) => ({ ...stock, builtin: true }));

  const DEFAULT_STOCK_ID = "kodak-portra-400";
  const STORAGE_STOCKS_KEY = "filmIndex.customStocks";
  const STORAGE_SELECTED_KEY = "filmIndex.selectedStock";

  // 可调渲染参数（均为相对"单张宽度"或所在分区的比例）。
  // 侧栏"高级设置"菜单内有滑块可实时调整。
  const TUNE = {
    sprocketH: 0.1, // 齿孔带高度 / frameW
    holeH: 0.76, // 齿孔高度 / 齿孔带高度
    holeW: 0.058, // 齿孔宽度 / frameW
    textH: 0.068, // 边字带高度 / frameW
    fontSize: 0.86, // 字号 / 边字带高度
    textOffsetY: 0.38, // 边字中线到胶片外缘的距离 / 边字带高度（真实底片边字几乎贴着片边）
    textSprocketGap: 0.022, // 齿孔带向边字方向收紧的距离 / frameW（越大边字与齿孔离得越近）
  };

  // 浏览器 canvas 尺寸安全上限（保守取值，超出后 toBlob 会得到 null）
  const MAX_CANVAS_SIDE = 16384;
  const MAX_CANVAS_AREA = 16384 * 16384;

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

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer.files || []);
    loadFiles(files);
  });

  // 防止文件被拖到 dropZone 之外时浏览器直接打开图片、丢掉当前页面
  ["dragover", "drop"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
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
    frameAspect,
    columnsSelect,
    frameWidthInput,
    formatSelect,
    jpgQuality,
  ].forEach((control) => {
    control.addEventListener("input", scheduleRender);
    control.addEventListener("change", scheduleRender);
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
    const slotOffset = rowInfo.leader ? 1 : 0;
    const frameStartX = options.sheetPad + options.stripPadX;
    const slot = clamp(
      Math.round((point.x - frameStartX) / (options.frameW + options.gap)) - slotOffset,
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

  qualityField.style.display = "none";
  drawEmptyCanvas();
  applyPreviewZoom();

  async function readImageFile(file) {
    const [decoded, taken] = await Promise.all([
      decodeImage(file),
      readExifDate(file).catch(() => null),
    ]);
    const source = await normalizeOrientation(decoded);
    return {
      id: state.nextId++,
      file,
      source,
      width: source.width,
      height: source.height,
      name: file.name,
      modified: file.lastModified || 0,
      taken,
      thumbUrl: URL.createObjectURL(file),
    };
  }

  // 导入预处理：竖图统一顺时针旋转 90 度，与横向的胶片画幅方向一致
  async function normalizeOrientation(source) {
    if (source.height <= source.width) return source;
    const canvas = document.createElement("canvas");
    canvas.width = source.height;
    canvas.height = source.width;
    const rotCtx = canvas.getContext("2d");
    rotCtx.translate(canvas.width, 0);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(source, 0, 0);
    if (typeof source.close === "function") source.close();
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(canvas);
      } catch (error) {
        // 落回直接把 canvas 当作绘制源
      }
    }
    return canvas;
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
    const frameW = clamp(Number(frameWidthInput.value) || 420, 180, 1200) * scale;
    const ratio = Number(frameAspect.value) || 1.5;
    const frameH = Math.round(frameW / ratio);
    const gap = Math.max(10 * scale, Math.round(frameW * 0.045));

    // 型号 edgeText 为空表示底片无边字：只跳过边字绘制，边字带仍照常占位，布局与有边字时一致
    const stock = resolveStock(getActiveStock());
    const hasEdgeText = showEdgeText.checked && Boolean(stock.edgeText);

    // 上下带分为两个不重叠的分区：外侧边字带 + 内侧齿孔带（边字印在齿孔外缘）
    const sprocketH = showSprockets.checked ? Math.round(frameW * TUNE.sprocketH) : 0;
    const textH = showEdgeText.checked ? Math.round(frameW * TUNE.textH) : 0;
    // 齿孔带向外缘方向收紧，让齿孔更贴近边字（仅两者都显示时生效）
    const textSprocketShift =
      sprocketH && textH ? Math.min(Math.round(frameW * TUNE.textSprocketGap), textH) : 0;
    const bandH = Math.max(sprocketH + textH - textSprocketShift, Math.round(frameW * 0.055));

    const stripPadX = Math.round(frameW * 0.085);
    const sheetPad = Math.round(frameW * 0.18);
    const rowGap = Math.round(frameW * 0.14);

    return {
      frameW,
      frameH,
      ratio,
      gap,
      bandH,
      sprocketH,
      textH,
      textSprocketShift,
      stripPadX,
      sheetPad,
      rowGap,
      columns: clamp(Number(columnsSelect.value) || 6, 3, 8),
      showEdgeText: hasEdgeText,
      showSprockets: showSprockets.checked,
      showLeader: showLeader.checked,
      // 片头舌区域占一个帧位宽
      leaderW: frameW + gap,
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
      const capacity = leader ? options.columns - 1 : options.columns;
      const count = Math.min(capacity, itemCount - index);
      rows.push({ start: index, count, capacity, leader, trailer: false });
      index += count;
      rowIdx += 1;
    } while (index < itemCount);
    rows[rows.length - 1].trailer = options.showLeader;
    return rows;
  }

  function computeLayout(itemCount, options) {
    const rows = buildRows(itemCount, options);
    const frameAreaW = options.columns * options.frameW + (options.columns - 1) * options.gap;
    const stripW = frameAreaW + options.stripPadX * 2;
    const stripH = options.bandH * 2 + options.frameH;
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
    const slotOffset = rowInfo.leader ? 1 : 0;
    const usedSlots = rowInfo.count + slotOffset;
    // 片尾行：胶片在最后一帧后被剪断，条更短
    const stripW =
      rowInfo.trailer && usedSlots < options.columns
        ? options.stripPadX * 2 + usedSlots * (options.frameW + options.gap) - options.gap
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
      drawEdgeTextTop(x, y, stripW, rowInfo, rowIndex, options);
      drawEdgeTextBottom(x, y + stripH - options.textH, stripW, rowInfo, options);
    }

    const frameStartX = x + options.stripPadX;
    items.forEach((item, index) => {
      const slot = index + slotOffset;
      const frameX = frameStartX + slot * (options.frameW + options.gap);
      const frameY = y + options.bandH;
      drawFrame(item, frameX, frameY, options.frameW, options.frameH, isPreview);
      if (isPreview) {
        state.frameRects.push({
          id: item.id,
          x: frameX,
          y: frameY,
          w: options.frameW,
          h: options.frameH,
        });
      }
    });

    // 片尾行已被剪短，无需空帧；其余行的空位显示为未曝光的纯黑
    if (!rowInfo.trailer) {
      for (let slot = usedSlots; slot < options.columns; slot += 1) {
        const frameX = frameStartX + slot * (options.frameW + options.gap);
        const frameY = y + options.bandH;
        drawBlankFrame(frameX, frameY, options.frameW, options.frameH);
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
    const r = Math.max(6, Math.round(options.frameW * 0.015));
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

  // 按 135 规格连续排列齿孔：孔距≈4.75mm，对应画幅宽 38mm 的 1/8
  // minX/maxX：只画完整落在 [minX, maxX] 区间内的孔（片头行用来避开舌部切口弧线），不改变孔距相位
  function drawSprockets(x, zoneY, stripW, options, minX = null, maxX = null) {
    const pitch = options.frameW * 0.125;
    const holeW = Math.round(options.frameW * TUNE.holeW);
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

  function edgeFont(options) {
    const fontSize = Math.max(11, Math.round(options.textH * TUNE.fontSize));
    return { fontSize, font: `700 ${fontSize}px "Courier New", monospace` };
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
    const frameStartX = x + options.stripPadX;
    const presets = options.stock.edgePresets;
    const preset = presets[rowIndex % presets.length];
    const slotOffset = rowInfo.leader ? 1 : 0;

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    for (let slot = slotOffset; slot < options.columns; slot += 1) {
      const frameX = frameStartX + slot * (options.frameW + options.gap);
      if (frameX + options.frameW > x + stripW) break;
      const label = slot % 2 === 0 ? options.stock.edgeText : preset;
      ctx.fillText(label, frameX, baseline, options.frameW * 0.94);
    }
    ctx.restore();
  }

  // 下边字（齿孔外缘）：帧号 N / NA + 帧界标记点（边字为出厂预曝光，空帧上也有）
  function drawEdgeTextBottom(x, zoneY, stripW, rowInfo, options) {
    const { fontSize, font } = edgeFont(options);
    // 下边字同样贴外缘（即靠近胶片下边）：与上边字对称
    const baseline = zoneY + options.textH - Math.round(options.textH * TUNE.textOffsetY);
    const frameStartX = x + options.stripPadX;
    const slotOffset = rowInfo.leader ? 1 : 0;

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(options);

    for (let slot = slotOffset; slot < options.columns; slot += 1) {
      const frameX = frameStartX + slot * (options.frameW + options.gap);
      if (frameX + options.frameW > x + stripW) break;
      const frameNumber = rowInfo.start + (slot - slotOffset) + 1;
      ctx.fillText(`${frameNumber}`, frameX + Math.round(options.frameW * 0.03), baseline);
      // 半格双号（N/NA）是 135 负片惯例；正片和电影卷只有单号
      if (options.stock.frameNumberStyle === "N/NA") {
        ctx.fillText(`${frameNumber}A`, frameX + Math.round(options.frameW * 0.52), baseline);
      }
      // 帧界处的小方点标记
      ctx.fillRect(
        frameX + options.frameW - Math.round(fontSize * 0.45),
        baseline - Math.round(fontSize * 0.16),
        Math.round(fontSize * 0.32),
        Math.round(fontSize * 0.32),
      );
    }
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
    const slotOffset = rowInfo.leader ? 1 : 0;
    const slot = dropIndex - rowInfo.start + slotOffset;
    const frameStartX = options.sheetPad + options.stripPadX;
    const lineX = frameStartX + slot * (options.frameW + options.gap) - options.gap / 2;
    const frameY = options.sheetPad + row * (layout.stripH + options.rowGap) + options.bandH;
    const inset = Math.round(options.frameH * 0.06);

    ctx.save();
    ctx.shadowColor = "rgba(255, 176, 64, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffb040";
    const lineW = Math.max(3, Math.round(options.frameW * 0.012));
    roundedRect(ctx, lineX - lineW / 2, frameY - inset, lineW, options.frameH + inset * 2, lineW / 2);
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
    releaseItem(state.items[index]);
    state.items.splice(index, 1);
    render();
    renderPhotoList();
  }

  function releaseItem(item) {
    if (item.source && typeof item.source.close === "function") {
      item.source.close();
    }
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

    // 初始裁切区域占 80% 居中
    const cropW = Math.round(displayW * 0.8);
    const cropH = Math.round(displayH * 0.8);
    const cropX = Math.round((displayW - cropW) / 2);
    const cropY = Math.round((displayH - cropH) / 2);

    state.cropState = {
      itemId,
      scale,
      displayW,
      displayH,
      cropX,
      cropY,
      cropW,
      cropH,
      drag: null,
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
    const { cropX, cropY, cropW, cropH } = state.cropState;
    cropOverlay.style.left = `${cropX}px`;
    cropOverlay.style.top = `${cropY}px`;
    cropOverlay.style.width = `${cropW}px`;
    cropOverlay.style.height = `${cropH}px`;
  }

  cropOverlay.addEventListener("pointerdown", (event) => {
    if (!state.cropState) return;
    event.preventDefault();

    const rect = cropCanvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const { cropX, cropY, cropW, cropH } = state.cropState;

    let mode = "move";
    if (event.target.classList.contains("crop-handle")) {
      if (event.target.classList.contains("nw")) mode = "nw";
      else if (event.target.classList.contains("ne")) mode = "ne";
      else if (event.target.classList.contains("sw")) mode = "sw";
      else if (event.target.classList.contains("se")) mode = "se";
    }

    state.cropState.drag = { mode, startX, startY, startCropX: cropX, startCropY: cropY, startCropW: cropW, startCropH: cropH };

    const onMove = (e) => {
      if (!state.cropState || !state.cropState.drag) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const { mode, startCropX, startCropY, startCropW, startCropH } = state.cropState.drag;
      const { displayW, displayH } = state.cropState;

      if (mode === "move") {
        state.cropState.cropX = clamp(startCropX + dx, 0, displayW - cropW);
        state.cropState.cropY = clamp(startCropY + dy, 0, displayH - cropH);
      } else {
        let newX = startCropX;
        let newY = startCropY;
        let newW = startCropW;
        let newH = startCropH;

        if (mode.includes("n")) {
          newY = clamp(startCropY + dy, 0, startCropY + startCropH - 50);
          newH = startCropY + startCropH - newY;
        }
        if (mode.includes("s")) {
          newH = clamp(startCropH + dy, 50, displayH - startCropY);
        }
        if (mode.includes("w")) {
          newX = clamp(startCropX + dx, 0, startCropX + startCropW - 50);
          newW = startCropX + startCropW - newX;
        }
        if (mode.includes("e")) {
          newW = clamp(startCropW + dx, 50, displayW - startCropX);
        }

        state.cropState.cropX = newX;
        state.cropState.cropY = newY;
        state.cropState.cropW = newW;
        state.cropState.cropH = newH;
      }

      updateCropOverlay();
    };

    const onEnd = () => {
      if (state.cropState) state.cropState.drag = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
  });

  cropClose.addEventListener("click", closeCropModal);
  cropCancel.addEventListener("click", closeCropModal);

  // 点击背景关闭裁切模态框
  cropModal.addEventListener("click", (event) => {
    if (event.target === cropModal || event.target.classList.contains("crop-backdrop")) {
      closeCropModal();
    }
  });

  cropApply.addEventListener("click", async () => {
    if (!state.cropState) return;
    const { itemId, scale, cropX, cropY, cropW, cropH } = state.cropState;
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;

    // 从原图裁切（按实际尺寸）
    const realX = Math.round(cropX / scale);
    const realY = Math.round(cropY / scale);
    const realW = Math.round(cropW / scale);
    const realH = Math.round(cropH / scale);

    const canvas = document.createElement("canvas");
    canvas.width = realW;
    canvas.height = realH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(item.source, realX, realY, realW, realH, 0, 0, realW, realH);

    // 释放旧资源
    if (item.source && typeof item.source.close === "function") {
      item.source.close();
    }

    // 替换为裁切后的图片
    let newSource = canvas;
    if (typeof createImageBitmap === "function") {
      try {
        newSource = await createImageBitmap(canvas);
      } catch (error) {
        // 落回使用 canvas
      }
    }

    item.source = newSource;
    item.width = realW;
    item.height = realH;

    closeCropModal();
    render();
    renderPhotoList();
    showNotice("已应用裁切");
  });

  // ---- 旋转图片：顺时针 90 度 ----

  async function rotateItem(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;

    const canvas = document.createElement("canvas");
    canvas.width = item.height;
    canvas.height = item.width;
    const rotCtx = canvas.getContext("2d");
    rotCtx.translate(canvas.width, 0);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(item.source, 0, 0);

    if (item.source && typeof item.source.close === "function") {
      item.source.close();
    }

    let newSource = canvas;
    if (typeof createImageBitmap === "function") {
      try {
        newSource = await createImageBitmap(canvas);
      } catch (error) {
        // 落回使用 canvas
      }
    }

    item.source = newSource;
    const temp = item.width;
    item.width = item.height;
    item.height = temp;

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
    if (!files.length) return;
    const imageFiles = files.filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    const skipped = files.length - imageFiles.length;
    if (!imageFiles.length) {
      if (skipped) {
        showNotice(`跳过了 ${skipped} 个不支持的文件（仅支持 JPG / PNG / WebP）`);
      }
      return;
    }

    statusTitle.textContent = "正在读取扫描件...";
    previewWrap.classList.add("is-loading");
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
    fitPreviewToViewport();
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
      frameNumberStyle: stock.frameNumberStyle || defaults.frameNumberStyle,
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
