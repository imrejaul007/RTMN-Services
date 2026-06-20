// ai-workspace (4263) - Collaborative AI workspace.
// Workspaces → Members → Documents → Threads → Comments → Mentions → Shares → Presence
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'ai-workspace';
const PORT = parseInt(process.env.PORT || '4263', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const workspaces = new Map();  // wsId -> { id, name, description, owner_id, plan, member_ids[], created }
const members = new Map();     // memberId -> { id, workspace_id, user_id, role, joined }
const documents = new Map();   // docId -> { id, workspace_id, title, content, author_id, version, updated }
const threads = new Map();     // threadId -> { id, document_id, title, status, created_by, created }
const comments = new Map();    // commentId -> { id, thread_id, author_id, body, mentions[], created }
const shares = new Map();      // shareId -> { id, workspace_id, document_id, share_with, permission, created }
const presence = new Map();    // userId -> { user_id, workspace_id, status, last_seen, current_document_id }

// Seed
(function seed() {
  const wsId = uuid();
  workspaces.set(wsId, { id: wsId, name: 'Engineering', description: 'Eng team workspace',
    owner_id: 'u-alice', plan: 'pro', member_ids: ['u-alice', 'u-bob', 'u-carol'], created: new Date().toISOString() });
  ['u-alice', 'u-bob', 'u-carol'].forEach(uid => {
    const id = uuid();
    members.set(id, { id, workspace_id: wsId, user_id: uid, role: uid === 'u-alice' ? 'owner' : 'editor', joined: new Date().toISOString() });
  });
  const docId = uuid();
  documents.set(docId, { id: docId, workspace_id: wsId, title: 'Project Plan',
    content: '# Project Plan\n\nThis is the plan.', author_id: 'u-alice', version: 1, updated: new Date().toISOString() });
  const tId = uuid();
  threads.set(tId, { id: tId, document_id: docId, title: 'Discussion', status: 'open', created_by: 'u-bob', created: new Date().toISOString() });
  const cId = uuid();
  comments.set(cId, { id: cId, thread_id: tId, author_id: 'u-bob', body: 'What about the deadline?', mentions: ['u-alice'], created: new Date().toISOString() });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/workspaces', '/api/members', '/api/documents', '/api/threads', '/api/comments', '/api/shares', '/api/presence']
})));

// Workspaces
app.get('/api/workspaces', (_req, res) => res.json(ok({ workspaces: [...workspaces.values()] })));
app.get('/api/workspaces/:id', (req, res) => {
  const w = workspaces.get(req.params.id);
  if (!w) return res.status(404).json(fail('workspace not found'));
  res.json(ok({ workspace: w }));
});
app.post('/api/workspaces', (req, res) => {
  const { name, description = '', owner_id, plan = 'free', member_ids = [] } = req.body || {};
  if (!name || !owner_id) return res.status(400).json(fail('name + owner_id required'));
  const id = uuid();
  const w = { id, name, description, owner_id, plan,
    member_ids: member_ids.includes(owner_id) ? member_ids : [owner_id, ...member_ids],
    created: new Date().toISOString() };
  workspaces.set(id, w);
  // Add members
  w.member_ids.forEach(uid => {
    const mid = uuid();
    members.set(mid, { id: mid, workspace_id: id, user_id: uid, role: uid === owner_id ? 'owner' : 'editor', joined: new Date().toISOString() });
  });
  res.status(201).json(ok({ workspace: w }));
});

// Members
app.get('/api/members', (req, res) => {
  let list = [...members.values()];
  if (req.query.workspace_id) list = list.filter(m => m.workspace_id === req.query.workspace_id);
  res.json(ok({ members: list }));
});
app.post('/api/members', (req, res) => {
  const { workspace_id, user_id, role = 'viewer' } = req.body || {};
  if (!workspace_id || !user_id) return res.status(400).json(fail('workspace_id + user_id required'));
  if (!workspaces.has(workspace_id)) return res.status(400).json(fail('workspace_id invalid'));
  const id = uuid();
  const m = { id, workspace_id, user_id, role, joined: new Date().toISOString() };
  members.set(id, m);
  // Add to workspace.member_ids if not present
  const w = workspaces.get(workspace_id);
  if (!w.member_ids.includes(user_id)) {
    w.member_ids.push(user_id);
    workspaces.set(w.id, w);
  }
  res.status(201).json(ok({ member: m }));
});

// Documents
app.get('/api/documents', (req, res) => {
  let list = [...documents.values()];
  if (req.query.workspace_id) list = list.filter(d => d.workspace_id === req.query.workspace_id);
  res.json(ok({ documents: list }));
});
app.get('/api/documents/:id', (req, res) => {
  const d = documents.get(req.params.id);
  if (!d) return res.status(404).json(fail('document not found'));
  res.json(ok({ document: d }));
});
app.post('/api/documents', (req, res) => {
  const { workspace_id, title, content = '', author_id } = req.body || {};
  if (!workspace_id || !title || !author_id) return res.status(400).json(fail('workspace_id + title + author_id required'));
  if (!workspaces.has(workspace_id)) return res.status(400).json(fail('workspace_id invalid'));
  const id = uuid();
  const d = { id, workspace_id, title, content, author_id, version: 1, updated: new Date().toISOString() };
  documents.set(id, d);
  res.status(201).json(ok({ document: d }));
});
app.patch('/api/documents/:id', (req, res) => {
  const d = documents.get(req.params.id);
  if (!d) return res.status(404).json(fail('document not found'));
  const { title, content } = req.body || {};
  if (title) d.title = title;
  if (content !== undefined) { d.content = content; d.version++; }
  d.updated = new Date().toISOString();
  documents.set(d.id, d);
  res.json(ok({ document: d }));
});

// Threads
app.get('/api/threads', (req, res) => {
  let list = [...threads.values()];
  if (req.query.document_id) list = list.filter(t => t.document_id === req.query.document_id);
  res.json(ok({ threads: list }));
});
app.post('/api/threads', (req, res) => {
  const { document_id, title, created_by } = req.body || {};
  if (!document_id || !title || !created_by) return res.status(400).json(fail('document_id + title + created_by required'));
  if (!documents.has(document_id)) return res.status(400).json(fail('document_id invalid'));
  const id = uuid();
  const t = { id, document_id, title, status: 'open', created_by, created: new Date().toISOString() };
  threads.set(id, t);
  res.status(201).json(ok({ thread: t }));
});
app.patch('/api/threads/:id', (req, res) => {
  const t = threads.get(req.params.id);
  if (!t) return res.status(404).json(fail('thread not found'));
  if (req.body.status) t.status = req.body.status;
  threads.set(t.id, t);
  res.json(ok({ thread: t }));
});

// Comments
app.get('/api/comments', (req, res) => {
  let list = [...comments.values()];
  if (req.query.thread_id) list = list.filter(c => c.thread_id === req.query.thread_id);
  res.json(ok({ comments: list }));
});
app.post('/api/comments', (req, res) => {
  const { thread_id, author_id, body, mentions = [] } = req.body || {};
  if (!thread_id || !author_id || !body) return res.status(400).json(fail('thread_id + author_id + body required'));
  if (!threads.has(thread_id)) return res.status(400).json(fail('thread_id invalid'));
  // Extract @mentions from body if not provided — capture everything after @ until space/end
  const detected = [...body.matchAll(/@([\w-]+)/g)].map(m => m[1]);
  const allMentions = [...new Set([...mentions, ...detected])];
  const id = uuid();
  const c = { id, thread_id, author_id, body, mentions: allMentions, created: new Date().toISOString() };
  comments.set(id, c);
  res.status(201).json(ok({ comment: c }));
});

// Shares
app.get('/api/shares', (_req, res) => res.json(ok({ shares: [...shares.values()] })));
app.post('/api/shares', (req, res) => {
  const { workspace_id, document_id, share_with, permission = 'view' } = req.body || {};
  if (!workspace_id || !share_with) return res.status(400).json(fail('workspace_id + share_with required'));
  const id = uuid();
  const s = { id, workspace_id, document_id: document_id || null, share_with, permission, created: new Date().toISOString() };
  shares.set(id, s);
  res.status(201).json(ok({ share: s }));
});

// Presence
app.get('/api/presence', (req, res) => {
  let list = [...presence.values()];
  if (req.query.workspace_id) list = list.filter(p => p.workspace_id === req.query.workspace_id);
  res.json(ok({ presence: list }));
});
app.post('/api/presence', (req, res) => {
  const { user_id, workspace_id, status = 'online', current_document_id = null } = req.body || {};
  if (!user_id || !workspace_id) return res.status(400).json(fail('user_id + workspace_id required'));
  const p = { user_id, workspace_id, status, current_document_id, last_seen: new Date().toISOString() };
  presence.set(user_id, p);
  res.status(201).json(ok({ presence: p }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
