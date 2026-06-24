/**
 * nexha-federation-os — port 4273
 *
 * Federation registry + governance. Manages:
 * - Nexha registration (join/leave federation)
 * - Bilateral handshakes between Nexhas
 * - Federation-wide governance policies
 *
 * Endpoints:
 *   POST   /api/v1/nexhas/join             Register a new Nexha
 *   GET    /api/v1/nexhas                  List Nexhas (filters)
 *   GET    /api/v1/nexhas/:id             Get one
 *   PATCH  /api/v1/nexhas/:id             Update
 *   POST   /api/v1/nexhas/:id/suspend      Suspend
 *   POST   /api/v1/nexhas/:id/activate      Activate
 *   GET    /api/v1/nexhas/:id/peers         Get accepted peers
 *   POST   /api/v1/handshakes               Initiate handshake
 *   GET    /api/v1/handshakes              List handshakes
 *   GET    /api/v1/handshakes/:id          Get one
 *   POST   /api/v1/handshakes/:id/respond  Accept/reject
 *   POST   /api/v1/handshakes/:id/revoke   Revoke
 *   POST   /api/v1/policies                Create policy
 *   GET    /api/v1/policies                List policies
 *   GET    /api/v1/policies/:id            Get one
 *   PATCH  /api/v1/policies/:id            Update policy
 *   DELETE /api/v1/policies/:id            Delete policy
 *   GET    /api/v1/stats                  Federation stats
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import federationService from './services/federationService.js';
import type {
  HealthResponse,
  MembershipTier,
  MembershipStatus,
  HandshakeStatus,
  PolicyCategory,
  PolicyEnforcement
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4273;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.FEDERATION_OS_REQUIRE_AUTH !== 'false';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[nexha-federation-os] error:', msg);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

// Optional JWT auth
if (REQUIRE_AUTH) {
  try {
    // @ts-ignore — @rtmn/shared/auth has no .d.ts
    const authModule = await import('@rtmn/shared/auth');
    const { requireAuth } = authModule as { requireAuth: express.RequestHandler };
    app.use('/api/v1', requireAuth);
    console.log('[nexha-federation-os] auth enabled');
  } catch {
    console.warn('[nexha-federation-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seedStats = federationService.seedDemo();
console.log(
  `[nexha-federation-os] seeded ${seedStats.nexhas} nexhas, ` +
  `${seedStats.handshakes} handshakes, ${seedStats.policies} policies`
);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const TierEnum = z.enum(['founding', 'strategic', 'standard', 'associate', 'observer']);
const StatusEnum = z.enum(['pending', 'active', 'suspended', 'expelled', 'churned']);
const HandshakeStatusEnum = z.enum(['pending', 'accepted', 'rejected', 'expired', 'revoked']);
const PolicyCategoryEnum = z.enum(['data-privacy', 'payment', 'liability', 'compliance', 'conduct', 'technical']);
const PolicyEnforcementEnum = z.enum(['mandatory', 'recommended', 'optional']);

const JoinRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  region: z.string().length(2),
  contactEmail: z.string().email(),
  publicKey: z.string().min(1),
  categories: z.array(z.string()).default([]),
  osVersion: z.string().min(1)
});

const NexhaPatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  tier: TierEnum.optional(),
  status: StatusEnum.optional(),
  region: z.string().optional(),
  contactEmail: z.string().optional(),
  categories: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
}).strict();

const HandshakeTermsSchema = z.object({
  mutualCapabilities: z.array(z.string()).default([]),
  dataSharing: z.enum(['none', 'public', 'aggregated', 'full']).default('aggregated'),
  paymentTerms: z.enum(['standard', 'preferred', 'custom']).default('standard'),
  liabilityCap: z.number().optional()
});

const HandshakeInitSchema = z.object({
  initiatorId: z.string().min(1),
  targetId: z.string().min(1),
  terms: HandshakeTermsSchema
});

const HandshakeRespondSchema = z.object({
  accept: z.boolean(),
  targetSignature: z.string().min(1)
});

const PolicyCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: PolicyCategoryEnum,
  enforcement: PolicyEnforcementEnum,
  rules: z.array(z.object({
    when: z.string(),
    then: z.string(),
    appliesTo: z.array(z.union([z.literal('all'), TierEnum])).optional()
  })).min(1)
});

const PolicyPatchSchema = PolicyCreateSchema.partial();

const NexhaQuerySchema = z.object({
  tier: TierEnum.optional(),
  status: StatusEnum.optional(),
  region: z.string().optional(),
  category: z.string().optional()
});

const HandshakeQuerySchema = z.object({
  initiatorId: z.string().optional(),
  targetId: z.string().optional(),
  status: HandshakeStatusEnum.optional()
});

const PolicyQuerySchema = z.object({
  category: PolicyCategoryEnum.optional(),
  enforcement: PolicyEnforcementEnum.optional()
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = federationService.getStats();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-federation-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    nexhas: stats.totalNexhas,
    handshakes: stats.totalHandshakes,
    policies: stats.totalPolicies,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  const stats = federationService.getStats();
  res.json(apiResponse(true, {
    name: 'nexha-federation-os',
    version: '0.1.0',
    description: 'Federation registry + governance for the Nexha network',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      joinNexha: 'POST /api/v1/nexhas/join',
      listNexhas: 'GET /api/v1/nexhas',
      getNexha: 'GET /api/v1/nexhas/:id',
      peers: 'GET /api/v1/nexhas/:id/peers',
      initiateHandshake: 'POST /api/v1/handshakes',
      respondHandshake: 'POST /api/v1/handshakes/:id/respond',
      createPolicy: 'POST /api/v1/policies',
      stats: 'GET /api/v1/stats'
    },
    seededNexhas: stats.totalNexhas,
    seededHandshakes: stats.totalHandshakes,
    seededPolicies: stats.totalPolicies
  }));
});

// ────────────────────────────────────────────────────────────────────
// Nexha registry
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/nexhas/join', asyncRoute(async (req, res) => {
  const validation = JoinRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const nexha = federationService.register(validation.data);
  res.status(201).json(apiResponse(true, nexha));
}));

app.get('/api/v1/nexhas', asyncRoute(async (req, res) => {
  const validation = NexhaQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { tier, status, region, category } = validation.data;
  const results = federationService.list({
    tier: tier as MembershipTier | undefined,
    status: status as MembershipStatus | undefined,
    region, category
  });
  res.json(apiResponse(true, { nexhas: results, total: results.length }));
}));

app.get('/api/v1/nexhas/:id', asyncRoute(async (req, res) => {
  const nexha = federationService.get(req.params.id);
  if (!nexha) {
    res.status(404).json(apiResponse(false, undefined, 'Nexha not found'));
    return;
  }
  res.json(apiResponse(true, nexha));
}));

app.patch('/api/v1/nexhas/:id', asyncRoute(async (req, res) => {
  const validation = NexhaPatchSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const updated = federationService.update(req.params.id, validation.data);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Nexha not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.post('/api/v1/nexhas/:id/suspend', asyncRoute(async (req, res) => {
  const reason = (req.body && req.body.reason) || 'No reason provided';
  const updated = federationService.suspend(req.params.id, String(reason));
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Nexha not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.post('/api/v1/nexhas/:id/activate', asyncRoute(async (req, res) => {
  const updated = federationService.activate(req.params.id);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Nexha not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.get('/api/v1/nexhas/:id/peers', asyncRoute(async (req, res) => {
  const peers = federationService.getPeers(req.params.id);
  res.json(apiResponse(true, { nexhaId: req.params.id, peers, total: peers.length }));
}));

// ────────────────────────────────────────────────────────────────────
// Handshakes
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/handshakes', asyncRoute(async (req, res) => {
  const validation = HandshakeInitSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { initiatorId, targetId, terms } = validation.data;
  const handshake = federationService.initiateHandshake(initiatorId, targetId, terms);
  res.status(201).json(apiResponse(true, handshake));
}));

app.get('/api/v1/handshakes', asyncRoute(async (req, res) => {
  const validation = HandshakeQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { initiatorId, targetId, status } = validation.data;
  const results = federationService.listHandshakes({
    initiatorId, targetId,
    status: status as HandshakeStatus | undefined
  });
  res.json(apiResponse(true, { handshakes: results, total: results.length }));
}));

app.get('/api/v1/handshakes/:id', asyncRoute(async (req, res) => {
  const handshake = federationService.getHandshake(req.params.id);
  if (!handshake) {
    res.status(404).json(apiResponse(false, undefined, 'Handshake not found'));
    return;
  }
  res.json(apiResponse(true, handshake));
}));

app.post('/api/v1/handshakes/:id/respond', asyncRoute(async (req, res) => {
  const validation = HandshakeRespondSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { accept, targetSignature } = validation.data;
  const handshake = federationService.respondToHandshake(req.params.id, accept, targetSignature);
  if (!handshake) {
    res.status(404).json(apiResponse(false, undefined, 'Handshake not found or not pending'));
    return;
  }
  res.json(apiResponse(true, handshake));
}));

app.post('/api/v1/handshakes/:id/revoke', asyncRoute(async (req, res) => {
  const handshake = federationService.revokeHandshake(req.params.id);
  if (!handshake) {
    res.status(404).json(apiResponse(false, undefined, 'Handshake not found'));
    return;
  }
  res.json(apiResponse(true, handshake));
}));

// ────────────────────────────────────────────────────────────────────
// Governance policies
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/policies', asyncRoute(async (req, res) => {
  const validation = PolicyCreateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const policy = federationService.createPolicy(validation.data as any);
  res.status(201).json(apiResponse(true, policy));
}));

app.get('/api/v1/policies', asyncRoute(async (req, res) => {
  const validation = PolicyQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { category, enforcement } = validation.data;
  const policies = federationService.listPolicies({
    category: category as PolicyCategory | undefined,
    enforcement: enforcement as PolicyEnforcement | undefined
  });
  res.json(apiResponse(true, { policies, total: policies.length }));
}));

app.get('/api/v1/policies/:id', asyncRoute(async (req, res) => {
  const policy = federationService.getPolicy(req.params.id);
  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found'));
    return;
  }
  res.json(apiResponse(true, policy));
}));

app.patch('/api/v1/policies/:id', asyncRoute(async (req, res) => {
  const validation = PolicyPatchSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  // Cast: Zod's union is type-narrower than GovernancePolicy's expected `appliesTo`
  const updated = federationService.updatePolicy(req.params.id, validation.data as any);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.delete('/api/v1/policies/:id', asyncRoute(async (req, res) => {
  const deleted = federationService.deletePolicy(req.params.id);
  if (!deleted) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found'));
    return;
  }
  res.json(apiResponse(true, { deleted: true, policyId: req.params.id }));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = federationService.getStats();
  res.json(apiResponse(true, stats));
}));

// ────────────────────────────────────────────────────────────────────
// REZ Intelligence
// ────────────────────────────────────────────────────────────────────
const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const REZ_INTEL_TIMEOUT = parseInt(process.env.REZ_INTEL_TIMEOUT_MS || '3000');
const REZ_INTEL_ENABLED = process.env.REZ_INTEL_ENABLED !== 'false';

async function callREZIntel(endpoint: string, body: Record<string, unknown>) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json: any = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

app.get('/rez-intel-status', async (_req, res) => {
  let healthy = false;
  try {
    const r = await fetch(`${REZ_INTEL_URL}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
    healthy = r.ok;
  } catch { /* ignore */ }
  res.json({ rezIntelEnabled: REZ_INTEL_ENABLED, rezIntelUrl: REZ_INTEL_URL, rezIntelHealthy: healthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await callREZIntel('/api/v1/agent/enrich', { agentRole, userId, companyId, query, context });
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const stats = federationService.getStats();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA FEDERATION OS — Layer 4                        ║
║           "The federation registry + governance"                ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                           ║
║  Port:           ${String(PORT).padEnd(47)}║
║  Nexhas:         ${String(stats.totalNexhas).padEnd(45)}║
║  Handshakes:     ${String(stats.totalHandshakes).padEnd(45)}║
║  Policies:       ${String(stats.totalPolicies).padEnd(45)}║
║  Auth:           ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/nexhas/join              Register Nexha       ║
║    GET    /api/v1/nexhas                   List Nexhas           ║
║    GET    /api/v1/nexhas/:id/peers         Get accepted peers    ║
║    POST   /api/v1/handshakes               Initiate handshake    ║
║    POST   /api/v1/handshakes/:id/respond   Accept/reject         ║
║    POST   /api/v1/policies                 Create policy         ║
║    GET    /api/v1/stats                    Federation stats      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-federation-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;