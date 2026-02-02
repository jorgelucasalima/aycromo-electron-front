import { defineConfig } from 'vite';

// Adicione ou procure a seção 'build'
export default defineConfig({
  build: {
    rollupOptions: {
      // Aqui dizemos ao Vite para ignorar essas bibliotecas no bundle
      // e usar as que estão instaladas no node_modules
      external: [
        'onnxruntime-node', 
        'sharp',
        'electron',
        'path',
        'fs',
        'child_process'
      ], 
    },
  },
  // ... resto da sua configuração
});