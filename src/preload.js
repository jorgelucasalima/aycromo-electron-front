const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  importModel: () => ipcRenderer.invoke('import-model'),
  importDataset: () => ipcRenderer.invoke('import-dataset'),
  runInference: (data) => ipcRenderer.invoke('run-inference', data)
});