/**
 * SafetyOS - Port: 4862
 *
 * Kill switches, rate limits, behavior monitoring, containment
 * Think: Airbag for AI agents
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4862', 10);
app.use(express.json());

// Types
interface KillSwitch { id: string; name: string; scope: 'global' | 'agent' | 'team' | 'action'; target?: string; enabled: boolean; triggeredAt?: string; triggeredBy?: string; reason?: string; }
interface RateLimit { id: string; agentType: string; action: string; maxPerMinute: number; maxPerHour: number; currentMinute: number; currentHour: number; window: string; }
interface BehaviorRule { id: string; pattern: string; category: 'spam' | 'compliance' | 'safety' | 'cost'; severity: 'warning' | 'critical'; action: 'block' | 'review' | 'log'; }
interface Containment { id: string; agentId: string; reason: string; isolated: boolean; createdAt: string; }

// Storage
const killSwitches: Map<string, KillSwitch> = new Map();
const rateLimits: Map<string, RateLimit> = new Map();
const behaviorRules: Map<string, BehaviorRule> = new Map();
const containment: Map<string, Containment> = new Map();
const events: any[] = [];

// Default rules
const defaultKillSwitches: KillSwitch[] = [
  { id: 'global_bulk_email', name: 'Bulk Email Blaster', scope: 'global', target: 'email.bulk_send', enabled: true },
  { id: 'global_payment_auto', name: 'Auto-Pay Without Approval', scope: 'global', target: 'payment.auto_approve', enabled: true },
  { id: 'global_data_export', name: 'Customer Data Export', scope: 'global', target: 'data.export_pii', enabled: true },
  { id: 'agent_hire_fire', name: 'Auto Hire/Fire', scope: 'global', target: 'hr.employment', enabled: true },
];

defaultKillSwitches.forEach(k => killSwitches.set(k.id, k));

const defaultRules: BehaviorRule[] = [
  { id: 'spam_detection', pattern: 'mass_message', category: 'spam', severity: 'critical', action: 'block' },
  { id: 'pii_protection', pattern: 'export_user_data', category: 'compliance', severity: 'critical', action: 'review' },
  { id: 'cost_guard', pattern: 'unlimited_api', category: 'cost', severity: 'warning', action: 'log' },
];

defaultRules.forEach(r => behaviorRules.set(r.id, r));

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'safety-os', version: '1.0.0' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

// Kill Switches
app.get('/api/killswitches', (req, res) => {
  const { scope, enabled } = req.query;
  let all = Array.from(killSwitches.values());
  if (scope) all = all.filter(k => k.scope === scope);
  if (enabled !== undefined) all = all.filter(k => k.enabled === (enabled === 'true'));
  res.json({ success: true, data: { switches: all } });
});

app.post('/api/killswitches',requireAuth,  (req, res) => {
  const { name, scope, target } = req.body;
  if (!name || !scope) return res.status(400).json({ success: false, error: 'name and scope required' });
  const sw: KillSwitch = { id: uuidv4(), name, scope, target, enabled: true, createdAt: new Date().toISOString() };
  killSwitches.set(sw.id, sw);
  log('KILLSWITCH_ADDED', sw);
  res.status(201).json({ success: true, data: sw });
});

app.post('/api/killswitches/:id/trigger',requireAuth,  (req, res) => {
  const sw = killSwitches.get(req.params.id);
  if (!sw) return res.status(404).json({ success: false, error: 'Switch not found' });
  sw.enabled = false;
  sw.triggeredAt = new Date().toISOString();
  sw.triggeredBy = req.body.triggeredBy || 'system';
  sw.reason = req.body.reason;
  log('KILLSWITCH_TRIGGERED', sw);
  res.json({ success: true, data: sw });
});

app.post('/api/killswitches/:id/enable',requireAuth,  (req, res) => {
  const sw = killSwitches.get(req.params.id);
  if (!sw) return res.status(404).json({ success: false, error: 'Switch not found' });
  sw.enabled = true;
  delete sw.triggeredAt;
  log('KILLSWITCH_ENABLED', { id: sw.id });
  res.json({ success: true, data: sw });
});

// Rate Limiting
app.get('/api/ratelimits', (_req, res) => res.json({ success: true, data: { limits: Array.from(rateLimits.values()) }));

app.post('/api/ratelimits',requireAuth,  (req, res) => {
  const { agentType, action, maxPerMinute = 100, maxPerHour = 1000 } = req.body;
  if (!agentType) return res.status(400).json({ success: false, error: 'agentType required' });
  const limit: RateLimit = { id: uuidv4(), agentType, action: action || 'all', maxPerMinute, maxPerHour, currentMinute: 0, currentHour: 0, window: new Date().toISOString() };
  rateLimits.set(limit.id, limit);
  res.status(201).json({ success: true, data: limit });
});

app.post('/api/check/:agentType/:action',requireAuth,  (req, res) => {
  const { agentType, action } = req.params;
  const limit = Array.from(rateLimits.values()).find(l => l.agentType === agentType && l.action === action);
  if (!limit) return res.json({ success: true, data: { allowed: true, reason: 'No rate limit' });
  const allowed = limit.currentMinute < limit.maxPerMinute;
  if (!allowed) log('RATELIMIT_TRIGGERED', { agentType, action });
  res.json({ success: true, data: { allowed, current: limit.currentMinute, limit: limit.maxPerMinute } });
});

// Behavior Rules
app.get('/api/rules', (req, res) => {
  const { category } = req.query;
  let all = Array.from(behaviorRules.values());
  if (category) all = all.filter(r => r.category === category);
  res.json({ success: true, data: { rules: all } });
});

app.post('/api/rules',requireAuth,  (req, res) => {
  const { pattern, category, severity, action } = req.body;
  const rule: BehaviorRule = { id: uuidv4(), pattern, category, severity, action };
  behaviorRules.set(rule.id, rule);
  res.status(201).json({ success: true, data: rule });
});

// Containment
app.get('/api/containment/:agentId', (req, res) => {
  const c = containment.get(req.params.agentId);
  res.json({ success: true, data: c || { isolated: false } });
});

app.post('/api/contain/:agentId',requireAuth,  (req, res) => {
  const { reason } = req.body;
  containment.set(req.params.agentId, { id: uuidv4(), agentId: req.params.agentId, reason: reason || 'Manual containment', isolated: true, createdAt: new Date().toISOString() });
  log('AGENT_CONTAINED', { agentId: req.params.agentId, reason });
  res.status(201).json({ success: true, data: { contained: true } });
});

app.post('/api/release/:agentId',requireAuth,  (req, res) => {
  containment.delete(req.params.agentId);
  log('AGENT_RELEASED', { agentId: req.params.agentId });
  res.json({ success: true, data: { released: true } });
});

// Global emergency stop
app.post('/api/emergency/stop',requireAuth,  (req, res) => {
  const { reason, triggeredBy } = req.body;
  killSwitches.forEach((sw, id) => { sw.enabled = false; sw.triggeredBy = triggeredBy; sw.reason = reason; sw.triggeredAt = new Date().toISOString(); });
  containment.forEach((_, agentId) => containment.set(agentId, { ...containment.get(agentId)!, isolated: true }));
  log('GLOBAL_EMERGENCY_STOP', { reason, triggeredBy });
  res.json({ success: true, data: { stopped: true, affected: killSwitches.size } });
});

app.post('/api/emergency/resume',requireAuth,  (_req, res) => {
  killSwitches.forEach(sw => { sw.enabled = true; delete sw.triggeredAt; });
  res.json({ success: true, data: { resumed: true } });
});

function log(type: string, data: any) {
  events.unshift({ type, data, timestamp: new Date().toISOString(), id: uuidv4() });
  if (events.length > 1000) events.pop();
}

app.get('/api/events', (req, res) => {
  const { type, limit = 100 } = req.query;
  let filtered = events;
  if (type) filtered = filtered.filter(e => e.type === type);
  res.json({ success: true, data: { events: filtered.slice(0, Number(limit) } });
}

app.listen(PORT, () => console.log(`SafetyOS - Port ${PORT}`));
process.on('SIGTERM', () => process.exit(0));
export default app;
