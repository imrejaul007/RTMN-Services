/**
 * Health Routes - Relationship health tracking
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/health/:userId/:personId
 * Get relationship health for a person
 */
router.get('/api/health/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const person = people.find(p => p.id === personId);

  if (!person) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  const interactions = (storage.interactions.get(userId) || [])
    .filter(i => i.personId === personId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const health = calculateRelationshipHealth(person, interactions);

  res.json({
    success: true,
    person: { id: person.id, name: person.name },
    health,
    insights: generateHealthInsights(person, interactions)
  });
});

/**
 * GET /api/health/:userId/overview
 * Get overall relationship health overview
 */
router.get('/api/health/:userId/overview', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];

  const healthGroups = {
    excellent: { label: 'Excellent', count: 0, people: [] },
    good: { label: 'Good', count: 0, people: [] },
    needsAttention: { label: 'Needs Attention', count: 0, people: [] },
    atRisk: { label: 'At Risk', count: 0, people: [] }
  };

  people.forEach(person => {
    const interactions = (storage.interactions.get(userId) || [])
      .filter(i => i.personId === person.id);

    const health = calculateRelationshipHealth(person, interactions);

    let group;
    if (health.score >= 80) group = healthGroups.excellent;
    else if (health.score >= 50) group = healthGroups.good;
    else if (health.score >= 25) group = healthGroups.needsAttention;
    else group = healthGroups.atRisk;

    group.count += 1;
    group.people.push({
      id: person.id,
      name: person.name,
      health: health.score,
      daysSince: health.daysSince
    });
  });

  // Sort people within each group
  Object.values(healthGroups).forEach(group => {
    group.people.sort((a, b) => a.health - b.health);
  });

  res.json({
    success: true,
    overview: healthGroups,
    summary: {
      total: people.length,
      averageHealth: people.length > 0
        ? Math.round(people.reduce((a, p) => a + (p.relationshipHealth || 50), 0) / people.length)
        : 0
    }
  });
});

/**
 * GET /api/health/:userId/weak
 * Find weak relationships that need attention
 */
router.get('/api/health/:userId/weak', async (req, res) => {
  const { userId } = req.params;
  const { limit } = req.query;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];

  const weakRelationships = people
    .map(person => {
      const interactions = (storage.interactions.get(userId) || [])
        .filter(i => i.personId === person.id);

      const health = calculateRelationshipHealth(person, interactions);

      return {
        id: person.id,
        name: person.name,
        relationshipType: person.relationshipType,
        importance: person.importance,
        health: health.score,
        daysSince: health.daysSince,
        lastInteraction: person.lastContact,
        urgency: calculateUrgency(person, health)
      };
    })
    .filter(p => p.health < 50)
    .sort((a, b) => {
      // Prioritize by urgency
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return b.importance - a.importance;
    });

  res.json({
    success: true,
    weakRelationships: weakRelationships.slice(0, parseInt(limit) || 10),
    count: weakRelationships.length
  });
});

// Helper functions
function calculateRelationshipHealth(person, interactions) {
  const daysSince = person.lastContact
    ? Math.floor((Date.now() - new Date(person.lastContact)) / (1000 * 60 * 60 * 24))
    : 999;

  // Base health from importance
  let health = person.importance * 5;

  // Deduct for time without contact
  const expectedFrequency = person.importance >= 8 ? 7 : person.importance >= 5 ? 14 : 30;
  const decayRate = 100 / expectedFrequency;
  health -= Math.min(daysSince * decayRate, 50);

  // Boost for recent interaction
  if (daysSince <= expectedFrequency) {
    health += 10;
  }

  // Recent sentiment boost
  const recentInteractions = interactions.slice(0, 5);
  const positiveRatio = recentInteractions.filter(i => i.sentiment === 'positive').length / Math.max(1, recentInteractions.length);
  health += positiveRatio * 10;

  // Interaction frequency boost
  if (interactions.length > 3) {
    health += 5;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(health))),
    daysSince,
    status: health >= 80 ? 'excellent' : health >= 50 ? 'good' : health >= 25 ? 'needs_attention' : 'at_risk'
  };
}

function calculateUrgency(person, health) {
  let urgency = 0;

  // Importance factor
  urgency += person.importance * 10;

  // Days since factor
  urgency += Math.min(health.daysSince / 7, 20);

  // Neglected high-importance boost
  if (person.importance >= 8 && health.daysSince > 14) {
    urgency += 30;
  }

  return Math.round(urgency);
}

function generateHealthInsights(person, interactions) {
  const insights = [];

  if (interactions.length === 0) {
    insights.push({
      type: 'warning',
      message: `You haven't contacted ${person.name} yet. Consider reaching out!`
    });
    return insights;
  }

  // Check interaction frequency
  const daysSince = person.lastContact
    ? Math.floor((Date.now() - new Date(person.lastContact)) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSince > 30 && person.importance >= 5) {
    insights.push({
      type: 'warning',
      message: `It's been ${daysSince} days since you last contacted ${person.name}. They might appreciate hearing from you.`
    });
  }

  // Sentiment trend
  const recentSentiments = interactions.slice(0, 5).map(i => i.sentiment);
  if (recentSentiments.filter(s => s === 'negative').length > 2) {
    insights.push({
      type: 'caution',
      message: `Recent interactions with ${person.name} have been challenging. Consider addressing any concerns.`
    });
  }

  // Positive trend
  if (recentSentiments.filter(s => s === 'positive').length >= 3) {
    insights.push({
      type: 'positive',
      message: `Your recent interactions with ${person.name} have been positive! Keep it up.`
    });
  }

  return insights;
}

export default router;
