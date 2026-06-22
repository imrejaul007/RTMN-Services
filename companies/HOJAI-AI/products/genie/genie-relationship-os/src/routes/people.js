/**
 * People Routes - Personal CRM
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Relationship types
const RELATIONSHIP_TYPES = {
  family: ['parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'spouse', 'partner', 'child', 'son', 'daughter', 'grandparent', 'grandchild'],
  friend: ['best_friend', 'close_friend', 'friend', 'acquaintance', 'childhood_friend', 'college_friend', 'neighbor'],
  professional: ['colleague', 'boss', 'manager', 'mentor', 'mentee', 'client', 'vendor', 'partner', 'investor', 'advisor', 'board_member'],
  community: ['teacher', 'professor', 'coach', 'doctor', 'therapist', 'religious_leader', 'community_leader']
};

/**
 * POST /api/people
 * Add a person to your network
 */
router.post('/api/people', async (req, res) => {
  const { userId, name, phone, email, category, relationshipType, importance, birthday, anniversary, notes, tags, photo } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !name) {
    return res.status(400).json({ success: false, error: 'userId and name are required' });
  }

  if (!storage.people.has(userId)) {
    storage.people.set(userId, []);
  }

  const person = {
    id: uuidv4(),
    userId,
    name,
    phone: phone || null,
    email: email || null,
    category: category || 'other', // family, friend, professional, community, other
    relationshipType: relationshipType || 'acquaintance',
    importance: importance || 5, // 1-10
    birthday: birthday || null,
    anniversary: anniversary || null,
    notes: notes || '',
    tags: tags || [],
    photo: photo || null,
    metDate: new Date().toISOString(),
    lastContact: null,
    totalInteractions: 0,
    interactionFrequency: 0, // interactions per month
    relationshipHealth: 100,
    milestones: [],
    customFields: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.people.get(userId).push(person);

  res.json({ success: true, person });
});

/**
 * GET /api/people/:userId
 * Get all people in your network
 */
router.get('/api/people/:userId', async (req, res) => {
  const { userId } = req.params;
  const { category, sort, search } = req.query;
  const storage = req.app.locals.storage;

  let people = storage.people.get(userId) || [];

  // Filter by category
  if (category) {
    people = people.filter(p => p.category === category);
  }

  // Search
  if (search) {
    const query = search.toLowerCase();
    people = people.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.notes?.toLowerCase().includes(query) ||
      p.tags?.some(t => t.toLowerCase().includes(query))
    );
  }

  // Sort
  if (sort === 'importance') {
    people.sort((a, b) => b.importance - a.importance);
  } else if (sort === 'recent') {
    people.sort((a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0));
  } else if (sort === 'name') {
    people.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'health') {
    people.sort((a, b) => a.relationshipHealth - b.relationshipHealth);
  }

  res.json({
    success: true,
    people,
    count: people.length
  });
});

/**
 * GET /api/people/:userId/:personId
 * Get person details
 */
router.get('/api/people/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const person = people.find(p => p.id === personId);

  if (!person) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  // Get interactions with this person
  const interactions = (storage.interactions.get(userId) || [])
    .filter(i => i.personId === personId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    person,
    interactions: interactions.slice(0, 20),
    totalInteractions: interactions.length
  });
});

/**
 * PUT /api/people/:userId/:personId
 * Update person
 */
router.put('/api/people/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const index = people.findIndex(p => p.id === personId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  people[index] = {
    ...people[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  storage.people.set(userId, people);

  res.json({ success: true, person: people[index] });
});

/**
 * DELETE /api/people/:userId/:personId
 * Remove person from network
 */
router.delete('/api/people/:userId/:personId', async (req, res) => {
  const { userId, personId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const filtered = people.filter(p => p.id !== personId);

  if (filtered.length === people.length) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  storage.people.set(userId, filtered);

  res.json({ success: true, message: 'Person removed' });
});

/**
 * GET /api/people/:userId/types
 * Get relationship types
 */
router.get('/api/people/:userId/types', (req, res) => {
  res.json({
    success: true,
    types: RELATIONSHIP_TYPES
  });
});

/**
 * GET /api/people/:userId/upcoming
 * Get people with upcoming birthdays/anniversaries
 */
router.get('/api/people/:userId/upcoming', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const numDays = parseInt(days) || 30;
  const future = new Date();
  future.setDate(future.getDate() + numDays);

  const upcoming = people.filter(p => {
    if (!p.birthday && !p.anniversary) return false;

    const today = new Date();
    const thisYear = today.getFullYear();

    if (p.birthday) {
      const bday = new Date(p.birthday);
      bday.setFullYear(thisYear);
      if (bday < today) bday.setFullYear(thisYear + 1);
      if (bday <= future) return true;
    }

    if (p.anniversary) {
      const anniv = new Date(p.anniversary);
      anniv.setFullYear(thisYear);
      if (anniv < today) anniv.setFullYear(thisYear + 1);
      if (anniv <= future) return true;
    }

    return false;
  }).map(p => {
    const events = [];

    if (p.birthday) {
      const bday = new Date(p.birthday);
      const thisYear = new Date().getFullYear();
      bday.setFullYear(thisYear);
      if (bday < new Date()) bday.setFullYear(thisYear + 1);

      const age = thisYear - new Date(p.birthday).getFullYear();
      events.push({
        type: 'birthday',
        date: bday.toISOString().split('T')[0],
        daysUntil: Math.ceil((bday - new Date()) / (1000 * 60 * 60 * 24)),
        detail: age > 0 ? `Turning ${age}` : null
      });
    }

    if (p.anniversary) {
      const anniv = new Date(p.anniversary);
      const thisYear = new Date().getFullYear();
      anniv.setFullYear(thisYear);
      if (anniv < new Date()) anniv.setFullYear(thisYear + 1);

      const years = thisYear - new Date(p.anniversary).getFullYear();
      events.push({
        type: 'anniversary',
        date: anniv.toISOString().split('T')[0],
        daysUntil: Math.ceil((anniv - new Date()) / (1000 * 60 * 60 * 24)),
        detail: `${years} year${years !== 1 ? 's' : ''}`
      });
    }

    return { person: { id: p.id, name: p.name, importance: p.importance }, events };
  }).filter(p => p.events.length > 0)
    .sort((a, b) => a.events[0].daysUntil - b.events[0].daysUntil);

  res.json({
    success: true,
    upcoming,
    count: upcoming.length
  });
});

/**
 * POST /api/people/:userId/:personId/milestone
 * Add milestone with this person
 */
router.post('/api/people/:userId/:personId/milestone', async (req, res) => {
  const { userId, personId } = req.params;
  const { title, description, date } = req.body;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const index = people.findIndex(p => p.id === personId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Person not found' });
  }

  const milestone = {
    id: uuidv4(),
    title,
    description,
    date: date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  people[index].milestones = people[index].milestones || [];
  people[index].milestones.push(milestone);
  storage.people.set(userId, people);

  res.json({ success: true, milestone });
});

/**
 * GET /api/people/:userId/search
 * Search people
 */
router.get('/api/people/:userId/search', async (req, res) => {
  const { userId } = req.params;
  const { q } = req.query;
  const storage = req.app.locals.storage;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  const people = storage.people.get(userId) || [];
  const query = q.toLowerCase();

  const results = people.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.email?.toLowerCase().includes(query) ||
    p.phone?.includes(query) ||
    p.notes?.toLowerCase().includes(query) ||
    p.tags?.some(t => t.toLowerCase().includes(query))
  );

  res.json({
    success: true,
    query: q,
    results,
    count: results.length
  });
});

export default router;
