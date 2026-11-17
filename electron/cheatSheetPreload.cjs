'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cheatSheet', {
  onData(callback) {
    ipcRenderer.on('cheat-sheet-data', (_event, data) => callback(data));
  },
});
