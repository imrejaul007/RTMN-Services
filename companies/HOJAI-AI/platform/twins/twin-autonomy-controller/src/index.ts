import { requireAuth } from '@rtmn/shared/auth';
/**
 * Twin Autonomy Controller Service
 * Port: 4760
 *
 * Controls twin execution modes and confidence thresholds.
 * Manages boundaries, approvals, and escalation.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4760', 10);
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
interface AutonomySettings {
  employeeId: string;
  mode: 'shadow' | 'assist' | 'delegate' | 'autonomous';
  boundaries: Boundary[];
  confidenceThresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  workingHours: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, { enabled: boolean; start?: string; end?: string }>;
  };
  notifications: {
    push: boolean;
    email: boolean;
    slack: boolean;
    threshold: 'critical' | 'high' | 'all';
  };
  updatedAt: string;
}

interface Boundary {
  id: string;
  type: 'amount' | 'vendor' | 'risk' | 'department';
  condition: string;
  allowed: boolean;
  maxValue?: number;
}

interface ApprovalRequest {
  id: string;
  taskId: string;
  employeeId: string;
  description: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  createdAt: string;
}

// Storage
const settings = new Map<string, AutonomySettings>();
const approvals = new Map<string, ApprovalRequest>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'twin-autonomy-controller', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'twin-autonomy-controller', timestamp: new Date().toISOString() });
});

/**
 * Get autonomy settings
 */
app.get('/api/autonomy/:employeeId/settings', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  let userSettings = settings.get(employeeId);

  if (!userSettings) {
    userSettings = {
      employeeId,
      mode: 'assist',
      boundaries: [],
      confidenceThresholds: { critical: 99, high: 95, medium: 85, low: 70 },
      workingHours: {
        enabled: false,
        timezone: 'UTC',
        schedule: {}
      },
      notifications: { push: true, email: false, slack: true, threshold: 'high' },
      updatedAt: new Date().toISOString()
    };
    settings.set(employeeId, userSettings);
  }

  res.json({ success: true, data: userSettings });
});

/**
 * Update autonomy settings
 */
app.patch('/api/autonomy/:employeeId/settings',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    let userSettings = settings.get(employeeId);
    if (!userSettings) {
      userSettings = {
        employeeId,
        mode: 'assist',
        boundaries: [],
        confidenceThresholds: { critical: 99, high: 95, medium: 85, low: 70 },
        workingHours: { enabled: false, timezone: 'UTC', schedule: {} },
        notifications: { push: true, email: false, slack: true, threshold: 'high' },
        updatedAt: new Date().toISOString()
      };
    }

    Object.assign(userSettings, updates, { updatedAt: new Date().toISOString() });
    settings.set(employeeId, userSettings);

    res.json({ success: true, data: userSettings });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * Set autonomy mode
 */
app.post('/api/autonomy/:employeeId/mode',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { mode } = req.body;

    const validModes = ['shadow', 'assist', 'delegate', 'autonomous'];
    if (!validModes.includes(mode)) {
      const err: ApiError = new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`); err.statusCode = 400; throw err;
    }

    let userSettings = settings.get(employeeId);
    if (!userSettings) {
      userSettings = {
        employeeId,
        mode,
        boundaries: [],
        confidenceThresholds: { critical: 99, high: 95, medium: 85, low: 70 },
        workingHours: { enabled: false, timezone: 'UTC', schedule: {} },
        notifications: { push: true, email: false, slack: true, threshold: 'high' },
        updatedAt: new Date().toISOString()
      };
    } else {
      userSettings.mode = mode;
      userSettings.updatedAt = new Date().toISOString();
    }

    settings.set(employeeId, userSettings);

    res.json({ success: true, data: { mode, updatedAt: userSettings.updatedAt } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'MODE_ERROR', message: error.message } });
  }
});

/**
 * Add boundary
 */
app.post('/api/autonomy/:employeeId/boundaries',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { type, condition, allowed, maxValue } = req.body;

    if (!type || !condition) {
      const err: ApiError = new Error('type and condition are required'); err.statusCode = 400; throw err;
    }

    let userSettings = settings.get(employeeId);
    if (!userSettings) {
      userSettings = {
        employeeId,
        mode: 'assist',
        boundaries: [],
        confidenceThresholds: { critical: 99, high: 95, medium: 85, low: 70 },
        workingHours: { enabled: false, timezone: 'UTC', schedule: {} },
        notifications: { push: true, email: false, slack: true, threshold: 'high' },
        updatedAt: new Date().toISOString()
      };
    }

    const boundary: Boundary = {
      id: generateId('boundary'),
      type,
      condition,
      allowed: allowed !== false,
      maxValue
    };

    userSettings.boundaries.push(boundary);
    userSettings.updatedAt = new Date().toISOString();
    settings.set(employeeId, userSettings);

    res.status(201).json({ success: true, data: boundary });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'BOUNDARY_ERROR', message: error.message } });
  }
});

/**
 * Get boundaries
 */
app.get('/api/autonomy/:employeeId/boundaries', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const userSettings = settings.get(employeeId);

  res.json({ success: true, data: { boundaries: userSettings?.boundaries || [], total: userSettings?.boundaries.length || 0 } });
});

/**
 * Delete boundary
 */
app.delete('/api/autonomy/:employeeId/boundaries/:boundaryId',requireAuth,  (req: Request, res: Response) => {
  const { employeeId, boundaryId } = req.params;
  const userSettings = settings.get(employeeId);

  if (!userSettings) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Settings not found' } });
  }

  userSettings.boundaries = userSettings.boundaries.filter(b => b.id !== boundaryId);
  userSettings.updatedAt = new Date().toISOString();
  settings.set(employeeId, userSettings);

  res.json({ success: true, data: { deleted: boundaryId } });
});

/**
 * Check if task requires approval
 */
app.post('/api/autonomy/:employeeId/check-approval',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { confidence, type, amount, vendor } = req.body;

    const userSettings = settings.get(employeeId);
    if (!userSettings) {
      return res.json({ success: true, data: { requiresApproval: false, reason: 'Default settings (assist mode)' } });
    }

    // Check confidence threshold
    const threshold = userSettings.confidenceThresholds;
    let requiresApproval = false;
    let reason = '';

    if (confidence < threshold.critical) {
      requiresApproval = true;
      reason = 'Below critical confidence threshold';
    } else if (confidence < threshold.high && type === 'payment') {
      requiresApproval = true;
      reason = 'Payment requires high confidence';
    }

    // Check boundaries
    for (const boundary of userSettings.boundaries) {
      if (!boundary.allowed) {
        if (boundary.type === 'amount' && amount && amount > (boundary.maxValue || 0)) {
          requiresApproval = true;
          reason = `Amount exceeds boundary: ${boundary.condition}`;
        }
      }
    }

    res.json({
      success: true,
      data: {
        requiresApproval,
        reason,
        mode: userSettings.mode,
        confidence,
        threshold
      }
    });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'CHECK_ERROR', message: error.message } });
  }
});

/**
 * Get pending approvals
 */
app.get('/api/autonomy/:employeeId/pending-approvals', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const pendingApprovals = Array.from(approvals.values())
    .filter(a => a.employeeId === employeeId && a.status === 'pending');

  res.json({ success: true, data: { approvals: pendingApprovals, total: pendingApprovals.length } });
});

/**
 * Approve task
 */
app.post('/api/autonomy/:employeeId/approve/:taskId',requireAuth,  (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const approval = approvals.get(taskId);

    if (!approval) {
      const err: ApiError = new Error('Approval not found'); err.statusCode = 404; throw err;
    }

    approval.status = 'approved';
    approval.approverId = req.params.employeeId;

    res.json({ success: true, data: { taskId, status: 'approved' } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'APPROVE_ERROR', message: error.message } });
  }
});

/**
 * Reject task
 */
app.post('/api/autonomy/:employeeId/reject/:taskId',requireAuth,  (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const approval = approvals.get(taskId);

    if (!approval) {
      const err: ApiError = new Error('Approval not found'); err.statusCode = 404; throw err;
    }

    approval.status = 'rejected';
    approval.approverId = req.params.employeeId;

    res.json({ success: true, data: { taskId, status: 'rejected', reason } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'REJECT_ERROR', message: error.message } });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Twin Autonomy Controller - Started               ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Modes: Shadow, Assist, Delegate, Autonomous              ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
