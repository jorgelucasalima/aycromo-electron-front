import './index.css';
import Button from './components/Button';
import Menu from './components/Menu';

export default function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-60 flex-shrink-0 bg-base-200 p-2">
        <Menu />
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-4xl font-bold">Hello World!</h1>
        <p className="mt-4 mb-8">
          Seu conteúdo principal ficará aqui, à direita do menu.
        </p>
        <Button>Click me</Button>

        {/* Adicione mais conteúdo aqui para testar a rolagem */}
        <div className="h-[2000px] bg-base-300 rounded-box flex items-center justify-center">
          <p>Conteúdo longo para teste de rolagem</p>
        </div>
      </main>

    </div>
  );
}