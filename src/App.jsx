import './index.css';
import Menu from './components/Menu';
import { Routes, Route } from 'react-router-dom';
import AnexarImagens from './pages/AnexarImagens';
import Dashboard from './pages/Dashboard';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <div className="flex h-screen bg-base-100">
      <aside className="w-64 flex-shrink-0 bg-base-200">
        <Menu />
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <Routes>
          <Route path="/" element={<AnexarImagens />} index/>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </main>
    </div>
  );
}
