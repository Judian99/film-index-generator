(() => {
  "use strict";

  const MAX_BACKING_SIZE = 1024;

  function createRenderer(canvas) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Optical loupe Canvas 2D context unavailable.");
    let backingSize = 0;

    function resize(nextCssDiameter, nextDpr) {
      const cssDiameter = Math.max(1, nextCssDiameter);
      const dpr = Math.max(1, Math.min(2, nextDpr || 1));
      const nextBackingSize = Math.min(MAX_BACKING_SIZE, Math.round(cssDiameter * dpr));
      canvas.style.width = `${cssDiameter}px`;
      canvas.style.height = `${cssDiameter}px`;
      if (nextBackingSize !== backingSize) {
        backingSize = nextBackingSize;
        canvas.width = backingSize;
        canvas.height = backingSize;
      }
      context.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
    }

    function clear() {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Tile 已按当前倍率渲染；直接取中心区域 1:1 绘制，不做任何径向重映射或凸透镜畸变。
    function draw(model) {
      clear();
      const tile = model && model.tile;
      if (!tile || !tile.width || !tile.height || !backingSize) return false;

      const sourceSize = Math.min(backingSize, tile.width, tile.height);
      const sourceX = (tile.width - sourceSize) / 2;
      const sourceY = (tile.height - sourceSize) / 2;

      context.save();
      context.beginPath();
      context.arc(backingSize / 2, backingSize / 2, backingSize / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(
        tile,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        backingSize,
        backingSize,
      );
      context.restore();
      return true;
    }

    function backingSizeFn() {
      return backingSize;
    }

    return Object.freeze({ resize, draw, clear, backingSize: backingSizeFn });
  }

  window.OpticalLoupe = Object.freeze({ createRenderer });
})();
