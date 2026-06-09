import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    if (key === "valor") return dir === "asc" ? (Number(a.valor) - Number(b.valor)) : (Number(b.valor) - Number(a.valor));
    const va = (a[key] || "").toString().toLowerCase();
    const vb = (b[key] || "").toString().toLowerCase();
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
};

export default function HistoryModal({ history, onDelete, onClose, onRestore }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc"
    }));
  };

  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-th">
      {label}
      {sortConfig.key === sortKey && (
        <span className="sort-arrow">{sortConfig.dir === "asc" ? " ▲" : " ▼"}</span>
      )}
    </th>
  );

  const filteredHistory = history.filter(item => 
    item.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.dataEmissao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedHistory = sortConfig.key
    ? sortData(filteredHistory, sortConfig.key, sortConfig.dir)
    : filteredHistory;

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container history-modal">
        <header className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-row">
              <h2 className="modal-title">
                <span>📋</span> Histórico de Faturas
              </h2>
              {history.length > 0 && (
                <span className="table-count-header">
                  {filteredHistory.length < history.length
                    ? `${filteredHistory.length} de ${history.length}`
                    : `${history.length}`} fatura{history.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="search-container">
              <input 
                type="text" 
                placeholder="Buscar por número, cliente ou data..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">✕</button>
        </header>

        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-clients">
              Nenhuma fatura baixada ainda.
            </div>
          ) : (
            <>
              <div className="table-responsive spreadsheet-container">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <SortTh label="Nº Fatura" sortKey="numero" />
                      <SortTh label="Data Emissão" sortKey="dataEmissao" />
                      <SortTh label="Cliente" sortKey="cliente" />
                      <SortTh label="Valor Total" sortKey="valor" />
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="font-bold truncate-cell">#{item.numero}</td>
                        <td className="truncate-cell">{item.dataEmissao ? item.dataEmissao.split("-").reverse().join("/") : ""}</td>
                        <td className="truncate-cell">{item.cliente}</td>
                        <td className="truncate-cell gold-text font-bold">{Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="actions-cell">
                          <div className="spreadsheet-actions justify-end">
                            <button 
                              onClick={() => onRestore(item.fullData, true)}
                              className="action-icon-btn select"
                              title="Visualizar Fatura"
                            >
                              👁️
                            </button>
                            <button 
                              onClick={() => onRestore(item.fullData, false)}
                              className="action-icon-btn edit"
                              title="Restaurar para Nova Fatura"
                            >
                              🔄
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="action-icon-btn delete"
                              title="Remover do Histórico"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {confirmDeleteId !== null && (
                <ConfirmDialog
                  message="Tem certeza que deseja excluir esta fatura?"
                  onConfirm={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                  onCancel={() => setConfirmDeleteId(null)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
