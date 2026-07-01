/**
 * LegalOS - Legal CRM + Matter Management
 */
import { Router } from 'express';
const router = Router();

export interface Matter { id: string; title: string; type: 'litigation'|'transaction'|'advisory'|'compliance'; status: 'active'|'pending'|'closed'; clientId: string; clientName: string; assignedTo: string[]; billable: boolean; billing?: BillingInfo; createdAt: Date; }
export interface BillingInfo { hours: number; rate: number; invoiced: number; outstanding: number; }
export interface Task { id: string; matterId: string; title: string; status: 'pending'|'in_progress'|'completed'; dueDate: Date; assignee: string; billing?: BillingInfo; }
export interface Document { id: string; matterId: string; type: 'contract'|'opinion'|'correspondence'; name: string; url: string; version: string; createdAt: Date; }

const matters = new Map<string, Matter>();
const tasks = new Map<string, Task[]>();
const docs = new Map<string, Document[]>();

router.post('/matters', (req, res) => {
  const m: Matter = { id: crypto.randomUUID(), ...req.body, status: 'active', createdAt: new Date() };
  matters.set(m.id, m);
  res.status(201).json({ success: true, matter: m });
});
router.get('/matters', (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(matters.values());
  if (status) result = result.filter(m => m.status === status);
  if (type) result = result.filter(m => m.type === type);
  res.json({ success: true, matters: result });
});
router.get('/matters/:id', (req, res) => {
  const m = matters.get(req.params.id);
  m ? res.json({ success: true, matter: m }) : res.status(404).json({ success: false, error: 'Not found' });
});
router.patch('/matters/:id', (req, res) => {
  const m = matters.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  Object.assign(m, req.body);
  matters.set(req.params.id, m);
  res.json({ success: true, matter: m });
});

router.post('/matters/:matterId/tasks', (req, res) => {
  const t: Task = { id: crypto.randomUUID(), matterId: req.params.matterId, ...req.body, status: 'pending' };
  const existing = tasks.get(req.params.matterId) || [];
  existing.push(t);
  tasks.set(req.params.matterId, existing);
  res.status(201).json({ success: true, task: t });
});
router.get('/matters/:matterId/tasks', (req, res) => res.json({ success: true, tasks: tasks.get(req.params.matterId) || [] }));
router.patch('/tasks/:id', (req, res) => {
  for (const [matterId, list] of tasks) {
    const t = list.find(x => x.id === req.params.id);
    if (t) { Object.assign(t, req.body); tasks.set(matterId, list); res.json({ success: true, task: t }); return; }
  }
  res.status(404).json({ error: 'Not found' });
});

router.post('/matters/:matterId/docs', (req, res) => {
  const d: Document = { id: crypto.randomUUID(), matterId: req.params.matterId, version: '1.0', createdAt: new Date(), ...req.body };
  const existing = docs.get(req.params.matterId) || [];
  existing.push(d);
  docs.set(req.params.matterId, existing);
  res.status(201).json({ success: true, document: d });
});
router.get('/matters/:matterId/docs', (req, res) => res.json({ success: true, documents: docs.get(req.params.matterId) || [] }));

router.get('/reports/billing', (req, res) => {
  const all = Array.from(matters.values()).filter(m => m.billing);
  res.json({ success: true, summary: { total: all.length, billable: all.filter(m => m.billable).length, totalHours: all.reduce((s, m) => s + (m.billing?.hours || 0), 0), outstanding: all.reduce((s, m) => s + (m.billing?.outstanding || 0), 0) } });
});

export default router;