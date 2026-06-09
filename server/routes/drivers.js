import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM drivers ORDER BY nome");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { nome, contato } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: "Nome do motorista é obrigatório." });

  const { rows } = await pool.query(`
    INSERT INTO drivers (nome, contato) VALUES ($1, $2)
    RETURNING *
  `, [nome.trim(), contato || ""]);
  res.json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { nome, contato } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: "Nome do motorista é obrigatório." });

  const { rowCount, rows } = await pool.query(`
    UPDATE drivers SET nome = $1, contato = $2 WHERE id = $3
    RETURNING *
  `, [nome.trim(), contato || "", req.params.id]);

  if (rowCount === 0) return res.status(404).json({ error: "Motorista não encontrado." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM drivers WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Motorista não encontrado." });
  res.json({ ok: true });
});

export default router;
