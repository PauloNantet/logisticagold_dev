import { useState, useEffect } from "react";
import { Search, Pencil, Trash2, Plus, Users, ArrowUpDown } from "lucide-react";
import { api } from "../utils/api";
import { Modal, IconBtn } from "../ui";
import ConfirmDialog from "./ConfirmDialog";

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    const va = (a[key] || "").toString().toLowerCase();
    const vb = (b[key] || "").toString().toLowerCase();
    if (key === "valor") return dir === "asc" ? (Number(a.valor) - Number(b.valor)) : (Number(b.valor) - Number(a.valor));
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
};

export default function ClientsModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const initialClientState = {
    nome: "", documento: "", email: "", endereco: "",
    responsavelNome: "", responsavelTelefone: "", responsavelTelefone2: ""
  };

  const [formData, setFormData] = useState(initialClientState);

  useEffect(() => {
    api.get("/api/clients").then(setClients).catch(console.error);
  }, []);

  const formatPhone = (val) => {
    val = val.replace(/\D/g, "").slice(0, 11);
    val = val.replace(/^(\d{2})(\d)/, "$1 $2").replace(/(\d{5})(\d)/, "$1-$2");
    return val;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const SortTh = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-th" style={{ cursor: "pointer" }}>
      {label} <ArrowUpDown size={10} style={{ opacity: 0.5 }} />
    </th>
  );

  const handleEdit = (client) => {
    setEditingIndex(client.id);
    const partes = (client.responsavelTelefone || "").split(" / ").map(s => s.trim());
    setFormData({ ...client, responsavelTelefone: partes[0] || "", responsavelTelefone2: partes[1] || "" });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    try {
      await api.del(`/api/clients/${confirmDeleteId}`);
      setClients(prev => prev.filter(c => c.id !== confirmDeleteId));
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
    }
    setConfirmDeleteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const telefones = [formData.responsavelTelefone, formData.responsavelTelefone2]
      .filter(t => t.trim())
      .join(" / ");
    const payload = { ...formData, responsavelTelefone: telefones };

    try {
      if (editingIndex !== null) {
        const updated = await api.put(`/api/clients/${editingIndex}`, payload);
        setClients(prev => prev.map(c => c.id === editingIndex ? updated : c));
      } else {
        const created = await api.post("/api/clients", payload);
        setClients(prev => [...prev, created]);
      }
      setIsAdding(false);
      setEditingIndex(null);
      setFormData(initialClientState);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
    }
  };

  const startAdding = () => {
    setEditingIndex(null);
    setFormData(initialClientState);
    setIsAdding(true);
  };

  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedClients = sortConfig.key
    ? sortData(filteredClients, sortConfig.key, sortConfig.dir)
    : filteredClients;

  return (
    <Modal
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Users size={18} /> Gerenciar Clientes</span>}
      onClose={onClose}
      count={clients.length > 0 ? `${filteredClients.length < clients.length ? `${filteredClients.length} de ` : ""}${clients.length} cliente${clients.length !== 1 ? "s" : ""}` : undefined}
    >
      {!isAdding && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div className="search-container" style={{ flex: 1 }}>
            <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            <Search size={14} className="search-icon" />
          </div>
          <button onClick={startAdding} className="save-settings-btn" style={{ flex: "none", padding: "10px 20px", whiteSpace: "nowrap" }}>
            <Plus size={16} /> Novo
          </button>
        </div>
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit} className="client-form">
          <h3 className="settings-section-title" style={{ color: "var(--primary)" }}>{editingIndex !== null ? "Editar Cliente" : "Novo Cliente"}</h3>

          <div className="settings-grid full">
            <div className="input-group">
              <label className="input-label">Nome Completo / Razão Social</label>
              <input type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: João Silva" className="custom-input" />
            </div>
          </div>

          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">CPF / CNPJ</label>
              <input type="text" value={formData.documento} onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "").slice(0, 14);
                if (val.length <= 11) {
                  val = val.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                } else {
                  val = val.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
                }
                setFormData({ ...formData, documento: val });
              }} placeholder="Ex: 123.456.789-00" className="custom-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })} placeholder="Ex: contato@email.com" className="custom-input" style={{ borderColor: formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? '#ff4444' : (formData.email ? '#4caf50' : undefined) }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Endereço Completo</label>
            <input type="text" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Ex: Rua, número, bairro, cidade" className="custom-input" />
          </div>

          <div className="form-row-3">
            <div style={{ flex: 1 }}>
              <label className="input-label">Nome do Responsável</label>
              <input type="text" value={formData.responsavelNome} onChange={(e) => setFormData({ ...formData, responsavelNome: e.target.value })} placeholder="Ex: Maria" className="custom-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Telefone 1</label>
              <input type="text" value={formData.responsavelTelefone} onChange={(e) => setFormData({ ...formData, responsavelTelefone: formatPhone(e.target.value) })} placeholder="Ex: 21 99999-9999" className="custom-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Telefone 2</label>
              <input type="text" value={formData.responsavelTelefone2} onChange={(e) => setFormData({ ...formData, responsavelTelefone2: formatPhone(e.target.value) })} placeholder="Ex: 21 98888-8888" className="custom-input" />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 20, padding: 0, border: "none", background: "transparent" }}>
            <button type="submit" className="save-settings-btn">{editingIndex !== null ? "Atualizar" : "Salvar Cliente"}</button>
            <button type="button" onClick={() => setIsAdding(false)} className="cancel-settings-btn">Voltar</button>
          </div>
        </form>
      ) : clients.length === 0 ? (
        <div className="empty-state">Nenhum cliente cadastrado.</div>
      ) : (
        <>
          <div className="table-responsive spreadsheet-container">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <SortTh label="Nome / Razão Social" sortKey="nome" />
                  <SortTh label="CPF / CNPJ" sortKey="documento" />
                  <SortTh label="Email" sortKey="email" />
                  <SortTh label="Endereço" sortKey="endereco" />
                  <SortTh label="Responsável" sortKey="responsavelNome" />
                  <SortTh label="Telefone" sortKey="responsavelTelefone" />
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => (
                  <tr key={client.id}>
                    <td className="font-bold truncate-cell wrap-cell">{client.nome}</td>
                    <td className="truncate-cell">{client.documento}</td>
                    <td className="truncate-cell">{client.email}</td>
                    <td className="truncate-cell wrap-cell">{client.endereco}</td>
                    <td className="truncate-cell">{client.responsavelNome}</td>
                    <td className="truncate-cell">{client.responsavelTelefone}</td>
                    <td className="actions-cell">
                      <div className="spreadsheet-actions justify-end">
                        <IconBtn icon={Pencil} label="Editar" onClick={() => handleEdit(client)} variant="edit" />
                        <IconBtn icon={Trash2} label="Excluir" onClick={() => handleDelete(client.id)} variant="delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {confirmDeleteId !== null && (
            <ConfirmDialog
              message="Tem certeza que deseja excluir este cliente?"
              onConfirm={confirmDelete}
              onCancel={() => setConfirmDeleteId(null)}
            />
          )}
        </>
      )}
    </Modal>
  );
}
