import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    if (key === "valor") return dir === "asc" ? (Number(a.valor) - Number(b.valor)) : (Number(b.valor) - Number(a.valor));
    const va = (a[key] || "").toString().toLowerCase();
    const vb = (b[key] || "").toString().toLowerCase();
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
};

export default function ServicesModal({ onClose }) {
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const initialServiceState = { produto: "", descricao: "", valor: "" };
  const [formData, setFormData] = useState(initialServiceState);

  useEffect(() => {
    api.get("/api/services").then(setServices).catch(console.error);
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-th">
      {label}
      {sortConfig.key === sortKey && <span className="sort-arrow">{sortConfig.dir === "asc" ? " ▲" : " ▼"}</span>}
    </th>
  );

  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData(service);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    try {
      await api.del(`/api/services/${confirmDeleteId}`);
      setServices(prev => prev.filter(s => s.id !== confirmDeleteId));
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
    }
    setConfirmDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
        const updated = await api.put(`/api/services/${editingId}`, formData);
        setServices(prev => prev.map(s => s.id === editingId ? updated : s));
      } else {
        const created = await api.post("/api/services", formData);
        setServices(prev => [...prev, created]);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData(initialServiceState);
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
    }
  };

  const startAdding = () => {
    setEditingId(null);
    setFormData(initialServiceState);
    setIsAdding(true);
  };

  const filteredServices = services.filter(service =>
    service.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedServices = sortConfig.key
    ? sortData(filteredServices, sortConfig.key, sortConfig.dir)
    : filteredServices;

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container services-modal">
        <header className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-row">
              <h2 className="modal-title"><span>🛠️</span> Gerenciar Serviços</h2>
              {!isAdding && services.length > 0 && (
                <span className="table-count-header">
                  {filteredServices.length < services.length ? `${filteredServices.length} de ${services.length}` : `${services.length}`} serviço{services.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {!isAdding && (
              <div className="search-container">
                <input type="text" placeholder="Buscar serviço ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                <span className="search-icon">🔍</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="modal-close">✕</button>
        </header>

        <div className="modal-body">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="client-form">
              <h3 className="settings-section-title gold-text">{editingId !== null ? "Editar Serviço" : "Novo Serviço"}</h3>

              <div className="input-group">
                <label className="input-label">Produto / Serviço</label>
                <input type="text" required value={formData.produto} onChange={(e) => setFormData({ ...formData, produto: e.target.value })} className="custom-input" placeholder="Ex: Consultoria Técnica" />
              </div>

              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} className="custom-input" placeholder="Detalhes sobre o serviço..." />
              </div>

              <div className="input-group">
                <label className="input-label">Valor Unitário</label>
                <input type="text" required value={formData.valor ? Number(formData.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                  onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); const num = d ? (parseFloat(d) / 100).toString() : ""; setFormData({ ...formData, valor: num }); }}
                  className="custom-input" placeholder="R$ 0,00" />
              </div>

              <div className="modal-footer no-padding-sides">
                <button type="submit" className="save-settings-btn">{editingId !== null ? "Atualizar" : "Salvar Serviço"}</button>
                <button type="button" onClick={() => setIsAdding(false)} className="cancel-settings-btn">Voltar</button>
              </div>
            </form>
          ) : (
            <div className="clients-list-container">
              <div className="clients-list-header">
                <button onClick={startAdding} className="add-client-btn-main">+ Novo Serviço</button>
              </div>

              {services.length === 0 ? (
                <div className="empty-clients">Nenhum serviço cadastrado.</div>
              ) : (
                <>
                  <div className="table-responsive spreadsheet-container">
                    <table className="spreadsheet-table">
                      <thead>
                        <tr>
                          <SortTh label="Produto / Serviço" sortKey="produto" />
                          <SortTh label="Descrição" sortKey="descricao" />
                          <SortTh label="Valor Unit." sortKey="valor" />
                          <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedServices.map((service) => (
                          <tr key={service.id}>
                            <td className="font-bold">{service.produto}</td>
                            <td>{service.descricao}</td>
                            <td className="gold-text font-bold">{Number(service.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="actions-cell">
                              <div className="spreadsheet-actions justify-end">
                                <button onClick={() => handleEdit(service)} className="action-icon-btn edit" title="Editar">✎</button>
                                <button onClick={() => handleDelete(service.id)} className="action-icon-btn delete" title="Excluir">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {confirmDeleteId !== null && (
                    <ConfirmDialog
                      message="Tem certeza que deseja excluir este serviço?"
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
