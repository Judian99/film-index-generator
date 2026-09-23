(() => {
  "use strict";

  const MM_PER_INCH = 25.4;

  const PAGE_A4_MM = Object.freeze({
    portrait: Object.freeze({ w: 210, h: 297 }),
    landscape: Object.freeze({ w: 297, h: 210 }),
  });

  // 自包含 CRC32（与 app.js 内实现相同，重复以支持 Node 独立单测）
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

  function updateCrc32(crc, bytes) {
    let value = crc;
    for (let index = 0; index < bytes.length; index += 1) {
      value = CRC32_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8);
    }
    return value;
  }

  function encodeAscii(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
    return bytes;
  }

  // PNG chunk：length(4 BE) | type(4) | data | crc32(4 BE)，总长 12 + data.length
  function buildPngChunk(type, data = new Uint8Array()) {
    const typeBytes = encodeAscii(type);
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

  // 渲染密度（含校准），仅用于几何：300DPI/k=1 → 11.811 px/mm
  function getPxPerMm(dpi, calibration = 1) {
    return (dpi / MM_PER_INCH) * calibration;
  }

  // pHYs 密度（像素/米，含校准）：300DPI/k=1 → 11811
  function dpiToPxPerMeter(dpi, calibration = 1) {
    return Math.round((dpi / MM_PER_INCH) * 1000 * calibration);
  }

  // pHYs：x/y 像素密度(各 4 BE) + unit(1=米)，chunk 总长 21
  function buildPhysChunk(pxPerMeter) {
    const data = new Uint8Array(9);
    const view = new DataView(data.buffer);
    view.setUint32(0, pxPerMeter, false);
    view.setUint32(4, pxPerMeter, false);
    data[8] = 1;
    return buildPngChunk("pHYs", data);
  }

  // 在 PNG 字节流指定偏移（默认 33 = 签名 8 + IHDR 25）处插入 chunk
  function injectPngChunk(bytes, chunk, offset = 33) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const inserted = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    const out = new Uint8Array(source.length + inserted.length);
    out.set(source.subarray(0, offset), 0);
    out.set(inserted, offset);
    out.set(source.subarray(offset), offset + inserted.length);
    return out;
  }

  function isJfifApp0At(bytes, at) {
    return bytes[at] === 0xff && bytes[at + 1] === 0xe0
      && bytes[at + 4] === 0x4a // J
      && bytes[at + 5] === 0x46 // F
      && bytes[at + 6] === 0x49 // I
      && bytes[at + 7] === 0x46 // F
      && bytes[at + 8] === 0x00;
  }

  // 扫描 SOI 之后、SOS 之前的 JFIF APP0，返回偏移；无则 -1
  function scanJfifApp0(bytes) {
    if (isJfifApp0At(bytes, 2)) return 2;
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      const marker = (bytes[offset] << 8) | bytes[offset + 1];
      if (marker === 0xffda || (marker & 0xff00) !== 0xff00) break;
      const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (size < 2) break;
      offset += 2 + size;
      if (isJfifApp0At(bytes, offset)) return offset;
    }
    return -1;
  }

  function buildJfifApp0(dpi) {
    // 无缩略图：marker + length(16) + "JFIF\0" + ver 1.1 + units=1(inch) + X/Y + 缩略图 0×0
    const segment = new Uint8Array(18);
    const view = new DataView(segment.buffer);
    view.setUint16(0, 0xffe0, false);
    view.setUint16(2, 16, false);
    segment.set([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01], 4);
    view.setUint16(12, dpi, false);
    view.setUint16(14, dpi, false);
    return segment;
  }

  // JPEG 密度补丁：有 JFIF APP0 则就地改写（长度不变），无则在 SOI 后插入（+18 字节）
  function patchJpegDensity(input, dpi) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return { bytes, changed: false };
    }

    const at = scanJfifApp0(bytes);
    if (at >= 0) {
      const out = bytes.slice();
      out[at + 11] = 1; // units = dots/inch
      new DataView(out.buffer).setUint16(at + 12, dpi, false);
      new DataView(out.buffer).setUint16(at + 14, dpi, false);
      return { bytes: out, changed: true };
    }

    return { bytes: injectPngChunk(bytes, buildJfifApp0(dpi), 2), changed: true };
  }

  // n·slot + (n−1)·gap ≤ container
  function fitColumns(containerMm, slotWMm, gapMm) {
    return Math.max(1, Math.floor((containerMm + gapMm) / (slotWMm + gapMm)));
  }

  function fitRows(containerMm, stripHMm, rowGapMm) {
    return Math.max(1, Math.floor((containerMm + rowGapMm) / (stripHMm + rowGapMm)));
  }

  // 各行在整幅画布上的绝对 y。A4 模式页间额外缝隙 = 页高 − 安全区，落在此处不切帧
  function planRowYs(rowCount, {
    isA4 = false,
    pageHPx = 0,
    marginPx = 0,
    sheetPadPx = 0,
    stripHPx,
    rowGapPx,
    rowsPerPage = 0,
  }) {
    const ys = [];
    for (let r = 0; r < rowCount; r += 1) {
      if (!isA4) {
        ys.push(sheetPadPx + r * (stripHPx + rowGapPx));
      } else {
        const pageIndex = Math.floor(r / rowsPerPage);
        const inPage = r % rowsPerPage;
        ys.push(pageIndex * pageHPx + marginPx + inPage * (stripHPx + rowGapPx));
      }
    }
    return ys;
  }

  window.PrintPhysical = Object.freeze({
    MM_PER_INCH,
    PAGE_A4_MM,
    updateCrc32,
    buildPngChunk,
    getPxPerMm,
    dpiToPxPerMeter,
    buildPhysChunk,
    injectPngChunk,
    patchJpegDensity,
    fitColumns,
    fitRows,
    planRowYs,
  });
})();
