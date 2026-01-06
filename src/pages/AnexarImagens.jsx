import { useState } from 'react';
import InputFile from '../components/InputFile'; 

export default function AnexarImagens() {
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

    // 1. Pegar o modelo ativo e a lista de modelos do localStorage
    const idAtivo = localStorage.getItem('modelo_ativo') || 'yolo-v11';
    const modelosSalvos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    
    // 2. Encontrar o caminho real do modelo
    let caminhoModelo = 'default'; // O Electron saberá onde está o padrão
    if (idAtivo !== 'yolo-v11') {
      const mod = modelosSalvos.find(m => m.id === idAtivo);
      if (mod) caminhoModelo = mod.path;
    }

    // 3. Preparar os caminhos das imagens (o Electron precisa do path absoluto)
    const caminhosImagens = selectedFiles.map(file => file.path);

    try {
      // 4. Chamar o Electron para processar
      const resultados = await window.electronAPI.runInference({
        modeloPath: caminhoModelo,
        imagens: caminhosImagens
      });

      console.log("Cromossomos identificados:", resultados);
      alert("Processamento concluído!");
      
    } catch (error) {
      console.error("Erro no processamento:", error);
      alert("Erro ao processar imagens.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-white">Anexar Imagens</h1>
        <InputFile
          selectedFiles={selectedFiles}
          onFileChange={handleFileChange}
          onRemoveImage={handleRemoveImage}
        />
      </div>

      <div className="p-4 border-t border-base-300 bg-base-100 flex-shrink-0">
        <button
          onClick={handleProcessar}
          disabled={selectedFiles.length === 0 || isProcessing}
          className={`btn btn-primary w-full ${isProcessing ? 'loading' : ''}`}
        >
          {isProcessing ? 'Processando IA...' : `Processar ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} Imagens`}
        </button>
      </div>
    </div>
  );
}