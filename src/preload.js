const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  importModel: () => ipcRenderer.invoke('import-model'),
  importDataset: () => ipcRenderer.invoke('import-dataset'),
  listFiles: (path) => ipcRenderer.invoke('list-files', path),
  runInference: (data) => ipcRenderer.invoke('run-inference', data),
  runBenchmarkMetrics: (data) => ipcRenderer.invoke('run-benchmark-metrics', data),
});