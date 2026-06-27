/**
 * HOJAI Collaboration Service
 * Real-time collaboration, comments, threads
 */

import express from 'express';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.PORT || 4540;
app.use(express.json());

// In-memory storage
const threads = new Map();
const comments = [];
const presence = new Map();

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'collaboration-service',
    version: '1.0.0',
    port: PORT,
    threads: threads.size,
    comments: comments.length,
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Create thread
app.post('/api/v1/threads', requireInternal, (req, res) => {
  const { title, context, userId } = req.body;
  const id = `thd_${Date.now()}`;
  const thread = { id, title, context, userId, createdAt: new Date().toISOString() };
  threads.set(id, thread);
  res.json({ success: true, thread });
});

// List threads
app.get('/api/v1/threads', (req, res) => {
  res.json({ threads: Array.from(threads.values()) });
});

// Add comment
app.post('/api/v1/threads/:threadId/comments', requireInternal, (req, res) => {
  const { threadId } = req.params;
  const { content, userId } = req.body;
  if (!threads.has(threadId)) return res.status(404).json({ error: 'Thread not found' });
  const comment = { id: `cmt_${Date.now()}`, threadId, content, userId, createdAt: new Date().toISOString() };
  comments.push(comment);
  res.json({ success: true, comment });
});

// Presence (who's online)
app.post('/api/v1/presence', requireInternal, (req, res) => {
  const { userId, status = 'online' } = req.body;
  presence.set(userId, { userId, status, lastSeen: new Date().toISOString() });
  res.json({ success: true });
});

app.get('/api/v1/presence', (req, res) => {
  res.json({ users: Array.from(presence.values()) });
});

app.use((req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res) => res.status(500).json({ error: err.message }));

app.listen(PORT, () => console.log(`[collaboration-service] listening on :${PORT}`));
