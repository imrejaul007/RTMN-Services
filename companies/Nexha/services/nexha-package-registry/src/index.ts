/**
 * nexha-package-registry — port 4277
 *
 * Nexha Package Registry — npm for autonomous businesses.
 * Publish and consume capability bundles, agent templates, and industry packs.
 *
 * Endpoints:
 *   POST   /api/v1/packages                    Publish a package
 *   GET    /api/v1/packages                   List packages
 *   GET    /api/v1/packages/:id              Get one
 *   PUT    /api/v1/packages/:id              Update
 *   DELETE /api/v1/packages/:id              Deprecate
 *   GET    /api/v1/packages/:scopeName       Get by scopeName
 *   GET    /api/v1/packages/:scopeName/:version  Get specific version
 *   GET    /api/v1/packages/:scopeName/versions  List versions
 *   POST   /api/v1/packages/:id/star         Toggle star
 *   POST   /api/v1/resolve                   Resolve version (semver)
 *   GET    /api/v1/search                    Search packages
 *   GET    /api/v1/stats                     Registry stats
 *   GET    /api/v1/publishers/:nexhaId       Packages by publisher
 *   GET    /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import packageRegistryService from './services/packageRegistryService.js';
import type {
  PackageKind,
  PackageScope,
  IndustryVertical
} from './types/index.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4277');
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Response envelope
const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

// Async-route wrapper
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[nexha-package-registry] error:', msg);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────────
const PackageKindSchema = z.enum(['capability-bundle', 'agent-template', 'industry-pack', 'workflow-template', 'integration']);
const IndustrySchema = z.enum([
  'restaurant', 'hotel', 'healthcare', 'retail', 'legal',
  'education', 'agriculture', 'automotive', 'beauty', 'fashion',
  'fitness', 'gaming', 'government', 'home-services', 'manufacturing',
  'non-profit', 'professional', 'sports', 'travel', 'entertainment',
  'construction', 'financial', 'real-estate', 'transport'
]);

const PublishSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be semver (e.g. 1.0.0)'),
  displayName: z.string().min(1).max(200),
  tagline: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
  kind: PackageKindSchema,
  industries: z.array(IndustrySchema).min(1),
  tags: z.array(z.string().max(50)).min(1).max(20),
  dependencies: z.record(z.string()).optional(),
  nexhaOsVersion: z.string().optional(),
  ports: z.array(z.number().int().min(1).max(65535)).optional(),
  scope: z.enum(['public', 'verified', 'private']).optional(),
  dist: z.object({
    tarball: z.string().url(),
    size: z.number().int().positive(),
    checksum: z.string().min(1)
  }),
  envVars: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean(),
    default: z.string().optional()
  })).optional(),
  readme: z.string().max(50000).optional(),
  changelog: z.record(z.string()).optional()
});

const UpdateSchema = PublishSchema.partial().omit({ dist: true });

const ListSchema = z.object({
  q: z.string().optional(),
  kind: PackageKindSchema.optional(),
  industry: IndustrySchema.optional(),
  publisher: z.string().optional(),
  scope: z.enum(['public', 'verified', 'private']).optional(),
  tags: z.string().optional(),
  sort: z.enum(['downloads', 'stars', 'recent', 'name']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20)
});

const ResolveSchema = z.object({
  scopeName: z.string().min(1),
  version: z.string().default('latest')
});

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'nexha-package-registry',
    version: '1.0.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    packages: packageRegistryService.total(),
    timestamp: new Date().toISOString()
  } as Parameters<typeof apiResponse>[1]);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

// ────────────────────────────────────────────────────────────────────
// Publish
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/packages', asyncRoute(async (req, res) => {
  const validation = PublishSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  // Publisher info from auth headers (or fall back to demo)
  const nexhaId = req.headers['x-nexha-id'] as string ?? 'nexha-demo';
  const corpId = req.headers['x-corp-id'] as string ?? 'corp-demo';
  const publisherName = req.headers['x-publisher-name'] as string ?? 'Demo Publisher';

  const pkg = packageRegistryService.publish(nexhaId, corpId, publisherName, validation.data);
  res.status(201).json(apiResponse(true, pkg));
}));

// ────────────────────────────────────────────────────────────────────
// List
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/packages', asyncRoute(async (req, res) => {
  const validation = ListSchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const opts = validation.data;
  const result = packageRegistryService.list({
    query: opts.q,
    kind: opts.kind,
    industry: opts.industry,
    publisherNexhaId: opts.publisher,
    scope: opts.scope,
    tags: opts.tags ? opts.tags.split(',').map((t) => t.trim()) : undefined,
    sort: opts.sort ?? 'recent',
    page: opts.page,
    perPage: opts.perPage
  });
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Get by ID
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/packages/:id', asyncRoute(async (req, res) => {
  const pkg = packageRegistryService.get(req.params.id);
  if (!pkg) {
    res.status(404).json(apiResponse(false, undefined, 'Package not found'));
    return;
  }
  res.json(apiResponse(true, pkg));
}));

// ────────────────────────────────────────────────────────────────────
// Get by scopeName (optionally with version)
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/packages/:scopeName/:version', asyncRoute(async (req, res) => {
  const pkg = packageRegistryService.getByScope(req.params.scopeName, req.params.version);
  if (!pkg) {
    res.status(404).json(apiResponse(false, undefined, `Package ${req.params.scopeName}@${req.params.version} not found`));
    return;
  }
  res.json(apiResponse(true, pkg));
}));

app.get('/api/v1/packages/:scopeName', asyncRoute(async (req, res) => {
  const version = req.query.version as string | undefined;
  const pkg = packageRegistryService.getByScope(req.params.scopeName, version);
  if (!pkg) {
    res.status(404).json(apiResponse(false, undefined, `Package ${req.params.scopeName} not found`));
    return;
  }
  res.json(apiResponse(true, pkg));
}));

app.get('/api/v1/packages/:scopeName/versions', asyncRoute(async (req, res) => {
  const versions = packageRegistryService.listVersions(req.params.scopeName);
  res.json(apiResponse(true, { versions, total: versions.length }));
}));

// ────────────────────────────────────────────────────────────────────
// Update / deprecate
// ────────────────────────────────────────────────────────────────────
app.put('/api/v1/packages/:id', asyncRoute(async (req, res) => {
  const validation = UpdateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const updated = packageRegistryService.update(req.params.id, validation.data);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Package not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.delete('/api/v1/packages/:id', asyncRoute(async (req, res) => {
  const reason = req.body?.reason as string | undefined;
  const deprecated = packageRegistryService.deprecate(req.params.id, reason ?? '');
  if (!deprecated) {
    res.status(404).json(apiResponse(false, undefined, 'Package not found'));
    return;
  }
  res.json(apiResponse(true, { deprecated: true, id: req.params.id }));
}));

// ────────────────────────────────────────────────────────────────────
// Stars
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/packages/:id/star', asyncRoute(async (req, res) => {
  const nexhaId = req.headers['x-nexha-id'] as string ?? 'anonymous';
  const stars = packageRegistryService.toggleStar(req.params.id, nexhaId);
  if (stars === 0) {
    res.status(404).json(apiResponse(false, undefined, 'Package not found'));
    return;
  }
  res.json(apiResponse(true, { starred: stars }));
}));

// ────────────────────────────────────────────────────────────────────
// Resolve (semver)
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/resolve', asyncRoute(async (req, res) => {
  const validation = ResolveSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const resolved = packageRegistryService.resolve(validation.data.scopeName, validation.data.version);
  if (!resolved) {
    res.status(404).json(apiResponse(false, undefined, `Package ${validation.data.scopeName}@${validation.data.version} not found`));
    return;
  }
  res.json(apiResponse(true, resolved));
}));

// ────────────────────────────────────────────────────────────────────
// Search
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/search', asyncRoute(async (req, res) => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json(apiResponse(false, undefined, 'q parameter is required'));
    return;
  }
  const kind = req.query.kind as PackageKind | undefined;
  const industry = req.query.industry as IndustryVertical | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const results = packageRegistryService.search(q, { kind, industry, limit });
  res.json(apiResponse(true, { packages: results, total: results.length }));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  res.json(apiResponse(true, packageRegistryService.stats()));
}));

// ────────────────────────────────────────────────────────────────────
// Publisher packages
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/publishers/:nexhaId', asyncRoute(async (req, res) => {
  const result = packageRegistryService.list({
    publisherNexhaId: req.params.nexhaId,
    sort: 'recent',
    perPage: 100
  });
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA PACKAGE REGISTRY — Layer 4                    ║
║           "npm for autonomous businesses"                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                          ║
║  Port:        ${String(PORT).padEnd(48)}║
║  Packages:    ${String(packageRegistryService.total()).padEnd(48)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    POST   /api/v1/packages              Publish package       ║
║    GET    /api/v1/packages              List packages         ║
║    GET    /api/v1/packages/:id          Get one               ║
║    GET    /api/v1/packages/:scope/:ver  Get version          ║
║    GET    /api/v1/packages/:scope/versions  All versions     ║
║    PUT    /api/v1/packages/:id          Update                 ║
║    DELETE /api/v1/packages/:id          Deprecate             ║
║    POST   /api/v1/packages/:id/star     Toggle star           ║
║    POST   /api/v1/resolve               Semver resolve         ║
║    GET    /api/v1/search                Search packages       ║
║    GET    /api/v1/stats                 Registry stats        ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-package-registry] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
