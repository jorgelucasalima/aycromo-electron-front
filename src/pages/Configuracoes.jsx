import React, { useState, useEffect } from 'react';

export default function Configuracoes() {
  // --- ESTADOS EXISTENTES ---
  const [modelos, setModelos] = useState([{ id: 'yolo-v11', name: 'YOLO v11 (Padrão)', path: 'default', framework: 'YOLO' }]);
  const [modeloAtivo, setModeloAtivo] = useState('yolo-v11');
  const [datasets, setDatasets] = useState([
    { id: 'ds-kaggle', name: 'Kaggle: Cromossomos (Padrão)', path: 'https://www.kaggle.com/datasets/jorgelucaslima/dataset-cromossomo', type: 'remote' },
    { id: 'ds-teste-local', name: 'Dataset Local', path: '/assets/datasets/test', type: 'local' }
  ]);
  const [datasetAtivo, setDatasetAtivo] = useState('ds-kaggle');

  // --- NOVOS ESTADOS PARA O MODAL ---
  const [showModal, setShowModal] = useState(false);
  const [tempModelo, setTempModelo] = useState(null);

  useEffect(() => {
    const modelosSalvos = localStorage.getItem('modelos_ia');
    const modeloAtivoSalvo = localStorage.getItem('modelo_ativo');
    const datasetsSalvos = localStorage.getItem('datasets_ia');
    const datasetAtivoSalvo = localStorage.getItem('dataset_ativo');

    if (modelosSalvos) setModelos(JSON.parse(modelosSalvos));
    if (modeloAtivoSalvo) setModeloAtivo(modeloAtivoSalvo);
    if (datasetsSalvos) {
      const salvos = JSON.parse(datasetsSalvos);
      const existeKaggle = salvos.find(d => d.id === 'ds-kaggle');
      setDatasets(existeKaggle ? salvos : [datasets[0], ...salvos]);
    }
    if (datasetAtivoSalvo) setDatasetAtivo(datasetAtivoSalvo);
  }, []);

  const notificarMudanca = () => window.dispatchEvent(new Event('modeloAlterado'));

  // --- LÓGICA DE IMPORTAÇÃO COM MODAL ---
  const handleIniciarImportacao = async () => {
    if (!window.electronAPI) {
      alert("Recurso disponível apenas na aplicação Desktop.");
      return;
    }
    const novoModelo = await window.electronAPI.importModel();
    if (novoModelo) {
      setTempModelo(novoModelo); // Guarda o arquivo temporariamente
      setShowModal(true);        // Abre o modal para perguntar o framework
    }
  };

  const finalizarImportacao = (framework) => {
    const novoObjetoModelo = { 
      ...tempModelo, 
      id: Date.now().toString(),
      framework: framework // Adiciona se é YOLO ou PyTorch
    };
    const novaLista = [...modelos, novoObjetoModelo];
    
    setModelos(novaLista);
    localStorage.setItem('modelos_ia', JSON.stringify(novaLista));
    
    setShowModal(false);
    setTempModelo(null);
    notificarMudanca();
  };

  const selecionarModelo = (id) => {
    setModeloAtivo(id);
    localStorage.setItem('modelo_ativo', id);
    notificarMudanca();
  };

  const selecionarDataset = (id) => {
    setDatasetAtivo(id);
    localStorage.setItem('dataset_ativo', id);
  };

  const handleImportarDataset = async () => {
    if (!window.electronAPI) return alert("Apenas no Desktop");
    const novo = await window.electronAPI.importDataset(); 
    if (novo) {
      const novaLista = [...datasets, { ...novo, id: Date.now().toString(), type: 'local' }];
      setDatasets(novaLista);
      localStorage.setItem('datasets_ia', JSON.stringify(novaLista));
    }
  };

  return (
    <div className="p-6 relative">
      <h1 className="text-4xl font-bold">Configuração</h1>
      <p className="mt-4 text-gray-600">Gerencie seus modelos de IA e conjuntos de dados.</p>

      {/* MODAL DE SELEÇÃO DE FRAMEWORK */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900">Padronização do Modelo</h3>
            <p className="text-gray-500 mt-2">O arquivo <b>{tempModelo?.name}</b> foi carregado. Qual a arquitetura deste modelo?</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => finalizarImportacao('YOLO')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-100 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <span className="font-bold text-lg text-gray-700 group-hover:text-blue-600">YOLO</span>
                <span className="text-xs text-gray-400 text-center">Detecção em tempo real (v8, v11...)</span>
              </button>
              
              <button 
                onClick={() => finalizarImportacao('PyTorch')}
                className="flex flex-col items-center justify-center p-4 border-2 border-gray-100 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
              >
                <span className="font-bold text-lg text-gray-700 group-hover:text-orange-600">PyTorch</span>
                <span className="text-xs text-gray-400 text-center">Modelos .pt customizados</span>
              </button>
            </div>

            <button 
              onClick={() => setShowModal(false)}
              className="w-full mt-6 text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Cancelar importação
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUNA 1: MODELOS */}
        <section>
          <h2 className="text-2xl font-semibold mb-2">Modelos de Visão</h2>
          <div className="flex flex-col gap-3">
            {modelos.map((modelo) => (
              <div key={modelo.id} className={`p-4 border rounded-lg flex justify-between items-center ${modeloAtivo === modelo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 truncate">{modelo.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                      {modelo.framework || 'YOLO'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 truncate block">{modelo.path}</span>
                </div>
                <button onClick={() => selecionarModelo(modelo.id)} className={`ml-4 px-4 py-2 rounded text-sm font-semibold ${modeloAtivo === modelo.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {modeloAtivo === modelo.id ? 'Ativo' : 'Usar'}
                </button>
              </div>
            ))}
            <button onClick={handleIniciarImportacao} className="mt-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all text-sm font-medium">
              + Incluir novo modelo customizado
            </button>
          </div>
        </section>

        {/* COLUNA 2: DATASETS */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Datasets</h2>
          <div className="flex flex-col gap-3">
            {datasets.map((ds) => (
              <div key={ds.id} className={`p-4 border rounded-lg flex justify-between items-center ${datasetAtivo === ds.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="max-w-[70%] text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 truncate">{ds.name}</span>
                    {ds.type === 'remote' && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase">Cloud</span>}
                  </div>
                  <span className="text-xs text-gray-500 block truncate">{ds.path}</span>
                </div>
                <button onClick={() => selecionarDataset(ds.id)} className={`px-4 py-2 rounded text-sm font-semibold ${datasetAtivo === ds.id ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {datasetAtivo === ds.id ? 'Ativo' : 'Selecionar'}
                </button>
              </div>
            ))}
            <button onClick={handleImportarDataset} className="mt-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-400 hover:text-green-500 transition-all text-sm font-medium">
              + Anexar dataset local (Pasta)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}