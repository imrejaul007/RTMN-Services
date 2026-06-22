import express from "express";
import { requireAuth, createTenantContext, getTenant } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";

import trustService from "./services/trustService";
import reputationService from "./services/reputationService";
import creditCheckService from "./services/creditCheck";
import verificationService from "./services/verificationService";
import { tenantStores, resolveTenant } from "./services/tenantStore";
import logger from "./utils/logger";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4291;
const START_TIME = Date.now();

// SADA (TrustOS) federation — port 4190
const SADA_URL = process.env.SADA_URL || "http://localhost:4190";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ADR-0009 Phase 1: tenant context middleware. /api/v1/info, /health, /ready
// stay public. Everything else under /api/v1/ runs after tenant resolution.
const tenantMiddleware = createTenantContext({
  publicPathPatterns: [/^\/info$/, /^\/sada\/status$/],
});
app.use('/api/v1/', tenantMiddleware);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
      logger.error("Route error", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

/**
 * SADA Federation: fetch authoritative trust score from SADA (port 4190).
 * Falls back gracefully if SADA is unreachable.
 */
async function fetchSadaScore(entityId: string): Promise<{ score: number; level: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${SADA_URL}/api/v1/trust/${entityId}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = (await r.json()) as any;
    if (j?.success && j.data) {
      return { score: j.data.overallScore ?? j.data.score ?? 0, level: j.data.trustLevel ?? "UNTRUSTED" };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "sutar-trust-engine",
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
      name: "sutar-trust-engine",
      version: "1.0.0",
      services: ["trust", "reputation", "credit", "verification"],
      federation: { sada: { url: SADA_URL, port: 4190 } },
    })
  );
});

// ---------------------------------------------------------------------------
// SADA federation health probe (Phase B.4) — used by the RTMN Hub demo and
// by callers that want to know whether trust data is coming from the local
// engine or SADA before issuing trust-dependent requests.
// Never throws — returns 200 with sadaReachable: false when upstream is down.
// ---------------------------------------------------------------------------
app.get("/api/v1/sada/status", async (_req, res) => {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const r = await fetch(`${SADA_URL}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    res.json(
      apiResponse(true, {
        sadaReachable: r.ok,
        sadaUrl: SADA_URL,
        latencyMs: Date.now() - start,
        status: r.status,
      })
    );
  } catch (err: any) {
    clearTimeout(timer);
    res.json(
      apiResponse(true, {
        sadaReachable: false,
        sadaUrl: SADA_URL,
        latencyMs: Date.now() - start,
        error: err?.message || String(err),
      })
    );
  }
});

// ---------------------------------------------------------------------------
// Trust Score endpoints
// ---------------------------------------------------------------------------
const CalculateScoreSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(["user", "merchant", "business", "partner", "agent"]).default("user"),
  factors: z
    .object({
      paymentHistory: z.number().min(0).max(100).optional(),
      fulfillmentHistory: z.number().min(0).max(100).optional(),
      disputeHistory: z.number().min(0).max(100).optional(),
      verificationStatus: z.number().min(0).max(100).optional(),
      transactionVolume: z.number().min(0).optional(),
    })
    .optional(),
});

app.post(
  "/api/v1/trust/calculate",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = CalculateScoreSchema.parse(req.body);
    const result = trustService.calculateTrustScore(body);
    res.json(apiResponse(true, result));
  })
);

app.get(
  "/api/v1/trust/:entityId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { entityId } = req.params;
    const local = trustService.getTrustScore(entityId);
    const sada = await fetchSadaScore(entityId);

    if (!local && !sada) {
      res.status(404).json(apiResponse(false, undefined, "Trust score not found"));
      return;
    }
    res.json(
      apiResponse(true, {
        entityId,
        local: local
          ? {
              overallScore: local.overallScore,
              trustLevel: local.trustLevel,
              riskLevel: local.riskLevel,
              componentScores: {
                payment: local.paymentScore.score,
                fulfillment: local.fulfillmentScore.score,
                dispute: local.disputeScore.score,
                verification: local.verificationScore.score,
                transaction: local.transactionScore.score,
              },
              badges: local.badges,
            }
          : null,
        sada: sada ?? null,
        // Use the higher-confidence source as the authoritative score
        effectiveScore: sada ? sada.score : local?.overallScore ?? 0,
        effectiveLevel: sada ? sada.level : local?.trustLevel ?? "UNTRUSTED",
        source: sada ? "sada" : local ? "local" : "none",
      })
    );
  })
);

// ---------------------------------------------------------------------------
// Reputation endpoints
// ---------------------------------------------------------------------------
app.get(
  "/api/v1/reputation/:entityId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const rep = reputationService.getReputation(req.params.entityId);
    if (!rep) {
      res.status(404).json(apiResponse(false, undefined, "Reputation not found"));
      return;
    }
    res.json(apiResponse(true, rep));
  })
);

app.post(
  "/api/v1/reputation/aggregate",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { entityIds } = z.object({ entityIds: z.array(z.string()).min(1) }).parse(req.body);
    const agg = reputationService.aggregateReputation(entityIds);
    res.json(apiResponse(true, agg));
  })
);

// ---------------------------------------------------------------------------
// Credit Check endpoints
// ---------------------------------------------------------------------------
const CreditCheckSchema = z.object({
  entityId: z.string().min(1),
  requestType: z.enum(["score_only", "full_report", "pre_approval"]).default("score_only"),
  amount: z.number().positive().optional(),
  purpose: z.string().optional(),
  currency: z.string().default("USD"),
});

app.post(
  "/api/v1/credit/check",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = CreditCheckSchema.parse(req.body);
    const result = creditCheckService.performCreditCheck(body);
    res.json(apiResponse(true, result));
  })
);

app.get(
  "/api/v1/credit/:entityId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const score = creditCheckService.getCreditScore(req.params.entityId);
    if (!score) {
      res.status(404).json(apiResponse(false, undefined, "Credit score not found"));
      return;
    }
    res.json(apiResponse(true, score));
  })
);

app.get(
  "/api/v1/credit/:entityId/report",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = creditCheckService.getCreditReport(req.params.entityId);
    if (!report) {
      res.status(404).json(apiResponse(false, undefined, "Credit report not found"));
      return;
    }
    res.json(apiResponse(true, report));
  })
);

// ---------------------------------------------------------------------------
// Verification endpoints
// ---------------------------------------------------------------------------
const VerifyEntitySchema = z.object({
  entityId: z.string().min(1),
  verificationType: z.enum(["kyc", "kyb", "document", "address", "bank", "biometric"]),
  documents: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url(),
      })
    )
    .optional(),
});

app.post(
  "/api/v1/verification/verify",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = VerifyEntitySchema.parse(req.body);
    const result = await verificationService.verifyEntity(body);
    res.json(apiResponse(true, result));
  })
);

const KYCSchema = z.object({
  entityId: z.string().min(1),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    nationality: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
  }),
  documents: z.array(z.object({ type: z.string(), url: z.string().url() })),
});

app.post(
  "/api/v1/verification/kyc",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = KYCSchema.parse(req.body);
    const result = await verificationService.processKYC(body);
    res.json(apiResponse(true, result));
  })
);

// ---------------------------------------------------------------------------
// 404 + boot
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

const server = app.listen(PORT, () => {
  logger.info(`sutar-trust-engine running on port ${PORT}`);
  logger.info(`SADA federation: ${SADA_URL}`);
});

installGracefulShutdown(server);

export default app;
