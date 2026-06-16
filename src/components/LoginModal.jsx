import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginUser, fetchMe } from "../utils/auth";

export default function LoginModal({ onLogin, empresaNome }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginUser(username, password);
    if (result.ok) {
      await fetchMe();
      onLogin();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const EyeIcon = ({ visible, toggle }) => (
    <button
      type="button"
      className="password-toggle"
      onClick={toggle}
      tabIndex={-1}
      aria-label={visible ? "Ocultar" : "Mostrar"}
    >
      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">{empresaNome}</h1>
          <p className="login-slogan">Sistema de Faturamento</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="login-title">Entrar</h2>

          {error && <div className="login-error">{error}</div>}

          <div className="input-group">
            <label className="input-label">Usuário</label>
            <div className="password-wrapper">
              <input
                type={showUsername ? "text" : "password"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="custom-input password-input"
                autoFocus
                required
              />
              <EyeIcon visible={showUsername} toggle={() => setShowUsername(!showUsername)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Senha</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="custom-input password-input"
                required
              />
              <EyeIcon visible={showPassword} toggle={() => setShowPassword(!showPassword)} />
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Aguarde..." : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LogIn size={18} /> Entrar</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
