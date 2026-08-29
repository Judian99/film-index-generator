(() => {
  "use strict";

  const Shared = window.FilmFrameShared;
  if (!Shared) throw new Error("FilmFrameShared module is unavailable.");

  const FILM_135 = Object.freeze({
    filmHeightMm: 35,
    imageHeightMm: 24,
    standardImageWidthMm: 36,
    frameAdvanceMm: 38,
    sprocketPitchMm: 4.75,
    sprocketHoleWidthMm: 2.8,
  });

  const DEFAULT_TUNE_135 = Object.freeze({
    sprocketH: 0.1,
    holeH: 0.76,
    holeW: 0.058,
    textH: 0.068,
    fontSize: 0.86,
    textOffsetY: 0.38,
    textSprocketGap: 0.022,
  });

  const EDGE_NUMBER_SUFFIX_SCALE = 0.68;

  // 共享基元（见 film-frame-shared.js），本文件内按 135 语境直接引用
  const {
    roundedRect,
    deterministicNoise,
    beginStripSurface,
    endStripSurface,
    buildSingleStripPath,
    setEdgeInk,
    fillCheckerboard,
  } = Shared;
  const getTune = (options) => Shared.resolveTune(options, DEFAULT_TUNE_135);

  function getFrameExposureGeometry(x, y, options) {
    const central = { x, y, w: options.slotW, h: options.slotH };
    const regions = [central];
    const edgeZoneH = Math.max(0, options.bandH - options.sprocketH);

    if (options.imageInSprockets) {
      regions.push(
        { x, y: y - options.sprocketH, w: options.slotW, h: options.sprocketH },
        { x, y: y + options.slotH, w: options.slotW, h: options.sprocketH },
      );
    }
    if (options.imageInEdgeText && edgeZoneH > 0) {
      regions.push(
        { x, y: y - options.bandH, w: options.slotW, h: edgeZoneH },
        { x, y: y + options.slotH + options.sprocketH, w: options.slotW, h: edgeZoneH },
      );
    }

    const top = Math.min(...regions.map((region) => region.y));
    const bottom = Math.max(...regions.map((region) => region.y + region.h));
    return {
      central,
      regions,
      bounds: { x, y: top, w: options.slotW, h: bottom - top },
      continuous: Boolean(options.imageInSprockets),
    };
  }

  function addExposurePath(ctx, geometry, radius) {
    ctx.beginPath();
    if (geometry.continuous) {
      ctx.rect(geometry.bounds.x, geometry.bounds.y, geometry.bounds.w, geometry.bounds.h);
      return;
    }
    geometry.regions.forEach((region, index) => {
      if (index === 0) {
        const r = Math.min(radius, region.w / 2, region.h / 2);
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(region.x, region.y, region.w, region.h, r);
        } else {
          ctx.moveTo(region.x + r, region.y);
          ctx.arcTo(region.x + region.w, region.y, region.x + region.w, region.y + region.h, r);
          ctx.arcTo(region.x + region.w, region.y + region.h, region.x, region.y + region.h, r);
          ctx.arcTo(region.x, region.y + region.h, region.x, region.y, r);
          ctx.arcTo(region.x, region.y, region.x + region.w, region.y, r);
          ctx.closePath();
        }
      } else {
        ctx.rect(region.x, region.y, region.w, region.h);
      }
    });
  }

  function getCoverPlacement(sourceWidth, sourceHeight, central) {
    if (
      !Number.isFinite(sourceWidth) ||
      !Number.isFinite(sourceHeight) ||
      sourceWidth <= 0 ||
      sourceHeight <= 0 ||
      !central ||
      central.w <= 0 ||
      central.h <= 0
    ) {
      return null;
    }
    const scale = Math.max(central.w / sourceWidth, central.h / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    return {
      scale,
      drawX: central.x + (central.w - drawW) / 2,
      drawY: central.y + (central.h - drawH) / 2,
      drawW,
      drawH,
    };
  }

  function drawBlurredPhotoBackground(ctx, source, sourceWidth, sourceHeight, destination, blurPx = 0, clipRect = destination) {
    if (!source || !destination || !clipRect) return false;
    const blur = Math.max(0, Number(blurPx) || 0);
    const overscan = Math.ceil(blur * 3 + 2);
    const expanded = {
      x: destination.x - overscan,
      y: destination.y - overscan,
      w: destination.w + overscan * 2,
      h: destination.h + overscan * 2,
    };
    const placement = getCoverPlacement(sourceWidth, sourceHeight, expanded);
    if (!placement) return false;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
    ctx.clip();
    if (blur > 0 && "filter" in ctx) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(source, placement.drawX, placement.drawY, placement.drawW, placement.drawH);
    ctx.restore();
    return true;
  }

  function drawFrame(ctx, item, x, y, options, drawState = {}) {
    const geometry = getFrameExposureGeometry(x, y, options);
    const { central } = geometry;
    const placement = getCoverPlacement(item.width, item.height, central);
    if (!placement) return geometry;
    const { drawX, drawY, drawW, drawH } = placement;
    const radius = Math.max(2, Math.round(central.w * 0.008));

    ctx.save();
    addExposurePath(ctx, geometry, radius);
    ctx.clip();
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(geometry.bounds.x, geometry.bounds.y, geometry.bounds.w, geometry.bounds.h);
    ctx.globalAlpha = drawState.dragAlpha ?? 1;
    ctx.drawImage(item.source, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (!geometry.continuous) {
      roundedRect(ctx, central.x + 0.5, central.y + 0.5, central.w - 1, central.h - 1, radius);
      ctx.strokeStyle = "rgba(255, 214, 150, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return geometry;
  }

  function drawBlankFrame(ctx, x, y, options) {
    const geometry = getFrameExposureGeometry(x, y, options);
    ctx.save();
    addExposurePath(ctx, geometry, 0);
    ctx.clip();
    ctx.fillStyle = "rgb(0, 0, 0)";
    geometry.regions.forEach((region) => ctx.fillRect(region.x, region.y, region.w, region.h));
    ctx.restore();
    if (!geometry.continuous) {
      ctx.strokeStyle = "rgba(255, 248, 230, 0.03)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, options.slotW - 1, options.slotH - 1);
    }
    return geometry;
  }

  function drawSprockets(
    ctx,
    x,
    zoneY,
    stripW,
    options,
    leaderFootX = null,
    alignment = "continuous",
    alignmentOriginX = null,
  ) {
    const tune = getTune(options);
    const pitch = options.sprocketPitch;
    const holeW = options.sprocketHoleW;
    const holeH = Math.round(options.sprocketH * tune.holeH);
    const holeY = zoneY + Math.round((options.sprocketH - holeH) / 2);
    const holeR = Math.max(2, Math.round(holeW * 0.28));
    const margin = Math.round(options.frameW * 0.04);
    const availableW = stripW - margin * 2;
    const continuousHoleCount = Math.max(0, Math.floor((availableW - holeW) / pitch) + 1);
    const centeredHoleCount = Math.max(1, Math.round(stripW / pitch));
    const anchored = Number.isFinite(alignmentOriginX);
    const firstAnchoredIndex = anchored ? Math.ceil((x - alignmentOriginX) / pitch) : 0;
    const startX = anchored
      ? alignmentOriginX + firstAnchoredIndex * pitch
      : alignment === "center"
        ? x + (stripW - ((centeredHoleCount - 1) * pitch + holeW)) / 2
        : x + margin;
    const holeCount = anchored
      ? Math.max(0, Math.floor((x + stripW - holeW - startX) / pitch) + 1)
      : alignment === "center"
        ? centeredHoleCount
        : continuousHoleCount;

    for (let index = 0; index < holeCount; index += 1) {
      const hx = startX + index * pitch;
      if (leaderFootX !== null && hx + holeW * 1.75 < leaderFootX) continue;
      roundedRect(ctx, hx, holeY, holeW, holeH, holeR);
      // 透明背景导出时齿孔为真实镂空；预览以棋盘格示意；其余背景保持纸色填充
      const holeMode = options.sprocketHoleMode || "fill";
      if (holeMode === "punch") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.restore();
        continue;
      }
      if (holeMode === "checker") {
        ctx.save();
        ctx.clip();
        fillCheckerboard(ctx, hx, holeY, holeW, holeH);
        ctx.restore();
        continue;
      }
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
    return Shared.edgeFontSize(options, scale, getTune(options), "fontSize", 11, 7);
  }

  function getEdgeMarkLayout(x, stripW, rowInfo, options) {
    const markPitch = options.edgeMarkW + options.edgeMarkGap;
    const startX = x + options.stripPadX + (rowInfo.leader ? options.leaderAdvance : 0);
    const firstIndex = Number.isFinite(rowInfo.edgeMarkStartIndex)
      ? Math.max(0, Math.floor(rowInfo.edgeMarkStartIndex))
      : Math.floor((rowInfo.start * (options.slotW + options.slotGap)) / markPitch);
    const marks = [];
    for (let markX = startX, index = firstIndex; markX < x + stripW; markX += markPitch, index += 1) {
      marks.push({ x: markX, index });
    }
    return marks;
  }

  function drawFrameNumberWithSuffix(ctx, frameNumber, x, baseline, options) {
    const digits = `${frameNumber}`;
    const regularFont = edgeFont(options).font;
    ctx.font = regularFont;
    ctx.fillText(digits, x, baseline);
    const digitWidth = ctx.measureText(digits).width;
    ctx.font = edgeFont(options, EDGE_NUMBER_SUFFIX_SCALE).font;
    ctx.fillText("A", x + digitWidth, baseline);
    ctx.font = regularFont;
  }

  function drawEdgeTextTop(ctx, x, zoneY, stripW, rowInfo, rowIndex, options) {
    if (!options.stock.edgeText) return;
    const tune = getTune(options);
    const { font } = edgeFont(options);
    const baseline = zoneY + Math.round(options.textH * tune.textOffsetY);
    const presets = options.stock.edgePresets;
    const preset = presets[rowIndex % presets.length];
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(ctx, options);
    marks.forEach((mark, index) => {
      const label = index % 2 === 0 ? options.stock.edgeText : preset;
      ctx.fillText(label, mark.x, baseline, options.edgeMarkW * 0.94);
    });
    ctx.restore();
  }

  function drawEdgeTextBottom(ctx, x, zoneY, stripW, rowInfo, options) {
    if (!options.stock.edgeText) return;
    const tune = getTune(options);
    const { fontSize, font } = edgeFont(options);
    const baseline = zoneY + options.textH - Math.round(options.textH * tune.textOffsetY);
    const marks = getEdgeMarkLayout(x, stripW, rowInfo, options);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "middle";
    setEdgeInk(ctx, options);
    marks.forEach((mark) => {
      const frameNumber = mark.index + 1;
      ctx.fillText(`${frameNumber}`, mark.x + Math.round(options.edgeMarkW * 0.03), baseline);
      if (options.stock.frameNumberStyle === "N/NA") {
        drawFrameNumberWithSuffix(ctx, frameNumber, mark.x + Math.round(options.edgeMarkW * 0.52), baseline, options);
      }
      ctx.fillRect(
        mark.x + options.edgeMarkW - Math.round(fontSize * 0.45),
        baseline - Math.round(fontSize * 0.16),
        Math.round(fontSize * 0.32),
        Math.round(fontSize * 0.32),
      );
    });
    ctx.restore();
  }

  function createSingleFrame135Options({
    frameW,
    stock,
    frameNumber = 1,
    showEdgeText = true,
    showSprockets = true,
    showStripShadow,
    tune = DEFAULT_TUNE_135,
    edgeMarkStartIndex = null,
  }) {
    const baseFrameW = frameW;
    const slotW = baseFrameW;
    const slotH = Math.round(baseFrameW / 1.5);
    const pxPerMm135 = baseFrameW / FILM_135.standardImageWidthMm;
    const minimumBandH = Math.round(pxPerMm135 * (FILM_135.filmHeightMm - FILM_135.imageHeightMm) / 2);
    const textH = Math.round(baseFrameW * tune.textH);
    const sprocketH = Math.round(baseFrameW * tune.sprocketH);
    const textSprocketShift = Math.min(Math.round(baseFrameW * tune.textSprocketGap), textH);
    const bandH = Math.max(sprocketH + textH - textSprocketShift, minimumBandH);
    const slotGap = Math.max(0, pxPerMm135 * FILM_135.frameAdvanceMm - baseFrameW);
    const stripPadX = slotGap / 2;
    const stripW = slotW + slotGap;
    const stripH = slotH + bandH * 2;
    return {
      frameW: baseFrameW,
      frameH: slotH,
      baseFrameW,
      baseFrameH: slotH,
      slotW,
      slotH,
      slotGap,
      bandH,
      sprocketH,
      textH,
      textSprocketShift,
      sprocketPitch: pxPerMm135 * FILM_135.sprocketPitchMm,
      sprocketHoleW: Math.round(baseFrameW * tune.holeW),
      stripPadX,
      edgeMarkW: baseFrameW,
      edgeMarkGap: slotGap,
      edgeMarkSlotSpan: 1,
      leaderAdvance: baseFrameW + slotGap,
      showEdgeText: showEdgeText && Boolean(stock.edgeText),
      showSprockets,
      showStripShadow: showStripShadow !== false,
      imageInSprockets: false,
      imageInEdgeText: false,
      is120: false,
      isHalfFrame: false,
      isCroppedHalfFrame: false,
      isWide135: false,
      stock,
      frameNumber: Math.max(1, Math.floor(frameNumber) || 1),
      edgeMarkStartIndex: Number.isFinite(edgeMarkStartIndex)
        ? Math.max(0, Math.floor(edgeMarkStartIndex))
        : null,
      tune,
      stripW,
      stripH,
    };
  }

  function renderSingleFrame135(ctx, item, options, origin = {}) {
    const x = origin.x ?? -options.stripW / 2;
    const y = origin.y ?? -options.stripH / 2;
    const frameX = x + options.stripPadX;
    const frameY = y + options.bandH;
    const rowInfo = {
      start: options.edgeMarkStartIndex ?? options.frameNumber - 1,
      count: 1,
      capacity: 1,
      leader: false,
      trailer: false,
      trimmed: false,
      edgeMarkStartIndex: options.edgeMarkStartIndex,
    };
    const buildPath = (context, px, py, width, height) => buildSingleStripPath(context, px, py, width, height, options);

    beginStripSurface(ctx, x, y, options.stripW, options.stripH, options, buildPath);
    const geometry = drawFrame(ctx, item, frameX, frameY, options);
    if (options.showSprockets) {
      const topZoneY = y + options.textH - options.textSprocketShift;
      const bottomZoneY = y + options.stripH - options.textH - options.sprocketH + options.textSprocketShift;
      drawSprockets(ctx, x, topZoneY, options.stripW, options, null, "center");
      drawSprockets(ctx, x, bottomZoneY, options.stripW, options, null, "center");
    }
    if (options.showEdgeText) {
      drawEdgeTextTop(ctx, x, y, options.stripW, rowInfo, 0, options);
      drawEdgeTextBottom(ctx, x, y + options.stripH - options.textH, options.stripW, rowInfo, options);
    }
    endStripSurface(ctx, x, y, options.stripW, options.stripH, options, buildPath);
    return {
      frameGeometry: geometry,
      stripBounds: { x, y, w: options.stripW, h: options.stripH },
    };
  }

  window.FilmFrame135 = Object.freeze({
    FILM_135,
    DEFAULT_TUNE_135,
    roundedRect,
    deterministicNoise,
    getFrameExposureGeometry,
    drawBlurredPhotoBackground,
    addExposurePath,
    drawFrame,
    drawBlankFrame,
    drawSprockets,
    drawEdgeTextTop,
    drawEdgeTextBottom,
    beginStripSurface,
    endStripSurface,
    createSingleFrame135Options,
    renderSingleFrame135,
  });
})();
