/**
 * trade-finance — Nexha Trade Finance Service (port 4340).
 *
 * REST surface:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/info
 *   GET  /api/stats
 *   GET  /api/entities
 *   GET  /api/entities/:id
 *   POST /api/entities              { id?, name, country, trustScore, onTimeRatio, baselineLimit, sector? }
 *   POST /api/credit-offer          { entityId, amount, currency?, termDays? }
 *   GET  /api/credit-offers?entityId=
 *   GET  /api/credit-offers/:id
 *   POST /api/credit-offers/:id/accept
 *   GET  /api/loans?entityId=&status=
 *   GET  /api/loans/:id
 *   POST /api/loans/:id/repay       { amount }
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import tradeFinanceService from "./services/trade-finance.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4340;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
});

const asyncRoute =
  (handler: (req: express.Request, res: express.Response) => Promise<any>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

const seeded = tradeFinanceService.seedDemoEntities();
console.log(`[trade-finance] seeded ${seeded} entities`);

// ─── Health ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "trade-finance",
    version: "1.0.0",
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/ready", (_req, res) => res.json({ ready: true, stats: tradeFinanceService.networkStats() }));

app.get("/api/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "trade-finance",
      version: "1.0.0",
      description: "Nexha Trade Finance — credit offer engine for cross-border and B2B trade",
    }),
  );
});

app.get("/api/stats", (_req, res) => res.json(apiResponse(true, tradeFinanceService.networkStats())));

// ─── Entities ────────────────────────────────────────────────────────
app.get("/api/entities", (_req, res) => {
  res.json(apiResponse(true, { count: tradeFinanceService.listEntities().length, entities: tradeFinanceService.listEntities() }));
});

app.get(
  "/api/entities/:id",
  asyncRoute(async (req, res) => {
    const e = tradeFinanceService.getEntity(req.params.id);
    if (!e) {
      res.status(404).json(apiResponse(false, undefined, "Entity not found"));
      return;
    }
    res.json(apiResponse(true, e));
  }),
);

const EntitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  country: z.string().default("IN"),
  trustScore: z.coerce.number().min(0).max(100),
  onTimeRatio: z.coerce.number().min(0).max(1),
  baselineLimit: z.coerce.number().positive(),
  sector: z.enum(["manufacturing", "retail", "services", "agriculture", "logistics", "other"]).optional(),
});

app.post(
  "/api/entities",
  asyncRoute(async (req, res) => {
    const body = EntitySchema.parse(req.body);
    const e = tradeFinanceService.registerEntity(body);
    res.status(201).json(apiResponse(true, e));
  }),
);

// ─── Credit Offers ───────────────────────────────────────────────────
const OfferRequestSchema = z.object({
  entityId: z.string(),
  amount: z.coerce.number().positive(),
  currency: z.string().optional(),
  termDays: z.coerce.number().int().positive().optional(),
});

app.post(
  "/api/credit-offer",
  asyncRoute(async (req, res) => {
    const body = OfferRequestSchema.parse(req.body);
    const result = tradeFinanceService.evaluateOffer(body);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    const status = result.decision === "rejected" ? 200 : 201; // rejected offers still surface, just not approved
    res.status(status).json(apiResponse(true, result));
  }),
);

app.get(
  "/api/credit-offers",
  asyncRoute(async (req, res) => {
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const list = tradeFinanceService.listOffers({ entityId });
    res.json(apiResponse(true, { count: list.length, offers: list }));
  }),
);

app.get(
  "/api/credit-offers/:id",
  asyncRoute(async (req, res) => {
    const o = tradeFinanceService.getOffer(req.params.id);
    if (!o) {
      res.status(404).json(apiResponse(false, undefined, "Offer not found"));
      return;
    }
    res.json(apiResponse(true, o));
  }),
);

app.post(
  "/api/credit-offers/:id/accept",
  asyncRoute(async (req, res) => {
    const result = tradeFinanceService.acceptOffer(req.params.id);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.status(201).json(apiResponse(true, result));
  }),
);

// ─── Loans ───────────────────────────────────────────────────────────
app.get(
  "/api/loans",
  asyncRoute(async (req, res) => {
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    const list = tradeFinanceService.listLoans({ entityId, status });
    res.json(apiResponse(true, { count: list.length, loans: list }));
  }),
);

app.get(
  "/api/loans/:id",
  asyncRoute(async (req, res) => {
    const l = tradeFinanceService.getLoan(req.params.id);
    if (!l) {
      res.status(404).json(apiResponse(false, undefined, "Loan not found"));
      return;
    }
    res.json(apiResponse(true, l));
  }),
);

const RepaySchema = z.object({ amount: z.coerce.number().positive() });

app.post(
  "/api/loans/:id/repay",
  asyncRoute(async (req, res) => {
    const body = RepaySchema.parse(req.body);
    const r = tradeFinanceService.repay(req.params.id, body.amount);
    if ("error" in r) {
      res.status(400).json(apiResponse(false, undefined, r.error));
      return;
    }
    res.json(apiResponse(true, r));
  }),
);

// ─── 404 + boot ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`trade-finance running on port ${PORT}`);
  console.log(`  POST http://localhost:${PORT}/api/credit-offer  {entityId, amount}`);
  console.log(`  POST http://localhost:${PORT}/api/credit-offers/:id/accept`);
});

try {
  const { installGracefulShutdown } = await import("@rtmn/shared/lib/shutdown");
  installGracefulShutdown(server);
} catch {
  /* best-effort */
}

export default app;