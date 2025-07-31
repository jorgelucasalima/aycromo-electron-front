import { useLocation, Link } from 'react-router-dom';
import { HiOutlineHome, HiOutlineChartBar, HiOutlineCog, HiOutlinePaperClip, HiOutlineDocumentReport } from 'react-icons/hi';

export default function Menu() {
  // O hook useLocation nos dá acesso à URL atual.
  const location = useLocation();

  // Estrutura de dados aprimorada com uma propriedade 'path' para cada rota.
  // Isso evita problemas com espaços ou caracteres especiais nos nomes.
  const menuItems = [
    { name: 'Anexar imagens', path: '/', icon: <HiOutlinePaperClip size={20} /> },
  ];

  const managementItems = [
    // A rota para o Dashboard agora é a raiz do site ('/').
    { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar size={20} /> },
    { name: 'Relatórios', path: '/relatorios', icon: <HiOutlineDocumentReport size={20} /> },
    { name: 'Configurações', path: '/configuracoes', icon: <HiOutlineCog size={20} /> },
  ];

  // O sub-componente agora usa o 'location.pathname' para determinar o link ativo.
  const MenuItem = ({ item }) => (
    <li>
      <Link
        to={item.path}
        // A classe 'active' é aplicada se a URL atual corresponder ao caminho do item.
        className={location.pathname === item.path ? 'active' : ''}
      >
        {item.icon}
        <span className="ml-2">{item.name}</span>
      </Link>
    </li>
  );

  return (
    <ul className="menu p-4 w-full h-full bg-base-200 text-base-content text-lg">
      <li className="menu-title text-xl font-bold mb-4 px-4">
        <span>Aycromo App</span>
      </li>

      {/* Renderiza os itens do menu principal */}
      {menuItems.map(item => <MenuItem key={item.name} item={item} />)}

      <li className="menu-title mt-6">
        <span>Gerenciamento</span>
      </li>

      {/* Renderiza os itens da seção de gerenciamento */}
      {managementItems.map(item => <MenuItem key={item.name} item={item} />)}
    </ul>
  );
}
