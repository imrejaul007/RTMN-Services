/**
 * CompanyOS Control Plane
 *
 * HTTP API server for CompanyOS composition.
 * Port: 4010
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { CompositionEngine } from '../../composition-engine/src/engine';
import {
  CompanyComposition,
  CompositionState,
  ValidationResult,
} from '../../composition-engine/src/types';
import { Installer } from '../../composition-engine/src/installer';
import { DependencyResolver } from '../../composition-engine/src/dependency-resolver';

// ============================================
// Configuration
// ============================================

const PORT = process.env.PORT || 4010;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ============================================
// Initialize
// ============================================

const app = express();
const engine = new CompositionEngine(BASE_URL);

// ============================================
// Middleware
// ============================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ============================================
// Health & Info
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'company-os-control-plane',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true });
});

app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'CompanyOS Control Plane',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      company: '/api/company',
      departments: '/api/departments',
      extensions: '/api/extensions',
      packs: '/api/packs',
      state: '/api/state',
    },
  });
});

// ============================================
// Company Management
// ============================================

/**
 * Create a new company
 * POST /api/company/create
 */
app.post('/api/company/create', async (req: Request, res: Response) => {
  try {
    const { name, industry, departments, extensions, ai_departments, company_id } = req.body;

    const composition: CompanyComposition = {
      companyId: company_id || `company_${uuidv4().slice(0, 8)}`,
      name: name || 'Unnamed Company',
      industry: industry || 'restaurant',
      departments: departments || [],
      extensions: extensions || [],
      aiDepartments: ai_departments || {},
    };

    // Validate first
    const validation = await engine.validate(composition);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // Compose
    const result = await engine.compose(composition);

    if (result.success) {
      res.status(201).json({
        success: true,
        companyId: result.companyId,
        manifest: result.manifest,
        installed: {
          departments: result.installed.departments.map(d => d.id),
          extensions: result.installed.extensions.map(e => e.id),
          workers: result.installed.workers.map(w => w.id),
          twins: result.installed.twins.length,
        },
        duration: result.duration,
      });
    } else {
      res.status(500).json({
        success: false,
        companyId: result.companyId,
        errors: result.errors,
        duration: result.duration,
      });
    }
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      error: 'Failed to create company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get company manifest
 * GET /api/company/:id/manifest
 */
app.get('/api/company/:id/manifest', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = await engine.getState(id);

    if (!state) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Get manifest from state (in real impl, would fetch from manifest registry)
    res.json({
      companyId: id,
      status: state.status,
      summary: {
        departments: state.installed.departments.size,
        extensions: state.installed.extensions.size,
        workers: state.installed.workers.size,
        twins: state.installed.twins.size,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get manifest',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get company state
 * GET /api/company/:id/state
 */
app.get('/api/company/:id/state', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = await engine.getState(id);

    if (!state) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json({
      companyId: state.companyId,
      status: state.status,
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      installed: {
        departments: Array.from(state.installed.departments.entries()).map(([id, d]) => ({
          id,
          status: d.status,
          version: d.version,
          endpoint: d.endpoint,
        })),
        extensions: Array.from(state.installed.extensions.entries()).map(([id, e]) => ({
          id,
          status: e.status,
          version: e.version,
          endpoints: e.endpoints,
        })),
        workers: Array.from(state.installed.workers.entries()).map(([id, w]) => ({
          id,
          status: w.status,
          type: w.type,
        })),
        twins: Array.from(state.installed.twins.entries()).map(([id, t]) => ({
          id,
          status: t.status,
          type: t.type,
        })),
      },
      lastUpdate: state.lastUpdate,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get state',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Decompose (delete) a company
 * DELETE /api/company/:id
 */
app.delete('/api/company/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await engine.decompose(id);

    res.json({
      success: result.success,
      companyId: result.companyId,
      removed: result.removed,
      duration: result.duration,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to decompose company',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List all companies
 * GET /api/companies
 */
app.get('/api/companies', (_req: Request, res: Response) => {
  const states = engine.getAllStates?.() || [];
  res.json({
    total: states.length,
    companies: states.map((s: CompositionState) => ({
      companyId: s.companyId,
      status: s.status,
      departments: s.installed.departments.size,
      extensions: s.installed.extensions.size,
    })),
  });
});

/**
 * Validate company composition
 * POST /api/company/validate
 */
app.post('/api/company/validate', async (req: Request, res: Response) => {
  try {
    const composition: CompanyComposition = req.body;
    const result = await engine.validate(composition);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// Pack Management
// ============================================

/**
 * List available department packs
 * GET /api/packs
 */
app.get('/api/packs', (_req: Request, res: Response) => {
  const packs = Installer.getDepartmentPacks();
  res.json({
    total: packs.length,
    packs: packs.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      capabilities: p.capabilities,
      aiWorkers: p.aiWorkers.map(w => w.id),
      port: p.port,
    })),
  });
});

/**
 * Get department pack details
 * GET /api/packs/:id
 */
app.get('/api/packs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pack = Installer.getDepartmentPack(id as any);

  if (!pack) {
    res.status(404).json({ error: 'Pack not found' });
    return;
  }

  res.json(pack);
});

// ============================================
// Extension Management
// ============================================

/**
 * List available industry extensions
 * GET /api/extensions
 */
app.get('/api/extensions', (_req: Request, res: Response) => {
  const extensions = Installer.getExtensions();
  res.json({
    total: extensions.length,
    extensions: extensions.map(e => ({
      id: e.id,
      name: e.name,
      industry: e.industry,
      version: e.version,
      description: e.description,
      modules: e.modules.map(m => m.id),
      specificity: e.specificity.ratio,
      port: e.port,
    })),
  });
});

/**
 * Get extension details
 * GET /api/extensions/:id
 */
app.get('/api/extensions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const ext = Installer.getExtension(id);

  if (!ext) {
    res.status(404).json({ error: 'Extension not found' });
    return;
  }

  res.json(ext);
});

// ============================================
// Dependency Information
// ============================================

/**
 * Get dependencies for an industry
 * GET /api/dependencies/:industry
 */
app.get('/api/dependencies/:industry', (req: Request, res: Response) => {
  const { industry } = req.params;
  const deps = DependencyResolver.getIndustryDependencies(industry as any);

  if (!deps) {
    res.status(404).json({ error: 'Industry not found' });
    return;
  }

  res.json({
    industry,
    required: deps.required,
    optional: deps.optional,
  });
});

/**
 * Get all available departments
 * GET /api/departments
 */
app.get('/api/departments', (_req: Request, res: Response) => {
  const depts = DependencyResolver.getAllDepartments();
  res.json({
    total: depts.length,
    departments: depts,
  });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         CompanyOS Control Plane                           ║
║                                                           ║
║  Server running on port ${PORT}                            ║
║  Base URL: ${BASE_URL}                                    ║
║                                                           ║
║  Endpoints:                                               ║
║    POST /api/company/create    - Create company           ║
║    GET  /api/company/:id/state - Get company state        ║
║    GET  /api/company/:id/manifest - Get manifest          ║
║    DELETE /api/company/:id    - Decompose company         ║
║    GET  /api/packs            - List department packs     ║
║    GET  /api/extensions       - List extensions           ║
║    GET  /api/dependencies/:industry - Get dependencies    ║
║                                                           ║
║  Health: GET /health                                      ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;