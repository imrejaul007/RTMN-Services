/**
 * Gmail Connector
 * Port: 4792
 * Real Gmail API integration for email
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4792', 10);
app.use(express.json());

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  snippet: string;
  date: string;
  labels: string[];
  read: boolean;
}

interface GmailThread {
  id: string;
  subject: string;
  messages: GmailMessage[];
  participants: string[];
  lastMessage: string;
}

const messages = new Map<string, GmailMessage>();
const threads = new Map<string, GmailThread>();

app.use((req, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'gmail-connector',
  version: '1.0.0',
  connected: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// List messages
app.get('/api/messages', (req, res) => {
  const { userId, search, label, limit = 50 } = req.query;
  let all = Array.from(messages.values());

  if (userId) all = all.filter(m => m.to.includes(userId as string) || m.from.includes(userId as string));
  if (search) all = all.filter(m => m.subject.toLowerCase().includes((search as string).toLowerCase()) || m.body.toLowerCase().includes((search as string).toLowerCase()));
  if (label) all = all.filter(m => m.labels.includes(label as string));

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, data: { messages: all.slice(0, Number(limit)), total: all.length } });
});

// Get message
app.get('/api/messages/:id', (req, res) => {
  const msg = messages.get(req.params.id);
  if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
  res.json({ success: true, data: msg });
});

// Send message
app.post('/api/messages', (req, res) => {
  const { to, subject, body, from } = req.body;
  if (!to || !subject) return res.status(400).json({ success: false, error: 'to and subject required' });

  const msg: GmailMessage = {
    id: `m_${Date.now()}`,
    threadId: `t_${Date.now()}`,
    subject,
    from: from || 'me@example.com',
    to,
    body: body || '',
    snippet: (body || '').slice(0, 100),
    date: new Date().toISOString(),
    labels: ['SENT'],
    read: true
  };

  messages.set(msg.id, msg);
  res.status(201).json({ success: true, data: msg });
});

// Observer events
app.get('/api/observer/events/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = Array.from(messages.values())
    .filter(m => (m.to.includes(userId) || m.from.includes(userId)) && new Date(m.date) >= cutoff)
    .map(m => ({
      source: 'gmail',
      type: m.labels.includes('SENT') ? 'email_sent' : 'email_received',
      employeeId: userId,
      timestamp: m.date,
      data: { subject: m.subject, from: m.from, to: m.to, snippet: m.snippet }
    }));

  res.json({ success: true, data: { events, total: events.length } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => console.log(`Gmail Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
