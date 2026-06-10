import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM agenda_servicos ORDER BY created_at DESC");
    const parsed = rows.map(item => ({
      ...item,
      concluido: item.concluido === true,
      cliente: {
        nome: item.cliente_nome || "",
        documento: item.cliente_documento || "",
        email: item.cliente_email || "",
        endereco: item.cliente_endereco || "",
      }
    }));
    res.json(parsed);
  } catch (err) {
    console.error("Erro ao buscar agendamentos:", err);
    res.status(500).json({ error: "Erro ao buscar agendamentos: " + err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { fornecedor, numero, data, hora, voo, servico, nome_guia, tel_guia, nome_pax, pax, file_evento, cliente, observacao, veiculo, placa, motorista, contato_motorista } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO agenda_servicos (fornecedor, numero, data, hora, voo, servico, nome_guia, tel_guia, nome_pax, pax, file_evento, cliente_nome, cliente_documento, cliente_email, cliente_endereco, observacao, veiculo, placa, motorista, contato_motorista)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      fornecedor || "", numero || "", data || "", hora || "", voo || "", servico || "",
      nome_guia || "", tel_guia || "", nome_pax || "", pax || "", file_evento || "",
      cliente?.nome || "", cliente?.documento || "", cliente?.email || "", cliente?.endereco || "",
      observacao || "", veiculo || "", placa || "", motorista || "", contato_motorista || ""
    ]);
    const item = rows[0];
    res.json({
      ...item,
      concluido: item.concluido === true,
      cliente: {
        nome: item.cliente_nome || "",
        documento: item.cliente_documento || "",
        email: item.cliente_email || "",
        endereco: item.cliente_endereco || "",
      }
    });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    res.status(500).json({ error: "Erro ao criar agendamento: " + err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { fornecedor, numero, data, hora, voo, servico, nome_guia, tel_guia, nome_pax, pax, file_evento, cliente, observacao, veiculo, placa, motorista, contato_motorista, concluido } = req.body;

    const { rowCount, rows } = await pool.query(`
      UPDATE agenda_servicos SET fornecedor = $1, numero = $2, data = $3, hora = $4, voo = $5, servico = $6, nome_guia = $7, tel_guia = $8, nome_pax = $9, pax = $10, file_evento = $11, cliente_nome = $12, cliente_documento = $13, cliente_email = $14, cliente_endereco = $15, observacao = $16, veiculo = $17, placa = $18, motorista = $19, contato_motorista = $20, concluido = $21
      WHERE id = $22
      RETURNING *
    `, [
      fornecedor || "", numero || "", data || "", hora || "", voo || "", servico || "",
      nome_guia || "", tel_guia || "", nome_pax || "", pax || "", file_evento || "",
      cliente?.nome || "", cliente?.documento || "", cliente?.email || "", cliente?.endereco || "",
      observacao || "", veiculo || "", placa || "", motorista || "", contato_motorista || "",
      concluido === true,
      req.params.id
    ]);

    if (rowCount === 0) return res.status(404).json({ error: "Agendamento não encontrado." });
    const item = rows[0];
    res.json({
      ...item,
      concluido: item.concluido === true,
      cliente: {
        nome: item.cliente_nome || "",
        documento: item.cliente_documento || "",
        email: item.cliente_email || "",
        endereco: item.cliente_endereco || "",
      }
    });
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    res.status(500).json({ error: "Erro ao atualizar agendamento: " + err.message });
  }
});

router.patch("/:id/concluir", async (req, res) => {
  try {
    const { rows: existing } = await pool.query("SELECT * FROM agenda_servicos WHERE id = $1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Agendamento não encontrado." });

    const item = existing[0];
    const novo = item.concluido === true ? false : true;
    const { rows: updatedRows } = await pool.query("UPDATE agenda_servicos SET concluido = $1 WHERE id = $2 RETURNING *", [novo, req.params.id]);

    const updated = updatedRows[0];
    res.json({
      ...updated,
      concluido: updated.concluido === true,
      cliente: {
        nome: updated.cliente_nome || "",
        documento: updated.cliente_documento || "",
        email: updated.cliente_email || "",
        endereco: updated.cliente_endereco || "",
      }
    });
  } catch (err) {
    console.error("Erro ao concluir agendamento:", err);
    res.status(500).json({ error: "Erro ao concluir agendamento: " + err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM agenda_servicos WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Agendamento não encontrado." });
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir agendamento:", err);
    res.status(500).json({ error: "Erro ao excluir agendamento: " + err.message });
  }
});

export default router;
