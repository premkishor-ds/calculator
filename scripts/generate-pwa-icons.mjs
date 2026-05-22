#!/usr/bin/env node
// scripts/generate-pwa-icons.mjs
// Generates all required PWA icon PNGs using only Node.js built-ins.
// Produces a blue square with a white "V" mark. Replace with real branding before launch.

import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG = [59, 130, 246];   // #3b82f6 blue
const FG = [255, 255, 255];  // white

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function adler32(buf) {
  let s1 = 1, s2 = 0;
  for (let i = 0; i < buf.length; i++) { s1 = (s1 + buf[i]) % 65521; s2 = (s2 + s1) % 65521; }
  return ((s2 << 16) | s1) >>> 0;  // unsigned 32-bit
}

function makePNG(size, maskable) {
  const pad = Math.floor(size * (maskable ? 0.1 : 0.15));
  const inner = size - pad * 2;
  const stroke = inner * 0.09;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // PNG filter byte
    for (let x = 0; x < size; x++) {
      const nx = (x - pad) / inner;
      const ny = (y - pad) / inner;
      let px = BG;
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        const leftDist  = Math.abs(ny - nx * 2) * inner;
        const rightDist = Math.abs(ny - (1 - nx) * 2) * inner;
        if (leftDist < stroke || rightDist < stroke) px = FG;
      }
      row.push(px[0], px[1], px[2]);
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);
  const deflated = deflateSync(raw, { level: 6 });

  // Wrap in zlib envelope (CMF + FLG + data + Adler32)
  const zlib = Buffer.alloc(2 + deflated.length + 4);
  zlib[0] = 0x78; zlib[1] = 0x9C;
  deflated.copy(zlib, 2);
  zlib.writeUInt32BE(adler32(raw), 2 + deflated.length);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdrData),
    chunk('IDAT', zlib),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of SIZES) {
  writeFileSync(join(OUT, `icon-${size}.png`), makePNG(size, false));
  console.log(`✓ icon-${size}.png`);
}
for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-maskable-${size}.png`), makePNG(size, true));
  console.log(`✓ icon-maskable-${size}.png`);
}
console.log('\n✅ PWA icons generated in public/icons/');
console.log('💡 Replace with real branded icons before production.');
