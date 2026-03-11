/**
 * VedaClue Icon Generator
 * Generates PWA icons (192x192, 512x512) and apple-touch-icon (180x180)
 * using only Node.js built-ins (zlib + CRC32) — no external dependencies needed.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/client/public');
mkdirSync(OUT, { recursive: true });

// ─── CRC32 table ─────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  return Buffer.concat([u32be(data.length), typeBuf, data, u32be(crc)]);
}

// ─── Colour helpers ───────────────────────────────────────────────
// Rose-500 → Pink-600 gradient palette
const COLORS = {
  bg1:   [244,  63,  94],  // #F43F5E  rose-500
  bg2:   [219,  39, 119],  // #DB2777  pink-600
  bg3:   [236,  72, 153],  // #EC4899  pink-500
  white: [255, 255, 255],
  petal: [253, 242, 248],  // rose-50
  stem:  [251, 207, 232],  // pink-200
};

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRGB(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

// ─── Pixel renderer ──────────────────────────────────────────────
function renderIcon(size) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2;

  // RGBA pixel array
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      // Circle mask (rounded icon)
      if (dist > r) {
        pixels[idx + 3] = 0; // transparent outside circle
        continue;
      }

      // Radial gradient background: rose → pink
      const tBg = dist / r;
      const bgColor = lerpRGB(COLORS.bg1, lerpRGB(COLORS.bg2, COLORS.bg3, tBg * 0.5), tBg);

      // Normalised coords [-1, 1]
      const nx = dx / r, ny = dy / r;

      // ── Draw a lotus / leaf motif ──────────────────────────
      // Three overlapping petals + centre dot
      const petal = (ox, oy, rx, ry) => {
        const pdx = nx - ox, pdy = ny - oy;
        return (pdx * pdx) / (rx * rx) + (pdy * pdy) / (ry * ry) < 1;
      };

      const petalAlpha = 0.88;
      const isTopPetal     = petal(0,    -0.25, 0.22, 0.38);
      const isLeftPetal    = petal(-0.22, 0.12, 0.22, 0.28);
      const isRightPetal   = petal( 0.22, 0.12, 0.22, 0.28);
      const isBottomPetal  = petal( 0,    0.30, 0.15, 0.22);
      const isCentre       = dist < r * 0.18;
      const isLightCentre  = dist < r * 0.25;

      // Stem: narrow vertical rectangle
      const isStem = Math.abs(nx) < 0.06 && ny > 0.28 && ny < 0.65;

      let [pr, pg, pb, pa] = [...bgColor, 255];

      if (isTopPetal || isLeftPetal || isRightPetal || isBottomPetal) {
        // Petals: translucent white-rose
        const pCol = lerpRGB(COLORS.petal, COLORS.white, 0.4);
        pr = Math.round(lerp(bgColor[0], pCol[0], petalAlpha));
        pg = Math.round(lerp(bgColor[1], pCol[1], petalAlpha));
        pb = Math.round(lerp(bgColor[2], pCol[2], petalAlpha));
      }

      if (isStem) {
        pr = Math.round(lerp(bgColor[0], COLORS.stem[0], 0.7));
        pg = Math.round(lerp(bgColor[1], COLORS.stem[1], 0.7));
        pb = Math.round(lerp(bgColor[2], COLORS.stem[2], 0.7));
      }

      if (isLightCentre) {
        const blend = isLightCentre ? 0.5 : 0;
        pr = Math.round(lerp(pr, 255, blend));
        pg = Math.round(lerp(pg, 255, blend));
        pb = Math.round(lerp(pb, 255, blend));
      }

      if (isCentre) {
        pr = 255; pg = 255; pb = 255;
      }

      // Soft inner glow at top
      const glowT = Math.max(0, 1 - (dist / (r * 0.6)));
      pr = Math.min(255, Math.round(pr + 20 * glowT));
      pg = Math.min(255, Math.round(pg + 10 * glowT));
      pb = Math.min(255, Math.round(pb + 15 * glowT));

      // Anti-alias edge
      const edge = Math.max(0, Math.min(1, (r - dist) / 1.5));
      pixels[idx]     = pr;
      pixels[idx + 1] = pg;
      pixels[idx + 2] = pb;
      pixels[idx + 3] = Math.round(255 * edge);
    }
  }
  return pixels;
}

// ─── PNG encoder ─────────────────────────────────────────────────
function encodePNG(size, pixels) {
  // IHDR: width, height, bitdepth=8, colortype=6(RGBA), compress=0, filter=0, interlace=0
  const ihdr = Buffer.concat([u32be(size), u32be(size), Buffer.from([8, 6, 0, 0, 0])]);

  // Raw scanlines with filter byte 0 prepended to each row
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    scanlines[rowOffset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = rowOffset + 1 + x * 4;
      scanlines[dst]     = pixels[src];
      scanlines[dst + 1] = pixels[src + 1];
      scanlines[dst + 2] = pixels[src + 2];
      scanlines[dst + 3] = pixels[src + 3];
    }
  }

  const idat = deflateSync(scanlines, { level: 9 });
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Generate all sizes ───────────────────────────────────────────
const sizes = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png',       size: 32  },
];

for (const { name, size } of sizes) {
  const pixels = renderIcon(size);
  const png = encodePNG(size, pixels);
  const outPath = join(OUT, name);
  writeFileSync(outPath, png);
  console.log(`✅  Generated ${outPath} (${png.length} bytes)`);
}

console.log('\n🌸  VedaClue icons generated successfully!\n');
