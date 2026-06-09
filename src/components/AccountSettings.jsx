import { useState, useEffect } from "react";
import { updateMyAccount, getCurrentUser } from "../utils/auth";

export default function AccountSettings({ onClose }) {
  const user = getCurrentUser();
  const [username, setUsername] = useState(user?.displayName || user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const body = {};
    if (username.trim()) body.username = username.trim();
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (!body.username && !body.newPassword) {
      setError("Preencha pelo menos o nome de usuário ou uma nova senha.");
      return;
    }

    const result = await updateMyAccount(body);
    if (result.ok) {
      setSuccess("Dados atualizados com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="modal-title">
            <span>⚙️</span> Ajustes da Conta
          </h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </header>

        <div className="modal-body">
          {error && <div className="login-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}

          <form onSubmit={handleSave}>
            <div className="input-group">
              <label className="input-label">Nome de usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="custom-input"
              />
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label className="input-label">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sua senha atual"
                className="custom-input"
              />
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label className="input-label">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="custom-input"
              />
            </div>

            <button type="submit" className="login-submit-btn" style={{ marginTop: 24 }}>
              Salvar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
