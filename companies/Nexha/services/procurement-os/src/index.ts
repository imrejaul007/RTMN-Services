/**
 * procurement-os — Nexha Procurement Operating System (port 4320).
 *
 * REST surface:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/info
 *   GET  /api/stats
 *   GET  /api/suppliers?category=&country=&item=&destinationCity=&maxUnitPrice=&maxLeadTimeDays=&creditOk=&limit=
 *   GET  /api/suppliers/:id
 *   POST /api/rfqs                     { buyerId, category, item, quantity, unit, maxUnitPrice, currency, destinationCity, maxLeadTimeDays, creditOk }
 *   GET  /api/rfqs?status=&buyerId=
 *   GET  /api/rfqs/:id
 *   POST /api/rfqs/:id/shortlist       { topN? }
 *   POST /api/rfqs/:id/award           { responseId }
 *   GET  /api/rfqs/:id/responses
 *   GET  /api/rfqs/:id/invitees        { topN? }
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import procurementService from "./services/procurement.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4320;
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

// Seed demo data on boot
const seeded = procurementService.seedDemoSuppliers();
console.log(`[procurement-os] seeded ${seeded} suppliers`);

// ─── Health ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "procurement-os",
    version: "1.0.0",
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/ready", (_req, res) => res.json({ ready: true, stats: procurementService.networkStats() }));

app.get("/api/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "procurement-os",
      version: "1.0.0",
      description: "Nexha Procurement OS — supplier discovery, RFQ routing, and contract award",
    }),
  );
});

app.get("/api/stats", (_req, res) => {
  res.json(apiResponse(true, procurementService.networkStats()));
});

// ─── Suppliers ───────────────────────────────────────────────────────
const RankQuerySchema = z.object({
  category: z.string().optional(),
  item: z.string().optional(),
  destinationCity: z.string().optional(),
  maxUnitPrice: z.coerce.number().positive().optional(),
  maxLeadTimeDays: z.coerce.number().int().positive().optional(),
  creditOk: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

app.get(
  "/api/suppliers",
  asyncRoute(async (req, res) => {
    const query = RankQuerySchema.parse(req.query);
    const ranked = procurementService.rankSuppliers(query);
    res.json(
      apiResponse(true, {
        count: ranked.length,
        suppliers: ranked.map((r) => ({
          id: r.supplier.id,
          name: r.supplier.name,
          country: r.supplier.country,
          categories: r.supplier.categories,
          rating: r.supplier.rating,
          reliability: r.supplier.reliability,
          trustScore: r.supplier.trustScore,
          totalOrders: r.supplier.totalOrders,
          leadTimeDays: r.supplier.leadTimeDays,
          acceptsCredit: r.supplier.acceptsCredit,
          baselineUnitPrice: r.supplier.baselineUnitPrice,
          score: r.score,
          eligible: r.eligible,
          reasons: r.reasons,
        })),
      }),
    );
  }),
);

app.get(
  "/api/suppliers/:id",
  asyncRoute(async (req, res) => {
    const s = procurementService.getSupplier(req.params.id);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Supplier not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

// ─── RFQs ────────────────────────────────────────────────────────────
const CreateRfqSchema = z.object({
  buyerId: z.string(),
  category: z.string(),
  item: z.string(),
  quantity: z.coerce.number().int().positive(),
  unit: z.string(),
  maxUnitPrice: z.coerce.number().positive(),
  currency: z.string().default("INR"),
  destinationCity: z.string(),
  maxLeadTimeDays: z.coerce.number().int().positive(),
  creditOk: z.boolean().default(true),
});

app.post(
  "/api/rfqs",
  asyncRoute(async (req, res) => {
    const body = CreateRfqSchema.parse(req.body);
    const rfq = procurementService.createRfq(body);
    res.status(201).json(apiResponse(true, rfq));
  }),
);

app.get(
  "/api/rfqs",
  asyncRoute(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    const buyerId = typeof req.query.buyerId === "string" ? req.query.buyerId : undefined;
    const list = procurementService.listRfqs({ status, buyerId });
    res.json(apiResponse(true, { count: list.length, rfqs: list }));
  }),
);

app.get(
  "/api/rfqs/:id",
  asyncRoute(async (req, res) => {
    const r = procurementService.getRfq(req.params.id);
    if (!r) {
      res.status(404).json(apiResponse(false, undefined, "RFQ not found"));
      return;
    }
    res.json(apiResponse(true, r));
  }),
);

app.post(
  "/api/rfqs/:id/shortlist",
  asyncRoute(async (req, res) => {
    const topN = Number(req.body?.topN ?? 3);
    const result = procurementService.shortlistResponses(req.params.id, topN);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, result));
  }),
);

app.post(
  "/api/rfqs/:id/award",
  asyncRoute(async (req, res) => {
    const responseId = String(req.body?.responseId ?? "");
    if (!responseId) {
      res.status(400).json(apiResponse(false, undefined, "responseId is required"));
      return;
    }
    const result = procurementService.award(req.params.id, responseId);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, result));
  }),
);

app.get(
  "/api/rfqs/:id/responses",
  asyncRoute(async (req, res) => {
    const rfq = procurementService.getRfq(req.params.id);
    if (!rfq) {
      res.status(404).json(apiResponse(false, undefined, "RFQ not found"));
      return;
    }
    const responses = procurementService.listResponses(req.params.id);
    res.json(apiResponse(true, { count: responses.length, responses }));
  }),
);

app.get(
  "/api/rfqs/:id/invitees",
  asyncRoute(async (req, res) => {
    const topN = Number(req.query.topN ?? 5);
    const result = procurementService.suggestInvitees(req.params.id, topN);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, { count: result.length, suppliers: result }));
  }),
);

// ─── 404 + boot ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`procurement-os running on port ${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/suppliers?category=groceries`);
  console.log(`  POST http://localhost:${PORT}/api/rfqs`);
});

try {
  const { installGracefulShutdown } = await import("@rtmn/shared/lib/shutdown");
  installGracefulShutdown(server);
} catch {
  /* shutdown hook is best-effort */
}

export default app;