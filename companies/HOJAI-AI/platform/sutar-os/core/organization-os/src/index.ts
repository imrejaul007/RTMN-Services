/**
 * Organization OS - Org Structure and Capabilities
 * Port: 4871
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4871;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Department { id: string; name: string; parentId?: string; headId?: string; headName?: string; memberCount: number; budget?: number; }
interface Team { id: string; name: string; departmentId: string; leadId?: string; members: string[]; capabilities: string[]; }
interface Capability { id: string; name: string; level: 'beginner' | 'intermediate' | 'expert'; owners: string[]; }

const departments = new Map<string, Department>();
const teams = new Map<string, Team>();
const capabilities = new Map<string, Capability>();

// Seed defaults
departments.set('d1', { id: 'd1', name: 'Engineering', memberCount: 50, budget: 5000000 });
departments.set('d2', { id: 'd2', name: 'Sales', memberCount: 30, budget: 3000000 });
departments.set('d3', { id: 'd3', name: 'Marketing', memberCount: 20, budget: 2000000 });
teams.set('t1', { id: 't1', name: 'Frontend', departmentId: 'd1', members: ['u1', 'u2', 'u3'], capabilities: ['React', 'TypeScript'] });
teams.set('t2', { id: 't2', name: 'Backend', departmentId: 'd1', members: ['u4', 'u5'], capabilities: ['Node.js', 'PostgreSQL'] });
capabilities.set('c1', { id: 'c1', name: 'React', level: 'expert', owners: ['u1'] });
capabilities.set('c2', { id: 'c2', name: 'Node.js', level: 'expert', owners: ['u4'] });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'organization-os', uptime: Math.floor((Date.now() - START_TIME) / 1000) }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/structure', (_req, res) => {
  const deptList = Array.from(departments.values());
  const structure = deptList.map(d => ({ ...d, teams: Array.from(teams.values()).filter(t => t.departmentId === d.id) }));
  res.json({ structure });
});

app.get('/api/departments', (_req, res) => res.json({ departments: Array.from(departments.values()) }));
app.get('/api/departments/:id', (req, res) => { const d = departments.get(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); });
app.post('/api/departments', (req, res) => { const { name, parentId, budget } = req.body; const id = uuidv4(); departments.set(id, { id, name, memberCount: 0, budget }); res.status(201).json(departments.get(id)); });
app.put('/api/departments/:id', (req, res) => { const d = departments.get(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); Object.assign(d, req.body); res.json(d); });

app.get('/api/teams', (req, res) => { let result = Array.from(teams.values()); if (req.query.departmentId) result = result.filter(t => t.departmentId === req.query.departmentId); res.json({ teams: result }); });
app.get('/api/teams/:id', (req, res) => { const t = teams.get(req.params.id); if (!t) return res.status(404).json({ error: 'Not found' }); res.json(t); });
app.post('/api/teams', (req, res) => { const { name, departmentId, capabilities: caps } = req.body; const id = uuidv4(); teams.set(id, { id, name, departmentId, members: [], capabilities: caps || [] }); res.status(201).json(teams.get(id)); });
app.put('/api/teams/:id', (req, res) => { const t = teams.get(req.params.id); if (!t) return res.status(404).json({ error: 'Not found' }); Object.assign(t, req.body); res.json(t); });

app.get('/api/capabilities', (_req, res) => res.json({ capabilities: Array.from(capabilities.values()) }));
app.post('/api/capabilities', (req, res) => { const { name, level } = req.body; const id = uuidv4(); capabilities.set(id, { id, name, level, owners: [] }); res.status(201).json(capabilities.get(id)); });

app.get('/api/capabilities/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ capabilities: [] });
  const results = Array.from(capabilities.values()).filter(c => c.name.toLowerCase().includes((q as string).toLowerCase()));
  res.json({ capabilities: results });
});

app.listen(PORT, () => console.log(`[organization-os] listening on :${PORT}`));
export default app;