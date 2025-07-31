import { HiX, HiOutlinePhotograph } from 'react-icons/hi';

// O componente agora recebe o estado e as funções do pai via props.
// Ele não gerencia mais seu próprio estado.
export default function InputFile({ selectedFiles, onFileChange, onRemoveImage }) {
  return (
    // O div externo foi removido, e usei um Fragment (<>) para melhor integração com o layout do pai.
    <>
      {/* Componente de input de arquivo */}
      <div className="form-control w-full max-w-xs mb-8">
        <label className="label">
          <span className="label-text">Selecione uma ou mais imagens</span>
        </label>
        <input
          type="file"
          className="file-input file-input-bordered w-full max-w-xs"
          multiple
          accept="image/*"
          // Agora, ele chama a função que veio do componente pai.
          onChange={onFileChange}
          // Este truque limpa o valor, permitindo que o usuário selecione o mesmo arquivo novamente.
          onClick={(event) => { event.target.value = null; }}
        />
      </div>

      {/* Seção de Prévia das Imagens */}
      {selectedFiles.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Imagens Selecionadas:</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* O grid agora usa a lista de arquivos vinda do pai via props. */}
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group card bg-base-200 shadow-xl">
                <figure>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Prévia de ${file.name}`}
                    className="w-full h-32 object-cover"
                  />
                </figure>
                <div className="card-body p-2 text-center">
                  <p className="text-xs truncate">{file.name}</p>
                </div>
                <button
                  // Chama a função de remover que também veio do pai.
                  onClick={() => onRemoveImage(file)}
                  className="btn btn-sm btn-circle btn-error absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <HiX size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Placeholder para quando nenhuma imagem for selecionada.
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-base-300 rounded-box">
          <HiOutlinePhotograph className="h-16 w-16 text-base-300" />
          <p className="mt-4 text-lg text-base-content/50">Nenhuma imagem selecionada</p>
        </div>
      )}
    </>
  );
}
