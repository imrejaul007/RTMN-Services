import express from "express";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4180;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "sutar-trust-engine", version: "1.0.0", timestamp: new Date().toISOString(), uptime: Math.floor((Date.now() - START_TIME) / 1000) });
});

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({ success, data, error, timestamp: new Date().toISOString() });

app.get("/api/v1/info", (_req, res) => {
  res.json(apiResponse(true, { name: "sutar-trust-engine", description: "Trust Engine", version: "1.0.0", features: ['Credit check', 'Trust validation'] }));
});

app.post("/api/v1/intent", async (req, res) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: "received" }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

app.post("/api/v1/event", async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: "processed" }));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e)));
  }
});

app.use((_req, res) => { res.status(404).json(apiResponse(false, undefined, "Not found")); });

app.listen(PORT, () => {
  console.log(`SUTAR-TRUST-ENGINE running on port 4180`);
});

export default app;
