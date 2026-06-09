import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM vehicles ORDER BY modelo");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { modelo, placa, cor, marca } = req.body;
  if (!modelo?.trim()) return res.status(400).json({ error: "Modelo do veículo é obrigatório." });

  const { rows } = await pool.query(`
    INSERT INTO vehicles (modelo, placa, cor, marca) VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [modelo.trim(), placa || "", cor || "", marca || ""]);
  res.json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { modelo, placa, cor, marca } = req.body;
  if (!modelo?.trim()) return res.status(400).json({ error: "Modelo do veículo é obrigatório." });

  const { rowCount, rows } = await pool.query(`
    UPDATE vehicles SET modelo = $1, placa = $2, cor = $3, marca = $4 WHERE id = $5
    RETURNING *
  `, [modelo.trim(), placa || "", cor || "", marca || "", req.params.id]);

  if (rowCount === 0) return res.status(404).json({ error: "Veículo não encontrado." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Veículo não encontrado." });
  res.json({ ok: true });
});

export default router;
