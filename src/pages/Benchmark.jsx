import React, { useState, useEffect } from 'react';

// Datasets Fixos
const DATASETS_ESTATICOS = [
  { id: 'ds-interno', name: 'Dataset Interno (Padrão)', path: 'datasets/yolo/images', type: 'local' },
];

export default function Benchmark() {
  // --- ESTADOS DE CONFIGURAÇÃO ---
  const [modelos, setModelos] = useState([{ id: 'yolo-base', name: 'YOLO v11 (Padrão)', path: 'best-yolo11.pt', framework: 'YOLO' }]);
  const [datasets, setDatasets] = useState(DATASETS_ESTATICOS);
  const [datasetAtivo, setDatasetAtivo] = useState(DATASETS_ESTATICOS[0]);
  
  // --- ESTADOS DO BENCHMARK ---
  const [resultados, setResultados] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    // Carregar dados salvos
    const mSalvos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    const dSalvos = JSON.parse(localStorage.getItem('datasets_ia') || '[]');
    
    // Mesclar com padrões
    const padroes = [{ id: 'yolo-base', name: 'YOLO v11 (Padrão)', path: 'best-yolo11.pt', framework: 'YOLO' }];
    const filtrados = mSalvos.filter((m) => m.path !== 'default' && m.id !== 'yolo-v11' && m.path !== 'best-yolo11.pt');
    const todosModelos = [...padroes, ...filtrados];

    setModelos(todosModelos);
    setDatasets([...DATASETS_ESTATICOS, ...dSalvos]);
  }, []);

  // --- FUNÇÃO DO BENCHMARK ---
  const rodarBenchmark = async () => {
    if (!datasetAtivo) return alert("Selecione um dataset.");
    if (datasetAtivo.type === 'remote') return alert("Use um dataset local com pasta /labels.");
    
    setProcessing(true);
    setResultados([]); // Limpa resultados anteriores
    setLogs([]);
    setProgresso(0);

    let idx = 0;
    const total = modelos.length;

    if (total === 0) {
      setProcessing(false);
      return;
    }

    for (const modelo of modelos) {
      try {
        setLogs(prev => [...prev, `Testando ${modelo.name}... (${idx + 1}/${total})`]);
        
        const metricas = await window.electronAPI.runBenchmarkMetrics({
            modeloPath: (modelo.path === 'default' || modelo.id === 'yolo-v11' || modelo.id === 'yolo-base') ? 'best-yolo11.pt' : modelo.path,
            datasetPath: datasetAtivo.path
        });

        if (metricas.error) throw new Error(metricas.error);
        
        setResultados(prev => [...prev, { ...metricas, name: modelo.name }]);
      } catch (err) {
        console.error(err);
        setLogs(prev => [...prev, `Erro em ${modelo.name}: ${err.message}`]);
      }

      idx++;
      setProgresso((idx / total) * 100);
    }
    
    setProcessing(false);
  };

  return (
    <div className="p-4 min-h-screen pb-20">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Benchmark</h1>

      {/* --- SEÇÃO 1: CONFIGURAÇÃO --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Card Modelos */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-bold mb-4 flex justify-between">
            Modelos Disponíveis
          </h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {modelos.map(m => (
              <div 
                key={m.id} 
                className="flex justify-between p-3 rounded border bg-gray-50 flex-col sm:flex-row gap-1"
              >
                <span className="font-medium truncate">{m.name}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded w-fit">{m.framework}</span>
              </div>
            ))}
          </div>
        </div>
 
        {/* Card Datasets */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-bold mb-4 flex justify-between">
            Dataset de Teste
          </h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {datasets.map(ds => (
              <div 
                key={ds.id} 
                onClick={() => setDatasetAtivo(ds)}
                className={`flex justify-between p-3 rounded border cursor-pointer ${datasetAtivo?.id === ds.id ? 'border-green-500 bg-green-50' : 'bg-gray-50'}`}
              >
                <span className="font-medium truncate">{ds.name}</span>
                <span className="text-xs">{ds.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* --- SEÇÃO 2: TABELA COMPARATIVA --- */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Resultados do Benchmark</h2>
          <button 
            onClick={rodarBenchmark} 
            disabled={processing || !datasetAtivo}
            className={`btn btn-primary bg-blue-600 ${processing ? 'loading' : ''}`}
          >
            {processing ? 'Processando...' : 'Rodar Comparativo em Lote'}
          </button>
        </div>

        {/* Barra de Progresso */}
        {processing && (
          <div className="mb-4 bg-white p-4 rounded-xl shadow border border-gray-200">
            <div className="flex justify-between text-sm mb-2 text-gray-700 font-semibold">
              <span>Progresso da Avaliação</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300 ease-out" 
                style={{ width: `${progresso}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow border">
          <table className="table w-full">
            <thead className="bg-gray-100">
              <tr>
                <th>Modelo</th>
                <th>mAP (50%)</th>
                <th>Precisão</th>
                <th>Recall</th>
                <th>Velocidade</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">Nenhum teste executado ainda.</td></tr>
              ) : (
                [...resultados].sort((a,b) => (b.map50 || 0) - (a.map50 || 0)).map((res, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="font-bold">{res.name} {idx===0 && 'Melhor'}</td>
                    <td className="text-green-600 font-bold">{(res.map50 * 100).toFixed(1)}%</td>
                    <td>{res.precision}</td>
                    <td>{res.recall}</td>
                    <td>{res.speed} ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Terminal de Logs */}
        <div className="mt-4 p-3 bg-gray-900 text-green-400 font-mono text-xs h-32 overflow-y-auto rounded-lg">
           {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}