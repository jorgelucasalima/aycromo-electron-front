import { useState, useEffect } from 'react';

export default function Relatorios() {
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem('historico_aycromo') || '[]');
    setHistorico(dados);
  }, []);

  const limparHistorico = () => {
    if (confirm("Deseja apagar todos os relatórios?")) {
      localStorage.removeItem('historico_aycromo');
      setHistorico([]);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Relatório de Análises</h1>
          <p className="text-gray-500">Histórico de processamento de imagens por IA</p>
        </div>
        {historico.length > 0 && (
          <button onClick={limparHistorico} className="btn btn-outline btn-error btn-sm">
            Limpar Histórico
          </button>
        )}
      </div>

      {historico.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
          <p className="text-gray-400">Nenhum processamento realizado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {historico.map((item) => (
            <div key={item.id} className="collapse collapse-arrow bg-base-200 shadow-sm border border-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title flex justify-between items-center pr-12">
                <div>
                  <span className="font-bold text-lg">Lote #{item.id.toString().slice(-5)}</span>
                  <span className="ml-4 text-sm opacity-60">{item.data}</span>
                </div>
                <div className="badge badge-primary">{item.totalImagens} Imagens</div>
              </div>
              <div className="collapse-content bg-white p-4">
                <div className="mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Modelo utilizado:</span>
                  <p className="font-medium text-blue-600">{item.modelo}</p>
                </div>
                <div className="divider my-1"></div>
                <h4 className="font-bold mb-2">Resultados Detectados:</h4>
                <div className="overflow-x-auto">
                  <table className="table table-compact w-full">
                    <thead>
                      <tr>
                        <th>Imagem</th>
                        <th>Cromossomos</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Exemplo de iteração sobre os detalhes retornados pelo Python */}
                      {Object.keys(item.detalhes).map((imgKey, idx) => (
                        <tr key={idx}>
                          <td className="text-xs truncate max-w-[200px]">{imgKey}</td>
                          <td className="font-bold text-primary">{item.detalhes[imgKey].count || 0}</td>
                          <td><div className="badge badge-success badge-xs">Sucesso</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}