import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import authRoutes, { ensureAdmin } from "./routes/auth.js";
import clientsRoutes from "./routes/clients.js";
import servicesRoutes from "./routes/services.js";
import historyRoutes from "./routes/history.js";
import settingsRoutes from "./routes/settings.js";
import imagesRoutes from "./routes/images.js";
import serviceOrdersRoutes from "./routes/service-orders.js";
import vehiclesRoutes from "./routes/vehicles.js";
import mapasRoutes from "./routes/mapas.js";
import agendaRoutes from "./routes/agenda.js";
import driversRoutes from "./routes/drivers.js";
import orcamentosRoutes from "./routes/orcamentos.js";
import adminRoutes from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/settings/theme", async (req, res) => {
  try {
    const { default: pool } = await import("./db.js");
    const { rows } = await pool.query("SELECT tema FROM settings LIMIT 1");
    res.json({ tema: rows[0]?.tema || "white" });
  } catch { res.json({ tema: "white" }); }
});

app.get("/api/settings/public", async (req, res) => {
  try {
    const { default: pool } = await import("./db.js");
    const { rows } = await pool.query("SELECT empresa FROM settings LIMIT 1");
    const empresa = JSON.parse(rows[0]?.empresa || "{}");
    res.json({ nome: empresa.nome || "Sua Empresa" });
  } catch { res.json({ nome: "Sua Empresa" }); }
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/service-orders", serviceOrdersRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/mapas", mapasRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/orcamentos", orcamentosRoutes);
app.use("/api/admin", adminRoutes);

const distPath = path.join(__dirname, "..", "dist");
const indexHtml = path.join(distPath, "index.html");

app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }
  res.sendFile(indexHtml);
});

let server;

function shutdown(signal) {
  console.log(`\n${signal} recebido. Encerrando servidor...`);
  if (server) {
    server.close(() => {
      console.log("Servidor encerrado.");
      process.exit(0);
    });
  }
  setTimeout(() => process.exit(1), 5000);
}

initDB().then(async () => {
  await ensureAdmin();
  console.log("Banco de dados conectado e pronto.");
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Erro ao inicializar banco de dados:", err);
  process.exit(1);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
