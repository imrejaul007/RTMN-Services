/**
 * sutar-supplier-registry — Phase C.1
 * Supplier discovery, capability matching, and ranking.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import supplierService from "./services/supplier.service.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4280;
const START_TIME = Date.now();

// Optional JWT auth — set SUPPLIER_REGISTRY_REQUIRE_AUTH=false to disable in dev
const REQUIRE_AUTH = process.env.SUPPLIER_REGISTRY_REQUIRE_AUTH !== "false";

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

// Seed demo data on boot
const seeded = supplierService.seedDemoSuppliers();
console.log(`[supplier-registry] seeded ${seeded} demo suppliers`);

// Conditionally wire JWT auth
if (REQUIRE_AUTH) {
  try {
    // Dynamic import so tests/CI without @rtmn/shared still work
    const { requireAuth } = await import('@rtmn/shared/auth');
    app.use("/api/v1", requireAuth);
  } catch {
    console.warn('[supplier-registry] @rtmn/shared/auth not available — auth disabled');
  }
}

// ─────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "sutar-supplier-registry",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/ready", (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get("/api/v1/info", (_req, res) => {
  res.json(
    apiResponse(true, {
      name: "sutar-supplier-registry",
      version: "1.0.0",
      description: "Supplier discovery, capability matching, and ranking",
      phase: "C.1",
    }),
  );
});

// ─────────────────────────────────────────────────────────────
// Suppliers
// ─────────────────────────────────────────────────────────────
const CategoryEnum = z.enum([
  "groceries",
  "medicine",
  "electronics",
  "apparel",
  "restaurant_supply",
  "hotel_supply",
  "raw_materials",
  "manufactured_goods",
  "services",
  "logistics",
  "other",
]);

const SearchQuerySchema = z.object({
  category: CategoryEnum.optional(),
  item: z.string().optional(),
  location: z.string().optional(),
  maxDistanceKm: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minTrustScore: z.coerce.number().min(0).max(100).optional(),
  maxPricePerUnit: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(["rating", "trustScore", "price", "distance", "orders"]).optional(),
});

app.get(
  "/api/v1/suppliers",
  asyncRoute(async (req, res) => {
    const query = SearchQuerySchema.parse(req.query);
    const result = supplierService.searchSuppliers(query);
    res.json(apiResponse(true, result));
  }),
);

app.get(
  "/api/v1/suppliers/:id",
  asyncRoute(async (req, res) => {
    const s = supplierService.getSupplier(req.params.id);
    if (!s) {
      res.status(404).json(apiResponse(false, undefined, "Supplier not found"));
      return;
    }
    res.json(apiResponse(true, s));
  }),
);

// Bulk registration (admin) — for seeding real datasets later
const RegisterSupplierSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "pending", "suspended", "inactive"]).default("active"),
  tier: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]).default("silver"),
  corpId: z.string().optional(),
  categories: z.array(CategoryEnum).min(1),
  capabilities: z
    .array(
      z.object({
        category: CategoryEnum,
        items: z.array(z.string()),
        minOrderValue: z.number().optional(),
        deliveryRadiusKm: z.number().optional(),
      }),
    )
    .min(1),
  location: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string().default("IN"),
    lat: z.number().optional(),
    lng: z.number().optional(),
    pincode: z.string().optional(),
  }),
  rating: z.object({
    overall: z.number().min(0).max(5),
    totalReviews: z.number().int().nonnegative(),
    reliability: z.number().min(0).max(100),
    quality: z.number().min(0).max(100),
    deliverySpeed: z.number().min(0).max(100),
  }),
  pricing: z
    .object({
      currency: z.string().default("INR"),
      avgPricePerUnit: z.number().optional(),
      unit: z.string().optional(),
      bulkDiscountPct: z.number().optional(),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  trustScore: z.number().min(0).max(100).optional(),
  totalOrders: z.number().int().nonnegative().optional(),
});

app.post(
  "/api/v1/suppliers",
  asyncRoute(async (req, res) => {
    const body = RegisterSupplierSchema.parse(req.body);
    const s = supplierService.registerSupplier(body as any);
    res.status(201).json(apiResponse(true, s));
  }),
);

// ─────────────────────────────────────────────────────────────
// 404 + boot
// ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  console.log(`sutar-supplier-registry running on port ${PORT}`);
});

// Best-effort graceful shutdown hook (optional dep)
try {
  const { installGracefulShutdown } = await import('@rtmn/shared/lib/shutdown');
  installGracefulShutdown(server);
} catch {
  /* shutdown hook is best-effort */
}

export default app;
