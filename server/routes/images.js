import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, filename, data, content_type, created_at FROM images ORDER BY created_at DESC"
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM images WHERE id = $1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Imagem não encontrada." });
  res.json(rows[0]);
});

router.get("/:id/raw", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT data, content_type FROM images WHERE id = $1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Imagem não encontrada." });

  const image = rows[0];
  const base64 = image.data.replace(/^data:[a-z]+\/[a-z]+;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  res.set("Content-Type", image.content_type);
  res.set("Cache-Control", "public, max-age=31536000");
  res.send(buf);
});

router.post("/", async (req, res) => {
  const { filename, data, content_type } = req.body;
  if (!filename?.trim() || !data) {
    return res.status(400).json({ error: "Nome do arquivo e dados da imagem são obrigatórios." });
  }
  const { rows } = await pool.query(
    "INSERT INTO images (filename, data, content_type) VALUES ($1, $2, $3) RETURNING id, filename, data, content_type, created_at",
    [filename.trim(), data, content_type || "image/png"]
  );
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM images WHERE id = $1",
    [req.params.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: "Imagem não encontrada." });
  res.json({ ok: true });
});

export default router;
