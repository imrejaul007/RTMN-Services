/**
 * Gifts Routes - Gift suggestions and tracking
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Gift categories
const GIFT_CATEGORIES = {
  birthday: { emoji: '🎂', label: 'Birthday' },
  anniversary: { emoji: '💕', label: 'Anniversary' },
  holiday: { emoji: '🎄', label: 'Holiday' },
  achievement: { emoji: '🏆', label: 'Achievement' },
  just_because: { emoji: '💝', label: 'Just Because' },
  thank_you: { emoji: '🙏', label: 'Thank You' },
  apology: { emoji: '🤗', label: 'Apology' }
};

// Gift ideas by relationship type
const GIFT_IDEAS = {
  parent: {
    birthday: ['Flowers', 'Spa day', 'Book', 'Quality time experience', 'Custom photo album'],
    anniversary: ['Romantic dinner', 'Weekend getaway', 'Jewelry', 'Memory book'],
    holiday: ['Cozy blanket', 'Gourmet food basket', 'Personalized gift', 'Family tradition items']
  },
  sibling: {
    birthday: ['Tech gadget', 'Gaming accessory', 'Fashion item', 'Experience voucher'],
    anniversary: ['Matching items', 'Adventure together', 'Custom gift'],
    holiday: ['Funny gift', 'Shared interest item', 'Subscription box']
  },
  best_friend: {
    birthday: ['Adventure experience', 'Matching friendship items', 'Custom art', 'Memory book'],
    anniversary: ['Friendship bracelet', 'Trip together', 'Custom playlist'],
    holiday: ['Matching items', 'Fun gift', 'Inside joke present']
  },
  spouse: {
    birthday: ['Jewelry', 'Romantic getaway', 'Custom gift', 'Experience day'],
    anniversary: ['Romantic dinner', 'Custom gift', 'Memory collection', 'Surprise party'],
    holiday: ['Couples experience', 'Spa day together', 'Home spa set']
  },
  child: {
    birthday: ['Educational toy', 'Book', 'Art supplies', 'Experience', 'Experience day'],
    anniversary: ['Family activity', 'Special meal', 'Photo session'],
    holiday: ['Toy', 'Book', 'Games', 'Clothes']
  },
  colleague: {
    birthday: ['Gift card', 'Desk plant', 'Coffee set', 'Book'],
    anniversary: ['Team celebration', 'Group gift'],
    holiday: ['Food basket', 'Desk accessory', 'Book']
  },
  mentor: {
    birthday: ['Book', 'Premium pen', 'Experience gift', 'Gratitude letter'],
    anniversary: ['Thank you gift', 'Career-related book'],
    holiday: ['Thank you card', 'Premium gift', 'Experience']
  }
};

/**
 * POST /api/gifts/idea
 * Add gift idea
 */
router.post('/api/gifts/idea', async (req, res) => {
  const { userId, personId, idea, occasion, budget, notes } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !personId || !idea) {
    return res.status(400).json({ success: false, error: 'userId, personId, and idea are required' });
  }

  if (!storage.giftIdeas.has(userId)) {
    storage.giftIdeas.set(userId, []);
  }

  const gift = {
    id: uuidv4(),
    userId,
    personId,
    idea,
    occasion: occasion || 'just_because',
    budget,
    notes: notes || '',
    status: 'idea', // idea, purchased, gifted
    purchasedAt: null,
    giftedAt: null,
    createdAt: new Date().toISOString()
  };

  storage.giftIdeas.get(userId).push(gift);

  res.json({ success: true, gift });
});

/**
 * GET /api/gifts/:userId
 * Get all gift ideas
 */
router.get('/api/gifts/:userId', async (req, res) => {
  const { userId } = req.params;
  const { personId, status } = req.query;
  const storage = req.app.locals.storage;

  let gifts = storage.giftIdeas.get(userId) || [];

  if (personId) {
    gifts = gifts.filter(g => g.personId === personId);
  }

  if (status) {
    gifts = gifts.filter(g => g.status === status);
  }

  res.json({
    success: true,
    gifts,
    count: gifts.length
  });
});

/**
 * GET /api/gifts/:userId/suggest/:personId
 * Get gift suggestions for a person
 */
router.get('/api/gifts/:userId/suggest/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const { occasion } = req.query;
  const storage = req.app.locals.storage;

  // Get person info
  const people = storage.people.get(userId) || [];
  const person = people.find(p => p.id === personId);

  if (!person) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  // Get occasion
  const giftOccasion = occasion || 'birthday';
  const relationshipType = person.relationshipType || 'friend';

  // Get ideas from template
  let suggestions = GIFT_IDEAS[relationshipType]?.[giftOccasion] || [];

  // Add personalized ideas based on person's interests
  if (person.tags && person.tags.length > 0) {
    suggestions = [...suggestions, ...person.tags.map(t => `Something related to ${t}`)];
  }

  // Add existing ideas for this person
  const existingIdeas = (storage.giftIdeas.get(userId) || [])
    .filter(g => g.personId === personId && g.status === 'idea')
    .map(g => g.idea);

  // Get recent gifts given
  const recentGifts = (storage.giftIdeas.get(userId) || [])
    .filter(g => g.personId === personId && g.status === 'gifted')
    .sort((a, b) => new Date(b.giftedAt) - new Date(a.giftedAt))
    .slice(0, 3);

  res.json({
    success: true,
    person: { id: person.id, name: person.name, relationshipType: person.relationshipType },
    occasion: giftOccasion,
    suggestions: suggestions.map((idea, i) => ({ idea, source: 'template', personalized: false })),
    existingIdeas,
    recentGifts,
    budgetSuggestions: getBudgetSuggestions(relationshipType)
  });
});

/**
 * GET /api/gifts/:userId/upcoming
 * Get upcoming gift occasions
 */
router.get('/api/gifts/:userId/upcoming', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const numDays = parseInt(days) || 30;
  const future = new Date();
  future.setDate(future.getDate() + numDays);

  const upcoming = [];

  people.forEach(person => {
    const today = new Date();
    const thisYear = today.getFullYear();

    // Check birthday
    if (person.birthday) {
      const bday = new Date(person.birthday);
      bday.setFullYear(thisYear);
      if (bday < today) bday.setFullYear(thisYear + 1);

      if (bday <= future) {
        upcoming.push({
          person: { id: person.id, name: person.name },
          occasion: 'birthday',
          date: bday.toISOString().split('T')[0],
          daysUntil: Math.ceil((bday - today) / (1000 * 60 * 60 * 24)),
          hasIdea: hasGiftIdea(storage, userId, person.id, 'birthday'),
          purchased: hasPurchasedGift(storage, userId, person.id, 'birthday')
        });
      }
    }

    // Check anniversary
    if (person.anniversary) {
      const anniv = new Date(person.anniversary);
      anniv.setFullYear(thisYear);
      if (anniv < today) anniv.setFullYear(thisYear + 1);

      if (anniv <= future) {
        upcoming.push({
          person: { id: person.id, name: person.name },
          occasion: 'anniversary',
          date: anniv.toISOString().split('T')[0],
          daysUntil: Math.ceil((anniv - today) / (1000 * 60 * 60 * 24)),
          hasIdea: hasGiftIdea(storage, userId, person.id, 'anniversary'),
          purchased: hasPurchasedGift(storage, userId, person.id, 'anniversary')
        });
      }
    }
  });

  // Sort by days until
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  res.json({
    success: true,
    upcoming,
    count: upcoming.length
  });
});

/**
 * PUT /api/gifts/:userId/:giftId
 * Update gift
 */
router.put('/api/gifts/:userId/:giftId', async (req, res) => {
  const { userId, giftId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const gifts = storage.giftIdeas.get(userId) || [];
  const index = gifts.findIndex(g => g.id === giftId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Gift not found' });
  }

  // Update timestamps
  if (updates.status === 'purchased' && !gifts[index].purchasedAt) {
    updates.purchasedAt = new Date().toISOString();
  }
  if (updates.status === 'gifted' && !gifts[index].giftedAt) {
    updates.giftedAt = new Date().toISOString();
  }

  gifts[index] = { ...gifts[index], ...updates };
  storage.giftIdeas.set(userId, gifts);

  res.json({ success: true, gift: gifts[index] });
});

/**
 * DELETE /api/gifts/:userId/:giftId
 * Delete gift
 */
router.delete('/api/gifts/:userId/:giftId', async (req, res) => {
  const { userId, giftId } = req.params;
  const storage = req.app.locals.storage;

  const gifts = storage.giftIdeas.get(userId) || [];
  const filtered = gifts.filter(g => g.id !== giftId);

  if (filtered.length === gifts.length) {
    return res.status(404).json({ success: false, error: 'Gift not found' });
  }

  storage.giftIdeas.set(userId, filtered);

  res.json({ success: true, message: 'Gift deleted' });
});

// Helper functions
function hasGiftIdea(storage, userId, personId, occasion) {
  const gifts = storage.giftIdeas.get(userId) || [];
  return gifts.some(g =>
    g.personId === personId &&
    g.occasion === occasion &&
    g.status === 'idea'
  );
}

function hasPurchasedGift(storage, userId, personId, occasion) {
  const gifts = storage.giftIdeas.get(userId) || [];
  return gifts.some(g =>
    g.personId === personId &&
    g.occasion === occasion &&
    g.status === 'purchased'
  );
}

function getBudgetSuggestions(relationshipType) {
  const budgets = {
    parent: { low: 1000, medium: 3000, high: 10000 },
    sibling: { low: 500, medium: 1500, high: 5000 },
    best_friend: { low: 500, medium: 2000, high: 5000 },
    spouse: { low: 2000, medium: 5000, high: 20000 },
    child: { low: 300, medium: 1000, high: 3000 },
    colleague: { low: 200, medium: 500, high: 1500 },
    mentor: { low: 500, medium: 2000, high: 5000 }
  };

  return budgets[relationshipType] || { low: 500, medium: 1500, high: 5000 };
}

export default router;
