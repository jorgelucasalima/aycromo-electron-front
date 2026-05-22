const ignore = (file) => {
      if (!file) return false;
      if (['/src', '/package.json'].includes(file)) return false;
      if (file.startsWith('/.vite')) return false;
      if (file.startsWith('/node_modules')) return false;
      if (file.startsWith('/build')) return false;
      if (file.startsWith('/src/scripts')) return false;
      if (file.endsWith('.pt') || file.endsWith('.onnx')) return false;
      
      if (file.startsWith('/src/') && !file.startsWith('/src/scripts')) return true;
      if (/^\/(public|\.github|\.git|dist|out|runs)/.test(file)) return true;
      if (/^\/[^\/]+\.(js|ts|mjs|json|md|yaml)$/.test(file) && file !== '/package.json') return true;
      
      return false;
};

const paths = [
  '/src',
  '/src/components',
  '/src/scripts',
  '/src/scripts/benchmark.py',
  '/best-yolo11.pt',
  '/package.json',
  '/vite.config.js',
  '/.git',
  '/node_modules/teste',
  '/out/make'
];

paths.forEach(p => console.log(p, ignore(p) ? 'IGNORED' : 'KEPT'));
