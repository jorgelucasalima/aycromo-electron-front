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
 * 3. Gerenciador de Inferência Híbrido (Python ou ONNX)
 * Usado na tela de "Laboratório de Análise" para detecção visual (bounding boxes)
 */
ipcMain.handle('run-inference', async (event, data) => {
  const { modeloPath, imagens } = data;
  
  // Detecta a extensão do arquivo para decidir qual motor usar
  const extensao = path.extname(modeloPath).toLowerCase();

  console.log(`[Inference Manager] Iniciando processamento. Motor: ${extensao === '.onnx' ? 'ONNX (Node.js)' : 'Python (Spawn)'}`);

  try {
    if (extensao === '.pt') {
      return await runPythonInference(modeloPath, imagens);
    } 
    else if (extensao === '.onnx') {
      return await runOnnxInference(modeloPath, imagens);
    } 
    else {
      // Se for 'default' ou outro, tenta usar Python como fallback padrão
      return await runPythonInference(modeloPath, imagens);
    }
  } catch (error) {
    console.error("Erro fatal na inferência:", error);
    throw error; // Repassa o erro para o React exibir o alert
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
    ], { shell: true });

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


// --- FUNÇÕES AUXILIARES (MOTORES DE IA) ---

// MOTOR 1: PYTHON (Para arquivos .pt)
function runPythonInference(modeloPath, imagens) {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(app.getAppPath(), 'src/scripts/detect_chromosomes.py');

    const pythonProcess = spawn(pythonCommand, [
      scriptPath,
      modeloPath,
      ...imagens
    ], { shell: true });

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

// MOTOR 2: ONNX (Para arquivos .onnx)
async function runOnnxInference(modeloPath, imagens) {
  try {
    const session = await InferenceSession.create(modeloPath);
    const resultados = {};

    for (const imgPath of imagens) {
      // Prepara imagem com Sharp
      const { data } = await sharp(imgPath)
        .resize(640, 640, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const inputData = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        inputData[i] = data[i] / 255.0;
      }

      const tensor = new Tensor('float32', inputData, [1, 3, 640, 640]);
      const output = await session.run({ [session.inputNames[0]]: tensor });
      const outputTensor = output[session.outputNames[0]];

      const detections = postProcessYOLO(outputTensor, 0.5);

      const details = detections.map(d => ({
        x: d.bbox[0], y: d.bbox[1], w: d.bbox[2], h: d.bbox[3]
      }));

      resultados[imgPath] = {
        count: detections.length,
        status: "Sucesso (ONNX)",
        details: details 
      };
    }
    return resultados;
  } catch (error) {
    console.error("Erro no ONNX Runtime:", error);
    throw new Error(`Falha no processamento ONNX: ${error.message}`);
  }
}

// --- MATEMÁTICA ONNX ---

function postProcessYOLO(outputTensor, threshold) {
  const data = outputTensor.data;
  const cols = outputTensor.dims[2]; // 8400
  const boxes = [];

  for (let i = 0; i < cols; i++) {
    const score = data[4 * cols + i]; 
    if (score > threshold) {
      const xc = data[0 * cols + i];
      const yc = data[1 * cols + i];
      const w = data[2 * cols + i];
      const h = data[3 * cols + i];

      boxes.push({
        bbox: [xc - w / 2, yc - h / 2, w, h],
        score: score
      });
    }
  }
  return applyNMS(boxes, 0.45);
}

function applyNMS(boxes, iouThreshold) {
  boxes.sort((a, b) => b.score - a.score);
  const result = [];
  while (boxes.length > 0) {
    const best = boxes.shift();
    result.push(best);
    boxes = boxes.filter(b => iou(best.bbox, b.bbox) < iouThreshold);
  }
  return result;
}

function iou(box1, box2) {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  const x_overlap = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
  const y_overlap = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
  const intersection = x_overlap * y_overlap;
  const union = (w1 * h1) + (w2 * h2) - intersection;
  return intersection / union;
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