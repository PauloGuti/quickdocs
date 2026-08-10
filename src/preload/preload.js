const { contextBridge, ipcRenderer } = require('electron');

// Superficie mínima expuesta al renderer. Nada de "require" libre ni acceso
// a Node en la ventana: todo pasa por aquí, explícito y auditable.
contextBridge.exposeInMainWorld('quickdocs', {
  library: {
    get: () => ipcRenderer.invoke('library:get'),
    addCategory: (category) => ipcRenderer.invoke('library:addCategory', category),
    deleteCategory: (categoryId) => ipcRenderer.invoke('library:deleteCategory', categoryId),
    addTopic: (categoryId, topic) => ipcRenderer.invoke('library:addTopic', { categoryId, topic }),
    deleteTopic: (categoryId, topicId) => ipcRenderer.invoke('library:deleteTopic', { categoryId, topicId }),
    addSnippet: (categoryId, topicId, snippet) =>
      ipcRenderer.invoke('library:addSnippet', { categoryId, topicId, snippet }),
    updateSnippet: (categoryId, topicId, snippetId, patch) =>
      ipcRenderer.invoke('library:updateSnippet', { categoryId, topicId, snippetId, patch }),
    deleteSnippet: (categoryId, topicId, snippetId) =>
      ipcRenderer.invoke('library:deleteSnippet', { categoryId, topicId, snippetId }),
    export: () => ipcRenderer.invoke('library:export'),
    import: () => ipcRenderer.invoke('library:import'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
  },
  auth: {
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    signIn: () => ipcRenderer.invoke('auth:signIn'),
    signOut: () => ipcRenderer.invoke('auth:signOut'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getConfig: () => ipcRenderer.invoke('app:getConfig'),
    close: () => ipcRenderer.send('panel:close'),
  },
  onPanelShown: (callback) => {
    ipcRenderer.on('panel:shown', callback);
  },
});
