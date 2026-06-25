/**
 * nexha-autonomous-logistics — HTTP API
 *
 * Port: 4293
 * Endpoints (per spec §C):
 *   POST /api/v1/shipments/plan      - Generate shipment plan
 *   POST /api/v1/shipments/book      - Book a planned shipment
 *   GET  /api/v1/shipments/:id/track - Track shipment
 *   POST /api/v1/shipments/:id/reroute - Reroute
 *   POST /api/v1/shipments/:id/cancel  - Cancel
 *   GET  /api/v1/carriers              - List 12 built-in carriers
 *   POST /api/v1/customs/check         - Check customs requirements
 *   POST /api/v1/insurance/bind        - Bind cargo insurance
 *   GET  /api/v1/routes                - Multi-modal routing options
 *   POST /api/v1/carbon/calculate      - Calculate carbon footprint
 *   GET  /health, /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

import {
  planShipment,
  bookShipment,
  trackShipment,
  reroute,
  cancelShipmentFn
} from './orchestrator/orchestrator.js';
import { generateCandidateRoutes, scoreRoutes } from './routing/engine.js';
import { checkRequirements } from './customs/agent.js';
import { bindInsurance } from './insurance/binder.js';
import { calculateCarbon } from './carbon/calculator.js';
import { CARRIERS } from './carriers/registry.js';
import { getShipment } from './tracking/registry.js';
import {
  createDhlHandler,
  createFedexHandler,
  createMaerskHandler,
  createUniversalHandler,
  getRecentEvents,
  getShipmentByTrackingNumber
} from './tracking/webhooks.js';
import { generateShippingDocument, renderDocumentHTML } from './documents/generator.js';
import type { ShipmentRequest } from './types.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4293;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.LOGISTICS_REQUIRE_AUTH !== 'false';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

/**
 * Bearer auth (service-to-service). Public endpoints (health, carriers) skip auth.
 */
function requireAuth(req: any, res: any, next: any) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json(apiResponse(false, undefined, 'Authentication required'));
  }
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) {
    return res.status(401).json(apiResponse(false, undefined, 'Invalid API key'));
  }
  next();
}

// ─── Validation schemas ────────────────────────────────────────────────

const AddressSchema = z.object({
  country: z.string().length(2),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  line1: z.string().optional()
});

const CargoSchema = z.object({
  type: z.enum(['general', 'perishable', 'hazardous', 'fragile', 'liquid', 'electronics', 'textile', 'documents', 'vehicle', 'bulk']),
  weightKg: z.number().positive(),
  dimensionsCm: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
  }).optional(),
  hsCode: z.string().optional(),
  declaredValue: z.number().nonnegative(),
  currency: z.string().length(3),
  pieces: z.number().int().positive().optional(),
  stackable: z.boolean().optional()
});

const ShipmentRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  cargo: CargoSchema,
  deadline: z.string().optional(),
  optimizeFor: z.enum(['cost', 'speed', 'carbon', 'reliability']).optional(),
  weights: z.object({
    cost: z.number().optional(),
    speed: z.number().optional(),
    carbon: z.number().optional(),
    reliability: z.number().optional()
  }).optional(),
  insurance: z.object({
    coverage: z.enum(['basic', 'standard', 'all-risk']),
    cargoValue: z.number().optional()
  }).optional(),
  preferredCarriers: z.array(z.string()).optional()
});

// ─── Public endpoints ────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexha-autonomous-logistics',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    carriers: CARRIERS.length
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    service: 'nexha-autonomous-logistics',
    carriers: CARRIERS.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/info', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'nexha-autonomous-logistics',
      version: '1.0.0',
      description: 'Fills the KHAIRMOVE gap. Multi-carrier shipping + customs + tracking.',
      carriers: CARRIERS.map((c) => ({
        id: c.id,
        name: c.name,
        modes: c.modes,
        regions: c.regions.length === 0 ? ['GLOBAL'] : c.regions,
        reliability: c.reliability
      })),
      capabilities: [
        'Multi-carrier shipping (12 built-in carriers)',
        'Multi-modal routing (air, sea, road, rail, courier)',
        'Customs clearance (HS codes, duties, sanctions)',
        'Cargo insurance (basic, standard, all-risk)',
        'Unified tracking across carriers',
        'Carbon footprint + offset estimates',
        'Auto-reroute on delay',
        'Route scoring by cost/speed/carbon/reliability'
      ]
    }
  });
});

// ─── Carrier listing (public) ─────────────────────────────────────────

app.get('/api/v1/carriers', (_req, res) => {
  res.json(apiResponse(true, {
    total: CARRIERS.length,
    carriers: CARRIERS.map((c) => ({
      id: c.id,
      name: c.name,
      modes: c.modes,
      regions: c.regions.length === 0 ? ['GLOBAL'] : c.regions,
      reliability: c.reliability,
      baseRatePerKg: c.baseRatePerKg,
      averageTransitHours: c.averageTransitHours,
      carbonGramsPerKgKm: c.carbonGramsPerKgKm
    }))
  }));
});

// ─── Shipment endpoints ──────────────────────────────────────────────

app.post('/api/v1/shipments/plan', requireAuth, async (req: any, res: any) => {
  try {
    const request: ShipmentRequest = ShipmentRequestSchema.parse(req.body);
    const plan = await planShipment(request);
    res.json(apiResponse(true, plan));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

app.post('/api/v1/shipments/book', requireAuth, async (req: any, res: any) => {
  try {
    const schema = z.object({
      plan: z.any(),
      pickupTime: z.string().optional()
    });
    const { plan, pickupTime } = schema.parse(req.body);
    const booking = await bookShipment(plan, { pickupTime });
    res.json(apiResponse(true, booking));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

app.get('/api/v1/shipments/:id/track', requireAuth, (req, res) => {
  const status = trackShipment(req.params.id);
  if (!status) {
    return res.status(404).json(apiResponse(false, undefined, 'Shipment not found'));
  }
  res.json(apiResponse(true, status));
});

// ─── NEW: Quick cost/time estimate (no full plan, no booking) ──────────
// Useful for "how much would it cost to ship X from Y to Z?" widgets.
app.post('/api/v1/shipments/estimate', requireAuth, async (req: any, res: any) => {
  try {
    const schema = z.object({
      origin: AddressSchema,
      destination: AddressSchema,
      cargo: z.object({
        weightKg: z.number().positive(),
        // Optional — defaults to general
        type: z.string().optional(),
        // Optional — improves accuracy
        hsCode: z.string().optional(),
        declaredValue: z.number().nonnegative().optional(),
        currency: z.string().length(3).optional()
      }),
      // Optional — speed vs cost preference
      optimizeFor: z.enum(['cost', 'speed']).optional()
    });
    const params = schema.parse(req.body);

    // Generate ONE candidate route (cheapest or fastest), no full plan
    const request: ShipmentRequest = {
      origin: params.origin,
      destination: params.destination,
      cargo: {
        type: (params.cargo.type as any) || 'general',
        weightKg: params.cargo.weightKg,
        declaredValue: params.cargo.declaredValue || 0,
        currency: params.cargo.currency || 'USD',
        hsCode: params.cargo.hsCode
      },
      optimizeFor: params.optimizeFor || 'cost'
    };
    const candidates = generateCandidateRoutes(request);
    if (candidates.length === 0) {
      return res.status(400).json(apiResponse(false, undefined, 'No routes available'));
    }
    const scored = scoreRoutes(candidates, request.optimizeFor);
    const cheapest = scored[0];

    // Quick duty estimate if HS + value provided
    let duties = null;
    if (params.cargo.hsCode && params.cargo.declaredValue) {
      const customs = await checkRequirements({
        origin: params.origin.country,
        destination: params.destination.country,
        hsCode: params.cargo.hsCode,
        value: params.cargo.declaredValue,
        currency: params.cargo.currency || 'USD'
      });
      duties = {
        totalDutiesUsd: customs.totalDutiesUsd,
        estimatedClearanceHours: customs.estimatedClearanceHours
      };
    }

    res.json(apiResponse(true, {
      origin: params.origin.country,
      destination: params.destination.country,
      weightKg: params.cargo.weightKg,
      recommendedRoute: {
        carrier: cheapest.legs[0].carrierName,
        mode: cheapest.legs[0].mode,
        totalCostUsd: cheapest.totalCostUsd,
        transitHours: cheapest.totalTransitHours,
        distanceKm: cheapest.totalDistanceKm,
        carbonKg: cheapest.totalCarbonKg,
        legs: cheapest.legs.length
      },
      alternativeCount: scored.length - 1,
      duties,
      validUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      notes: 'Estimate is non-binding and may change at booking time.'
    }));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

// ─── NEW: Generate shipping documents (invoice, packing list, BoL) ─────
// Returns ready-to-print HTML + structured data for the booked shipment.
app.post('/api/v1/shipments/:id/document', requireAuth, (req: any, res: any) => {
  try {
    const schema = z.object({
      type: z.enum(['commercial-invoice', 'packing-list', 'bill-of-lading', 'customs-declaration']),
      format: z.enum(['json', 'html']).optional(),
      // For commercial invoice: who is seller/buyer
      seller: z.object({
        name: z.string(),
        address: z.string().optional(),
        taxId: z.string().optional()
      }).optional(),
      buyer: z.object({
        name: z.string(),
        address: z.string().optional(),
        taxId: z.string().optional()
      }).optional()
    });
    const { type, format = 'json', seller, buyer } = schema.parse(req.body);
    const shipment = getShipment(req.params.id);
    if (!shipment) {
      return res.status(404).json(apiResponse(false, undefined, 'Shipment not found'));
    }
    const document = generateShippingDocument(type, {
      shipment,
      seller,
      buyer,
      generatedAt: new Date().toISOString()
    });

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(renderDocumentHTML(type, document));
    }
    res.json(apiResponse(true, document));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

app.post('/api/v1/shipments/:id/reroute', requireAuth, async (req: any, res: any) => {
  try {
    const { reason } = z.object({ reason: z.string() }).parse(req.body);
    const result = await reroute(req.params.id, reason);
    res.json(apiResponse(true, result));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

app.post('/api/v1/shipments/:id/cancel', requireAuth, (req, res) => {
  const result = cancelShipmentFn(req.params.id);
  if (!result.success) {
    return res.status(400).json(apiResponse(false, undefined, result.reason));
  }
  res.json(apiResponse(true, { shipmentId: req.params.id, cancelled: true }));
});

// ─── Carrier webhook receivers (DHL, FedEx, Maersk, universal) ──────
// These endpoints accept status updates from real carrier APIs.
// Production: configure CARRIER_WEBHOOK_SECRET for HMAC verification.
app.post('/api/v1/webhooks/dhl', createDhlHandler());
app.post('/api/v1/webhooks/fedex', createFedexHandler());
app.post('/api/v1/webhooks/maersk', createMaerskHandler());
app.post('/api/v1/webhooks/universal', createUniversalHandler());

// Query recent webhook events (useful for testing + ops dashboards)
app.get('/api/v1/webhooks/events', (_req, res) => {
  res.json(apiResponse(true, { total: getRecentEvents(1000).length, events: getRecentEvents(50) }));
});

// Look up the latest status for a tracking number
app.get('/api/v1/webhooks/track/:trackingNumber', (req, res) => {
  const result = getShipmentByTrackingNumber(req.params.trackingNumber);
  if (!result.found) {
    return res.status(404).json(apiResponse(false, undefined, 'No events for that tracking number'));
  }
  res.json(apiResponse(true, result));
});

// ─── Customs ─────────────────────────────────────────────────────────

app.post('/api/v1/customs/check', requireAuth, async (req: any, res: any) => {
  try {
    const schema = z.object({
      origin: z.string().length(2),
      destination: z.string().length(2),
      hsCode: z.string().optional(),
      value: z.number().nonnegative(),
      currency: z.string().length(3)
    });
    const params = schema.parse(req.body);
    const result = await checkRequirements(params);
    res.json(apiResponse(true, result));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

// ─── Insurance ───────────────────────────────────────────────────────

app.post('/api/v1/insurance/bind', requireAuth, async (req: any, res: any) => {
  try {
    const schema = z.object({
      cargoValueUsd: z.number().positive(),
      coverage: z.enum(['basic', 'standard', 'all-risk']),
      route: z.any(),
      carrierId: z.string().optional()
    });
    const parsed = schema.parse(req.body);
    const policy = bindInsurance({
      cargoValueUsd: parsed.cargoValueUsd,
      coverage: parsed.coverage,
      route: parsed.route,
      carrierId: parsed.carrierId
    });
    res.json(apiResponse(true, policy));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

// ─── Routing options (without booking) ──────────────────────────────

app.get('/api/v1/routes', requireAuth, (req, res) => {
  try {
    const request: ShipmentRequest = ShipmentRequestSchema.parse(req.query);
    const candidates = generateCandidateRoutes(request);
    const scored = scoreRoutes(candidates, request.optimizeFor, request.weights);
    res.json(apiResponse(true, {
      total: scored.length,
      routes: scored
    }));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

// ─── Carbon ──────────────────────────────────────────────────────────

app.post('/api/v1/carbon/calculate', requireAuth, (req, res) => {
  try {
    const schema = z.object({ route: z.any() });
    const { route } = schema.parse(req.body);
    const estimate = calculateCarbon(route);
    res.json(apiResponse(true, estimate));
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json(apiResponse(false, undefined, `Validation: ${err.issues[0]?.message}`));
    }
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

// ─── 404 ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json(apiResponse(false, undefined, `Not found: ${req.method} ${req.path}`));
});

// ─── Error handler ───────────────────────────────────────────────────

app.use((err: any, req: any, res: any, _next: any) => {
  console.error('[nexha-logistics] error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message || 'Internal error'));
});

// ─── Boot ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[nexha-logistics] listening on :${PORT}`);
  console.log(`[nexha-logistics] carriers: ${CARRIERS.length} built-in`);
  console.log(`[nexha-logistics] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
});

export default app;