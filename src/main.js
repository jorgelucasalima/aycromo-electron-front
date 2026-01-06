import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import { spawn } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Descomente a linha abaixo para corrigir erros de "SharedImageManager" ou "GPU" no macOS,
// caso esteja notando falhas visuais ou queira limpar o console.
// app.disableHardwareAcceleration();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // Os erros de "Autofill" no terminal ocorrem porque o DevTools abre automaticamente aqui.
  mainWindow.webContents.openDevTools();
};

// --- Lógica para Importação de Modelos de IA ---
ipcMain.handle('import-model', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar Modelo de Visão (YOLO)',
    properties: ['openFile'],
    filters: [
      { name: 'Modelos de IA', extensions: ['onnx', 'pt', 'engine'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  
  return { name: fileName, path: filePath };
});

ipcMain.handle('run-inference', async (event, data) => {
  const { modeloPath, imagens } = data;

  return new Promise((resolve, reject) => {
    // Exemplo chamando um script Python externo
    // Você passaria o caminho do modelo e os caminhos das imagens como argumentos
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'scripts/detect_chromosomes.py'),
      modeloPath,
      ...imagens
    ]);

    let result = "";
    pythonProcess.stdout.on('data', (data) => result += data.toString());
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(result)); // O Python deve retornar um JSON com as coordenadas
      } else {
        reject("Erro na execução do modelo");
      }
    });
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


