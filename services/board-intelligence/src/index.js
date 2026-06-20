// board-intelligence (4264) - Board & executive governance.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'board-intelligence';
const PORT = parseInt(process.env.PORT || '4264', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const boards = new Map();      // boardId -> { id, name, company, member_ids[], chair_id, created }
const boardMembers = new Map();// bmId -> { id, board_id, name, role, appointed, email }
const meetings = new Map();    // mtId -> { id, board_id, title, scheduled_at, location, status, attendee_ids[] }
const agendas = new Map();     // agId -> { id, meeting_id, items[] }
const minutes = new Map();     // minId -> { id, meeting_id, content, attendees[], recorded_by, approved }
const resolutions = new Map(); // resId -> { id, board_id, meeting_id, title, body, status, proposed_by, created }
const votes = new Map();       // voteId -> { id, resolution_id, voter_id, choice, voted_at }
const actionItems = new Map(); // aiId -> { id, meeting_id, description, assignee_id, due_date, status }

// Seed
(function seed() {
  const boardId = uuid();
  boards.set(boardId, { id: boardId, name: 'Main Board', company: 'Acme Corp',
    member_ids: [], chair_id: null, created: new Date().toISOString() });
  ['CEO', 'CTO', 'CFO', 'COO', 'Independent Director'].forEach((role, i) => {
    const id = uuid();
    boardMembers.set(id, { id, board_id: boardId, name: `${role.toLowerCase().replace(/\s/g, '-')}-member`,
      role, appointed: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
      email: `${role.toLowerCase().replace(/\s/g, '')}@acme.example` });
  });
  const memberIds = [...boardMembers.keys()];
  const b = boards.get(boardId);
  b.member_ids = memberIds;
  b.chair_id = memberIds[0];
  boards.set(boardId, b);

  const meetingId = uuid();
  meetings.set(meetingId, { id: meetingId, board_id: boardId, title: 'Q2 Board Meeting',
    scheduled_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    location: 'HQ Conference Room A', status: 'scheduled', attendee_ids: memberIds });
  agendas.set(uuid(), { id: uuid(), meeting_id: meetingId, items: [
    { id: uuid(), title: 'Q2 Financial Results', duration_min: 30, presenter: 'CFO' },
    { id: uuid(), title: 'Product Roadmap', duration_min: 45, presenter: 'CTO' },
    { id: uuid(), title: 'New Market Expansion', duration_min: 30, presenter: 'CEO' }
  ] });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/boards', '/api/board-members', '/api/meetings', '/api/agendas',
              '/api/minutes', '/api/resolutions', '/api/votes', '/api/action-items']
})));

// Boards
app.get('/api/boards', (_req, res) => res.json(ok({ boards: [...boards.values()] })));
app.post('/api/boards', (req, res) => {
  const { name, company, chair_id = null } = req.body || {};
  if (!name || !company) return res.status(400).json(fail('name + company required'));
  const id = uuid();
  const b = { id, name, company, member_ids: [], chair_id, created: new Date().toISOString() };
  boards.set(id, b);
  res.status(201).json(ok({ board: b }));
});

// Board Members
app.get('/api/board-members', (req, res) => {
  let list = [...boardMembers.values()];
  if (req.query.board_id) list = list.filter(m => m.board_id === req.query.board_id);
  res.json(ok({ board_members: list }));
});
app.post('/api/board-members', (req, res) => {
  const { board_id, name, role = 'Director', email } = req.body || {};
  if (!board_id || !name) return res.status(400).json(fail('board_id + name required'));
  if (!boards.has(board_id)) return res.status(400).json(fail('board_id invalid'));
  const id = uuid();
  const m = { id, board_id, name, role, appointed: new Date().toISOString(), email: email || null };
  boardMembers.set(id, m);
  const b = boards.get(board_id);
  b.member_ids.push(id);
  boards.set(b.id, b);
  res.status(201).json(ok({ board_member: m }));
});

// Meetings
app.get('/api/meetings', (req, res) => {
  let list = [...meetings.values()];
  if (req.query.board_id) list = list.filter(m => m.board_id === req.query.board_id);
  if (req.query.status) list = list.filter(m => m.status === req.query.status);
  res.json(ok({ meetings: list }));
});
app.get('/api/meetings/:id', (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json(fail('meeting not found'));
  res.json(ok({ meeting: m }));
});
app.post('/api/meetings', (req, res) => {
  const { board_id, title, scheduled_at, location = 'virtual', attendee_ids = [] } = req.body || {};
  if (!board_id || !title || !scheduled_at) return res.status(400).json(fail('board_id + title + scheduled_at required'));
  if (!boards.has(board_id)) return res.status(400).json(fail('board_id invalid'));
  const id = uuid();
  const m = { id, board_id, title, scheduled_at, location, status: 'scheduled', attendee_ids };
  meetings.set(id, m);
  res.status(201).json(ok({ meeting: m }));
});
app.patch('/api/meetings/:id', (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json(fail('meeting not found'));
  ['title', 'scheduled_at', 'location', 'status', 'attendee_ids'].forEach(k => {
    if (req.body[k] !== undefined) m[k] = req.body[k];
  });
  meetings.set(m.id, m);
  res.json(ok({ meeting: m }));
});

// Agendas
app.get('/api/agendas', (req, res) => {
  let list = [...agendas.values()];
  if (req.query.meeting_id) list = list.filter(a => a.meeting_id === req.query.meeting_id);
  res.json(ok({ agendas: list }));
});
app.post('/api/agendas', (req, res) => {
  const { meeting_id, items = [] } = req.body || {};
  if (!meeting_id) return res.status(400).json(fail('meeting_id required'));
  if (!meetings.has(meeting_id)) return res.status(400).json(fail('meeting_id invalid'));
  const id = uuid();
  const a = { id, meeting_id, items, created: new Date().toISOString() };
  agendas.set(id, a);
  res.status(201).json(ok({ agenda: a }));
});
app.post('/api/agendas/:id/items', (req, res) => {
  const a = agendas.get(req.params.id);
  if (!a) return res.status(404).json(fail('agenda not found'));
  const { title, duration_min = 15, presenter = '' } = req.body || {};
  if (!title) return res.status(400).json(fail('title required'));
  const item = { id: uuid(), title, duration_min, presenter };
  a.items.push(item);
  agendas.set(a.id, a);
  res.status(201).json(ok({ agenda: a, item }));
});

// Minutes
app.get('/api/minutes', (req, res) => {
  let list = [...minutes.values()];
  if (req.query.meeting_id) list = list.filter(m => m.meeting_id === req.query.meeting_id);
  res.json(ok({ minutes: list }));
});
app.post('/api/minutes', (req, res) => {
  const { meeting_id, content, attendees = [], recorded_by } = req.body || {};
  if (!meeting_id || !content || !recorded_by) return res.status(400).json(fail('meeting_id + content + recorded_by required'));
  if (!meetings.has(meeting_id)) return res.status(400).json(fail('meeting_id invalid'));
  const id = uuid();
  const m = { id, meeting_id, content, attendees, recorded_by, approved: false, created: new Date().toISOString() };
  minutes.set(id, m);
  // Mark meeting as completed
  const mt = meetings.get(meeting_id);
  mt.status = 'completed';
  meetings.set(mt.id, mt);
  res.status(201).json(ok({ minute: m }));
});
app.patch('/api/minutes/:id', (req, res) => {
  const m = minutes.get(req.params.id);
  if (!m) return res.status(404).json(fail('minute not found'));
  if (req.body.approved !== undefined) m.approved = req.body.approved;
  if (req.body.content) m.content = req.body.content;
  minutes.set(m.id, m);
  res.json(ok({ minute: m }));
});

// Resolutions
app.get('/api/resolutions', (req, res) => {
  let list = [...resolutions.values()];
  if (req.query.board_id) list = list.filter(r => r.board_id === req.query.board_id);
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  res.json(ok({ resolutions: list }));
});
app.post('/api/resolutions', (req, res) => {
  const { board_id, meeting_id, title, body, proposed_by } = req.body || {};
  if (!board_id || !title || !body || !proposed_by) return res.status(400).json(fail('board_id + title + body + proposed_by required'));
  if (!boards.has(board_id)) return res.status(400).json(fail('board_id invalid'));
  const id = uuid();
  const r = { id, board_id, meeting_id: meeting_id || null, title, body, status: 'proposed', proposed_by, created: new Date().toISOString() };
  resolutions.set(id, r);
  res.status(201).json(ok({ resolution: r }));
});
app.patch('/api/resolutions/:id', (req, res) => {
  const r = resolutions.get(req.params.id);
  if (!r) return res.status(404).json(fail('resolution not found'));
  if (req.body.status) r.status = req.body.status;
  resolutions.set(r.id, r);
  res.json(ok({ resolution: r }));
});

// Votes
app.get('/api/votes', (req, res) => {
  let list = [...votes.values()];
  if (req.query.resolution_id) list = list.filter(v => v.resolution_id === req.query.resolution_id);
  res.json(ok({ votes: list }));
});
app.post('/api/resolutions/:id/vote', (req, res) => {
  const r = resolutions.get(req.params.id);
  if (!r) return res.status(404).json(fail('resolution not found'));
  const { voter_id, choice } = req.body || {};
  if (!voter_id || !choice) return res.status(400).json(fail('voter_id + choice required'));
  if (!['yes', 'no', 'abstain'].includes(choice)) return res.status(400).json(fail('choice must be yes|no|abstain'));
  const id = uuid();
  const v = { id, resolution_id: r.id, voter_id, choice, voted_at: new Date().toISOString() };
  votes.set(id, v);
  // Tally
  const tally = { yes: 0, no: 0, abstain: 0 };
  [...votes.values()].filter(x => x.resolution_id === r.id).forEach(x => tally[x.choice]++);
  res.status(201).json(ok({ vote: v, tally }));
});

// Action Items
app.get('/api/action-items', (req, res) => {
  let list = [...actionItems.values()];
  if (req.query.meeting_id) list = list.filter(a => a.meeting_id === req.query.meeting_id);
  if (req.query.assignee_id) list = list.filter(a => a.assignee_id === req.query.assignee_id);
  res.json(ok({ action_items: list }));
});
app.post('/api/action-items', (req, res) => {
  const { meeting_id, description, assignee_id, due_date } = req.body || {};
  if (!meeting_id || !description || !assignee_id) return res.status(400).json(fail('meeting_id + description + assignee_id required'));
  if (!meetings.has(meeting_id)) return res.status(400).json(fail('meeting_id invalid'));
  const id = uuid();
  const a = { id, meeting_id, description, assignee_id, due_date: due_date || null, status: 'open' };
  actionItems.set(id, a);
  res.status(201).json(ok({ action_item: a }));
});
app.patch('/api/action-items/:id', (req, res) => {
  const a = actionItems.get(req.params.id);
  if (!a) return res.status(404).json(fail('action item not found'));
  if (req.body.status) a.status = req.body.status;
  actionItems.set(a.id, a);
  res.json(ok({ action_item: a }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
