import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM history ORDER BY created_at DESC"
  );
  const parsed = rows.map(h => ({
    ...h,
    fullData: JSON.parse(h.full_data || "{}")
  }));
  res.json(parsed);
});

router.post("/", async (req, res) => {
  const { numero, dataEmissao, cliente, valor, fullData } = req.body;

  const { rows } = await pool.query(`
    INSERT INTO history (numero, data_emissao, cliente, valor, full_data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [numero || "", dataEmissao || "", cliente || "", valor || 0, JSON.stringify(fullData || {})]);
  const item = rows[0];
  res.json({ ...item, fullData: JSON.parse(item.full_data) });
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM history WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Histórico não encontrado." });
  res.json({ ok: true });
});

export default router;
