import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn } from 'child_process';

// Impede múltiplas instâncias durante a instalação no Windows
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      // Garante que o preload seja carregado corretamente via Vite
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Abre o DevTools automaticamente para debug (opcional)
  // mainWindow.webContents.openDevTools();
};

// --- LÓGICA DE INTERFACE (IPC) ---

/**
 * 1. Importação de Arquivos de Modelo (.onnx, .pt)
 */
ipcMain.handle('import-model', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar Modelo de Visão (YOLO)',
    properties: ['openFile'],
    filters: [
      { name: 'Modelos de IA', extensions: ['onnx', 'pt', 'engine'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return { 
    name: path.basename(result.filePaths[0]), 
    path: result.filePaths[0] 
  };
});

/**
 * 2. Importação de Pastas de Dataset
 */
ipcMain.handle('import-dataset', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar Pasta do Dataset',
    properties: ['openDirectory'], // Define que apenas pastas podem ser selecionadas
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return { 
    name: path.basename(result.filePaths[0]), 
    path: result.filePaths[0] 
  };
});

/**
 * 3. Execução da Inferência com Python
 * Resolve o erro ENOENT detectando o comando correto e capturando erros de log.
 */
ipcMain.handle('run-inference', async (event, data) => {
  const { modeloPath, imagens } = data;

  // Detecta se usa 'python' (Windows) ou 'python3' (Mac/Linux)
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  
  // Localiza o script dentro da pasta do projeto
  const scriptPath = path.join(app.getAppPath(), 'src/scripts/detect_chromosomes.py');

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonCommand, [
      scriptPath,
      modeloPath,
      ...imagens
    ], { shell: true }); // shell: true ajuda a encontrar o executável no Windows

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`[Python Error]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdoutData));
        } catch (err) {
          reject(`Saída do Python inválida: ${stdoutData}`);
        }
      } else {
        reject(`Erro no script (Código ${code}): ${stderrData}`);
      }
    });

    pythonProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(`Comando '${pythonCommand}' não encontrado. Verifique se o Python está no PATH.`);
      } else {
        reject(`Falha ao iniciar o processo: ${err.message}`);
      }
    });
  });
});

// --- CICLO DE VIDA DO APP ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});