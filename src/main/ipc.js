const { ipcMain, app, dialog } = require('electron');
const fs = require('fs');
const config = require('./config');
const { registerShortcut, getCurrentAccelerator } = require('./shortcut');

function registerIpcHandlers({ storage, auth, getWindow, toggleWindow }) {
  ipcMain.handle('library:get', async () => storage.getLibrary());

  ipcMain.handle('library:addCategory', async (_e, category) => storage.addCategory(category));
  ipcMain.handle('library:deleteCategory', async (_e, categoryId) => storage.deleteCategory(categoryId));
  ipcMain.handle('library:addTopic', async (_e, { categoryId, topic }) =>
    storage.addTopic(categoryId, topic)
  );
  ipcMain.handle('library:deleteTopic', async (_e, { categoryId, topicId }) =>
    storage.deleteTopic(categoryId, topicId)
  );
  ipcMain.handle('library:addSnippet', async (_e, { categoryId, topicId, snippet }) =>
    storage.addSnippet(categoryId, topicId, snippet)
  );
  ipcMain.handle('library:updateSnippet', async (_e, { categoryId, topicId, snippetId, patch }) =>
    storage.updateSnippet(categoryId, topicId, snippetId, patch)
  );
  ipcMain.handle('library:deleteSnippet', async (_e, { categoryId, topicId, snippetId }) =>
    storage.deleteSnippet(categoryId, topicId, snippetId)
  );

  // Exportar/importar: para compartir tu documentación con un compañero de
  // equipo como un archivo .json normal (o pasar de un Mac a otro).
  ipcMain.handle('library:export', async () => {
    const win = getWindow();
    const library = await storage.getLibrary();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar documentación de QuickDocs',
      defaultPath: `quickdocs-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(library, null, 2), 'utf-8');
    return { canceled: false, filePath };
  });

  ipcMain.handle('library:import', async () => {
    const win = getWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Importar documentación de QuickDocs',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePaths.length) return { canceled: true };

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
    } catch (err) {
      throw new Error(`No se pudo leer el archivo: ${err.message}`);
    }
    const summary = await storage.importLibrary(data);
    return { canceled: false, summary };
  });

  ipcMain.handle('settings:get', async () => storage.getSettings());
  ipcMain.handle('settings:set', async (_e, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'startAtLogin')) {
      app.setLoginItemSettings({ openAtLogin: !!patch.startAtLogin });
    }
    return storage.setSettings(patch);
  });

  ipcMain.handle('app:getConfig', () => ({
    appName: config.appName,
    globalShortcut: getCurrentAccelerator() || config.globalShortcut,
    version: app.getVersion(),
    platform: process.platform,
  }));

  // Cambiar el atajo global desde Configuración, sin tocar el .env.
  // Solo se persiste si el nuevo atajo se pudo registrar de verdad.
  ipcMain.handle('shortcut:set', async (_e, accelerator) => {
    const ok = registerShortcut(accelerator, toggleWindow);
    if (ok) {
      await storage.setSettings({ globalShortcut: accelerator });
    }
    return { success: ok, accelerator: getCurrentAccelerator() };
  });

  ipcMain.handle('auth:getCurrentUser', async () => auth.getCurrentUser());
  ipcMain.handle('auth:signIn', async () => auth.signIn());
  ipcMain.handle('auth:signOut', async () => auth.signOut());

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.on('panel:close', () => {
    const win = getWindow();
    if (win) win.hide();
  });
}

module.exports = { registerIpcHandlers };
