/**
 * Memory Substrate Service
 * PostgreSQL + pgvector backend for MemoryOS
 * Port: 4782
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4782;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// In-memory storage (would be PostgreSQL in production)
const storage = {
  memories: new Map(),
  relationships: new Map(),
  versions: new Map(),
  audit: []
};

// Helper functions
const generateId = () => uuidv4();

const logAudit = (action, entityType, entityId, details) => {
  storage.audit.push({
    id: generateId(),
    timestamp: Date.now(),
    action,
    entityType,
    entityId,
    details
  });
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'memory-substrate', port: PORT });
});

// Memory CRUD
app.post('/memories', (req, res) => {
  const { content, type, metadata, embedding } = req.body;

  if (!content || !type) {
    return res.status(400).json({ error: 'content and type are required' });
  }

  const memory = {
    id: generateId(),
    content,
    type,
    metadata: metadata || {},
    embedding: embedding || null,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  storage.memories.set(memory.id, memory);

  // Create initial version
  storage.versions.set(`${memory.id}:1`, { ...memory });

  logAudit('CREATE', 'memory', memory.id, { type });

  res.status(201).json(memory);
});

app.get('/memories', (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;

  let memories = Array.from(storage.memories.values());

  if (type) {
    memories = memories.filter(m => m.type === type);
  }

  memories.sort((a, b) => b.createdAt - a.createdAt);

  const total = memories.length;
  const paginated = memories.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    data: paginated,
    total,
    limit: Number(limit),
    offset: Number(offset)
  });
});

app.get('/memories/:id', (req, res) => {
  const { id } = req.params;
  const memory = storage.memories.get(id);

  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  logAudit('READ', 'memory', id, {});
  res.json(memory);
});

app.put('/memories/:id', (req, res) => {
  const { id } = req.params;
  const { content, type, metadata, embedding } = req.body;

  const memory = storage.memories.get(id);
  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  const oldVersion = memory.version;
  const newVersion = oldVersion + 1;

  // Save old version
  storage.versions.set(`${id}:${oldVersion}`, { ...memory });

  // Update memory
  if (content) memory.content = content;
  if (type) memory.type = type;
  if (metadata) memory.metadata = { ...memory.metadata, ...metadata };
  if (embedding) memory.embedding = embedding;
  memory.version = newVersion;
  memory.updatedAt = Date.now();

  // Save new version
  storage.versions.set(`${id}:${newVersion}`, { ...memory });

  storage.memories.set(id, memory);

  logAudit('UPDATE', 'memory', id, { oldVersion, newVersion });
  res.json(memory);
});

app.delete('/memories/:id', (req, res) => {
  const { id } = req.params;

  if (!storage.memories.has(id)) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  storage.memories.delete(id);

  logAudit('DELETE', 'memory', id, {});
  res.json({ success: true, id });
});

// Search
app.post('/search', (req, res) => {
  const { query, type, limit = 10 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  let results = Array.from(storage.memories.values());

  if (type) {
    results = results.filter(m => m.type === type);
  }

  // Simple text search (would use vector similarity in production)
  const queryLower = query.toLowerCase();
  results = results
    .map(m => {
      const contentLower = m.content.toLowerCase();
      const matchCount = queryLower.split(' ')
        .filter(word => contentLower.includes(word)).length;
      return { ...m, _relevance: matchCount / queryLower.split(' ').length };
    })
    .filter(m => m._relevance > 0)
    .sort((a, b) => b._relevance - a._relevance)
    .slice(0, Number(limit));

  logAudit('SEARCH', 'memory', null, { query, results: results.length });
  res.json({ data: results, total: results.length });
});

// Vector search (simplified - would use pgvector in production)
app.post('/search/vector', (req, res) => {
  const { embedding, limit = 10 } = req.body;

  if (!embedding || !Array.isArray(embedding)) {
    return res.status(400).json({ error: 'embedding array is required' });
  }

  const memories = Array.from(storage.memories.values())
    .filter(m => m.embedding);

  // Simplified cosine similarity
  const withSimilarity = memories.map(m => {
    const similarity = m.embedding.reduce((sum, v, i) =>
      sum + v * embedding[i], 0) /
      (Math.sqrt(m.embedding.reduce((s, v) => s + v * v, 0)) *
       Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) + 0.0001);
    return { ...m, _similarity: similarity };
  });

  const results = withSimilarity
    .sort((a, b) => b._similarity - a._similarity)
    .slice(0, Number(limit));

  res.json({ data: results, total: results.length });
});

// Relationships
app.post('/relationships', (req, res) => {
  const { from, to, type, metadata } = req.body;

  if (!from || !to || !type) {
    return res.status(400).json({ error: 'from, to, and type are required' });
  }

  if (!storage.memories.has(from) || !storage.memories.has(to)) {
    return res.status(404).json({ error: 'One or both memories not found' });
  }

  const relationship = {
    id: generateId(),
    from,
    to,
    type,
    metadata: metadata || {},
    createdAt: Date.now()
  };

  storage.relationships.set(relationship.id, relationship);

  logAudit('CREATE', 'relationship', relationship.id, { from, to, type });
  res.status(201).json(relationship);
});

app.get('/relationships', (req, res) => {
  const { from, to, type } = req.query;

  let relationships = Array.from(storage.relationships.values());

  if (from) {
    relationships = relationships.filter(r => r.from === from);
  }
  if (to) {
    relationships = relationships.filter(r => r.to === to);
  }
  if (type) {
    relationships = relationships.filter(r => r.type === type);
  }

  res.json({ data: relationships, total: relationships.length });
});

app.delete('/relationships/:id', (req, res) => {
  const { id } = req.params;

  if (!storage.relationships.has(id)) {
    return res.status(404).json({ error: 'Relationship not found' });
  }

  storage.relationships.delete(id);

  logAudit('DELETE', 'relationship', id, {});
  res.json({ success: true, id });
});

// Version history
app.get('/memories/:id/versions', (req, res) => {
  const { id } = req.params;

  if (!storage.memories.has(id)) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  const versions = [];
  let version = 1;
  let v;
  while (v = storage.versions.get(`${id}:${version}`)) {
    versions.push(v);
    version++;
  }

  res.json({ data: versions, total: versions.length });
});

app.get('/memories/:id/versions/:version', (req, res) => {
  const { id, version } = req.params;

  const v = storage.versions.get(`${id}:${version}`);
  if (!v) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(v);
});

// Analytics
app.get('/analytics', (req, res) => {
  const memories = Array.from(storage.memories.values());

  const byType = memories.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  const recentActivity = storage.audit.slice(-100);

  res.json({
    totalMemories: memories.length,
    totalRelationships: storage.relationships.size,
    byType,
    recentActivity: recentActivity.length,
    storageUsed: JSON.stringify(memories).length
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Memory Substrate service running on port ${PORT}`);
});

export default app;
