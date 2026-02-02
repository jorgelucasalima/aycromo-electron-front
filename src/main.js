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
    width: 1100,
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

ipcMain.handle('list-files', async (event, relativePath) => {
  // 1. Limpa o caminho recebido
  const cleanPath = relativePath.replace(/^\/|^\\/, ''); // Remove barras iniciais
  
  // 2. Define onde procurar (A ordem importa!)
  const searchPaths = [
    // Opção A: Dentro de 'public' (Modo Desenvolvimento)
    path.join(process.cwd(), 'public', cleanPath),
    
    // Opção B: Dentro da raiz do app (Modo Produção/Build)
    path.join(app.getAppPath(), cleanPath),
    
    // Opção C: Tenta 'public' dentro do app path (Caso específico de alguns builds Vite)
    path.join(app.getAppPath(), 'public', cleanPath)
  ];

  console.log(`[ListFiles] Procurando pasta '${cleanPath}' em:`);
  
  // 3. Procura o primeiro caminho que existe de verdade
  let foundPath = null;
  for (const p of searchPaths) {
    const exists = fs.existsSync(p);
    console.log(` - ${p} : ${exists ? 'ENCONTRADO ✅' : 'Não existe ❌'}`);
    
    if (exists) {
      foundPath = p;
      break;
    }
  }

  // 4. Se não achou em lugar nenhum, retorna erro
  if (!foundPath) {
    console.error(`[ListFiles] ERRO FATAL: Pasta não encontrada em nenhum dos locais.`);
    return [];
  }

  // 5. Lê os arquivos do caminho encontrado
  try {
    const files = fs.readdirSync(foundPath);
    const images = files
      .filter(file => /\.(jpg|jpeg|png|bmp|webp)$/i.test(file))
      .map(file => path.join(foundPath, file));

    console.log(`[ListFiles] Sucesso! ${images.length} imagens encontradas em ${foundPath}`);
    return images;
  } catch (e) {
    console.error(`[ListFiles] Erro ao ler diretório: ${e.message}`);
    return [];
  }
});

// --- MOTOR 1: PYTHON (Para arquivos .pt) ---
function runPythonInference(modeloPath, imagens) {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    // Caminho do script dentro da pasta src/scripts
    // Use app.getAppPath() para garantir que funcione após o build
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
          // Tenta limpar logs extras que podem ter vindo antes do JSON
          const jsonStr = stdoutData.substring(stdoutData.indexOf('{')); 
          resolve(JSON.parse(jsonStr));
        } catch (err) {
          console.error("Falha ao parsear JSON do Python:", stdoutData);
          reject(`Saída inválida do Python. Verifique se o ultralytics está instalado.`);
        }
      } else {
        reject(`Erro no script Python (Código ${code}): ${stderrData}`);
      }
    });

    pythonProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(`Python não encontrado. Instale o Python e adicione ao PATH.`);
      } else {
        reject(err.message);
      }
    });
  });
}

// --- MOTOR 2: ONNX (Para arquivos .onnx - Sem dependência externa) ---
async function runOnnxInference(modeloPath, imagens) {
  try {
    // 1. Carrega o modelo na memória
    const session = await InferenceSession.create(modeloPath);
    const resultados = {};

    for (const imgPath of imagens) {
      // 2. Prepara a imagem (Resize 640x640 + Normalização)
      const { data } = await sharp(imgPath)
        .resize(640, 640, { fit: 'fill' }) // Força 640x640 ignorando aspect ratio (padrão YOLO)
        .removeAlpha() // Garante que seja RGB (3 canais), remove transparência
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Converter Uint8 (0-255) para Float32 (0.0-1.0)
      const inputData = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        inputData[i] = data[i] / 255.0;
      }

      // Cria o Tensor [1, 3, 640, 640]
      const tensor = new Tensor('float32', inputData, [1, 3, 640, 640]);

      // 3. Executa a inferência
      const output = await session.run({ [session.inputNames[0]]: tensor });
      
      // Pega a saída bruta (output0)
      const outputTensor = output[session.outputNames[0]];

      // 4. Pós-processamento (Decodifica a matriz confusa do YOLO em contagem)
      const detections = postProcessYOLO(outputTensor, 0.5); // 0.5 é a confiança mínima (50%)

      resultados[imgPath] = {
        count: detections.length,
        status: "Sucesso (ONNX)",
        details: detections // Opcional: coordenadas das caixas
      };
    }

    return resultados;

  } catch (error) {
    console.error("Erro no ONNX Runtime:", error);
    throw new Error(`Falha no processamento ONNX: ${error.message}`);
  }
}

// --- LÓGICA MATEMÁTICA DO ONNX (NMS & IoU) ---

function postProcessYOLO(outputTensor, threshold) {
  const data = outputTensor.data;
  // O formato de saída do YOLOv8 exportado costuma ser [1, 5, 8400]
  // 5 canais = [center_x, center_y, width, height, class_score]
  const rows = outputTensor.dims[1]; // 5
  const cols = outputTensor.dims[2]; // 8400

  const boxes = [];

  for (let i = 0; i < cols; i++) {
    // Acessa o score de confiança (índice 4)
    const score = data[4 * cols + i]; 

    if (score > threshold) {
      const xc = data[0 * cols + i];
      const yc = data[1 * cols + i];
      const w = data[2 * cols + i];
      const h = data[3 * cols + i];

      const x1 = xc - w / 2;
      const y1 = yc - h / 2;

      boxes.push({
        bbox: [x1, y1, w, h],
        score: score
      });
    }
  }

  return applyNMS(boxes, 0.45); // Remove sobreposições com IoU > 45%
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

// --- CICLO DE VIDA ---

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});