/**
 * Intelligence Routes - Relationship insights and patterns
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/intelligence/:userId/insights
 * Get relationship intelligence insights
 */
router.get('/api/intelligence/:userId/insights', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const interactions = storage.interactions.get(userId) || [];

  const insights = [];

  // 1. Network diversity
  const categories = people.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const categoryCount = Object.keys(categories).length;
  if (categoryCount >= 4) {
    insights.push({
      type: 'strength',
      category: 'network_diversity',
      title: 'Well-rounded network',
      message: 'You maintain relationships across family, friends, professional, and community categories.',
      data: categories
    });
  } else {
    insights.push({
      type: 'opportunity',
      category: 'network_diversity',
      title: 'Expand your network',
      message: `You could benefit from more connections in: ${Object.keys(categories).length < 4 ? ['family', 'friend', 'professional', 'community'].filter(c => !categories[c]).join(', ') : 'various categories'}.`,
      data: categories
    });
  }

  // 2. Top maintainers
  const topMaintainers = people
    .filter(p => p.importance >= 7)
    .sort((a, b) => {
      const aDays = a.lastContact ? Math.floor((Date.now() - new Date(a.lastContact)) / (1000 * 60 * 60 * 24)) : 999;
      const bDays = b.lastContact ? Math.floor((Date.now() - new Date(b.lastContact)) / (1000 * 60 * 60 * 24)) : 999;
      return aDays - bDays;
    })
    .slice(0, 3);

  if (topMaintainers.length > 0) {
    insights.push({
      type: 'positive',
      category: 'maintenance',
      title: 'Best relationship maintenance',
      message: 'You\'re doing great staying in touch with: ' + topMaintainers.map(p => p.name).join(', '),
      data: topMaintainers
    });
  }

  // 3. Neglected relationships
  const neglected = people
    .filter(p => p.importance >= 8)
    .map(p => ({
      ...p,
      daysSince: p.lastContact
        ? Math.floor((Date.now() - new Date(p.lastContact)) / (1000 * 60 * 60 * 24))
        : 999
    }))
    .filter(p => p.daysSince > 30)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 3);

  if (neglected.length > 0) {
    insights.push({
      type: 'warning',
      category: 'neglect',
      title: 'High-importance people need attention',
      message: 'Consider reaching out to: ' + neglected.map(p => `${p.name} (${p.daysSince} days)`).join(', '),
      data: neglected
    });
  }

  // 4. Interaction patterns
  const thisMonth = interactions.filter(i => {
    const date = new Date(i.timestamp);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const lastMonth = interactions.filter(i => {
    const date = new Date(i.timestamp);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
  });

  if (thisMonth.length > lastMonth.length * 1.2) {
    insights.push({
      type: 'positive',
      category: 'activity',
      title: 'Increased social activity',
      message: `You've had ${thisMonth.length} interactions this month, up from ${lastMonth.length} last month.`
    });
  } else if (thisMonth.length < lastMonth.length * 0.8) {
    insights.push({
      type: 'info',
      category: 'activity',
      title: 'Social activity down',
      message: `You've had ${thisMonth.length} interactions this month, down from ${lastMonth.length} last month.`
    });
  }

  res.json({
    success: true,
    insights,
    stats: {
      totalPeople: people.length,
      totalInteractions: interactions.length,
      thisMonthInteractions: thisMonth.length
    }
  });
});

/**
 * GET /api/intelligence/:userId/suggestions
 * Get relationship suggestions
 */
router.get('/api/intelligence/:userId/suggestions', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const suggestions = [];

  // 1. Reconnect suggestions
  const reconnectSuggestions = people
    .filter(p => p.importance >= 5)
    .map(p => ({
      ...p,
      daysSince: p.lastContact
        ? Math.floor((Date.now() - new Date(p.lastContact)) / (1000 * 60 * 60 * 24))
        : 999
    }))
    .filter(p => p.daysSince > 14)
    .sort((a, b) => {
      // Prioritize by importance first, then by days since
      const aScore = a.importance * 100 - a.daysSince;
      const bScore = b.importance * 100 - b.daysSince;
      return bScore - aScore;
    })
    .slice(0, 5);

  reconnectSuggestions.forEach(p => {
    suggestions.push({
      type: 'reconnect',
      priority: p.importance,
      person: { id: p.id, name: p.name, relationshipType: p.relationshipType },
      reason: p.daysSince > 30
        ? `You haven't contacted ${p.name} in ${p.daysSince} days`
        : `It's been ${p.daysSince} days since you connected`,
      action: `Call or message ${p.name}`,
      template: generateTemplate(p)
    });
  });

  // 2. Meet new people suggestions
  const categoryCount = {};
  people.forEach(p => {
    categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
  });

  Object.keys(categoryCount).forEach(cat => {
    if (categoryCount[cat] < 3) {
      suggestions.push({
        type: 'expand',
        priority: 5,
        category: cat,
        reason: `You only have ${categoryCount[cat]} ${cat} relationship${categoryCount[cat] !== 1 ? 's' : ''}`,
        action: `Consider meeting new ${cat} contacts`
      });
    }
  });

  // 3. Quality time suggestions
  const qualityTimeCandidates = people
    .filter(p => p.importance >= 7 && p.relationshipType !== 'colleague')
    .slice(0, 3);

  qualityTimeCandidates.forEach(p => {
    suggestions.push({
      type: 'quality_time',
      priority: p.importance,
      person: { id: p.id, name: p.name, relationshipType: p.relationshipType },
      reason: `Spend quality time with ${p.name}`,
      action: 'Suggest an activity you both enjoy',
      ideas: generateActivityIdeas(p)
    });
  });

  // Sort by priority
  suggestions.sort((a, b) => b.priority - a.priority);

  res.json({
    success: true,
    suggestions: suggestions.slice(0, 10)
  });
});

/**
 * GET /api/intelligence/:userId/patterns
 * Get social patterns
 */
router.get('/api/intelligence/:userId/patterns', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  let interactions = storage.interactions.get(userId) || [];

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    interactions = interactions.filter(i => new Date(i.timestamp) >= cutoff);
  }

  // Time patterns
  const byDay = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const byHour = {};
  const byType = {};

  interactions.forEach(i => {
    const date = new Date(i.timestamp);
    byDay[date.getDay()] += 1;

    const hour = date.getHours();
    if (!byHour[hour]) byHour[hour] = 0;
    byHour[hour] += 1;

    byType[i.type] = (byType[i.type] || 0) + 1;
  });

  // Find best day
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Find best time
  const bestHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

  res.json({
    success: true,
    patterns: {
      bestDay: { day: dayNames[bestDay[0]], count: bestDay[1] },
      bestHour: bestHour ? { hour: `${bestHour[0]}:00`, count: bestHour[1] } : null,
      byDay,
      byHour,
      byType
    },
    insights: [
      bestDay[1] > 0 ? `You're most social on ${dayNames[bestDay[0]]}` : 'Not enough data',
      bestHour ? `Your peak interaction time is around ${bestHour[0]}:00` : 'Not enough data'
    ]
  });
});

// Helper functions
function generateTemplate(person) {
  const templates = {
    parent: `Hey ${person.name.split(' ')[0]}, just wanted to check in and see how you're doing!`,
    sibling: `Been thinking about you! How's everything going?`,
    best_friend: `We should catch up soon! What's been happening?`,
    friend: `Hey! Been a while - would love to hear what you've been up to.`,
    colleague: `Hi ${person.name}, hope things are going well!`,
    mentor: `Hi ${person.name}, wanted to update you on my progress and get your thoughts.`
  };

  return templates[person.relationshipType] || `Hi ${person.name}! Hope you're doing well.`;
}

function generateActivityIdeas(person) {
  const activityIdeas = {
    parent: ['Have a meal together', 'Watch a movie', 'Take a walk', 'Go shopping'],
    sibling: ['Grab coffee', 'Watch a game', 'Try a new restaurant', 'Plan a trip'],
    best_friend: ['Catch up over coffee', 'Watch a show together', 'Adventure day', 'Game night'],
    friend: ['Meet for coffee', 'Try a new activity', 'Attend an event together'],
    colleague: ['Lunch meeting', 'Coffee chat', 'Industry event'],
    mentor: ['Career advice session', 'Industry insights', 'Progress update meeting']
  };

  return activityIdeas[person.relationshipType] || ['Have a conversation', 'Meet up'];
}

export default router;
