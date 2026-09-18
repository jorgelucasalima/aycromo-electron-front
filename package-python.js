const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, 'src', 'scripts');
const binDir = path.join(scriptsDir, 'bin');

// Garantir que a pasta bin existe
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log('Iniciando compilação do Python com PyInstaller...');

try {
  // Compila detect_chromosomes.py
  console.log('Compilando detect_chromosomes.py...');
  const pyinstallerArgs = [
    '--noconfirm',
    '--onefile',
    '--console',
    '--collect-all ultralytics',
    '--collect-all torch',
    '--collect-all torchvision',
    '--copy-metadata ultralytics',
    '--copy-metadata torch',
    '--copy-metadata torchvision',
    '--copy-metadata tqdm',
    '--copy-metadata requests',
    '--copy-metadata packaging',
    '--copy-metadata filelock',
    '--copy-metadata pyyaml',
    '--copy-metadata py-cpuinfo',
    '--hidden-import ultralytics',
    '--hidden-import torchvision',
    '--hidden-import torch',
    '--hidden-import onnxruntime',
    '--hidden-import cv2',
    '--hidden-import numpy'
  ].join(' ');
  
  execSync(`pyinstaller ${pyinstallerArgs} --distpath "${binDir}" --workpath "${path.join(__dirname, 'build', 'pyinstaller-work')}" "${path.join(scriptsDir, 'detect_chromosomes.py')}"`, { stdio: 'inherit' });

  // Compila benchmark.py (se existir)
  const benchmarkPath = path.join(scriptsDir, 'benchmark.py');
  if (fs.existsSync(benchmarkPath)) {
    console.log('Compilando benchmark.py...');
    execSync(`pyinstaller ${pyinstallerArgs} --distpath "${binDir}" --workpath "${path.join(__dirname, 'build', 'pyinstaller-work')}" "${benchmarkPath}"`, { stdio: 'inherit' });
  }

  console.log('Compilação concluída com sucesso!');
  console.log(`Os executáveis foram gerados em: ${binDir}`);
} catch (error) {
  console.error('Erro durante a compilação do PyInstaller:', error.message);
  process.exit(1);
}
