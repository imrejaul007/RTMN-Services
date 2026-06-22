/**
 * nexha-gateway — Warehouse Network (Phase C.5)
 *
 * Single HTTP entry for the Nexha warehouse network. The RTMN Hub reaches us
 * at /api/nexha/nexha-gateway/<path>. Routes exposed:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/v1/info
 *   GET  /api/v1/warehouses              ?kind=&city=
 *   GET  /api/v1/warehouses/:id
 *   GET  /api/v1/routes
 *   POST /api/v1/slots/search            { item, category, city, maxPricePerUnit, minTrustScore, limit }
 *   POST /api/v1/slots/book              { warehouseId, slotId, units, reference? }
 *   POST /api/v1/slots/bookings/:id/fulfill
 *   POST /api/v1/slots/bookings/:id/cancel
 *   GET  /api/v1/slots/bookings          ?status=&warehouseId=
 *   GET  /api/v1/slots/bookings/:id
 *   POST /api/v1/cost                    { warehouseId, destinationWarehouseId?, units, slotId }
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import warehouseService from "./services/warehouse.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5002;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.NEXHA_GATEWAY_REQUIRE_AUTH !== "false";

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

// Seed demo warehouses on boot
const seeded = warehouseService.seedDemoWarehouses();
console.log(`[nexha-gateway] seeded ${seeded} warehouses`);

if (REQUIRE_AUTH) {
  try {
    const { requireAuth } = await import("@rtmn/shared/auth");
    app.use("/api/v1", requireAuth);
  } catch {
    console.warn("[nexha-gateway] @rtmn/shared/auth not available — auth disabled");
  }
}

// ─── Health ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "nexha-gateway",
    version: "1.0.0",
    phase: "C.5",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/ready", (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

app.get("/api/v1/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "nexha-gateway",
      version: "1.0.0",
      phase: "C.5",
      description: "Nexha warehouse network — discovery, slot booking, and routing",
      kinds: ["dry", "cold_chain", "hazmat", "bulk", "general", "pharma"],
      seededWarehouses: warehouseService.listWarehouses().length,
    }),
  );
});

// ─── Warehouses ─────────────────────────────────────────────────────────
app.get(
  "/api/v1/warehouses",
  asyncRoute(async (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const list = warehouseService.listWarehouses({ kind, city });
    res.json(apiResponse(true, { warehouses: list, count: list.length }));
  }),
);

app.get(
  "/api/v1/warehouses/:id",
  asyncRoute(async (req, res) => {
    const w = warehouseService.getWarehouse(req.params.id);
    if (!w) {
      res.status(404).json(apiResponse(false, undefined, "Warehouse not found"));
      return;
    }
    res.json(apiResponse(true, w));
  }),
);

app.get("/api/v1/routes", (_req, res) => {
  res.json(apiResponse(true, { routes: warehouseService.listRoutes() }));
});

// ─── Slot search ────────────────────────────────────────────────────────
const SlotSearchSchema = z.object({
  item: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  maxPricePerUnit: z.coerce.number().positive().optional(),
  minTrustScore: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

app.post(
  "/api/v1/slots/search",
  asyncRoute(async (req, res) => {
    const body = SlotSearchSchema.parse(req.body ?? {});
    const hits = warehouseService.searchSlots(body);
    res.json(
      apiResponse(true, {
        results: hits,
        count: hits.length,
        cheapest: hits[0] ?? null,
      }),
    );
  }),
);

// ─── Bookings ───────────────────────────────────────────────────────────
const BookSlotSchema = z.object({
  warehouseId: z.string(),
  slotId: z.string(),
  units: z.coerce.number().int().positive(),
  reference: z.string().optional(),
});

app.post(
  "/api/v1/slots/book",
  asyncRoute(async (req, res) => {
    const body = BookSlotSchema.parse(req.body);
    const result = warehouseService.bookSlot(body);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.status(201).json(apiResponse(true, result));
  }),
);

app.post(
  "/api/v1/slots/bookings/:id/fulfill",
  asyncRoute(async (req, res) => {
    const result = warehouseService.fulfillBooking(req.params.id);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, result));
  }),
);

app.post(
  "/api/v1/slots/bookings/:id/cancel",
  asyncRoute(async (req, res) => {
    const result = warehouseService.cancelBooking(req.params.id);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, result));
  }),
);

app.get(
  "/api/v1/slots/bookings",
  asyncRoute(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    const warehouseId = typeof req.query.warehouseId === "string" ? req.query.warehouseId : undefined;
    const list = warehouseService.listBookings({ status, warehouseId });
    res.json(apiResponse(true, { bookings: list, count: list.length }));
  }),
);

app.get(
  "/api/v1/slots/bookings/:id",
  asyncRoute(async (req, res) => {
    const b = warehouseService.getBooking(req.params.id);
    if (!b) {
      res.status(404).json(apiResponse(false, undefined, "Booking not found"));
      return;
    }
    res.json(apiResponse(true, b));
  }),
);

// ─── Cost computation ───────────────────────────────────────────────────
const CostSchema = z.object({
  warehouseId: z.string(),
  destinationWarehouseId: z.string().optional(),
  units: z.coerce.number().int().positive(),
  slotId: z.string(),
});

app.post(
  "/api/v1/cost",
  asyncRoute(async (req, res) => {
    const body = CostSchema.parse(req.body);
    const result = warehouseService.computeCostForRoute(body);
    if ("error" in result) {
      res.status(400).json(apiResponse(false, undefined, result.error));
      return;
    }
    res.json(apiResponse(true, result));
  }),
);

// ─── 404 + boot ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`nexha-gateway running on port ${PORT}`);
});

try {
  const { installGracefulShutdown } = await import("@rtmn/shared/lib/shutdown");
  installGracefulShutdown(server);
} catch {
  /* shutdown hook is best-effort */
}

export default app;