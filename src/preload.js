const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  importModel: () => ipcRenderer.invoke('import-model'),
  importDataset: () => ipcRenderer.invoke('import-dataset'),
  runInference: (data) => ipcRenderer.invoke('run-inference', data),
  listFiles: (folderPath) => ipcRenderer.invoke('list-files', folderPath),
  runBenchmarkMetrics: (data) => ipcRenderer.invoke('run-benchmark-metrics', data),
  saveAnnotations: (data) => ipcRenderer.invoke('save-annotations', data),
  exportAnnotations: (data) => ipcRenderer.invoke('export-annotations', data),
  selectImages: () => ipcRenderer.invoke('select-images'),
});