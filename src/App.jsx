import './index.css';
import React, { useState } from 'react';
import Menu from './components/Menu';
import { Routes, Route } from 'react-router-dom';
import AnexarImagens from './pages/AnexarImagens';
import Dashboard from './pages/Dashboard';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import Benchmark from './pages/Benchmark';
import AnaliseCuradoria from './pages/Analise';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-base-100 flex-row overflow-hidden">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 flex-shrink-0 bg-base-200 border-r border-gray-200 flex flex-col z-20 shadow-md`}>
        <Menu isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <Routes>
          {/* <Route path="/" element={<AnexarImagens />} index/> */}
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path='analise' element={<AnaliseCuradoria />} />
        </Routes>
      </main>
    </div>
  );
}
