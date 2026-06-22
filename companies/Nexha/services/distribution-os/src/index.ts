/**
 * distribution-os — Nexha Distribution Operating System (port 4300).
 *
 * REST surface:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/info
 *   GET  /api/stats
 *   GET  /api/lanes?from=&to=
 *   POST /api/quote              { origin, destination, weightKg, specialHandling?, preferredLevel?, limit? }
 *   POST /api/shipments          { quoteId, origin, destination, weightKg, specialHandling? }
 *   GET  /api/shipments?status=&carrier=
 *   GET  /api/shipments/:id
 *   POST /api/shipments/:id/advance
 *   POST /api/shipments/:id/cancel  { reason }
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import distributionService from "./services/distribution.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4300;
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

const seeded = distributionService.seedDemoLanes();
console.log(`[distribution-os] seeded ${seeded} lanes`);

// ─── Health ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "distribution-os",
    version: "1.0.0",
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/ready", (_req, res) => res.json({ ready: true, stats: distributionService.networkStats() }));

app.get("/api/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "distribution-os",
      version: "1.0.0",
      description: "Nexha Distribution OS — multi-lane shipping quotes, booking, tracking",
    }),
  );
});

app.get("/api/stats", (_req, res) => res.json(apiResponse(true, distributionService.networkStats())));

// ─── Lanes / Quotes ──────────────────────────────────────────────────
app.get(
  "/api/lanes",
  asyncRoute(async (req, res) => {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const lanes = from && to ? distributionService.lanesForRoute(from, to) : distributionService.listLanes();
    res.json(apiResponse(true, { count: lanes.length, lanes }));
  }),
);

const QuoteSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  weightKg: z.coerce.number().positive(),
  specialHandling: z.array(z.enum(["cold_chain", "fragile", "hazmat", "oversized"])).optional(),
  preferredLevel: z.enum(["economy", "standard", "express", "same_day"]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

app.post(
  "/api/quote",
  asyncRoute(async (req, res) => {
    const body = QuoteSchema.parse(req.body);
    if (body.origin.toLowerCase() === body.destination.toLowerCase()) {
      res.status(400).json(apiResponse(false, undefined, "origin and destination cannot match"));
      return;
    }
    const quotes = distributionService.quote(body);
    if (quotes.length === 0) {
      res.status(404).json(apiResponse(false, undefined, `no lanes between ${body.origin} and ${body.destination}`));
      return;
    }
    res.json(
      apiResponse(true, {
        count: quotes.length,
        quotes,
        cheapest: quotes[0],
        fastest: quotes.reduce((acc, q) => (q.transitHours < acc.transitHours ? q : acc), quotes[0]),
      }),
    );
  }),
);

// ─── Shipments ───────────────────────────────────────────────────────
const BookSchema = z.object({
  quoteId: z.string(),
  origin: z.string(),
  destination: z.string(),
  weightKg: z.coerce.number().positive(),
  specialHandling: z.array(z.enum(["cold_chain", "fragile", "hazmat", "oversized"])).optional(),
});

app.post(
  "/api/shipments",
  asyncRoute(async (req, res) => {
    const body = BookSchema.parse(req.body);
    const result = distributionService.book(body);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.status(201).json(apiResponse(true, result));
  }),
);

app.get(
  "/api/shipments",
  asyncRoute(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    const carrier = typeof req.query.carrier === "string" ? req.query.carrier : undefined;
    const list = distributionService.list({ status, carrier });
    res.json(apiResponse(true, { count: list.length, shipments: list }));
  }),
);

app.get(
  "/api/shipments/:id",
  asyncRoute(async (req, res) => {
    const s = distributionService.get(req.params.id);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Shipment not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

app.post(
  "/api/shipments/:id/advance",
  asyncRoute(async (req, res) => {
    const s = distributionService.advance(req.params.id);
    if ("error" in s) {
      res.status(400).json(apiResponse(false, undefined, s.error));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

app.post(
  "/api/shipments/:id/cancel",
  asyncRoute(async (req, res) => {
    const reason = String(req.body?.reason ?? "no reason given");
    const s = distributionService.cancel(req.params.id, reason);
    if ("error" in s) {
      res.status(400).json(apiResponse(false, undefined, s.error));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

// ─── 404 + boot ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`distribution-os running on port ${PORT}`);
  console.log(`  POST http://localhost:${PORT}/api/quote  {origin, destination, weightKg}`);
  console.log(`  POST http://localhost:${PORT}/api/shipments`);
});

try {
  const { installGracefulShutdown } = await import("@rtmn/shared/lib/shutdown");
  installGracefulShutdown(server);
} catch {
  /* best-effort */
}

export default app;