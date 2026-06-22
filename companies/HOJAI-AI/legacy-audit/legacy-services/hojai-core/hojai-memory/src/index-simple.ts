/**
 * HOJAI Memory Service
 * Port: 4510
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4510', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Memory types
interface Memory {
  id: string;
  userId: string;
  type: 'preference' | 'fact' | 'event' | 'transaction' | 'context';
  content: string;
  tags: string[];
  importance: number;
  createdAt: Date;
  updatedAt: Date;
}

const memories = new Map<string, Memory>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-memory', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Store memory
app.post('/api/memories', (req: Request, res: Response) => {
  const { userId, type, content, tags, importance } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content are required' });
  }

  const memory: Memory = {
    id: uuidv4(),
    userId,
    type: type || 'fact',
    content,
    tags: tags || [],
    importance: importance || 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memories.set(memory.id, memory);
  res.status(201).json({ success: true, memory });
});

// Get memories
app.get('/api/memories', (req: Request, res: Response) => {
  const { userId, type, tag, search, limit = 50 } = req.query;

  let list = Array.from(memories.values());

  if (userId) list = list.filter(m => m.userId === userId);
  if (type) list = list.filter(m => m.type === type);
  if (tag) list = list.filter(m => m.tags.includes(tag as string));
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(m => m.content.toLowerCase().includes(q));
  }

  list = list.sort((a, b) => b.importance - a.importance).slice(0, Number(limit));

  res.json({ count: list.length, memories: list });
});

// Get memory by ID
app.get('/api/memories/:id', (req: Request, res: Response) => {
  const memory = memories.get(req.params.id);
  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }
  res.json(memory);
});

// Update memory
app.put('/api/memories/:id', (req: Request, res: Response) => {
  const memory = memories.get(req.params.id);
  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  const { content, tags, importance } = req.body;
  if (content) memory.content = content;
  if (tags) memory.tags = tags;
  if (importance) memory.importance = importance;
  memory.updatedAt = new Date();

  memories.set(memory.id, memory);
  res.json({ success: true, memory });
});

// Delete memory
app.delete('/api/memories/:id', (req: Request, res: Response) => {
  const deleted = memories.delete(req.params.id);
  res.json({ success: deleted });
});

// Search memories
app.get('/api/memories/search', (req: Request, res: Response) => {
  const { q, userId, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'q (query) is required' });
  }

  let list = Array.from(memories.values());
  if (userId) list = list.filter(m => m.userId === userId);

  const query = (q as string).toLowerCase();
  list = list.filter(m =>
    m.content.toLowerCase().includes(query) ||
    m.tags.some(t => t.toLowerCase().includes(query))
  );

  res.json({ count: list.length, memories: list.slice(0, Number(limit)) });
});

// Get user preferences
app.get('/api/preferences/:userId', (req: Request, res: Response) => {
  const prefs = Array.from(memories.values())
    .filter(m => m.userId === req.params.userId && m.type === 'preference');

  res.json({ count: prefs.length, preferences: prefs });
});

// Get user facts
app.get('/api/facts/:userId', (req: Request, res: Response) => {
  const facts = Array.from(memories.values())
    .filter(m => m.userId === req.params.userId && m.type === 'fact');

  res.json({ count: facts.length, facts });
});

// Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const typeCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  memories.forEach(m => {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    userCounts[m.userId] = (userCounts[m.userId] || 0) + 1;
  });

  res.json({
    total: memories.size,
    byType: typeCounts,
    byUser: userCounts,
  });
});

app.listen(PORT, () => {
  console.log(`\n🧠 HOJAI Memory Service (${PORT})\n`);
});

export default app;