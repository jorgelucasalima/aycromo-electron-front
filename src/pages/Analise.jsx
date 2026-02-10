import React, { useState, useRef, useEffect } from 'react';

export default function AnaliseCuradoria() {
  // Estados
  const [modelos, setModelos] = useState([]);
  const [modeloAtivo, setModeloAtivo] = useState('');
  const [imagemAtual, setImagemAtual] = useState(null); // URL ou Path da imagem
  const [boxes, setBoxes] = useState([]); // { x, y, w, h, manual: boolean }
  const [processing, setProcessing] = useState(false);
  
  // Estados de Desenho Manual
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Carrega modelos do localStorage
    const saved = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    const all = [...saved, { id: 'base', name: 'YOLO v11 Base', path: 'default' }];
    setModelos(all);
    setModeloAtivo(all[0].id);
  }, []);

  // 1. Carregar Imagem
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Cria URL temporária para exibir
      setImagemAtual({
        url: URL.createObjectURL(file),
        path: file.path, // Electron path
        name: file.name
      });
      setBoxes([]); // Limpa caixas anteriores
    }
  };

  // 2. Rodar IA
  const runAnalysis = async () => {
    if (!imagemAtual) return;
    setProcessing(true);

    try {
      const modelo = modelos.find(m => m.id === modeloAtivo);
      const caminhoModelo = modelo.path === 'default' ? 'yolo11n.pt' : modelo.path;

      // Chama a inferência (ajuste para retornar bounding boxes no main.js)
      const resultado = await window.electronAPI.runInference({
        modeloPath: caminhoModelo,
        imagens: [imagemAtual.path]
      });

      // Processa o retorno. Assumindo que o Python retorna:
      // { "caminho": { count: 2, details: [ [x1, y1, x2, y2], ... ] } }
      const dados = Object.values(resultado)[0];
      
      if (dados && dados.details) {
        // Converte formato [x1, y1, x2, y2] para [x, y, w, h] se necessário
        // Supondo que o detalhe já venha normalizado ou em pixels
        const novasBoxes = dados.details.map(box => ({
           x: box.x1, y: box.y1, w: box.w, h: box.h, manual: false
        }));
        setBoxes(novasBoxes);
      } else {
        alert("Nenhum cromossomo detectado automaticamente.");
      }

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
    // Importante: Calcula a escala se a imagem estiver redimensionada na tela (responsive)
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    setIsDrawing(true);
    setStartPos(getCoords(e));
  };

  const moveDraw = (e) => {
    if (!isDrawing) return;
    // Aqui poderíamos desenhar uma "caixa fantasma" temporária se quiséssemos
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    const endPos = getCoords(e);
    
    // Calcula geometria
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const w = Math.abs(endPos.x - startPos.x);
    const h = Math.abs(endPos.y - startPos.y);

    // Ignora cliques acidentais minúsculos
    if (w > 5 && h > 5) {
      setBoxes(prev => [...prev, { x, y, w, h, manual: true }]);
    }
    setIsDrawing(false);
  };

  const removeBox = (index) => {
    setBoxes(prev => prev.filter((_, i) => i !== index));
  };

  const salvarAnotacoes = () => {
     // Aqui você implementaria a lógica para salvar um arquivo .txt (YOLO format)
     // com as caixas atuais (boxes).
     console.log("Salvando correções:", boxes);
     alert("Anotações salvas com sucesso! (Simulação)");
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Laboratório de Análise</h1>
        <div className="flex gap-2">
           <select 
             className="select select-bordered"
             value={modeloAtivo}
             onChange={(e) => setModeloAtivo(e.target.value)}
           >
             {modelos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
           </select>
           
           <input 
             type="file" 
             accept="image/*" 
             className="file-input file-input-bordered" 
             onChange={handleUpload} 
           />
           
           <button 
             onClick={runAnalysis} 
             disabled={!imagemAtual || processing}
             className="btn btn-primary"
           >
             {processing ? 'Processando...' : 'Analisar IA'}
           </button>
        </div>
      </div>

      {/* ÁREA DE TRABALHO (EDITOR) */}
      <div className="flex-1 bg-gray-100 rounded-xl overflow-auto flex justify-center p-4 border border-gray-300 relative" ref={containerRef}>
        {!imagemAtual ? (
           <div className="text-gray-400 self-center">Carregue uma imagem para começar</div>
        ) : (
           <div className="relative inline-block">
             {/* Imagem Base */}
             <img 
               ref={imgRef}
               src={imagemAtual.url} 
               alt="Análise"
               className="max-w-none cursor-crosshair shadow-lg" // max-w-none para manter tamanho real e scrollar
               onMouseDown={startDraw}
               onMouseMove={moveDraw}
               onMouseUp={endDraw}
               onDragStart={(e) => e.preventDefault()} // Evita arrastar a imagem fantasma
             />

             {/* Renderização das Caixas */}
             {boxes.map((box, idx) => {
               // Precisamos converter coordenadas reais da imagem para CSS se a imagem estiver com zoom,
               // mas como usamos max-w-none, 1px da imagem = 1px da tela.
               return (
                 <div
                   key={idx}
                   className={`absolute border-2 flex items-start justify-end group ${box.manual ? 'border-yellow-400' : 'border-green-500'}`}
                   style={{
                     left: box.x,
                     top: box.y,
                     width: box.w,
                     height: box.h,
                     pointerEvents: 'none' // Deixa o clique passar para a imagem (para desenhar novas)
                   }}
                 >
                    {/* Botão de Excluir (Só aparece no Hover) */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeBox(idx); }} // stopPropagation não vai funcionar com pointerEvents none.
                      // Solução: Mover pointerEvents: auto APENAS para o botão, se necessário, ou usar z-index
                      style={{ pointerEvents: 'auto' }}
                      className="bg-red-500 text-white text-[10px] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      X
                    </button>
                    {box.manual && <span className="absolute -top-4 left-0 bg-yellow-400 text-black text-[9px] px-1 font-bold">MANUAL</span>}
                 </div>
               );
             })}
           </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center bg-white p-4 rounded-lg shadow">
         <div>
            <p className="text-sm font-bold">Legenda:</p>
            <div className="flex gap-4 text-xs mt-1">
               <span className="flex items-center gap-1"><div className="w-3 h-3 border-2 border-green-500"></div> IA (Automático)</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 border-2 border-yellow-400"></div> Manual (Humano)</span>
            </div>
         </div>
         <div className="flex gap-2 items-center">
             <span className="text-gray-600 font-mono text-sm">{boxes.length} Cromossomos identificados</span>
             <button onClick={salvarAnotacoes} className="btn btn-success text-white">Salvar Correções</button>
         </div>
      </div>
    </div>
  );
}