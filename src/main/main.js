const { app, globalShortcut, Menu } = require('electron');
const config = require('./config');
const { createStorage } = require('./storage');
const OfflineAuthProvider = require('./auth/local');
const { createPopupWindow, getPopupWindow, togglePopupWindow } = require('./window');
const { createTray } = require('./tray');
const { registerIpcHandlers } = require('./ipc');

// QuickDocs es una app de acceso rápido tipo Spotlight/Raycast: vive en la
// barra de menú (tray), no en el Dock, y se invoca con un atajo global.
if (process.platform === 'darwin') {
  app.dock?.hide();
}

// Solo una instancia activa a la vez.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    togglePopupWindow();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    const storage = createStorage();
    await storage.init();
    const auth = new OfflineAuthProvider();

    createPopupWindow();
    registerIpcHandlers({ storage, auth, getWindow: getPopupWindow });

    createTray({
      onToggle: togglePopupWindow,
      onQuit: () => app.quit(),
    });

    const registered = globalShortcut.register(config.globalShortcut, togglePopupWindow);
    if (!registered) {
      console.error(
        `[QuickDocs] No se pudo registrar el atajo global "${config.globalShortcut}". ` +
          'Puede que otra app lo esté usando ya. Cámbialo en tu .env (GLOBAL_SHORTCUT).'
      );
    }

    const startAtLogin = (await storage.getSettings()).startAtLogin;
    app.setLoginItemSettings({ openAtLogin: !!startAtLogin });
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  // App de menú de estado: no debe salir al cerrar su única ventana.
  app.on('window-all-closed', (event) => {
    event.preventDefault();
  });
}
