/**
 * nexha-distribution-network — Phase C.2
 * Shipping quotes, booking, and tracking.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import logisticsService from "./services/logistics.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4285;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.LOGISTICS_REQUIRE_AUTH !== "false";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
});

const asyncRoute = (handler: (req: express.Request, res: express.Response) => Promise<any>) =>
  async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

if (REQUIRE_AUTH) {
  try {
    const { requireAuth } = await import('@rtmn/shared/auth');
    app.use("/api/v1", requireAuth);
  } catch {
    console.warn('[nexha-distribution-network] @rtmn/shared/auth not available — auth disabled');
  }
}

// Health
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "nexha-distribution-network",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});
app.get("/ready", (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

app.get("/api/v1/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "nexha-distribution-network",
      version: "1.0.0",
      description: "Shipping quotes, booking, and tracking",
      phase: "C.2",
      carriers: ["QuickShip Express", "BharatPost Standard", "Delhivery 3PL", "CrowdDash"],
    }),
  );
});

const AddressSchema = z.object({
  name: z.string().optional(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string().default("IN"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().optional(),
});

const PackageSchema = z.object({
  weightKg: z.number().positive(),
  lengthCm: z.number().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  specialHandling: z.array(z.enum(["cold_chain", "fragile", "hazmat", "oversized"])).optional(),
});

const QuoteRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  package: PackageSchema,
  serviceLevel: z.enum(["economy", "standard", "express", "same_day", "scheduled"]).optional(),
  preferredCurrency: z.string().optional(),
  maxCost: z.number().positive().optional(),
  maxTransitHours: z.number().positive().optional(),
});

app.post(
  "/api/v1/quote",
  asyncRoute(async (req, res) => {
    const body = QuoteRequestSchema.parse(req.body);
    const quotes = logisticsService.getQuotes(body);
    res.json(
      apiResponse(true, {
        quotes,
        count: quotes.length,
        cheapest: quotes[0] ?? null,
        fastest: quotes.reduce((acc, q) => (q.transitHours < acc.transitHours ? q : acc), quotes[0] ?? null),
      }),
    );
  }),
);

app.post(
  "/api/v1/shipments",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        quoteId: z.string(),
        carrier: z.string(),
        request: QuoteRequestSchema,
      })
      .parse(req.body);
    const shipment = logisticsService.bookShipment(body.quoteId, body.carrier, body.request);
    if (!shipment) {
      res.status(400).json(apiResponse(false, undefined, "Quote not found or carrier mismatch"));
      return;
    }
    res.status(201).json(apiResponse(true, shipment));
  }),
);

app.get(
  "/api/v1/shipments",
  asyncRoute(async (req, res) => {
    const status = req.query.status as any;
    const list = logisticsService.listShipments({ status });
    res.json(apiResponse(true, { shipments: list, count: list.length }));
  }),
);

app.get(
  "/api/v1/shipments/:id",
  asyncRoute(async (req, res) => {
    const s = logisticsService.getShipment(req.params.id);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Shipment not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

app.post(
  "/api/v1/shipments/:id/advance",
  asyncRoute(async (req, res) => {
    const s = logisticsService.simulateNextEvent(req.params.id);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Shipment not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

app.post(
  "/api/v1/shipments/:id/cancel",
  asyncRoute(async (req, res) => {
    const reason = (req.body?.reason as string) ?? "no reason given";
    const s = logisticsService.cancelShipment(req.params.id, reason);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Shipment not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`nexha-distribution-network running on port ${PORT}`);
});

try {
  const { installGracefulShutdown } = await import('@rtmn/shared/lib/shutdown');
  installGracefulShutdown(server);
} catch {
  /* shutdown hook is best-effort */
}

export default app;
