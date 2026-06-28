import { requireAuth } from '@rtmn/shared/auth';
/**
 * Change Management OS - Production Implementation
 * Change requests, approvals, rollout tracking, rollback
 * Port: 4864
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4864;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface Change {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'bugfix' | 'hotfix' | 'infrastructure' | 'security';
  status: 'draft' | 'pending_approval' | 'approved' | 'testing' | 'rolling_out' | 'complete' | 'rollback' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  riskLevel: 'low' | 'medium' | 'high';
  owner: string;
  approvers: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  completedAt?: string;
  rollbackPlan: string;
  phases: ChangePhase[];
  metrics: { adoption: number; incidents: number; rollbacks: number; downtime: number };
}

interface ChangePhase {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  startedAt?: string;
  completedAt?: string;
  notes: string;
}

interface ChangeTemplate {
  id: string;
  name: string;
  type: string;
  phases: { name: string; order: number }[];
  riskLevel: string;
}

// In-memory store
const changes = new Map<string, Change>();
const templates = new Map<string, ChangeTemplate>();
const auditLogs: { action: string; changeId: string; user: string; timestamp: string }[] = [];

// Seed default templates
const defaultTemplates: ChangeTemplate[] = [
  { id: 'tpl-1', name: 'Feature Release', type: 'feature', phases: [{ name: 'Development', order: 1 }, { name: 'Code Review', order: 2 }, { name: 'QA Testing', order: 3 }, { name: 'Staging Deploy', order: 4 }, { name: 'Production Deploy', order: 5 }], riskLevel: 'medium' },
  { id: 'tpl-2', name: 'Hotfix', type: 'hotfix', phases: [{ name: 'Fix Development', order: 1 }, { name: 'Quick Review', order: 2 }, { name: 'Production Deploy', order: 3 }], riskLevel: 'low' },
  { id: 'tpl-3', name: 'Security Patch', type: 'security', phases: [{ name: 'Security Review', order: 1 }, { name: 'Fix Development', order: 2 }, { name: 'Testing', order: 3 }, { name: 'Emergency Deploy', order: 4 }], riskLevel: 'high' },
];
defaultTemplates.forEach(t => templates.set(t.id, t));

// Validation schemas
const CreateChangeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  type: z.enum(['feature', 'bugfix', 'hotfix', 'infrastructure', 'security']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  affectedServices: z.array(z.string()),
  riskLevel: z.enum(['low', 'medium', 'high']),
  owner: z.string(),
  approvers: z.array(z.string()),
  templateId: z.string().optional(),
  rollbackPlan: z.string(),
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'change-mgmt-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), changes: changes.size });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true });
});

// List changes
app.get('/api/changes', (req: Request, res: Response) => {
  const { status, priority, type, owner } = req.query;
  let result = Array.from(changes.values());
  if (status) result = result.filter(c => c.status === status);
  if (priority) result = result.filter(c => c.priority === priority);
  if (type) result = result.filter(c => c.type === type);
  if (owner) result = result.filter(c => c.owner === owner);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ total: result.length, changes: result });
});

// Get change
app.get('/api/changes/:id', (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });
  res.json(change);
});

// Create change
app.post('/api/changes',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = CreateChangeSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    let phases: ChangePhase[] = [];
    if (data.templateId) {
      const template = templates.get(data.templateId);
      if (template) {
        phases = template.phases.map(p => ({ id: uuidv4(), name: p.name, status: 'pending' as const, notes: '' }));
      }
    }

    const change: Change = {
      id, title: data.title, description: data.description, type: data.type,
      status: 'draft', priority: data.priority, affectedServices: data.affectedServices,
      riskLevel: data.riskLevel, owner: data.owner, approvers: data.approvers,
      createdAt: now, updatedAt: now, rollbackPlan: data.rollbackPlan,
      phases, metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 },
    };

    changes.set(id, change);
    auditLogs.push({ action: 'create', changeId: id, user: data.owner, timestamp: now });
    res.status(201).json(change);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Update change
app.put('/api/changes/:id',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });

  const { title, description, priority, affectedServices, rollbackPlan, phases } = req.body;
  if (title) change.title = title;
  if (description) change.description = description;
  if (priority) change.priority = priority;
  if (affectedServices) change.affectedServices = affectedServices;
  if (rollbackPlan) change.rollbackPlan = rollbackPlan;
  if (phases) change.phases = phases;
  change.updatedAt = new Date().toISOString();

  auditLogs.push({ action: 'update', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.updatedAt });
  res.json(change);
});

// Submit for approval
app.post('/api/changes/:id/submit',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });
  if (change.status !== 'draft') return res.status(400).json({ error: 'Only draft changes can be submitted' });

  change.status = 'pending_approval';
  change.updatedAt = new Date().toISOString();
  auditLogs.push({ action: 'submit', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.updatedAt });
  res.json(change);
});

// Approve change
app.post('/api/changes/:id/approve',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });
  if (change.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending changes can be approved' });

  change.status = 'approved';
  change.approvedAt = new Date().toISOString();
  change.updatedAt = change.approvedAt;
  auditLogs.push({ action: 'approve', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.approvedAt });
  res.json(change);
});

// Reject change
app.post('/api/changes/:id/reject',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });

  change.status = 'rejected';
  change.updatedAt = new Date().toISOString();
  auditLogs.push({ action: 'reject', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.updatedAt });
  res.json(change);
});

// Start rollout
app.post('/api/changes/:id/start',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });
  if (change.status !== 'approved') return res.status(400).json({ error: 'Only approved changes can be started' });

  change.status = 'testing';
  change.phases.forEach((p, i) => { if (i === 0) { p.status = 'in_progress'; p.startedAt = new Date().toISOString(); } });
  change.updatedAt = new Date().toISOString();
  auditLogs.push({ action: 'start', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.updatedAt });
  res.json(change);
});

// Complete phase
app.post('/api/changes/:id/phases/:phaseId/complete',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });

  const phase = change.phases.find(p => p.id === req.params.phaseId);
  if (!phase) return res.status(404).json({ error: 'Phase not found' });

  phase.status = 'complete';
  phase.completedAt = new Date().toISOString();
  phase.notes = req.body.notes || '';

  const nextPhase = change.phases.find(p => p.status === 'pending');
  if (nextPhase) {
    nextPhase.status = 'in_progress';
    nextPhase.startedAt = new Date().toISOString();
  } else {
    change.status = 'rolling_out';
  }
  change.updatedAt = new Date().toISOString();
  res.json(change);
});

// Complete change
app.post('/api/changes/:id/complete',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });

  change.status = 'complete';
  change.completedAt = new Date().toISOString();
  change.updatedAt = change.completedAt;
  change.phases.forEach(p => { if (p.status === 'in_progress') { p.status = 'complete'; p.completedAt = change.completedAt; } });
  change.metrics.adoption = req.body.adoption || 0;
  auditLogs.push({ action: 'complete', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.completedAt });
  res.json(change);
});

// Rollback
app.post('/api/changes/:id/rollback',requireAuth,  (req: Request, res: Response) => {
  const change = changes.get(req.params.id);
  if (!change) return res.status(404).json({ error: 'Change not found' });

  change.status = 'rollback';
  change.metrics.rollbacks++;
  change.updatedAt = new Date().toISOString();
  auditLogs.push({ action: 'rollback', changeId: change.id, user: req.get('x-user-email') || 'unknown', timestamp: change.updatedAt });
  res.json(change);
});

// Templates
app.get('/api/templates', (_req, res) => {
  res.json({ total: templates.size, templates: Array.from(templates.values()) });
});

// Audit logs
app.get('/api/audit', (req: Request, res: Response) => {
  const { changeId } = req.query;
  let logs = [...auditLogs];
  if (changeId) logs = logs.filter(l => l.changeId === changeId);
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ total: logs.length, logs });
});

// Statistics
app.get('/api/stats', (_req, res) => {
  const all = Array.from(changes.values());
  res.json({
    total: all.length,
    byStatus: { draft: all.filter(c => c.status === 'draft').length, pending: all.filter(c => c.status === 'pending_approval').length, approved: all.filter(c => c.status === 'approved').length, complete: all.filter(c => c.status === 'complete').length, rejected: all.filter(c => c.status === 'rejected').length, rolling: all.filter(c => c.status === 'rolling_out' || c.status === 'testing').length },
    totalRollbacks: all.reduce((sum, c) => sum + c.metrics.rollbacks, 0),
  });
});

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`[change-mgmt-os] listening on :${PORT}`));
export default app;
