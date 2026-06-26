/**
 * ConstitutionalOS - Port: 4855
 *
 * Mission, Values, Ethics, Red Lines, Authority Boundaries
 * Think: PolicyOS = How to act | ConstitutionalOS = Why and when NOT to act
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4855', 10);
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
  priority: number;
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

interface EscalationPath {
  id: string;
  scenario: string;
  levels: { level: number; role: string; contact: string; slack?: string }[];
  autoEscalateMinutes: number;
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

// Storage
const missions: Map<string, Mission> = new Map();
const values: Map<string, Value> = new Map();
const redLines: Map<string, RedLine> = new Map();
const escalations: Map<string, EscalationPath> = new Map();
const authorities: Map<string, Authority> = new Map();
const principles: Map<string, Principle> = new Map();
const logs: any[] = [];

// Initialize defaults
function initDefaults() {
  // Default missions
  const defaultMissions: Omit<Mission, 'id' | 'createdAt'>[] = [
    { text: 'Maximize long-term shareholder value', priority: 'high', source: 'founder', active: true },
    { text: 'Never compromise customer safety', priority: 'critical', source: 'legal', active: true },
    { text: 'Comply with all applicable laws', priority: 'critical', source: 'legal', active: true },
    { text: 'Protect customer data at all costs', priority: 'critical', source: 'compliance', active: true },
  ];

  defaultMissions.forEach(m => {
    const id = uuidv4();
    missions.set(id, { ...m, id, createdAt: new Date().toISOString() });
  });

  // Default red lines (never cross)
  const defaultRedLines: Omit<RedLine, 'id'>[] = [
    { rule: 'Never hire/fire without human approval', category: 'ethics', severity: 'hard_stop', description: 'Employment decisions require human sign-off', approvedBy: 'HR-HEAD' },
    { rule: 'Never share customer PII externally', category: 'compliance', severity: 'hard_stop', description: 'Customer data stays internal', approvedBy: 'CISO' },
    { rule: 'Never bypass approval for transactions above threshold', category: 'safety', severity: 'hard_stop', description: 'Transactions need proper approvals', approvedBy: 'FINANCE-CPO' },
    { rule: 'Never interact with sanctioned entities', category: 'legal', severity: 'hard_stop', description: 'Check before any international deal', approvedBy: 'LEGAL' },
    { rule: 'Never make promises without legal review', category: 'culture', severity: 'warning', description: 'External commitments need legal', approvedBy: 'LEGAL' },
  ];

  defaultRedLines.forEach(r => {
    const id = uuidv4();
    redLines.set(id, { ...r, id });
  });

  // Default values
  const defaultValues: Omit<Value, 'id'>[] = [
    { name: 'Customer First', description: 'Customer needs always come first', examples: ['24/7 support', 'No hesitation refunds'], weight: 10 },
    { name: 'Radical Transparency', description: 'Open books, open communication', examples: ['Share metrics', 'No hidden agendas'], weight: 8 },
    { name: 'Move Fast', description: 'Speed matters', examples: ['Ship weekly', 'Iterate quickly'], weight: 7 },
    { name: 'Ownership', description: 'Own outcomes, not tasks', examples: ['Finish what you start', 'No hand-offs'], weight: 9 },
  ];

  defaultValues.forEach(v => {
    const id = uuidv4();
    values.set(id, { ...v, id });
  });

  // Default principles
  const defaultPrinciples: Omit<Principle, 'id'>[] = [
    {
      name: 'Bias for Action',
      statement: 'In uncertainty, act. In doubt, ask.',
      examples: [{ do: 'Ship MVP', dont: 'Debate for months' }],
    },
    {
      name: 'Think Big',
      statement: 'Small thinking limits small results.',
      examples: [{ do: '10x improvements', dont: '5% gains only' }],
    },
  ];

  defaultPrinciples.forEach(p => {
    const id = uuidv4();
    principles.set(id, { ...p, id });
  });

  // Default escalation paths
  const defaultEscalations: Omit<EscalationPath, 'id'>[] = [
    { scenario: 'Data breach', levels: [{ level: 1, role: 'SECURITY-ONCALL', contact: '+91-800-XXX-XXXX' }, { level: 2, role: 'CISO', contact: 'ciso@company.com' }], autoEscalateMinutes: 5 },
    { scenario: 'Legal issue', levels: [{ level: 1, role: 'LEGAL', contact: 'legal@company.com' }], autoEscalateMinutes: 30 },
  ];

  defaultEscalations.forEach(e => {
    const id = uuidv4();
    escalations.set(id, { ...e, id });
  });
}

initDefaults();

app.use((req: any, _res, next) => { req.requestId = uuidv4(); next(); });

app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'constitutional-os',
  version: '1.0.0',
  summary: {
    missions: missions.size,
    redLines: redLines.size,
    values: values.size,
    principles: principles.size,
  }
}));

app.get('/ready', (_r, res) => res.json({ ready: true }));

// === MISSION ===
app.get('/api/missions', (_req, res) => {
  const all = Array.from(missions.values()).filter(m => m.active);
  res.json({ success: true, data: { missions: all, total: all.length } });
});

app.post('/api/missions', (req, res) => {
  const { text, priority, source } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text required' });
  const mission: Mission = {
    id: uuidv4(),
    text,
    priority: priority || 'medium',
    source: source || 'founder',
    active: true,
    createdAt: new Date().toISOString()
  };
  missions.set(mission.id, mission);
  logDecision('MISSION_ADDED', mission);
  res.status(201).json({ success: true, data: mission });
});

// === VALUES ===
app.get('/api/values', (_req, res) => {
  const all = Array.from(values.values()).sort((a, b) => b.weight - a.weight);
  res.json({ success: true, data: { values: all } });
});

app.post('/api/values', (req, res) => {
  const { name, description, examples, weight } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const value: Value = { id: uuidv4(), name, description: description || '', examples: examples || [], weight: weight || 5 };
  values.set(value.id, value);
  logDecision('VALUE_ADDED', value);
  res.status(201).json({ success: true, data: value });
});

// === RED LINES ===
app.get('/api/red-lines', (req, res) => {
  const { category, severity } = req.query;
  let all = Array.from(redLines.values());
  if (category) all = all.filter(r => r.category === category);
  if (severity) all = all.filter(r => r.severity === severity);
  res.json({ success: true, data: { redLines: all, total: all.length } });
});

app.post('/api/red-lines', (req, res) => {
  const { rule, category, severity, description, approvedBy, exceptions } = req.body;
  if (!rule || !category || !severity) return res.status(400).json({ success: false, error: 'rule, category, severity required' });
  const redLine: RedLine = { id: uuidv4(), rule, category, severity, description: description || '', approvedBy: approvedBy || '', exceptions: exceptions || [] };
  redLines.set(redLine.id, redLine);
  logDecision('RED_LINE_ADDED', redLine);
  res.status(201).json({ success: true, data: redLine });
});

// === CHECK RED LINES ===
app.post('/api/check/:actionType', (req, res) => {
  const { action, context } = req.body;
  const allRedLines = Array.from(redLines.values());

  const violations = [];
  for (const redLine of allRedLines) {
    // Simple keyword check (in production, use NLP)
    const keywords = redLine.rule.toLowerCase().split(' ');
    const actionLower = (action || '').toLowerCase();
    const matches = keywords.filter(k => actionLower.includes(k));

    if (matches.length >= 2) { // Multiple keyword matches
      violations.push({
        redLineId: redLine.id,
        rule: redLine.rule,
        severity: redLine.severity,
        category: redLine.category,
        matches,
      });
    }
  }

  const hardStops = violations.filter(v => v.severity === 'hard_stop');
  const warnings = violations.filter(v => v.severity === 'warning');
  const approvals = violations.filter(v => v.severity === 'approval_required');

  const decision = {
    allowed: hardStops.length === 0,
    hardStops: hardStops.length,
    warnings: warnings.length,
    requiresApproval: approvals.length > 0,
    violations,
    action,
    context,
    timestamp: new Date().toISOString(),
  };

  logDecision('RED_LINE_CHECK', decision);
  res.json({ success: true, data: decision });
});

// === AUTHORITY ===
app.get('/api/authority/:agentType', (req, res) => {
  const { agentType } = req.params;
  const auth = Array.from(authorities.values()).filter(a => a.agentType === agentType);
  res.json({ success: true, data: { authorities: auth } });
});

app.post('/api/authority', (req, res) => {
  const { agentType, scope, maxValue, blacklist, whitelist } = req.body;
  if (!agentType || !scope) return res.status(400).json({ success: false, error: 'agentType and scope required' });
  const auth: Authority = { id: uuidv4(), agentType, scope, maxValue, blacklist: blacklist || [], whitelist };
  authorities.set(auth.id, auth);
  res.status(201).json({ success: true, data: auth });
});

// === ESCALATION PATHS ===
app.get('/api/escalations', (_req, res) => res.json({ success: true, data: { paths: Array.from(escalations.values()) } }));

app.post('/api/escalations/:scenario/escalate', (req, res) => {
  const { scenario } = req.params;
  const paths = Array.from(escalations.values()).filter(e => e.scenario.toLowerCase().includes(scenario.toLowerCase()));
  if (paths.length === 0) return res.status(404).json({ success: false, error: 'No escalation path found' });

  const path = paths[0];
  logDecision('ESCALATION', { path, scenario });
  res.json({ success: true, data: { path, nextLevel: path.levels[0] } });
});

// === PRINCIPLES ===
app.get('/api/principles', (_req, res) => res.json({ success: true, data: { principles: Array.from(principles.values()) } }));

app.post('/api/principles', (req, res) => {
  const { name, statement, examples } = req.body;
  if (!name || !statement) return res.status(400).json({ success: false, error: 'name and statement required' });
  const principle: Principle = { id: uuidv4(), name, statement, examples: examples || [] };
  principles.set(principle.id, principle);
  res.status(201).json({ success: true, data: principle });
});

// === AUDIT LOG ===
app.get('/api/logs', (req, res) => {
  const { type, limit = 100 } = req.query;
  let filtered = logs;
  if (type) filtered = filtered.filter(l => l.type === type);
  res.json({ success: true, data: { logs: filtered.slice(-Number(limit) } });
});

function logDecision(type: string, data: any) {
  logs.push({ type, data, timestamp: new Date().toISOString(), requestId: uuidv4() });
  if (logs.length > 10000) logs.shift();
}

// Constitutional check endpoint for agents
app.post('/api/agent/:agentType/authorize', (req, res) => {
  const { agentType } = req.params;
  const { action, value } = req.body;

  const agentAuths = Array.from(authorities.values()).filter(a => a.agentType === agentType);
  const redLineViolations = Array.from(redLines.values()).filter(r => {
    const actionLower = (action || '').toLowerCase();
    return r.rule.toLowerCase().split(' ').some(k => actionLower.includes(k));
  });

  const hardStops = redLineViolations.filter(r => r.severity === 'hard_stop');
  const withinAuthority = agentAuths.some(a => {
    if (a.maxValue && value && value > a.maxValue) return false;
    if (a.blacklist?.some(b => action?.toLowerCase().includes(b.toLowerCase())) return false;
    return true;
  });

  const authorized = hardStops.length === 0 && withinAuthority;

  const decision = {
    agentType,
    action,
    authorized,
    hardStops: hardStops.length,
    warnings: redLineViolations.filter(r => r.severity === 'warning').length,
    requiresApproval: redLineViolations.some(r => r.severity === 'approval_required'),
    reason: authorized ? 'Within constitutional bounds' : 'Constitutional violation',
  };

  logDecision('AUTHORIZATION_CHECK', decision);
  res.json({ success: true, data: decision });
});

app.use((_req: any, res: any) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => {
  console.log(`ConstitutionalOS - Port ${PORT} | Mission: ${missions.size} | RedLines: ${redLines.size} | Values: ${values.size}`);
});
process.on('SIGTERM', () => server.close());
export default app;
