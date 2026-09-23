import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const source = await readFile(new URL("../print-physical.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const P = sandbox.window.PrintPhysical;

function u16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

const ascii = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0));

// 标准 JFIF APP0（18 字节，units=0，density=1×1）
const JFIF_APP0 = Uint8Array.from([
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
  0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
]);
const SOS = Uint8Array.from([0xff, 0xda, 0x00, 0x02]);
const SOI = Uint8Array.from([0xff, 0xd8]);

test("dpiToPxPerMeter 标称与校准值", () => {
  assert.equal(P.dpiToPxPerMeter(300), 11811);
  assert.equal(P.dpiToPxPerMeter(150), 5906);
  assert.equal(P.dpiToPxPerMeter(600), 23622);
  assert.equal(P.dpiToPxPerMeter(300, 0.97), 11457);
});

test("getPxPerMm 渲染密度", () => {
  assert.ok(Math.abs(P.getPxPerMm(300) - 300 / 25.4) < 1e-12);
  assert.ok(Math.abs(P.getPxPerMm(300, 0.97) - (300 / 25.4) * 0.97) < 1e-12);
});

test("buildPhysChunk 字节布局与 CRC", () => {
  const chunk = P.buildPhysChunk(11811);
  const bytes = new Uint8Array(chunk);
  assert.equal(chunk.byteLength, 21);
  assert.equal(u32(bytes, 0), 9);
  assert.deepEqual(bytes.subarray(4, 8), ascii("pHYs"));
  assert.equal(u32(bytes, 8), 11811);
  assert.equal(u32(bytes, 12), 11811);
  assert.equal(bytes[16], 1);
  const data = bytes.subarray(8, 17);
  let crc = P.updateCrc32(0xffffffff, ascii("pHYs"));
  crc = P.updateCrc32(crc, data);
  assert.equal(u32(bytes, 17), (crc ^ 0xffffffff) >>> 0);
});

test("injectPngChunk 偏移与内容保持", () => {
  const sourceBytes = Uint8Array.from({ length: 40 }, (_, i) => i);
  const inserted = Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd, 0xee]);
  const out = P.injectPngChunk(sourceBytes, inserted, 33);
  assert.equal(out.length, 45);
  assert.deepEqual(Array.from(out.subarray(0, 33)), Array.from(sourceBytes.subarray(0, 33)));
  assert.deepEqual(Array.from(out.subarray(33, 38)), [0xaa, 0xbb, 0xcc, 0xdd, 0xee]);
  assert.deepEqual(Array.from(out.subarray(38)), Array.from(sourceBytes.subarray(33)));
});

test("patchJpegDensity 已有 JFIF 时就地改写且长度不变", () => {
  const jpeg = new Uint8Array([...SOI, ...JFIF_APP0, ...SOS]);
  const { bytes, changed } = P.patchJpegDensity(jpeg, 300);
  assert.equal(changed, true);
  assert.equal(bytes.length, jpeg.length);
  // APP0 起始偏移 2：units 在 13、密度在 14-15
  assert.equal(bytes[13], 1);
  assert.equal(u16(bytes, 14), 300);
  assert.equal(u16(bytes, 16), 300);
});

test("patchJpegDensity 无 APP0 时在 SOI 后插入 18 字节", () => {
  // SOI + APP1(Exif, length 8) + SOS
  const app1 = Uint8Array.from([0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  const jpeg = new Uint8Array([...SOI, ...app1, ...SOS]);
  const { bytes, changed } = P.patchJpegDensity(jpeg, 291);
  assert.equal(changed, true);
  assert.equal(bytes.length, jpeg.length + 18);
  assert.equal(u16(bytes, 2), 0xffe0);
  assert.equal(bytes[13], 1);
  assert.equal(u16(bytes, 14), 291);
  // APP1 整体后移 18 字节
  assert.deepEqual(Array.from(bytes.subarray(20, 20 + app1.length)), Array.from(app1));
});

test("patchJpegDensity 非 JPEG 输入不改动", () => {
  const notJpeg = Uint8Array.from([0x00, 0x00, 0xff, 0xe0]);
  const { bytes, changed } = P.patchJpegDensity(notJpeg, 300);
  assert.equal(changed, false);
  assert.deepEqual(Array.from(bytes), Array.from(notJpeg));
});

test("fitColumns 含等号边界", () => {
  // 2 列：60 + 10 = 70；3 列需 110
  assert.equal(P.fitColumns(100, 30, 10), 2);
  assert.equal(P.fitColumns(110, 30, 10), 3);
});

test("fitRows 含等号边界", () => {
  assert.equal(P.fitRows(100, 40, 10), 2);
  assert.equal(P.fitRows(140, 40, 10), 3);
});

test("planRowYs free 模式紧密排布", () => {
  const ys = P.planRowYs(3, {
    isA4: false, sheetPadPx: 77, stripHPx: 100, rowGapPx: 59,
  });
  assert.deepEqual(Array.from(ys), [77, 236, 395]);
});

test("planRowYs A4 模式页间锚定", () => {
  const ys = P.planRowYs(9, {
    isA4: true, pageHPx: 3508, marginPx: 94,
    stripHPx: 400, rowGapPx: 59, rowsPerPage: 7,
  });
  assert.equal(ys[0], 94);
  assert.equal(ys[6], 94 + 6 * 459);
  // 第 8 行进入第二页
  assert.equal(ys[7], 3508 + 94);
  assert.equal(ys[8], 3508 + 94 + 459);
});

test("PAGE_A4_MM 尺寸", () => {
  assert.equal(P.PAGE_A4_MM.portrait.w, 210);
  assert.equal(P.PAGE_A4_MM.portrait.h, 297);
  assert.equal(P.PAGE_A4_MM.landscape.w, 297);
  assert.equal(P.PAGE_A4_MM.landscape.h, 210);
});
