(() => {
  "use strict";

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

  function getTune(options) {
    return options.tune || DEFAULT_TUNE_135;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function deterministicNoise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

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
    };
  }

  function addExposurePath(ctx, geometry, radius) {
    ctx.beginPath();
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

  function drawFrame(ctx, item, x, y, options, drawState = {}) {
    const geometry = getFrameExposureGeometry(x, y, options);
    const { central } = geometry;
    const scale = Math.max(central.w / item.width, central.h / item.height);
    const drawW = item.width * scale;
    const drawH = item.height * scale;
    const drawX = central.x + (central.w - drawW) / 2;
    const drawY = central.y + (central.h - drawH) / 2;
    const radius = Math.max(2, Math.round(central.w * 0.008));

    ctx.save();
    addExposurePath(ctx, geometry, radius);
    ctx.clip();
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(central.x, central.y, central.w, central.h);
    ctx.globalAlpha = drawState.dragAlpha ?? 1;
    ctx.drawImage(item.source, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
    ctx.restore();

    roundedRect(ctx, central.x + 0.5, central.y + 0.5, central.w - 1, central.h - 1, radius);
    ctx.strokeStyle = "rgba(255, 214, 150, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
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
    ctx.strokeStyle = "rgba(255, 248, 230, 0.03)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, options.slotW - 1, options.slotH - 1);
    return geometry;
  }

  function drawSprockets(ctx, x, zoneY, stripW, options, leaderFootX = null, alignment = "continuous") {
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
    const holeCount = alignment === "center" ? centeredHoleCount : continuousHoleCount;
    const groupW = holeCount > 0 ? (holeCount - 1) * pitch + holeW : 0;
    const startX = alignment === "center" ? x + (stripW - groupW) / 2 : x + margin;

    for (let index = 0; index < holeCount; index += 1) {
      const hx = startX + index * pitch;
      if (leaderFootX !== null && hx + holeW * 1.75 < leaderFootX) continue;
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
    const tune = getTune(options);
    const regularSize = Math.max(11, Math.round(options.textH * tune.fontSize));
    const fontSize = Math.max(7, Math.round(regularSize * scale));
    return { fontSize, font: `700 ${fontSize}px "Courier New", monospace` };
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

  function setEdgeInk(ctx, options) {
    ctx.shadowColor = options.stock.edgeInk.glow;
    ctx.shadowBlur = 3;
    ctx.fillStyle = options.stock.edgeInk.color;
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

  function beginStripSurface(ctx, x, y, stripW, stripH, options, buildPath) {
    ctx.save();
    ctx.shadowColor = "rgba(25, 20, 12, 0.35)";
    ctx.shadowBlur = Math.round(options.frameW * 0.05);
    ctx.shadowOffsetY = Math.round(options.frameW * 0.018);
    buildPath(ctx, x, y, stripW, stripH);
    ctx.fillStyle = "#131110";
    ctx.fill();
    ctx.restore();

    ctx.save();
    buildPath(ctx, x, y, stripW, stripH);
    ctx.clip();
    const baseGradient = ctx.createLinearGradient(0, y, 0, y + stripH);
    baseGradient.addColorStop(0, "#231e19");
    baseGradient.addColorStop(0.12, "#161311");
    baseGradient.addColorStop(0.5, "#191512");
    baseGradient.addColorStop(0.88, "#151210");
    baseGradient.addColorStop(1, "#241f1a");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(x, y, stripW, stripH);
    const sheen = ctx.createLinearGradient(x, y, x + stripW * 0.55, y + stripH);
    sheen.addColorStop(0, "rgba(255, 250, 235, 0.05)");
    sheen.addColorStop(0.35, "rgba(255, 250, 235, 0)");
    sheen.addColorStop(0.8, "rgba(255, 250, 235, 0.025)");
    sheen.addColorStop(1, "rgba(255, 250, 235, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, stripW, stripH);
  }

  function endStripSurface(ctx, x, y, stripW, stripH, options, buildPath) {
    ctx.restore();
    buildPath(ctx, x + 0.5, y + 0.5, stripW - 1, stripH - 1);
    ctx.strokeStyle = "rgba(255, 248, 230, 0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function createSingleFrame135Options({
    frameW,
    stock,
    frameNumber = 1,
    showEdgeText = true,
    showSprockets = true,
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

  function buildSingleStripPath(ctx, x, y, stripW, stripH, options) {
    roundedRect(ctx, x, y, stripW, stripH, Math.max(6, Math.round(options.frameW * 0.015)));
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
    addExposurePath,
    drawFrame,
    drawBlankFrame,
    drawSprockets,
    edgeFont,
    getEdgeMarkLayout,
    setEdgeInk,
    drawFrameNumberWithSuffix,
    drawEdgeTextTop,
    drawEdgeTextBottom,
    beginStripSurface,
    endStripSurface,
    createSingleFrame135Options,
    renderSingleFrame135,
  });
})();
