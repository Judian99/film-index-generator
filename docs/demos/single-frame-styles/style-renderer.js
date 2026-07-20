(() => {
  "use strict";

  const FilmFrame135 = window.FilmFrame135;
  if (!FilmFrame135) throw new Error("FilmFrame135 renderer is unavailable.");
  const FilmFrame = window.FilmFrame;
  if (!FilmFrame) throw new Error("FilmFrame renderer is unavailable.");

  const DEMO_FILM_STOCK = Object.freeze({
    edgeText: "PORTRA 400",
    edgePresets: ["KODAK", "C-41"],
    edgePresets120: ["120", "SAFETY FILM"],
    frameNumberStyle: "N/NA",
    sprocketsIn120: false,
    edgeInk: {
      color: "rgba(230, 154, 36, 0.9)",
      glow: "rgba(255, 170, 45, 0.32)",
    },
  });

  const STYLE_DEFINITIONS = Object.freeze({
    filmFrame135: Object.freeze({
      id: "filmFrame135",
      aspect: 1.5,
      outer: { width: 0.8, height: 0.5, radius: 0.008 },
      seed: 4813,
      defaultPose: { rotation: 0.35, lift: 0 },
    }),
  });

  const textureCache = new Map();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    FilmFrame135.roundedRect(ctx, x, y, width, height, radius);
  }

  function stableStringHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function getFrameGeometry(styleId, viewport) {
    const style = STYLE_DEFINITIONS[styleId];
    if (!style) return null;
    const scale = Math.min(viewport.width, viewport.height / 0.78);
    const outerWidth = style.outer.width * scale;
    const outerHeight = style.outer.height * scale;
    return {
      scale,
      outer: {
        x: -outerWidth / 2,
        y: -outerHeight / 2,
        width: outerWidth,
        height: outerHeight,
        radius: style.outer.radius * scale,
      },
    };
  }

  function createTextureTile(seed, size = 112) {
    const cacheKey = `${seed}:${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

    const tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    const tileCtx = tile.getContext("2d");
    tileCtx.clearRect(0, 0, size, size);

    for (let y = 1; y < size; y += 3) {
      for (let x = 1; x < size; x += 3) {
        const noise = FilmFrame135.deterministicNoise(seed + x * 0.173 + y * 0.619);
        const alpha = 0.018 + noise * 0.042;
        const warm = noise > 0.54;
        tileCtx.fillStyle = warm
          ? `rgba(255, 224, 181, ${alpha})`
          : `rgba(36, 25, 19, ${alpha * 0.86})`;
        const radius = 0.28 + noise * 0.62;
        tileCtx.beginPath();
        tileCtx.arc(x + noise * 1.4, y, radius, 0, Math.PI * 2);
        tileCtx.fill();
      }
    }

    tileCtx.globalCompositeOperation = "screen";
    for (let i = 0; i < 14; i += 1) {
      const x = FilmFrame135.deterministicNoise(seed + 1200 + i * 7.1) * size;
      const y = FilmFrame135.deterministicNoise(seed + 1800 + i * 11.7) * size;
      const length = 7 + FilmFrame135.deterministicNoise(seed + 2400 + i * 5.3) * 19;
      tileCtx.strokeStyle = "rgba(255, 235, 205, 0.045)";
      tileCtx.lineWidth = 0.55;
      tileCtx.beginPath();
      tileCtx.moveTo(x, y);
      tileCtx.lineTo(x + length, y + length * 0.055);
      tileCtx.stroke();
    }
    tileCtx.globalCompositeOperation = "source-over";

    textureCache.set(cacheKey, tile);
    return tile;
  }

  function drawSceneBackground(ctx, width, height, seed) {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#bcb5a8");
    base.addColorStop(0.24, "#ddd7cb");
    base.addColorStop(0.56, "#cfc8bb");
    base.addColorStop(1, "#aaa294");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const keyLight = ctx.createRadialGradient(
      width * 0.24, height * 0.12, 0,
      width * 0.24, height * 0.12, Math.max(width, height) * 0.72,
    );
    keyLight.addColorStop(0, "rgba(255, 252, 238, 0.7)");
    keyLight.addColorStop(0.42, "rgba(247, 238, 218, 0.22)");
    keyLight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = keyLight;
    ctx.fillRect(0, 0, width, height);

    const bounceLight = ctx.createRadialGradient(
      width * 0.88, height * 0.7, 0,
      width * 0.88, height * 0.7, Math.max(width, height) * 0.58,
    );
    bounceLight.addColorStop(0, "rgba(222, 196, 156, 0.18)");
    bounceLight.addColorStop(1, "rgba(122, 105, 83, 0)");
    ctx.fillStyle = bounceLight;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.34;
    const pattern = ctx.createPattern(createTextureTile(seed + 19, 128), "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = "rgba(77, 67, 54, 0.36)";
    ctx.lineWidth = 0.7;
    for (let y = -width * 0.08; y < height + width * 0.08; y += 19) {
      const drift = FilmFrame135.deterministicNoise(seed + y * 0.47) * 5;
      ctx.beginPath();
      ctx.moveTo(0, y + drift);
      ctx.bezierCurveTo(width * 0.34, y - 2, width * 0.66, y + 3, width, y + drift * 0.35);
      ctx.stroke();
    }
    ctx.restore();

    drawVignette(ctx, width, height, 0.24);
  }

  function drawVignette(ctx, width, height, strength) {
    const radius = Math.max(width, height) * 0.76;
    const vignette = ctx.createRadialGradient(
      width * 0.47, height * 0.43, radius * 0.1,
      width * 0.5, height * 0.5, radius,
    );
    vignette.addColorStop(0, "rgba(255,255,255,0)");
    vignette.addColorStop(0.66, "rgba(74,62,48,0.015)");
    vignette.addColorStop(1, `rgba(45,38,30,${strength})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function buildStripPath(ctx, bounds, radius) {
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, radius);
  }

  function drawFilmShadow(ctx, bounds, radius, frameW) {
    ctx.save();
    ctx.fillStyle = "rgba(46, 34, 25, 0.2)";
    ctx.shadowColor = "rgba(43, 31, 23, 0.34)";
    ctx.shadowBlur = Math.max(18, frameW * 0.115);
    ctx.shadowOffsetX = frameW * 0.028;
    ctx.shadowOffsetY = frameW * 0.085;
    buildStripPath(ctx, bounds, radius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(37, 27, 20, 0.28)";
    ctx.shadowColor = "rgba(36, 25, 18, 0.42)";
    ctx.shadowBlur = Math.max(7, frameW * 0.038);
    ctx.shadowOffsetX = frameW * 0.008;
    ctx.shadowOffsetY = frameW * 0.024;
    buildStripPath(ctx, bounds, radius);
    ctx.fill();
    ctx.restore();
  }

  function drawFilmSurface(ctx, result, radius, frameW, seed) {
    const bounds = result.stripBounds;
    const opening = result.frameGeometry.central;

    ctx.save();
    buildStripPath(ctx, bounds, radius);
    ctx.clip();

    const bodyVariation = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
    bodyVariation.addColorStop(0, "rgba(255, 218, 166, 0.075)");
    bodyVariation.addColorStop(0.2, "rgba(255, 255, 255, 0.012)");
    bodyVariation.addColorStop(0.52, "rgba(77, 37, 19, 0.026)");
    bodyVariation.addColorStop(0.78, "rgba(255, 194, 119, 0.035)");
    bodyVariation.addColorStop(1, "rgba(25, 15, 10, 0.1)");
    ctx.fillStyle = bodyVariation;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.48;
    const pattern = ctx.createPattern(createTextureTile(seed + 101, 112), "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }
    ctx.restore();

    const sheen = ctx.createLinearGradient(
      bounds.x + bounds.w * 0.06, bounds.y,
      bounds.x + bounds.w * 0.78, bounds.y + bounds.h,
    );
    sheen.addColorStop(0, "rgba(255, 246, 221, 0.14)");
    sheen.addColorStop(0.18, "rgba(255, 236, 198, 0.035)");
    sheen.addColorStop(0.38, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(0.72, "rgba(255, 217, 165, 0.02)");
    sheen.addColorStop(1, "rgba(24, 13, 8, 0.08)");
    ctx.fillStyle = sheen;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const highlight = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h * 0.22);
    highlight.addColorStop(0, "rgba(255, 226, 178, 0.18)");
    highlight.addColorStop(0.28, "rgba(255, 220, 168, 0.055)");
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlight;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h * 0.32);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const lowerEdge = ctx.createLinearGradient(0, bounds.y + bounds.h * 0.72, 0, bounds.y + bounds.h);
    lowerEdge.addColorStop(0, "rgba(31, 17, 10, 0)");
    lowerEdge.addColorStop(1, "rgba(31, 17, 10, 0.19)");
    ctx.fillStyle = lowerEdge;
    ctx.fillRect(bounds.x, bounds.y + bounds.h * 0.7, bounds.w, bounds.h * 0.3);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.19;
    const edgePattern = ctx.createPattern(createTextureTile(seed + 211, 96), "repeat");
    if (edgePattern) {
      ctx.fillStyle = edgePattern;
      const openingRight = opening.x + opening.w;
      const openingBottom = opening.y + opening.h;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, Math.max(0, opening.y - bounds.y));
      ctx.fillRect(bounds.x, openingBottom, bounds.w, Math.max(0, bounds.y + bounds.h - openingBottom));
      ctx.fillRect(bounds.x, opening.y, Math.max(0, opening.x - bounds.x), opening.h);
      ctx.fillRect(openingRight, opening.y, Math.max(0, bounds.x + bounds.w - openingRight), opening.h);
    }
    ctx.restore();

    ctx.restore();

    ctx.save();
    buildStripPath(ctx, bounds, radius);
    ctx.lineWidth = Math.max(0.65, frameW * 0.0022);
    ctx.strokeStyle = "rgba(255, 220, 165, 0.22)";
    ctx.shadowColor = "rgba(255, 213, 151, 0.12)";
    ctx.shadowBlur = Math.max(2, frameW * 0.008);
    ctx.stroke();
    ctx.restore();
  }

  function drawStructureOverlay(ctx, geometry) {
    ctx.save();
    ctx.lineWidth = Math.max(1, geometry.scale * 0.003);
    ctx.setLineDash([geometry.scale * 0.014, geometry.scale * 0.009]);
    roundedRect(ctx, geometry.outer.x, geometry.outer.y, geometry.outer.width, geometry.outer.height, geometry.outer.radius);
    ctx.strokeStyle = "rgba(222,72,45,0.95)";
    ctx.stroke();
    roundedRect(ctx, geometry.opening.x, geometry.opening.y, geometry.opening.width, geometry.opening.height, geometry.opening.radius);
    ctx.strokeStyle = "rgba(23,111,119,0.95)";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `700 ${Math.max(10, Math.round(geometry.scale * 0.016))}px ui-monospace, monospace`;
    ctx.fillStyle = "rgba(222,72,45,0.95)";
    ctx.fillText("FILM", geometry.outer.x + 5, geometry.outer.y - 7);
    ctx.fillStyle = "rgba(23,111,119,0.95)";
    ctx.fillText("EXPOSURE", geometry.opening.x + 5, geometry.opening.y + 17);
    ctx.restore();
  }

  function renderFrame(canvas, image, styleId, options = {}) {
    const style = STYLE_DEFINITIONS[styleId];
    if (!style) return;

    const cssWidth = Math.max(260, Math.round(options.width || canvas.clientWidth || 420));
    const cssHeight = Math.max(260, Math.round(options.height || cssWidth * 0.78));
    const dpr = clamp(options.dpr || window.devicePixelRatio || 1, 1, 2);
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.aspectRatio = `${cssWidth} / ${cssHeight}`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const filmFormat = options.filmFormat || "135";
    const formatSeed = stableStringHash(filmFormat) % 100000;
    const renderSeed = style.seed + formatSeed;
    drawSceneBackground(ctx, cssWidth, cssHeight, renderSeed);

    const previewScale = clamp(options.previewScale ?? 1, 0.72, 1.18);
    const pose = options.pose || style.defaultPose;
    const rotation = clamp(pose.rotation ?? style.defaultPose.rotation, -6, 6);
    const lift = clamp(pose.lift ?? 0, -0.2, 1);

    ctx.save();
    ctx.translate(cssWidth / 2, cssHeight / 2 - cssHeight * 0.01 - lift * cssHeight * 0.018);
    ctx.scale(previewScale, previewScale);
    ctx.rotate((rotation * Math.PI) / 180);

    const geometry = getFrameGeometry(styleId, { width: cssWidth, height: cssHeight });
    const inputMode = filmFormat === "half-uncropped" ? "uncropped" : "cropped";
    const formatId = filmFormat.startsWith("half-") ? "half" : filmFormat;
    const sampleOptions = FilmFrame.createSingleFrameOptions({
      formatId,
      inputMode,
      frameW: 100,
      frameNumber: 12,
      stock: DEMO_FILM_STOCK,
    });
    const frameW = Math.min(
      geometry.outer.width * 100 / sampleOptions.stripW,
      geometry.outer.height * 100 / sampleOptions.stripH,
    );
    const filmOptions = FilmFrame.createSingleFrameOptions({
      formatId,
      inputMode,
      frameW,
      frameNumber: 12,
      stock: DEMO_FILM_STOCK,
    });
    const item = {
      id: "demo-film-frame",
      source: image,
      width: image?.width || 1,
      height: image?.height || 1,
    };
    const stripBounds = {
      x: -filmOptions.stripW / 2,
      y: -filmOptions.stripH / 2,
      w: filmOptions.stripW,
      h: filmOptions.stripH,
    };
    const stripRadius = filmOptions.is120 ? Math.max(1, frameW * 0.004) : Math.max(2, frameW * 0.015);

    drawFilmShadow(ctx, stripBounds, stripRadius, frameW);
    const result = FilmFrame.renderSingleFrame(ctx, item, filmOptions);
    drawFilmSurface(ctx, result, stripRadius, frameW, renderSeed);

    if (options.showStructure) {
      drawStructureOverlay(ctx, {
        outer: {
          x: result.stripBounds.x,
          y: result.stripBounds.y,
          width: result.stripBounds.w,
          height: result.stripBounds.h,
          radius: stripRadius,
        },
        opening: {
          x: result.frameGeometry.central.x,
          y: result.frameGeometry.central.y,
          width: result.frameGeometry.central.w,
          height: result.frameGeometry.central.h,
          radius: Math.max(1, frameW * 0.008),
        },
        scale: frameW,
      });
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    drawVignette(ctx, cssWidth, cssHeight, 0.075);
    ctx.restore();
  }

  window.FilmFrameStyles = Object.freeze({
    STYLE_DEFINITIONS,
    FILM_FORMATS: FilmFrame.FORMATS,
    getFilmFormat: FilmFrame.getFormat,
    getFilmInputAdapter: FilmFrame.getInputAdapter,
    renderFrame,
    getFrameGeometry,
    primitives: Object.freeze({
      clamp,
      deterministicNoise: FilmFrame135.deterministicNoise,
    }),
  });
})();
