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
  const sortSegmented = document.querySelector(".sort-segmented");
  const showEdgeText = document.getElementById("showEdgeText");
  const showSprockets = document.getElementById("showSprockets");
  const imageInSprockets = document.getElementById("imageInSprockets");
  const imageInEdgeText = document.getElementById("imageInEdgeText");
  const imageCoverageHint = document.getElementById("imageCoverageHint");
  const sprocketsHint = document.getElementById("sprocketsHint");
  const showLeader = document.getElementById("showLeader");
  const leaderHint = document.getElementById("leaderHint");
  const stockSelect = document.getElementById("stockSelect");
  const stockSearch = document.getElementById("stockSearch");
  const stockSearchStatus = document.getElementById("stockSearchStatus");
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
  const wideSpecField = document.getElementById("wideSpecField");
  const wideSpecSelect = document.getElementById("wideSpecSelect");
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
  const photoListCount = document.getElementById("photoListCount");
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
  const cropRestoreOriginal = document.getElementById("cropRestoreOriginal");
  const cropApply = document.getElementById("cropApply");
  const frameExportModal = document.getElementById("frameExportModal");
  const frameExportCanvas = document.getElementById("frameExportCanvas");
  const frameExportMeta = document.getElementById("frameExportMeta");
  const frameExportScale = document.getElementById("frameExportScale");
  const frameExportFormat = document.getElementById("frameExportFormat");
  const frameExportQualityField = document.getElementById("frameExportQualityField");
  const frameExportQuality = document.getElementById("frameExportQuality");
  const frameExportQualityValue = document.getElementById("frameExportQualityValue");
  const frameExportSize = document.getElementById("frameExportSize");
  const frameExportStatus = document.getElementById("frameExportStatus");
  const frameExportClose = document.getElementById("frameExportClose");
  const frameExportCancel = document.getElementById("frameExportCancel");
  const frameExportApply = document.getElementById("frameExportApply");
  const exportModal = document.getElementById("exportModal");
  const exportModalClose = document.getElementById("exportModalClose");
  const exportModalCancel = document.getElementById("exportModalCancel");
  const exportModalConfirm = document.getElementById("exportModalConfirm");
  const exportModalSize = document.getElementById("exportModalSize");
  const exportModalStatus = document.getElementById("exportModalStatus");
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
    cropRequestGeneration: 0,
    frameExportState: null,
    reprocessGeneration: 0,
    manual135Columns: Number(columnsSelect.value) || 6,
    manualHalfColumns: Math.max(4, Number(columnsSelect.value) || 6),
    sortMode: document.querySelector("input[name='sortMode']:checked").value,
    sortRequestGeneration: 0,
    exportHydrationItems: null,
    exportCancelled: false,
    sourceCommitPromise: Promise.resolve(),
    isExporting: false,
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
  const PROCESS_SEARCH_TERMS = {
    "C-41": "彩色负片 彩负",
    BW: "黑白负片 黑白",
    "E-6": "反转片 正片",
    "ECN-2": "电影卷 电影胶片",
  };

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
    { id: "fujifilm-100", name: "Fujifilm 100", edgeText: "FUJIFILM 100", process: "C-41" },
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
    { id: "cinestill-bwxx", name: "CineStill bwXX", edgeText: "CINESTILL bwXX", process: "BW", sprocketsIn120: true },

    // Kodak Vision3 电影胶片
    { id: "kodak-vision3-500t-5219", name: "Kodak Vision3 500T (5219)", edgeText: "KODAK VISION3 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-500t-7219", name: "Kodak Vision3 500T (7219)", edgeText: "KODAK VISION3 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-250d-5207", name: "Kodak Vision3 250D (5207)", edgeText: "KODAK VISION3 250D", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-250d-7207", name: "Kodak Vision3 250D (7207)", edgeText: "KODAK VISION3 250D", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-200t-5213", name: "Kodak Vision3 200T (5213)", edgeText: "KODAK VISION3 200T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-200t-7213", name: "Kodak Vision3 200T (7213)", edgeText: "KODAK VISION3 200T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-160-7211", name: "Kodak Vision3 160 (7211)", edgeText: "KODAK VISION3 160", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-50d-5203", name: "Kodak Vision3 50D (5203)", edgeText: "KODAK VISION3 50D", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision3-50d-7203", name: "Kodak Vision3 50D (7203)", edgeText: "KODAK VISION3 50D", process: "ECN-2", sprocketsIn120: true },

    // Kodak Vision2 电影胶片
    { id: "kodak-vision2-500t-5218", name: "Kodak Vision2 500T (5218)", edgeText: "KODAK VISION2 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision2-500t-7218", name: "Kodak Vision2 500T (7218)", edgeText: "KODAK VISION2 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision2-250d-5205", name: "Kodak Vision2 250D (5205)", edgeText: "KODAK VISION2 250D", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-vision2-100t-7212", name: "Kodak Vision2 100T (7212)", edgeText: "KODAK VISION2 100T", process: "ECN-2", sprocketsIn120: true },

    // Kodak 其他电影胶片
    { id: "kodak-5247-250t", name: "Kodak 5247 250T", edgeText: "KODAK 5247 250T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-5287-200t", name: "Kodak 5287 200T", edgeText: "KODAK 5287 200T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-5293-500t", name: "Kodak 5293 500T", edgeText: "KODAK 5293 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-exr-500t-5279", name: "Kodak EXR 500T (5279)", edgeText: "KODAK EXR 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "kodak-exr-500t-7279", name: "Kodak EXR 500T (7279)", edgeText: "KODAK EXR 500T", process: "ECN-2", sprocketsIn120: true },

    // Fujifilm 电影胶片
    { id: "fujifilm-eterna-500t", name: "Fujifilm Eterna 500T", edgeText: "FUJI ETERNA 500T", process: "ECN-2", sprocketsIn120: true },
    { id: "fujifilm-eterna-250t", name: "Fujifilm Eterna 250T", edgeText: "FUJI ETERNA 250T", process: "ECN-2", sprocketsIn120: true },
    { id: "fujifilm-reala-500d", name: "Fujifilm Reala 500D", edgeText: "FUJI REALA 500D", process: "ECN-2", sprocketsIn120: true },
    { id: "fujifilm-f-64d", name: "Fujifilm F-64D", edgeText: "FUJI F-64D", process: "ECN-2", sprocketsIn120: true },

    // 其他电影胶片品牌
    { id: "ortwo-un54", name: "Orwo UN54 (NP20)", edgeText: "ORWO UN54", process: "BW", sprocketsIn120: true },
    { id: "ortwo-n74-plus", name: "Orwo N74 Plus", edgeText: "ORWO N74 PLUS", process: "BW", sprocketsIn120: true },
    { id: "silberra-p-an100-t", name: "Silberra P-A100-T", edgeText: "SILBERRA P-A100-T", process: "BW", sprocketsIn120: true },

    // Foma 黑白胶片
    { id: "fomapan-100", name: "Fomapan 100", edgeText: "FOMAPAN 100", process: "BW" },
    { id: "fomapan-200", name: "Fomapan 200", edgeText: "FOMAPAN 200", process: "BW" },
    { id: "fomapan-400", name: "FOMAPAN 400", edgeText: "FOMAPAN 400", process: "BW" },

    // 乐凯
    { id: "lucky-c200", name: "Lucky C200 乐凯彩色负片", edgeText: "LUCKY C200", process: "C-41" },
    { id: "lucky-c400", name: "Lucky C400 乐凯彩色负片", edgeText: "LUCKY C400", process: "C-41" },
    { id: "lucky-shd-100", name: "Lucky SHD 100 乐凯黑白", edgeText: "LUCKY SHD 100", process: "BW" },
    { id: "lucky-shd-400", name: "Lucky SHD 400 乐凯黑白", edgeText: "LUCKY SHD 400", process: "BW" },

    // Lomography
    { id: "lomography-color-400", name: "Lomography Color 400", edgeText: "LOMOGRAPHY COLOR 400", process: "C-41" },
    { id: "lomography-color-800", name: "Lomography Color 800", edgeText: "LOMOGRAPHY COLOR 800", process: "C-41" },

    // 其他
    { id: "kentmere-400", name: "Kentmere 400", edgeText: "KENTMERE 400", process: "BW" },
  ].map((stock) => ({ ...stock, builtin: true }));

  const FilmFrame135 = window.FilmFrame135;
  if (!FilmFrame135) throw new Error("FilmFrame135 renderer is unavailable.");
  const FilmFrame = window.FilmFrame;
  if (!FilmFrame) throw new Error("FilmFrame renderer is unavailable.");

  const DEFAULT_STOCK_ID = "kodak-portra-400";
  const STORAGE_STOCKS_KEY = "filmIndex.customStocks";
  const STORAGE_SELECTED_KEY = "filmIndex.selectedStock";

  // 可调渲染参数（均为相对"单张宽度"或所在分区的比例）。
  // 侧栏"高级设置"菜单内有滑块可实时调整。
  const TUNE = {
    ...FilmFrame135.DEFAULT_TUNE_135,
    fontSize120: 0.74, // 120 字号 / 边字带高度
    textOffsetY: 0.38, // 边字中线到胶片外缘的距离 / 边字带高度（真实底片边字几乎贴着片边）
    textSprocketGap: 0.022, // 齿孔带向边字方向收紧的距离 / frameW（越大边字与齿孔离得越近）
    textSprocketGap120: 0.015, // 120 齿孔带向边字方向收紧的距离 / 画幅高
    band120: 0.044, // 120 边字带高度 / 画幅高
    gap120: 0.085, // 120 帧间隙 / 画幅高
  };

  // 浏览器 canvas 尺寸安全上限（保守取值，超出后 toBlob 会得到 null）
  const MAX_CANVAS_SIDE = 16384;
  const MAX_CANVAS_AREA = 16384 * 16384;
  const EXPORT_TILE_SIDE = 8192;
  const PNG_MAX_DIMENSION = 0x7fffffff;

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

  const sortControls = Array.from(document.querySelectorAll("input[name='sortMode']"));
  const sortModeIndexes = { name: 0, time: 1, custom: 2 };

  function setSortMode(mode) {
    const nextMode = sortModeIndexes[mode] === undefined ? "name" : mode;
    state.sortMode = nextMode;
    const selected = sortControls.find((input) => input.value === nextMode);
    if (selected) selected.checked = true;
    if (sortSegmented) {
      sortSegmented.style.setProperty("--segment-index", String(sortModeIndexes[nextMode]));
    }
  }

  setSortMode(state.sortMode);

  sortControls.forEach((control) => {
    control.addEventListener("change", async (event) => {
      const nextMode = event.currentTarget.value;
      const previousMode = state.sortMode;
      if (nextMode === "time") {
        const requestGeneration = ++state.sortRequestGeneration;
        setSortMode(previousMode);
        sortControls.forEach((input) => { input.disabled = true; });
        const failures = await ensureAllOriginals([...state.items], "按拍摄时间排序");
        if (requestGeneration !== state.sortRequestGeneration) return;
        sortControls.forEach((input) => { input.disabled = false; });
        if (failures.length) {
          setSortMode(previousMode);
          showNotice(`无法读取 ${failures.length} 张原图，已保留原排序`);
          render();
          renderPhotoList();
          return;
        }
        setSortMode("time");
      } else {
        state.sortRequestGeneration += 1;
        sortControls.forEach((input) => { input.disabled = false; });
        setSortMode(nextMode);
      }
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
    imageInSprockets,
    imageInEdgeText,
    showLeader,
    columnsSelect,
    frameWidthInput,
    formatSelect,
    jpgQuality,
  ].forEach((control) => {
    control.addEventListener("input", scheduleRender);
    control.addEventListener("change", scheduleRender);
  });

  columnsSelect.addEventListener("change", () => {
    if (columnsSelect.disabled || is120Format() || is135WideFormat() || isCroppedHalfFrameMode()) return;
    if (isHalfFrameMode()) {
      state.manualHalfColumns = Math.max(4, Number(columnsSelect.value) || 6);
    } else {
      state.manual135Columns = Number(columnsSelect.value) || 6;
    }
  });

  frameAspect.addEventListener("change", handleFrameModeChange);
  wideSpecSelect.addEventListener("change", handleFrameModeChange);
  halfFrameModeInputs.forEach((control) => {
    control.addEventListener("change", handleFrameModeChange);
  });

  function updateExportFormatControls() {
    const fullResolution = exportScale.value === "full";
    if (fullResolution) formatSelect.value = "image/png";
    formatSelect.disabled = fullResolution;
    qualityField.style.display = !fullResolution && formatSelect.value === "image/jpeg" ? "grid" : "none";
  }

  function openExportModal() {
    if (state.isExporting) {
      showNotice("请先完成当前导出");
      return;
    }
    updateExportFormatControls();
    const items = getSortedItems();
    const isFullResolution = exportScale.value === "full";
    const scale = isFullResolution
      ? getFullResolutionScale(items)
      : clamp(Number(exportScale.value) || 1, 1, 3);
    if (Number.isFinite(scale) && scale > 0) {
      const options = getRenderOptions(scale);
      const layout = computeLayout(items.length, options);
      exportModalSize.textContent = `${layout.canvasW.toLocaleString()} × ${layout.canvasH.toLocaleString()} 像素`;
    } else {
      exportModalSize.textContent = "—";
    }
    exportModalStatus.textContent = "准备好后点击确认导出";
    exportModal.hidden = false;
    document.body.style.overflow = "hidden";
    exportModalClose.focus();
  }

  function closeExportModal() {
    exportModal.hidden = true;
    document.body.style.overflow = "";
  }

  exportScale.addEventListener("change", updateExportFormatControls);
  formatSelect.addEventListener("change", updateExportFormatControls);

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
    if (state.isExporting) {
      if (state.exportHydrationItems) {
        state.exportCancelled = true;
        cancelOriginalDownloads(state.exportHydrationItems);
      } else {
        state.exportCancelled = true;
        exportButton.disabled = true;
        exportButton.textContent = "正在取消...";
      }
      return;
    }
    openExportModal();
  });

  exportModalClose.addEventListener("click", closeExportModal);
  exportModalCancel.addEventListener("click", closeExportModal);
  exportModal.addEventListener("click", (event) => {
    if (event.target === exportModal || event.target.classList.contains("frame-export-backdrop")) {
      closeExportModal();
    }
  });
  exportModalConfirm.addEventListener("click", async () => {
    closeExportModal();
    await exportIndexImage();
  });

  clearButton.addEventListener("click", () => {
    if (state.isExporting) {
      showNotice("请先取消当前导出，再清空照片");
      return;
    }
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
    return state.frameRects.find((frame) =>
      frame.regions.some(
        (region) =>
          point.x >= region.x &&
          point.x <= region.x + region.w &&
          point.y >= region.y &&
          point.y <= region.y + region.h,
      ),
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
    const rowX = getRowX(layout, row, options);
    const frameStartX = rowX + options.stripPadX;
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
    state.items = getSortedItems();
    reverseSort.checked = false;
    state.sortRequestGeneration += 1;
    sortControls.forEach((input) => { input.disabled = false; });
    setSortMode("custom");
  }

  function isHalfFrameMode() {
    return Boolean(getFormat().half);
  }

  function is120Format() {
    return getFormat().family === "120";
  }

  function is135WideFormat() {
    const format = getFormat();
    return format.family === "135" && Boolean(format.wide);
  }

  function getHalfFrameInputMode() {
    return document.querySelector("input[name='halfFrameMode']:checked")?.value || "cropped";
  }

  function isCroppedHalfFrameMode() {
    return isHalfFrameMode() && getHalfFrameInputMode() === "cropped";
  }

  const FILM_135 = FilmFrame135.FILM_135;

  const WIDE_135_SPECS = {
    xpan: FilmFrame.FORMATS.xpan,
    "135-69": FilmFrame.FORMATS["135-69"],
  };

  const FORMATS = {
    "135": FilmFrame.FORMATS["135"],
    half: FilmFrame.FORMATS.half,
    wide: { family: "135", wide: true },
    "645": FilmFrame.FORMATS["645"],
    "66": FilmFrame.FORMATS["66"],
    "67": FilmFrame.FORMATS["67"],
    "69": FilmFrame.FORMATS["69"],
    "612": FilmFrame.FORMATS["612"],
    "617": FilmFrame.FORMATS["617"],
  };

  function getWide135SpecId() {
    if (WIDE_135_SPECS[frameAspect.value]) return frameAspect.value;
    return WIDE_135_SPECS[wideSpecSelect.value] ? wideSpecSelect.value : "xpan";
  }

  function getFormat() {
    const format = FORMATS[frameAspect.value];
    if (format?.wide || WIDE_135_SPECS[frameAspect.value]) {
      return { ...FORMATS.wide, ...WIDE_135_SPECS[getWide135SpecId()] };
    }
    return format || FORMATS["135"];
  }

  function get135WideCapacity(format) {
    const standardGapMm = 2;
    const rowWidthMm = 6 * FILM_135.standardImageWidthMm + 5 * standardGapMm;
    return Math.max(1, Math.floor((rowWidthMm + standardGapMm) / (format.imageWidthMm + standardGapMm)));
  }

  function updateFrameModeControls() {
    const halfFrame = isHalfFrameMode();
    const cropped = isCroppedHalfFrameMode();
    const format120 = is120Format();
    const wide135 = is135WideFormat();
    const format = getFormat();

    Array.from(columnsSelect.options).forEach((option) => {
      option.disabled = false;
    });
    wideSpecField.hidden = !wide135;
    if (WIDE_135_SPECS[frameAspect.value]) {
      wideSpecSelect.value = frameAspect.value;
      frameAspect.value = "wide";
    }
    halfFrameModeField.hidden = !halfFrame;
    if (cropped) {
      columnsSelect.disabled = true;
      columnsHint.textContent = "单张裁切固定每行 12 张（片头首行 10 张）";
      columnsHint.hidden = false;
    } else if (format120) {
      columnsSelect.value = String(format.columns);
      columnsSelect.disabled = true;
      columnsHint.textContent = `120 画幅固定每行 ${format.columns} 张`;
      columnsHint.hidden = false;
    } else if (wide135) {
      const capacity = get135WideCapacity(format);
      columnsSelect.value = String(capacity);
      columnsSelect.disabled = true;
      columnsHint.textContent = `135 宽幅按固定片条宽度自动每行 ${capacity} 张`;
      columnsHint.hidden = false;
    } else {
      columnsSelect.value = String(halfFrame ? state.manualHalfColumns : state.manual135Columns);
      columnsSelect.disabled = false;
      Array.from(columnsSelect.options).forEach((option) => {
        option.disabled = halfFrame && Number(option.value) < 4;
      });
      columnsHint.textContent = halfFrame ? "每个文件按一张包含两格的横向扫描图处理" : "";
      columnsHint.hidden = !halfFrame;
    }

    showLeader.disabled = format120;
    if (leaderHint) {
      leaderHint.textContent = format120 ? "120 胶片无片头片尾" : "";
      leaderHint.hidden = !format120;
    }

    const stock = resolveStock(getActiveStock());
    const sprocketsLocked = format120 && !stock.sprocketsIn120;
    showSprockets.disabled = sprocketsLocked;
    if (sprocketsHint) {
      sprocketsHint.textContent = sprocketsLocked
        ? "120 画幅默认无齿孔，仅电影卷（ECN-2）保留"
        : "";
      sprocketsHint.hidden = !sprocketsLocked;
    }

    imageInSprockets.disabled = !wide135;
    imageInEdgeText.disabled = !wide135;
    if (imageCoverageHint) {
      imageCoverageHint.textContent = wide135 ? "两个成像区域独立控制，仅改变曝光范围" : "仅适用于 135 宽幅";
      imageCoverageHint.hidden = wide135;
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

  updateExportFormatControls();
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
      sourceGeneration: 0,
      source: originalSource,
      width: originalSource.width,
      height: originalSource.height,
      name: file.name,
      modified: file.lastModified || 0,
      taken,
      thumbUrl: URL.createObjectURL(file),
      ownsThumbUrl: true,
    };
    await rebuildItemSource(item, item.editVersion);
    return item;
  }

  async function readRemotePreview(descriptor, blob) {
    const originalSource = await decodeImage(blob);
    const thumbUrl = URL.createObjectURL(blob);
    const item = {
      id: state.nextId++,
      file: null,
      originalSource,
      originalWidth: originalSource.width,
      originalHeight: originalSource.height,
      editSource: null,
      editWidth: originalSource.width,
      editHeight: originalSource.height,
      manualTurns: 0,
      autoTurns: 0,
      editVersion: 0,
      sourceGeneration: 0,
      source: originalSource,
      width: originalSource.width,
      height: originalSource.height,
      name: descriptor.filename,
      modified: Number(descriptor.server_mtime || 0) * 1000,
      taken: null,
      thumbUrl,
      ownsThumbUrl: true,
      remote: {
        descriptor,
        quality: "preview",
        hydrationPromise: null,
        abortController: null,
        revision: 0,
      },
    };
    await rebuildItemSource(item, item.editVersion);
    return item;
  }

  function mimeTypeForRemoteFile(descriptor, responseType) {
    const type = (responseType || "").split(";", 1)[0].trim().toLowerCase();
    if (/^image\/(jpeg|png|webp)$/.test(type)) return type;
    if (type && type !== "application/octet-stream") return null;
    const name = descriptor.filename.toLowerCase();
    if (/\.jpe?g$/.test(name)) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    return null;
  }

  function serializeSourceCommit(commit) {
    const queued = state.sourceCommitPromise.then(commit, commit);
    state.sourceCommitPromise = queued.catch(() => {});
    return queued;
  }

  async function ensureOriginal(item, reason = "操作") {
    if (!item.remote || item.remote.quality === "full") return item;
    if (item.remote.hydrationPromise) return item.remote.hydrationPromise;

    const remote = item.remote;
    const revision = remote.revision;
    const controller = new AbortController();
    remote.abortController = controller;
    remote.quality = "loading";
    renderPhotoList();

    remote.hydrationPromise = (async () => {
      let fullSource = null;
      try {
        const blob = await BaiduPanIntegration.downloadFile(remote.descriptor.fs_id, controller.signal);
        const mimeType = mimeTypeForRemoteFile(remote.descriptor, blob.type);
        if (!mimeType) throw new Error("不支持的图片格式");
        const file = new File([blob], remote.descriptor.filename, {
          type: mimeType,
          lastModified: Number(remote.descriptor.server_mtime || 0) * 1000,
        });
        const result = await Promise.all([
          decodeImage(file),
          readExifDate(file).catch(() => null),
        ]);
        fullSource = result[0];
        const taken = result[1];
        if (
          controller.signal.aborted ||
          remote.revision !== revision ||
          !state.items.includes(item)
        ) {
          closeSource(fullSource);
          throw new DOMException("Aborted", "AbortError");
        }

        await serializeSourceCommit(async () => {
          if (
            controller.signal.aborted ||
            remote.revision !== revision ||
            !state.items.includes(item)
          ) {
            throw new DOMException("Aborted", "AbortError");
          }
          const candidate = {
            ...item,
            file,
            originalSource: fullSource,
            originalWidth: fullSource.width,
            originalHeight: fullSource.height,
            editSource: null,
            editWidth: fullSource.width,
            editHeight: fullSource.height,
            source: fullSource,
            width: fullSource.width,
            height: fullSource.height,
            taken,
            editVersion: item.editVersion + 1,
          };
          let rebuilt = false;
          while (!rebuilt && !controller.signal.aborted) {
            rebuilt = await rebuildItemSource(candidate, candidate.editVersion);
          }
          if (
            !rebuilt ||
            controller.signal.aborted ||
            remote.revision !== revision ||
            !state.items.includes(item)
          ) {
            closeDistinctSources(candidate.source, fullSource);
            fullSource = null;
            throw new DOMException("Aborted", "AbortError");
          }

          const previewOriginal = item.originalSource;
          const previewSource = item.source;
          item.file = candidate.file;
          item.originalSource = candidate.originalSource;
          item.originalWidth = candidate.originalWidth;
          item.originalHeight = candidate.originalHeight;
          item.editSource = null;
          item.editWidth = candidate.editWidth;
          item.editHeight = candidate.editHeight;
          item.source = candidate.source;
          item.width = candidate.width;
          item.height = candidate.height;
          item.taken = candidate.taken;
          item.editVersion = candidate.editVersion;
          item.autoTurns = candidate.autoTurns;
          remote.quality = "full";
          fullSource = null;
          closeDistinctSources(previewSource, previewOriginal);
        });
        render();
        renderPhotoList();
        return item;
      } catch (error) {
        if (fullSource && item.originalSource !== fullSource) closeSource(fullSource);
        if (error.name !== "AbortError" && remote.revision === revision) {
          remote.quality = "error";
          renderPhotoList();
        } else if (remote.revision === revision && remote.quality !== "full") {
          remote.quality = "preview";
        }
        throw error;
      } finally {
        if (remote.revision === revision) {
          remote.hydrationPromise = null;
          remote.abortController = null;
        }
      }
    })();

    return remote.hydrationPromise;
  }

  async function ensureAllOriginals(items, reason) {
    const pending = items.filter((item) => item.remote && item.remote.quality !== "full");
    if (!pending.length) return [];
    const failures = [];
    let nextIndex = 0;
    let completed = 0;
    const worker = async () => {
      while (nextIndex < pending.length && !state.exportCancelled) {
        const item = pending[nextIndex++];
        try {
          await ensureOriginal(item, reason);
        } catch (error) {
          failures.push({ item, error });
        } finally {
          completed += 1;
          statusTitle.textContent = `${reason}：正在获取原图 ${completed}/${pending.length}`;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
    return failures;
  }

  function cancelOriginalDownloads(items = state.items) {
    items.forEach((item) => item.remote?.abortController?.abort());
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

  function getCurrentInputAdapter() {
    const format = getFormat();
    const formatId = isHalfFrameMode() ? "half" : format.id || frameAspect.value;
    return FilmFrame.getInputAdapter(formatId, getHalfFrameInputMode());
  }

  function targetPortraitMode() {
    return getCurrentInputAdapter().targetPortrait;
  }

  function getAutoTurnsForSource(source) {
    const portrait = targetPortraitMode();
    const matches = portrait ? source.height >= source.width : source.width >= source.height;
    return matches ? 0 : 1;
  }

  function mapRotatedCropToSource(x, y, width, height, sourceWidth, sourceHeight, turns) {
    switch (turns % 4) {
      case 1:
        return { x: y, y: sourceHeight - x - width, width: height, height: width };
      case 2:
        return {
          x: sourceWidth - x - width,
          y: sourceHeight - y - height,
          width,
          height,
        };
      case 3:
        return { x: sourceWidth - y - height, y: x, width: height, height: width };
      default:
        return { x, y, width, height };
    }
  }

  async function rebuildItemSource(item, editVersion) {
    const sourceGeneration = ++item.sourceGeneration;
    const base = item.editSource || item.originalSource;
    let candidate = base;
    const derived = [];
    const autoTurns = getAutoTurnsForSource(base);

    if (autoTurns) {
      candidate = await rotateSourceClockwise(candidate);
      derived.push(candidate);
    }

    for (let turn = 0; turn < item.manualTurns; turn += 1) {
      const next = await rotateSourceClockwise(candidate);
      if (candidate !== base) closeSource(candidate);
      candidate = next;
      derived.push(candidate);
    }

    const current =
      sourceGeneration === item.sourceGeneration &&
      editVersion === item.editVersion;
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
    await Promise.all(items.map((item) => rebuildItemSource(item, item.editVersion)));
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
    exportButton.disabled = state.isExporting && !state.exportHydrationItems;
    applyPreviewZoom();
  }

  function getFullResolutionScale(items) {
    const baseOptions = getRenderOptions(1);
    let scale = items.reduce((requiredScale, item) => {
      if (!Number.isFinite(item.width) || !Number.isFinite(item.height) || item.width <= 0 || item.height <= 0) {
        return requiredScale;
      }
      return Math.max(
        requiredScale,
        Math.min(item.width / baseOptions.slotW, item.height / baseOptions.slotH),
      );
    }, 1);

    // 部分画幅尺寸会取整；按 drawFrame 的 cover 规则复核，避免取整后仍缩小有效源像素。
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const options = getRenderOptions(scale);
      const correction = items.reduce((requiredCorrection, item) => {
        if (!Number.isFinite(item.width) || !Number.isFinite(item.height) || item.width <= 0 || item.height <= 0) {
          return requiredCorrection;
        }
        const coverScale = Math.max(options.slotW / item.width, options.slotH / item.height);
        return coverScale < 1 ? Math.max(requiredCorrection, 1 / coverScale) : requiredCorrection;
      }, 1);
      if (correction <= 1) break;
      scale *= correction * (1 + Number.EPSILON * 8);
    }

    return scale;
  }

  function makeCrc32Table() {
    return Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
  }

  const CRC32_TABLE = makeCrc32Table();
  const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const PNG_BAND_BYTES = 24 * 1024 * 1024;
  const MAX_STREAMED_PNG_BYTES = 1536 * 1024 * 1024;

  function updateCrc32(crc, bytes) {
    let value = crc;
    for (let index = 0; index < bytes.length; index += 1) {
      value = CRC32_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8);
    }
    return value;
  }

  function createPngChunk(type, data = new Uint8Array()) {
    const typeBytes = new TextEncoder().encode(type);
    const buffer = new ArrayBuffer(12 + data.length);
    const view = new DataView(buffer);
    view.setUint32(0, data.length, false);
    const bytes = new Uint8Array(buffer);
    bytes.set(typeBytes, 4);
    bytes.set(data, 8);
    let crc = updateCrc32(0xffffffff, typeBytes);
    crc = updateCrc32(crc, data);
    view.setUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0, false);
    return buffer;
  }

  function createPngHeader(width, height) {
    const data = new Uint8Array(13);
    const view = new DataView(data.buffer);
    view.setUint32(0, width, false);
    view.setUint32(4, height, false);
    data[8] = 8;
    data[9] = 2;
    data[10] = 0;
    data[11] = 0;
    data[12] = 0;
    return createPngChunk("IHDR", data);
  }

  function getPngBandHeight(width, remainingHeight) {
    const rowBytes = width * 3 + 1;
    return Math.max(1, Math.min(remainingHeight, Math.floor(PNG_BAND_BYTES / rowBytes)));
  }

  function copyTileToScanlines(imageData, scanlines, fullWidth, tileX, tileWidth, bandHeight) {
    const source = imageData.data;
    const rowStride = fullWidth * 3 + 1;
    for (let y = 0; y < bandHeight; y += 1) {
      let sourceOffset = y * tileWidth * 4;
      let targetOffset = y * rowStride + 1 + tileX * 3;
      for (let x = 0; x < tileWidth; x += 1) {
        scanlines[targetOffset] = source[sourceOffset];
        scanlines[targetOffset + 1] = source[sourceOffset + 1];
        scanlines[targetOffset + 2] = source[sourceOffset + 2];
        sourceOffset += 4;
        targetOffset += 3;
      }
    }
  }

  function applyPngPaethFilter(scanlines, width, height, previousRow = null) {
    const pixelBytes = width * 3;
    const rowStride = pixelBytes + 1;
    let prior = previousRow || new Uint8Array(pixelBytes);
    let current = new Uint8Array(pixelBytes);

    for (let y = 0; y < height; y += 1) {
      const rowStart = y * rowStride;
      current.set(scanlines.subarray(rowStart + 1, rowStart + rowStride));
      scanlines[rowStart] = 4;
      for (let x = 0; x < pixelBytes; x += 1) {
        const left = x >= 3 ? current[x - 3] : 0;
        const up = prior[x];
        const upLeft = x >= 3 ? prior[x - 3] : 0;
        scanlines[rowStart + 1 + x] =
          (current[x] - getPngPaethPredictor(left, up, upLeft)) & 0xff;
      }
      const swap = prior;
      prior = current;
      current = swap;
    }

    return prior;
  }

  function getPngPaethPredictor(left, up, upLeft) {
    const prediction = left + up - upLeft;
    const leftDistance = Math.abs(prediction - left);
    const upDistance = Math.abs(prediction - up);
    const upLeftDistance = Math.abs(prediction - upLeft);
    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
    return upDistance <= upLeftDistance ? up : upLeft;
  }

  async function renderPngBandRaw(items, options, layout, bandY, bandHeight) {
    const rowBytes = layout.canvasW * 3 + 1;
    const scanlines = new Uint8Array(rowBytes * bandHeight);
    const previousCanvas = activeCanvas;
    const previousCtx = ctx;
    for (let x = 0; x < layout.canvasW; x += EXPORT_TILE_SIDE) {
      if (state.exportCancelled) throw new DOMException("Export cancelled", "AbortError");
      const tileWidth = Math.min(EXPORT_TILE_SIDE, layout.canvasW - x);
      const canvas = document.createElement("canvas");
      const tileCtx = canvas.getContext("2d", { willReadFrequently: true });
      if (!tileCtx) throw new Error("Canvas 2D context unavailable");
      activeCanvas = canvas;
      ctx = tileCtx;
      try {
        drawLayout(items, options, layout, { x, y: bandY, width: tileWidth, height: bandHeight });
        const pixels = tileCtx.getImageData(0, 0, tileWidth, bandHeight);
        copyTileToScanlines(pixels, scanlines, layout.canvasW, x, tileWidth, bandHeight);
      } finally {
        activeCanvas = previousCanvas;
        ctx = previousCtx;
        canvas.width = 1;
        canvas.height = 1;
      }
    }
    return scanlines;
  }

  async function exportStreamedPng(items, options, layout, sizeLabel) {
    if (typeof CompressionStream !== "function") {
      throw new Error("PNG_STREAM_UNSUPPORTED");
    }
    if (
      layout.canvasW > PNG_MAX_DIMENSION ||
      layout.canvasH > PNG_MAX_DIMENSION ||
      !Number.isSafeInteger(layout.canvasW * layout.canvasH)
    ) {
      throw new Error("PNG_DIMENSIONS_TOO_LARGE");
    }

    const compression = new CompressionStream("deflate");
    const writer = compression.writable.getWriter();
    const reader = compression.readable.getReader();
    const pngParts = [PNG_SIGNATURE, createPngHeader(layout.canvasW, layout.canvasH)];
    let pngBytes = PNG_SIGNATURE.byteLength + 25;
    let previousRow = null;
    const consumeCompressed = (async () => {
      while (true) {
        if (state.exportCancelled) throw new DOMException("Export cancelled", "AbortError");
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = createPngChunk("IDAT", value);
        pngParts.push(chunk);
        pngBytes += chunk.byteLength;
        if (pngBytes > MAX_STREAMED_PNG_BYTES) throw new Error("PNG_FILE_TOO_LARGE");
      }
    })();

    exportButton.disabled = false;
    try {
      for (let y = 0; y < layout.canvasH;) {
        if (state.exportCancelled) throw new DOMException("Export cancelled", "AbortError");
        const bandHeight = getPngBandHeight(layout.canvasW, layout.canvasH - y);
        const percent = Math.floor((y / layout.canvasH) * 100);
        exportButton.textContent = `取消导出（${percent}%）`;
        statusTitle.textContent = `正在无损压缩原图级 PNG ${percent}%`;
        const scanlines = await renderPngBandRaw(items, options, layout, y, bandHeight);
        previousRow = applyPngPaethFilter(scanlines, layout.canvasW, bandHeight, previousRow);
        await writer.write(scanlines);
        y += bandHeight;
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      await writer.close();
      await consumeCompressed;
      if (state.exportCancelled) throw new DOMException("Export cancelled", "AbortError");
      pngParts.push(createPngChunk("IEND"));
      const blob = new Blob(pngParts, { type: "image/png" });
      if (blob.size > MAX_STREAMED_PNG_BYTES) throw new Error("PNG_FILE_TOO_LARGE");
      downloadBlob(blob, `film-index-${new Date().toISOString().slice(0, 10)}-full-resolution.png`);
      showNotice(`原图级索引图已拼接为一张 ${sizeLabel} 像素的 PNG`);
    } catch (error) {
      try {
        await writer.abort(error);
      } catch {}
      try {
        await reader.cancel(error);
      } catch {}
      throw error;
    }
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("CANVAS_ENCODING_FAILED"));
        }, mimeType, quality);
      } catch (error) {
        reject(error);
      }
    });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function getExportFailureMessage(stage, isFullResolution, sizeLabel) {
    if (!isFullResolution) {
      return stage === "draw"
        ? "导出失败：浏览器无法创建该尺寸画布，请降低输出质量或尺寸基准后重试"
        : "导出失败：浏览器无法编码该尺寸画布，请降低输出质量或尺寸基准";
    }
    return stage === "draw"
      ? `原图级导出失败：浏览器无法创建 ${sizeLabel} 像素的画布。请改用 3x、降低尺寸基准或减少照片数量后重试`
      : `原图级导出失败：浏览器无法编码 ${sizeLabel} 像素的画布。请改用 3x 或降低尺寸基准`;
  }

  function setSourceEditingLocked(locked) {
    frameAspect.disabled = locked;
    wideSpecSelect.disabled = locked || !is135WideFormat();
    halfFrameModeInputs.forEach((control) => {
      control.disabled = locked || frameAspect.value !== "half";
    });
  }

  async function exportIndexImage() {
    const originalButtonText = exportButton.textContent;
    const originalButtonDisabled = exportButton.disabled;
    state.isExporting = true;
    state.exportCancelled = false;
    setSourceEditingLocked(true);
    state.exportHydrationItems = [...state.items];
    exportButton.textContent = "取消原图下载";

    try {
      const failures = await ensureAllOriginals(state.exportHydrationItems, "导出准备");
      state.exportHydrationItems = null;
      if (failures.length) {
        const names = failures.slice(0, 3).map(({ item }) => item.name).join("、");
        showNotice(`导出已取消：${failures.length} 张原图获取失败${names ? `（${names}）` : ""}`);
        render();
        return;
      }
      if (state.items.some((item) => item.remote && item.remote.quality !== "full")) {
        showNotice("导出已取消：仍有照片未获取原图");
        render();
        return;
      }

      render();
      exportButton.textContent = "正在导出...";
      exportButton.disabled = true;
      const isFullResolution = exportScale.value === "full";
      const scale = isFullResolution
        ? getFullResolutionScale(state.items)
        : clamp(Number(exportScale.value) || 1, 1, 3);
      if (!Number.isFinite(scale) || scale <= 0) {
        showNotice("导出失败：无法计算有效的输出尺寸");
        return;
      }

      const options = getRenderOptions(scale);
      const layout = computeLayout(state.items.length, options);
      const sizeLabel = `${layout.canvasW.toLocaleString()} × ${layout.canvasH.toLocaleString()}`;

      const exceedsCanvasLimit =
        !Number.isFinite(layout.canvasW) ||
        !Number.isFinite(layout.canvasH) ||
        layout.canvasW <= 0 ||
        layout.canvasH <= 0 ||
        layout.canvasW > MAX_CANVAS_SIDE ||
        layout.canvasH > MAX_CANVAS_SIDE ||
        layout.canvasW * layout.canvasH > MAX_CANVAS_AREA;
      const items = getSortedItems();
      const mimeType = isFullResolution ? "image/png" : formatSelect.value;
      const quality = Number(jpgQuality.value) / 100;
      const extension = mimeType === "image/jpeg" ? "jpg" : "png";

      if (exceedsCanvasLimit) {
        if (!isFullResolution) {
          showNotice(`导出尺寸为 ${sizeLabel} 像素，超过浏览器画布上限，请降低输出质量或尺寸基准后重试`);
          return;
        }
        await exportStreamedPng(items, options, layout, sizeLabel);
        return;
      }

      const previousCanvas = activeCanvas;
      const previousCtx = ctx;
      let outputCanvas;

      try {
        outputCanvas = document.createElement("canvas");
        const outputCtx = outputCanvas.getContext("2d");
        if (!outputCtx) throw new Error("Canvas 2D context unavailable");
        activeCanvas = outputCanvas;
        ctx = outputCtx;
        drawLayout(items, options, layout);
      } catch (error) {
        console.error("导出画布绘制失败", error);
        showNotice(getExportFailureMessage("draw", isFullResolution, sizeLabel));
        return;
      } finally {
        activeCanvas = previousCanvas;
        ctx = previousCtx;
      }

      try {
        const blob = await canvasToBlob(outputCanvas, mimeType, quality);
        downloadBlob(blob, `film-index-${new Date().toISOString().slice(0, 10)}.${extension}`);
      } catch (error) {
        console.error("导出画布编码失败", error);
        showNotice(getExportFailureMessage("encode", isFullResolution, sizeLabel));
      }
    } catch (error) {
      if (error.name === "AbortError") {
        showNotice("原图级 PNG 导出已取消");
      } else if (error.message === "PNG_STREAM_UNSUPPORTED") {
        showNotice("当前浏览器不支持超大 PNG 流式编码，请改用最新版 Chrome、Edge 或 Firefox，或改用 3x 导出");
      } else if (error.message === "PNG_DIMENSIONS_TOO_LARGE" || error.message === "PNG_FILE_TOO_LARGE") {
        showNotice("原图级 PNG 尺寸或体积过大，请降低尺寸基准、减少照片或改用 3x 导出");
      } else {
        console.error("导出失败", error);
        showNotice("原图级 PNG 拼接失败，请降低尺寸基准、减少照片或改用 3x 后重试");
      }
    } finally {
      state.isExporting = false;
      state.exportCancelled = false;
      state.exportHydrationItems = null;
      setSourceEditingLocked(false);
      updateFrameModeControls();
      updateExportFormatControls();
      exportButton.textContent = originalButtonText;
      exportButton.disabled = originalButtonDisabled;
      render();
    }
  }

  function getRenderOptions(scale) {
    const baseFrameW = clamp(Number(frameWidthInput.value) || 420, 180, 1200) * scale;
    const format = getFormat();
    const ratio = format.ratio || 1.5;
    const is120 = format.family === "120";
    const isHalfFrame = isHalfFrameMode();
    const isCroppedHalfFrame = isCroppedHalfFrameMode();
    const isWide135 = format.family === "135" && Boolean(format.wide);
    const baseFrameH = Math.round(baseFrameW / 1.5);
    const pxPerMm135 = baseFrameW / FILM_135.standardImageWidthMm;
    const slotH = is120 ? Math.round(baseFrameW / ratio) : baseFrameH;
    const normalGap = is120
      ? Math.round(slotH * TUNE.gap120)
      : Math.max(10 * scale, Math.round(pxPerMm135 * 2));
    const selectedColumns = clamp(Number(columnsSelect.value) || 6, 2, 8);
    const normalSixFrameAreaW = 6 * baseFrameW + 5 * normalGap;
    const wideSlotW = Math.round(format.imageWidthMm * pxPerMm135);
    const slotW = isCroppedHalfFrame ? baseFrameW / 2 : isWide135 ? wideSlotW : baseFrameW;
    const slotCount = isCroppedHalfFrame
      ? 12
      : is120
        ? format.columns
        : isWide135
          ? Math.max(1, Math.floor((normalSixFrameAreaW + normalGap) / (slotW + normalGap)))
          : selectedColumns;
    const slotGap = isCroppedHalfFrame
      ? (normalSixFrameAreaW - slotCount * slotW) / (slotCount - 1)
      : normalGap;
    const frameAreaW = isWide135 || isCroppedHalfFrame
      ? normalSixFrameAreaW
      : slotCount * slotW + (slotCount - 1) * slotGap;

    const stock = resolveStock(getActiveStock());
    const hasEdgeText = showEdgeText.checked && Boolean(stock.edgeText);
    const showSprocketHoles = showSprockets.checked && (!is120 || stock.sprocketsIn120);

    let sprocketH;
    let textH;
    let textSprocketShift;
    let bandH;
    let stripPadX;
    let sprocketPitch;
    let sprocketHoleW;
    if (is120) {
      sprocketH = showSprocketHoles ? Math.round(slotH * 0.09) : 0;
      textH = Math.round(slotH * TUNE.band120);
      textSprocketShift = showSprocketHoles
        ? Math.min(Math.round(slotH * TUNE.textSprocketGap120), textH)
        : 0;
      bandH = Math.max(sprocketH + textH - textSprocketShift, Math.round(slotH * 0.02));
      stripPadX = Math.round(slotH * 0.05);
      sprocketPitch = slotH * (4.75 / 56);
      sprocketHoleW = Math.round(slotH * (2.8 / 56));
    } else {
      const minimumBandH = Math.round(pxPerMm135 * (FILM_135.filmHeightMm - FILM_135.imageHeightMm) / 2);
      textH = Math.round(baseFrameW * TUNE.textH);
      sprocketH = Math.round(baseFrameW * TUNE.sprocketH);
      textSprocketShift = Math.min(Math.round(baseFrameW * TUNE.textSprocketGap), textH);
      bandH = Math.max(sprocketH + textH - textSprocketShift, minimumBandH);
      stripPadX = Math.round(baseFrameW * 0.085);
      sprocketPitch = pxPerMm135 * FILM_135.sprocketPitchMm;
      sprocketHoleW = Math.round(baseFrameW * TUNE.holeW);
    }

    const leaderAdvance = isCroppedHalfFrame
      ? 2 * (slotW + slotGap)
      : baseFrameW + normalGap;
    const leaderCapacity = isCroppedHalfFrame
      ? 10
      : isWide135
        ? Math.max(1, Math.floor((frameAreaW - leaderAdvance + slotGap) / (slotW + slotGap)))
        : Math.max(1, slotCount - 1);
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
      normalCapacity: slotCount,
      leaderCapacity,
      frameAreaW,
      edgeMarkW: baseFrameW,
      edgeMarkGap: is120 ? normalGap : Math.max(0, pxPerMm135 * FILM_135.frameAdvanceMm - baseFrameW),
      edgeMarkSlotSpan: isCroppedHalfFrame ? 2 : 1,
      isHalfFrame,
      isCroppedHalfFrame,
      isWide135,
      is120,
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
      imageInSprockets: isWide135 && imageInSprockets.checked,
      imageInEdgeText: isWide135 && imageInEdgeText.checked,
      showLeader: showLeader.checked && !is120,
      leaderW: baseFrameW + normalGap,
      leaderAdvance,
      stock,
    };
  }

  function buildRows(itemCount, options) {
    const rows = [];
    let index = 0;
    let rowIdx = 0;
    do {
      const leader = options.showLeader && rowIdx === 0;
      const capacity = leader ? options.leaderCapacity : options.normalCapacity;
      const count = Math.min(capacity, itemCount - index);
      const contentWidth = count
        ? count * options.slotW + (count - 1) * options.slotGap
        : 0;
      const usedWidth = (leader ? options.leaderAdvance : 0) + contentWidth;
      rows.push({
        start: index,
        count,
        capacity,
        leader,
        trailer: false,
        trimmed: false,
        usedWidth,
        stripW: options.stripPadX * 2 + usedWidth,
      });
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

  function getRowX(layout, rowIndex, options) {
    if (!options.isWide135 || layout.rows.length < 2) return options.sheetPad;

    const firstRowOffset = layout.rows[1].stripW - layout.rows[0].stripW;
    const baseOffset = Math.max(0, -firstRowOffset);
    return options.sheetPad + baseOffset + (rowIndex === 0 ? firstRowOffset : 0);
  }

  function drawLayout(items, options, layout, tile = null) {
    const isPreview = activeCanvas === previewCanvas;
    const bounds = tile || { x: 0, y: 0, width: layout.canvasW, height: layout.canvasH };

    activeCanvas.width = bounds.width;
    activeCanvas.height = bounds.height;
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    ctx.save();
    ctx.translate(-bounds.x, -bounds.y);
    drawSheetBackground(layout.canvasW, layout.canvasH, bounds);

    if (isPreview) state.frameRects = [];

    layout.rows.forEach((rowInfo, row) => {
      const y = options.sheetPad + row * (layout.stripH + options.rowGap);
      const shadowPad = options.frameW * 0.08;
      if (y + layout.stripH + shadowPad < bounds.y || y - shadowPad > bounds.y + bounds.height) return;
      const rowItems = items.slice(rowInfo.start, rowInfo.start + rowInfo.count);
      const x = getRowX(layout, row, options);
      drawFilmRow(rowItems, rowInfo, x, y, layout, row, options, isPreview);
    });

    if (isPreview && state.dropIndex !== null) {
      drawDropIndicator(layout, options);
    }
    ctx.restore();
  }

  function drawIndex(items, options) {
    const layout = computeLayout(items.length, options);
    drawLayout(items, options, layout);
  }

  function drawSheetBackground(width, height, bounds = { x: 0, y: 0, width, height }) {
    ctx.fillStyle = "#f7f1e6";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.fillStyle = "rgba(45, 40, 32, 0.035)";
    const firstStripe = Math.ceil(bounds.y / 18) * 18;
    for (let y = firstStripe; y < bounds.y + bounds.height; y += 18) {
      ctx.fillRect(bounds.x, y, bounds.width, 1);
    }
  }

  function drawFilmRow(items, rowInfo, x, y, layout, rowIndex, options, isPreview) {
    const stripH = layout.stripH;
    // 宽幅每行在最后一帧后结束；其他格式保留原有末行截断规则
    const stripW = options.isWide135
      ? rowInfo.stripW
      : rowInfo.trimmed
        ? rowInfo.stripW
        : layout.stripW;

    FilmFrame135.beginStripSurface(
      ctx,
      x,
      y,
      stripW,
      stripH,
      { ...options, tune: TUNE },
      (_context, pathX, pathY, pathW, pathH) => buildStripPath(pathX, pathY, pathW, pathH, rowInfo, options),
    );

    if (rowInfo.leader) {
      drawLeaderZone(x, y, stripH, options);
    }

    const frameStartX = x + options.stripPadX;
    const contentStartX = getRowContentStartX(frameStartX, rowInfo, options);
    items.forEach((item, index) => {
      const frameX = getSlotX(contentStartX, index, options);
      const frameY = y + options.bandH;
      const geometry = drawFrame(item, frameX, frameY, options, isPreview);
      if (isPreview) {
        state.frameRects.push({
          id: item.id,
          regions: geometry.regions,
          bounds: geometry.bounds,
        });
      }
    });

    if (!rowInfo.trimmed) {
      for (let slot = rowInfo.count; slot < rowInfo.capacity; slot += 1) {
        const frameX = getSlotX(contentStartX, slot, options);
        const frameY = y + options.bandH;
        drawBlankFrame(frameX, frameY, options);
      }
    }

    if (options.showSprockets) {
      const topZoneY = y + options.textH - options.textSprocketShift;
      const bottomZoneY = y + stripH - options.textH - options.sprocketH + options.textSprocketShift;
      drawSprockets(x, bottomZoneY, stripW, options);
      if (rowInfo.leader) {
        const geo = leaderGeometry(x, y, stripH, options);
        drawSprockets(x, topZoneY, stripW, options, geo.footX);
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

    FilmFrame135.endStripSurface(
      ctx,
      x,
      y,
      stripW,
      stripH,
      { ...options, tune: TUNE },
      (_context, pathX, pathY, pathW, pathH) => buildStripPath(pathX, pathY, pathW, pathH, rowInfo, options),
    );
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

  // 片头舌几何参数：用于构造片舌轮廓，并过滤曲线边缘仅剩细碎露出的齿孔
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
      // 弧线与全高上缘的交点：舌区到此结束
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

  function getFrameExposureGeometry(x, y, options) {
    return FilmFrame135.getFrameExposureGeometry(x, y, options);
  }

  function addExposurePath(geometry, radius) {
    FilmFrame135.addExposurePath(ctx, geometry, radius);
  }

  function drawFrame(item, x, y, options, isPreview) {
    return FilmFrame135.drawFrame(ctx, item, x, y, options, {
      dragAlpha: isPreview && state.dragItemId === item.id ? 0.35 : 1,
    });
  }

  function drawBlankFrame(x, y, options) {
    return FilmFrame135.drawBlankFrame(ctx, x, y, options);
  }

  // 齿孔节距与孔宽由 getRenderOptions 按画幅派生（135 按孔距 4.75mm≈画幅宽 1/8；120 仅 ECN-2 电影卷可见）
  // 胶片条的外层 clip 负责轮廓裁切；片头可过滤在曲线边缘仅剩细碎露出的孔
  function drawSprockets(x, zoneY, stripW, options, leaderFootX = null) {
    FilmFrame135.drawSprockets(ctx, x, zoneY, stripW, { ...options, tune: TUNE }, leaderFootX);
  }

  function drawEdgeTextTop(x, zoneY, stripW, rowInfo, rowIndex, options) {
    FilmFrame135.drawEdgeTextTop(ctx, x, zoneY, stripW, rowInfo, rowIndex, { ...options, tune: TUNE });
  }

  function drawEdgeTextBottom(x, zoneY, stripW, rowInfo, options) {
    FilmFrame135.drawEdgeTextBottom(ctx, x, zoneY, stripW, rowInfo, { ...options, tune: TUNE });
  }

  // 120 上边字由共享单帧模块绘制，主应用只提供当前行的布局与上下文。
  function drawEdgeTextTop120(x, zoneY, stripW, rowInfo, options) {
    FilmFrame.drawEdgeTextTop120(ctx, x, zoneY, stripW, rowInfo, { ...options, tune: TUNE });
  }

  // 120 下边字与 DX 刻线同样委托共享实现，保证索引和单帧使用同一算法。
  function drawEdgeTextBottom120(x, zoneY, stripW, rowInfo, rowIndex, options) {
    FilmFrame.drawEdgeTextBottom120(ctx, x, zoneY, stripW, rowInfo, rowIndex, { ...options, tune: TUNE });
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
    const rowX = getRowX(layout, row, options);
    const frameStartX = rowX + options.stripPadX;
    const contentStartX = getRowContentStartX(frameStartX, rowInfo, options);
    const lineX = getSlotX(contentStartX, slot, options) - options.slotGap / 2;
    const frameY = options.sheetPad + row * (layout.stripH + options.rowGap) + options.bandH;
    const geometry = getFrameExposureGeometry(getSlotX(contentStartX, slot, options), frameY, options);
    const inset = Math.round(options.slotH * 0.06);

    ctx.save();
    ctx.shadowColor = "rgba(255, 176, 64, 0.9)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffb040";
    const lineW = Math.max(3, Math.round(options.frameW * 0.012));
    roundedRect(
      ctx,
      lineX - lineW / 2,
      geometry.bounds.y - inset,
      lineW,
      geometry.bounds.h + inset * 2,
      lineW / 2,
    );
    ctx.fill();
    ctx.restore();
  }

  function renderPhotoList() {
    const itemCount = state.items.length;
    photoListPanel.hidden = itemCount === 0;
    photoListCount.textContent = `${itemCount} 张`;
    if (!itemCount) photoListPanel.open = false;
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

      if (item.remote && item.remote.quality !== "full") {
        const status = document.createElement("span");
        status.className = `photo-quality photo-quality-${item.remote.quality}`;
        status.textContent = item.remote.quality === "loading"
          ? "下载中"
          : item.remote.quality === "error"
            ? "原图失败"
            : "低清";
        name.appendChild(status);
      }

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
    if (state.isExporting) {
      showNotice("请先取消当前导出，再移除照片");
      return;
    }
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    state.reprocessGeneration += 1;
    releaseItem(state.items[index]);
    state.items.splice(index, 1);
    render();
    renderPhotoList();
  }

  function releaseItem(item) {
    item.sourceGeneration += 1;
    if (item.remote) {
      item.remote.revision += 1;
      item.remote.abortController?.abort();
    }
    closeDistinctSources(item.source, item.editSource, item.originalSource);
    if (item.ownsThumbUrl !== false && item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
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
    FilmFrame135.roundedRect(context, x, y, width, height, radius);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function deterministicNoise(seed) {
    return FilmFrame135.deterministicNoise(seed);
  }

  // ---- 单帧片基导出：捕获当前索引设置，预览与下载共用同一渲染路径 ----

  function getCurrentSingleFrameFormatId() {
    if (isHalfFrameMode()) return "half";
    if (is135WideFormat()) return getWide135SpecId();
    return FilmFrame.FORMATS[frameAspect.value] ? frameAspect.value : "135";
  }

  function copyResolvedStock(stock) {
    return {
      ...stock,
      edgeInk: { ...stock.edgeInk },
      edgePresets: [...stock.edgePresets],
      edgePresets120: [...stock.edgePresets120],
    };
  }

  function createFrameExportSnapshot(itemId, opener) {
    const items = getSortedItems();
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex < 0) return null;
    const renderOptions = getRenderOptions(1);
    return {
      item: items[itemIndex],
      itemId,
      frameNumber: itemIndex + 1,
      editVersion: items[itemIndex].editVersion,
      formatId: getCurrentSingleFrameFormatId(),
      inputMode: getHalfFrameInputMode(),
      baseSlotW: renderOptions.slotW,
      baseSlotH: renderOptions.slotH,
      stock: copyResolvedStock(renderOptions.stock),
      showEdgeText: renderOptions.showEdgeText,
      showSprockets: renderOptions.showSprockets,
      imageInSprockets: renderOptions.imageInSprockets,
      imageInEdgeText: renderOptions.imageInEdgeText,
      tune: { ...TUNE },
      scale: "2",
      mimeType: "image/png",
      quality: 0.92,
      opener,
      busy: false,
      cancelled: false,
    };
  }

  function createFrameExportOptions(snapshot, scale) {
    return FilmFrame.createSingleFrameOptions({
      formatId: snapshot.formatId,
      inputMode: snapshot.inputMode,
      frameW: snapshot.baseSlotW * scale,
      stock: snapshot.stock,
      frameNumber: snapshot.frameNumber,
      edgeMarkStartIndex: snapshot.frameNumber - 1,
      showEdgeText: snapshot.showEdgeText,
      showSprockets: snapshot.showSprockets,
      imageInSprockets: snapshot.imageInSprockets,
      imageInEdgeText: snapshot.imageInEdgeText,
      tune: snapshot.tune,
    });
  }

  function getFrameExportFullScale(snapshot) {
    const item = snapshot.item;
    let scale = Math.max(1, Math.min(item.width / snapshot.baseSlotW, item.height / snapshot.baseSlotH));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const options = createFrameExportOptions(snapshot, scale);
      const coverScale = Math.max(options.slotW / item.width, options.slotH / item.height);
      if (coverScale >= 1) break;
      scale *= (1 / coverScale) * (1 + Number.EPSILON * 8);
    }
    return scale;
  }

  function getFrameExportScale(snapshot) {
    return snapshot.scale === "full"
      ? getFrameExportFullScale(snapshot)
      : clamp(Number(snapshot.scale) || 1, 1, 3);
  }

  function getFrameExportLayout(snapshot, scale = getFrameExportScale(snapshot)) {
    const options = createFrameExportOptions(snapshot, scale);
    const bounds = FilmFrame.getSingleFrameRenderBounds(options);
    return { options, bounds, scale };
  }

  function exceedsCanvasLimits(width, height) {
    return !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 ||
      width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE || width * height > MAX_CANVAS_AREA;
  }

  function renderFrameExportCanvas(snapshot, scale, mimeType, targetCanvas = null) {
    const { options, bounds } = getFrameExportLayout(snapshot, scale);
    if (exceedsCanvasLimits(bounds.width, bounds.height)) {
      const error = new Error("FRAME_EXPORT_CANVAS_LIMIT");
      error.width = bounds.width;
      error.height = bounds.height;
      throw error;
    }
    const canvas = targetCanvas || document.createElement("canvas");
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const outputCtx = canvas.getContext("2d");
    if (!outputCtx) throw new Error("Canvas 2D context unavailable");
    if (mimeType === "image/jpeg") {
      outputCtx.fillStyle = "#e3ddd1";
      outputCtx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      outputCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    FilmFrame.renderSingleFrameInBounds(outputCtx, snapshot.item, options, bounds);
    return { canvas, options, bounds };
  }

  function updateFrameExportControls() {
    const snapshot = state.frameExportState;
    if (!snapshot) return;
    snapshot.scale = frameExportScale.value;
    if (snapshot.scale === "full") {
      snapshot.mimeType = "image/png";
      frameExportFormat.value = "image/png";
      frameExportFormat.disabled = true;
    } else {
      frameExportFormat.disabled = false;
      snapshot.mimeType = frameExportFormat.value;
    }
    snapshot.quality = Number(frameExportQuality.value) / 100;
    frameExportQualityValue.value = `${frameExportQuality.value}%`;
    frameExportQualityField.hidden = snapshot.mimeType !== "image/jpeg";
    try {
      const { bounds } = getFrameExportLayout(snapshot);
      frameExportSize.textContent = `${bounds.width.toLocaleString()} × ${bounds.height.toLocaleString()} px`;
      frameExportStatus.textContent = exceedsCanvasLimits(bounds.width, bounds.height)
        ? "该尺寸超过浏览器画布上限，请改用 3x"
        : "使用当前裁切、旋转和片基设置";
      frameExportApply.disabled = exceedsCanvasLimits(bounds.width, bounds.height) || snapshot.busy;
    } catch (error) {
      frameExportSize.textContent = "无法计算输出尺寸";
      frameExportStatus.textContent = "请改用较低输出质量";
      frameExportApply.disabled = true;
    }
  }

  function drawFrameExportPreview() {
    const snapshot = state.frameExportState;
    if (!snapshot) return;
    try {
      const baseLayout = getFrameExportLayout(snapshot, 1);
      const previewScale = Math.min(1, 760 / baseLayout.bounds.width, 430 / baseLayout.bounds.height);
      renderFrameExportCanvas(snapshot, previewScale, "image/png", frameExportCanvas);
    } catch (error) {
      console.error("单帧预览绘制失败", error);
      frameExportStatus.textContent = "预览生成失败";
    }
  }

  function getFormatDisplayName(formatId, inputMode) {
    if (formatId === "half" && inputMode === "uncropped") return "135 半格完整扫描";
    return FilmFrame.getFormat(formatId).label;
  }

  function openFrameExportModal(itemId, opener) {
    if (state.isExporting) {
      showNotice("请先取消当前导出，再导出单帧");
      return;
    }
    const snapshot = createFrameExportSnapshot(itemId, opener);
    if (!snapshot) return;
    state.frameExportState = snapshot;
    frameExportScale.value = snapshot.scale;
    frameExportFormat.value = snapshot.mimeType;
    frameExportQuality.value = Math.round(snapshot.quality * 100);
    frameExportMeta.textContent = `第 ${snapshot.frameNumber} 帧 · ${getFormatDisplayName(snapshot.formatId, snapshot.inputMode)} · ${snapshot.stock.name} · ${snapshot.item.name}`;
    frameExportModal.hidden = false;
    document.body.style.overflow = "hidden";
    updateFrameExportControls();
    drawFrameExportPreview();
    frameExportClose.focus();
  }

  function closeFrameExportModal({ restoreFocus = true } = {}) {
    const snapshot = state.frameExportState;
    if (snapshot?.busy) {
      snapshot.cancelled = true;
      snapshot.item.remote?.abortController?.abort();
      frameExportStatus.textContent = "正在取消单帧导出…";
      return;
    }
    frameExportModal.hidden = true;
    document.body.style.overflow = "";
    state.frameExportState = null;
    if (restoreFocus) {
      const focusTarget = snapshot?.opener && !snapshot.opener.closest("[hidden]")
        ? snapshot.opener
        : previewCanvas;
      focusTarget.focus?.();
    }
  }

  function sanitizeExportBaseName(name) {
    const withoutExtension = String(name || "").replace(/\.[^.]+$/, "");
    return withoutExtension.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/[.\s]+$/g, "").trim() || "film-frame";
  }

  function getFrameExportFilename(snapshot, extension) {
    const number = String(snapshot.frameNumber).padStart(2, "0");
    return `${sanitizeExportBaseName(snapshot.item.name)}-frame-${number}-${snapshot.formatId}.${extension}`;
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
    frameMenu.querySelector("button")?.focus();
  }

  function hideFrameMenu({ restoreFocus = false } = {}) {
    frameMenu.hidden = true;
    state.contextItemId = null;
    if (restoreFocus) previewCanvas.focus?.();
  }

  frameMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const itemId = state.contextItemId;
      const opener = button;
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
        case "export-frame":
          openFrameExportModal(itemId, opener);
          break;
        case "delete":
          removeItem(itemId);
          break;
      }
    });
  });

  frameExportScale.addEventListener("change", () => {
    updateFrameExportControls();
    drawFrameExportPreview();
  });
  frameExportFormat.addEventListener("change", () => {
    updateFrameExportControls();
    drawFrameExportPreview();
  });
  frameExportQuality.addEventListener("input", updateFrameExportControls);
  frameExportClose.addEventListener("click", () => closeFrameExportModal());
  frameExportCancel.addEventListener("click", () => closeFrameExportModal());
  frameExportModal.addEventListener("click", (event) => {
    if (event.target === frameExportModal || event.target.classList.contains("frame-export-backdrop")) {
      closeFrameExportModal();
    }
  });

  frameExportApply.addEventListener("click", async () => {
    const snapshot = state.frameExportState;
    if (!snapshot || snapshot.busy || state.isExporting) return;
    const item = state.items.find((entry) => entry.id === snapshot.itemId);
    if (!item || item !== snapshot.item || item.editVersion !== snapshot.editVersion) {
      frameExportStatus.textContent = "图片状态已变化，请关闭后重新打开";
      return;
    }

    snapshot.busy = true;
    snapshot.cancelled = false;
    state.isExporting = true;
    setSourceEditingLocked(true);
    exportButton.disabled = true;
    frameExportApply.textContent = item.remote?.quality !== "full" ? "正在获取原图…" : "正在导出…";
    frameExportCancel.textContent = "取消导出";
    updateFrameExportControls();

    try {
      await ensureOriginal(item, "单帧导出");
      if (snapshot.cancelled) throw new DOMException("Aborted", "AbortError");
      if (!state.items.includes(item)) {
        throw new Error("FRAME_EXPORT_SOURCE_CHANGED");
      }
      snapshot.editVersion = item.editVersion;
      frameExportApply.textContent = "正在导出…";
      frameExportStatus.textContent = "正在绘制片基单帧";
      const scale = getFrameExportScale(snapshot);
      const layout = getFrameExportLayout(snapshot, scale);
      if (exceedsCanvasLimits(layout.bounds.width, layout.bounds.height)) {
        const error = new Error("FRAME_EXPORT_CANVAS_LIMIT");
        error.width = layout.bounds.width;
        error.height = layout.bounds.height;
        throw error;
      }
      if (snapshot.cancelled) throw new DOMException("Aborted", "AbortError");
      const { canvas } = renderFrameExportCanvas(snapshot, scale, snapshot.mimeType);
      if (snapshot.cancelled) throw new DOMException("Aborted", "AbortError");
      frameExportStatus.textContent = "正在编码图片";
      const blob = await canvasToBlob(canvas, snapshot.mimeType, snapshot.quality);
      if (snapshot.cancelled) throw new DOMException("Aborted", "AbortError");
      const extension = snapshot.mimeType === "image/jpeg" ? "jpg" : "png";
      downloadBlob(blob, getFrameExportFilename(snapshot, extension));
      showNotice(`已导出第 ${snapshot.frameNumber} 帧`);
      snapshot.busy = false;
      closeFrameExportModal();
    } catch (error) {
      snapshot.busy = false;
      if (error.name === "AbortError") {
        frameExportStatus.textContent = "单帧导出已取消";
      } else if (error.message === "FRAME_EXPORT_CANVAS_LIMIT") {
        const width = Math.ceil(error.width || 0).toLocaleString();
        const height = Math.ceil(error.height || 0).toLocaleString();
        frameExportStatus.textContent = `输出尺寸 ${width} × ${height} px 超过浏览器上限，请改用 3x`;
      } else if (error.message === "FRAME_EXPORT_SOURCE_CHANGED") {
        frameExportStatus.textContent = "图片状态已变化，请关闭后重新打开";
      } else {
        console.error("单帧导出失败", error);
        frameExportStatus.textContent = "单帧导出失败，请降低输出质量后重试";
      }
    } finally {
      state.isExporting = false;
      setSourceEditingLocked(false);
      updateFrameModeControls();
      updateExportFormatControls();
      exportButton.disabled = !state.items.length;
      frameExportApply.textContent = "导出单帧";
      frameExportCancel.textContent = "取消";
      if (state.frameExportState) {
        updateFrameExportControls();
        drawFrameExportPreview();
      }
      render();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!frameMenu.hidden) {
        event.preventDefault();
        hideFrameMenu({ restoreFocus: true });
      } else if (!exportModal.hidden) {
        event.preventDefault();
        closeExportModal();
      } else if (!frameExportModal.hidden) {
        event.preventDefault();
        closeFrameExportModal();
      } else if (!cropModal.hidden) {
        event.preventDefault();
        closeCropModal();
      }
      return;
    }
    if (event.key !== "Tab") return;
    if (!exportModal.hidden) {
      const focusable = Array.from(exportModal.querySelectorAll("button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (frameExportModal.hidden) return;
    const focusable = Array.from(frameExportModal.querySelectorAll("button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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

  async function openCropModal(itemId) {
    if (state.isExporting) {
      showNotice("请先取消当前导出，再裁切照片");
      return;
    }
    const requestGeneration = ++state.cropRequestGeneration;
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    try {
      await ensureOriginal(item, "裁切");
    } catch (error) {
      if (error.name !== "AbortError") showNotice(`无法获取 ${item.name} 的原图，暂不能裁切`);
      return;
    }
    if (
      requestGeneration !== state.cropRequestGeneration ||
      !state.items.includes(item)
    ) return;

    cropModal.hidden = false;
    document.body.style.overflow = "hidden";

    // 使用当前渲染源作为裁切基准，确保预览与主界面方向一致
    const cropSource = item.source;
    const sourceW = cropSource.width;
    const sourceH = cropSource.height;

    // 在 canvas 上绘制当前渲染源
    const maxW = 640;
    const maxH = 480;
    const scale = Math.min(1, maxW / sourceW, maxH / sourceH);
    const displayW = Math.round(sourceW * scale);
    const displayH = Math.round(sourceH * scale);

    cropCanvas.width = displayW;
    cropCanvas.height = displayH;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(cropSource, 0, 0, displayW, displayH);

    // 计算初始裁切区域，保持当前输入画幅比例和图片方向
    const slotRatio = getCurrentInputAdapter().slotRatio;
    const aspectRatio = sourceW >= sourceH
      ? Math.max(slotRatio, 1 / slotRatio)
      : Math.min(slotRatio, 1 / slotRatio);
    // 裁切基准图的画幅比
    const baseAspect = sourceW / sourceH;
    let cropW, cropH, cropX, cropY;

    // 如果裁切基准图的画幅已经接近目标画幅，初始裁切区域覆盖整张图
    // 否则按目标画幅计算初始区域
    const aspectDiff = Math.abs(baseAspect - aspectRatio);
    const isAlreadyMatching = aspectDiff < 0.05;

    if (isAlreadyMatching) {
      // 画幅已匹配，初始裁切区域覆盖整张图（留小边距）
      const margin = Math.min(displayW, displayH) * 0.02;
      cropW = displayW - Math.round(margin * 2);
      cropH = displayH - Math.round(margin * 2);
    } else if (aspectRatio >= 1) {
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
      cropSource,
      sourceW,
      sourceH,
      baseSource: item.editSource || item.originalSource,
      sourceTurns: (item.autoTurns + item.manualTurns) % 4,
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

  function closeCropModal(cropState = null) {
    if (cropState && state.cropState !== cropState) return;
    state.cropRequestGeneration += 1;
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
      pointerId: event.pointerId,
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
      if (
        !state.cropState ||
        !state.cropState.drag ||
        e.pointerId !== state.cropState.drag.pointerId
      ) return;
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

    const onEnd = (e) => {
      if (e.pointerId !== event.pointerId) return;
      if (state.cropState) state.cropState.drag = null;
      // 延迟清除拖拽标志,避免 pointerup 后的 click 事件触发关闭
      setTimeout(() => {
        if (state.cropState) {
          state.cropState.isDragging = false;
        }
      }, 10);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  });

  cropClose.addEventListener("click", () => closeCropModal());
  cropCancel.addEventListener("click", () => closeCropModal());
  cropReset.addEventListener("click", () => {
    if (!state.cropState) return;
    // 恢复到初始裁剪区域
    state.cropState.cropX = state.cropState.initialCropX;
    state.cropState.cropY = state.cropState.initialCropY;
    state.cropState.cropW = state.cropState.initialCropW;
    state.cropState.cropH = state.cropState.initialCropH;
    updateCropOverlay();
  });

  // 恢复原图：丢弃所有裁切，回到导入时的原始状态
  cropRestoreOriginal.addEventListener("click", async () => {
    if (state.isExporting) {
      showNotice("请先取消当前导出，再恢复照片");
      return;
    }
    if (!state.cropState) return;
    const { itemId, editVersion } = state.cropState;
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || item.editVersion !== editVersion) {
      closeCropModal();
      showNotice("图片状态已变化，请重新打开裁切工具");
      return;
    }

    // 如果没有裁切过，无需恢复
    if (!item.editSource) {
      showNotice("该图片尚未裁切");
      return;
    }

    // 释放旧的 editSource 和 renderSource
    const oldEditSource = item.editSource;
    const oldRenderSource = item.source;

    // 重置为原图
    item.editSource = null;
    item.editWidth = item.originalWidth;
    item.editHeight = item.originalHeight;
    item.manualTurns = 0;
    item.editVersion += 1;
    const rebuildVersion = item.editVersion;

    closeCropModal(state.cropState);
    const rebuilt = await rebuildItemSource(item, rebuildVersion);
    if (!rebuilt) return;

    // 释放旧资源
    if (
      oldEditSource &&
      oldEditSource !== oldRenderSource &&
      oldEditSource !== item.originalSource &&
      oldEditSource !== item.source
    ) {
      closeSource(oldEditSource);
    }

    render();
    renderPhotoList();
    showNotice("已恢复原图");
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
    if (state.isExporting) {
      showNotice("请先取消当前导出，再应用裁切");
      return;
    }
    if (!state.cropState) return;
    const cropState = state.cropState;
    const {
      itemId,
      displayW,
      displayH,
      cropX,
      cropY,
      cropW,
      cropH,
      cropSource,
      sourceW,
      sourceH,
      baseSource,
      sourceTurns,
      editVersion,
    } = cropState;
    const item = state.items.find((entry) => entry.id === itemId);
    if (
      !item ||
      item.editVersion !== editVersion ||
      state.cropState !== cropState ||
      item.source !== cropSource ||
      (item.editSource || item.originalSource) !== baseSource
    ) {
      closeCropModal();
      showNotice("图片状态已变化，请重新打开裁切工具");
      return;
    }

    const renderedX = clamp(Math.floor(cropX * sourceW / displayW), 0, sourceW - 1);
    const renderedY = clamp(Math.floor(cropY * sourceH / displayH), 0, sourceH - 1);
    const renderedRight = clamp(
      Math.ceil((cropX + cropW) * sourceW / displayW),
      renderedX + 1,
      sourceW,
    );
    const renderedBottom = clamp(
      Math.ceil((cropY + cropH) * sourceH / displayH),
      renderedY + 1,
      sourceH,
    );
    const sourceCrop = mapRotatedCropToSource(
      renderedX,
      renderedY,
      renderedRight - renderedX,
      renderedBottom - renderedY,
      baseSource.width,
      baseSource.height,
      sourceTurns,
    );
    const canvas = document.createElement("canvas");
    canvas.width = sourceCrop.width;
    canvas.height = sourceCrop.height;
    const cropCtx = canvas.getContext("2d");
    cropCtx.drawImage(
      baseSource,
      sourceCrop.x,
      sourceCrop.y,
      sourceCrop.width,
      sourceCrop.height,
      0,
      0,
      sourceCrop.width,
      sourceCrop.height,
    );
    const newEditSource = await canvasToSource(canvas);

    if (
      !item ||
      item.editVersion !== editVersion ||
      state.cropState !== cropState ||
      item.source !== cropSource ||
      (item.editSource || item.originalSource) !== baseSource
    ) {
      closeSource(newEditSource);
      closeCropModal(cropState);
      showNotice("图片状态已变化，请重新打开裁切工具");
      return;
    }

    const oldEditSource = item.editSource;
    const oldRenderSource = item.source;
    item.editSource = newEditSource;
    item.editWidth = newEditSource.width;
    item.editHeight = newEditSource.height;
    item.editVersion += 1;
    const rebuildVersion = item.editVersion;
    const rebuilt = await rebuildItemSource(item, rebuildVersion);
    if (!rebuilt) {
      if (item.editSource !== newEditSource) closeSource(newEditSource);
      return;
    }
    if (
      oldEditSource &&
      oldEditSource !== oldRenderSource &&
      oldEditSource !== item.originalSource &&
      oldEditSource !== item.source
    ) {
      closeSource(oldEditSource);
    }

    closeCropModal(cropState);
    render();
    renderPhotoList();
    showNotice("已应用裁切");
  });

  // ---- 旋转图片：顺时针 90 度 ----

  async function rotateItem(itemId) {
    if (state.isExporting) {
      showNotice("请先取消当前导出，再旋转照片");
      return;
    }
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    try {
      await ensureOriginal(item, "旋转");
    } catch (error) {
      if (error.name !== "AbortError") showNotice(`无法获取 ${item.name} 的原图，暂不能旋转`);
      return;
    }
    item.manualTurns = (item.manualTurns + 1) % 4;
    item.editVersion += 1;
    const rebuilt = await rebuildItemSource(item, item.editVersion);
    if (!rebuilt) return;
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
    if (state.isExporting) {
      showNotice("请先取消当前导出，再导入照片");
      return;
    }
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
    const selected = localStorage.getItem(STORAGE_SELECTED_KEY);
    const remappedIds = new Map();
    let stocksChanged = false;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_STOCKS_KEY) || "[]");
      if (Array.isArray(parsed)) {
        const seen = new Set(BUILTIN_STOCKS.map((stock) => stock.id));
        parsed.forEach((raw) => {
          const stock = sanitizeStock(raw);
          if (!stock) return;
          if (seen.has(stock.id)) {
            const previousId = stock.id;
            stock.id = makeStockId(stock.name);
            if (!remappedIds.has(previousId)) remappedIds.set(previousId, stock.id);
            stocksChanged = true;
          }
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
      stocksChanged = true;
    }

    const migratedSelected = remappedIds.get(selected) || selected;
    state.stockId = findStock(migratedSelected) ? migratedSelected : DEFAULT_STOCK_ID;
    if (stocksChanged || migratedSelected !== selected) {
      try {
        localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(state.customStocks));
        localStorage.setItem(STORAGE_SELECTED_KEY, state.stockId);
      } catch (error) {
        // 忽略存储错误
      }
    }
  }

  function persistStocks() {
    try {
      localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(state.customStocks));
      localStorage.setItem(STORAGE_SELECTED_KEY, state.stockId);
    } catch (error) {
      showNotice("型号保存失败：浏览器本地存储不可用");
    }
  }

  function normalizeStockSearch(value) {
    return String(value || "").trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
  }

  function stockMatchesSearch(stock, query) {
    if (!query) return true;
    const searchable = normalizeStockSearch(
      [stock.name, stock.edgeText, stock.process, PROCESS_SEARCH_TERMS[stock.process]].join(" "),
    );
    return query.split(" ").every((term) => searchable.includes(term));
  }

  function appendStockGroup(label, stocks) {
    if (!stocks.length) return;
    const group = document.createElement("optgroup");
    group.label = label;
    stocks.forEach((stock) => group.appendChild(stockOption(stock)));
    stockSelect.appendChild(group);
  }

  function renderStockSelect() {
    const query = normalizeStockSearch(stockSearch.value);
    const activeStock = getActiveStock();
    const builtinMatches = BUILTIN_STOCKS.filter((stock) => stockMatchesSearch(stock, query));
    const customMatches = state.customStocks.filter((stock) => stockMatchesSearch(stock, query));
    const matchedCount = builtinMatches.length + customMatches.length;
    const activeMatches = stockMatchesSearch(activeStock, query);

    stockSelect.innerHTML = "";
    if (query && !activeMatches) appendStockGroup("当前选择", [activeStock]);
    appendStockGroup("内置型号", builtinMatches);
    appendStockGroup("自定义型号", customMatches);

    stockSelect.value = activeStock.id;
    stockSearchStatus.classList.toggle("is-empty", Boolean(query) && matchedCount === 0);
    if (!query) {
      stockSearchStatus.textContent = `显示全部 ${getAllStocks().length} 个型号`;
    } else if (matchedCount === 0) {
      stockSearchStatus.textContent = "未找到匹配型号，已保留当前选择";
    } else {
      stockSearchStatus.textContent = activeMatches
        ? `找到 ${matchedCount} 个型号`
        : `找到 ${matchedCount} 个型号，已保留当前选择`;
    }
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

    stockSearch.addEventListener("input", renderStockSelect);

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
      { key: "band120", label: "120边字带高度 (×画幅高)", min: 0.02, max: 0.1, step: 0.002 },
      { key: "gap120", label: "120帧间隙 (×画幅高)", min: 0.03, max: 0.15, step: 0.002 },
      { key: "fontSize", label: "字号 (×边字带)", min: 0.4, max: 1.2, step: 0.02 },
      { key: "fontSize120", label: "120字号 (×边字带)", min: 0.4, max: 1.2, step: 0.02 },
      { key: "textOffsetY", label: "边字到片边距离 (×边字带)", min: 0.2, max: 0.8, step: 0.02 },
      { key: "textSprocketGap", label: "齿孔向边字收紧 (×frameW)", min: 0, max: 0.05, step: 0.002 },
      { key: "textSprocketGap120", label: "120齿孔向边字收紧 (×画幅高)", min: 0, max: 0.05, step: 0.002 },
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

  // ---- 百度网盘集成 ----
  const API_BASE = (typeof BAIDU_PAN_API !== 'undefined')
    ? BAIDU_PAN_API
    : 'https://film-index-baidu-pan.1946378724.workers.dev';

  const BaiduPanIntegration = {
    isLoggedIn: false,
    currentPath: '/',
    selectedEntries: new Map(),
    currentDirectoryEntries: new Map(),
    browserModal: null,
    directoryRequestId: 0,
    directoryAbortController: null,
    previewAbortController: null,

    /** 检查登录状态 */
    async checkAuthStatus() {
      try {
        const res = await fetch(`${API_BASE}/status`, {
          credentials: 'include'
        });
        const data = await res.json();
        this.isLoggedIn = data.logged_in;
        return data;
      } catch (e) {
        this.isLoggedIn = false;
        return { logged_in: false, error: e.message };
      }
    },

    /** 发起登录 */
    login() {
      window.location.href = `${API_BASE}/auth?t=${Date.now()}`;
    },

    /** 登出 */
    async logout() {
      try {
        await fetch(`${API_BASE}/logout`, {
          credentials: 'include'
        });
        this.isLoggedIn = false;
      } catch (e) {
        console.error('Logout error:', e);
      }
    },

    /** 获取文件列表 */
    async listFiles(path = '/', signal) {
      const res = await fetch(
        `${API_BASE}/files?path=${encodeURIComponent(path)}`,
        { credentials: 'include', signal }
      );
      if (!res.ok) {
        let data = null;
        try {
          data = await res.json();
        } catch (error) {}
        if (data?.code === 'NOT_AUTHENTICATED' || data?.code === 'BAIDU_AUTH_EXPIRED') {
          this.isLoggedIn = false;
        }
        throw new Error(data?.error || `无法读取文件列表 (${res.status})`);
      }
      return res.json();
    },

    async responseError(response, fallback) {
      try {
        const data = await response.json();
        return data.error || fallback;
      } catch (error) {
        return `${fallback} (${response.status})`;
      }
    },

    async fetchThumbnail(url, signal) {
      const res = await fetch(url, { credentials: 'include', signal });
      if (!res.ok) throw new Error(await this.responseError(res, '缩略图加载失败'));
      const blob = await res.blob();
      if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) throw new Error('缩略图格式无效');
      return blob;
    },

    /** 下载文件 */
    async downloadFile(fsId, signal) {
      const res = await fetch(
        `${API_BASE}/download?fs_id=${encodeURIComponent(fsId)}`,
        { credentials: 'include', signal }
      );
      if (!res.ok) throw new Error(await this.responseError(res, '原图下载失败'));
      return res.blob();
    },

    /** 打开文件浏览器弹窗 */
    async openBrowser() {
      if (!this.isLoggedIn) {
        const ok = confirm('需要登录百度网盘账号才能导入照片。\n点击确定前往百度授权页面。');
        if (ok) this.login();
        return;
      }

      this.currentPath = '/';
      this.selectedEntries = new Map();
      this.currentDirectoryEntries = new Map();
      this.showBrowserModal();
      await this.loadDirectory('/');
    },

    /** 显示文件浏览器弹窗 */
    showBrowserModal() {
      if (!this.browserModal) {
        this.createBrowserModal();
      }
      this.browserModal.hidden = false;
    },

    /** 创建文件浏览器弹窗 DOM */
    createBrowserModal() {
      const modal = document.createElement('div');
      modal.className = 'baidu-pan-modal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="baidu-pan-backdrop"></div>
        <div class="baidu-pan-container">
          <div class="baidu-pan-header">
            <h3>从百度网盘导入</h3>
            <div class="baidu-pan-header-actions">
              <button type="button" class="text-button baidu-pan-refresh" title="刷新">↻</button>
              <button type="button" class="baidu-pan-close" aria-label="关闭">×</button>
            </div>
          </div>
          <div class="baidu-pan-toolbar">
            <button type="button" class="text-button baidu-pan-up" aria-label="返回上一级" disabled>←</button>
            <nav class="baidu-pan-breadcrumb" id="baiduPanPath" aria-label="百度网盘路径"></nav>
            <label class="baidu-pan-select-all">
              <input type="checkbox" id="baiduPanSelectAll" disabled />
              <span>全选</span>
            </label>
          </div>
          <div class="baidu-pan-body">
            <div class="baidu-pan-loading">加载中...</div>
            <div class="baidu-pan-empty" hidden>此目录为空</div>
            <div class="baidu-pan-error" hidden></div>
            <div class="baidu-pan-grid" id="baiduPanGrid"></div>
          </div>
          <div class="baidu-pan-footer">
            <span class="baidu-pan-selected">已选择 0 张照片</span>
            <div class="baidu-pan-footer-actions">
              <button type="button" class="text-button" id="baiduPanCancel">取消</button>
              <button type="button" class="primary-button" id="baiduPanImport" disabled>导入选中照片</button>
            </div>
          </div>
        </div>
      `;

      // 事件绑定
      modal.querySelector('.baidu-pan-close').addEventListener('click', () => {
        this.closeBrowser();
      });
      modal.querySelector('#baiduPanCancel').addEventListener('click', () => {
        this.closeBrowser();
      });
      modal.querySelector('.baidu-pan-refresh').addEventListener('click', () => {
        this.loadDirectory(this.currentPath);
      });
      modal.querySelector('.baidu-pan-up').addEventListener('click', () => {
        this.loadDirectory(this.parentPath(this.currentPath));
      });
      modal.querySelector('#baiduPanSelectAll').addEventListener('change', (event) => {
        const shouldSelect = event.currentTarget.checked;
        this.currentDirectoryEntries.forEach((entry, fsId) => {
          if (shouldSelect) {
            this.selectedEntries.set(fsId, entry);
          } else {
            this.selectedEntries.delete(fsId);
          }
        });
        this.syncRenderedSelection();
        this.updateSelectedCount();
      });
      modal.querySelector('#baiduPanImport').addEventListener('click', () => {
        this.importSelected();
      });

      document.body.appendChild(modal);
      this.browserModal = modal;

      // 点击背景关闭
      modal.querySelector('.baidu-pan-backdrop').addEventListener('click', () => {
        this.closeBrowser();
      });
    },

    normalizePath(path) {
      const parts = String(path || '/').split('/').filter(Boolean);
      return parts.length ? `/${parts.join('/')}` : '/';
    },

    parentPath(path) {
      const parts = this.normalizePath(path).split('/').filter(Boolean);
      parts.pop();
      return parts.length ? `/${parts.join('/')}` : '/';
    },

    renderBreadcrumb(path) {
      const normalized = this.normalizePath(path);
      const nav = this.browserModal.querySelector('#baiduPanPath');
      const up = this.browserModal.querySelector('.baidu-pan-up');
      nav.innerHTML = '';
      const parts = normalized.split('/').filter(Boolean);
      const segments = [{ label: '网盘', path: '/' }];
      let current = '';
      parts.forEach((part) => {
        current += `/${part}`;
        segments.push({ label: part, path: current });
      });
      segments.forEach((segment, index) => {
        if (index > 0) {
          const separator = document.createElement('span');
          separator.className = 'baidu-pan-breadcrumb-separator';
          separator.textContent = '/';
          nav.appendChild(separator);
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'baidu-pan-breadcrumb-segment';
        button.textContent = segment.label;
        if (segment.path === normalized) {
          button.disabled = true;
          button.setAttribute('aria-current', 'page');
        } else {
          button.addEventListener('click', () => this.loadDirectory(segment.path));
        }
        nav.appendChild(button);
      });
      up.disabled = normalized === '/';
    },

    /** 加载目录 */
    async loadDirectory(path) {
      const normalizedPath = this.normalizePath(path);
      const requestId = ++this.directoryRequestId;
      this.directoryAbortController?.abort();
      const controller = new AbortController();
      this.directoryAbortController = controller;
      const grid = this.browserModal.querySelector('#baiduPanGrid');
      const loading = this.browserModal.querySelector('.baidu-pan-loading');
      const empty = this.browserModal.querySelector('.baidu-pan-empty');
      const error = this.browserModal.querySelector('.baidu-pan-error');

      loading.hidden = false;
      empty.hidden = true;
      empty.textContent = '此目录为空';
      error.hidden = true;

      try {
        const data = await this.listFiles(normalizedPath, controller.signal);
        if (requestId !== this.directoryRequestId) return;
        loading.hidden = true;
        grid.innerHTML = '';
        this.currentPath = this.normalizePath(data.path || normalizedPath);
        this.renderBreadcrumb(this.currentPath);
        this.currentDirectoryEntries = new Map();

        if (!data.files || data.files.length === 0) {
          empty.hidden = false;
          this.updateSelectedCount();
          return;
        }

        const dirs = data.files.filter(f => f.is_dir);
        const images = data.files.filter(f => !f.is_dir && f.is_image);
        images.forEach((file) => this.currentDirectoryEntries.set(String(file.fs_id), file));

        if (dirs.length === 0 && images.length === 0) {
          empty.textContent = '此目录没有可导入的图片';
          empty.hidden = false;
          this.updateSelectedCount();
          return;
        }

        dirs.forEach(dir => grid.appendChild(this.createGridItem(dir, true)));
        images.forEach(img => grid.appendChild(this.createGridItem(img, false)));
        this.updateSelectedCount();
      } catch (e) {
        if (e.name === 'AbortError' || requestId !== this.directoryRequestId) return;
        loading.hidden = true;
        error.hidden = false;
        error.textContent = `加载失败: ${e.message}`;
      }
    },

    /** 创建网格项 */
    createGridItem(file, isDir) {
      const item = document.createElement('div');
      item.className = 'baidu-pan-item';

      const preview = document.createElement('div');
      preview.className = 'baidu-pan-item-preview';

      const fallback = document.createElement('div');
      fallback.className = 'baidu-pan-item-icon';
      fallback.textContent = isDir ? '📁' : '🖼';
      preview.appendChild(fallback);

      const name = document.createElement('div');
      name.className = 'baidu-pan-item-name';
      name.textContent = file.filename;
      name.title = file.filename;

      if (isDir) {
        item.classList.add('baidu-pan-dir');
        item.appendChild(preview);
        item.appendChild(name);
        item.addEventListener('click', () => {
          this.loadDirectory(file.path);
        });
        return item;
      }

      const fsId = String(file.fs_id);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'baidu-pan-item-checkbox';
      checkbox.setAttribute('aria-label', `选择 ${file.filename}`);

      if (file.thumbnail_url) {
        const thumbnail = document.createElement('img');
        thumbnail.className = 'baidu-pan-item-thumbnail';
        thumbnail.crossOrigin = 'use-credentials';
        thumbnail.src = file.thumbnail_url;
        thumbnail.alt = '';
        thumbnail.loading = 'lazy';
        thumbnail.addEventListener('error', () => {
          thumbnail.remove();
          fallback.textContent = '缩略图加载失败';
          fallback.classList.add('baidu-pan-thumbnail-error');
        }, { once: true });
        preview.appendChild(thumbnail);
      }

      item.dataset.fsId = fsId;
      item.setAttribute('aria-selected', 'false');
      item.appendChild(checkbox);
      item.appendChild(preview);
      item.appendChild(name);

      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener('change', () => {
        this.setFileSelection(fsId, checkbox.checked, file, item, checkbox);
      });
      item.addEventListener('click', () => {
        this.setFileSelection(fsId, !this.selectedEntries.has(fsId), file, item, checkbox);
      });

      this.setFileSelection(fsId, this.selectedEntries.has(fsId), file, item, checkbox, false);
      return item;
    },

    /** 设置单个文件的选择状态 */
    setFileSelection(fsId, selected, file, item, checkbox, updateCount = true) {
      if (selected) {
        this.selectedEntries.set(fsId, file);
      } else {
        this.selectedEntries.delete(fsId);
      }
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', String(selected));
      checkbox.checked = selected;
      if (updateCount) this.updateSelectedCount();
    },

    /** 同步当前目录的选择显示 */
    syncRenderedSelection() {
      this.browserModal.querySelectorAll('.baidu-pan-item[data-fs-id]').forEach(item => {
        const fsId = item.dataset.fsId;
        const checkbox = item.querySelector('.baidu-pan-item-checkbox');
        const selected = this.selectedEntries.has(fsId);
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-selected', String(selected));
        checkbox.checked = selected;
      });
    },

    /** 更新已选数量 */
    updateSelectedCount() {
      const count = this.selectedEntries.size;
      const el = this.browserModal.querySelector('.baidu-pan-selected');
      const importBtn = this.browserModal.querySelector('#baiduPanImport');
      const selectAll = this.browserModal.querySelector('#baiduPanSelectAll');
      let selectedInDirectory = 0;

      this.currentDirectoryEntries.forEach((entry, fsId) => {
        if (this.selectedEntries.has(fsId)) selectedInDirectory += 1;
      });

      const directoryCount = this.currentDirectoryEntries.size;
      el.textContent = `已选择 ${count} 张照片`;
      importBtn.disabled = count === 0;
      selectAll.disabled = directoryCount === 0;
      selectAll.checked = directoryCount > 0 && selectedInDirectory === directoryCount;
      selectAll.indeterminate = selectedInDirectory > 0 && selectedInDirectory < directoryCount;
    },

    /** 关闭弹窗 */
    closeBrowser() {
      this.directoryAbortController?.abort();
      this.previewAbortController?.abort();
      if (this.browserModal) {
        this.browserModal.hidden = true;
      }
      this.selectedEntries = new Map();
      this.currentDirectoryEntries = new Map();
    },

    /** 将选中照片以低清预览导入主画布 */
    async importSelected() {
      const entries = Array.from(this.selectedEntries.values());
      if (entries.length === 0) return;

      const importBtn = this.browserModal.querySelector('#baiduPanImport');
      const originalText = importBtn.textContent;
      const controller = new AbortController();
      this.previewAbortController?.abort();
      this.previewAbortController = controller;
      importBtn.disabled = true;
      const succeeded = [];
      const failures = [];
      let nextIndex = 0;
      let completed = 0;

      const worker = async () => {
        while (nextIndex < entries.length && !controller.signal.aborted) {
          const entry = entries[nextIndex++];
          try {
            if (!entry.thumbnail_url) throw new Error('没有可用缩略图');
            const blob = await this.fetchThumbnail(entry.thumbnail_url, controller.signal);
            succeeded.push(await readRemotePreview(entry, blob));
          } catch (error) {
            if (error.name !== 'AbortError') failures.push({ entry, error });
          } finally {
            completed += 1;
            importBtn.textContent = `正在载入低清预览 ${completed}/${entries.length}`;
          }
        }
      };

      try {
        await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker));
        if (controller.signal.aborted) {
          succeeded.forEach(releaseItem);
          return;
        }
        if (succeeded.length) {
          state.items.push(...succeeded);
          render();
          renderPhotoList();
          await rebuildAllItemSources(true);
        }
        this.previewAbortController = null;
        this.closeBrowser();
        if (failures.length) {
          showNotice(`已载入 ${succeeded.length} 张低清预览，${failures.length} 张缩略图失败`);
        } else {
          showNotice('已载入低清预览；编辑、拍摄时间排序或导出时将下载原图');
        }
      } finally {
        if (this.previewAbortController === controller) this.previewAbortController = null;
        importBtn.disabled = false;
        importBtn.textContent = originalText;
      }
    }
  };

  // 添加"从百度网盘导入"按钮
  const baiduPanButton = document.createElement('button');
  baiduPanButton.type = 'button';
  baiduPanButton.className = 'baidu-pan-button';
  baiduPanButton.innerHTML = `
    <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg></span>
    从百度网盘导入
  `;
  dropZone.parentNode.insertBefore(baiduPanButton, dropZone.nextSibling);

  baiduPanButton.addEventListener('click', async () => {
    baiduPanButton.disabled = true;
    baiduPanButton.innerHTML = '<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>检查登录状态...';
    try {
      await BaiduPanIntegration.checkAuthStatus();
      await BaiduPanIntegration.openBrowser();
    } catch (e) {
      console.error('Baidu Pan error:', e);
      showNotice('百度网盘连接失败，请稍后重试');
    } finally {
      baiduPanButton.disabled = false;
      baiduPanButton.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg></span>
        从百度网盘导入
      `;
    }
  });

  // 确保裁切模态框和菜单初始状态为隐藏
  cropModal.hidden = true;
  frameMenu.hidden = true;
})();
