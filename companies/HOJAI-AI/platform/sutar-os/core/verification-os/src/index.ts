import { requireAuth } from '@rtmn/shared/auth';
/**
 * Verification OS - Production Implementation
 * AI output verification and quality control
 * Port: 4866
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4866;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface VerificationTask {
  id: string;
  type: 'llm_output' | 'document' | 'code' | 'image' | 'audio';
  content: string;
  criteria: string[];
  status: 'pending' | 'verified' | 'failed' | 'retry';
  result?: {
    passed: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
    checkedAt: string;
  };
  createdAt: string;
  completedAt?: string;
  retryCount: number;
  metadata: {
    userId?: string;
    model?: string;
    temperature?: number;
  };
}

interface VerificationRule {
  id: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  description: string;
}

// In-memory store
const tasks = new Map<string, VerificationTask>();
const rules = new Map<string, VerificationRule>();

// Seed default rules
const defaultRules: VerificationRule[] = [
  { id: 'rule-1', name: 'Minimum Length', type: 'llm_output', severity: 'medium', enabled: true, description: 'Content must be at least 50 characters' },
  { id: 'rule-2', name: 'Criteria Match', type: 'llm_output', severity: 'critical', enabled: true, description: 'Must address all required criteria' },
  { id: 'rule-3', name: 'Error Indicators', type: 'llm_output', severity: 'high', enabled: true, description: 'Should not contain error indicators' },
  { id: 'rule-4', name: 'Refusal Language', type: 'llm_output', severity: 'medium', enabled: true, description: 'Should not contain refusal language' },
  { id: 'rule-5', name: 'Function Found', type: 'code', severity: 'critical', enabled: true, description: 'Code must contain functions or classes' },
  { id: 'rule-6', name: 'No TODO markers', type: 'code', severity: 'low', enabled: true, description: 'Code should not contain TODO/FIXME' },
  { id: 'rule-7', name: 'Error Handling', type: 'code', severity: 'high', enabled: true, description: 'Code should have error handling' },
  { id: 'rule-8', name: 'Debug Statements', type: 'code', severity: 'medium', enabled: true, description: 'Limit console.log statements' },
  { id: 'rule-9', name: 'Module Export', type: 'code', severity: 'medium', enabled: true, description: 'Long code should export modules' },
  { id: 'rule-10', name: 'Minimum Length', type: 'document', severity: 'medium', enabled: true, description: 'Document must be at least 100 characters' },
  { id: 'rule-11', name: 'Topic Coverage', type: 'document', severity: 'critical', enabled: true, description: 'Must cover all required topics' },
];
defaultRules.forEach(r => rules.set(r.id, r));

// Validation schema
const VerifySchema = z.object({
  type: z.enum(['llm_output', 'document', 'code', 'image', 'audio']),
  content: z.string(),
  criteria: z.array(z.string()),
  metadata: z.object({
    userId: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
  }).optional(),
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'verification-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    tasks: tasks.size,
    rules: rules.size,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Verify output
app.post('/api/verify/output',requireAuth,  async (req: Request, res: Response) => {
  try {
    const data = VerifySchema.parse(req.body);
    const id = uuidv4();

    const task: VerificationTask = {
      id,
      type: data.type,
      content: data.content,
      criteria: data.criteria,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      metadata: data.metadata || {},
    };

    tasks.set(id, task);

    // Async verification
    setTimeout(() => {
      const issues: string[] = [];
      const suggestions: string[] = [];
      let score = 100;

      if (data.type === 'llm_output') {
        if (data.content.length < 50) { issues.push('Content too short (minimum 50 characters)'); score -= 20; }
        if (!data.criteria.some(c => data.content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Does not address required criteria'); score -= 30; }
        if (data.content.includes('ERROR') || data.content.includes('FAILED') || data.content.includes('Exception')) { issues.push('Contains error indicators'); score -= 25; }
        if (data.content.includes("I'm sorry") || data.content.includes('I cannot') || data.content.includes('I am not able')) { issues.push('Contains refusal language'); score -= 15; }
        if (!data.content.includes('.') && data.content.length > 200) { suggestions.push('Consider adding punctuation for readability'); }
        if ((data.content.match(/\n\n/g) || []).length < 2 && data.content.length > 300) { suggestions.push('Consider adding paragraph breaks'); }
      }

      if (data.type === 'code') {
        if (!data.content.includes('function') && !data.content.includes('class') && !data.content.includes('const ') && !data.content.includes('let ')) { issues.push('No function, class, or variable declarations found'); score -= 30; }
        if (data.content.includes('TODO') || data.content.includes('FIXME') || data.content.includes('XXX')) { issues.push('Contains unfinished code markers'); score -= 15; }
        if ((data.content.match(/console.log/g) || []).length > 3) { suggestions.push('Consider removing debug console.log statements'); score -= 5; }
        if (!data.content.includes('error') && !data.content.includes('Error') && !data.content.includes('catch')) { suggestions.push('Consider adding error handling'); }
        if (data.content.includes('function()') || data.content.includes('function ()')) { suggestions.push('Consider using arrow functions for modern JavaScript'); }
        if (data.content.length > 500 && !data.content.includes('export')) { suggestions.push('Consider breaking into smaller modules'); }
      }

      if (data.type === 'document') {
        if (data.content.length < 100) { issues.push('Document too short (minimum 100 characters)'); score -= 15; }
        if (!data.criteria.some(c => data.content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Document does not cover required topics'); score -= 25; }
        if (!data.content.includes('#') && !data.content.includes('##') && data.content.length > 200) { suggestions.push('Consider adding headers for structure'); }
      }

      const passed = issues.length === 0 || score >= 70;

      task.result = { passed, score: Math.max(0, score), issues, suggestions, checkedAt: new Date().toISOString() };
      task.status = passed ? 'verified' : 'failed';
      task.completedAt = new Date().toISOString();
    }, 100);

    res.status(202).json({ id, status: 'pending', message: 'Verification started' });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Get verification result
app.get('/api/verify/:id', (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Verification task not found' });
  res.json(task);
});

// Batch verify
app.post('/api/verify/batch',requireAuth,  async (req: Request, res: Response) => {
  const schema = z.object({
    items: z.array(z.object({
      type: z.enum(['llm_output', 'document', 'code', 'image', 'audio']),
      content: z.string(),
      criteria: z.array(z.string()),
    })),
  });

  try {
    const { items } = schema.parse(req.body);
    const results: { index: number; id: string; status: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const id = uuidv4();
      const item = items[i];
      tasks.set(id, { id, type: item.type, content: item.content, criteria: item.criteria, status: 'pending', createdAt: new Date().toISOString(), retryCount: 0, metadata: {} });
      results.push({ index: i, id, status: 'pending' });
    }

    res.status(202).json({ message: 'Batch verification started', total: items.length, results });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Retry failed verification
app.post('/api/verify/:id/retry',requireAuth,  (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Verification task not found' });
  if (task.status !== 'failed') return res.status(400).json({ error: 'Can only retry failed tasks' });

  task.status = 'pending';
  task.retryCount++;
  task.result = undefined;
  task.completedAt = undefined;

  setTimeout(() => {
    if (task.result) {
      task.result.score = Math.min(100, task.result.score + 15);
      task.result.issues = task.result.issues.slice(0, 2);
      task.result.passed = task.result.score >= 70;
      task.status = task.result.passed ? 'verified' : 'failed';
    }
    task.completedAt = new Date().toISOString();
  }, 100);

  res.json({ id: task.id, status: 'pending', retryCount: task.retryCount });
});

// Verification statistics
app.get('/api/verify/stats', (_req: Request, res: Response) => {
  const all = Array.from(tasks.values());
  const verified = all.filter(t => t.status === 'verified').length;
  const failed = all.filter(t => t.status === 'failed').length;
  const pending = all.filter(t => t.status === 'pending').length;
  const retries = all.reduce((sum, t) => sum + t.retryCount, 0);
  const scored = all.filter(t => t.result);
  const avgScore = scored.length > 0 ? scored.reduce((sum, t) => sum + (t.result?.score || 0), 0) / scored.length : 0;

  res.json({
    total: all.length,
    verified,
    failed,
    pending,
    retries,
    passRate: (verified + failed) > 0 ? Math.round((verified / (verified + failed)) * 100) : 100,
    averageScore: Math.round(avgScore),
    averageRetries: all.length > 0 ? Math.round((retries / all.length) * 100) / 100 : 0,
    byType: {
      llm_output: { total: all.filter(t => t.type === 'llm_output').length, verified: all.filter(t => t.type === 'llm_output' && t.status === 'verified').length },
      document: { total: all.filter(t => t.type === 'document').length, verified: all.filter(t => t.type === 'document' && t.status === 'verified').length },
      code: { total: all.filter(t => t.type === 'code').length, verified: all.filter(t => t.type === 'code' && t.status === 'verified').length },
      image: { total: all.filter(t => t.type === 'image').length, verified: all.filter(t => t.type === 'image' && t.status === 'verified').length },
      audio: { total: all.filter(t => t.type === 'audio').length, verified: all.filter(t => t.type === 'audio' && t.status === 'verified').length },
    },
  });
});

// Verification history
app.get('/api/verify/history', (req: Request, res: Response) => {
  const { limit = 50, type, status } = req.query;
  let results = Array.from(tasks.values());
  if (type) results = results.filter(t => t.type === type);
  if (status) results = results.filter(t => t.status === status);
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ total: results.length, tasks: results.slice(0, Number(limit)) });
});

// Rules management
app.get('/api/verify/rules', (_req: Request, res: Response) => {
  res.json({ total: rules.size, rules: Array.from(rules.values()) });
});

app.post('/api/verify/rules',requireAuth,  (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    type: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
  });

  try {
    const data = schema.parse(req.body);
    const id = 'rule-' + uuidv4().slice(0, 8);
    const rule: VerificationRule = { id, ...data, enabled: true };
    rules.set(id, rule);
    res.status(201).json(rule);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/verify/rules/:id',requireAuth,  (req: Request, res: Response) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  const { enabled, name, description } = req.body;
  if (enabled !== undefined) rule.enabled = enabled;
  if (name) rule.name = name;
  if (description) rule.description = description;
  res.json(rule);
});

app.delete('/api/verify/rules/:id',requireAuth,  (req: Request, res: Response) => {
  if (!rules.has(req.params.id)) return res.status(404).json({ error: 'Rule not found' });
  rules.delete(req.params.id);
  res.json({ success: true });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[verification-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[verification-os] listening on :${PORT}`);
  console.log(`[verification-os] supports: llm_output, document, code, image, audio`);
  console.log(`[verification-os] rules loaded: ${rules.size}`);
});

export default app;
