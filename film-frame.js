(() => {
  "use strict";

  const FilmFrame135 = window.FilmFrame135;
  if (!FilmFrame135) throw new Error("FilmFrame135 renderer is unavailable.");

  const FORMAT_DEFINITIONS = Object.freeze({
    "135": Object.freeze({ id: "135", family: "135", ratio: 36 / 24, imageWidthMm: 36, imageHeightMm: 24, label: "135 全画幅", sizeLabel: "36 × 24 mm" }),
    half: Object.freeze({ id: "half", family: "135", ratio: 18 / 24, imageWidthMm: 18, imageHeightMm: 24, half: true, label: "135 半格", sizeLabel: "18 × 24 mm" }),
    xpan: Object.freeze({ id: "xpan", family: "135", ratio: 65 / 24, imageWidthMm: 65, imageHeightMm: 24, wide: true, label: "XPan 宽幅", sizeLabel: "65 × 24 mm" }),
    "135-69": Object.freeze({ id: "135-69", family: "135", ratio: 84 / 24, imageWidthMm: 84, imageHeightMm: 24, wide: true, label: "135 超宽幅", sizeLabel: "84 × 24 mm" }),
    "645": Object.freeze({ id: "645", family: "120", ratio: 41.5 / 56, imageWidthMm: 41.5, imageHeightMm: 56, columns: 4, portrait: true, label: "120 · 645", sizeLabel: "41.5 × 56 mm" }),
    "66": Object.freeze({ id: "66", family: "120", ratio: 1, imageWidthMm: 56, imageHeightMm: 56, columns: 3, label: "120 · 6×6", sizeLabel: "56 × 56 mm" }),
    "67": Object.freeze({ id: "67", family: "120", ratio: 69.5 / 56, imageWidthMm: 69.5, imageHeightMm: 56, columns: 2, label: "120 · 6×7", sizeLabel: "69.5 × 56 mm" }),
    "69": Object.freeze({ id: "69", family: "120", ratio: 84 / 56, imageWidthMm: 84, imageHeightMm: 56, columns: 2, label: "120 · 6×9", sizeLabel: "84 × 56 mm" }),
    "612": Object.freeze({ id: "612", family: "120", ratio: 112 / 56, imageWidthMm: 112, imageHeightMm: 56, columns: 3, label: "120 · 6×12", sizeLabel: "112 × 56 mm" }),
    "617": Object.freeze({ id: "617", family: "120", ratio: 168 / 56, imageWidthMm: 168, imageHeightMm: 56, columns: 2, label: "120 · 6×17", sizeLabel: "168 × 56 mm" }),
  });

  const DEFAULT_TUNE = Object.freeze({
    ...FilmFrame135.DEFAULT_TUNE_135,
    fontSize120: 0.74,
    textSprocketGap120: 0.015,
    band120: 0.044,
    gap120: 0.085,
  });

  function getFormat(formatId) {
    return FORMAT_DEFINITIONS[formatId] || FORMAT_DEFINITIONS["135"];
  }

  function getInputAdapter(formatId, inputMode = "cropped") {
    const format = getFormat(formatId);
    if (format.id !== "half") {
      return Object.freeze({
        id: "default",
        slotRatio: format.ratio,
        targetPortrait: Boolean(format.portrait),
        split: "none",
        sourceMeaning: "每个文件对应一个画幅。",
        edgeMarkSlotSpan: 1,
      });
    }
    if (inputMode === "uncropped") {
      return Object.freeze({
        id: "uncropped",
        slotRatio: FORMAT_DEFINITIONS["135"].ratio,
        targetPortrait: false,
        split: "none",
        sourceMeaning: "每个文件作为一张完整 3:2 扫描图显示，不会自动拆分为两格。",
        edgeMarkSlotSpan: 1,
      });
    }
    return Object.freeze({
      id: "cropped",
      slotRatio: format.ratio,
      targetPortrait: true,
      split: "none",
      sourceMeaning: "每个文件对应一格 18 × 24 mm 半格画面。",
      edgeMarkSlotSpan: 2,
    });
  }

  function getTune(options) {
    return options.tune || DEFAULT_TUNE;
  }

  function edgeFont120(options, scale = 1) {
    const tune = getTune(options);
    const regularSize = Math.max(1, Math.round(options.textH * tune.fontSize120));
    const fontSize = Math.max(1, Math.round(regularSize * scale));
    return { fontSize, font: `700 ${fontSize}px "Courier New", monospace` };
  }

  function getEdgeMarkLayout120(x, stripW, rowInfo, options) {
    const markPitch = options.edgeMarkW + options.edgeMarkGap;
    const startX = x + options.stripPadX;
    const markCount = Math.ceil(rowInfo.capacity / options.edgeMarkSlotSpan);
    return Array.from({ length: markCount }, (_, mark) => ({
      x: startX + mark * markPitch,
      index: Math.floor(rowInfo.start / options.edgeMarkSlotSpan) + mark,
    })).filter((mark) => mark.x < x + stripW);
  }

  function setEdgeInk(ctx, options) {
    ctx.shadowColor = options.stock.edgeInk.glow;
    ctx.shadowBlur = 3;
    ctx.fillStyle = options.stock.edgeInk.color;
  }

  function drawEdgeTextTop120(ctx, x, zoneY, stripW, rowInfo, options) {
    if (!options.stock.edgeText) return;
    const { font } = edgeFont120(options);
    const numberFont = edgeFont120(options, 1.15).font;
    const baseline = zoneY + Math.round(options.textH * 0.52);
    const brand = options.stock.edgeText.split(" ")[0] || "";
    const marks = getEdgeMarkLayout120(x, stripW, rowInfo, options);

    ctx.save();
    ctx.textBaseline = "middle";
    setEdgeInk(ctx, options);
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

  function drawEdgeTextBottom120(ctx, x, zoneY, stripW, rowInfo, rowIndex, options) {
    if (!options.stock.edgeText) return;
    const { fontSize, font } = edgeFont120(options);
    const baseline = zoneY + Math.round(options.textH * 0.52);
    const presets = options.stock.edgePresets120?.length ? options.stock.edgePresets120 : ["120", "SAFETY FILM"];
    const preset = presets[rowIndex % presets.length];
    const marks = getEdgeMarkLayout120(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(ctx, options);
    marks.forEach((mark, index) => {
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
      if (index % 2 === 1) {
        ctx.fillText(preset, mark.x + Math.round(options.edgeMarkW * 0.34), baseline, options.edgeMarkW * 0.32);
      }
      const barZoneX = mark.x + options.edgeMarkW * 0.72;
      const barZoneW = options.edgeMarkW * 0.24;
      const barH = Math.round(options.textH * 0.55);
      const barY = baseline - Math.round(barH / 2);
      let bx = barZoneX;
      for (let i = 0; i < 14 && bx < barZoneX + barZoneW; i += 1) {
        const seed = mark.index * 197 + i * 13;
        const barW = Math.max(1, Math.round(fontSize * (0.05 + FilmFrame135.deterministicNoise(seed) * 0.1)));
        ctx.fillRect(Math.round(bx), barY, barW, barH);
        bx += barW + Math.max(1, Math.round(fontSize * (0.06 + FilmFrame135.deterministicNoise(seed + 7) * 0.12)));
      }
    });
    ctx.restore();
  }

  function buildSingleStripPath(ctx, x, y, stripW, stripH, options) {
    const radius = options.is120
      ? Math.max(2, Math.round(options.frameW * 0.004))
      : Math.max(6, Math.round(options.frameW * 0.015));
    FilmFrame135.roundedRect(ctx, x, y, stripW, stripH, radius);
  }

  function createSingleFrame135FamilyOptions(settings, format, inputAdapter) {
    const tune = settings.tune || DEFAULT_TUNE;
    const effectiveFormat = format.id === "half" && inputAdapter.id === "uncropped"
      ? FORMAT_DEFINITIONS["135"]
      : format;
    const slotW = settings.frameW;
    const pxPerMm = slotW / effectiveFormat.imageWidthMm;
    const slotH = pxPerMm * effectiveFormat.imageHeightMm;
    const frameAdvanceMm = format.id === "half" && inputAdapter.id === "cropped"
      ? FilmFrame135.FILM_135.frameAdvanceMm / 2
      : effectiveFormat.imageWidthMm + 2;
    const slotGap = Math.max(0, pxPerMm * frameAdvanceMm - slotW);
    const textH = Math.round(pxPerMm * FilmFrame135.FILM_135.standardImageWidthMm * tune.textH);
    const sprocketH = Math.round(pxPerMm * FilmFrame135.FILM_135.standardImageWidthMm * tune.sprocketH);
    const textSprocketShift = Math.min(Math.round(pxPerMm * FilmFrame135.FILM_135.standardImageWidthMm * tune.textSprocketGap), textH);
    const minimumBandH = Math.round(pxPerMm * (FilmFrame135.FILM_135.filmHeightMm - FilmFrame135.FILM_135.imageHeightMm) / 2);
    const bandH = Math.max(sprocketH + textH - textSprocketShift, minimumBandH);
    const stripPadX = slotGap / 2;
    return {
      frameW: slotW,
      frameH: slotH,
      baseFrameW: pxPerMm * FilmFrame135.FILM_135.standardImageWidthMm,
      baseFrameH: pxPerMm * FilmFrame135.FILM_135.imageHeightMm,
      slotW,
      slotH,
      slotGap,
      bandH,
      sprocketH,
      textH,
      textSprocketShift,
      sprocketPitch: pxPerMm * FilmFrame135.FILM_135.sprocketPitchMm,
      sprocketHoleW: pxPerMm * FilmFrame135.FILM_135.sprocketHoleWidthMm,
      stripPadX,
      edgeMarkW: pxPerMm * FilmFrame135.FILM_135.standardImageWidthMm,
      edgeMarkGap: pxPerMm * (FilmFrame135.FILM_135.frameAdvanceMm - FilmFrame135.FILM_135.standardImageWidthMm),
      edgeMarkSlotSpan: inputAdapter.edgeMarkSlotSpan,
      leaderAdvance: pxPerMm * FilmFrame135.FILM_135.frameAdvanceMm,
      showEdgeText: settings.showEdgeText !== false && Boolean(settings.stock.edgeText),
      showSprockets: settings.showSprockets !== false,
      imageInSprockets: Boolean(settings.imageInSprockets),
      imageInEdgeText: Boolean(settings.imageInEdgeText),
      is120: false,
      isHalfFrame: format.id === "half",
      isCroppedHalfFrame: format.id === "half" && inputAdapter.id === "cropped",
      isWide135: Boolean(format.wide),
      stock: settings.stock,
      frameNumber: Math.max(1, Math.floor(settings.frameNumber) || 1),
      edgeMarkStartIndex: Number.isFinite(settings.edgeMarkStartIndex)
        ? Math.max(0, Math.floor(settings.edgeMarkStartIndex))
        : null,
      tune,
      stripW: slotW + slotGap,
      stripH: slotH + bandH * 2,
      format,
      inputAdapter,
      renderer: "generic",
    };
  }

  function createSingleFrame120Options(settings, format, inputAdapter) {
    const tune = settings.tune || DEFAULT_TUNE;
    const slotW = settings.frameW;
    const slotH = slotW / format.ratio;
    const textH = Math.round(slotH * tune.band120);
    const requestedSprockets = settings.showSprockets === true && Boolean(settings.stock.sprocketsIn120);
    const sprocketH = requestedSprockets ? Math.round(slotH * 0.09) : 0;
    const textSprocketShift = requestedSprockets ? Math.min(Math.round(slotH * tune.textSprocketGap120), textH) : 0;
    const bandH = Math.max(sprocketH + textH - textSprocketShift, Math.round(slotH * 0.02));
    const stripPadX = Math.round(slotH * 0.05);
    const slotGap = Math.round(slotH * tune.gap120);
    return {
      frameW: slotW,
      frameH: slotH,
      baseFrameW: slotW,
      baseFrameH: slotH,
      slotW,
      slotH,
      slotGap,
      bandH,
      sprocketH,
      textH,
      textSprocketShift,
      sprocketPitch: slotH * (4.75 / 56),
      sprocketHoleW: slotH * (2.8 / 56),
      stripPadX,
      edgeMarkW: slotW,
      edgeMarkGap: slotGap,
      edgeMarkSlotSpan: 1,
      leaderAdvance: slotW + slotGap,
      showEdgeText: settings.showEdgeText !== false && Boolean(settings.stock.edgeText),
      showSprockets: requestedSprockets,
      imageInSprockets: false,
      imageInEdgeText: false,
      is120: true,
      isHalfFrame: false,
      isCroppedHalfFrame: false,
      isWide135: false,
      stock: settings.stock,
      frameNumber: Math.max(1, Math.floor(settings.frameNumber) || 1),
      edgeMarkStartIndex: Number.isFinite(settings.edgeMarkStartIndex)
        ? Math.max(0, Math.floor(settings.edgeMarkStartIndex))
        : null,
      tune,
      stripW: slotW + stripPadX * 2,
      stripH: slotH + bandH * 2,
      format,
      inputAdapter,
      renderer: "generic",
    };
  }

  function createSingleFrameOptions({
    formatId = "135",
    inputMode = "cropped",
    frameW,
    stock,
    frameNumber = 1,
    showEdgeText = true,
    showSprockets,
    imageInSprockets = false,
    imageInEdgeText = false,
    tune = DEFAULT_TUNE,
    edgeMarkStartIndex = null,
  }) {
    const format = getFormat(formatId);
    const inputAdapter = getInputAdapter(format.id, inputMode);
    const settings = { frameW, stock, frameNumber, showEdgeText, showSprockets, imageInSprockets, imageInEdgeText, tune, edgeMarkStartIndex };
    if (format.id === "135") {
      return {
        ...FilmFrame135.createSingleFrame135Options(settings),
        format,
        inputAdapter,
        renderer: "135",
      };
    }
    if (format.id === "half" && inputAdapter.id === "uncropped") {
      return {
        ...FilmFrame135.createSingleFrame135Options(settings),
        format,
        inputAdapter,
        renderer: "135",
      };
    }
    return format.family === "120"
      ? createSingleFrame120Options(settings, format, inputAdapter)
      : createSingleFrame135FamilyOptions(settings, format, inputAdapter);
  }

  function renderGenericSingleFrame(ctx, item, options, origin = {}) {
    const x = origin.x ?? -options.stripW / 2;
    const y = origin.y ?? -options.stripH / 2;
    const frameX = x + options.stripPadX;
    const frameY = y + options.bandH;
    const rowInfo = {
      start: options.edgeMarkStartIndex ?? (options.isCroppedHalfFrame
        ? (options.frameNumber - 1) * options.edgeMarkSlotSpan
        : options.frameNumber - 1),
      count: 1,
      capacity: 1,
      leader: false,
      trailer: false,
      trimmed: false,
      edgeMarkStartIndex: options.edgeMarkStartIndex,
    };
    const buildPath = (context, px, py, width, height) => buildSingleStripPath(context, px, py, width, height, options);

    FilmFrame135.beginStripSurface(ctx, x, y, options.stripW, options.stripH, options, buildPath);
    const geometry = FilmFrame135.drawFrame(ctx, item, frameX, frameY, options);
    if (options.showSprockets) {
      const topZoneY = y + options.textH - options.textSprocketShift;
      const bottomZoneY = y + options.stripH - options.textH - options.sprocketH + options.textSprocketShift;
      FilmFrame135.drawSprockets(ctx, x, topZoneY, options.stripW, options, null, "center");
      FilmFrame135.drawSprockets(ctx, x, bottomZoneY, options.stripW, options, null, "center");
    }
    if (options.showEdgeText) {
      if (options.is120) {
        drawEdgeTextTop120(ctx, x, y, options.stripW, rowInfo, options);
        drawEdgeTextBottom120(ctx, x, y + options.stripH - options.textH, options.stripW, rowInfo, 0, options);
      } else {
        FilmFrame135.drawEdgeTextTop(ctx, x, y, options.stripW, rowInfo, 0, options);
        FilmFrame135.drawEdgeTextBottom(ctx, x, y + options.stripH - options.textH, options.stripW, rowInfo, options);
      }
    }
    FilmFrame135.endStripSurface(ctx, x, y, options.stripW, options.stripH, options, buildPath);
    return {
      frameGeometry: geometry,
      stripBounds: { x, y, w: options.stripW, h: options.stripH },
      format: options.format,
      inputAdapter: options.inputAdapter,
    };
  }

  function renderSingleFrame(ctx, item, options, origin = {}) {
    if (options.renderer === "135") {
      const result = FilmFrame135.renderSingleFrame135(ctx, item, options, origin);
      return { ...result, format: options.format, inputAdapter: options.inputAdapter };
    }
    return renderGenericSingleFrame(ctx, item, options, origin);
  }

  function getSingleFrameRenderBounds(options, { includeShadow = true } = {}) {
    const shadowBlur = includeShadow ? Math.round(options.frameW * 0.05) : 0;
    const shadowOffsetY = includeShadow ? Math.round(options.frameW * 0.018) : 0;
    const strokePad = 2;
    const shadowPad = shadowBlur * 2;
    const left = shadowPad + strokePad;
    const right = shadowPad + strokePad;
    const top = shadowPad + strokePad;
    const bottom = shadowPad + Math.max(0, shadowOffsetY) + strokePad;
    return Object.freeze({
      width: Math.ceil(options.stripW + left + right),
      height: Math.ceil(options.stripH + top + bottom),
      originX: left,
      originY: top,
      padding: Object.freeze({ left, right, top, bottom }),
      stripBounds: Object.freeze({ x: left, y: top, w: options.stripW, h: options.stripH }),
    });
  }

  function renderSingleFrameInBounds(ctx, item, options, bounds = getSingleFrameRenderBounds(options)) {
    return renderSingleFrame(ctx, item, options, { x: bounds.originX, y: bounds.originY });
  }

  window.FilmFrame = Object.freeze({
    FORMATS: FORMAT_DEFINITIONS,
    DEFAULT_TUNE,
    getFormat,
    getInputAdapter,
    createSingleFrameOptions,
    renderSingleFrame,
    getSingleFrameRenderBounds,
    renderSingleFrameInBounds,
    edgeFont120,
    getEdgeMarkLayout120,
    drawEdgeTextTop120,
    drawEdgeTextBottom120,
    buildSingleStripPath,
  });
})();
