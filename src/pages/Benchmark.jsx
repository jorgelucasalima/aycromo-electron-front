import React, { useState, useEffect } from 'react';

// --- CONFIGURAÇÃO DOS DATASETS FIXOS ---
// Certifique-se de mover sua pasta de imagens para a pasta 'public' do projeto
// Estrutura recomendada: aycromo/public/datasets/yolo/images
const DATASETS_ESTATICOS = [
  { 
    id: 'ds-interno-yolo', 
    name: 'Dataset Interno (YOLO Test)', 
    // O caminho agora aponta para a raiz pública (onde o Electron busca arquivos estáticos)
    path: 'datasets/yolo/images', 
    type: 'local' 
  },
  { 
    id: 'ds-kaggle', 
    name: 'Kaggle: Cromossomos', 
    path: 'https://www.kaggle.com/datasets/jorgelucaslima/dataset-cromossomo', 
    type: 'remote' 
  }
];

export default function Benchmark() {
  const [config, setConfig] = useState({ model: null, dataset: null });
  const [status, setStatus] = useState('idle'); 
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [progress, setProgress] = useState(0);

  // 1. Carrega as configurações ativas e resolve os nomes corretos
  useEffect(() => {
    // --- CARREGAR MODELO ---
    const idModelo = localStorage.getItem('modelo_ativo') || 'yolo-v11';
    const listaModelos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    
    // Adiciona o modelo padrão na busca caso não esteja no localStorage
    const todosModelos = [...listaModelos, { id: 'yolo-v11', name: 'YOLO v11 (Padrão)', path: 'default', framework: 'YOLO' }];
    const modelo = todosModelos.find(m => m.id === idModelo);

    // --- CARREGAR DATASET ---
    const idDataset = localStorage.getItem('dataset_ativo') || 'ds-interno-yolo';
    const listaDatasets = JSON.parse(localStorage.getItem('datasets_ia') || '[]');
    
    // Mescla os estáticos com os salvos para poder encontrar o dataset padrão
    const todosDatasets = [...DATASETS_ESTATICOS, ...listaDatasets];
    const dataset = todosDatasets.find(d => d.id === idDataset);

    setConfig({ 
      model: modelo || { name: 'Desconhecido', path: '' }, 
      dataset: dataset || { name: 'Desconhecido', path: '', type: 'local' } 
    });
  }, []);

  const addLog = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runBenchmark = async () => {
    if (!config.model || !config.dataset) return;
    
    // Validação de Dataset Remoto
    if (config.dataset.type === 'remote') {
      alert("O Benchmark requer acesso direto aos arquivos locais para medir a velocidade real. Por favor, selecione o Dataset Interno ou outro dataset local.");
      return;
    }

    setStatus('loading');
    setMetrics(null);
    setLogs([]);
    setProgress(10);
    
    try {
      addLog(`Iniciando Benchmark...`);
      addLog(`Modelo: ${config.model.name}`);
      addLog(`Dataset: ${config.dataset.name}`);

      // 1. Listar arquivos
      addLog(`Escaneando pasta: ${config.dataset.path}`);
      
      // Chama o Electron para ler a pasta
      const imagens = await window.electronAPI.listFiles(config.dataset.path);
      
      if (!imagens || imagens.length === 0) {
        throw new Error(`Nenhuma imagem encontrada em: ${config.dataset.path}. Verifique se a pasta existe dentro de 'public'.`);
      }
      
      addLog(`Encontradas ${imagens.length} imagens para teste.`);
      setProgress(30);

      // 2. Iniciar Cronômetro
      const startTime = performance.now();

      // 3. Executar Inferência
      addLog(`Enviando lote para processamento... aguarde.`);
      const resultados = await window.electronAPI.runInference({
        modeloPath: config.model.path,
        imagens: imagens
      });

      // 4. Parar Cronômetro e Calcular
      const endTime = performance.now();
      const totalTimeMs = endTime - startTime;
      const totalTimeSec = totalTimeMs / 1000;
      
      setProgress(100);

      // Cálculos
      const totalImages = Object.keys(resultados).length;
      const fps = totalImages / totalTimeSec;
      const avgTimePerImage = totalTimeMs / totalImages;

      // Contagem total de cromossomos detectados
      let totalCromossomos = 0;
      Object.values(resultados).forEach(r => totalCromossomos += (r.count || 0));

      setMetrics({
        totalImages,
        totalTime: totalTimeSec.toFixed(2),
        fps: fps.toFixed(1),
        avgTime: avgTimePerImage.toFixed(0), // ms
        totalDetections: totalCromossomos
      });

      addLog(`Sucesso! Processamento finalizado.`);
      setStatus('success');

    } catch (error) {
      console.error(error);
      addLog(`ERRO: ${error.message || error}`);
      setStatus('error');
      setProgress(0);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Benchmark de Performance</h1>
        <p className="text-gray-500 mt-2">Teste a velocidade e eficiência do modelo selecionado contra o dataset ativo.</p>
      </div>

      {/* CONFIG CARD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-8 flex-1">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Modelo Ativo</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <p className="font-semibold text-lg text-gray-800">{config.model?.name || 'Carregando...'}</p>
            </div>
            <p className="text-xs text-gray-400 truncate max-w-[200px]" title={config.model?.path}>{config.model?.path}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Dataset de Teste</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config.dataset?.type === 'local' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              <p className="font-semibold text-lg text-gray-800">{config.dataset?.name || 'Carregando...'}</p>
            </div>
            <p className="text-xs text-gray-400 truncate max-w-[200px]" title={config.dataset?.path}>{config.dataset?.path}</p>
          </div>
        </div>

        <button 
          onClick={runBenchmark}
          disabled={status === 'loading' || config.dataset?.type === 'remote'}
          className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-105 ${
            status === 'loading' || config.dataset?.type === 'remote'
             ? 'bg-gray-400 cursor-not-allowed transform-none' 
             : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {status === 'loading' ? 'Executando...' : 'INICIAR TESTE'}
        </button>
      </div>

      {/* PROGRESS BAR */}
      {status === 'loading' && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8 overflow-hidden">
          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {/* RESULTS GRID */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* FPS CARD */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-indigo-500">
            <span className="text-gray-400 text-xs font-bold uppercase">Velocidade (FPS)</span>
            <h3 className="text-4xl font-extrabold text-indigo-600 mt-2">{metrics.fps}</h3>
            <p className="text-sm text-gray-500">Quadros por segundo</p>
          </div>

          {/* TIME CARD */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <span className="text-gray-400 text-xs font-bold uppercase">Latência Média</span>
            <h3 className="text-4xl font-extrabold text-blue-600 mt-2">{metrics.avgTime}<span className="text-lg">ms</span></h3>
            <p className="text-sm text-gray-500">Por imagem</p>
          </div>

          {/* TOTAL IMAGES */}
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <span className="text-gray-400 text-xs font-bold uppercase">Imagens Processadas</span>
            <h3 className="text-4xl font-extrabold text-green-600 mt-2">{metrics.totalImages}</h3>
            <p className="text-sm text-gray-500">Em {metrics.totalTime} segundos</p>
          </div>

           {/* TOTAL DETECTIONS */}
           <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
            <span className="text-gray-400 text-xs font-bold uppercase">Cromossomos</span>
            <h3 className="text-4xl font-extrabold text-purple-600 mt-2">{metrics.totalDetections}</h3>
            <p className="text-sm text-gray-500">Objetos identificados</p>
          </div>
        </div>
      )}

      {/* LOG TERMINAL */}
      <div className="flex-1 bg-gray-900 rounded-xl p-4 font-mono text-sm overflow-y-auto border border-gray-700 shadow-inner max-h-[300px]">
        <div className="text-gray-400 mb-2 border-b border-gray-700 pb-2">Terminal de Execução</div>
        {logs.length === 0 ? (
          <span className="text-gray-600 italic">Aguardando início...</span>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-green-400 mb-1">
              <span className="text-gray-500 mr-2">{log.split(']')[0]}]</span>
              {log.split(']')[1]}
            </div>
          ))
        )}
      </div>

    </div>
  );
}