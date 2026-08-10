const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const config = require('./config');

let tray = null;

function createTray({ onToggle, onQuit }) {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'trayIconTemplate.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    // Fallback por si el icono aún no se generó (ver scripts/build-icon.js)
    icon = nativeImage.createEmpty();
  }
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip(`${config.appName} — ${config.globalShortcut}`);

  const contextMenu = Menu.buildFromTemplate([
    { label: `Mostrar / ocultar  (${prettyShortcut(config.globalShortcut)})`, click: onToggle },
    { type: 'separator' },
    {
      label: 'Iniciar con el sistema',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
      },
    },
    { type: 'separator' },
    { label: `Salir de ${config.appName}`, click: onQuit },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', onToggle);

  return tray;
}

function prettyShortcut(accelerator) {
  return accelerator
    .replace('CommandOrControl', '⌘')
    .replace('Command', '⌘')
    .replace('Control', '⌃')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace(/\+/g, '');
}

module.exports = { createTray };
