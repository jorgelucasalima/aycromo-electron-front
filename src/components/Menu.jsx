import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { HiOutlineCog , HiOutlinePaperClip, HiOutlineChip, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { FaUncharted } from "react-icons/fa6";
import { LuChartSpline } from "react-icons/lu";

export default function Menu({ isCollapsed, toggleCollapse }) {
  const location = useLocation();
  const [modeloNome, setModeloNome] = useState('YOLO v11 (Padrão)');

  // Função para carregar o nome do modelo do localStorage
  const atualizarModeloAtivo = () => {
    const modelosSalvos = JSON.parse(localStorage.getItem('modelos_ia') || '[]');
    const idAtivo = localStorage.getItem('modelo_ativo');

    if (idAtivo === 'yolo-v11' || !idAtivo) {
      setModeloNome('YOLO v11 (Padrão)');
    } else {
      const modelo = modelosSalvos.find(m => m.id === idAtivo);
      setModeloNome(modelo ? modelo.name : 'YOLO v11 (Padrão)');
    }
  };

  useEffect(() => {
    // Carrega o modelo ao montar o componente
    atualizarModeloAtivo();

    // Listener para detectar mudanças no localStorage vindas do componente de Configurações
    window.addEventListener('storage', atualizarModeloAtivo);

    // Custom listener para mudanças na mesma aba
    window.addEventListener('modeloAlterado', atualizarModeloAtivo);

    return () => {
      window.removeEventListener('storage', atualizarModeloAtivo);
      window.removeEventListener('modeloAlterado', atualizarModeloAtivo);
    };
  }, []);

  const menuItems = [
    { name: 'Anexar imagens', path: '/', icon: <HiOutlinePaperClip size={20} /> },
  ];

  const managementItems = [
    // { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar size={20} /> },
    // { name: 'Relatórios', path: '/relatorios', icon: <HiOutlineDocumentReport size={20} /> },
    { name: 'Análise de IA', path: '/analise', icon: <FaUncharted size={20} /> },
    { name: 'Benchmark', path: '/benchmark', icon: <LuChartSpline size={20} /> },
    { name: 'Configurações', path: '/configuracoes', icon: <HiOutlineCog size={20} /> },
  ];

  const MenuItem = ({ item }) => (
    <li className="mb-1">
      <Link
        to={item.path}
        className={`${location.pathname === item.path ? 'active bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-100 hover:text-gray-800'} ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} transition-all flex items-center gap-3 rounded-lg`}
        title={isCollapsed ? item.name : ''}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {!isCollapsed && <span className="flex-1 truncate">{item.name}</span>}
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col h-full bg-base-200 overflow-hidden">
      <ul className="menu p-3 w-full flex-grow text-base-content text-[15px]">
        <li className="menu-title text-xl font-bold mb-4 px-2 flex justify-between items-center text-gray-700 h-10 overflow-hidden w-full m-0 relative flex-row">
          {!isCollapsed && <span>Aycromo</span>}
          <button 
             onClick={toggleCollapse} 
             className={`btn btn-sm btn-ghost p-1 cursor-pointer absolute ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-0'}`}
             title={isCollapsed ? "Expandir" : "Recolher"}
          >
             {isCollapsed ? <HiOutlineChevronRight size={20} /> : <HiOutlineChevronLeft size={20} />}
          </button>
        </li>

        {/* {menuItems.map(item => <MenuItem key={item.name} item={item} />)} */}

        {managementItems.map(item => <MenuItem key={item.name} item={item} />)}
      </ul>

      {/* PARTE INFERIOR: Modelo Selecionado */}
      <div className={`bg-base-300 border-t border-base-content/10 transition-all ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center gap-3 rounded-lg bg-base-100 shadow-sm border border-blue-500/30 overflow-hidden cursor-help transition-all ${isCollapsed ? 'justify-center p-2' : 'px-3 py-3'}`} title={isCollapsed ? modeloNome : ''}>
          <HiOutlineChip className="text-blue-500 flex-shrink-0" size={isCollapsed ? 28 : 24} />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">IA Ativa</span>
              <span className="text-sm font-semibold truncate text-blue-600 dark:text-blue-400">
                {modeloNome}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}