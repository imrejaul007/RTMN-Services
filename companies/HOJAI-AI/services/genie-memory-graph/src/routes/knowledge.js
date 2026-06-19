/**
 * Knowledge Routes - Knowledge graph management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { NODE_TYPES, EDGE_TYPES, SOURCE_TYPES } from '../types/graphTypes.js';

const router = express.Router();

/**
 * POST /knowledge/triple
 * Add a knowledge triple (subject, predicate, object)
 */
router.post('/knowledge/triple', async (req, res) => {
  const { userId, subject, predicate, object, confidence, source } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !subject || !predicate || !object) {
    return res.status(400).json({
      success: false,
      error: 'userId, subject, predicate, and object are required'
    });
  }

  // Initialize storage
  if (!storage.knowledgeTriples.has(userId)) {
    storage.knowledgeTriples.set(userId, []);
  }
  if (!storage.nodes.has(userId)) {
    storage.nodes.set(userId, new Map());
  }

  const triple = {
    id: uuidv4(),
    subject,
    predicate,
    object,
    confidence: confidence || 0.8,
    source: source || SOURCE_TYPES.EXPLICIT,
    createdAt: new Date().toISOString()
  };

  storage.knowledgeTriples.get(userId).push(triple);

  // Add nodes if they don't exist
  addNodeIfNotExists(storage, userId, subject, 'entity');
  addNodeIfNotExists(storage, userId, object, 'entity');

  res.json({ success: true, triple });
});

/**
 * POST /knowledge/batch
 * Add multiple triples at once
 */
router.post('/knowledge/batch', async (req, res) => {
  const { userId, triples } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !triples || !Array.isArray(triples)) {
    return res.status(400).json({
      success: false,
      error: 'userId and triples array are required'
    });
  }

  if (!storage.knowledgeTriples.has(userId)) {
    storage.knowledgeTriples.set(userId, []);
  }

  const added = [];
  triples.forEach(triple => {
    const newTriple = {
      id: uuidv4(),
      subject: triple.subject,
      predicate: triple.predicate,
      object: triple.object,
      confidence: triple.confidence || 0.8,
      source: triple.source || SOURCE_TYPES.EXPLICIT,
      createdAt: new Date().toISOString()
    };
    storage.knowledgeTriples.get(userId).push(newTriple);
    added.push(newTriple);
  });

  res.json({ success: true, added: added.length, triples: added });
});

/**
 * GET /knowledge/:userId
 * Get all knowledge for user
 */
router.get('/knowledge/:userId', async (req, res) => {
  const { userId } = req.params;
  const { predicate, subject, limit } = req.query;
  const storage = req.app.locals.graphStorage;

  let triples = storage.knowledgeTriples.get(userId) || [];

  // Filter by predicate
  if (predicate) {
    triples = triples.filter(t => t.predicate === predicate);
  }

  // Filter by subject
  if (subject) {
    triples = triples.filter(t => t.subject.toLowerCase().includes(subject.toLowerCase()));
  }

  // Apply limit
  if (limit) {
    triples = triples.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    triples,
    count: triples.length
  });
});

/**
 * GET /knowledge/:userId/search
 * Search knowledge
 */
router.get('/knowledge/:userId/search', async (req, res) => {
  const { userId } = req.params;
  const { q, type } = req.query;
  const storage = req.app.locals.graphStorage;

  const triples = storage.knowledgeTriples.get(userId) || [];
  const query = q?.toLowerCase() || '';

  let results = triples.filter(t =>
    t.subject.toLowerCase().includes(query) ||
    t.predicate.toLowerCase().includes(query) ||
    t.object.toLowerCase().includes(query)
  );

  // Filter by type (subject or object type)
  if (type) {
    // This would require node type tracking
    results = results.slice(0, 20);
  } else {
    results = results.slice(0, 20);
  }

  res.json({
    success: true,
    query: q,
    results,
    count: results.length
  });
});

/**
 * GET /knowledge/:userId/graph
 * Get knowledge as graph data
 */
router.get('/knowledge/:userId/graph', async (req, res) => {
  const { userId } = req.params;
  const { depth } = req.query;
  const storage = req.app.locals.graphStorage;

  const triples = storage.knowledgeTriples.get(userId) || [];
  const nodesMap = storage.nodes.get(userId) || new Map();

  // Build nodes
  const nodes = [];
  const seenNodes = new Set();

  triples.forEach(t => {
    if (!seenNodes.has(t.subject)) {
      seenNodes.add(t.subject);
      nodes.push({
        id: t.subject,
        label: t.subject,
        type: 'concept'
      });
    }
    if (!seenNodes.has(t.object)) {
      seenNodes.add(t.object);
      nodes.push({
        id: t.object,
        label: t.object,
        type: 'concept'
      });
    }
  });

  // Build edges
  const edges = triples.map(t => ({
    id: t.id,
    source: t.subject,
    target: t.object,
    label: t.predicate,
    confidence: t.confidence
  }));

  res.json({
    success: true,
    nodes,
    edges,
    stats: {
      nodes: nodes.length,
      edges: edges.length
    }
  });
});

/**
 * DELETE /knowledge/:userId/:tripleId
 * Delete a triple
 */
router.delete('/knowledge/:userId/:tripleId', async (req, res) => {
  const { userId, tripleId } = req.params;
  const storage = req.app.locals.graphStorage;

  const triples = storage.knowledgeTriples.get(userId) || [];
  const filtered = triples.filter(t => t.id !== tripleId);

  if (filtered.length === triples.length) {
    return res.status(404).json({ success: false, error: 'Triple not found' });
  }

  storage.knowledgeTriples.set(userId, filtered);

  res.json({ success: true, message: 'Triple deleted' });
});

/**
 * GET /knowledge/:userId/infer
 * Infer new knowledge from existing triples
 */
router.get('/knowledge/:userId/infer', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const triples = storage.knowledgeTriples.get(userId) || [];
  const inferences = [];

  // Simple inference: if A knows B and B knows C, suggest A might know C
  const knowsTriples = triples.filter(t => t.predicate === 'knows');

  knowsTriples.forEach(t1 => {
    knowsTriples.forEach(t2 => {
      if (t1.object === t2.subject && t1.subject !== t2.object) {
        // Check if already exists
        const exists = triples.some(t =>
          t.subject === t1.subject &&
          t.predicate === 'might_know' &&
          t.object === t2.object
        );

        if (!exists) {
          inferences.push({
            subject: t1.subject,
            predicate: 'might_know',
            object: t2.object,
            confidence: 0.4,
            reason: `Transitive: ${t1.subject} knows ${t1.object} who knows ${t2.object}`,
            source: SOURCE_TYPES.INFERRED
          });
        }
      }
    });
  });

  res.json({
    success: true,
    inferences: inferences.slice(0, 10),
    count: inferences.length
  });
});

/**
 * POST /knowledge/:userId/import
 * Import knowledge from text (AI parses)
 */
router.post('/knowledge/:userId/import', async (req, res) => {
  const { userId, text } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  // Simple extraction - in production, use AI/NLP
  const triples = extractKnowledgeFromText(text);

  if (!storage.knowledgeTriples.has(userId)) {
    storage.knowledgeTriples.set(userId, []);
  }

  const added = [];
  triples.forEach(triple => {
    const newTriple = {
      id: uuidv4(),
      ...triple,
      source: SOURCE_TYPES.MEMORY,
      confidence: 0.7,
      createdAt: new Date().toISOString()
    };
    storage.knowledgeTriples.get(userId).push(newTriple);
    added.push(newTriple);
  });

  res.json({
    success: true,
    extracted: added.length,
    triples: added
  });
});

// Helper functions
function addNodeIfNotExists(storage, userId, name, type) {
  if (!storage.nodes.has(userId)) {
    storage.nodes.set(userId, new Map());
  }
  const nodes = storage.nodes.get(userId);
  if (!nodes.has(name)) {
    nodes.set(name, {
      id: name,
      type,
      label: name,
      createdAt: new Date().toISOString()
    });
  }
}

function extractKnowledgeFromText(text) {
  // Simple extraction - in production, use NLP
  const triples = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());

  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && trimmed.length < 200) {
      triples.push({
        subject: 'user',
        predicate: 'said',
        object: trimmed
      });
    }
  });

  return triples;
}

export default router;
