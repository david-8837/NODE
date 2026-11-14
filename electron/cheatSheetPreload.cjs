const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cheatSheet', {
  onUpdate: (callback) => ipcRenderer.on('cheat-sheet-update', (_event, data) => callback(data)),
  close: () => ipcRenderer.send('cheat-sheet-close'),
});
