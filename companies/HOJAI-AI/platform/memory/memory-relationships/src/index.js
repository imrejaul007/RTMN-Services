/**
 * Memory Relationships Service
 * Organizational Relationship Intelligence for MemoryOS
 * Port: 4790
 *
 * Tracks:
 * - Who knows whom
 * - Trust levels
 * - Interaction frequencies
 * - Social graphs
 * - Business relationships
 * - Team structures
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4790;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Entity stores: entityId -> entity
const entities = new Map(); // Organizations, departments, teams, projects
const persons = new Map();  // Individual people

// Relationship stores
const relationships = new Map(); // id -> relationship
const entityRelationships = new Map(); // entityId -> relationshipIds
const personRelationships = new Map(); // personId -> relationshipIds

// Trust scores
const trustScores = new Map(); // key: "entityA:entityB" -> score

// Interaction history
const interactions = new Map(); // id -> interaction
const entityInteractions = new Map(); // entityId -> interactionIds
const personInteractions = new Map(); // personId -> interactionIds

// Team structures
const teams = new Map(); // teamId -> team
const entityTeams = new Map(); // entityId -> teamIds
const personTeams = new Map(); // personId -> teamIds

// Audit log
const auditLog = [];

// ============================================
// RELATIONSHIP TYPES
// ============================================

const RELATIONSHIP_TYPES = {
  // Organizational
  OWNS: 'owns',
  PART_OF: 'part_of',
  SUBSIDIARY_OF: 'subsidiary_of',
  PARENT_OF: 'parent_of',
  SISTER_OF: 'sister_of',

  // Business
  CUSTOMER_OF: 'customer_of',
  VENDOR_OF: 'vendor_of',
  PARTNER_OF: 'partner_of',
  COMPETITOR_OF: 'competitor_of',
  INVESTOR_OF: 'investor_of',

  // People
  EMPLOYEE_OF: 'employee_of',
  MANAGER_OF: 'manager_of',
  COLLEAGUE_OF: 'colleague_of',
  MENTOR_OF: 'mentor_of',
  FOUNDER_OF: 'founder_of',

  // Projects
  WORKS_ON: 'works_on',
  LEADS: 'leads',
  COLLABORATES_WITH: 'collaborates_with',
  REPORTS_TO: 'reports_to',

  // Social
  KNOWS: 'knows',
  TRUSTS: 'trusts',
  RECOMMENDED_BY: 'recommended_by',

  // Trust categories
  TRUST_HIGH: 'trust_high',     // 0.8-1.0
  TRUST_MEDIUM: 'trust_medium', // 0.5-0.8
  TRUST_LOW: 'trust_low',       // 0.2-0.5
  TRUST_NONE: 'trust_none'      // 0-0.2
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = () => uuidv4();

const getTrustKey = (entityA, entityB) => {
  return [entityA, entityB].sort().join(':');
};

const logAudit = (action, entityType, entityId, details) => {
  auditLog.push({
    id: generateId(),
    timestamp: Date.now(),
    action,
    entityType,
    entityId,
    details
  });
};

const calculateTrustScore = (relationship) => {
  // Base score from interaction frequency
  let score = Math.min(1, (relationship.interactionCount || 0) / 100);

  // Boost from duration
  const durationDays = relationship.lastInteraction
    ? (Date.now() - new Date(relationship.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  score += Math.min(0.2, durationDays / 365);

  // Boost from recent positive interactions
  if (relationship.positiveInteractions) {
    score += Math.min(0.2, relationship.positiveInteractions / 50);
  }

  // Penalty for conflicts
  if (relationship.conflicts) {
    score -= Math.min(0.3, relationship.conflicts / 10);
  }

  return Math.max(0, Math.min(1, score));
};

const getTrustCategory = (score) => {
  if (score >= 0.8) return RELATIONSHIP_TYPES.TRUST_HIGH;
  if (score >= 0.5) return RELATIONSHIP_TYPES.TRUST_MEDIUM;
  if (score >= 0.2) return RELATIONSHIP_TYPES.TRUST_LOW;
  return RELATIONSHIP_TYPES.TRUST_NONE;
};

// ============================================
// ENTITY ROUTES
// ============================================

// Create organization/department/team
app.post('/entities', (req, res) => {
  const { name, type, parentId, metadata } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const entity = {
    id: generateId(),
    name,
    type, // organization, department, team, project, asset
    parentId: parentId || null,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  entities.set(entity.id, entity);
  logAudit('CREATE', 'entity', entity.id, { name, type });

  res.status(201).json(entity);
});

// Get entity
app.get('/entities/:id', (req, res) => {
  const entity = entities.get(req.params.id);
  if (!entity) {
    return res.status(404).json({ error: 'Entity not found' });
  }
  res.json(entity);
});

// List entities
app.get('/entities', (req, res) => {
  const { type, parentId, limit = 100, offset = 0 } = req.query;

  let result = Array.from(entities.values());

  if (type) {
    result = result.filter(e => e.type === type);
  }

  if (parentId !== undefined) {
    result = result.filter(e => e.parentId === parentId);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Update entity
app.put('/entities/:id', (req, res) => {
  const entity = entities.get(req.params.id);
  if (!entity) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const { name, metadata } = req.body;

  if (name) entity.name = name;
  if (metadata) entity.metadata = { ...entity.metadata, ...metadata };
  entity.updatedAt = new Date().toISOString();

  entities.set(entity.id, entity);
  logAudit('UPDATE', 'entity', entity.id, { name });

  res.json(entity);
});

// Delete entity
app.delete('/entities/:id', (req, res) => {
  if (!entities.has(req.params.id)) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  entities.delete(req.params.id);
  logAudit('DELETE', 'entity', req.params.id, {});

  res.json({ success: true, id: req.params.id });
});

// ============================================
// PERSON ROUTES
// ============================================

// Create person
app.post('/persons', (req, res) => {
  const { name, email, role, entityId, metadata } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const person = {
    id: generateId(),
    name,
    email: email || null,
    role: role || null,
    entityId: entityId || null,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  persons.set(person.id, person);

  if (entityId) {
    const teamIds = entityTeams.get(entityId) || [];
    entityTeams.set(entityId, teamIds);
  }

  logAudit('CREATE', 'person', person.id, { name, entityId });

  res.status(201).json(person);
});

// Get person
app.get('/persons/:id', (req, res) => {
  const person = persons.get(req.params.id);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }
  res.json(person);
});

// List persons
app.get('/persons', (req, res) => {
  const { entityId, role, limit = 100, offset = 0 } = req.query;

  let result = Array.from(persons.values());

  if (entityId) {
    result = result.filter(p => p.entityId === entityId);
  }

  if (role) {
    result = result.filter(p => p.role === role);
  }

  result.sort((a, b) => a.name.localeCompare(b.name));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Update person
app.put('/persons/:id', (req, res) => {
  const person = persons.get(req.params.id);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }

  const { name, email, role, metadata } = req.body;

  if (name) person.name = name;
  if (email) person.email = email;
  if (role) person.role = role;
  if (metadata) person.metadata = { ...person.metadata, ...metadata };
  person.updatedAt = new Date().toISOString();

  persons.set(person.id, person);
  logAudit('UPDATE', 'person', person.id, { name });

  res.json(person);
});

// Delete person
app.delete('/persons/:id', (req, res) => {
  if (!persons.has(req.params.id)) {
    return res.status(404).json({ error: 'Person not found' });
  }

  persons.delete(req.params.id);
  logAudit('DELETE', 'person', req.params.id, {});

  res.json({ success: true, id: req.params.id });
});

// ============================================
// RELATIONSHIP ROUTES
// ============================================

// Create relationship
app.post('/relationships', (req, res) => {
  const { fromId, fromType, toId, toType, type, metadata } = req.body;

  if (!fromId || !toId || !type) {
    return res.status(400).json({ error: 'fromId, toId, and type are required' });
  }

  if (!Object.values(RELATIONSHIP_TYPES).includes(type)) {
    return res.status(400).json({
      error: `Invalid relationship type. Must be one of: ${Object.values(RELATIONSHIP_TYPES).join(', ')}`
    });
  }

  const relationship = {
    id: generateId(),
    fromId,
    fromType: fromType || 'entity', // entity or person
    toId,
    toType: toType || 'entity',
    type,
    metadata: metadata || {},
    interactionCount: 0,
    positiveInteractions: 0,
    conflicts: 0,
    lastInteraction: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  relationships.set(relationship.id, relationship);

  // Index by entities
  const fromKey = fromType === 'person' ? 'person' : 'entity';
  const toKey = toType === 'person' ? 'person' : 'entity';

  if (fromKey === 'entity') {
    const ids = entityRelationships.get(fromId) || [];
    entityRelationships.set(fromId, [...ids, relationship.id]);
  } else {
    const ids = personRelationships.get(fromId) || [];
    personRelationships.set(fromId, [...ids, relationship.id]);
  }

  if (toKey === 'entity') {
    const ids = entityRelationships.get(toId) || [];
    entityRelationships.set(toId, [...ids, relationship.id]);
  } else {
    const ids = personRelationships.get(toId) || [];
    personRelationships.set(toId, [...ids, relationship.id]);
  }

  // Calculate initial trust score
  const trustKey = getTrustKey(fromId, toId);
  trustScores.set(trustKey, calculateTrustScore(relationship));

  logAudit('CREATE', 'relationship', relationship.id, { fromId, toId, type });

  res.status(201).json(relationship);
});

// Get relationship
app.get('/relationships/:id', (req, res) => {
  const relationship = relationships.get(req.params.id);
  if (!relationship) {
    return res.status(404).json({ error: 'Relationship not found' });
  }

  // Add trust score
  const trustKey = getTrustKey(relationship.fromId, relationship.toId);
  const trustScore = trustScores.get(trustKey) || 0;

  res.json({
    ...relationship,
    trustScore,
    trustCategory: getTrustCategory(trustScore)
  });
});

// List relationships
app.get('/relationships', (req, res) => {
  const { fromId, toId, type, limit = 100, offset = 0 } = req.query;

  let result = Array.from(relationships.values());

  if (fromId) {
    result = result.filter(r => r.fromId === fromId || r.toId === fromId);
  }

  if (toId) {
    result = result.filter(r => r.fromId === toId || r.toId === toId);
  }

  if (type) {
    result = result.filter(r => r.type === type);
  }

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Get relationships for entity/person
app.get('/network/:id', (req, res) => {
  const { id } = req.params;
  const { depth = 1 } = req.query;

  // Get direct relationships
  const relIds = entityRelationships.get(id) || personRelationships.get(id) || [];
  const directRels = relIds.map(rid => relationships.get(rid)).filter(Boolean);

  // Build network
  const network = {
    id,
    directRelationships: directRels.map(r => ({
      ...r,
      trustScore: trustScores.get(getTrustKey(r.fromId, r.toId)) || 0,
      trustCategory: getTrustCategory(trustScores.get(getTrustKey(r.fromId, r.toId)) || 0)
    })),
    stats: {
      totalRelationships: directRels.length,
      byType: directRels.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {})
    }
  };

  res.json(network);
});

// Update relationship
app.put('/relationships/:id', (req, res) => {
  const relationship = relationships.get(req.params.id);
  if (!relationship) {
    return res.status(404).json({ error: 'Relationship not found' });
  }

  const { metadata, type } = req.body;

  if (metadata) relationship.metadata = { ...relationship.metadata, ...metadata };
  if (type && Object.values(RELATIONSHIP_TYPES).includes(type)) {
    relationship.type = type;
  }
  relationship.updatedAt = new Date().toISOString();

  relationships.set(relationship.id, relationship);

  // Update trust score
  const trustKey = getTrustKey(relationship.fromId, relationship.toId);
  trustScores.set(trustKey, calculateTrustScore(relationship));

  logAudit('UPDATE', 'relationship', relationship.id, { type });

  res.json(relationship);
});

// Delete relationship
app.delete('/relationships/:id', (req, res) => {
  const relationship = relationships.get(req.params.id);
  if (!relationship) {
    return res.status(404).json({ error: 'Relationship not found' });
  }

  // Remove from indexes
  const fromKey = relationship.fromType === 'person' ? 'person' : 'entity';
  const toKey = relationship.toType === 'person' ? 'person' : 'entity';

  if (fromKey === 'entity') {
    const ids = entityRelationships.get(relationship.fromId) || [];
    entityRelationships.set(relationship.fromId, ids.filter(id => id !== relationship.id));
  } else {
    const ids = personRelationships.get(relationship.fromId) || [];
    personRelationships.set(relationship.fromId, ids.filter(id => id !== relationship.id));
  }

  if (toKey === 'entity') {
    const ids = entityRelationships.get(relationship.toId) || [];
    entityRelationships.set(relationship.toId, ids.filter(id => id !== relationship.id));
  } else {
    const ids = personRelationships.get(relationship.toId) || [];
    personRelationships.set(relationship.toId, ids.filter(id => id !== relationship.id));
  }

  relationships.delete(relationship.id);
  logAudit('DELETE', 'relationship', relationship.id, {});

  res.json({ success: true, id: relationship.id });
});

// ============================================
// INTERACTION ROUTES
// ============================================

// Record interaction
app.post('/interactions', (req, res) => {
  const { fromId, toId, type, sentiment, notes, metadata } = req.body;

  if (!fromId || !toId || !type) {
    return res.status(400).json({ error: 'fromId, toId, and type are required' });
  }

  const interaction = {
    id: generateId(),
    fromId,
    toId,
    type, // meeting, email, call, chat, collaboration
    sentiment: sentiment || 'neutral', // positive, negative, neutral
    notes: notes || null,
    metadata: metadata || {},
    createdAt: new Date().toISOString()
  };

  interactions.set(interaction.id, interaction);

  // Index by entities
  const fromIds = entityInteractions.get(fromId) || [];
  const toIds = entityInteractions.get(toId) || [];
  entityInteractions.set(fromId, [...fromIds, interaction.id]);
  entityInteractions.set(toId, [...toIds, interaction.id]);

  // Update relationship stats
  const trustKey = getTrustKey(fromId, toId);
  let relationship = Array.from(relationships.values())
    .find(r =>
      (r.fromId === fromId && r.toId === toId) ||
      (r.fromId === toId && r.toId === fromId)
    );

  if (relationship) {
    relationship.interactionCount = (relationship.interactionCount || 0) + 1;
    relationship.lastInteraction = new Date().toISOString();

    if (sentiment === 'positive') {
      relationship.positiveInteractions = (relationship.positiveInteractions || 0) + 1;
    } else if (sentiment === 'negative') {
      relationship.conflicts = (relationship.conflicts || 0) + 1;
    }

    relationships.set(relationship.id, relationship);

    // Recalculate trust
    const newTrustScore = calculateTrustScore(relationship);
    trustScores.set(trustKey, newTrustScore);
  }

  logAudit('CREATE', 'interaction', interaction.id, { fromId, toId, type, sentiment });

  res.status(201).json(interaction);
});

// Get interactions
app.get('/interactions', (req, res) => {
  const { entityId, fromId, toId, type, startDate, endDate, limit = 100, offset = 0 } = req.query;

  let result = Array.from(interactions.values());

  if (entityId) {
    const ids = entityInteractions.get(entityId) || [];
    result = result.filter(i => ids.includes(i.id));
  }

  if (fromId) result = result.filter(i => i.fromId === fromId);
  if (toId) result = result.filter(i => i.toId === toId);
  if (type) result = result.filter(i => i.type === type);

  if (startDate) {
    result = result.filter(i => new Date(i.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    result = result.filter(i => new Date(i.createdAt) <= new Date(endDate));
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// ============================================
// TEAM ROUTES
// ============================================

// Create team
app.post('/teams', (req, res) => {
  const { name, entityId, leadId, memberIds, metadata } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const team = {
    id: generateId(),
    name,
    entityId: entityId || null,
    leadId: leadId || null,
    memberIds: memberIds || [],
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  teams.set(team.id, team);

  // Index by entity
  if (entityId) {
    const ids = entityTeams.get(entityId) || [];
    entityTeams.set(entityId, [...ids, team.id]);
  }

  // Index by members
  if (leadId) {
    const ids = personTeams.get(leadId) || [];
    personTeams.set(leadId, [...ids, team.id]);
  }

  memberIds?.forEach(memberId => {
    const ids = personTeams.get(memberId) || [];
    personTeams.set(memberId, [...ids, team.id]);
  });

  logAudit('CREATE', 'team', team.id, { name, entityId });

  res.status(201).json(team);
});

// Get team
app.get('/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // Add member details
  const members = team.memberIds.map(id => persons.get(id)).filter(Boolean);
  const lead = team.leadId ? persons.get(team.leadId) : null;

  res.json({
    ...team,
    members,
    lead
  });
});

// List teams
app.get('/teams', (req, res) => {
  const { entityId, limit = 100, offset = 0 } = req.query;

  let result = Array.from(teams.values());

  if (entityId) {
    const teamIds = entityTeams.get(entityId) || [];
    result = result.filter(t => teamIds.includes(t.id));
  }

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Add team member
app.post('/teams/:id/members', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { personId } = req.body;
  if (!personId) {
    return res.status(400).json({ error: 'personId is required' });
  }

  if (!team.memberIds.includes(personId)) {
    team.memberIds.push(personId);
    teams.set(team.id, team);

    // Index by person
    const ids = personTeams.get(personId) || [];
    personTeams.set(personId, [...ids, team.id]);
  }

  res.json(team);
});

// Remove team member
app.delete('/teams/:id/members/:personId', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  team.memberIds = team.memberIds.filter(id => id !== req.params.personId);
  teams.set(team.id, team);

  res.json(team);
});

// ============================================
// TRUST QUERY ROUTES
// ============================================

// Get trust score between two entities
app.get('/trust/:entityA/:entityB', (req, res) => {
  const { entityA, entityB } = req.params;
  const trustKey = getTrustKey(entityA, entityB);
  const score = trustScores.get(trustKey) || 0;

  res.json({
    entityA,
    entityB,
    trustScore: score,
    trustCategory: getTrustCategory(score)
  });
});

// Get all trust relationships for an entity
app.get('/trust/:entityId', (req, res) => {
  const { entityId } = req.params;

  const relIds = entityRelationships.get(entityId) || [];
  const rels = relIds.map(rid => relationships.get(rid)).filter(Boolean);

  const trustRelationships = rels.map(r => ({
    ...r,
    trustScore: trustScores.get(getTrustKey(r.fromId, r.toId)) || 0,
    trustCategory: getTrustCategory(trustScores.get(getTrustKey(r.fromId, r.toId)) || 0)
  }));

  // Sort by trust score
  trustRelationships.sort((a, b) => b.trustScore - a.trustScore);

  res.json({
    entityId,
    relationships: trustRelationships,
    summary: {
      highTrust: trustRelationships.filter(r => r.trustCategory === RELATIONSHIP_TYPES.TRUST_HIGH).length,
      mediumTrust: trustRelationships.filter(r => r.trustCategory === RELATIONSHIP_TYPES.TRUST_MEDIUM).length,
      lowTrust: trustRelationships.filter(r => r.trustCategory === RELATIONSHIP_TYPES.TRUST_LOW).length,
      noTrust: trustRelationships.filter(r => r.trustCategory === RELATIONSHIP_TYPES.TRUST_NONE).length
    }
  });
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get relationship analytics
app.get('/analytics', (req, res) => {
  const { entityId } = req.query;

  const allRelationships = Array.from(relationships.values());
  const allEntities = Array.from(entities.values());
  const allPersons = Array.from(persons.values());
  const allInteractions = Array.from(interactions.values());

  let filteredRels = allRelationships;
  if (entityId) {
    filteredRels = allRelationships.filter(r =>
      r.fromId === entityId || r.toId === entityId
    );
  }

  // Calculate trust distribution
  const trustDistribution = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0
  };

  filteredRels.forEach(r => {
    const score = trustScores.get(getTrustKey(r.fromId, r.toId)) || 0;
    const category = getTrustCategory(score);

    if (category === RELATIONSHIP_TYPES.TRUST_HIGH) trustDistribution.high++;
    else if (category === RELATIONSHIP_TYPES.TRUST_MEDIUM) trustDistribution.medium++;
    else if (category === RELATIONSHIP_TYPES.TRUST_LOW) trustDistribution.low++;
    else trustDistribution.none++;
  });

  // Relationship type distribution
  const typeDistribution = filteredRels.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalRelationships: filteredRels.length,
    totalEntities: allEntities.length,
    totalPersons: allPersons.length,
    totalInteractions: allInteractions.length,
    trustDistribution,
    typeDistribution,
    avgTrustScore: filteredRels.length > 0
      ? filteredRels.reduce((sum, r) =>
          sum + (trustScores.get(getTrustKey(r.fromId, r.toId)) || 0), 0
        ) / filteredRels.length
      : 0
  });
});

// ============================================
// AUDIT ROUTES
// ============================================

app.get('/audit', (req, res) => {
  const { entityId, action, limit = 100, offset = 0 } = req.query;

  let result = [...auditLog];

  if (entityId) {
    result = result.filter(log => log.entityId === entityId);
  }

  if (action) {
    result = result.filter(log => log.action === action);
  }

  result.sort((a, b) => b.timestamp - a.timestamp);

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// ============================================
// HEALTH & STATUS ROUTES
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'memory-relationships',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: 'memory-relationships',
    stats: {
      entities: entities.size,
      persons: persons.size,
      relationships: relationships.size,
      teams: teams.size,
      interactions: interactions.size
    }
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Memory Relationships service running on port ${PORT}`);
});

export default app;
