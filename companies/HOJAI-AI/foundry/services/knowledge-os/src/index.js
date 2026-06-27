/**
 * KnowledgeOS - Continuous Learning & Knowledge Management
 *
 * AI workers need continuous learning to:
 * - Know company policies, SOPs, and culture
 * - Learn from past interactions and outcomes
 * - Stay updated on industry trends and competitors
 * - Access real-time data from connected systems
 * - Build institutional memory that persists
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

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
app.use(cors(), express.json());
const PORT = process.env.KNOWLEDGE_OS_PORT || 4590;

// In-memory stores (would be Redis + Vector DB in production)
const knowledgeBases = new Map();   // kbId -> knowledge base
const documents = new Map();         // docId -> document
const embeddings = new Map();       // docId -> embeddings
const learningSessions = new Map();  // sessionId -> learning session
const agentMemories = new Map();    // agentId -> agent memory

// Knowledge source types
const SOURCE_TYPES = {
  DOCUMENT: 'document',
  CONVERSATION: 'conversation',
  FEEDBACK: 'feedback',
  DATA: 'data',
  API: 'api',
  WEB: 'web'
};

// Document types
const DOCUMENT_TYPES = {
  POLICY: 'policy',
  SOP: 'sop',
  MANUAL: 'manual',
  REPORT: 'report',
  EMAIL: 'email',
  CHAT: 'chat',
  TICKET: 'ticket',
  FORM: 'form',
  WIKI: 'wiki',
  CONTRACT: 'contract',
  KNOWLEDGE_BASE: 'knowledge_base',
  TRAINING: 'training',
  COMPLIANCE: 'compliance'
};

/**
 * KNOWLEDGE BASE MANAGEMENT
 */

// POST /api/knowledge-bases - Create a knowledge base
app.post('/api/knowledge-bases', requireInternal, (req, res) => {
  const { name, description, type, owner, settings } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const kbId = uuidv4();
  const kb = {
    id: kbId,
    name,
    description: description || '',
    type: type || 'general',
    owner,
    settings: settings || {
      embeddingModel: 'text-embedding-ada-002',
      chunkSize: 1000,
      overlap: 200,
      retrievalMode: 'hybrid', // semantic, keyword, hybrid
      maxResults: 5,
      reranking: true
    },
    stats: {
      documents: 0,
      chunks: 0,
      size: 0,
      lastUpdated: null
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  knowledgeBases.set(kbId, kb);

  res.status(201).json({
    success: true,
    knowledgeBase: {
      id: kbId,
      name,
      type,
      settings: kb.settings,
      stats: kb.stats
    }
  });
});

// GET /api/knowledge-bases - List knowledge bases
app.get('/api/knowledge-bases', (req, res) => {
  const { owner, type } = req.query;

  let bases = Array.from(knowledgeBases.values());

  if (owner) {
    bases = bases.filter(kb => kb.owner === owner);
  }
  if (type) {
    bases = bases.filter(kb => kb.type === type);
  }

  res.json({
    success: true,
    count: bases.length,
    knowledgeBases: bases.map(kb => ({
      id: kb.id,
      name: kb.name,
      type: kb.type,
      stats: kb.stats,
      createdAt: kb.createdAt
    }))
  });
});

// GET /api/knowledge-bases/:id - Get knowledge base details
app.get('/api/knowledge-bases/:id', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found' });
  }
  res.json({ success: true, knowledgeBase: kb });
});

// DELETE /api/knowledge-bases/:id - Delete knowledge base
app.delete('/api/knowledge-bases/:id', requireInternal, (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found' });
  }

  // Delete associated documents
  for (const [docId, doc] of documents.entries()) {
    if (doc.kbId === req.params.id) {
      documents.delete(docId);
      embeddings.delete(docId);
    }
  }

  knowledgeBases.delete(req.params.id);

  res.json({ success: true, message: 'Knowledge base deleted' });
});

/**
 * DOCUMENT MANAGEMENT
 */

// POST /api/documents - Add a document to a knowledge base
app.post('/api/documents', requireInternal, (req, res) => {
  const { kbId, title, content, type, metadata, source } = req.body;

  if (!kbId || !title || !content) {
    return res.status(400).json({ error: 'kbId, title, and content are required' });
  }

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found' });
  }

  const docId = uuidv4();
  const now = new Date().toISOString();

  // Split content into chunks for embedding
  const chunks = splitIntoChunks(content, kb.settings.chunkSize, kb.settings.overlap);

  const doc = {
    id: docId,
    kbId,
    title,
    content,
    type: type || DOCUMENT_TYPES.WIKI,
    source: source || SOURCE_TYPES.DOCUMENT,
    metadata: metadata || {},
    chunks,
    chunkCount: chunks.length,
    status: 'indexed',
    createdAt: now,
    updatedAt: now
  };

  documents.set(docId, doc);

  // Create embeddings for each chunk
  embeddings.set(docId, chunks.map((chunk, idx) => ({
    chunkIndex: idx,
    text: chunk,
    vector: generateMockEmbedding(chunk), // In production, call embedding API
    metadata: { docId, title, type }
  })));

  // Update KB stats
  kb.stats.documents++;
  kb.stats.chunks += chunks.length;
  kb.stats.size += content.length;
  kb.stats.lastUpdated = now;
  kb.updatedAt = now;

  res.status(201).json({
    success: true,
    document: {
      id: docId,
      title,
      type,
      chunks: chunks.length,
      status: 'indexed'
    }
  });
});

// POST /api/documents/batch - Batch add documents
app.post('/api/documents/batch', requireInternal, (req, res) => {
  const { kbId, documents: docs } = req.body;

  if (!kbId || !docs || !Array.isArray(docs)) {
    return res.status(400).json({ error: 'kbId and documents array are required' });
  }

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found' });
  }

  const results = [];
  const now = new Date().toISOString();

  for (const doc of docs) {
    const docId = uuidv4();
    const chunks = splitIntoChunks(doc.content, kb.settings.chunkSize, kb.settings.overlap);

    const newDoc = {
      id: docId,
      kbId,
      title: doc.title,
      content: doc.content,
      type: doc.type || DOCUMENT_TYPES.WIKI,
      source: doc.source || SOURCE_TYPES.DOCUMENT,
      metadata: doc.metadata || {},
      chunks,
      chunkCount: chunks.length,
      status: 'indexed',
      createdAt: now,
      updatedAt: now
    };

    documents.set(docId, newDoc);
    embeddings.set(docId, chunks.map((chunk, idx) => ({
      chunkIndex: idx,
      text: chunk,
      vector: generateMockEmbedding(chunk),
      metadata: { docId, title: doc.title, type: doc.type }
    })));

    kb.stats.documents++;
    kb.stats.chunks += chunks.length;
    kb.stats.size += doc.content.length;

    results.push({ id: docId, title: doc.title, status: 'indexed' });
  }

  kb.stats.lastUpdated = now;
  kb.updatedAt = now;

  res.status(201).json({
    success: true,
    count: results.length,
    documents: results
  });
});

// GET /api/documents - List documents
app.get('/api/documents', (req, res) => {
  const { kbId, type, status } = req.query;

  let docList = Array.from(documents.values());

  if (kbId) {
    docList = docList.filter(d => d.kbId === kbId);
  }
  if (type) {
    docList = docList.filter(d => d.type === type);
  }
  if (status) {
    docList = docList.filter(d => d.status === status);
  }

  res.json({
    success: true,
    count: docList.length,
    documents: docList.map(d => ({
      id: d.id,
      kbId: d.kbId,
      title: d.title,
      type: d.type,
      chunkCount: d.chunkCount,
      status: d.status,
      createdAt: d.createdAt
    }))
  });
});

// GET /api/documents/:id - Get document
app.get('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true, document: doc });
});

// DELETE /api/documents/:id - Delete document
app.delete('/api/documents/:id', requireInternal, (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const kb = knowledgeBases.get(doc.kbId);
  if (kb) {
    kb.stats.documents--;
    kb.stats.chunks -= doc.chunkCount;
    kb.stats.size -= doc.content.length;
    kb.updatedAt = new Date().toISOString();
  }

  documents.delete(req.params.id);
  embeddings.delete(req.params.id);

  res.json({ success: true, message: 'Document deleted' });
});

/**
 * SEMANTIC SEARCH (RAG)
 */

// POST /api/search - Search knowledge base
app.post('/api/search', requireInternal, (req, res) => {
  const { query, kbId, maxResults, filters, mode } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  const queryVector = generateMockEmbedding(query);
  const limit = maxResults || 5;

  // Gather all chunks to search
  let chunks = [];
  if (kbId) {
    const kb = knowledgeBases.get(kbId);
    if (!kb) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }
    for (const [docId, docEmbeds] of embeddings.entries()) {
      const doc = documents.get(docId);
      if (doc && doc.kbId === kbId) {
        chunks.push(...docEmbeds);
      }
    }
  } else {
    for (const [docId, docEmbeds] of embeddings.entries()) {
      chunks.push(...docEmbeds);
    }
  }

  // Simple similarity search (cosine similarity on mock vectors)
  const results = chunks
    .map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryVector, chunk.vector),
      score: cosineSimilarity(queryVector, chunk.vector)
    }))
    .filter(chunk => chunk.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(chunk => ({
      text: chunk.text,
      score: Math.round(chunk.similarity * 100) / 100,
      docId: chunk.metadata.docId,
      title: chunk.metadata.title,
      type: chunk.metadata.type
    }));

  res.json({
    success: true,
    query,
    mode: mode || 'semantic',
    results,
    totalChunks: chunks.length
  });
});

// POST /api/rag - Retrieval Augmented Generation request
app.post('/api/rag', requireInternal, (req, res) => {
  const { query, kbId, agentId, context, options } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  // Search for relevant context
  const searchResults = performSearch(query, kbId, options?.maxResults || 5);

  // Build context string
  const contextString = searchResults
    .map((r, i) => `[Source ${i + 1}: ${r.title}]\n${r.text}`)
    .join('\n\n');

  // Log the RAG request for learning
  const sessionId = options?.sessionId || uuidv4();
  const session = learningSessions.get(sessionId) || {
    id: sessionId,
    agentId,
    queries: [],
    createdAt: new Date().toISOString()
  };
  session.queries.push({
    query,
    context: contextString,
    results: searchResults,
    timestamp: new Date().toISOString()
  });
  learningSessions.set(sessionId, session);

  // Return context for LLM to use
  res.json({
    success: true,
    query,
    sessionId,
    context: {
      chunks: searchResults,
      fullContext: contextString,
      tokenEstimate: estimateTokens(contextString)
    },
    instructions: `Use the provided context to answer the query. Cite sources when possible.`
  });
});

/**
 * AGENT MEMORY MANAGEMENT
 */

// GET /api/agents/:agentId/memory - Get agent memory
app.get('/api/agents/:agentId/memory', (req, res) => {
  const { agentId } = req.params;
  const { type, limit } = req.query;

  let memory = agentMemories.get(agentId) || { agentId, memories: [], lastUpdated: null };

  let memories = memory.memories;
  if (type) {
    memories = memories.filter(m => m.type === type);
  }
  if (limit) {
    memories = memories.slice(-parseInt(limit));
  }

  res.json({
    success: true,
    agentId,
    count: memories.length,
    memories
  });
});

// POST /api/agents/:agentId/memory - Add to agent memory
app.post('/api/agents/:agentId/memory', requireInternal, (req, res) => {
  const { agentId } = req.params;
  const { type, content, metadata, tags, importance } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  let memory = agentMemories.get(agentId);
  if (!memory) {
    memory = {
      agentId,
      memories: [],
      createdAt: new Date().toISOString()
    };
    agentMemories.set(agentId, memory);
  }

  const entry = {
    id: uuidv4(),
    type: type || 'interaction',
    content,
    metadata: metadata || {},
    tags: tags || [],
    importance: importance || 5, // 1-10
    learned: false,
    reinforced: 0,
    createdAt: new Date().toISOString()
  };

  memory.memories.push(entry);
  memory.lastUpdated = new Date().toISOString();

  res.status(201).json({
    success: true,
    memory: entry
  });
});

// POST /api/agents/:agentId/memory/learn - Mark memory as learned
app.post('/api/agents/:agentId/memory/learn', requireInternal, (req, res) => {
  const { agentId } = req.params;
  const { memoryId, reinforcement } = req.body;

  const memory = agentMemories.get(agentId);
  if (!memory) {
    return res.status(404).json({ error: 'Agent memory not found' });
  }

  const entry = memory.memories.find(m => m.id === memoryId);
  if (!entry) {
    return res.status(404).json({ error: 'Memory entry not found' });
  }

  entry.learned = true;
  if (reinforcement) {
    entry.reinforced++;
    entry.importance = Math.min(10, entry.importance + 0.5);
  }
  entry.learnedAt = new Date().toISOString();

  res.json({
    success: true,
    memory: entry
  });
});

// DELETE /api/agents/:agentId/memory - Clear agent memory
app.delete('/api/agents/:agentId/memory', requireInternal, (req, res) => {
  const { agentId } = req.params;
  const { olderThan, type } = req.query;

  const memory = agentMemories.get(agentId);
  if (!memory) {
    return res.status(404).json({ error: 'Agent memory not found' });
  }

  let deleted = 0;
  memory.memories = memory.memories.filter(m => {
    if (olderThan && new Date(m.createdAt) < new Date(olderThan)) {
      deleted++;
      return false;
    }
    if (type && m.type === type) {
      deleted++;
      return false;
    }
    return true;
  });

  memory.lastUpdated = new Date().toISOString();

  res.json({
    success: true,
    deleted
  });
});

/**
 * LEARNING & FEEDBACK
 */

// POST /api/feedback - Record feedback
app.post('/api/feedback', requireInternal, (req, res) => {
  const { agentId, type, content, outcome, rating, metadata } = req.body;

  if (!agentId || !content) {
    return res.status(400).json({ error: 'agentId and content are required' });
  }

  const feedback = {
    id: uuidv4(),
    agentId,
    type: type || 'correction',
    content,
    outcome,
    rating: rating || null,
    metadata: metadata || {},
    processed: false,
    createdAt: new Date().toISOString()
  };

  // Store in agent memory
  let memory = agentMemories.get(agentId);
  if (!memory) {
    memory = { agentId, memories: [], createdAt: new Date().toISOString() };
    agentMemories.set(agentId, memory);
  }

  memory.memories.push({
    id: uuidv4(),
    type: 'feedback',
    content: `Feedback: ${content}. Outcome: ${outcome || 'pending'}. Rating: ${rating || 'N/A'}`,
    metadata: { feedbackId: feedback.id, rating, outcome },
    importance: 8,
    learned: false,
    reinforced: 0,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    feedback: {
      id: feedback.id,
      type: feedback.type,
      rating: feedback.rating
    }
  });
});

// GET /api/analytics - Get learning analytics
app.get('/api/analytics', (req, res) => {
  const { kbId, agentId, period } = req.query;

  let docStats = { total: 0, byType: {} };
  let agentStats = [];

  // Document stats
  for (const doc of documents.values()) {
    if (kbId && doc.kbId !== kbId) continue;
    docStats.total++;
    docStats.byType[doc.type] = (docStats.byType[doc.type] || 0) + 1;
  }

  // Agent stats
  for (const [agId, memory] of agentMemories.entries()) {
    if (agentId && agId !== agentId) continue;
    const learnedCount = memory.memories.filter(m => m.learned).length;
    agentStats.push({
      agentId: agId,
      totalMemories: memory.memories.length,
      learnedMemories: learnedCount,
      reinforcementAvg: memory.memories.reduce((sum, m) => sum + m.reinforced, 0) / memory.memories.length,
      lastUpdated: memory.lastUpdated
    });
  }

  res.json({
    success: true,
    period: period || 'all',
    knowledgeBase: docStats,
    agents: agentStats,
    system: {
      totalKnowledgeBases: knowledgeBases.size,
      totalDocuments: documents.size,
      totalChunks: embeddings.size,
      totalAgents: agentMemories.size
    }
  });
});

/**
 * LEARNING SESSIONS
 */

// GET /api/sessions - List learning sessions
app.get('/api/sessions', (req, res) => {
  const { agentId } = req.query;

  let sessions = Array.from(learningSessions.values());
  if (agentId) {
    sessions = sessions.filter(s => s.agentId === agentId);
  }

  res.json({
    success: true,
    count: sessions.length,
    sessions: sessions.map(s => ({
      id: s.id,
      agentId: s.agentId,
      queryCount: s.queries.length,
      createdAt: s.createdAt,
      lastQuery: s.queries[s.queries.length - 1]?.timestamp
    }))
  });
});

// GET /api/sessions/:id - Get session details
app.get('/api/sessions/:id', (req, res) => {
  const session = learningSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true, session });
});

/**
 * HELPER FUNCTIONS
 */

function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  const words = text.split(/\s+/);
  let currentChunk = [];
  let currentLength = 0;

  for (const word of words) {
    currentChunk.push(word);
    currentLength += word.length + 1;

    if (currentLength >= chunkSize) {
      chunks.push(currentChunk.join(' '));
      // Keep overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords;
      currentLength = overlapWords.join(' ').length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

function generateMockEmbedding(text) {
  // Generate a mock embedding vector
  // In production, call OpenAI/Cohere embedding API
  const dim = 1536;
  const seed = hashString(text);
  const vector = [];

  for (let i = 0; i < dim; i++) {
    const pseudoRandom = Math.sin(seed + i * 12.9898) * 43758.5453;
    vector.push((pseudoRandom - Math.floor(pseudoRandom)) * 2 - 1);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function performSearch(query, kbId, maxResults) {
  const queryVector = generateMockEmbedding(query);
  let chunks = [];

  for (const [docId, docEmbeds] of embeddings.entries()) {
    const doc = documents.get(docId);
    if (kbId && doc.kbId !== kbId) continue;

    chunks.push(...docEmbeds.map(e => ({
      ...e,
      similarity: cosineSimilarity(queryVector, e.vector)
    })));
  }

  return chunks
    .filter(c => c.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)
    .map(c => ({
      text: c.text,
      score: Math.round(c.similarity * 100) / 100,
      docId: c.metadata.docId,
      title: c.metadata.title,
      type: c.metadata.type
    }));
}

function estimateTokens(text) {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'knowledge-os',
    status: 'healthy',
    stats: {
      knowledgeBases: knowledgeBases.size,
      documents: documents.size,
      chunks: embeddings.size,
      agents: agentMemories.size,
      sessions: learningSessions.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  KnowledgeOS — PORT ${PORT}                            ║
║  Continuous Learning & Knowledge Management          ║
╠══════════════════════════════════════════════════════╣
║  Knowledge Bases: ${knowledgeBases.size.toString().padEnd(28)}║
║  Documents: ${documents.size.toString().padEnd(36)}║
║  AI Agents Learning: ${agentMemories.size.toString().padEnd(28)}║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
