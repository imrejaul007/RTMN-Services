/**
 * Memory Twin Service - Port: 4738
 * Personal memory storage for employee twins
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4738', 10);
app.use(express.json());

interface MemoryEntry {
  id: string;
  employeeId: string;
  type: 'fact' | 'experience' | 'preference' | 'context';
  content: string;
  confidence: number;
  source: string;
  tags: string[];
  createdAt: string;
}

const memories = new Map<string, MemoryEntry[]>();

function generateId(p: string) { return `${p}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`; }

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'memory-twin', version: '1.0.0' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/memory/:employeeId',requireAuth,  (req, res) => {
  const { employeeId } = req.params;
  const { type, content, confidence = 50, source, tags = [] } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'content required' });

  const memory: MemoryEntry = { id: generateId('mem'), employeeId, type: type || 'fact', content, confidence, source: source || 'user', tags, createdAt: new Date().toISOString() };

  const empMemories = memories.get(employeeId) || [];
  empMemories.push(memory);
  memories.set(employeeId, empMemories);

  res.status(201).json({ success: true, data: memory });
});

app.get('/api/memory/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const { type, search } = req.query;
  let empMemories = memories.get(employeeId) || [];

  if (type) empMemories = empMemories.filter(m => m.type === type);
  if (search) empMemories = empMemories.filter(m => m.content.toLowerCase().includes((search as string).toLowerCase()));

  res.json({ success: true, data: { memories: empMemories, total: empMemories.length } });
});

app.get('/api/memory/:employeeId/stats', (req, res) => {
  const { employeeId } = req.params;
  const empMemories = memories.get(employeeId) || [];
  const avgConfidence = empMemories.length > 0 ? empMemories.reduce((sum, m) => sum + m.confidence, 0) / empMemories.length : 0;

  res.json({ success: true, data: { employeeId, totalMemories: empMemories.length, avgConfidence: Math.round(avgConfidence), byType: { fact: empMemories.filter(m => m.type === 'fact').length, experience: empMemories.filter(m => m.type === 'experience').length, preference: empMemories.filter(m => m.type === 'preference').length } } });
});

const server = app.listen(PORT, () => console.log(`Memory Twin - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
