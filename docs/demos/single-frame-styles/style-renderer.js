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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    FilmFrame135.roundedRect(ctx, x, y, width, height, radius);
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

  function drawSceneBackground(ctx, width, height) {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#d8d2c6");
    base.addColorStop(0.48, "#eeeae1");
    base.addColorStop(1, "#c8c1b4");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(66, 60, 51, 0.22)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(width * 0.48, height * 0.42, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "rgba(255,255,255,0.14)");
    vignette.addColorStop(1, "rgba(64,54,43,0.14)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
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
    drawSceneBackground(ctx, cssWidth, cssHeight);

    const previewScale = clamp(options.previewScale ?? 1, 0.72, 1.18);
    const pose = options.pose || style.defaultPose;
    const rotation = clamp(pose.rotation ?? style.defaultPose.rotation, -6, 6);
    const lift = clamp(pose.lift ?? 0, -0.2, 1);

    ctx.save();
    ctx.translate(cssWidth / 2, cssHeight / 2 - cssHeight * 0.01 - lift * cssHeight * 0.018);
    ctx.scale(previewScale, previewScale);
    ctx.rotate((rotation * Math.PI) / 180);

    const geometry = getFrameGeometry(styleId, { width: cssWidth, height: cssHeight });
    const filmFormat = options.filmFormat || "135";
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
    const result = FilmFrame.renderSingleFrame(ctx, item, filmOptions);

    if (options.showStructure) {
      drawStructureOverlay(ctx, {
        outer: {
          x: result.stripBounds.x,
          y: result.stripBounds.y,
          width: result.stripBounds.w,
          height: result.stripBounds.h,
          radius: filmOptions.is120 ? Math.max(1, frameW * 0.004) : Math.max(2, frameW * 0.015),
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
