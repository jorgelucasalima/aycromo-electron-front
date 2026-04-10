import React, { useState, useEffect } from 'react';
import { HiOutlineTrash, HiOutlineDocumentSearch, HiOutlineClock } from 'react-icons/hi';

export default function Relatorios() {
  const [relatorios, setRelatorios] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const salvos = JSON.parse(localStorage.getItem('relatorios_ia') || '[]');
    setRelatorios(salvos);
  }, []);

  const excluirRelatorio = (id) => {
    if (!window.confirm("Deseja realmente excluir este histórico?")) return;
    const novos = relatorios.filter(r => r.id !== id);
    localStorage.setItem('relatorios_ia', JSON.stringify(novos));
    setRelatorios(novos);
  };

  const limparTudo = () => {
    if (!window.confirm("Isso apagará TODO o histórico de relatórios. Continuar?")) return;
    localStorage.removeItem('relatorios_ia');
    setRelatorios([]);
  };

  return (
    <div className="flex flex-col pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Histórico de Relatórios</h1>
           <p className="text-gray-500 mt-1">Registros consolidados de processamento e curadoria da IA.</p>
        </div>
        <button onClick={limparTudo} disabled={relatorios.length === 0} className="btn btn-outline border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-bold btn-sm">
           Limpar Histórico
        </button>
      </div>

      <div className="space-y-6">
        {relatorios.length === 0 ? (
           <div className="p-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col items-center">
             <HiOutlineDocumentSearch className="text-gray-300 mb-4" size={64} />
             <h3 className="text-xl font-bold text-gray-500">Nenhum relatório encontrado</h3>
             <p className="text-gray-400 mt-2 max-w-md">Os relatórios salvos a partir da interface do "Laboratório de Análise" sobreviverão à reinicialização e aparecerão aqui.</p>
           </div>
        ) : (
           relatorios.map(rel => (
             <div key={rel.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                {/* Header do Card */}
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-gray-50/50" onClick={() => setExpandedId(expandedId === rel.id ? null : rel.id)}>
                   <div className="flex gap-4 items-center">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-xl border border-indigo-100 shadow-inner">
                        <HiOutlineClock className="text-indigo-500" size={28} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 capitalize">
                          {new Date(rel.data).toLocaleDateString('pt-BR', { weekday: 'long', day:'2-digit', month:'long', year:'numeric' })} <span className="text-gray-400 text-sm font-medium ml-1">às {new Date(rel.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">Modelo Analítico: <span className="text-indigo-600 font-bold">{rel.modelo}</span></p>
                      </div>
                   </div>

                   <div className="flex gap-6 items-center w-full md:w-auto mt-4 md:mt-0 bg-gray-50 px-6 py-2 rounded-xl border border-gray-100">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Processadas</p>
                        <p className="font-black text-xl text-gray-700">{rel.processadas}<span className="text-sm text-gray-400 font-medium">/{rel.totalImagens}</span></p>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cromossomos</p>
                        <p className="font-black text-xl text-orange-600">{rel.totalCromossomos}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <button onClick={(e) => { e.stopPropagation(); excluirRelatorio(rel.id); }} className="btn btn-ghost btn-circle text-red-400 hover:bg-red-50 hover:text-red-600" title="Apagar Relatório">
                         <HiOutlineTrash size={20} />
                      </button>
                   </div>
                </div>

                {/* Body Expandido do Card */}
                {expandedId === rel.id && (
                  <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Detalhamento das Lâminas Inspecionadas ({rel.laminas.length})</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {rel.laminas.map((lam, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-0.5">
                            <span className="font-medium text-sm text-gray-700 truncate mr-2" title={lam.nome}>{lam.nome}</span>
                            {lam.cromossomos > 0 ? (
                               <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-2 py-1 rounded-md font-bold shadow-sm whitespace-nowrap">{lam.cromossomos} id.</span>
                            ) : (
                               <span className="bg-gray-100 text-gray-500 border border-gray-200 text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap">nenhum</span>
                            )}
                          </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
           ))
        )}
      </div>
    </div>
  );
}