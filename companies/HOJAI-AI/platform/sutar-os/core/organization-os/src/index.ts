import { requireAuth } from '@rtmn/shared/auth';
/**
 * Organization OS - Production Implementation
 * Org Structure, Capabilities, Reporting Lines
 * Port: 4871
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4871;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============

interface OrgNode {
  id: string;
  type: 'person' | 'department' | 'team' | 'role';
  name: string;
  title?: string;
  email?: string;
  parentId?: string;
  managerId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  departmentId?: string;
  leadId?: string;
  members: string[];
  capabilities: string[];
  skills: string[];
  headcount: number;
  budget?: number;
}

interface Capability {
  id: string;
  name: string;
  category: 'technical' | 'business' | 'leadership' | 'domain';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  owners: string[];
  description: string;
  certifications?: string[];
}

interface Delegation {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  scope: string[];
  startDate: string;
  endDate?: string;
  active: boolean;
}

interface Role {
  id: string;
  name: string;
  level: 'individual' | 'manager' | 'director' | 'vp' | 'cxo';
  department?: string;
  responsibilities: string[];
  requirements: string[];
  compensation?: { min: number; max: number; currency: string };
}

// ============ STORES ============

const nodes = new Map<string, OrgNode>();
const teams = new Map<string, Team>();
const capabilities = new Map<string, Capability>();
const delegations = new Map<string, Delegation>();
const roles = new Map<string, Role>();

// ============ SEED DATA ============

const seedNodes: OrgNode[] = [
  { id: 'ceo', type: 'person', name: 'Jane CEO', title: 'Chief Executive Officer', email: 'ceo@company.com', metadata: { joined: '2020-01-01' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cto', type: 'person', name: 'Bob CTO', title: 'Chief Technology Officer', email: 'cto@company.com', parentId: 'ceo', metadata: { joined: '2020-01-01' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cfo', type: 'person', name: 'Alice CFO', title: 'Chief Financial Officer', email: 'cfo@company.com', parentId: 'ceo', metadata: { joined: '2020-03-01' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'dept-eng', type: 'department', name: 'Engineering', managerId: 'cto', metadata: { budget: 5000000 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'dept-sales', type: 'department', name: 'Sales', managerId: 'cfo', metadata: { budget: 3000000 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'dept-hr', type: 'department', name: 'Human Resources', metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'role-swe', type: 'role', name: 'Software Engineer', level: 'individual', department: 'dept-eng', responsibilities: ['Code', 'Review', 'Test'], requirements: ['CS Degree', '3+ years'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'role-mgr', type: 'role', name: 'Engineering Manager', level: 'manager', department: 'dept-eng', responsibilities: ['Lead', 'Hire', 'Mentor'], requirements: ['5+ years', 'Management experience'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
seedNodes.forEach(n => nodes.set(n.id, n));

const seedTeams: Team[] = [
  { id: 'team-frontend', name: 'Frontend', departmentId: 'dept-eng', members: ['e1', 'e2', 'e3'], capabilities: ['React', 'TypeScript', 'CSS'], skills: ['UI Design', 'Animation'], headcount: 3, budget: 500000 },
  { id: 'team-backend', name: 'Backend', departmentId: 'dept-eng', members: ['e4', 'e5'], capabilities: ['Node.js', 'PostgreSQL', 'Redis'], skills: ['API Design', 'Database'], headcount: 2, budget: 400000 },
  { id: 'team-devops', name: 'DevOps', departmentId: 'dept-eng', members: ['e6'], capabilities: ['Kubernetes', 'AWS', 'Terraform'], skills: ['CI/CD', 'Monitoring'], headcount: 1, budget: 300000 },
  { id: 'team-sales-1', name: 'Enterprise Sales', departmentId: 'dept-sales', members: ['s1', 's2'], capabilities: ['Negotiation', 'Account Management'], skills: ['Enterprise Sales'], headcount: 2 },
];
seedTeams.forEach(t => teams.set(t.id, t));

const seedCapabilities: Capability[] = [
  { id: 'cap-react', name: 'React', category: 'technical', level: 'expert', owners: ['e1', 'e2'], description: 'React.js framework', certifications: ['Meta Frontend Developer'] },
  { id: 'cap-node', name: 'Node.js', category: 'technical', level: 'expert', owners: ['e4'], description: 'Node.js runtime', certifications: ['Node.js Developer'] },
  { id: 'cap-k8s', name: 'Kubernetes', category: 'technical', level: 'advanced', owners: ['e6'], description: 'Container orchestration', certifications: ['CKA'] },
  { id: 'cap-leadership', name: 'Leadership', category: 'leadership', level: 'advanced', owners: ['cto', 'cfo'], description: 'Team leadership', certifications: [] },
  { id: 'cap-sales', name: 'Enterprise Sales', category: 'business', level: 'expert', owners: ['s1'], description: 'B2B sales', certifications: [] },
];
seedCapabilities.forEach(c => capabilities.set(c.id, c));

// ============ VALIDATION ============

const CreateNodeSchema = z.object({
  type: z.enum(['person', 'department', 'team', 'role']),
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============ HEALTH ============

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'organization-os',
  uptime: Math.floor((Date.now() - START_TIME) / 1000),
  nodes: nodes.size, teams: teams.size, capabilities: capabilities.size,
}));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ ORG CHART ============

app.get('/api/org-chart', (_req, res) => {
  const chart: Record<string, unknown>[] = [];
  const rootNodes = Array.from(nodes.values()).filter(n => !n.parentId);

  for (const root of rootNodes) {
    const buildTree = (node: OrgNode): Record<string, unknown> => {
      const children = Array.from(nodes.values()).filter(n => n.parentId === node.id);
      const nodeTeams = Array.from(teams.values()).filter(t => t.departmentId === node.id);
      return {
        ...node,
        children: children.map(buildTree),
        teams: nodeTeams,
      };
    };
    chart.push(buildTree(root));
  }

  res.json({ chart });
});

app.get('/api/structure', (_req, res) => {
  const departments = Array.from(nodes.values()).filter(n => n.type === 'department');
  const structure = departments.map(d => ({
    ...d,
    teams: Array.from(teams.values()).filter(t => t.departmentId === d.id),
    members: Array.from(nodes.values()).filter(n => n.parentId === d.id),
    manager: d.managerId ? nodes.get(d.managerId) : undefined,
  }));
  res.json({ structure });
});

// ============ NODES ============

app.get('/api/nodes', (req, res) => {
  const { type, parentId, search } = req.query;
  let result = Array.from(nodes.values());
  if (type) result = result.filter(n => n.type === type);
  if (parentId) result = result.filter(n => n.parentId === parentId);
  if (search) result = result.filter(n => n.name.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ total: result.length, nodes: result });
});

app.get('/api/nodes/:id', (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const children = Array.from(nodes.values()).filter(n => n.parentId === node.id);
  const teams_ = Array.from(teams.values()).filter(t => t.departmentId === node.id);
  const reports = Array.from(nodes.values()).filter(n => n.managerId === node.id);

  res.json({ ...node, children, teams: teams_, directReports: reports });
});

app.post('/api/nodes',requireAuth,  (req, res) => {
  try {
    const data = CreateNodeSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();
    const node: OrgNode = { id, ...data, metadata: data.metadata || {}, createdAt: now, updatedAt: now };
    nodes.set(id, node);
    res.status(201).json(node);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/nodes/:id',requireAuth,  (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  Object.assign(node, req.body);
  node.updatedAt = new Date().toISOString();
  res.json(node);
});

app.delete('/api/nodes/:id',requireAuth,  (req, res) => {
  if (!nodes.has(req.params.id)) return res.status(404).json({ error: 'Node not found' });
  nodes.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/nodes/:id/reports', (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const directReports = Array.from(nodes.values()).filter(n => n.managerId === node.id);
  res.json({ manager: node, directReports });
});

app.get('/api/nodes/:id/ancestors', (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const ancestors: OrgNode[] = [];
  let current = node;
  while (current.parentId) {
    const parent = nodes.get(current.parentId);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else break;
  }

  res.json({ node, ancestors });
});

// ============ TEAMS ============

app.get('/api/teams', (req, res) => {
  const { departmentId, capability } = req.query;
  let result = Array.from(teams.values());
  if (departmentId) result = result.filter(t => t.departmentId === departmentId);
  if (capability) result = result.filter(t => t.capabilities.includes(capability as string));
  res.json({ total: result.length, teams: result });
});

app.get('/api/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const members = team.members.map(id => nodes.get(id)).filter(Boolean);
  const lead = team.leadId ? nodes.get(team.leadId) : undefined;
  const dept = team.departmentId ? nodes.get(team.departmentId) : undefined;

  res.json({ ...team, members, lead, department: dept });
});

app.post('/api/teams',requireAuth,  (req, res) => {
  const { name, departmentId, leadId, capabilities, skills, headcount, budget } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuidv4();
  teams.set(id, { id, name, departmentId, leadId, members: [], capabilities: capabilities || [], skills: skills || [], headcount: headcount || 0, budget });
  res.status(201).json(teams.get(id));
});

app.put('/api/teams/:id',requireAuth,  (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  Object.assign(team, req.body);
  res.json(team);
});

// ============ CAPABILITIES ============

app.get('/api/capabilities', (req, res) => {
  const { category, level, search } = req.query;
  let result = Array.from(capabilities.values());
  if (category) result = result.filter(c => c.category === category);
  if (level) result = result.filter(c => c.level === level);
  if (search) result = result.filter(c => c.name.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ total: result.length, capabilities: result });
});

app.get('/api/capabilities/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ capabilities: [] });

  const results = Array.from(capabilities.values()).filter(c =>
    c.name.toLowerCase().includes((q as string).toLowerCase()) ||
    c.description.toLowerCase().includes((q as string).toLowerCase())
  );
  res.json({ capabilities: results });
});

app.post('/api/capabilities',requireAuth,  (req, res) => {
  const { name, category, level, description, certifications } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name, category required' });

  const id = uuidv4();
  capabilities.set(id, { id, name, category, level: level || 'intermediate', owners: [], description: description || '', certifications: certifications || [] });
  res.status(201).json(capabilities.get(id));
});

// ============ DELEGATIONS ============

app.get('/api/delegations', (req, res) => {
  const { active, fromNodeId, toNodeId } = req.query;
  let result = Array.from(delegations.values());
  if (active === 'true') result = result.filter(d => d.active);
  if (fromNodeId) result = result.filter(d => d.fromNodeId === fromNodeId);
  if (toNodeId) result = result.filter(d => d.toNodeId === toNodeId);
  res.json({ total: result.length, delegations: result });
});

app.post('/api/delegations',requireAuth,  (req, res) => {
  const { fromNodeId, toNodeId, scope, startDate, endDate } = req.body;
  if (!fromNodeId || !toNodeId || !startDate) return res.status(400).json({ error: 'fromNodeId, toNodeId, startDate required' });

  const id = uuidv4();
  delegations.set(id, { id, fromNodeId, toNodeId, scope: scope || [], startDate, endDate, active: true });
  res.status(201).json(delegations.get(id));
});

app.post('/api/delegations/:id/revoke',requireAuth,  (req, res) => {
  const delegation = delegations.get(req.params.id);
  if (!delegation) return res.status(404).json({ error: 'Delegation not found' });
  delegation.active = false;
  res.json(delegation);
});

// ============ ROLES ============

app.get('/api/roles', (req, res) => {
  const { level, department } = req.query;
  let result = Array.from(roles.values());
  if (level) result = result.filter(r => r.level === level);
  if (department) result = result.filter(r => r.department === department);
  res.json({ total: result.length, roles: result });
});

app.post('/api/roles',requireAuth,  (req, res) => {
  const { name, level, department, responsibilities, requirements, compensation } = req.body;
  if (!name || !level) return res.status(400).json({ error: 'name, level required' });

  const id = uuidv4();
  roles.set(id, { id, name, level, department, responsibilities: responsibilities || [], requirements: requirements || [], compensation });
  res.status(201).json(roles.get(id));
});

// ============ STATS ============

app.get('/api/stats', (_req, res) => {
  res.json({
    totalNodes: nodes.size,
    byType: {
      person: Array.from(nodes.values()).filter(n => n.type === 'person').length,
      department: Array.from(nodes.values()).filter(n => n.type === 'department').length,
      team: Array.from(nodes.values()).filter(n => n.type === 'team').length,
      role: Array.from(nodes.values()).filter(n => n.type === 'role').length,
    },
    totalTeams: teams.size,
    totalCapabilities: capabilities.size,
    activeDelegations: Array.from(delegations.values()).filter(d => d.active).length,
  });
});

app.listen(PORT, () => console.log(`[organization-os] listening on :${PORT}`));
export default app;