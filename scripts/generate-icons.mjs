/**
 * Generates FinTrack favicon and PWA icons using Playwright.
 * Run: node scripts/generate-icons.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

// ── Logo SVG ────────────────────────────────────────────────────────────────
// FT monogram in a rounded square, indigo gradient + subtle sparkline
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#3730A3"/>
    </linearGradient>
    <clipPath id="clip">
      <rect width="100" height="100" rx="22"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="100" height="100" rx="22" fill="url(#g)"/>

  <!-- Subtle inner glow at top -->
  <ellipse cx="50" cy="-10" rx="55" ry="40" fill="rgba(255,255,255,0.08)" clip-path="url(#clip)"/>

  <!-- F letterform (left side) -->
  <rect x="13" y="22" width="11" height="56" rx="2.5" fill="white"/>
  <rect x="13" y="22" width="32" height="11" rx="2.5" fill="white"/>
  <rect x="13" y="43" width="23" height="11" rx="2.5" fill="white"/>

  <!-- T letterform (right side) -->
  <rect x="53" y="22" width="34" height="11" rx="2.5" fill="white"/>
  <rect x="64" y="22" width="11" height="56" rx="2.5" fill="white"/>

  <!-- Trend sparkline (bottom, ties the two letters) -->
  <polyline
    points="13,88 26,80 40,84 56,72 70,76 87,62"
    stroke="rgba(255,255,255,0.45)"
    stroke-width="3.5"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
`;

// HTML template to render one icon at a given pixel size
function html(size) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
  svg { display: block; width: ${size}px; height: ${size}px; }
</style>
</head>
<body>${ICON_SVG}</body>
</html>`;
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const size of [32, 192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html(size), { waitUntil: 'load' });
    const buf = await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });

    const name = size === 32 ? 'icon-32.png' : `icon-${size}.png`;
    fs.writeFileSync(path.join(PUBLIC, name), buf);
    console.log(`✓ ${name}  (${buf.length} bytes)`);
  }

  await browser.close();

  // Copy icon-32 as the base for favicon.ico (simple ICO = 1-image PNG wrapper)
  const png32 = fs.readFileSync(path.join(PUBLIC, 'icon-32.png'));
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), buildIco(png32));
  console.log('✓ favicon.ico');
}

// ── Minimal ICO builder (single 32×32 PNG-compressed image) ──────────────────
function buildIco(pngBuffer) {
  const imgData = pngBuffer;
  const imgLen = imgData.length;

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: 1 = ICO
  header.writeUInt16LE(1, 4);  // image count

  // Directory entry: 16 bytes
  const dir = Buffer.alloc(16);
  dir.writeUInt8(32, 0);       // width  (0 = 256)
  dir.writeUInt8(32, 1);       // height (0 = 256)
  dir.writeUInt8(0, 2);        // colour count (0 = no palette)
  dir.writeUInt8(0, 3);        // reserved
  dir.writeUInt16LE(1, 4);     // planes
  dir.writeUInt16LE(32, 6);    // bits per pixel
  dir.writeUInt32LE(imgLen, 8); // image data size
  dir.writeUInt32LE(22, 12);   // image data offset (6 + 16)

  return Buffer.concat([header, dir, imgData]);
}

run().catch((e) => { console.error(e); process.exit(1); });
