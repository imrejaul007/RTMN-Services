/**
 * Chat OS - Team Messaging
 * Port: 4876
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4876;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Channel { id: string; name: string; description: string; type: 'public' | 'private' | 'direct'; members: string[]; createdAt: string; }
interface Message { id: string; channelId: string; userId: string; content: string; timestamp: string; edited?: string; reactions: Record<string, string[]>; }
interface Thread { id: string; parentId: string; messages: Message[]; }

const channels = new Map<string, Channel>();
const messages = new Map<string, Message>();
const threads = new Map<string, Thread>();

// Seed default channels
channels.set('general', { id: 'general', name: 'general', description: 'General discussion', type: 'public', members: [], createdAt: new Date().toISOString() });
channels.set('random', { id: 'random', name: 'random', description: 'Random stuff', type: 'public', members: [], createdAt: new Date().toISOString() });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'chat-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), channels: channels.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/channels', (req, res) => {
  let result = Array.from(channels.values());
  if (req.query.type) result = result.filter(c => c.type === req.query.type);
  res.json({ channels: result });
});

app.get('/api/channels/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
});

app.post('/api/channels', (req, res) => {
  const { name, description, type, members } = req.body;
  const id = uuidv4();
  channels.set(id, { id, name, description: description || '', type: type || 'public', members: members || [], createdAt: new Date().toISOString() });
  res.status(201).json(channels.get(id));
});

app.get('/api/messages/:channelId', (req, res) => {
  const result = Array.from(messages.values()).filter(m => m.channelId === req.params.channelId);
  result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ messages: result.slice(-limit) });
});

app.post('/api/messages', (req, res) => {
  const { channelId, userId, content } = req.body;
  if (!channelId || !userId || !content) return res.status(400).json({ error: 'channelId, userId, content required' });
  const id = uuidv4();
  const message: Message = { id, channelId, userId, content, timestamp: new Date().toISOString(), reactions: {} };
  messages.set(id, message);
  res.status(201).json(message);
});

app.put('/api/messages/:id', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  message.content = req.body.content || message.content;
  message.edited = new Date().toISOString();
  res.json(message);
});

app.delete('/api/messages/:id', (req, res) => {
  if (!messages.has(req.params.id)) return res.status(404).json({ error: 'Message not found' });
  messages.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/messages/:id/reactions', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  const { emoji, userId } = req.body;
  if (!message.reactions[emoji]) message.reactions[emoji] = [];
  if (!message.reactions[emoji].includes(userId)) message.reactions[emoji].push(userId);
  res.json({ reactions: message.reactions });
});

app.listen(PORT, () => console.log(`[chat-os] listening on :${PORT}`));
export default app;