const { app, net, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const config = require('./config');

// Actualizador propio basado en GitHub Releases (repo público, sin tokens).
// No usa electron-updater porque el auto-instalado en macOS exige firma de
// Apple Developer; aquí se descarga el .zip del release (macOS) o el
// instalador .exe (Windows) y se reemplaza la app. Los datos del usuario
// (library.json / settings.json en userData) NO se tocan: viven fuera de la app.

const RELEASES_URL = `https://api.github.com/repos/${config.updates.repo}/releases/latest`;

let latest = null; // { version, notes, url, assetName, assetUrl }
let busy = false;

function parseVersion(v) {
  return String(v).replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
}

function isNewer(remote, local) {
  const a = parseVersion(remote);
  const b = parseVersion(local);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

function pickAsset(assets) {
  if (process.platform === 'darwin') return assets.find((a) => /\.zip$/i.test(a.name) && !/blockmap/i.test(a.name));
  if (process.platform === 'win32') return assets.find((a) => /\.exe$/i.test(a.name));
  return null;
}

async function checkForUpdates() {
  try {
    const res = await net.fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'QuickDocs-Updater' },
    });
    if (res.status === 404) return { status: 'none', current: app.getVersion() };
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
    const release = await res.json();
    const version = String(release.tag_name || '').replace(/^v/i, '');
    const asset = pickAsset(release.assets || []);
    if (!version || !isNewer(version, app.getVersion())) {
      latest = null;
      return { status: 'none', current: app.getVersion() };
    }
    latest = {
      version,
      notes: release.body || '',
      url: release.html_url,
      assetName: asset?.name,
      assetUrl: asset?.browser_download_url,
    };
    return { status: 'available', current: app.getVersion(), version, notes: latest.notes, canInstall: !!asset && app.isPackaged };
  } catch (err) {
    return { status: 'error', error: err.message, current: app.getVersion() };
  }
}

async function download(url, dest, onProgress) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'QuickDocs-Updater' } });
  if (!res.ok || !res.body) throw new Error(`No se pudo descargar (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  let received = 0;
  const source = Readable.fromWeb(res.body);
  source.on('data', (chunk) => {
    received += chunk.length;
    if (total) onProgress?.(Math.round((received / total) * 100));
  });
  await pipeline(source, fs.createWriteStream(dest));
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err) => (err ? reject(err) : resolve()));
  });
}

async function installUpdate(onProgress) {
  if (busy) return { success: false, error: 'Ya hay una actualización en curso' };
  if (!latest?.assetUrl) return { success: false, error: 'No hay actualización instalable' };
  if (!app.isPackaged) return { success: false, error: 'Solo disponible en la app instalada' };
  busy = true;
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quickdocs-update-'));
    const file = path.join(dir, latest.assetName);
    await download(latest.assetUrl, file, onProgress);

    if (process.platform === 'win32') {
      spawn(file, [], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return { success: true };
    }

    // macOS: .../QuickDocs.app/Contents/MacOS/QuickDocs -> .../QuickDocs.app
    const appBundle = path.resolve(process.execPath, '..', '..', '..');
    const extractDir = path.join(dir, 'extracted');
    fs.mkdirSync(extractDir);
    await run('ditto', ['-x', '-k', file, extractDir]);
    const newApp = fs.readdirSync(extractDir).find((n) => n.endsWith('.app'));
    if (!newApp) throw new Error('El paquete descargado no contiene la app');

    try {
      fs.accessSync(path.dirname(appBundle), fs.constants.W_OK);
    } catch {
      // Sin permisos para reemplazar (p. ej. instalada por otro usuario).
      shell.showItemInFolder(path.join(extractDir, newApp));
      return { success: false, error: 'Sin permisos para reemplazar la app; se abrió la nueva versión en Finder para que la arrastres a Aplicaciones.' };
    }

    const script = [
      'while kill -0 "$1" 2>/dev/null; do sleep 0.3; done',
      'rm -rf "$2"',
      'ditto "$3" "$2"',
      'xattr -dr com.apple.quarantine "$2" 2>/dev/null',
      'open "$2"',
    ].join('\n');
    spawn('/bin/sh', ['-c', script, 'sh', String(process.pid), appBundle, path.join(extractDir, newApp)], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    app.quit();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    busy = false;
  }
}

// Chequeo silencioso al arrancar y cada 6 h; avisa a la ventana si hay novedad.
function startAutoCheck(notify) {
  const run = async () => {
    const result = await checkForUpdates();
    if (result.status === 'available') notify(result);
  };
  setTimeout(run, 15000);
  setInterval(run, 6 * 60 * 60 * 1000);
}

module.exports = { checkForUpdates, installUpdate, startAutoCheck };
