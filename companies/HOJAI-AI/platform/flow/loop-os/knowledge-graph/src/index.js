/**
 * LoopOS Knowledge Graph Service
 * Entity relationships, ontology, and causal reasoning
 * Port: 4738
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4738;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// In-memory graph stores
const entities = new Map();      // entityId -> Entity
const relations = new Map();      // relationId -> Relation
const ontologies = new Map();    // ontologyId -> Ontology
const entityIndex = new Map();   // type -> Set<entityId> for fast lookup
const relationIndex = new Map(); // (fromId, type, toId) -> relationId

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'knowledge-graph',
  version: '1.0.0',
  port: PORT,
  entities: entities.size,
  relations: relations.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Entity Management ───────────────────────────────────

/**
 * Create entity
 * POST /api/entities
 */
app.post('/api/entities', requireAuth, (req, res) => {
  const { id, type, name, properties = {}, aliases = [] } = req.body || {};

  if (!type || !name) return res.status(400).json({ error: 'type and name are required' });

  const entityId = id || `${type}-${randomUUID().slice(0, 8)}`;

  if (entities.has(entityId)) {
    return res.status(409).json({ error: 'entity already exists', id: entityId });
  }

  const entity = {
    id: entityId,
    type,
    name,
    properties,
    aliases: [name.toLowerCase(), ...aliases.map(a => a.toLowerCase())],
    relations: [],
    confidence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  entities.set(entityId, entity);

  // Index by type
  if (!entityIndex.has(type)) entityIndex.set(type, new Set());
  entityIndex.get(type).add(entityId);

  logger.info(`Entity created: ${entityId} (${type})`);
  res.status(201).json(entity);
});

/**
 * Get entity
 * GET /api/entities/:id
 */
app.get('/api/entities/:id', (req, res) => {
  const entity = entities.get(req.params.id);
  if (!entity) return res.status(404).json({ error: 'entity not found' });
  res.json(entity);
});

/**
 * List entities
 * GET /api/entities
 */
app.get('/api/entities', (req, res) => {
  const { type, search, limit = 100 } = req.query;
  let items = [...entities.values()];

  if (type) items = items.filter(e => e.type === type);
  if (search) {
    const term = search.toLowerCase();
    items = items.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.aliases.some(a => a.includes(term))
    );
  }

  items = items.slice(0, Number(limit));
  res.json({ count: items.length, entities: items });
});

/**
 * Update entity
 * PUT /api/entities/:id
 */
app.put('/api/entities/:id', requireAuth, (req, res) => {
  const entity = entities.get(req.params.id);
  if (!entity) return res.status(404).json({ error: 'entity not found' });

  const { name, properties, aliases, confidence } = req.body || {};

  if (name) entity.name = name;
  if (properties) entity.properties = { ...entity.properties, ...properties };
  if (aliases) entity.aliases = [entity.name.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
  if (confidence !== undefined) entity.confidence = confidence;
  entity.updatedAt = new Date().toISOString();

  res.json(entity);
});

/**
 * Delete entity
 * DELETE /api/entities/:id
 */
app.delete('/api/entities/:id', requireAuth, (req, res) => {
  if (!entities.has(req.params.id)) return res.status(404).json({ error: 'entity not found' });

  const entity = entities.get(req.params.id);

  // Remove from type index
  if (entityIndex.has(entity.type)) {
    entityIndex.get(entity.type).delete(req.params.id);
  }

  // Remove related relations
  for (const [relId, rel] of relations) {
    if (rel.from === req.params.id || rel.to === req.params.id) {
      relations.delete(relId);
    }
  }

  entities.delete(req.params.id);
  logger.info(`Entity deleted: ${req.params.id}`);
  res.json({ deleted: true, id: req.params.id });
});

// ── Relation Management ─────────────────────────────────

/**
 * Create relation
 * POST /api/relations
 */
app.post('/api/relations', requireAuth, (req, res) => {
  const { from, to, type, properties = {}, bidirectional = false } = req.body || {};

  if (!from || !to || !type) {
    return res.status(400).json({ error: 'from, to, and type are required' });
  }

  if (!entities.has(from)) return res.status(404).json({ error: 'source entity not found' });
  if (!entities.has(to)) return res.status(404).json({ error: 'target entity not found' });

  const id = `rel-${randomUUID().slice(0, 8)}`;
  const relation = {
    id,
    from,
    to,
    type,
    properties,
    confidence: 1,
    createdAt: new Date().toISOString()
  };

  relations.set(id, relation);

  // Update entity relation lists
  entities.get(from).relations.push(id);
  entities.get(to).incomingRelations = entities.get(to).incomingRelations || [];
  entities.get(to).incomingRelations.push(id);

  // Index for fast lookup
  relationIndex.set(`${from}:${type}:${to}`, id);
  if (bidirectional) {
    relationIndex.set(`${to}:${type}:${from}`, id);
  }

  logger.info(`Relation created: ${from} --[${type}]--> ${to}`);
  res.status(201).json(relation);
});

/**
 * List relations
 * GET /api/relations
 */
app.get('/api/relations', (req, res) => {
  const { from, to, type, limit = 100 } = req.query;
  let items = [...relations.values()];

  if (from) items = items.filter(r => r.from === from);
  if (to) items = items.filter(r => r.to === to);
  if (type) items = items.filter(r => r.type === type);

  items = items.slice(0, Number(limit));
  res.json({ count: items.length, relations: items });
});

/**
 * Get relations for entity
 * GET /api/entities/:id/relations
 */
app.get('/api/entities/:id/relations', (req, res) => {
  const entity = entities.get(req.params.id);
  if (!entity) return res.status(404).json({ error: 'entity not found' });

  const { direction = 'outgoing' } = req.query;

  let related = [];
  for (const [relId, rel] of relations) {
    if (direction === 'outgoing' && rel.from === req.params.id) {
      related.push({ ...rel, targetEntity: entities.get(rel.to) });
    } else if (direction === 'incoming' && rel.to === req.params.id) {
      related.push({ ...rel, sourceEntity: entities.get(rel.from) });
    } else if (direction === 'both' && (rel.from === req.params.id || rel.to === req.params.id)) {
      const isOutgoing = rel.from === req.params.id;
      related.push({
        ...rel,
        sourceEntity: isOutgoing ? entity : entities.get(rel.from),
        targetEntity: isOutgoing ? entities.get(rel.to) : entity
      });
    }
  }

  res.json({ count: related.length, relations: related });
});

/**
 * Delete relation
 * DELETE /api/relations/:id
 */
app.delete('/api/relations/:id', requireAuth, (req, res) => {
  if (!relations.has(req.params.id)) return res.status(404).json({ error: 'relation not found' });

  const rel = relations.get(req.params.id);
  relations.delete(req.params.id);

  // Remove from entity relation lists
  const fromEntity = entities.get(rel.from);
  if (fromEntity) {
    fromEntity.relations = fromEntity.relations.filter(id => id !== req.params.id);
  }

  res.json({ deleted: true, id: req.params.id });
});

// ── Graph Traversal ─────────────────────────────────────

/**
 * Find connected entities (graph traversal)
 * GET /api/entities/:id/connections
 */
app.get('/api/entities/:id/connections', (req, res) => {
  const { depth = 1, relationType, targetType } = req.query;
  const maxDepth = Math.min(Number(depth) || 1, 5);

  if (!entities.has(req.params.id)) {
    return res.status(404).json({ error: 'entity not found' });
  }

  const visited = new Set();
  const results = [];
  const queue = [{ id: req.params.id, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.depth > 0) {
      const entity = entities.get(current.id);
      results.push({ ...entity, depth: current.depth });
    }

    if (current.depth >= maxDepth) continue;

    // Find all connected entities
    for (const [relId, rel] of relations) {
      if (rel.from === current.id) {
        const nextEntity = entities.get(rel.to);
        if (nextEntity && !visited.has(rel.to)) {
          if (!relationType || rel.type === relationType) {
            if (!targetType || nextEntity.type === targetType) {
              queue.push({ id: rel.to, depth: current.depth + 1, viaRelation: rel.type });
            }
          }
        }
      }
    }
  }

  res.json({ count: results.length, connections: results });
});

/**
 * Find path between entities
 * GET /api/path
 */
app.get('/api/path', (req, res) => {
  const { from, to, maxDepth = 5 } = req.query;

  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  if (!entities.has(from) || !entities.has(to)) {
    return res.status(404).json({ error: 'entity not found' });
  }

  const path = findShortestPath(from, to, Number(maxDepth));

  if (path.length === 0) {
    return res.json({ path: null, message: 'No path found' });
  }

  res.json({ path, length: path.length - 1 });
});

function findShortestPath(fromId, toId, maxDepth) {
  const visited = new Set();
  const queue = [{ id: fromId, path: [{ id: fromId, name: entities.get(fromId).name }] }];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === toId) return current.path;

    if (current.path.length >= maxDepth) continue;

    for (const [relId, rel] of relations) {
      if (rel.from === current.id && !visited.has(rel.to)) {
        const nextEntity = entities.get(rel.to);
        queue.push({
          id: rel.to,
          path: [...current.path, { id: rel.to, name: nextEntity.name, viaRelation: rel.type }]
        });
      }
    }
  }

  return [];
}

// ── Entity Resolution ────────────────────────────────────

/**
 * Resolve entity (deduplication)
 * POST /api/resolve
 */
app.post('/api/resolve', requireAuth, (req, res) => {
  const { name, type } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const term = name.toLowerCase();

  // Search by name or alias
  for (const [id, entity] of entities) {
    if (entity.name.toLowerCase() === term) {
      return res.json({ resolved: true, entity, match: 'exact' });
    }
    if (entity.aliases.some(a => a === term)) {
      return res.json({ resolved: true, entity, match: 'alias' });
    }
    if (entity.aliases.some(a => a.includes(term) || term.includes(a))) {
      return res.json({ resolved: true, entity, match: 'partial' });
    }
  }

  // Suggest potential matches
  const suggestions = [];
  for (const [id, entity] of entities) {
    if (type && entity.type !== type) continue;
    if (entity.name.toLowerCase().includes(term) || term.includes(entity.name.toLowerCase())) {
      suggestions.push(entity);
    }
  }

  res.json({ resolved: false, suggestions: suggestions.slice(0, 5) });
});

/**
 * Merge entities
 * POST /api/entities/:id/merge
 */
app.post('/api/entities/:id/merge', requireAuth, (req, res) => {
  const { sourceId } = req.body || {};

  if (!entities.has(sourceId)) {
    return res.status(404).json({ error: 'source entity not found' });
  }

  const target = entities.get(req.params.id);
  const source = entities.get(sourceId);

  // Merge properties
  target.properties = { ...source.properties, ...target.properties };

  // Add aliases
  for (const alias of source.aliases) {
    if (!target.aliases.includes(alias)) {
      target.aliases.push(alias);
    }
  }

  target.updatedAt = new Date().toISOString();

  // Move relations from source to target
  for (const [relId, rel] of relations) {
    if (rel.from === sourceId) {
      rel.from = req.params.id;
    }
    if (rel.to === sourceId) {
      rel.to = req.params.id;
    }
  }

  // Delete source
  entities.delete(sourceId);
  if (entityIndex.has(source.type)) {
    entityIndex.get(source.type).delete(sourceId);
  }

  logger.info(`Entities merged: ${sourceId} -> ${req.params.id}`);
  res.json(target);
});

// ── Ontology Management ───────────────────────────────────

/**
 * Create ontology schema
 * POST /api/ontologies
 */
app.post('/api/ontologies', requireAuth, (req, res) => {
  const { name, version, entities: schemaEntities = [], relations: schemaRelations = [] } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `ont-${randomUUID().slice(0, 8)}`;
  const ontology = {
    id,
    name,
    version: version || '1.0.0',
    entities: schemaEntities,
    relations: schemaRelations,
    createdAt: new Date().toISOString()
  };

  ontologies.set(id, ontology);
  logger.info(`Ontology created: ${id} (${name})`);
  res.status(201).json(ontology);
});

/**
 * List ontologies
 * GET /api/ontologies
 */
app.get('/api/ontologies', (_req, res) => {
  const all = [...ontologies.values()];
  res.json({ count: all.length, ontologies: all });
});
});

/**
 * Get ontology
 * GET /api/ontologies/:id
 */
app.get('/api/ontologies/:id', (req, res) => {
  const ontology = ontologies.get(req.params.id);
  if (!ontology) return res.status(404).json({ error: 'ontology not found' });
  res.json(ontology);
});

// ── Causal Reasoning ────────────────────────────────────

/**
 * Query causal relationships
 * POST /api/causes
 */
app.post('/api/causes', requireAuth, (req, res) => {
  const { entity, type = 'cause' } = req.body || {};

  if (!entity) return res.status(400).json({ error: 'entity is required' });

  // Find cause/effect relations
  const causalRelations = [];
  for (const [relId, rel] of relations) {
    if ((rel.type === 'causes' || rel.type === 'leads_to' || rel.type === 'enables') &&
        (rel.from === entity || rel.to === entity)) {
      const isCause = type === 'cause';
      if ((isCause && rel.from === entity) || (!isCause && rel.to === entity)) {
        causalRelations.push({
          ...rel,
          relatedEntity: entities.get(isCause ? rel.to : rel.from)
        });
      }
    }
  }

  res.json({ type, entity, causes: causalRelations });
});

/**
 * Infer likely causes
 * POST /api/infer-causes
 */
app.post('/api/infer-causes', requireAuth, (req, res) => {
  const { effect } = req.body || {};

  if (!effect) return res.status(400).json({ error: 'effect is required' });

  // Find patterns: entities that commonly precede this effect
  const patterns = new Map();

  for (const [relId, rel] of relations) {
    if ((rel.type === 'causes' || rel.type === 'leads_to') && rel.to === effect) {
      const cause = entities.get(rel.from);
      if (cause) {
        const count = patterns.get(rel.from)?.count || 0;
        patterns.set(rel.from, { entity: cause, count: count + 1 });
      }
    }
  }

  const inferredCauses = [...patterns.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => ({ ...p.entity, confidence: Math.min(1, p.count / 10) }));

  res.json({ effect, inferredCauses });
});

// ── Semantic Search ─────────────────────────────────────

/**
 * Semantic search
 * GET /api/search
 */
app.get('/api/search', (req, res) => {
  const { q, type, limit = 20 } = req.query;

  if (!q) return res.status(400).json({ error: 'query (q) is required' });

  const terms = q.toLowerCase().split(/\s+/);
  const results = [];

  for (const [id, entity] of entities) {
    if (type && entity.type !== type) continue;

    let score = 0;
    const matchedTerms = [];

    for (const term of terms) {
      if (entity.name.toLowerCase().includes(term)) {
        score += 10;
        matchedTerms.push(`name: ${term}`);
      }
      if (entity.aliases.some(a => a.includes(term))) {
        score += 5;
        matchedTerms.push(`alias: ${term}`);
      }
      if (entity.properties && JSON.stringify(entity.properties).toLowerCase().includes(term)) {
        score += 2;
        matchedTerms.push(`property: ${term}`);
      }
    }

    if (score > 0) {
      results.push({ ...entity, score, matchedTerms });
    }
  }

  results.sort((a, b) => b.score - a.score);
  res.json({ count: results.length, results: results.slice(0, Number(limit)) });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Knowledge Graph listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
