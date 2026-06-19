import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM service_orders ORDER BY created_at DESC"
  );
  const parsed = rows.map(h => ({
    ...h,
    fullData: JSON.parse(h.full_data || "{}")
  }));
  res.json(parsed);
});

router.post("/", async (req, res) => {
  const { numero, dataEmissao, hora, servico, nomeGuia, nomePax, pax, fileEvento, cliente, observacao, veiculo, placa, motorista, valor, fullData } = req.body;

  const { rows } = await pool.query(`
    INSERT INTO service_orders (numero, data_emissao, hora, servico, nome_guia, nome_pax, pax, file_evento, cliente, observacao, veiculo, placa, motorista, valor, full_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    numero || "",
    dataEmissao || "",
    hora || "",
    servico || "",
    nomeGuia || "",
    nomePax || "",
    pax || "",
    fileEvento || "",
    cliente || "",
    observacao || "",
    veiculo || "",
    placa || "",
    motorista || "",
    valor || 0,
    JSON.stringify(fullData || {})
  ]);
  const item = rows[0];
  res.json({ ...item, fullData: JSON.parse(item.full_data) });
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM service_orders WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Ordem de serviço não encontrada." });
  res.json({ ok: true });
});

export default router;
