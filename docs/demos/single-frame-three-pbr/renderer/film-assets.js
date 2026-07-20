import * as THREE from "../vendor/three.module.js";

const STOCK = Object.freeze({
  edgeText: "PORTRA 400",
  edgePresets: ["KODAK", "C-41"],
  edgePresets120: ["120", "SAFETY FILM"],
  frameNumberStyle: "N/NA",
  sprocketsIn120: false,
  edgeInk: { color: "rgba(230,154,36,.94)", glow: "rgba(255,170,45,.28)" },
});
const BASE_SEED = 4813;

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function roundedPath(x, y, width, height, radius) {
  const path = new THREE.Path();
  const r = Math.min(radius, width / 2, height / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function createStripShape(width, height, radius) {
  const shape = new THREE.Shape();
  const path = roundedPath(-width / 2, -height / 2, width, height, radius);
  shape.curves = path.curves;
  shape.currentPoint.copy(path.currentPoint);
  return shape;
}

function addRoundedHole(shape, x, y, width, height, radius) {
  const hole = roundedPath(x, y, width, height, radius);
  shape.holes.push(hole);
}

function applyBow(geometry, width, height, amount = 0.018) {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const nx = THREE.MathUtils.clamp(x / (width / 2), -1, 1);
    const ny = THREE.MathUtils.clamp(y / (height / 2), -1, 1);
    const bow = amount * (nx * nx - 0.34) + amount * 0.22 * ny * ny + amount * 0.08 * nx * ny;
    positions.setZ(i, positions.getZ(i) + bow);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createNoiseTexture(seed, size, mode = "roughness") {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const fine = FilmFrame135.deterministicNoise(seed + x * 0.173 + y * 0.619);
      const broad = FilmFrame135.deterministicNoise(seed + Math.floor(x / 10) * 3.1 + Math.floor(y / 10) * 5.7);
      const scratch = y % 31 === Math.floor(fine * 5) ? 0.08 : 0;
      const value = mode === "bump"
        ? Math.round(116 + fine * 24 + broad * 10 + scratch * 255)
        : Math.round(132 + fine * 50 + broad * 34 - scratch * 180);
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 1.5);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function coverDraw(ctx, source, x, y, width, height) {
  const sourceWidth = source?.width || source?.naturalWidth || 1;
  const sourceHeight = source?.height || source?.naturalHeight || 1;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function createImageTexture(source, ratio, maxSide) {
  const longSide = Math.min(maxSide, 1600);
  const width = ratio >= 1 ? longSide : Math.round(longSide * ratio);
  const height = ratio >= 1 ? Math.round(longSide / ratio) : longSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(320, width);
  canvas.height = Math.max(320, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#16120e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (source) coverDraw(ctx, source, 0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createEdgeTexture(options, width, height) {
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(512, Math.round(options.stripW * scale));
  canvas.height = Math.max(180, Math.round(options.stripH * scale));
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
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
  if (options.is120) {
    FilmFrame.drawEdgeTextTop120(ctx, 0, 0, options.stripW, rowInfo, options);
    FilmFrame.drawEdgeTextBottom120(ctx, 0, options.stripH - options.textH, options.stripW, rowInfo, 0, options);
  } else {
    FilmFrame135.drawEdgeTextTop(ctx, 0, 0, options.stripW, rowInfo, 0, options);
    FilmFrame135.drawEdgeTextBottom(ctx, 0, options.stripH - options.textH, options.stripW, rowInfo, options);
  }

  const output = document.createElement("canvas");
  output.width = 1024;
  output.height = Math.max(256, Math.round(1024 * height / width));
  const out = output.getContext("2d");
  out.clearRect(0, 0, output.width, output.height);
  out.drawImage(canvas, 0, 0, output.width, output.height);

  const pixels = out.getImageData(0, 0, output.width, output.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] < 4) pixels.data[i + 3] = 0;
  }
  out.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(output);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadowTexture(seed) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(32,22,16,.46)");
  gradient.addColorStop(0.36, "rgba(42,30,21,.24)");
  gradient.addColorStop(0.72, "rgba(45,32,22,.07)");
  gradient.addColorStop(1, "rgba(45,32,22,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 180; i += 1) {
    const x = FilmFrame135.deterministicNoise(seed + i * 3.7) * size;
    const y = FilmFrame135.deterministicNoise(seed + i * 7.1) * size;
    ctx.fillStyle = `rgba(0,0,0,${FilmFrame135.deterministicNoise(seed + i * 11.3) * 0.035})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStructureGroup(width, height, openingWidth, openingHeight, z) {
  const group = new THREE.Group();
  const materialOuter = new THREE.LineDashedMaterial({ color: 0xe34f32, dashSize: 0.08, gapSize: 0.045, depthTest: false });
  const materialOpening = new THREE.LineDashedMaterial({ color: 0x16737c, dashSize: 0.08, gapSize: 0.045, depthTest: false });
  const outer = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-width / 2, -height / 2, z), new THREE.Vector3(width / 2, -height / 2, z),
    new THREE.Vector3(width / 2, height / 2, z), new THREE.Vector3(-width / 2, height / 2, z),
  ]), materialOuter);
  const opening = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-openingWidth / 2, -openingHeight / 2, z + 0.001), new THREE.Vector3(openingWidth / 2, -openingHeight / 2, z + 0.001),
    new THREE.Vector3(openingWidth / 2, openingHeight / 2, z + 0.001), new THREE.Vector3(-openingWidth / 2, openingHeight / 2, z + 0.001),
  ]), materialOpening);
  outer.computeLineDistances();
  opening.computeLineDistances();
  group.add(outer, opening);
  group.renderOrder = 20;
  return group;
}

function disposeObject(object) {
  if (!object) return;
  object.traverse(child => {
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    materials.forEach(material => {
      ["map", "roughnessMap", "bumpMap", "alphaMap"].forEach(key => material[key]?.dispose());
      material.dispose();
    });
  });
}

export function buildFilmAssets({ source, filmFormat, maxTextureSize = 2048 }) {
  const formatId = filmFormat.startsWith("half-") ? "half" : filmFormat;
  const inputMode = filmFormat === "half-uncropped" ? "uncropped" : "cropped";
  const format = FilmFrame.getFormat(formatId);
  const adapter = FilmFrame.getInputAdapter(formatId, inputMode);
  const options = FilmFrame.createSingleFrameOptions({
    formatId,
    inputMode,
    frameW: 100,
    frameNumber: 12,
    stock: STOCK,
  });
  const physicalOpeningHeight = format.family === "120" ? format.imageHeightMm : 24;
  const physicalOpeningWidth = adapter.slotRatio * physicalOpeningHeight;
  const unitsPerPixel = physicalOpeningWidth / options.slotW * 0.1;
  const width = options.stripW * unitsPerPixel;
  const height = options.stripH * unitsPerPixel;
  const openingWidth = options.slotW * unitsPerPixel;
  const openingHeight = options.slotH * unitsPerPixel;
  const thickness = 0.034;
  const radius = format.family === "120" ? 0.025 : 0.07;
  const seed = BASE_SEED + stableHash(filmFormat) % 100000;
  const shape = createStripShape(width, height, radius);
  addRoundedHole(shape, -openingWidth / 2, -openingHeight / 2, openingWidth, openingHeight, Math.min(0.045, openingHeight * 0.012));

  if (options.showSprockets) {
    const pitch = FilmFrame135.FILM_135.sprocketPitchMm * 0.1;
    const holeWidth = FilmFrame135.FILM_135.sprocketHoleWidthMm * 0.1;
    const holeHeight = Math.max(0.14, options.sprocketH * options.tune.holeH * unitsPerPixel);
    const count = Math.max(1, Math.floor(width / pitch));
    const used = (count - 1) * pitch;
    const startX = -used / 2 - holeWidth / 2;
    const inset = Math.max(0.055, (height - openingHeight) * 0.12);
    for (let i = 0; i < count; i += 1) {
      const x = startX + i * pitch;
      addRoundedHole(shape, x, height / 2 - inset - holeHeight, holeWidth, holeHeight, holeWidth * 0.14);
      addRoundedHole(shape, x, -height / 2 + inset, holeWidth, holeHeight, holeWidth * 0.14);
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.008,
    curveSegments: 5,
  });
  geometry.translate(0, 0, -thickness / 2);
  applyBow(geometry, width, height);

  const roughnessMap = createNoiseTexture(seed + 101, 192, "roughness");
  const bumpMap = createNoiseTexture(seed + 211, 192, "bump");
  const filmMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x130a07),
    metalness: 0,
    roughness: 0.48,
    roughnessMap,
    bumpMap,
    bumpScale: 0.012,
    clearcoat: 0.2,
    clearcoatRoughness: 0.52,
    sheen: 0.2,
    sheenColor: new THREE.Color(0x9b552a),
    sheenRoughness: 0.72,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(geometry, filmMaterial);
  body.castShadow = true;
  body.receiveShadow = true;

  const imageGeometry = applyBow(new THREE.PlaneGeometry(openingWidth * 0.992, openingHeight * 0.992, 48, 24), width, height);
  imageGeometry.translate(0, 0, -0.009);
  const imageTexture = createImageTexture(source, adapter.slotRatio, maxTextureSize);
  const imageMaterial = new THREE.MeshBasicMaterial({ map: imageTexture, side: THREE.DoubleSide, toneMapped: false });
  const image = new THREE.Mesh(imageGeometry, imageMaterial);
  image.receiveShadow = true;

  const overlayGeometry = applyBow(new THREE.PlaneGeometry(width * 0.994, height * 0.994, 64, 16), width, height);
  overlayGeometry.translate(0, 0, thickness / 2 + 0.011);
  const edgeTexture = createEdgeTexture(options, width, height);
  const overlayMaterial = new THREE.MeshBasicMaterial({ map: edgeTexture, transparent: true, alphaTest: 0.04, depthWrite: false, toneMapped: false });
  const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
  overlay.renderOrder = 8;

  const structure = createStructureGroup(width, height, openingWidth, openingHeight, thickness / 2 + 0.026);
  structure.visible = false;

  const group = new THREE.Group();
  group.add(body, image, overlay, structure);

  const contactTexture = createContactShadowTexture(seed + 307);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.52, depthWrite: false, toneMapped: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.18, height * 1.45), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;

  return {
    group,
    contact,
    structure,
    dimensions: { width, height, openingWidth, openingHeight },
    options,
    format,
    adapter,
    dispose() {
      disposeObject(group);
      disposeObject(contact);
    },
  };
}

export function createTableTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const fine = FilmFrame135.deterministicNoise(9001 + x * 0.39 + y * 0.73);
      const line = y % 18 === 0 ? -5 : 0;
      data[i] = 190 + Math.round(fine * 16) + line;
      data[i + 1] = 183 + Math.round(fine * 14) + line;
      data[i + 2] = 171 + Math.round(fine * 12) + line;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
