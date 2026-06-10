import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    const va = (a[key] || "").toString().toLowerCase();
    const vb = (b[key] || "").toString().toLowerCase();
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
};

export default function VehiclesModal({ onClose }) {
  const [vehicles, setVehicles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const initialVehicleState = { modelo: "", placa: "", cor: "", marca: "" };
  const [formData, setFormData] = useState(initialVehicleState);

  useEffect(() => {
    api.get("/api/vehicles").then(setVehicles).catch(console.error);
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-th">
      {label}
    </th>
  );

  const handleEdit = (vehicle) => {
    setEditingId(vehicle.id);
    setFormData(vehicle);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    try {
      await api.del(`/api/vehicles/${confirmDeleteId}`);
      setVehicles(prev => prev.filter(v => v.id !== confirmDeleteId));
    } catch (err) {
      console.error("Erro ao excluir veículo:", err);
    }
    setConfirmDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
        const updated = await api.put(`/api/vehicles/${editingId}`, formData);
        setVehicles(prev => prev.map(v => v.id === editingId ? updated : v));
      } else {
        const created = await api.post("/api/vehicles", formData);
        setVehicles(prev => [...prev, created]);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData(initialVehicleState);
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
    }
  };

  const startAdding = () => {
    setEditingId(null);
    setFormData(initialVehicleState);
    setIsAdding(true);
  };

  const filteredVehicles = vehicles.filter(v =>
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedVehicles = sortConfig.key
    ? sortData(filteredVehicles, sortConfig.key, sortConfig.dir)
    : filteredVehicles;

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container services-modal">
        <header className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-row">
              <h2 className="modal-title"><span>🚗</span> Gerenciar Veículos</h2>
              {!isAdding && vehicles.length > 0 && (
                <span className="table-count-header">
                  {filteredVehicles.length < vehicles.length ? `${filteredVehicles.length} de ${vehicles.length}` : `${vehicles.length}`} veículo{vehicles.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {!isAdding && (
              <div className="search-container">
                <input type="text" placeholder="Buscar modelo, placa ou marca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                <span className="search-icon">🔍</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="modal-close">✕</button>
        </header>

        <div className="modal-body">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="client-form">
              <h3 className="settings-section-title gold-text">{editingId !== null ? "Editar Veículo" : "Novo Veículo"}</h3>

              <div className="input-group">
                <label className="input-label">Modelo</label>
                <input type="text" required value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} className="custom-input" placeholder="Ex: Toyota Hilux" />
              </div>

              <div className="settings-grid">
                <div className="input-group">
                  <label className="input-label">Placa</label>
                  <input type="text" value={formData.placa} onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })} className="custom-input" placeholder="Ex: ABC-1234" />
                </div>
                <div className="input-group">
                  <label className="input-label">Marca</label>
                  <input type="text" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} className="custom-input" placeholder="Ex: Toyota" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Cor</label>
                <input type="text" value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} className="custom-input" placeholder="Ex: Branca" />
              </div>

              <div className="modal-footer no-padding-sides">
                <button type="submit" className="save-settings-btn">{editingId !== null ? "Atualizar" : "Salvar Veículo"}</button>
                <button type="button" onClick={() => setIsAdding(false)} className="cancel-settings-btn">Voltar</button>
              </div>
            </form>
          ) : (
            <div className="clients-list-container">
              <div className="clients-list-header">
                <button onClick={startAdding} className="add-client-btn-main">+ Novo Veículo</button>
              </div>

              {vehicles.length === 0 ? (
                <div className="empty-clients">Nenhum veículo cadastrado.</div>
              ) : (
                <>
                  <div className="table-responsive spreadsheet-container">
                    <table className="spreadsheet-table">
                      <thead>
                        <tr>
                          <SortTh label="Modelo" sortKey="modelo" />
                          <SortTh label="Placa" sortKey="placa" />
                          <SortTh label="Marca" sortKey="marca" />
                          <SortTh label="Cor" sortKey="cor" />
                          <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedVehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td className="font-bold">{vehicle.modelo}</td>
                            <td>{vehicle.placa}</td>
                            <td>{vehicle.marca}</td>
                            <td>{vehicle.cor}</td>
                            <td className="actions-cell">
                              <div className="spreadsheet-actions justify-end">
                                <button onClick={() => handleEdit(vehicle)} className="action-icon-btn edit" title="Editar">✎</button>
                                <button onClick={() => handleDelete(vehicle.id)} className="action-icon-btn delete" title="Excluir">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {confirmDeleteId !== null && (
                    <ConfirmDialog
                      message="Tem certeza que deseja excluir este veículo?"
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
