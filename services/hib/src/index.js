// hib (4262) - Human-in-the-Loop Collaboration.
// Tasks → Assignments → Approvals → Escalations → Reviewers → SLAs → Audit
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'hib';
const PORT = parseInt(process.env.PORT || '4262', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const reviewers = new Map();   // rvId -> { id, name, email, skills[], available, sla_hours, completed, escalated }
const tasks = new Map();       // taskId -> { id, title, description, priority, payload, status, reviewer_id, sla_deadline, escalated, created, decided_at }
const approvals = new Map();   // appId -> { id, task_id, reviewer_id, decision, rationale, decided_at }
const escalations = new Map(); // escId -> { id, task_id, from_reviewer_id, to_reviewer_id, reason, created }
const queues = new Map();      // qId -> { id, name, reviewer_ids[], task_ids[] }
const auditLog = new Map();    // entryId -> { id, task_id, action, actor, ts, detail }

// Seed
(function seed() {
  ['alice', 'bob', 'carol'].forEach(name => {
    const id = uuid();
    reviewers.set(id, { id, name: `${name}-reviewer`, email: `${name}@example.com`,
      skills: ['general', name === 'carol' ? 'legal' : 'finance'], available: true,
      sla_hours: 24, completed: 0, escalated: 0, created: new Date().toISOString() });
  });
  const seedTasks = [
    { title: 'Review refund request', priority: 'high', payload: { amount: 1500, customer: 'Acme' } },
    { title: 'Approve marketing copy', priority: 'medium', payload: { campaign: 'summer-sale' } },
    { title: 'Sign contract amendment', priority: 'high', payload: { contract_id: 'C-123' } }
  ];
  seedTasks.forEach((t, i) => {
    const id = uuid();
    const rvId = [...reviewers.keys()][i % 3];
    const sla = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    tasks.set(id, { id, ...t, status: 'pending', reviewer_id: rvId, sla_deadline: sla, escalated: false,
      created: new Date().toISOString(), decided_at: null });
  });
  const qId = uuid();
  queues.set(qId, { id: qId, name: 'general-review', reviewer_ids: [...reviewers.keys()], task_ids: [] });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/reviewers', '/api/tasks', '/api/approvals', '/api/escalations', '/api/queues', '/api/audit']
})));

// Reviewers
app.get('/api/reviewers', (_req, res) => res.json(ok({ reviewers: [...reviewers.values()] })));
app.post('/api/reviewers', (req, res) => {
  const { name, email, skills = [], sla_hours = 24 } = req.body || {};
  if (!name || !email) return res.status(400).json(fail('name + email required'));
  const id = uuid();
  const r = { id, name, email, skills, available: true, sla_hours, completed: 0, escalated: 0, created: new Date().toISOString() };
  reviewers.set(id, r);
  res.status(201).json(ok({ reviewer: r }));
});

// Tasks
app.get('/api/tasks', (req, res) => {
  let list = [...tasks.values()];
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  if (req.query.reviewer_id) list = list.filter(t => t.reviewer_id === req.query.reviewer_id);
  if (req.query.priority) list = list.filter(t => t.priority === req.query.priority);
  res.json(ok({ tasks: list }));
});
app.get('/api/tasks/:id', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json(fail('task not found'));
  res.json(ok({ task: t }));
});
app.post('/api/tasks', (req, res) => {
  const { title, description = '', priority = 'medium', payload = {}, reviewer_id, sla_hours = 24 } = req.body || {};
  if (!title) return res.status(400).json(fail('title required'));
  let rvId = reviewer_id;
  if (!rvId) {
    const available = [...reviewers.values()].filter(r => r.available);
    if (available.length === 0) return res.status(400).json(fail('no available reviewer'));
    rvId = available.reduce((min, r) => r.completed < min.completed ? r : min).id;
  } else if (!reviewers.has(rvId)) {
    return res.status(400).json(fail('reviewer_id invalid'));
  }
  const id = uuid();
  const sla = new Date(Date.now() + sla_hours * 3600 * 1000).toISOString();
  const t = { id, title, description, priority, payload, status: 'pending',
    reviewer_id: rvId, sla_deadline: sla, escalated: false,
    created: new Date().toISOString(), decided_at: null };
  tasks.set(id, t);
  // Audit
  const aid = uuid();
  auditLog.set(aid, { id: aid, task_id: id, action: 'created', actor: 'system', ts: new Date().toISOString(), detail: { reviewer_id: rvId } });
  res.status(201).json(ok({ task: t }));
});
app.patch('/api/tasks/:id', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json(fail('task not found'));
  const allowed = ['title', 'description', 'priority', 'status'];
  allowed.forEach(k => { if (req.body[k] !== undefined) t[k] = req.body[k]; });
  tasks.set(t.id, t);
  res.json(ok({ task: t }));
});

// Approve / Reject
app.post('/api/tasks/:id/approve', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json(fail('task not found'));
  if (t.status !== 'pending') return res.status(400).json(fail('task already decided'));
  const { rationale = '' } = req.body || {};
  const reviewer = reviewers.get(t.reviewer_id);
  if (reviewer) { reviewer.completed++; reviewers.set(reviewer.id, reviewer); }
  t.status = 'approved';
  t.decided_at = new Date().toISOString();
  tasks.set(t.id, t);
  // Approval record
  const aid = uuid();
  approvals.set(aid, { id: aid, task_id: t.id, reviewer_id: t.reviewer_id, decision: 'approved', rationale, decided_at: t.decided_at });
  // Audit
  const auid = uuid();
  auditLog.set(auid, { id: auid, task_id: t.id, action: 'approved', actor: t.reviewer_id, ts: t.decided_at, detail: { rationale } });
  res.status(201).json(ok({ task: t, approval: approvals.get(aid) }));
});
app.post('/api/tasks/:id/reject', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json(fail('task not found'));
  if (t.status !== 'pending') return res.status(400).json(fail('task already decided'));
  const { rationale = '' } = req.body || {};
  const reviewer = reviewers.get(t.reviewer_id);
  if (reviewer) { reviewer.completed++; reviewers.set(reviewer.id, reviewer); }
  t.status = 'rejected';
  t.decided_at = new Date().toISOString();
  tasks.set(t.id, t);
  const aid = uuid();
  approvals.set(aid, { id: aid, task_id: t.id, reviewer_id: t.reviewer_id, decision: 'rejected', rationale, decided_at: t.decided_at });
  const auid = uuid();
  auditLog.set(auid, { id: auid, task_id: t.id, action: 'rejected', actor: t.reviewer_id, ts: t.decided_at, detail: { rationale } });
  res.status(201).json(ok({ task: t, approval: approvals.get(aid) }));
});

// Escalate
app.post('/api/tasks/:id/escalate', (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json(fail('task not found'));
  if (t.escalated) return res.status(400).json(fail('task already escalated'));
  const { reason = '' } = req.body || {};
  // Find next reviewer (anyone available who isn't current)
  const candidates = [...reviewers.values()].filter(r => r.available && r.id !== t.reviewer_id);
  if (candidates.length === 0) return res.status(400).json(fail('no other reviewers to escalate to'));
  const next = candidates[0];
  const fromId = t.reviewer_id;
  const oldReviewer = reviewers.get(fromId);
  if (oldReviewer) { oldReviewer.escalated++; reviewers.set(fromId, oldReviewer); }
  t.reviewer_id = next.id;
  t.escalated = true;
  t.sla_deadline = new Date(Date.now() + 12 * 3600 * 1000).toISOString(); // tighter SLA
  tasks.set(t.id, t);
  const eid = uuid();
  escalations.set(eid, { id: eid, task_id: t.id, from_reviewer_id: fromId, to_reviewer_id: next.id, reason, created: new Date().toISOString() });
  const auid = uuid();
  auditLog.set(auid, { id: auid, task_id: t.id, action: 'escalated', actor: fromId, ts: new Date().toISOString(), detail: { reason, to: next.id } });
  res.status(201).json(ok({ task: t, escalation: escalations.get(eid) }));
});

// Approvals listing
app.get('/api/approvals', (req, res) => {
  let list = [...approvals.values()];
  if (req.query.task_id) list = list.filter(a => a.task_id === req.query.task_id);
  res.json(ok({ approvals: list }));
});

// Escalations listing
app.get('/api/escalations', (_req, res) => res.json(ok({ escalations: [...escalations.values()] })));

// Queues
app.get('/api/queues', (_req, res) => res.json(ok({ queues: [...queues.values()] })));
app.post('/api/queues', (req, res) => {
  const { name, reviewer_ids = [] } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const q = { id, name, reviewer_ids, task_ids: [] };
  queues.set(id, q);
  res.status(201).json(ok({ queue: q }));
});

// Audit
app.get('/api/audit', (req, res) => {
  let list = [...auditLog.values()];
  if (req.query.task_id) list = list.filter(a => a.task_id === req.query.task_id);
  res.json(ok({ audit: list }));
});

// Stats
app.get('/api/stats', (_req, res) => {
  const total = tasks.size;
  const pending = [...tasks.values()].filter(t => t.status === 'pending').length;
  const approved = [...tasks.values()].filter(t => t.status === 'approved').length;
  const rejected = [...tasks.values()].filter(t => t.status === 'rejected').length;
  const escalated = [...tasks.values()].filter(t => t.escalated).length;
  res.json(ok({ stats: { total, pending, approved, rejected, escalated, reviewers: reviewers.size } }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
