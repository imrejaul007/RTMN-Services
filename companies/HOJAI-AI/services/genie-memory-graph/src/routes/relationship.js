/**
 * Relationship Routes - Relationship graph management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /relationship
 * Add a relationship
 */
router.post('/relationship', async (req, res) => {
  const { userId, personId, name, type, subtype, strength, notes } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !name) {
    return res.status(400).json({
      success: false,
      error: 'userId and name are required'
    });
  }

  if (!storage.relationships.has(userId)) {
    storage.relationships.set(userId, []);
  }

  const relationship = {
    id: uuidv4(),
    personId: personId || uuidv4(),
    name,
    type: type || 'person',
    subtype,
    strength: strength || 5, // 1-10
    importance: subtype === 'best_friend' || subtype === 'parent' || subtype === 'spouse' ? 10 : 5,
    category: categorizeRelationship(subtype),
    notes: notes || '',
    interactions: [],
    lastInteraction: null,
    nextReminder: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.relationships.get(userId).push(relationship);

  res.json({ success: true, relationship });
});

/**
 * GET /relationship/:userId
 * Get all relationships
 */
router.get('/relationship/:userId', async (req, res) => {
  const { userId } = req.params;
  const { category, type, sort } = req.query;
  const storage = req.app.locals.graphStorage;

  let relationships = storage.relationships.get(userId) || [];

  // Filter by category
  if (category) {
    relationships = relationships.filter(r => r.category === category);
  }

  // Filter by type
  if (type) {
    relationships = relationships.filter(r => r.type === type);
  }

  // Sort
  if (sort === 'strength') {
    relationships.sort((a, b) => b.strength - a.strength);
  } else if (sort === 'importance') {
    relationships.sort((a, b) => b.importance - a.importance);
  } else if (sort === 'recent') {
    relationships.sort((a, b) =>
      new Date(b.lastInteraction || 0) - new Date(a.lastInteraction || 0)
    );
  }

  res.json({
    success: true,
    relationships,
    count: relationships.length
  });
});

/**
 * GET /relationship/:userId/:personId
 * Get specific relationship
 */
router.get('/relationship/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];
  const relationship = relationships.find(r => r.personId === personId);

  if (!relationship) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  res.json({ success: true, relationship });
});

/**
 * PUT /relationship/:userId/:personId
 * Update relationship
 */
router.put('/relationship/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];
  const index = relationships.findIndex(r => r.personId === personId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  relationships[index] = {
    ...relationships[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  storage.relationships.set(userId, relationships);

  res.json({ success: true, relationship: relationships[index] });
});

/**
 * POST /relationship/:userId/:personId/interaction
 * Record interaction
 */
router.post('/relationship/:userId/:personId/interaction', async (req, res) => {
  const { userId, personId } = req.params;
  const { type, channel, topic, duration, notes } = req.body;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];
  const index = relationships.findIndex(r => r.personId === personId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  const interaction = {
    id: uuidv4(),
    type,
    channel,
    topic,
    duration,
    notes,
    timestamp: new Date().toISOString()
  };

  relationships[index].interactions.push(interaction);
  relationships[index].lastInteraction = new Date().toISOString();
  relationships[index].updatedAt = new Date().toISOString();

  // Update strength based on recency
  updateRelationshipStrength(relationships[index]);

  storage.relationships.set(userId, relationships);

  res.json({ success: true, interaction });
});

/**
 * GET /relationship/:userId/summary
 * Get relationship summary
 */
router.get('/relationship/:userId/summary', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];

  const summary = {
    total: relationships.length,
    byCategory: {},
    byType: {},
    averageStrength: 0,
    recentlyContacted: [],
    needsAttention: []
  };

  relationships.forEach(r => {
    summary.byCategory[r.category] = (summary.byCategory[r.category] || 0) + 1;
    summary.byType[r.type] = (summary.byType[r.type] || 0) + 1;
    summary.averageStrength += r.strength;

    // Recently contacted (last 7 days)
    if (r.lastInteraction) {
      const daysSince = (Date.now() - new Date(r.lastInteraction)) / (1000 * 60 * 60 * 24);
      if (daysSince <= 7) {
        summary.recentlyContacted.push({
          name: r.name,
          lastInteraction: r.lastInteraction,
          type: r.subtype
        });
      }
    }

    // Needs attention (high importance, no contact in 30 days)
    if (r.importance >= 8) {
      const daysSince = r.lastInteraction
        ? (Date.now() - new Date(r.lastInteraction)) / (1000 * 60 * 60 * 24)
        : 999;
      if (daysSince > 30) {
        summary.needsAttention.push({
          name: r.name,
          daysSinceContact: Math.floor(daysSince),
          type: r.subtype,
          importance: r.importance
        });
      }
    }
  });

  summary.averageStrength = relationships.length > 0
    ? Math.round((summary.averageStrength / relationships.length) * 10) / 10
    : 0;

  res.json({ success: true, summary });
});

/**
 * GET /relationship/:userId/suggestions
 * Get relationship suggestions
 */
router.get('/relationship/:userId/suggestions', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];
  const suggestions = [];

  // Find people who need reconnection
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  relationships.forEach(r => {
    if (!r.lastInteraction || new Date(r.lastInteraction) < thirtyDaysAgo) {
      suggestions.push({
        type: 'reconnect',
        person: r.name,
        personId: r.personId,
        daysSince: r.lastInteraction
          ? Math.floor((Date.now() - new Date(r.lastInteraction)) / (1000 * 60 * 60 * 24))
          : null,
        reason: r.subtype === 'best_friend'
          ? "Your best friend might appreciate hearing from you"
          : r.subtype === 'parent'
          ? "Family is important - consider checking in"
          : "Stay connected with your network",
        priority: r.importance >= 8 ? 'high' : 'medium'
      });
    }
  });

  // Sort by priority and days since
  suggestions.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return (b.daysSince || 0) - (a.daysSince || 0);
  });

  res.json({
    success: true,
    suggestions: suggestions.slice(0, 10)
  });
});

/**
 * DELETE /relationship/:userId/:personId
 * Remove relationship
 */
router.delete('/relationship/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const storage = req.app.locals.graphStorage;

  const relationships = storage.relationships.get(userId) || [];
  const filtered = relationships.filter(r => r.personId !== personId);

  if (filtered.length === relationships.length) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  storage.relationships.set(userId, filtered);

  res.json({ success: true, message: 'Relationship removed' });
});

// Helper functions
function categorizeRelationship(subtype) {
  const familyTypes = ['parent', 'child', 'sibling', 'spouse', 'grandparent', 'grandchild'];
  const friendTypes = ['best_friend', 'close_friend', 'friend', 'acquaintance'];
  const professionalTypes = ['colleague', 'boss', 'employee', 'mentor', 'mentee', 'client', 'business_partner', 'investor'];

  if (familyTypes.includes(subtype)) return 'family';
  if (friendTypes.includes(subtype)) return 'friend';
  if (professionalTypes.includes(subtype)) return 'professional';
  return 'other';
}

function updateRelationshipStrength(relationship) {
  if (!relationship.lastInteraction) return;

  const daysSince = (Date.now() - new Date(relationship.lastInteraction)) / (1000 * 60 * 60 * 24);

  // Base strength decay
  let strength = relationship.strength;

  // More important relationships decay slower
  const decayRate = relationship.importance >= 8 ? 0.01 : 0.05;

  // Strength decreases over time without interaction
  strength = Math.max(1, strength - (daysSince * decayRate));

  // Small boost for recent interaction
  if (daysSince <= 1) {
    strength = Math.min(10, strength + 0.5);
  }

  relationship.strength = Math.round(strength * 10) / 10;
}

export default router;
