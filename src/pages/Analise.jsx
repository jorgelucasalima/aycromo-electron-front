import React, { useState, useRef, useEffect } from 'react';

export default function AnaliseCuradoria() {
  const [modelos, setModelos] = useState([]);
  const [modeloAtivo, setModeloAtivo] = useState('');
  
  // Imagens: array de { url, path, name, boxes: [] }
  const [imagens, setImagens] = useState([]); 
  const [imgIndex, setImgIndex] = useState(-1);
  
  const [processing, setProcessing] = useState(false);
  
  // Estados de Desenho Manual (para a imagem ativa)
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState(null); // Box fantasma durante o drag
  
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const imagemAtual = imgIndex >= 0 ? imagens[imgIndex] : null;

  useEffect(() => {
    const mSalvos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    const padroes = [{ id: 'yolo-base', name: 'YOLO v11 (Base)', path: 'yolo11n.pt', framework: 'YOLO' }];
    const filtrados = mSalvos.filter((m) => m.path !== 'default' && m.id !== 'yolo-v11' && m.path !== 'yolo11n.pt');
    const todosModelos = [...padroes, ...filtrados];
    
    setModelos(todosModelos);
    if(todosModelos.length > 0) setModeloAtivo(todosModelos[0].id);
  }, []);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const novas = files.map(file => ({
        url: URL.createObjectURL(file),
        path: file.path,
        name: file.name,
        boxes: []
      }));
      setImagens(prev => [...prev, ...novas]);
      if (imgIndex === -1) setImgIndex(0);
    }
    e.target.value = null; 
  };

  const removeImagem = (index, e) => {
    e.stopPropagation();
    const novas = imagens.filter((_, i) => i !== index);
    setImagens(novas);
    if (novas.length === 0) {
      setImgIndex(-1);
    } else if (index === imgIndex) {
      setImgIndex(Math.max(0, index - 1));
    } else if (index < imgIndex) {
      setImgIndex(imgIndex - 1);
    }
  };

  const runAnalysis = async () => {
    if (imagens.length === 0) return;
    setProcessing(true);

    try {
      const modelo = modelos.find(m => m.id === modeloAtivo);
      const caminhoModelo = (modelo.path === 'default' || modelo.id === 'yolo-v11' || modelo.id === 'yolo-base') ? 'yolo11n.pt' : modelo.path;
      
      const caminhosImagens = imagens.map(img => img.path);

      const resultados = await window.electronAPI.runInference({
        modeloPath: caminhoModelo,
        imagens: caminhosImagens
      });

      setImagens(prev => prev.map(img => {
         const dados = resultados[img.path];
         if (dados && dados.details) {
           const novasBoxes = dados.details.map(box => ({
             x: box.x, y: box.y, w: box.w, h: box.h, manual: false
           }));
           // Mantem as manuais e sobrescreve as da IA anteriores
           const mantidasManuais = img.boxes.filter(b => b.manual);
           return { ...img, boxes: [...mantidasManuais, ...novasBoxes] };
         }
         return img;
      }));

      // Feedback
      let totalDetectado = 0;
      Object.values(resultados).forEach(r => totalDetectado += (r.count || 0));
      alert(`Análise concluída! ${totalDetectado} cromossomos encontrados no lote.`);

    } catch (e) {
      console.error(e);
      alert("Erro na análise.");
    } finally {
      setProcessing(false);
    }
  };

  // --- LÓGICA DE DESENHO MANUAL ---
  const getCoords = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    if(!imagemAtual) return;
    setIsDrawing(true);
    const pos = getCoords(e);
    setStartPos(pos);
    setTempBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const moveDraw = (e) => {
    if (!isDrawing) return;
    const endPos = getCoords(e);
    setTempBox({
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      w: Math.abs(endPos.x - startPos.x),
      h: Math.abs(endPos.y - startPos.y)
    });
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (tempBox && tempBox.w > 5 && tempBox.h > 5) {
      setImagens(prev => {
        const copy = [...prev];
        copy[imgIndex] = {
           ...copy[imgIndex],
           boxes: [...copy[imgIndex].boxes, { ...tempBox, manual: true }]
        };
        return copy;
      });
    }
    setTempBox(null);
  };

  const removeBox = (boxIndex) => {
    setImagens(prev => {
      const copy = [...prev];
      copy[imgIndex] = {
         ...copy[imgIndex],
         boxes: copy[imgIndex].boxes.filter((_, i) => i !== boxIndex)
      };
      return copy;
    });
  };

  const salvarAnotacoes = async () => {
     if(imagens.length === 0) return;
     // Array final só com imagens que contém bounding boxes
     const exportImages = imagens.filter(img => img.boxes.length > 0);
     if (exportImages.length === 0) {
       return alert("Não existem caixas identificadas para salvar.");
     }

     const dadosExportacao = exportImages.map(img => {
       // O YOLO necessita das dimensões originais da imagem para normalizar (xmin, etc.)
       // Aqui enviamos as caixas e as dimensoes fisicas (para calcular w/h relativas no backend)
       return {
         path: img.path,
         width: imgRef.current ? imgRef.current.naturalWidth : 1,
         height: imgRef.current ? imgRef.current.naturalHeight : 1,
         boxes: img.boxes
       }
     });
     
     const resultado = await window.electronAPI.saveAnnotations(dadosExportacao);
     if(resultado.success) {
       alert(`Anotações YOLO salvas com sucesso! Procure os arquivos .txt ao lado das imagens.`);
     } else {
       alert("Erro ao salvar anotações: " + resultado.error);
     }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const inputPseudoEvent = { target: { files: e.dataTransfer.files } };
      handleUpload(inputPseudoEvent);
    }
  };

  const totalBoxes = imagemAtual ? imagemAtual.boxes.length : 0;

  return (
    <div className="h-screen flex flex-col pb-20 overflow-hidden">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold bg-clip-text ">Laboratório de Análise</h1>
        <div className="flex gap-3">
           <select 
             className="select select-bordered select-sm bg-gray-50 border-gray-300 rounded-lg font-medium"
             value={modeloAtivo}
             onChange={(e) => setModeloAtivo(e.target.value)}
           >
             {modelos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
           </select>
           
           <button 
             onClick={runAnalysis} 
             disabled={imagens.length === 0 || processing}
             className="btn btn-sm btn-primary shadow-md hover:shadow-lg transition-all"
           >
             {processing ? 'Processando Lote...' : `Analisar IA (${imagens.length})`}
           </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden h-full">
         {/* BARRA LATERAL DA GALERIA */}
         <div className="w-1/4 min-w-[250px] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-gray-700">Imagens ({imagens.length})</h3>
               <label className="btn btn-xs btn-outline btn-primary cursor-pointer">
                  + Adicionar
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
               </label>
            </div>
            
            <div 
               className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50"
               onDragOver={handleDragOver}
               onDrop={handleDrop}
            >
               {imagens.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 mt-10 text-sm">
                    Arraste imagens ou clique em + Add acima
                  </div>
               )}
               {imagens.map((img, idx) => (
                  <div 
                     key={idx}
                     onClick={() => setImgIndex(idx)}
                     className={`relative p-2 rounded-lg cursor-pointer flex gap-3 transition-colors border group ${idx === imgIndex ? 'bg-blue-50 border-blue-400' : 'bg-white border-transparent hover:border-gray-300'}`}
                  >
                     <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        <img src={img.url} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0 pr-6 pt-1">
                        <p className="font-medium text-sm text-gray-800 truncate">{img.name}</p>
                        <p className="text-xs text-gray-500">{img.boxes.length} caixas</p>
                     </div>
                     <button 
                        onClick={(e) => removeImagem(idx, e)}
                        className="absolute right-2 top-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                        X
                     </button>
                  </div>
               ))}
            </div>
         </div>

         {/* ÁREA DE TRABALHO (EDITOR) */}
         <div className="flex-1 bg-gray-100 rounded-xl overflow-auto flex justify-center items-center shadow-inner relative" ref={containerRef}>
            {!imagemAtual ? (
               <div className="flex flex-col items-center justify-center text-gray-400">
                  <p>Selecione ou faça upload de imagens para começar</p>
               </div>
            ) : (
               <div className="relative inline-block my-auto mx-auto bg-white shadow-xl max-w-none">
                 {/* Imagem Base */}
                 <img 
                   ref={imgRef}
                   src={imagemAtual.url} 
                   alt="Análise"
                   className="max-w-none cursor-crosshair block" 
                   onMouseDown={startDraw}
                   onMouseMove={moveDraw}
                   onMouseUp={endDraw}
                   onMouseLeave={endDraw}
                   onDragStart={(e) => e.preventDefault()} 
                 />

                 {/* Renderização das Caixas Finais */}
                 {imagemAtual.boxes.map((box, idx) => (
                     <div
                        key={idx}
                        className={`absolute border-2 flex items-start justify-end group ${box.manual ? 'border-yellow-400' : 'border-green-500'}`}
                        style={{
                           left: box.x, top: box.y, width: box.w, height: box.h,
                           pointerEvents: 'none' 
                        }}
                     >
                        <button 
                           onClick={(e) => { e.stopPropagation(); removeBox(idx); }} 
                           style={{ pointerEvents: 'auto' }}
                           className="bg-red-500 text-white text-[10px] p-1 font-bold absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer shadow border border-red-800"
                        >
                           X
                        </button>
                        {box.manual && <span className="absolute -top-4 left-0 bg-yellow-400 text-black text-[9px] px-1 font-bold">MANUAL</span>}
                     </div>
                 ))}

                 {/* Box Fantasma do Desenho Atual */}
                 {tempBox && (
                    <div 
                      className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none"
                      style={{ left: tempBox.x, top: tempBox.y, width: tempBox.w, height: tempBox.h }}
                    />
                 )}
               </div>
            )}
         </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
         <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Legenda de Cores</p>
            <div className="flex gap-4 text-sm mt-1">
               <span className="flex items-center gap-2 font-medium"><div className="w-4 h-4 rounded-sm border-2 border-green-500 bg-green-50"></div> IA (Auto)</span>
               <span className="flex items-center gap-2 font-medium"><div className="w-4 h-4 rounded-sm border-2 border-yellow-400 bg-yellow-50"></div> Humano (Manual)</span>
            </div>
         </div>
         <div className="flex gap-4 items-center">
             <span className="bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-mono text-sm shadow-inner">
               <strong className="text-blue-600 text-lg">{totalBoxes}</strong> cromossomos na imagem
             </span>
             <button 
                onClick={salvarAnotacoes} 
                className="btn btn-success text-white shadow-md hover:shadow-lg focus:outline-none"
                disabled={imagens.length === 0}
             >
                Salvar Anotações TXT
             </button>
         </div>
      </div>
    </div>
  );
}