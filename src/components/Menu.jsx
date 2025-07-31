import { useState } from 'react';
import { HiOutlineHome, HiOutlineChartBar, HiOutlineCog, HiOutlinePaperClip, HiOutlineDocumentReport } from 'react-icons/hi';
import { Link } from 'react-router-dom';

export default function Menu() {
  // Hook de estado para controlar qual item do menu está ativo
  const [activeItem, setActiveItem] = useState('Dashboard');

  // Função para atualizar o item ativo ao ser clicado
  const handleItemClick = (itemName) => {
    setActiveItem(itemName);
    // No futuro, você pode adicionar sua lógica de navegação aqui (ex: com React Router)
  };

  // Estrutura de dados para os itens do menu, facilitando a manutenção
  const menuItems = [
    { name: 'Anexar imagens', icon: <HiOutlinePaperClip size={20} /> },
  ];

  const managementItems = [
    { name: 'Dashboard', icon: <HiOutlineChartBar size={20} /> },
    { name: 'Relatórios', icon: <HiOutlineDocumentReport size={20} /> },
    { name: 'Configurações', icon: <HiOutlineCog size={20} /> },
  ];

  // Sub-componente para renderizar cada item do menu, evitando repetição de código
  const MenuItem = ({ item }) => (
    <li>
      <Link
        to={`/${item.name.toLowerCase()}`}
        className={`menu-item ${activeItem === item.name ? 'active' : ''}`}
        onClick={() => handleItemClick(item.name)}
      >
        {item.icon}
        <span className="ml-2">{item.name}</span>
      </Link>
    </li>
  );

  return (
    // O menu agora ocupa todo o espaço do seu container (o <aside>)
    <ul className="menu p-4 w-full h-full bg-base-200 text-base-content text-lg">
      {/* Título/Logo do Menu */}
      <li className="menu-title text-xl font-bold mb-4 px-4">
        <span>Aycromo App</span>
      </li>

      {/* Renderiza os itens do menu principal */}
      {menuItems.map(item => <MenuItem key={item.name} item={item} />)}

      {/* Divisor para agrupar e organizar os itens */}
      <li className="menu-title mt-6">
        <span>Gerenciamento</span>
      </li>

      {/* Renderiza os itens da seção de gerenciamento */}
      {managementItems.map(item => <MenuItem key={item.name} item={item} />)}
    </ul>
  );
}
