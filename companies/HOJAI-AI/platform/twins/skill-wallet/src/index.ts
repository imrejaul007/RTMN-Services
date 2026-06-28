import { requireAuth } from '@rtmn/shared/auth';
/**
 * Personal Skill Wallet Service
 * Port: 4750
 *
 * Manages employee's personal skill wallet with purchased and installed skills.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4750', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface InstalledSkill {
  skillId: string;
  name: string;
  source: 'bam' | 'company' | 'self';
  version: string;
  installedAt: string;
  status: 'active' | 'paused' | 'learning';
  usageCount: number;
  lastUsed?: string;
  effectiveness: number;
  confidence: number;
  parameters: Record<string, any>;
}

interface SkillComposition {
  id: string;
  name: string;
  skills: string[];
  purpose: string;
  createdAt: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  verified: boolean;
}

interface SkillWallet {
  employeeId: string;
  skills: InstalledSkill[];
  compositions: SkillComposition[];
  certifications: Certification[];
  favorites: string[];
  totalInvestment: number;
  updatedAt: string;
}

// Storage
const wallets = new Map<string, SkillWallet>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'skill-wallet', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'skill-wallet', timestamp: new Date().toISOString() });
});

/**
 * Get wallet for an employee
 */
app.get('/api/wallet/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  let wallet = wallets.get(employeeId);

  if (!wallet) {
    wallet = {
      employeeId,
      skills: [],
      compositions: [],
      certifications: [],
      favorites: [],
      totalInvestment: 0,
      updatedAt: new Date().toISOString()
    };
    wallets.set(employeeId, wallet);
  }

  res.json({ success: true, data: wallet });
});

/**
 * Get wallet stats
 */
app.get('/api/wallet/:employeeId/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const wallet = wallets.get(employeeId);

  if (!wallet) {
    return res.json({ success: true, data: { employeeId, skills: 0, compositions: 0, certifications: 0, totalInvestment: 0 } });
  }

  res.json({
    success: true,
    data: {
      employeeId,
      totalSkills: wallet.skills.length,
      activeSkills: wallet.skills.filter(s => s.status === 'active').length,
      compositions: wallet.compositions.length,
      certifications: wallet.certifications.length,
      favorites: wallet.favorites.length,
      totalInvestment: wallet.totalInvestment,
      avgEffectiveness: wallet.skills.length > 0
        ? wallet.skills.reduce((sum, s) => sum + s.effectiveness, 0) / wallet.skills.length
        : 0
    }
  });
});

/**
 * Get skills for an employee
 */
app.get('/api/wallet/:employeeId/skills', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { status, source } = req.query;
  const wallet = wallets.get(employeeId);

  if (!wallet) {
    return res.json({ success: true, data: { skills: [], total: 0 } });
  }

  let skills = wallet.skills;
  if (status) skills = skills.filter(s => s.status === status);
  if (source) skills = skills.filter(s => s.source === source);

  res.json({ success: true, data: { skills, total: skills.length } });
});

/**
 * Install a skill from BAM
 */
app.post('/api/wallet/:employeeId/skills/install',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { skillId, name, source = 'bam', version = '1.0.0', parameters = {} } = req.body;

    if (!skillId || !name) {
      const err: ApiError = new Error('skillId and name are required'); err.statusCode = 400; throw err;
    }

    let wallet = wallets.get(employeeId);
    if (!wallet) {
      wallet = {
        employeeId,
        skills: [],
        compositions: [],
        certifications: [],
        favorites: [],
        totalInvestment: 0,
        updatedAt: new Date().toISOString()
      };
      wallets.set(employeeId, wallet);
    }

    // Check if already installed
    const existing = wallet.skills.find(s => s.skillId === skillId);
    if (existing) {
      existing.status = 'active';
      existing.lastUsed = new Date().toISOString();
      return res.json({ success: true, data: { reinstalled: true, skill: existing } });
    }

    const skill: InstalledSkill = {
      skillId,
      name,
      source,
      version,
      installedAt: new Date().toISOString(),
      status: 'active',
      usageCount: 0,
      effectiveness: 50,
      confidence: 30,
      parameters
    };

    wallet.skills.push(skill);
    wallet.updatedAt = new Date().toISOString();

    res.status(201).json({ success: true, data: { installed: true, skill } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'INSTALL_ERROR', message: error.message } });
  }
});

/**
 * Uninstall a skill
 */
app.post('/api/wallet/:employeeId/skills/:skillId/uninstall',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, skillId } = req.params;
    const wallet = wallets.get(employeeId);

    if (!wallet) {
      const err: ApiError = new Error('Wallet not found'); err.statusCode = 404; throw err;
    }

    const skillIndex = wallet.skills.findIndex(s => s.skillId === skillId);
    if (skillIndex === -1) {
      const err: ApiError = new Error('Skill not found'); err.statusCode = 404; throw err;
    }

    wallet.skills.splice(skillIndex, 1);
    wallet.favorites = wallet.favorites.filter(id => id !== skillId);
    wallet.updatedAt = new Date().toISOString();

    res.json({ success: true, data: { uninstalled: skillId } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UNINSTALL_ERROR', message: error.message } });
  }
});

/**
 * Update skill status
 */
app.patch('/api/wallet/:employeeId/skills/:skillId',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, skillId } = req.params;
    const updates = req.body;
    const wallet = wallets.get(employeeId);

    if (!wallet) {
      const err: ApiError = new Error('Wallet not found'); err.statusCode = 404; throw err;
    }

    const skill = wallet.skills.find(s => s.skillId === skillId);
    if (!skill) {
      const err: ApiError = new Error('Skill not found'); err.statusCode = 404; throw err;
    }

    Object.assign(skill, updates);
    wallet.updatedAt = new Date().toISOString();

    res.json({ success: true, data: skill });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * Add to favorites
 */
app.post('/api/wallet/:employeeId/favorites/:skillId',requireAuth,  (req: Request, res: Response) => {
  const { employeeId, skillId } = req.params;
  let wallet = wallets.get(employeeId);

  if (!wallet) {
    wallet = {
      employeeId,
      skills: [],
      compositions: [],
      certifications: [],
      favorites: [],
      totalInvestment: 0,
      updatedAt: new Date().toISOString()
    };
    wallets.set(employeeId, wallet);
  }

  if (!wallet.favorites.includes(skillId)) {
    wallet.favorites.push(skillId);
    wallet.updatedAt = new Date().toISOString();
  }

  res.json({ success: true, data: { favorites: wallet.favorites } });
});

/**
 * Create skill composition
 */
app.post('/api/wallet/:employeeId/compose',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { name, skills, purpose } = req.body;

    if (!name || !skills || !Array.isArray(skills)) {
      const err: ApiError = new Error('name and skills (array) are required'); err.statusCode = 400; throw err;
    }

    let wallet = wallets.get(employeeId);
    if (!wallet) {
      const err: ApiError = new Error('Wallet not found'); err.statusCode = 404; throw err;
    }

    const composition: SkillComposition = {
      id: generateId('comp'),
      name,
      skills,
      purpose: purpose || '',
      createdAt: new Date().toISOString()
    };

    wallet.compositions.push(composition);
    wallet.updatedAt = new Date().toISOString();

    res.status(201).json({ success: true, data: composition });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'COMPOSE_ERROR', message: error.message } });
  }
});

/**
 * Get compositions
 */
app.get('/api/wallet/:employeeId/compositions', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const wallet = wallets.get(employeeId);

  res.json({ success: true, data: { compositions: wallet?.compositions || [], total: wallet?.compositions.length || 0 } });
});

/**
 * Add certification
 */
app.post('/api/wallet/:employeeId/certifications',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { name, issuer, expiresAt } = req.body;

    if (!name) {
      const err: ApiError = new Error('name is required'); err.statusCode = 400; throw err;
    }

    let wallet = wallets.get(employeeId);
    if (!wallet) {
      wallet = {
        employeeId,
        skills: [],
        compositions: [],
        certifications: [],
        favorites: [],
        totalInvestment: 0,
        updatedAt: new Date().toISOString()
      };
      wallets.set(employeeId, wallet);
    }

    const cert: Certification = {
      id: generateId('cert'),
      name,
      issuer: issuer || '',
      issuedAt: new Date().toISOString(),
      expiresAt,
      verified: false
    };

    wallet.certifications.push(cert);
    wallet.updatedAt = new Date().toISOString();

    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'CERT_ERROR', message: error.message } });
  }
});

/**
 * Get recommendations
 */
app.get('/api/wallet/:employeeId/recommendations', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const wallet = wallets.get(employeeId);

  // Simple recommendation based on existing skills
  const recommendations = [
    { skillId: 'negotiation-pro', name: 'Negotiation Pro', reason: 'Complements your sales skills', score: 95 },
    { skillId: 'leadership-essentials', name: 'Leadership Essentials', reason: 'Next step in your career', score: 85 },
    { skillId: 'ai-productivity', name: 'AI Productivity Master', reason: 'Boosts all your existing skills', score: 90 },
  ];

  res.json({ success: true, data: { recommendations, basedOn: wallet?.skills.map(s => s.name) || [] } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Personal Skill Wallet - Started                   ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Skill Install, Compositions, Certifications     ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
