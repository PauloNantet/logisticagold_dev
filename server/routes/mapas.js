import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM mapas ORDER BY created_at DESC"
  );
  const parsed = rows.map(m => ({
    ...m,
    entries: JSON.parse(m.entries || "[]"),
    fullData: JSON.parse(m.full_data || "{}")
  }));
  res.json(parsed);
});

router.post("/", async (req, res) => {
  const { entries, fullData } = req.body;

  const { rows } = await pool.query(`
    INSERT INTO mapas (entries, full_data)
    VALUES ($1, $2)
    RETURNING *
  `, [
    JSON.stringify(entries || []),
    JSON.stringify(fullData || {})
  ]);
  const item = rows[0];
  res.json({ ...item, entries: JSON.parse(item.entries), fullData: JSON.parse(item.full_data) });
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM mapas WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Mapa não encontrado." });
  res.json({ ok: true });
});

export default router;
