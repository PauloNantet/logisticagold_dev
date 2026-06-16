import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/public", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT empresa FROM settings LIMIT 1");
    const empresa = JSON.parse(rows[0]?.empresa || "{}");
    res.json({ nome: empresa.nome || "Sua Empresa" });
  } catch { res.json({ nome: "Sua Empresa" }); }
});

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM settings LIMIT 1");
  let settings = rows[0];
  if (!settings) {
    const { rows: newRows } = await pool.query(
      "INSERT INTO settings (empresa, pagamento, tema) VALUES ($1, $2, $3) RETURNING *",
      ["{}", "{}", "white"]
    );
    settings = newRows[0];
  }
  res.json({
    empresa: JSON.parse(settings.empresa || "{}"),
    pagamento: JSON.parse(settings.pagamento || "{}"),
    tema: settings.tema || "white"
  });
});

router.put("/", async (req, res) => {
  const { empresa, pagamento, tema } = req.body;

  const { rows: existing } = await pool.query("SELECT id FROM settings LIMIT 1");
  if (existing.length > 0) {
    await pool.query("UPDATE settings SET empresa = $1, pagamento = $2, tema = $3 WHERE id = $4",
      [JSON.stringify(empresa || {}), JSON.stringify(pagamento || {}), tema || "white", existing[0].id]);
  } else {
    await pool.query("INSERT INTO settings (empresa, pagamento, tema) VALUES ($1, $2, $3)",
      [JSON.stringify(empresa || {}), JSON.stringify(pagamento || {}), tema || "white"]);
  }

  res.json({ ok: true });
});

export default router;
