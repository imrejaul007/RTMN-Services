/**
 * ConstitutionalOS - Port 4855
 * Mission, Values, Ethics, Red Lines, Authority Boundaries
 * Think: PolicyOS = How to act | ConstitutionalOS = Why and when NOT to act
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4855');
app.use(express.json());

// Types
interface Mission {
  id: string;
  text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'founder' | 'board' | 'compliance' | 'legal';
  active: boolean;
  createdAt: string;
}

interface Value {
  id: string;
  name: string;
  description: string;
  examples: string[];
  weight: number;
}

interface RedLine {
  id: string;
  rule: string;
  category: 'ethics' | 'legal' | 'safety' | 'compliance' | 'culture';
  severity: 'hard_stop' | 'warning' | 'approval_required';
  description: string;
  approvedBy: string;
  exceptions?: string[];
}

interface Authority {
  id: string;
  agentType: string;
  scope: string;
  maxValue?: number;
  requiresApproval?: number;
  blacklist: string[];
  whitelist?: string[];
}

interface Principle {
  id: string;
  name: string;
  statement: string;
  examples: { do: string; dont: string }[];
}

interface EscalationPath {
  id: string;
  scenario: string;
  levels: { level: number; role: string; contact: string; slack?: string }[];
  autoEscalateMinutes: number;
}

// Storage
const missions = new Map<string, Mission>();
const values = new Map<string, Value>();
const redLines = new Map<string, RedLine>();
const authorities = new Map<string, Authority>();
const principles = new Map<string, Principle>();
const escalations = new Map<string, EscalationPath>();
const logs: any[] = [];

// Initialize defaults
function initDefaults() {
  // Default red lines
  const defaults: RedLine[] = [
    { id: uuidv4(), rule: 'Never hire/fire employees autonomously', category: 'ethics', severity: 'hard_stop', description: 'Employment decisions require human approval', approvedBy: 'HR-HEAD' },
    { id: uuidv4(), rule: 'Never share customer PII externally', category: 'compliance', severity: 'hard_stop', description: 'Customer data stays internal', approvedBy: 'CISO' },
    { id: uuidv4(), rule: 'Never bypass approvals for transactions', category: 'safety', severity: 'hard_stop', description: 'All transactions need proper approval', approvedBy: 'FINANCE-CPO' },
    { id: uuidv4(), rule: 'Never interact with sanctioned entities', category: 'legal', severity: 'hard_stop', description: 'Check compliance before any international deal', approvedBy: 'LEGAL' },
    { id: uuidv4(), rule: 'Never make promises without legal review', category: 'culture', severity: 'warning', description: 'External commitments need legal review', approvedBy: 'LEGAL' },
  ];

  defaults.forEach(r => redLines.set(r.id, r));

  // Default values
  const defaultValues: Value[] = [
    { id: uuidv4(), name: 'Customer First', description: 'Customer needs always come first', examples: ['24/7 support', 'No hesitation refunds'], weight: 10 },
    { id: uuidv4(), name: 'Radical Transparency', description: 'Open books, open communication', examples: ['Share metrics', 'No hidden agendas'], weight: 8 },
    { id: uuidv4(), name: 'Move Fast', description: 'Speed matters', examples: ['Ship weekly', 'Iterate quickly'], weight: 7 },
  ];

  defaultValues.forEach(v => values.set(v.id, v));
}

initDefaults();

// Logging helper
function logDecision(type: string, data: any) {
  logs.unshift({ type, data, timestamp: new Date().toISOString() });
  if (logs.length > 1000) logs.pop();
}

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'constitutional-os', version: '1.0.0', redLines: redLines.size, values: values.size });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

// Missions
app.get('/api/missions', (_req, res) => {
  const active = Array.from(missions.values()).filter(m => m.active);
  res.json({ success: true, data: { missions: active, total: active.length } });
});

app.post('/api/missions', (req, res) => {
  const { text, priority, source } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text required' });

  const mission: Mission = {
    id: uuidv4(),
    text, priority: priority || 'medium',
    source: source || 'founder',
    active: true,
    createdAt: new Date().toISOString()
  };

  missions.set(mission.id, mission);
  logDecision('MISSION_ADDED', mission);
  res.status(201).json({ success: true, data: mission });
});

// Red Lines
app.get('/api/red-lines', (req, res) => {
  const { category, severity } = req.query;
  let all = Array.from(redLines.values());
  if (category) all = all.filter(r => r.category === category);
  if (severity) all = all.filter(r => r.severity === severity);
  res.json({ success: true, data: { redLines: all, total: all.length } });
});

app.post('/api/red-lines', (req, res) => {
  const { rule, category, severity } = req.body;
  if (!rule || !category || !severity) {
    return res.status(400).json({ success: false, error: 'rule, category, severity required' });
  }

  const redLine: RedLine = {
    id: uuidv4(), rule, category, severity,
    description: req.body.description || '',
    approvedBy: req.body.approvedBy || ''
  };

  redLines.set(redLine.id, redLine);
  logDecision('RED_LINE_ADDED', redLine);
  res.status(201).json({ success: true, data: redLine });
});

// Authorization check
app.post('/api/authorize', (req, res) => {
  const { agentType, action, value } = req.body;
  const agentAuths = Array.from(authorities.values()).filter(a => a.agentType === agentType);
  const hardStops = Array.from(redLines.values()).filter(r => {
    const actionLower = (action || '').toLowerCase();
    return r.severity === 'hard_stop' && r.rule.toLowerCase().split(' ').some(w => actionLower.includes(w));
  });

  const withinAuthority = agentAuths.some(a => {
    if (a.maxValue && value && value > a.maxValue) return false;
    if (a.blacklist?.some(b => action?.toLowerCase().includes(b.toLowerCase())) return false;
    return true;
  });

  const authorized = hardStops.length === 0 && withinAuthority;

  res.json({ success: true, data: { authorized, hardStops: hardStops.length, reason: authorized ? 'OK' : 'Constitutional violation' } });
});

// Values
app.get('/api/values', (_req, res) => {
  res.json({ success: true, data: { values: Array.from(values.values()) } });
});

app.post('/api/values', (req, res) => {
  const { name, description, examples } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });

  const value: Value = { id: uuidv4(), name, description: description || '', examples: examples || [], weight: req.body.weight || 5 };
  values.set(value.id, value);
  res.status(201).json({ success: true, data: value });
});

// Audit logs
app.get('/api/logs', (req, res) => {
  const { type, limit = 100 } = req.query;
  let filtered = logs;
  if (type) filtered = filtered.filter(l => l.type === type);
  res.json({ success: true, data: { logs: filtered.slice(0, Number(limit) } });
});

// 404 handler
app.use((_req: any, res: any) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({ success: false, error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`ConstitutionalOS started on port ${PORT} | RedLines: ${redLines.size} | Values: ${values.size}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });

export default app;
</parameter>
