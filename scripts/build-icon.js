// Genera el icono de la app (build/icon.icns), el icono de 1024px fuente
// (assets/icon.png) y el icono monocromo de la barra de menú
// (assets/trayIconTemplate.png @1x y @2x) sin depender de ningún asset
// externo: todo se dibuja por código con pngjs. Se ejecuta solo en
// "npm install" (postinstall) y es seguro repetirlo — sobrescribe siempre.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const BUILD_DIR = path.join(ROOT, 'build');

for (const dir of [ASSETS_DIR, BUILD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---- utilidades de dibujo ----------------------------------------------

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const [r, g, b, a] = color;
  const idx = (png.width * y + x) << 2;
  // Mezcla alpha simple sobre lo ya dibujado (permite antialiasing por capas)
  const srcA = a / 255;
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  const srcRGB = [r, g, b];
  for (let c = 0; c < 3; c++) {
    const src = srcRGB[c];
    const dst = png.data[idx + c];
    png.data[idx + c] = Math.round((src * srcA + dst * dstA * (1 - srcA)) / outA);
  }
  png.data[idx + 3] = Math.round(outA * 255);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Distancia con signo a un rectángulo redondeado centrado en (0,0) de
// semi-tamaño (hw,hh) y radio r. Negativo = dentro.
function roundedRectSDF(px, py, hw, hh, r) {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  const outsideX = Math.max(qx, 0);
  const outsideY = Math.max(qy, 0);
  return Math.sqrt(outsideX * outsideX + outsideY * outsideY) + Math.min(Math.max(qx, qy), 0) - r;
}

// Distancia de un punto a un segmento (para trazar líneas gruesas)
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp01(t);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// ---- icono principal (rounded square + gradiente + glifo ">_") --------

function buildMainIcon(size) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);

  const cx = size / 2;
  const cy = size / 2;
  const hw = size * 0.5 * 0.86;
  const hh = size * 0.5 * 0.86;
  const radius = size * 0.22;

  const colorA = [90, 130, 240]; // azul (acorde a --accent-blue)
  const colorB = [147, 92, 232]; // violeta

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x - cx;
      const py = y - cy;
      const d = roundedRectSDF(px, py, hw, hh, radius);
      if (d > 1.5) continue;
      const coverage = clamp01(0.5 - d);
      if (coverage <= 0) continue;
      const t = clamp01((x / size + y / size) / 2);
      const [r, g, b] = lerpColor(colorA, colorB, t);
      setPixel(png, x, y, [r, g, b, Math.round(coverage * 255)]);
    }
  }

  // Glifo ">_" en blanco, centrado, estilo prompt de terminal.
  const strokeW = size * 0.075;
  const glyphColor = [255, 255, 255];
  const chevronTop = [size * 0.36, size * 0.34];
  const chevronMid = [size * 0.52, size * 0.5];
  const chevronBottom = [size * 0.36, size * 0.66];
  const underscoreY = size * 0.66;
  const underscoreX1 = size * 0.56;
  const underscoreX2 = size * 0.72;

  const minX = Math.floor(size * 0.3);
  const maxX = Math.ceil(size * 0.78);
  const minY = Math.floor(size * 0.28);
  const maxY = Math.ceil(size * 0.72);

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const d1 = distToSegment(x, y, chevronTop[0], chevronTop[1], chevronMid[0], chevronMid[1]);
      const d2 = distToSegment(x, y, chevronMid[0], chevronMid[1], chevronBottom[0], chevronBottom[1]);
      const d3 = distToSegment(x, y, underscoreX1, underscoreY, underscoreX2, underscoreY);
      const d = Math.min(d1, d2, d3);
      const coverage = clamp01(strokeW / 2 - d + 0.75);
      if (coverage > 0) {
        setPixel(png, x, y, [...glyphColor, Math.round(coverage * 235)]);
      }
    }
  }

  return png;
}

// ---- icono de tray (monocromo, plantilla macOS) ------------------------

function buildTrayIcon(size) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);

  const strokeW = Math.max(1.6, size * 0.11);
  const chevronTop = [size * 0.28, size * 0.26];
  const chevronMid = [size * 0.5, size * 0.5];
  const chevronBottom = [size * 0.28, size * 0.74];
  const underscoreY = size * 0.74;
  const underscoreX1 = size * 0.55;
  const underscoreX2 = size * 0.82;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d1 = distToSegment(x, y, chevronTop[0], chevronTop[1], chevronMid[0], chevronMid[1]);
      const d2 = distToSegment(x, y, chevronMid[0], chevronMid[1], chevronBottom[0], chevronBottom[1]);
      const d3 = distToSegment(x, y, underscoreX1, underscoreY, underscoreX2, underscoreY);
      const d = Math.min(d1, d2, d3);
      const coverage = clamp01(strokeW / 2 - d + 0.6);
      if (coverage > 0) {
        // Template image: siempre negro puro, macOS lo invierte según el tema.
        setPixel(png, x, y, [0, 0, 0, Math.round(coverage * 255)]);
      }
    }
  }
  return png;
}

function writePng(png, filePath) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

// ---- generación -----------------------------------------------------

const mainIcon1024 = buildMainIcon(1024);
writePng(mainIcon1024, path.join(ASSETS_DIR, 'icon.png'));

writePng(buildTrayIcon(22), path.join(ASSETS_DIR, 'trayIconTemplate.png'));
writePng(buildTrayIcon(44), path.join(ASSETS_DIR, 'trayIconTemplate@2x.png'));

// icon.icns (macOS) e icon.ico (Windows) para electron-builder
try {
  const png2icons = require('png2icons');
  const input = fs.readFileSync(path.join(ASSETS_DIR, 'icon.png'));

  const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
  if (icns) {
    fs.writeFileSync(path.join(BUILD_DIR, 'icon.icns'), icns);
    console.log('[build-icon] build/icon.icns generado');
  } else {
    console.warn('[build-icon] png2icons no pudo generar el .icns');
  }

  const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, false);
  if (ico) {
    fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico);
    console.log('[build-icon] build/icon.ico generado');
  } else {
    console.warn('[build-icon] png2icons no pudo generar el .ico');
  }
} catch (err) {
  console.warn('[build-icon] No se generaron icon.icns/icon.ico todavía:', err.message);
}

console.log('[build-icon] Iconos generados en assets/');
