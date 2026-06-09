import { Router } from "express";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";
import { generateToken, authMiddleware, adminMiddleware } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

function validatePassword(password) {
  if (!password || password.length < 4) return "Senha deve ter no mínimo 4 caracteres.";
  return null;
}

function validateUsername(username) {
  const key = username?.trim().toLowerCase();
  if (!key || key.length < 3) return "Mínimo de 3 caracteres.";
  return null;
}

const ADMIN_USERNAME = "cainn";
const ADMIN_PASSWORD = "cainn";

async function seedAdminData() {
  const seedDir = path.join(__dirname, "..", "seed");

  const { rows: existingSettings } = await pool.query("SELECT id FROM settings LIMIT 1");
  if (existingSettings.length === 0) {
    try {
      const settingsRaw = readFileSync(path.join(seedDir, "settings.json"), "utf-8");
      const settings = JSON.parse(settingsRaw);
      await pool.query(
        "INSERT INTO settings (empresa, pagamento, tema) VALUES ($1, $2, $3)",
        [JSON.stringify(settings.empresa || {}), JSON.stringify(settings.pagamento || {}), settings.tema || "gold-text"]
      );
    } catch {
      await pool.query(
        "INSERT INTO settings (empresa, pagamento, tema) VALUES ($1, $2, $3)",
        ["{}", "{}", "gold-text"]
      );
    }
  }

  try {
    const { rows: existingClients } = await pool.query("SELECT id FROM clients LIMIT 1");
    if (existingClients.length === 0) {
      const clientsRaw = readFileSync(path.join(seedDir, "clients.json"), "utf-8");
      const clients = JSON.parse(clientsRaw);
      for (const c of clients) {
        await pool.query(
          "INSERT INTO clients (nome, documento, email, endereco, responsavel_nome, responsavel_telefone) VALUES ($1, $2, $3, $4, $5, $6)",
          [c.nome, c.documento || "", c.email || "", c.endereco || "", c.responsavelNome || "", c.responsavelTelefone || ""]
        );
      }
    }
  } catch (e) {
    console.error("Erro ao seed clientes:", e.message);
  }

  try {
    const { rows: existingServices } = await pool.query("SELECT id FROM services LIMIT 1");
    if (existingServices.length === 0) {
      const servicesRaw = readFileSync(path.join(seedDir, "services.json"), "utf-8");
      const services = JSON.parse(servicesRaw);
      for (const s of services) {
        await pool.query(
          "INSERT INTO services (produto, descricao, valor) VALUES ($1, $2, $3)",
          [s.produto, s.descricao || "", s.valor || ""]
        );
      }
    }
  } catch (e) {
    console.error("Erro ao seed serviços:", e.message);
  }

  try {
    const { rows: existingHistory } = await pool.query("SELECT id FROM history LIMIT 1");
    if (existingHistory.length === 0) {
      const historyRaw = readFileSync(path.join(seedDir, "history.json"), "utf-8");
      const history = JSON.parse(historyRaw);
      for (const h of history) {
        await pool.query(
          "INSERT INTO history (numero, data_emissao, cliente, valor, full_data) VALUES ($1, $2, $3, $4, $5)",
          [h.numero || "", h.dataEmissao || "", h.cliente || "", h.valor || 0, JSON.stringify(h.fullData || {})]
        );
      }
    }
  } catch (e) {
    console.error("Erro ao seed histórico:", e.message);
  }
}

async function ensureAdmin() {
  const { rows } = await pool.query("SELECT id FROM users WHERE username = $1", [ADMIN_USERNAME]);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    await pool.query(
      "INSERT INTO users (username, display_name, password_hash, role) VALUES ($1, $2, $3, $4)",
      [ADMIN_USERNAME, "Administrador", hash, "admin"]
    );
    await seedAdminData();
  }
}

router.post("/register", authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, role } = req.body;
  const key = username?.trim().toLowerCase();

  const usernameErr = validateUsername(key);
  if (usernameErr) return res.status(400).json({ error: usernameErr });

  const { rows: existing } = await pool.query("SELECT id FROM users WHERE username = $1", [key]);
  if (existing.length > 0) return res.status(400).json({ error: "Usuário já existe." });

  const passErr = validatePassword(password);
  if (passErr) return res.status(400).json({ error: passErr });

  const hash = bcrypt.hashSync(password, 10);
  const userRole = role === "admin" ? "admin" : "user";

  await pool.query(
    "INSERT INTO users (username, display_name, password_hash, role) VALUES ($1, $2, $3, $4)",
    [key, username.trim(), hash, userRole]
  );

  res.json({ ok: true });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const key = username?.trim().toLowerCase();

  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [key]);
  const user = rows[0];
  if (!user) return res.status(400).json({ error: "Usuário não encontrado." });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: "Senha incorreta." });
  }

  const token = generateToken(user);
  res.json({
    ok: true,
    token,
    user: { username: user.username, displayName: user.display_name, role: user.role }
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const { rows } = await pool.query("SELECT username, display_name, role FROM users WHERE id = $1", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ username: user.username, displayName: user.display_name, role: user.role });
});

router.put("/me", authMiddleware, async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

  if (username) {
    const key = username.trim().toLowerCase();
    if (key !== user.username) {
      const usernameErr = validateUsername(key);
      if (usernameErr) return res.status(400).json({ error: usernameErr });
      const { rows: existing } = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2", [key, user.id]);
      if (existing.length > 0) return res.status(400).json({ error: "Nome de usuário já está em uso." });
      await pool.query("UPDATE users SET username = $1, display_name = $2 WHERE id = $3", [key, username.trim(), user.id]);
    }
  }

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: "Informe a senha atual para alterar a senha." });
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: "Senha atual incorreta." });
    }
    const passErr = validatePassword(newPassword);
    if (passErr) return res.status(400).json({ error: passErr });
    const hash = bcrypt.hashSync(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id]);
  }

  const { rows: updatedRows } = await pool.query("SELECT id, username, role FROM users WHERE id = $1", [user.id]);
  const updated = updatedRows[0];
  const token = generateToken(updated);

  res.json({
    ok: true,
    token,
    user: {
      username: updated.username,
      displayName: username ? username.trim() : user.display_name,
      role: updated.role
    }
  });
});

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  const { rows } = await pool.query("SELECT username, display_name, role FROM users ORDER BY username");
  res.json(rows.map(u => ({ username: u.username, displayName: u.display_name, role: u.role })));
});

router.delete("/users/:username", authMiddleware, adminMiddleware, async (req, res) => {
  const key = req.params.username?.trim().toLowerCase();
  if (key === ADMIN_USERNAME) {
    return res.status(400).json({ error: "Não é possível excluir o administrador principal." });
  }
  const { rowCount } = await pool.query("DELETE FROM users WHERE username = $1", [key]);
  if (rowCount === 0) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ ok: true });
});

router.post("/users/:username/reset-password", authMiddleware, adminMiddleware, async (req, res) => {
  const key = req.params.username?.trim().toLowerCase();
  if (key === ADMIN_USERNAME) {
    return res.status(400).json({ error: "Não é possível alterar a senha do administrador por aqui." });
  }
  const { newPassword } = req.body;
  const passErr = validatePassword(newPassword);
  if (passErr) return res.status(400).json({ error: passErr });

  const hash = bcrypt.hashSync(newPassword, 10);
  const { rowCount } = await pool.query("UPDATE users SET password_hash = $1 WHERE username = $2", [hash, key]);
  if (rowCount === 0) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ ok: true });
});

export { ensureAdmin };
export default router;
