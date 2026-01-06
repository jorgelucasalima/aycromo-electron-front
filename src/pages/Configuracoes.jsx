import React, { useState, useEffect } from 'react';

export default function Configuracoes() {
  const [modelos, setModelos] = useState([
    { id: 'yolo-v11', name: 'YOLO v11 (Padrão)', path: 'default' }
  ]);
  const [modeloAtivo, setModeloAtivo] = useState('yolo-v11');
  const [modeloNome, setModeloNome] = useState('YOLO v11 (Padrão)');

  useEffect(() => {
    const salvos = localStorage.getItem('modelos_ia');
    const ativo = localStorage.getItem('modelo_ativo');
    if (salvos) setModelos(JSON.parse(salvos));
    if (ativo) setModeloAtivo(ativo);
  }, []);

  useEffect(() => {
  const carregarNomeModelo = () => {
    const idAtivo = localStorage.getItem('modelo_ativo');
    const modelos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    
    if (idAtivo === 'yolo-v11' || !idAtivo) {
      setModeloNome('YOLO v11 (Padrão)');
    } else {
      const encontrado = modelos.find(m => m.id === idAtivo);
      setModeloNome(encontrado ? encontrado.name : 'YOLO v11 (Padrão)');
    }
  };

  carregarNomeModelo(); // Carrega ao iniciar

  // Escuta o evento que criamos no outro componente
  window.addEventListener('modeloAlterado', carregarNomeModelo);
  return () => window.removeEventListener('modeloAlterado', carregarNomeModelo);
}, []);

  // Função para avisar o Menu que algo mudou
  const notificarMudanca = () => {
    window.dispatchEvent(new Event('modeloAlterado'));
  };

  const handleImportarModelo = async () => {
    if (!window.electronAPI) {
      alert("Recurso disponível apenas na aplicação Desktop.");
      return;
    }

    const novoModelo = await window.electronAPI.importModel();
    if (novoModelo) {
      const novaLista = [...modelos, { ...novoModelo, id: Date.now().toString() }];
      setModelos(novaLista);
      localStorage.setItem('modelos_ia', JSON.stringify(novaLista));
      notificarMudanca(); // Notifica o menu
    }
  };

  const selecionarModelo = (id) => {
    setModeloAtivo(id);
    localStorage.setItem('modelo_ativo', id);
    notificarMudanca(); // Notifica o menu instantaneamente
  };

  return (
    <div>
      <h1 className="text-4xl font-bold">Configuração</h1>
      <p className="mt-4">Bem-vindo ao painel de configuração!</p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">Modelos de Visão Computacional</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Selecione o modelo para identificação de cromossomos ou adicione um novo arquivo .onnx ou .pt
        </p>

        <div className="flex flex-col gap-3 max-w-2xl">
          {modelos.map((modelo) => (
            <div 
              key={modelo.id}
              className={`p-4 border rounded-lg flex justify-between items-center ${
                modeloAtivo === modelo.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
              }`}
            >
              <div>
                <span className="font-bold block text-gray-800">{modelo.name}</span>
                <span className="text-xs text-gray-500">{modelo.path}</span>
              </div>
              
              <button
                onClick={() => selecionarModelo(modelo.id)}
                className={`px-4 py-2 rounded font-semibold transition-all ${
                  modeloAtivo === modelo.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {modeloAtivo === modelo.id ? 'Ativo' : 'Usar este'}
              </button>
            </div>
          ))}

          <button
            onClick={handleImportarModelo}
            className="mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-500 transition-all font-medium"
          >
            + Incluir novo modelo customizado
          </button>
        </div>
      </div>
    </div>
  );
}