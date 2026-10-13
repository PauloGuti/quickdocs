const { BrowserWindow, screen } = require('electron');
const path = require('path');

const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 620;
const MARGIN = 12;

let popupWindow = null;

function createPopupWindow() {
  const display = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth } = display.workArea;

  // El blur nativo ("vibrancy") es una API de macOS. En Windows 10/11 el
  // equivalente es "backgroundMaterial"; en Linux no hay soporte nativo de
  // blur en Electron, así que ahí queda un fondo translúcido simple (ver
  // el rgba de --panel-bg en styles.css, que ya funciona sin blur real).
  const platformEffects = {};
  if (process.platform === 'darwin') {
    platformEffects.vibrancy = 'popover';
    platformEffects.visualEffectState = 'active';
    platformEffects.titleBarStyle = 'hidden';
  } else if (process.platform === 'win32') {
    platformEffects.backgroundMaterial = 'acrylic';
  }

  popupWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: Math.round(workX + workWidth - WINDOW_WIDTH - MARGIN),
    y: Math.round(workY + MARGIN),
    minWidth: 340,
    minHeight: 400,
    frame: false,
    transparent: process.platform !== 'win32',
    hasShadow: true,
    resizable: true,
    movable: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    roundedCorners: true,
    ...platformEffects,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  popupWindow.setAlwaysOnTop(true, 'floating');
  popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  popupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Si la ventana se destruye (quit real, crash del renderer, etc.) hay que
  // limpiar la referencia: si no, togglePopupWindow() la sigue viendo como
  // "existente" y explota con "Object has been destroyed" al usarla.
  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  // Si el renderer se cuelga o crashea, la ventana quedaba "visible" pero
  // muerta y el atajo parecía no responder. Se recarga sola.
  popupWindow.webContents.on('render-process-gone', () => {
    if (popupWindow && !popupWindow.isDestroyed()) popupWindow.reload();
  });
  popupWindow.on('unresponsive', () => {
    if (popupWindow && !popupWindow.isDestroyed()) popupWindow.reload();
  });

  // A propósito NO se oculta al perder el foco: es un panel persistente tipo
  // widget, no un Spotlight transitorio. Se abre/cierra solo con el atajo
  // global o con el botón "cerrar" del propio panel (ver panel:close en ipc.js).

  return popupWindow;
}

function getPopupWindow() {
  return popupWindow;
}

function togglePopupWindow() {
  // Si la ventana se destruyó por cualquier motivo, se vuelve a crear en vez
  // de quedarse sin responder al atajo para siempre.
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
    popupWindow.webContents.once('did-finish-load', () => showPopupWindow());
    return;
  }
  if (popupWindow.isVisible()) {
    popupWindow.hide();
  } else {
    showPopupWindow();
  }
}

function showPopupWindow() {
  repositionToActiveDisplay();
  popupWindow.show();
  popupWindow.focus();
  popupWindow.webContents.send('panel:shown');
}

function repositionToActiveDisplay() {
  // Sigue al cursor: aparece en la pantalla donde está trabajando el usuario,
  // no siempre en la principal (útil con varios monitores).
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x: workX, y: workY, width: workWidth } = display.workArea;
  popupWindow.setPosition(
    Math.round(workX + workWidth - WINDOW_WIDTH - MARGIN),
    Math.round(workY + MARGIN)
  );
}

module.exports = { createPopupWindow, getPopupWindow, togglePopupWindow };
