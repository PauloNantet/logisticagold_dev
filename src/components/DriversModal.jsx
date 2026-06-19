import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { formatPhone, handlePhoneKeyDown, handlePhoneInput } from "../utils/formatters";
import ConfirmDialog from "./ConfirmDialog";

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    const va = (a[key] || "").toString().toLowerCase();
    const vb = (b[key] || "").toString().toLowerCase();
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
};

export default function DriversModal({ onClose }) {
  const [drivers, setDrivers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const initialDriverState = { nome: "", contato: "" };
  const [formData, setFormData] = useState(initialDriverState);

  useEffect(() => {
    api.get("/api/drivers").then(setDrivers).catch(console.error);
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-th">
      {label}
    </th>
  );

  const handleEdit = (driver) => {
    setEditingId(driver.id);
    setFormData(driver);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    try {
      await api.del(`/api/drivers/${confirmDeleteId}`);
      setDrivers(prev => prev.filter(v => v.id !== confirmDeleteId));
    } catch (err) {
      console.error("Erro ao excluir motorista:", err);
    }
    setConfirmDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
        const updated = await api.put(`/api/drivers/${editingId}`, formData);
        setDrivers(prev => prev.map(v => v.id === editingId ? updated : v));
      } else {
        const created = await api.post("/api/drivers", formData);
        setDrivers(prev => [...prev, created]);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData(initialDriverState);
    } catch (err) {
      console.error("Erro ao salvar motorista:", err);
    }
  };

  const startAdding = () => {
    setEditingId(null);
    setFormData(initialDriverState);
    setIsAdding(true);
  };

  const filteredDrivers = drivers.filter(d =>
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.contato.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDrivers = sortConfig.key
    ? sortData(filteredDrivers, sortConfig.key, sortConfig.dir)
    : filteredDrivers;

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container services-modal">
        <header className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-row">
              <h2 className="modal-title"><span>👤</span> Gerenciar Motoristas</h2>
              {!isAdding && drivers.length > 0 && (
                <span className="table-count-header">
                  {filteredDrivers.length < drivers.length ? `${filteredDrivers.length} de ${drivers.length}` : `${drivers.length}`} motorista{drivers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {!isAdding && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="search-container">
                  <input type="text" placeholder="Buscar nome ou contato..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                  <span className="search-icon">🔍</span>
                </div>
                <button onClick={startAdding} className="add-client-btn-main">+ Novo Motorista</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="modal-close">✕</button>
        </header>

        <div className="modal-body">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="client-form">
              <h3 className="settings-section-title gold-text">{editingId !== null ? "Editar Motorista" : "Novo Motorista"}</h3>

              <div className="input-group">
                <label className="input-label">Nome</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="custom-input" placeholder="Nome do motorista" />
              </div>

              <div className="input-group">
                <label className="input-label">Contato</label>
                <input type="text" value={formData.contato} onKeyDown={(e) => handlePhoneKeyDown(e, (v) => setFormData({ ...formData, contato: v }))} onInput={(e) => handlePhoneInput(e, (v) => setFormData({ ...formData, contato: v }))} className="custom-input" placeholder="Ex: 21 99292-1544 / 21 98659-2525" />
              </div>

              <div className="modal-footer no-padding-sides">
                <button type="submit" className="save-settings-btn">{editingId !== null ? "Atualizar" : "Salvar Motorista"}</button>
                <button type="button" onClick={() => setIsAdding(false)} className="cancel-settings-btn">Voltar</button>
              </div>
            </form>
          ) : (
            <div className="clients-list-container">
              {drivers.length === 0 ? (
                <div className="empty-clients">Nenhum motorista cadastrado.</div>
              ) : (
                <>
                  <div className="table-responsive spreadsheet-container">
                    <table className="spreadsheet-table">
                      <thead>
                        <tr>
                          <SortTh label="Nome" sortKey="nome" />
                          <SortTh label="Contato" sortKey="contato" />
                          <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDrivers.map((driver) => (
                          <tr key={driver.id}>
                            <td className="font-bold">{driver.nome}</td>
                            <td>{driver.contato}</td>
                            <td className="actions-cell">
                              <div className="spreadsheet-actions justify-end">
                                <button onClick={() => handleEdit(driver)} className="action-icon-btn edit" title="Editar">✎</button>
                                <button onClick={() => handleDelete(driver.id)} className="action-icon-btn delete" title="Excluir">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {confirmDeleteId !== null && (
                    <ConfirmDialog
                      message="Tem certeza que deseja excluir este motorista?"
                      onConfirm={confirmDelete}
                      onCancel={() => setConfirmDeleteId(null)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
