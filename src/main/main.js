const { app, globalShortcut, Menu, powerMonitor } = require('electron');
const config = require('./config');
const { createStorage } = require('./storage');
const OfflineAuthProvider = require('./auth/local');
const { createPopupWindow, getPopupWindow, togglePopupWindow } = require('./window');
const { createTray } = require('./tray');
const { registerIpcHandlers } = require('./ipc');
const { startAutoCheck } = require('./updater');
const { registerShortcut, getCurrentAccelerator } = require('./shortcut');

// QuickDocs es una app de acceso rápido tipo Spotlight/Raycast: vive en la
// barra de menú (tray), no en el Dock, y se invoca con un atajo global.
process.on('uncaughtException', (err) => console.error('[QuickDocs] uncaughtException:', err));
process.on('unhandledRejection', (err) => console.error('[QuickDocs] unhandledRejection:', err));

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
    registerIpcHandlers({ storage, auth, getWindow: getPopupWindow, toggleWindow: togglePopupWindow });

    createTray({
      onToggle: togglePopupWindow,
      onQuit: () => app.quit(),
    });

    // El atajo elegido desde Configuración (guardado en settings.json) manda
    // sobre el de .env; si el usuario nunca lo cambió en la UI, se usa el de
    // .env (o el default) tal como antes.
    const settings = await storage.getSettings();
    const accelerator = settings.globalShortcut || config.globalShortcut;
    const registered = registerShortcut(accelerator, togglePopupWindow);
    if (!registered) {
      console.error(
        `[QuickDocs] No se pudo registrar el atajo global "${accelerator}". ` +
          'Puede que otra app lo esté usando ya. Cámbialo desde Configuración o en tu .env (GLOBAL_SHORTCUT).'
      );
    }

    app.setLoginItemSettings({ openAtLogin: !!settings.startAtLogin });

    // Tras suspender/desbloquear, macOS a veces deja de entregar el atajo
    // global: se vuelve a registrar para que no "deje de abrir".
    const reRegister = () => registerShortcut(getCurrentAccelerator() || accelerator, togglePopupWindow);
    powerMonitor.on('resume', reRegister);
    powerMonitor.on('unlock-screen', reRegister);

    startAutoCheck((info) => {
      const win = getPopupWindow();
      if (win && !win.isDestroyed()) win.webContents.send('update:available', info);
    });
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  // "Salir de QuickDocs" (tray) llama a app.quit(), lo que dispara
  // 'before-quit' ANTES de cerrar/destruir la ventana. Usamos esa señal para
  // distinguir un quit real de un cierre accidental de la ventana: si no es
  // un quit intencional, prevenimos el cierre total (app de menú de estado,
  // no debe salir al perder su única ventana).
  let isQuitting = false;
  app.on('before-quit', () => {
    isQuitting = true;
  });
  app.on('window-all-closed', (event) => {
    if (!isQuitting) event.preventDefault();
  });
}
