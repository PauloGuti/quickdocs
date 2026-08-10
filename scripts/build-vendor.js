// Empaqueta highlight.js (solo los lenguajes usados) en un único archivo
// plano para el renderer, sin CDN ni node_modules en runtime empaquetado.
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

async function run() {
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'scripts', 'hljs-entry.js')],
    outfile: path.join(ROOT, 'src', 'renderer', 'vendor', 'highlight.bundle.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['chrome120'],
    logLevel: 'info',
  });
  console.log('[build-vendor] highlight.bundle.js generado');

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'scripts', 'prettier-entry.js')],
    outfile: path.join(ROOT, 'src', 'renderer', 'vendor', 'prettier.bundle.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome120'],
    logLevel: 'info',
  });
  console.log('[build-vendor] prettier.bundle.js generado');
}

run().catch((err) => {
  console.error('[build-vendor] Falló la generación de bundles del renderer:', err);
  process.exit(1);
});
