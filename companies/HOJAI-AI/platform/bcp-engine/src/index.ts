import { requireAuth } from '@rtmn/shared/auth';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import bcpService from './services/bcpService.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4298;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function apiResponse<T>(success: boolean, data?: T, error?: string) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    });
  };
}

function zodErr(err: z.ZodError): string {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

// Health
app.get('/health', (_req, res) => {
  const stats = bcpService.getStats();
  res.json({
    status: 'healthy', service: 'bcp-engine', version: '0.1.0', port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    totalPacks: stats.totalPacks, totalInstallations: stats.totalInstallations,
    categories: stats.categories, timestamp: new Date().toISOString()
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Browse / search packs
app.get('/api/v1/packs', asyncHandler(async (req: Request, res: Response) => {
  const query = {
    q: req.query.q as string | undefined,
    category: req.query.category as string | undefined,
    sort: (req.query.sort as any) || 'popular',
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    pageSize: req.query.pageSize ? Math.min(parseInt(req.query.pageSize as string), 50) : 20,
  };
  res.json(apiResponse(true, bcpService.listPacks(query)));
}));

// Get one pack
app.get('/api/v1/packs/:id', asyncHandler(async (req: Request, res: Response) => {
  const pack = bcpService.getPack(req.params.id);
  if (!pack) { res.status(404).json(apiResponse(false, undefined, 'BCP not found')); return; }
  res.json(apiResponse(true, pack));
}));

// Browse by category
app.get('/api/v1/categories', asyncHandler(async (_req: Request, res: Response) => {
  res.json(apiResponse(true, { categories: bcpService.getCategories() }));
}));

// Install a BCP
const InstallSchema = z.object({ bcpId: z.string().min(1), companyId: z.string().min(1) });
app.post('/api/v1/install',requireAuth,  asyncHandler(async (req: Request, res: Response) => {
  const v = InstallSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, 'Validation: ' + zodErr(v.error))); return; }
  try {
    res.status(201).json(apiResponse(true, bcpService.install(v.data.bcpId, v.data.companyId)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json(apiResponse(false, undefined, msg));
  }
}));

// Get installations for company
app.get('/api/v1/installations/:companyId', asyncHandler(async (req: Request, res: Response) => {
  res.json(apiResponse(true, { installations: bcpService.getInstallations(req.params.companyId) }));
}));

// Uninstall
app.delete('/api/v1/installations/:companyId/:bcpId',requireAuth,  asyncHandler(async (req: Request, res: Response) => {
  try {
    bcpService.uninstall(req.params.bcpId, req.params.companyId);
    res.json(apiResponse(true, { message: 'Uninstalled successfully' }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json(apiResponse(false, undefined, msg));
  }
}));

// Update setup step
const StepSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'done', 'skipped']),
  config: z.record(z.unknown()).optional()
});
app.patch('/api/v1/installations/:companyId/:bcpId/steps/:stepId',requireAuth,  asyncHandler(async (req: Request, res: Response) => {
  const v = StepSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, 'Validation: ' + zodErr(v.error))); return; }
  try {
    res.json(apiResponse(true, bcpService.updateSetupStep(req.params.companyId, req.params.bcpId, req.params.stepId, v.data.status, v.data.config)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json(apiResponse(false, undefined, msg));
  }
}));

// Info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'BCP Engine', version: '0.1.0', port: PORT,
    tagline: 'Business Capability Pack registry + installer',
    description: 'Pre-built AI employee bundles: Sales + Finance + Procurement + Support + Marketing'
  }));
});

// 404
app.use((_req: Request, res: Response) => res.status(404).json(apiResponse(false, undefined, 'Route not found')));

// Start
const server = app.listen(PORT, () => {
  const stats = bcpService.getStats();
  console.log(`\n[BCP Engine] listening on port ${PORT}`);
  console.log(`  Packs: ${stats.totalPacks}, Installations: ${stats.totalInstallations}`);
  console.log(`  Categories: ${stats.categories.join(', ')}`);
});

process.on('SIGTERM', () => { console.log('[BCP Engine] shutting down'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('[BCP Engine] shutting down'); server.close(() => process.exit(0)); });

export default app;
