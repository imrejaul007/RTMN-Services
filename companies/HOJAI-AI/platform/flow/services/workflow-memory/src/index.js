/**
 * FlowOS Workflow Memory
 *
 * Learn from past executions:
 * - Store execution learnings
 * - Context carry-over
 * - Pattern recognition
 * - Recommendation engine
 *
 * Port: 5367
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5367;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  memories: new Map(),
  patterns: new Map(),
  learnings: new Map(),
  suggestions: new Map()
};

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'workflow-memory',
    version: '1.0.0',
    port: PORT,
    memories: storage.memories.size,
    patterns: storage.patterns.size,
    timestamp: new Date().toISOString()
  });
});

// Store workflow memory
app.post('/api/memories', (req, res) => {
  const { workflowId, context, learnings = [], executionId } = req.body || {};

  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId is required' });
  }

  const memoryId = 'mem_' + crypto.randomUUID();
  const now = new Date().toISOString();

  const memory = {
    id: memoryId,
    workflowId,
    context,
    learnings,
    executionId,
    createdAt: now,
    updatedAt: now
  };

  storage.memories.set(memoryId, memory);

  // Extract patterns
  extractPatterns(workflowId, context, learnings);

  res.status(201).json(memory);
});

// Get workflow memory
app.get('/api/memories/:workflowId', (req, res) => {
  const memories = Array.from(storage.memories.values())
    .filter(m => m.workflowId === req.params.workflowId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ count: memories.length, memories });
});

// Add learning
app.post('/api/learnings', (req, res) => {
  const { workflowId, type, content, confidence = 0.8, source } = req.body || {};

  if (!workflowId || !content) {
    return res.status(400).json({ error: 'workflowId and content are required' });
  }

  const learningId = 'lrn_' + crypto.randomUUID();
  const learning = {
    id: learningId,
    workflowId,
    type, // 'legal', 'banking', 'recruiter', etc.
    content,
    confidence,
    source,
    createdAt: new Date().toISOString()
  };

  storage.learnings.set(learningId, learning);

  // Update patterns
  updatePatterns(workflowId, type, content, confidence);

  res.status(201).json(learning);
});

// Get learnings
app.get('/api/learnings/:workflowId', (req, res) => {
  const learnings = Array.from(storage.learnings.values())
    .filter(l => l.workflowId === req.params.workflowId)
    .sort((a, b) => b.confidence - a.confidence);

  res.json({ count: learnings.length, learnings });
});

// Get suggestions
app.get('/api/suggestions/:workflowId', (req, res) => {
  const patterns = storage.patterns.get(req.params.workflowId) || [];
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

// Extract patterns
function extractPatterns(workflowId, context, learnings) {
  if (!storage.patterns.has(workflowId)) {
    storage.patterns.set(workflowId, []);
  }

  const patterns = storage.patterns.get(workflowId);

  for (const learning of learnings || []) {
    const pattern = {
      id: 'pat_' + crypto.randomUUID(),
      workflowId,
      type: learning.type,
      content: learning.content,
      frequency: 1,
      lastSeen: new Date().toISOString()
    };

    // Check if similar pattern exists
    const existing = patterns.find(p =>
      p.type === learning.type && p.content === learning.content
    );

    if (existing) {
      existing.frequency++;
      existing.lastSeen = pattern.lastSeen;
    } else {
      patterns.push(pattern);
    }
  }
}

function updatePatterns(workflowId, type, content, confidence) {
  extractPatterns(workflowId, null, [{ type, content }]);
}

// Context carry-over
app.post('/api/context/carry-over', (req, res) => {
  const { fromWorkflowId, toWorkflowId, keys = [] } = req.body || {};

  const memories = Array.from(storage.memories.values())
    .filter(m => m.workflowId === fromWorkflowId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (memories.length === 0) {
    return res.json({ context: {} });
  }

  const latest = memories[0].context || {};
  const carried = keys.length > 0
    ? Object.fromEntries(keys.map(k => [k, latest[k]]).filter(([_, v]) => v !== undefined)
    : latest;

  res.json({ carried, fromWorkflowId, toWorkflowId });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));
app.listen(PORT, () => console.log(`[workflow-memory] :${PORT}`));
export { app };
