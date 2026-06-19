import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, nome, documento, email, endereco,
           responsavel_nome AS "responsavelNome", responsavel_telefone AS "responsavelTelefone",
           created_at
    FROM clients ORDER BY nome
  `);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { nome, documento, email, endereco, responsavelNome, responsavelTelefone } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: "Nome do cliente é obrigatório." });

  const { rows } = await pool.query(`
    INSERT INTO clients (nome, documento, email, endereco, responsavel_nome, responsavel_telefone)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, nome, documento, email, endereco,
              responsavel_nome AS "responsavelNome", responsavel_telefone AS "responsavelTelefone",
              created_at
  `, [nome.trim(), documento || "", email || "", endereco || "", responsavelNome || "", responsavelTelefone || ""]);
  res.json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { nome, documento, email, endereco, responsavelNome, responsavelTelefone } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: "Nome do cliente é obrigatório." });

  const { rowCount, rows } = await pool.query(`
    UPDATE clients SET nome = $1, documento = $2, email = $3, endereco = $4, responsavel_nome = $5, responsavel_telefone = $6
    WHERE id = $7
    RETURNING id, nome, documento, email, endereco,
              responsavel_nome AS "responsavelNome", responsavel_telefone AS "responsavelTelefone",
              created_at
  `, [nome.trim(), documento || "", email || "", endereco || "", responsavelNome || "", responsavelTelefone || "", req.params.id]);

  if (rowCount === 0) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json({ ok: true });
});

export default router;
