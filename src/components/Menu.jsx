import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { HiOutlineChartBar, HiOutlineCog, HiOutlinePaperClip, HiOutlineDocumentReport, HiOutlineChip } from 'react-icons/hi';

export default function Menu() {
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
    { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar size={20} /> },
    { name: 'Relatórios', path: '/relatorios', icon: <HiOutlineDocumentReport size={20} /> },
    { name: 'Configurações', path: '/configuracoes', icon: <HiOutlineCog size={20} /> },
  ];

  const MenuItem = ({ item }) => (
    <li>
      <Link
        to={item.path}
        className={location.pathname === item.path ? 'active' : ''}
      >
        {item.icon}
        <span className="ml-2">{item.name}</span>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col h-full bg-base-200">
      <ul className="menu p-4 w-full flex-grow text-base-content text-lg">
        <li className="menu-title text-xl font-bold mb-4 px-4">
          <span>Aycromo App</span>
        </li>

        {menuItems.map(item => <MenuItem key={item.name} item={item} />)}

        <li className="menu-title mt-6">
          <span>Gerenciamento</span>
        </li>

        {managementItems.map(item => <MenuItem key={item.name} item={item} />)}
      </ul>

      {/* PARTE INFERIOR: Modelo Selecionado */}
      <div className="p-4 bg-base-300 border-t border-base-content/10">
        <div className="flex items-center gap-3 px-2 py-3 rounded-lg bg-base-100 shadow-sm border border-blue-500/30">
          <HiOutlineChip className="text-blue-500" size={24} />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">IA Ativa</span>
            <span className="text-sm font-semibold truncate text-blue-600 dark:text-blue-400">
              {modeloNome}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}