import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM services ORDER BY produto");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { produto, descricao, valor } = req.body;
  if (!produto?.trim()) return res.status(400).json({ error: "Nome do produto/serviço é obrigatório." });

  const { rows } = await pool.query(`
    INSERT INTO services (produto, descricao, valor) VALUES ($1, $2, $3)
    RETURNING *
  `, [produto.trim(), descricao || "", valor || ""]);
  res.json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { produto, descricao, valor } = req.body;
  if (!produto?.trim()) return res.status(400).json({ error: "Nome do produto/serviço é obrigatório." });

  const { rowCount, rows } = await pool.query(`
    UPDATE services SET produto = $1, descricao = $2, valor = $3 WHERE id = $4
    RETURNING *
  `, [produto.trim(), descricao || "", valor || "", req.params.id]);

  if (rowCount === 0) return res.status(404).json({ error: "Serviço não encontrado." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM services WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Serviço não encontrado." });
  res.json({ ok: true });
});

export default router;
