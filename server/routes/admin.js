import { Router } from "express";
import pool from "../db.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = Router();

const TABLES = [
  "users", "clients", "services", "history", "images",
  "settings", "vehicles", "service_orders", "mapas",
  "drivers", "agenda_servicos", "orcamentos"
];

router.get("/backup", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const backup = { created_at: new Date().toISOString(), tables: {} };

    for (const table of TABLES) {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
      backup.tables[table] = rows;
    }

    const filename = `backup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    console.error("Erro ao gerar backup:", err);
    res.status(500).json({ error: "Erro ao gerar backup do banco de dados." });
  }
});

const TABLE_COLUMNS = {
  users: ["username", "display_name", "password_hash", "role"],
  clients: ["nome", "documento", "email", "endereco", "responsavel_nome", "responsavel_telefone"],
  services: ["produto", "descricao", "valor"],
  history: ["numero", "data_emissao", "cliente", "valor", "full_data"],
  images: ["filename", "data", "content_type"],
  settings: ["empresa", "pagamento", "tema"],
  vehicles: ["modelo", "placa", "cor", "marca"],
  service_orders: ["numero", "data_emissao", "hora", "servico", "nome_guia", "nome_pax", "pax", "file_evento", "cliente", "observacao", "veiculo", "placa", "motorista", "valor", "full_data"],
  mapas: ["entries", "full_data"],
  drivers: ["nome", "contato"],
  agenda_servicos: ["fornecedor", "numero", "data", "hora", "voo", "servico", "nome_guia", "tel_guia", "nome_pax", "pax", "file_evento", "cliente_nome", "cliente_documento", "cliente_email", "cliente_endereco", "observacao", "veiculo", "placa", "motorista", "contato_motorista", "valor_pagar", "valor_receber", "lucro", "concluido"],
  orcamentos: ["numero", "data_emissao", "validade", "cliente", "valor", "full_data"]
};

function serializeValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return JSON.stringify(val);
  return val;
}

router.post("/restore", authMiddleware, adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { tables } = req.body;
    if (!tables || typeof tables !== "object") {
      return res.status(400).json({ error: "Formato inválido. Envie { tables: { ... } }" });
    }

    await client.query("BEGIN");

    for (const table of TABLES) {
      const rows = tables[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const columns = TABLE_COLUMNS[table];
      if (!columns) continue;

      await client.query(`DELETE FROM ${table}`);

      for (const row of rows) {
        const values = columns.map(c => serializeValue(row[c]));
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        await client.query(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
          values
        );
      }

      await client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1));
      `);
    }

    await client.query("COMMIT");
    res.json({ ok: true, message: "Restore concluído com sucesso." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao restaurar backup:", err);
    res.status(500).json({ error: "Erro ao restaurar backup: " + err.message });
  } finally {
    client.release();
  }
});

export default router;
