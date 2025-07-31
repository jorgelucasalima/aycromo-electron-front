import { useState } from 'react';
import InputFile from '../components/InputFile'; 

export default function AnexarImagens() {

  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleRemoveImage = (fileToRemove) => {
    setSelectedFiles(selectedFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-6">
        <h1 className="text-4xl font-bold mb-8">Anexar Imagens</h1>
        <InputFile
          selectedFiles={selectedFiles}
          onFileChange={handleFileChange}
          onRemoveImage={handleRemoveImage}
        />
      </div>

      {/* Seção inferior fixa */}
      <div className="p-4 border-t border-base-300 bg-base-100 flex-shrink-0">
        <button
          className="btn btn-primary w-full"
          // O pai agora pode usar o estado para controlar o botão.
          //disabled={selectedFiles.length > 0}
        >
          Processar {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} Imagens
        </button>
      </div>
    </div>
  );
}
