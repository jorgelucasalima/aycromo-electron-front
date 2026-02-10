import React, { useState, useEffect } from 'react';

// Datasets fixos do sistema
const DATASETS_ESTATICOS = [
  { 
    id: 'ds-interno-yolo', 
    name: 'Dataset Interno (YOLO Test)', 
    path: 'assets/test/yolo', 
    type: 'local' 
  },
];

export default function Configuracoes() {
  const [modelos, setModelos] = useState([{ id: 'yolo-v11', name: 'YOLO v11 (Padrão)', path: 'default', framework: 'YOLO' }]);
  const [modeloAtivo, setModeloAtivo] = useState('yolo-v11');
  
  // Alterado: O datasetAtivo agora inicia como 'ds-interno-yolo'
  const [datasets, setDatasets] = useState(DATASETS_ESTATICOS);
  const [datasetAtivo, setDatasetAtivo] = useState('ds-interno-yolo');

  const [showModal, setShowModal] = useState(false);
  const [tempModelo, setTempModelo] = useState(null);

  useEffect(() => {
    const mSalvos = localStorage.getItem('modelos_ia');
    const mAtivo = localStorage.getItem('modelo_ativo');
    const dImportados = localStorage.getItem('datasets_ia');
    const dAtivo = localStorage.getItem('dataset_ativo');

    if (mSalvos) setModelos(JSON.parse(mSalvos));
    if (mAtivo) setModeloAtivo(mAtivo);
    
    // Mescla fixos com importados
    if (dImportados) {
      setDatasets([...DATASETS_ESTATICOS, ...JSON.parse(dImportados)]);
    }
    
    // Só substitui o padrão se houver uma escolha salva explicitamente pelo usuário
    if (dAtivo) {
      setDatasetAtivo(dAtivo);
    } else {
      localStorage.setItem('dataset_ativo', 'ds-interno-yolo');
    }
  }, []);

  const notificarMudanca = () => window.dispatchEvent(new Event('modeloAlterado'));

  const selecionarDataset = (id) => {
    setDatasetAtivo(id);
    localStorage.setItem('dataset_ativo', id);
  };

  const handleExcluirModelo = (id) => {
    if (id === 'yolo-v11') return;
    const novaLista = modelos.filter(m => m.id !== id);
    setModelos(novaLista);
    localStorage.setItem('modelos_ia', JSON.stringify(novaLista));
    if (modeloAtivo === id) {
      setModeloAtivo('yolo-v11');
      localStorage.setItem('modelo_ativo', 'yolo-v11');
      notificarMudanca();
    }
  };

  const handleExcluirDataset = (id) => {
    if (DATASETS_ESTATICOS.find(d => d.id === id)) return;
    const importados = datasets
      .filter(d => !DATASETS_ESTATICOS.find(f => f.id === d.id))
      .filter(d => d.id !== id);
    
    setDatasets([...DATASETS_ESTATICOS, ...importados]);
    localStorage.setItem('datasets_ia', JSON.stringify(importados));

    if (datasetAtivo === id) {
      setDatasetAtivo('ds-interno-yolo'); // Volta para o novo padrão local
      localStorage.setItem('dataset_ativo', 'ds-interno-yolo');
    }
  };

  const handleIniciarImportacao = async () => {
    const novo = await window.electronAPI.importModel();
    if (novo) { setTempModelo(novo); setShowModal(true); }
  };

  const finalizarImportacao = (framework) => {
    const novoObj = { ...tempModelo, id: Date.now().toString(), framework };
    const novaLista = [...modelos, novoObj];
    setModelos(novaLista);
    localStorage.setItem('modelos_ia', JSON.stringify(novaLista));
    setShowModal(false);
    notificarMudanca();
  };

  const handleImportarDataset = async () => {
    const novo = await window.electronAPI.importDataset(); 
    if (novo) {
      const novoObj = { ...novo, id: Date.now().toString(), type: 'local' };
      const importados = datasets.filter(d => !DATASETS_ESTATICOS.find(f => f.id === d.id));
      const novaLista = [...importados, novoObj];
      setDatasets([...DATASETS_ESTATICOS, ...novaLista]);
      localStorage.setItem('datasets_ia', JSON.stringify(novaLista));
    }
  };

  return (
    <div className="p-8 min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Painel de Controle</h1>
        <p className="text-gray-500 mt-2">Configurações de infraestrutura para análise cromossômica.</p>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Framework do Modelo</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => finalizarImportacao('YOLO')} className="p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all">
                <span className="font-bold block text-blue-600 italic">YOLO</span>
                <span className="text-xs text-gray-400 font-medium">Recomendado para visão computacional.</span>
              </button>
              <button onClick={() => finalizarImportacao('PyTorch')} className="p-4 border-2 rounded-xl hover:border-orange-500 hover:bg-orange-50 text-left transition-all">
                <span className="font-bold block text-orange-600 italic">PyTorch</span>
                <span className="text-xs text-gray-400 font-medium">Uso de bibliotecas .pt puras.</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* MODELOS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🧠 Modelos</h2>
          </div>
          <div className="space-y-3">
            {modelos.map((m) => (
              <div key={m.id} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${modeloAtivo === m.id ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-gray-50'}`}>
                <div className="truncate flex-1">
                  <span className="font-bold text-gray-800 block truncate">{m.name}</span>
                  <span className="text-[10px] text-blue-500 font-bold uppercase">{m.framework}</span>
                </div>
                <div className="flex gap-2">
                  {m.id !== 'yolo-v11' && (
                    <button onClick={() => handleExcluirModelo(m.id)} className="p-2 text-gray-400 hover:text-red-500"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  )}
                  <button onClick={() => { setModeloAtivo(m.id); localStorage.setItem('modelo_ativo', m.id); notificarMudanca(); }} className={`px-4 py-2 rounded-lg font-bold text-xs ${modeloAtivo === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white border'}`}>{modeloAtivo === m.id ? 'ATIVO' : 'SELECIONAR'}</button>
                </div>
              </div>
            ))}
            <button onClick={handleIniciarImportacao} className="w-full p-4 border-2 border-dashed rounded-xl text-gray-400 hover:text-blue-500 hover:bg-gray-50 transition-all font-medium italic">+ Adicionar Modelo Customizado</button>
          </div>
        </section>

        {/* DATASETS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📂 Datasets</h2>
          </div>
          <div className="space-y-3">
            {datasets.map((ds) => (
              <div key={ds.id} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${datasetAtivo === ds.id ? 'border-green-500 bg-green-50/20' : 'border-gray-200 bg-gray-50'}`}>
                <div className="truncate flex-1">
                  <span className="font-bold text-gray-800 block truncate">{ds.name}</span>
                  <span className="text-[10px] text-green-600 font-bold uppercase">{ds.type === 'remote' ? 'Cloud' : 'Sistema'}</span>
                </div>
                <div className="flex gap-2">
                  {!DATASETS_ESTATICOS.find(f => f.id === ds.id) && (
                    <button onClick={() => handleExcluirDataset(ds.id)} className="p-2 text-gray-400 hover:text-red-500"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  )}
                  <button onClick={() => selecionarDataset(ds.id)} className={`px-4 py-2 rounded-lg font-bold text-xs ${datasetAtivo === ds.id ? 'bg-green-600 text-white shadow-md' : 'bg-white border'}`}>{datasetAtivo === ds.id ? 'ATIVO' : 'SELECIONAR'}</button>
                </div>
              </div>
            ))}
            <button onClick={handleImportarDataset} className="w-full p-4 border-2 border-dashed rounded-xl text-gray-400 hover:text-green-500 hover:bg-gray-50 transition-all font-medium italic">+ Vincular Pasta Externa</button>
          </div>
        </section>
      </div>
    </div>
  );
}