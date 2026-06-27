/**
 * Chat OS - Production Implementation
 * Team messaging, channels, threads, reactions
 * Port: 4876
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4876;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface Channel { id: string; name: string; description: string; type: 'public' | 'private' | 'direct'; members: string[]; createdAt: string; createdBy: string; topic?: string; pinned?: boolean; }
interface Message { id: string; channelId: string; userId: string; userName?: string; content: string; timestamp: string; edited?: string; deleted?: boolean; reactions: Record<string, string[]>; threadCount: number; attachments?: { name: string; url: string; type: string }[]; }
interface Thread { id: string; parentId: string; messages: Message[]; createdAt: string; }
interface DirectMessage { id: string; participants: string[]; messages: Message[]; createdAt: string; }

const channels = new Map<string, Channel>();
const messages = new Map<string, Message>();
const threads = new Map<string, Thread>();
const directMessages = new Map<string, DirectMessage>();

// Seed channels
channels.set('general', { id: 'general', name: 'general', description: 'General discussion', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });
channels.set('random', { id: 'random', name: 'random', description: 'Random stuff', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });
channels.set('engineering', { id: 'engineering', name: 'engineering', description: 'Engineering team', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'chat-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), channels: channels.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ CHANNELS ============
app.get('/api/channels', (req, res) => {
  let result = Array.from(channels.values());
  if (req.query.type) result = result.filter(c => c.type === req.query.type);
  if (req.query.member) result = result.filter(c => c.members.includes(req.query.member as string));
  result.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ total: result.length, channels: result });
});

app.get('/api/channels/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const msgs = Array.from(messages.values()).filter(m => m.channelId === channel.id && !m.deleted);
  res.json({ ...channel, messageCount: msgs.length });
});

app.post('/api/channels', (req, res) => {
  const { name, description, type, members, topic, createdBy } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  channels.set(id, { id, name, description: description || '', type: type || 'public', members: members || [], createdAt: new Date().toISOString(), createdBy: createdBy || 'system', topic });
  res.status(201).json(channels.get(id));
});

app.put('/api/channels/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  Object.assign(channel, req.body);
  res.json(channel);
});

app.delete('/api/channels/:id', (req, res) => {
  if (!channels.has(req.params.id)) return res.status(404).json({ error: 'Channel not found' });
  channels.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/channels/:id/members', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const { userId } = req.body;
  if (!channel.members.includes(userId)) channel.members.push(userId);
  res.json(channel);
});

// ============ MESSAGES ============
app.get('/api/messages/:channelId', (req, res) => {
  const channel = channels.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  let msgs = Array.from(messages.values()).filter(m => m.channelId === req.params.channelId && !m.deleted);
  msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  msgs = msgs.slice(offset, offset + limit);

  res.json({ total: msgs.length, messages: msgs });
});

app.post('/api/messages', (req, res) => {
  const { channelId, userId, userName, content, attachments } = req.body;
  if (!channelId || !userId || !content) return res.status(400).json({ error: 'channelId, userId, content required' });

  const channel = channels.get(channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const id = uuidv4();
  const message: Message = { id, channelId, userId, userName, content, timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, attachments };
  messages.set(id, message);
  res.status(201).json(message);
});

app.put('/api/messages/:id', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (message.deleted) return res.status(400).json({ error: 'Cannot edit deleted message' });

  const { content, userId } = req.body;
  if (userId && userId !== message.userId) return res.status(403).json({ error: 'Cannot edit others messages' });
  if (content) { message.content = content; message.edited = new Date().toISOString(); }
  res.json(message);
});

app.delete('/api/messages/:id', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  message.deleted = true;
  res.json({ success: true });
});

// ============ REACTIONS ============
app.post('/api/messages/:id/reactions', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  const { emoji, userId } = req.body;
  if (!emoji || !userId) return res.status(400).json({ error: 'emoji, userId required' });
  if (!message.reactions[emoji]) message.reactions[emoji] = [];
  if (!message.reactions[emoji].includes(userId)) message.reactions[emoji].push(userId);
  res.json({ reactions: message.reactions });
});

app.delete('/api/messages/:id/reactions', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  const { emoji, userId } = req.body;
  if (emoji && userId && message.reactions[emoji]) {
    message.reactions[emoji] = message.reactions[emoji].filter(u => u !== userId);
    if (message.reactions[emoji].length === 0) delete message.reactions[emoji];
  }
  res.json({ reactions: message.reactions });
});

// ============ THREADS ============
app.get('/api/threads/:parentId', (req, res) => {
  const thread = threads.get(req.params.parentId);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  res.json(thread);
});

app.post('/api/threads/:parentId/reply', (req, res) => {
  const parent = messages.get(req.params.parentId);
  if (!parent) return res.status(404).json({ error: 'Parent message not found' });

  const { userId, userName, content } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'userId, content required' });

  let thread = threads.get(req.params.parentId);
  if (!thread) {
    thread = { id: uuidv4(), parentId: req.params.parentId, messages: [], createdAt: new Date().toISOString() };
    threads.set(req.params.parentId, thread);
  }

  const reply: Message = { id: uuidv4(), channelId: parent.channelId, userId, userName, content, timestamp: new Date().toISOString(), reactions: {}, threadCount: 0 };
  thread.messages.push(reply);
  parent.threadCount = thread.messages.length;

  res.status(201).json(reply);
});

// ============ DIRECT MESSAGES ============
app.get('/api/dm/:participant1/:participant2', (req, res) => {
  const key = [req.params.participant1, req.params.participant2].sort().join(':');
  let dm = directMessages.get(key);
  if (!dm) {
    dm = { id: key, participants: [req.params.participant1, req.params.participant2], messages: [], createdAt: new Date().toISOString() };
    directMessages.set(key, dm);
  }
  res.json(dm);
});

app.post('/api/dm/:participant1/:participant2/messages', (req, res) => {
  const key = [req.params.participant1, req.params.participant2].sort().join(':');
  let dm = directMessages.get(key);
  if (!dm) {
    dm = { id: key, participants: [req.params.participant1, req.params.participant2], messages: [], createdAt: new Date().toISOString() };
    directMessages.set(key, dm);
  }

  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'userId, content required' });

  const message: Message = { id: uuidv4(), channelId: key, userId, content, timestamp: new Date().toISOString(), reactions: {}, threadCount: 0 };
  dm.messages.push(message);
  res.status(201).json(message);
});

// ============ SEARCH ============
app.get('/api/search', (req, res) => {
  const { q, channelId, userId } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });

  let results = Array.from(messages.values()).filter(m =>
    !m.deleted && m.content.toLowerCase().includes((q as string).toLowerCase())
  );
  if (channelId) results = results.filter(m => m.channelId === channelId);
  if (userId) results = results.filter(m => m.userId === userId);

  res.json({ total: results.length, messages: results.slice(0, 20) });
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const all = Array.from(messages.values()).filter(m => !m.deleted);
  res.json({ totalChannels: channels.size, totalMessages: all.length, byChannel: Object.fromEntries([...new Set(all.map(m => m.channelId))].map(cid => [cid, all.filter(m => m.channelId === cid).length])) });
});

app.listen(PORT, () => console.log(`[chat-os] listening on :${PORT}`));
export default app;