/**
 * FlowOS Workflow Memory
 * Learn from past executions: patterns, learnings, suggestions
 * Port: 5367
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5367;

app.use(cors());
app.use(express.json());

const storage = {
  memories: new Map(),
  patterns: new Map(),
  learnings: new Map()
};

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'workflow-memory',
    version: '1.0.0',
    port: PORT,
    memories: storage.memories.size
  });
});

app.post('/api/memories', (req, res) => {
  const { workflowId, context, learnings, executionId } = req.body || {};
  if (!workflowId) return res.status(400).json({ error: 'workflowId required' });

  const memory = {
    id: 'mem_' + crypto.randomUUID().slice(0, 8),
    workflowId, context, learnings, executionId,
    createdAt: new Date().toISOString()
  };
  storage.memories.set(memory.id, memory);
  res.status(201).json(memory);
});

app.get('/api/memories/:workflowId', (req, res) => {
  const memories = Array.from(storage.memories.values())
    .filter(m => m.workflowId === req.params.workflowId);
  res.json({ count: memories.length, memories });
});

app.post('/api/learnings', (req, res) => {
  const { workflowId, type, content, confidence = 0.8, source } = req.body || {};
  if (!workflowId || !content) return res.status(400).json({ error: 'workflowId and content required' });

  const learning = {
    id: 'lrn_' + crypto.randomUUID().slice(0, 8),
    workflowId, type, content, confidence, source,
    createdAt: new Date().toISOString()
  };
  storage.learnings.set(learning.id, learning);
  res.status(201).json(learning);
});

app.get('/api/learnings/:workflowId', (req, res) => {
  const learnings = Array.from(storage.learnings.values())
    .filter(l => l.workflowId === req.params.workflowId)
    .sort((a, b) => b.confidence - a.confidence);
  res.json({ count: learnings.length, learnings });
});

app.get('/api/suggestions/:workflowId', (req, res) => {
  const learnings = Array.from(storage.learnings.values())
    .filter(l => l.workflowId === req.params.workflowId)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const suggestions = learnings.map(l => ({
    type: 'learning',
    content: l.content,
    confidence: l.confidence,
    reason: `Based on ${l.source || 'past execution'}`
  }));
  res.json({ suggestions });
});

app.post('/api/context/carry-over', (req, res) => {
  const { fromWorkflowId, toWorkflowId, keys = [] } = req.body || {};
  const memories = Array.from(storage.memories.values())
    .filter(m => m.workflowId === fromWorkflowId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (memories.length === 0) return res.json({ context: {} });

  const context = memories[0].context || {};
  const carried = keys.length > 0
    ? Object.fromEntries(keys.map(k => [k, context[k]]).filter(([, v]) => v !== undefined)
    : context;

  res.json({ carried, fromWorkflowId, toWorkflowId });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => {
  console.log(`[workflow-memory] listening on :${PORT}`);
});
process.on('SIGTERM', () => { server.close(); });

export { app };
