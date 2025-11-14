import path from "path";
import * as express from "express";
import express__default, { Router } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
dotenv.config();
const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI not configured");
let client = null;
let db = null;
async function connectDB() {
  if (!db) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(process.env.DB_NAME || "manolos_gestion");
    console.log("Connected to MongoDB", db.databaseName);
  }
  return db;
}
function getDb() {
  if (!db) throw new Error("Database not connected. Call connectDB first.");
  return db;
}
const router$7 = Router();
const registerSchema = z.object({ nombre: z.string(), correo: z.string().email(), password: z.string().min(4) });
const loginSchema = z.object({ correo: z.string().email(), password: z.string() });
router$7.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const db2 = getDb();
    const exists = await db2.collection("usuarios").findOne({ correo: parsed.correo });
    if (exists) return res.status(400).json({ message: "Correo ya registrado" });
    const hash = await bcrypt.hash(parsed.password, 10);
    const result = await db2.collection("usuarios").insertOne({ nombre: parsed.nombre, correo: parsed.correo, passwordHash: hash, rol: "admin", creadoEn: /* @__PURE__ */ new Date() });
    res.json({ id: result.insertedId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router$7.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const db2 = getDb();
    const user = await db2.collection("usuarios").findOne({ correo: parsed.correo });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });
    const ok = await bcrypt.compare(parsed.password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });
    const token = jwt.sign({ sub: String(user._id), correo: user.correo, nombre: user.nombre, rol: user.rol }, process.env.JWT_SECRET || "dev", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.json({ token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
function requireAuth(req, res, next) {
  req.user = {
    sub: "6902a1d4ade8c9d8fc967adc",
    nombre: "Prueba",
    correo: "admin@gmail.com",
    rol: "admin"
  };
  next();
}
const router$6 = Router();
const clienteSchema = z.object({ nombre: z.string(), direccion: z.string().optional(), correo: z.string().email(), telefono: z.string() });
router$6.use(requireAuth);
router$6.get("/", async (req, res) => {
  const db2 = getDb();
  const items = await db2.collection("clientes").find().toArray();
  res.json(items);
});
router$6.post("/", async (req, res) => {
  try {
    const parsed = clienteSchema.parse(req.body);
    const db2 = getDb();
    const result = await db2.collection("clientes").insertOne({ ...parsed, creadoEn: /* @__PURE__ */ new Date() });
    res.json({ id: result.insertedId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router$6.put("/:id", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  await db2.collection("clientes").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
  res.json({ ok: true });
});
router$6.delete("/:id", async (req, res) => {
  try {
    const db2 = getDb();
    const result = await db2.collection("clientes").deleteOne({
      _id: new ObjectId(req.params.id)
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    console.error("Error eliminando cliente:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
const router$5 = Router();
const mascotaSchema = z.object({ clienteId: z.string(), nombre: z.string(), especie: z.string(), raza: z.string().optional(), edad: z.number().optional(), peso: z.number().optional() });
router$5.use(requireAuth);
router$5.get("/", async (req, res) => {
  const db2 = getDb();
  const items = await db2.collection("mascotas").find().toArray();
  res.json(items);
});
router$5.post("/", async (req, res) => {
  try {
    const parsed = mascotaSchema.parse(req.body);
    const db2 = getDb();
    const cliente = await db2.collection("clientes").findOne({ _id: new ObjectId(parsed.clienteId) });
    if (!cliente) return res.status(400).json({ error: "Cliente no existe" });
    const count = await db2.collection("mascotas").countDocuments({ clienteId: parsed.clienteId });
    if (count >= 7) return res.status(400).json({ error: "El cliente ya tiene el máximo de 7 mascotas" });
    const result = await db2.collection("mascotas").insertOne({ ...parsed, creadoEn: /* @__PURE__ */ new Date() });
    res.json({ id: result.insertedId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router$5.put("/:id", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  await db2.collection("mascotas").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
  res.json({ ok: true });
});
router$5.delete("/:id", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  await db2.collection("mascotas").deleteOne({ _id: new ObjectId(id) });
  res.json({ ok: true });
});
const router$4 = Router();
const servicioSchema = z.object({ nombre: z.string(), descripcion: z.string().optional(), tarifa: z.number(), duracion: z.string().optional(), activo: z.boolean().optional() });
router$4.use(requireAuth);
router$4.get("/", async (req, res) => {
  const db2 = getDb();
  const items = await db2.collection("servicios").find().toArray();
  res.json(items);
});
router$4.post("/", async (req, res) => {
  try {
    const parsed = servicioSchema.parse(req.body);
    const db2 = getDb();
    const result = await db2.collection("servicios").insertOne({ ...parsed, creadoEn: /* @__PURE__ */ new Date() });
    res.json({ id: result.insertedId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router$4.put("/:id", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  await db2.collection("servicios").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
  res.json({ ok: true });
});
router$4.delete("/:id", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  await db2.collection("servicios").deleteOne({ _id: new ObjectId(id) });
  res.json({ ok: true });
});
function invoicePdfBuffer({ cliente, servicio, fecha, total }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => {
  });
  doc.fontSize(20).text("Comprobante - Manolo's Gestión", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Cliente: ${cliente}`);
  doc.text(`Servicio: ${servicio}`);
  doc.text(`Fecha: ${fecha}`);
  doc.moveDown();
  doc.fontSize(14).text(`Total: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(total)}`);
  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
const router$3 = Router();
const cobroSchema = z.object({ clienteId: z.string(), servicioId: z.string(), fecha: z.string().optional(), cantidad: z.number().optional().default(1), montoUnitario: z.number(), estado: z.enum(["pendiente", "pagado", "vencido"]).optional().default("pendiente") });
router$3.use(requireAuth);
router$3.get("/", async (req, res) => {
  const db2 = getDb();
  const items = await db2.collection("cobros").find().toArray();
  res.json(items);
});
router$3.post("/", async (req, res) => {
  try {
    const parsed = cobroSchema.parse(req.body);
    const db2 = getDb();
    const result = await db2.collection("cobros").insertOne({ ...parsed, fecha: parsed.fecha || (/* @__PURE__ */ new Date()).toISOString(), creadoEn: /* @__PURE__ */ new Date() });
    res.json({ id: result.insertedId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router$3.put("/:id/estado", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  const estado = req.body.estado;
  await db2.collection("cobros").updateOne({ _id: new ObjectId(id) }, { $set: { estado } });
  res.json({ ok: true });
});
router$3.get("/:id/comprobante", async (req, res) => {
  const db2 = getDb();
  const id = req.params.id;
  const c = await db2.collection("cobros").findOne({ _id: new ObjectId(id) });
  if (!c) return res.status(404).json({ error: "No encontrado" });
  const cliente = await db2.collection("clientes").findOne({ _id: new ObjectId(c.clienteId) });
  const servicio = await db2.collection("servicios").findOne({ _id: new ObjectId(c.servicioId) });
  const total = c.montoUnitario * (c.cantidad || 1);
  const buffer = await invoicePdfBuffer({ cliente: cliente?.nombre || "-", servicio: servicio?.nombre || "-", fecha: c.fecha, total });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=comprobante_${id}.pdf`);
  res.send(buffer);
});
router$3.delete("/:id", async (req, res) => {
  try {
    const db2 = getDb();
    const id = req.params.id;
    const result = await db2.collection("cobros").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Cobro no encontrado" });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("SMTP connection failed:", error);
    throw error;
  }
}
async function sendMail(to, subject, text, html) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html: text
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
const router$2 = Router();
const recSchema = z.object({
  clienteId: z.string(),
  medio: z.enum(["WhatsApp", "Email"]),
  fecha: z.string().optional(),
  asunto: z.string().optional(),
  mensaje: z.string().optional()
});
router$2.use(requireAuth);
router$2.get("/", async (req, res) => {
  const db2 = getDb();
  const items = await db2.collection("recordatorios").find().toArray();
  res.json(items);
});
router$2.post("/", async (req, res) => {
  try {
    console.log("POST /api/recordatorios body:", req.body);
    const parsed = recSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Payload inválido", details: parsed.error.errors });
    }
    const db2 = getDb();
    const { clienteId, medio, fecha, asunto, mensaje } = parsed.data;
    const cliente = await db2.collection("clientes").findOne({ _id: new ObjectId(clienteId) });
    if (!cliente) {
      return res.status(400).json({ message: "Cliente no encontrado" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = {
      clienteId,
      medio,
      fecha: fecha || now,
      estado: "pendiente",
      asunto: asunto || "Recordatorio de Manolo's Gestión",
      mensaje: mensaje || "Hola, este es un recordatorio"
    };
    const result = await db2.collection("recordatorios").insertOne({ ...doc, creadoEn: /* @__PURE__ */ new Date() });
    if (medio === "Email") {
      try {
        await sendMail(
          cliente.correo || "",
          doc.asunto,
          doc.mensaje
        );
        await db2.collection("recordatorios").updateOne({ _id: result.insertedId }, { $set: { estado: "enviado" } });
      } catch (e) {
        await db2.collection("recordatorios").updateOne({ _id: result.insertedId }, { $set: { estado: "fallo" } });
      }
    }
    res.status(201).json({ id: result.insertedId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Error interno" });
  }
});
const router$1 = Router();
router$1.use(requireAuth);
router$1.get("/csv", async (req, res) => {
  const db2 = getDb();
  const { from, to } = req.query;
  const filter = {};
  if (from) filter.fecha = { $gte: new Date(String(from)) };
  if (to) filter.fecha = { ...filter.fecha || {}, $lte: new Date(String(to)) };
  const rows = await db2.collection("cobros").find(filter).toArray();
  const header = "Cliente,Servicio,Fecha,Monto";
  const lines = [header];
  for (const r of rows) {
    const cliente = await db2.collection("clientes").findOne({ _id: new ObjectId(r.clienteId) });
    const servicio = await db2.collection("servicios").findOne({ _id: new ObjectId(r.servicioId) });
    lines.push(`${cliente?.nombre || "-"},${servicio?.nombre || "-"},${r.fecha},${r.montoUnitario * (r.cantidad || 1)}`);
  }
  res.setHeader("Content-Type", "text/csv");
  res.send(lines.join("\n"));
});
const router = Router();
router.get("/verify-smtp", async (req, res) => {
  try {
    await verifyConnection();
    res.json({ ok: true, message: "SMTP connection verified" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
router.get("/test-email", async (req, res) => {
  const { to } = req.query;
  if (!to) {
    return res.status(400).json({ ok: false, error: "Email recipient required" });
  }
  try {
    const info = await sendMail(
      to,
      "Test Email",
      "This is a test email from your application"
    );
    res.json({ ok: true, messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
dotenv.config();
function setupApp() {
  const app2 = express__default();
  app2.use(cors());
  app2.use(express__default.json());
  app2.use("/api/auth", router$7);
  app2.use("/api/clientes", router$6);
  app2.use("/api/mascotas", router$5);
  app2.use("/api/servicios", router$4);
  app2.use("/api/cobros", router$3);
  app2.use("/api/recordatorios", router$2);
  app2.use("/api/reports", router$1);
  app2.use("/api", router);
  app2.get("/api/ping", (req, res) => res.json({ message: "pong" }));
  app2.get("/api/seed", async (req, res) => {
    try {
      const db2 = await connectDB();
      const clientes = [
        { nombre: "Laura Rojas", correo: "laura@correo.com", telefono: "3115551234", creadoEn: /* @__PURE__ */ new Date() },
        { nombre: "Carlos Pérez", correo: "carlos@correo.com", telefono: "3102229876", creadoEn: /* @__PURE__ */ new Date() }
      ];
      const res1 = await db2.collection("clientes").insertMany(clientes);
      const mascotas = [
        { clienteId: res1.insertedIds["0"], nombre: "Luna", especie: "Perro", raza: "Labrador", creadoEn: /* @__PURE__ */ new Date() },
        { clienteId: res1.insertedIds["1"], nombre: "Michi", especie: "Gato", raza: "Siames", creadoEn: /* @__PURE__ */ new Date() }
      ];
      await db2.collection("mascotas").insertMany(mascotas);
      const servicios = [
        { nombre: "Paseo diario", tarifa: 15e3, duracion: "1 hora", activo: true, creadoEn: /* @__PURE__ */ new Date() },
        { nombre: "Baño y corte", tarifa: 25e3, duracion: "45 min", activo: true, creadoEn: /* @__PURE__ */ new Date() }
      ];
      const res3 = await db2.collection("servicios").insertMany(servicios);
      const cobros = [
        { clienteId: res1.insertedIds["0"], servicioId: res3.insertedIds["0"], fecha: (/* @__PURE__ */ new Date()).toISOString(), cantidad: 1, montoUnitario: 15e3, estado: "pendiente", creadoEn: /* @__PURE__ */ new Date() },
        { clienteId: res1.insertedIds["1"], servicioId: res3.insertedIds["1"], fecha: (/* @__PURE__ */ new Date()).toISOString(), cantidad: 1, montoUnitario: 25e3, estado: "pagado", creadoEn: /* @__PURE__ */ new Date() }
      ];
      await db2.collection("cobros").insertMany(cobros);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  return app2;
}
function createServer() {
  return setupApp();
}
async function start() {
  await connectDB();
  const port2 = Number(process.env.PORT || 4e3);
  const app2 = setupApp();
  app2.listen(port2, () => console.log("Server listening on port", port2));
}
if (process.env.RUN_SERVER !== "false") {
  start();
}
setupApp();
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
