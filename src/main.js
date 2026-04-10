import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn } from 'child_process';
import { InferenceSession, Tensor } from 'onnxruntime-node'; // Motor ONNX
import sharp from 'sharp'; // Processamento de Imagem para ONNX
import fs from 'fs';

// Impede múltiplas instâncias durante a instalação no Windows
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// --- IPC HANDLERS ---

/**
 * 1. Importação de Modelos (.pt ou .onnx)
 */
ipcMain.handle('import-model', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar Modelo de Visão',
    properties: ['openFile'],
    filters: [
      { name: 'Modelos de IA', extensions: ['onnx', 'pt'] }
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
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return { 
    name: path.basename(result.filePaths[0]), 
    path: result.filePaths[0] 
  };
});

/**
 * 2.5 Seleção Nativa de Múltiplas Imagens (Evita problema de Segurança de Sandbox do Browser)
 */
ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar Imagens de Cromossomos',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] }]
  });

  if (result.canceled || result.filePaths.length === 0) return [];

  // Converte pra base64 internamente pra exibir direto no Chromium (opcional)
  // Ou melhor, retornamos os buffers criados temporariamente para obj URL nativos
  return result.filePaths.map(p => {
     // Lemos a imagem nativa como URL Data e enviamos puro para o frontend.
     // Isso resolve o problema the "Not allowed to load local resource" em algumas configs do vite.
     try {
       const b = fs.readFileSync(p);
       const ext = path.extname(p).toLowerCase().replace('.', '');
       const base64 = `data:image/${ext};base64,${b.toString('base64')}`;
       return { path: p, name: path.basename(p), url: base64 };
     } catch (e) {
       return { path: p, name: path.basename(p), url: null };
     }
  });
});

/**
 * 3. Gerenciador de Inferência Híbrido (Python ou ONNX)
 * Usado na tela de "Laboratório de Análise" para detecção visual (bounding boxes)
 */
ipcMain.handle('run-inference', async (event, data) => {
  const { modeloPath, imagens } = data;
  
  console.log(`[Inference Manager] Iniciando processamento universal no Motor Python. Modelo: ${modeloPath}`);

  try {
    // O Python via Ultralytics carrega nativamente tanto .pt quanto .onnx, 
    // lendo os metadados do modelo para descobrir se a imagem precisa ser convertida 
    // para Preto&Branco e/ou redimensionada para 224x224 automaticamente.
    return await runPythonInference(modeloPath, imagens);
  } catch (error) {
    console.error("Erro fatal na inferência:", error);
    throw error;
  }
});

/**
 * 4. Listagem de Arquivos (Imagens)
 */
ipcMain.handle('list-files', async (event, relativePath) => {
  const cleanPath = relativePath.replace(/^\/|^\\/, ''); 
  
  const searchPaths = [
    path.join(process.cwd(), 'public', cleanPath),
    path.join(app.getAppPath(), cleanPath),
    path.join(app.getAppPath(), 'public', cleanPath)
  ];

  console.log(`[ListFiles] Procurando pasta '${cleanPath}' em:`);
  
  let foundPath = null;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    console.error(`[ListFiles] ERRO: Pasta não encontrada.`);
    return [];
  }

  try {
    const files = fs.readdirSync(foundPath);
    const images = files
      .filter(file => /\.(jpg|jpeg|png|bmp|webp)$/i.test(file))
      .map(file => path.join(foundPath, file));
    return images;
  } catch (e) {
    console.error(`[ListFiles] Erro ao ler diretório: ${e.message}`);
    return [];
  }
});

/**
 * 5. BENCHMARK METRICS (FALTAVA ISSO AQUI!)
 * Calcula mAP, Precision e Recall usando benchmark.py
 */
ipcMain.handle('run-benchmark-metrics', async (event, data) => {
  const { modeloPath, datasetPath } = data;
  
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(app.getAppPath(), 'src/scripts/benchmark.py');

  console.log(`[Benchmark] Iniciando teste...`);
  console.log(` - Modelo: ${modeloPath}`);
  console.log(` - Dataset: ${datasetPath}`);

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonCommand, [
      scriptPath,
      modeloPath,
      datasetPath
    ]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on('data', (d) => stdoutData += d.toString());
    pythonProcess.stderr.on('data', (d) => stderrData += d.toString());

    pythonProcess.on('close', (code) => {
      // Procura o início do JSON na saída (pode haver logs antes)
      const jsonStartIndex = stdoutData.indexOf('{');
      
      if (code === 0 && jsonStartIndex !== -1) {
        try {
          const jsonString = stdoutData.substring(jsonStartIndex);
          const metrics = JSON.parse(jsonString);
          console.log("[Benchmark] Sucesso:", metrics);
          resolve(metrics);
        } catch (err) {
          console.error("[Benchmark] Erro ao ler JSON:", stdoutData);
          reject(`Falha ao processar resposta do Python.`);
        }
      } else {
        console.error("[Benchmark] Falha no script:", stderrData);
        // Retornamos um objeto de erro "suave" para o React tratar sem travar
        resolve({ 
          error: `Erro no script (Código ${code}). Verifique se 'ultralytics' está instalado e se a pasta 'labels' existe ao lado da pasta 'images'.` 
        });
      }
    });

    pythonProcess.on('error', (err) => {
      reject(`Falha ao iniciar Python: ${err.message}`);
    });
  });
});

/**
 * 6. Salvar Anotações (Curadoria Manual YOLO)
 */
ipcMain.handle('save-annotations', async (event, annotationsData) => {
  try {
    let savedCount = 0;
    for (const data of annotationsData) {
      const { path: imagePath, width, height, boxes } = data;
      
      let txtContent = "";
      for (const box of boxes) {
        // Formato YOLO: class x_center y_center w h (normalizado 0.0 a 1.0)
        const x_center = (box.x + box.w / 2) / width;
        const y_center = (box.y + box.h / 2) / height;
        const w_norm = box.w / width;
        const h_norm = box.h / height;
        
        txtContent += `0 ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${w_norm.toFixed(6)} ${h_norm.toFixed(6)}\n`;
      }
      
      // Detecta estrutura yolo padrão (se tiver pasta images grava na labels correspondente)
      const dirName = path.dirname(imagePath);
      const baseName = path.basename(imagePath, path.extname(imagePath));
      
      let saveDir = dirName;
      if (path.basename(dirName).toLowerCase() === 'images') {
        saveDir = path.join(path.dirname(dirName), 'labels');
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }
      }
      
      const txtPath = path.join(saveDir, `${baseName}.txt`);
      fs.writeFileSync(txtPath, txtContent);
      savedCount++;
    }
    return { success: true, saved: savedCount };
  } catch (error) {
    console.error("Erro ao salvar anotações:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 7. Exportar Anotações (Para pasta específica escolhida pelo usuário)
 */
ipcMain.handle('export-annotations', async (event, annotationsData) => {
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione a pasta para exportar as anotações',
      properties: ['openDirectory', 'createDirectory']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const saveDir = filePaths[0];
    let savedCount = 0;

    for (const data of annotationsData) {
      const { path: imagePath, width, height, boxes } = data;
      
      let txtContent = "";
      for (const box of boxes) {
        const x_center = (box.x + box.w / 2) / width;
        const y_center = (box.y + box.h / 2) / height;
        const w_norm = box.w / width;
        const h_norm = box.h / height;
        txtContent += `0 ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${w_norm.toFixed(6)} ${h_norm.toFixed(6)}\n`;
      }
      
      const baseName = path.basename(imagePath, path.extname(imagePath));
      const txtPath = path.join(saveDir, `${baseName}.txt`);
      fs.writeFileSync(txtPath, txtContent);
      savedCount++;
    }
    return { success: true, saved: savedCount, directory: saveDir };
  } catch (error) {
    console.error("Erro ao exportar anotações:", error);
    return { success: false, error: error.message };
  }
});


// --- MOTOR ÚNICO: PYTHON ---
// Carrega arquivos .pt, .onnx nativamente com resize dinâmico
function runPythonInference(modeloPath, imagens) {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(app.getAppPath(), 'src/scripts/detect_chromosomes.py');

    const pythonProcess = spawn(pythonCommand, [
      scriptPath,
      modeloPath,
      ...imagens
    ]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on('data', (d) => stdoutData += d.toString());
    pythonProcess.stderr.on('data', (d) => stderrData += d.toString());

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonStartIndex = stdoutData.indexOf('{');
          if (jsonStartIndex !== -1) {
             const jsonStr = stdoutData.substring(jsonStartIndex); 
             resolve(JSON.parse(jsonStr));
          } else {
             reject("Resposta vazia do Python (Nenhum JSON encontrado).");
          }
        } catch (err) {
          console.error("Falha ao parsear JSON do Python:", stdoutData);
          reject(`Saída inválida do Python.`);
        }
      } else {
        reject(`Erro no script Python (Código ${code}): ${stderrData}`);
      }
    });

    pythonProcess.on('error', (err) => {
       reject(err.message);
    });
  });
}

// --- APP LIFECYCLE ---

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});