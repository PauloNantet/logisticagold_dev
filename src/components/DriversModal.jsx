import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

const formatPhone = (val) => {
  const digits = val.replace(/\D/g, "").slice(0, 22);
  if (!digits) return "";
  const parts = [];
  let i = 0;
  while (i < digits.length) {
    const remaining = digits.length - i;
    const take = remaining >= 11 ? 11 : remaining >= 10 ? 10 : remaining;
    const chunk = digits.slice(i, i + take);
    if (chunk.length >= 7) {
      parts.push(`${chunk.slice(0, 2)} ${chunk.slice(2, 7)}-${chunk.slice(7)}`);
    } else if (chunk.length > 2) {
      parts.push(`${chunk.slice(0, 2)} ${chunk.slice(2)}`);
    } else {
      parts.push(chunk);
    }
    i += take;
  }
  return parts.join(" / ");
};

const handlePhoneKeyDown = (e, updater) => {
  if (e.key !== "Backspace" && e.key !== "Delete") return;
  const input = e.target;
  const pos = input.selectionStart;
  const val = input.value;

  if (e.key === "Backspace" && pos > 0 && !/\d/.test(val[pos - 1])) {
    e.preventDefault();
    let removeStart = pos - 1;
    while (removeStart > 0 && !/\d/.test(val[removeStart - 1])) removeStart--;
    if (removeStart > 0) removeStart--;
    const newVal = val.slice(0, removeStart) + val.slice(pos);
    const formatted = formatPhone(newVal);
    const newPos = Math.min(removeStart, formatted.length);
    updater(formatted);
    requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
  } else if (e.key === "Delete" && pos < val.length && !/\d/.test(val[pos])) {
    e.preventDefault();
    let removeEnd = pos + 1;
    while (removeEnd < val.length && !/\d/.test(val[removeEnd])) removeEnd++;
    if (removeEnd < val.length) removeEnd++;
    const newVal = val.slice(0, pos) + val.slice(removeEnd);
    const formatted = formatPhone(newVal);
    const newPos = Math.min(pos, formatted.length);
    updater(formatted);
    requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
  }
};

const handlePhoneInput = (e, updater) => {
  const input = e.target;
  const formatted = formatPhone(input.value);
  const pos = input.selectionStart;
  const oldLen = input.value.length;
  const newLen = formatted.length;
  let newPos = pos;
  if (newLen > oldLen) newPos = pos + (newLen - oldLen);
  else if (newLen < oldLen) newPos = Math.max(0, pos - (oldLen - newLen));
  newPos = Math.min(newPos, formatted.length);
  updater(formatted);
  requestAnimationFrame(() => { input.selectionStart = newPos; input.selectionEnd = newPos; });
};

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
              <div className="search-container">
                <input type="text" placeholder="Buscar nome ou contato..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                <span className="search-icon">🔍</span>
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
              <div className="clients-list-header">
                <button onClick={startAdding} className="add-client-btn-main">+ Novo Motorista</button>
              </div>

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
