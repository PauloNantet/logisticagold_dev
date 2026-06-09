import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const formatDateBR = (val) => {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

export default function ServiceOrderHistoryModal({ history, onDelete, onRestore, onClose }) {
  const [fornecedorFilter, setFornecedorFilter] = useState("");
  const [dataFilter, setDataFilter] = useState("");
  const [showFornecedorPopup, setShowFornecedorPopup] = useState(false);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "dataEmissao", direction: "desc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const SortHeader = ({ children, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} style={{ cursor: "pointer", userSelect: "none" }}>
      {children} {sortConfig.key === sortKey ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  const filterItems = (items, exclude) => items.filter(item => {
    const entries = item.entries || item.fullData?.entries || [];
    const fornecedores = [...new Set(entries.map(e => e.fornecedor).filter(Boolean))].join(", ");
    const matchesFornecedor = exclude === "fornecedor" || !fornecedorFilter ||
      fornecedores.toLowerCase().includes(fornecedorFilter.toLowerCase());
    const matchesData = exclude === "data" || !dataFilter ||
      (item.data_emissao || "").includes(dataFilter);
    return matchesFornecedor && matchesData;
  });

  const filtered = filterItems(history)
    .sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      const aVal = (a[key] || "").toString().toLowerCase();
      const bVal = (b[key] || "").toString().toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    });

  const allEntries = history;

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Histórico de Ordens de Serviço</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            <div className="search-container" style={{ flex: "0 0 220px" }}>
              <button
                type="button"
                onClick={() => setShowFornecedorPopup(true)}
                className="search-input"
                style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fornecedorFilter || "Fornecedor"}</span>
                <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
              </button>
              {showFornecedorPopup && (
                <div onClick={() => setShowFornecedorPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                  <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                    <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Fornecedor</h3>
                    <button type="button" onClick={() => { setFornecedorFilter(""); setShowFornecedorPopup(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: !fornecedorFilter ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: !fornecedorFilter ? 700 : 400, marginBottom: 4 }}>
                      📋 Todos os fornecedores
                    </button>
                    <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                    {[...new Set(filterItems(allEntries, "fornecedor").flatMap(item => {
                      const entries = item.entries || item.fullData?.entries || [];
                      return entries.map(e => e.fornecedor).filter(Boolean);
                    }))].sort().map(f => (
                      <button key={f} type="button" onClick={() => { setFornecedorFilter(f); setShowFornecedorPopup(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: fornecedorFilter === f ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: fornecedorFilter === f ? 700 : 400, marginBottom: 4 }}>
                        🏢 {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="search-container" style={{ flex: "0 0 150px" }}>
              <button
                type="button"
                onClick={() => setShowDatePopup(true)}
                className="search-input"
                style={{ textAlign: "left", cursor: "pointer", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dataFilter ? formatDateBR(dataFilter) : "Data"}</span>
                <span style={{ fontSize: 10, color: "var(--text-placeholder)", flexShrink: 0 }}>▼</span>
              </button>
              {showDatePopup && (
                <div onClick={() => setShowDatePopup(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
                  <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, minWidth: 300, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                    <h3 style={{ color: "var(--primary)", fontSize: 16, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Filtrar por Data</h3>
                    <button type="button" onClick={() => { setDataFilter(""); setShowDatePopup(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: !dataFilter ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: !dataFilter ? 700 : 400, marginBottom: 4 }}>
                      📋 Todas as datas
                    </button>
                    <div style={{ height: 1, background: "var(--border-color)", margin: "8px 0" }} />
                    {[...new Set(filterItems(allEntries, "data").map(e => e.data_emissao).filter(Boolean))].sort().reverse().map(d => (
                      <button key={d} type="button" onClick={() => { setDataFilter(d); setShowDatePopup(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: dataFilter === d ? "rgba(212,175,55,0.15)" : "transparent", border: "none", borderRadius: 8, color: "var(--text-main)", fontSize: 14, cursor: "pointer", fontWeight: dataFilter === d ? 700 : 400, marginBottom: 4 }}>
                        📅 {formatDateBR(d)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={() => { setFornecedorFilter(""); setDataFilter(""); }} style={{ fontSize: 12, padding: "0 14px", height: 44, background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: 20, cursor: "pointer", color: "var(--text-main)", whiteSpace: "nowrap", flexShrink: 0 }}>
              Limpar Filtro
            </button>
          </div>
          {filtered.length === 0 ? (
            <p className="empty-state">Nenhuma ordem de serviço baixada ainda.</p>
          ) : (
            <div className="table-responsive spreadsheet-container">
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    <SortHeader sortKey="dataEmissao">Data</SortHeader>
                    <SortHeader sortKey="fornecedor">Fornecedor</SortHeader>
                    <SortHeader sortKey="servicos">Serviços</SortHeader>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const entries = item.entries || item.fullData?.entries || [];
                    const fornecedores = [...new Set(entries.map(e => e.fornecedor).filter(Boolean))];
                    return (
                      <tr key={item.id || idx}>
                        <td className="truncate-cell">{item.data_emissao ? item.data_emissao.split("-").reverse().join("/") : ""}</td>
                        <td className="truncate-cell">{fornecedores.join(", ") || "---"}</td>
                        <td className="truncate-cell">{entries.length} {entries.length === 1 ? "serviço" : "serviços"}</td>
                        <td className="actions-cell">
                          <div className="spreadsheet-actions justify-end">
                            <button
                              onClick={() => onRestore(item.fullData, true)}
                              className="action-icon-btn select"
                              title="Visualizar OS"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => onRestore(item.fullData, false)}
                              className="action-icon-btn edit"
                              title="Restaurar para nova OS"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {confirmDeleteId !== null && (
            <ConfirmDialog
              message="Tem certeza que deseja excluir esta OS?"
              onConfirm={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
              onCancel={() => setConfirmDeleteId(null)}
            />
          )}
        </div>

      </div>
    </div>
  );
}
