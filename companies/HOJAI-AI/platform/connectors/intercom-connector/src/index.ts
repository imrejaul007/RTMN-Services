/**
 * Intercom Connector
 * Port: 4803
 * Intercom customer messaging integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4803', 10);
app.use(express.json());

interface IntercomUser { id: string; name: string; email: string; phone?: string; custom_attributes: Record<string, any>; created_at: string; }
interface IntercomConversation { id: string; user_id: string; assignee_id?: string; state: 'open' | 'closed' | 'snoozed'; last_message_at: string; tags: string[]; }
interface IntercomMessage { id: string; conversation_id: string; body: string; message_type: 'user' | 'admin' | 'bot'; author_id: string; created_at: string; }

const users = new Map<string, IntercomUser>();
const conversations = new Map<string, IntercomConversation>();
const messages = new Map<string, IntercomMessage[]>();

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'intercom-connector', connected: !!process.env.INTERCOM_ACCESS_TOKEN }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/users', (req, res) => {
  const { search } = req.query;
  let all = Array.from(users.values());
  if (search) all = all.filter(u => u.name.toLowerCase().includes((search as string).toLowerCase()) || u.email.includes(search as string));
  res.json({ success: true, data: { users: all, total: all.length } });
});

app.post('/api/users',requireAuth,  (req, res) => {
  const { name, email, phone, custom_attributes } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, error: 'name and email required' });
  const user: IntercomUser = { id: `user_${Date.now()}`, name, email, phone, custom_attributes: custom_attributes || {}, created_at: new Date().toISOString() };
  users.set(user.id, user);
  res.status(201).json({ success: true, data: user });
});

app.get('/api/conversations', (req, res) => {
  const { state } = req.query;
  let all = Array.from(conversations.values());
  if (state) all = all.filter(c => c.state === state);
  res.json({ success: true, data: { conversations: all, total: all.length } });
});

app.post('/api/conversations',requireAuth,  (req, res) => {
  const { user_id, assignee_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
  const conv: IntercomConversation = { id: `conv_${Date.now()}`, user_id, assignee_id, state: 'open', last_message_at: new Date().toISOString(), tags: [] };
  conversations.set(conv.id, conv);
  messages.set(conv.id, []);
  res.status(201).json({ success: true, data: conv });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  res.json({ success: true, data: { messages: messages.get(req.params.id) || [], total: (messages.get(req.params.id) || []).length } });
});

app.post('/api/conversations/:id/reply',requireAuth,  (req, res) => {
  const { body, message_type, author_id } = req.body;
  if (!body) return res.status(400).json({ success: false, error: 'body required' });
  const msg: IntercomMessage = { id: `msg_${Date.now()}`, conversation_id: req.params.id, body, message_type: message_type || 'admin', author_id: author_id || '', created_at: new Date().toISOString() };
  const convMessages = messages.get(req.params.id) || [];
  convMessages.push(msg);
  messages.set(req.params.id, convMessages);
  res.status(201).json({ success: true, data: msg });
});

app.get('/api/observer/events/:userId', (req, res) => {
  const events = Array.from(conversations.values())
    .filter(c => c.user_id === req.params.userId)
    .map(c => ({ source: 'intercom', type: 'conversation_activity', employeeId: req.params.userId, timestamp: c.last_message_at, data: { id: c.id, state: c.state } }));
  res.json({ success: true, data: { events, total: events.length } });
});

const server = app.listen(PORT, () => console.log(`Intercom Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
