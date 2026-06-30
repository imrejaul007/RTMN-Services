import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4896;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const meetings = new Map();
const decisions = new Map();
const relationships = new Map();

// Meetings
app.post('/api/meeting', (req, res) => {
  const meeting = { ...req.body, meetingId: req.body.meetingId || `meeting_${Date.now()}`, createdAt: new Date().toISOString() };
  meetings.set(meeting.meetingId, meeting);
  res.status(201).json({ success: true, meetingId: meeting.meetingId });
});

app.get('/api/meeting/:meetingId', (req, res) => {
  const m = meetings.get(req.params.meetingId);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

app.get('/api/meetings', (req, res) => {
  const { userId, limit = 50 } = req.query;
  let list = Array.from(meetings.values());
  if (userId) list = list.filter(m => m.userId === userId);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ meetings: list.slice(0, parseInt(limit)), total: list.length });
});

// Decisions
app.post('/api/decision', (req, res) => {
  const d = { ...req.body, decisionId: req.body.decisionId || `dec_${Date.now()}`, createdAt: new Date().toISOString() };
  decisions.set(d.decisionId, d);
  res.status(201).json({ success: true, decisionId: d.decisionId });
});

app.get('/api/decisions', (req, res) => {
  res.json({ decisions: Array.from(decisions.values()) });
});

app.get('/api/decisions/why', (req, res) => {
  const { what } = req.query;
  if (!what) return res.status(400).json({ error: 'what required' });
  const results = Array.from(decisions.values()).filter(d =>
    d.what?.toLowerCase().includes(what.toLowerCase()) || d.why?.toLowerCase().includes(what.toLowerCase())
  );
  res.json({ found: results.length > 0, query: what, matches: results });
});

// Relationships
app.post('/api/relationship', (req, res) => {
  const { userId, relatedUserId, ...updates } = req.body;
  relationships.set(`${userId}:${relatedUserId}`, { userId, relatedUserId, ...updates, updatedAt: new Date().toISOString() });
  res.json({ success: true });
});

app.get('/api/relationships/:userId', (req, res) => {
  const rels = Array.from(relationships.values()).filter(r => r.userId === req.params.userId);
  res.json({ relationships: rels });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'meeting-storage', port: PORT, stats: { meetings: meetings.size, decisions: decisions.size } });
});

app.get('/ready', (req, res) => res.json({ ready: true }));

app.listen(PORT, () => console.log(`Meeting Storage v1.0.0 running on port ${PORT}`));

export default app;
