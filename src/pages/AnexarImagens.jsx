import { useState } from 'react';
import InputFile from '../components/InputFile';

export default function AnexarImagens({ onNavegar }) { // Recebe função para mudar de tela
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleRemoveImage = (fileToRemove) => {
    setSelectedFiles(selectedFiles.filter(file => file !== fileToRemove));
  };

  const handleProcessar = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);

    const idAtivo = localStorage.getItem('modelo_ativo') || 'yolo-v11';
    const modelosSalvos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    
    let caminhoModelo = 'default';
    let nomeModelo = 'YOLO v11 (Padrão)';

    if (idAtivo !== 'yolo-v11') {
      const mod = modelosSalvos.find(m => m.id === idAtivo);
      if (mod) {
        caminhoModelo = mod.path;
        nomeModelo = mod.name;
      }
    }

    const caminhosImagens = selectedFiles.map(file => file.path);

    try {
      // Chamada para o Electron
      const resultados = await window.electronAPI.runInference({
        modeloPath: caminhoModelo,
        imagens: caminhosImagens
      });

      // --- SALVAR NO HISTÓRICO PARA O RELATÓRIO ---
      const novoRelatorio = {
        id: Date.now(),
        data: new Date().toLocaleString(),
        modelo: nomeModelo,
        totalImagens: selectedFiles.length,
        detalhes: resultados // O JSON retornado pelo Python
      };

      const historicoExistente = JSON.parse(localStorage.getItem('historico_aycromo') || '[]');
      localStorage.setItem('historico_aycromo', JSON.stringify([novoRelatorio, ...historicoExistente]));

      // Limpa e Redireciona
      setSelectedFiles([]);
      onNavegar('relatorios'); // Função que você deve ter no App.js para trocar a tela
      
    } catch (error) {
      console.error("Erro no processamento:", error);
      alert("Erro ao processar: Verifique se o Python está configurado corretamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Anexar Imagens</h1>
      
      <div className="flex-grow">
        <InputFile
          selectedFiles={selectedFiles}
          onFileChange={handleFileChange}
          onRemoveImage={handleRemoveImage}
          disabled={isProcessing}
        />
      </div>

      {/* MODAL DE LOADING OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-xl font-bold animate-pulse">Identificando Cromossomos...</p>
          <p className="text-sm text-gray-300">O modelo YOLO está processando o lote.</p>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleProcessar}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="btn btn-primary w-full shadow-lg"
        >
          {isProcessing ? 'Aguarde...' : `Processar ${selectedFiles.length} Imagens`}
        </button>
      </div>
    </div>
  );
}