const { globalShortcut } = require('electron');

// Centraliza el registro del atajo global para poder cambiarlo en caliente
// desde Configuración (sin reiniciar la app) sin perder el que ya funcionaba
// si el nuevo no se pudo registrar (p. ej. porque otra app ya lo usa).
let currentAccelerator = null;
let currentCallback = null;

function registerShortcut(accelerator, callback) {
  const previousAccelerator = currentAccelerator;
  if (previousAccelerator) {
    globalShortcut.unregister(previousAccelerator);
  }

  const ok = globalShortcut.register(accelerator, callback);
  if (ok) {
    currentAccelerator = accelerator;
    currentCallback = callback;
    return true;
  }

  // No se pudo registrar el nuevo (probablemente ocupado por el sistema u
  // otra app): recupera el anterior para no dejar la app sin atajo.
  if (previousAccelerator) {
    globalShortcut.register(previousAccelerator, currentCallback);
  }
  return false;
}

function getCurrentAccelerator() {
  return currentAccelerator;
}

module.exports = { registerShortcut, getCurrentAccelerator };
