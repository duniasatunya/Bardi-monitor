const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bv', {
  get: () => ipcRenderer.invoke('bv:get'),
  save: (a) => ipcRenderer.invoke('bv:save', a),
  change: () => ipcRenderer.invoke('bv:change'),
  retry: () => ipcRenderer.invoke('bv:retry')
});
