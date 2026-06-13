import { useState, useEffect, useRef } from "react";
import { getAllUsers, registerUser, deleteUser, isAdmin, resetUserPassword } from "../utils/auth";
import { api } from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const restoreFileRef = useRef(null);

  const loadUsers = async () => {
    if (isAdmin()) {
      setUsers(await getAllUsers());
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const result = await registerUser(newUsername, newPassword, "user");
    if (result.ok) {
      setSuccess(`Usuário "${newUsername}" criado com sucesso.`);
      setNewUsername("");
      setNewPassword("");
      loadUsers();
    } else {
      setError(result.error);
    }
  };

  const handleDelete = async (username) => {
    setConfirmDeleteUser(username);
  };

  const confirmDeleteUserAction = async () => {
    const username = confirmDeleteUser;
    setConfirmDeleteUser(null);
    setError("");
    setSuccess("");

    const result = await deleteUser(username);
    if (result.ok) {
      setSuccess(`Usuário "${username}" excluído.`);
      loadUsers();
    } else {
      setError(result.error);
    }
  };

  const handleResetPassword = async (username) => {
    setError("");
    setSuccess("");
    if (!resetPassword || resetPassword.length < 4) {
      setError("A nova senha deve ter no mínimo 4 caracteres.");
      return;
    }
    const result = await resetUserPassword(username, resetPassword);
    if (result.ok) {
      setSuccess(`Senha do usuário "${username}" redefinida com sucesso.`);
      setResetUser(null);
      setResetPassword("");
      loadUsers();
    } else {
      setError(result.error);
    }
  };

  const cancelReset = () => {
    setResetUser(null);
    setResetPassword("");
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem("fatura_token");
      const res = await fetch("/api/admin/backup", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao gerar backup.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
    setBackupLoading(false);
  };

  const handleRestore = async (file) => {
    if (!file) return;
    setRestoreLoading(true);
    setError("");
    setSuccess("");
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.tables) throw new Error("Arquivo de backup inválido.");
      const result = await api.post("/api/admin/restore", backup);
      setSuccess(result.message || "Restore concluído com sucesso.");
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
    setRestoreLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Administração de Usuários</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="admin-content">
          {error && <div className="login-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}

          <div className="admin-section">
            <h3>Usuários Cadastrados</h3>
            {users.length === 0 ? (
              <div className="empty-clients">Nenhum usuário cadastrado.</div>
            ) : (
              <div className="table-responsive spreadsheet-container">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Usuário</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.username} className={u.role === "admin" ? "admin-table-row" : ""}>
                        <td className="font-bold">{u.displayName}</td>
                        <td className="admin-username-cell">@{u.username}</td>
                        <td>
                          <span className={`admin-user-role ${u.role}`}>{u.role === "admin" ? "Admin" : "Usuário"}</span>
                        </td>
                        <td className="actions-cell">
                          {u.role !== "admin" && (
                            <div className="spreadsheet-actions justify-end">
                              {resetUser === u.username ? (
                                <div className="reset-password-inline">
                                  <input
                                    type="password"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    placeholder="Nova senha (mín. 4)"
                                    className="custom-input reset-input"
                                    autoFocus
                                  />
                                  <button className="admin-reset-confirm-btn" onClick={() => handleResetPassword(u.username)}>OK</button>
                                  <button className="admin-reset-cancel-btn" onClick={cancelReset}>X</button>
                                </div>
                              ) : (
                                <>
                                  <button className="admin-action-btn reset" onClick={() => { setResetUser(u.username); setResetPassword(""); }} title="Redefinir senha">Redefinir Senha</button>
                                  <button className="admin-action-btn delete" onClick={() => handleDelete(u.username)} title="Excluir usuário">Excluir</button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-section">
            <h3>Criar Novo Usuário</h3>
            <form onSubmit={handleCreate} className="admin-create-form">
              <div className="input-group">
                <label className="input-label">Nome de usuário</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Ex: joao" className="custom-input" required />
              </div>
              <div className="input-group">
                <label className="input-label">Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 4 caracteres" className="custom-input" required />
              </div>
              <button type="submit" className="login-submit-btn">Criar Usuário</button>
            </form>
          </div>

          {isAdmin() && (
            <div className="admin-section">
              <h3>Backup / Restore do Banco de Dados</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                Exporta ou importa todos os dados do sistema em formato JSON.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="save-settings-btn"
                  style={{ flex: "none", padding: "10px 20px" }}
                  onClick={handleBackup}
                  disabled={backupLoading}
                >
                  {backupLoading ? "Gerando..." : "Baixar Backup"}
                </button>
                <button
                  type="button"
                  className="cancel-settings-btn"
                  style={{ flex: "none", padding: "10px 20px" }}
                  onClick={() => restoreFileRef.current?.click()}
                  disabled={restoreLoading}
                >
                  {restoreLoading ? "Restaurando..." : "Restaurar Backup"}
                </button>
                <input
                  ref={restoreFileRef}
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleRestore(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
      {confirmDeleteUser && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir o usuário "${confirmDeleteUser}"? Todos os dados dele serão perdidos.`}
          onConfirm={confirmDeleteUserAction}
          onCancel={() => setConfirmDeleteUser(null)}
        />
      )}
    </div>
  );
}
