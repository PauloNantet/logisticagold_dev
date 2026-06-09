import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function MapasHistoryModal({ history, onView, onDelete, onClose }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Histórico de Mapas de Serviço</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <p className="empty-state">Nenhum mapa salvo ainda.</p>
          ) : (
            <div className="table-responsive spreadsheet-container">
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Serviços</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const entries = item.entries || [];
                    return (
                      <tr key={item.id}>
                        <td>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
                        <td>{entries.length} serviço(s)</td>
                        <td className="actions-cell">
                          <div className="spreadsheet-actions justify-end">
                            <button
                              onClick={() => onView(item)}
                              className="action-icon-btn select"
                              title="Visualizar Mapa"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="action-icon-btn delete"
                              title="Remover do Histórico"
                            >
                              🗑️
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
              message="Tem certeza que deseja excluir este mapa?"
              onConfirm={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
              onCancel={() => setConfirmDeleteId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
