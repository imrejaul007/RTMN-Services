/**
 * Story Routes - Personal stories and memories endpoints
 */

import express from 'express';
import { Story, STORY_CATEGORIES, getStoryConnections, generateStoryTimeline, detectAnniversary } from '../models/story.js';

const router = express.Router();

/**
 * GET /story/categories
 * Get all story categories
 */
router.get('/story/categories', (req, res) => {
  res.json({
    success: true,
    categories: STORY_CATEGORIES
  });
});

/**
 * GET /story/:userId
 * Get all stories for user
 */
router.get('/story/:userId', async (req, res) => {
  const { userId } = req.params;
  const { category, year, tag, limit, favorite } = req.query;
  const storage = req.app.locals.storage;

  let stories = storage.stories.get(userId) || [];

  // Filter by category
  if (category) {
    stories = stories.filter(s => s.category === category);
  }

  // Filter by year
  if (year) {
    stories = stories.filter(s => s.year === parseInt(year) || s.date?.startsWith(year));
  }

  // Filter by tag
  if (tag) {
    stories = stories.filter(s => s.tags?.includes(tag));
  }

  // Filter favorites
  if (favorite === 'true') {
    stories = stories.filter(s => s.isFavorite);
  }

  // Sort by date descending
  stories = stories.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Apply limit
  if (limit) {
    stories = stories.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    stories,
    count: stories.length
  });
});

/**
 * POST /story/:userId
 * Create a new story
 */
router.post('/story/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    title, summary, content, date, location, people,
    emotions, category, photos, lessons, impact,
    isMilestone, milestoneType, recurring, tags
  } = req.body;

  const storage = req.app.locals.storage;

  if (!title && !content) {
    return res.status(400).json({
      success: false,
      error: 'Title or content is required'
    });
  }

  // Initialize storage
  if (!storage.stories.has(userId)) {
    storage.stories.set(userId, []);
  }

  const story = new Story({
    userId,
    title: title || 'Untitled Story',
    summary: summary || content?.substring(0, 150) + '...',
    content,
    date: date || new Date().toISOString().split('T')[0],
    location,
    people: people || [],
    emotions: emotions || [],
    category: category || 'personal',
    photos: photos || [],
    lessons: lessons || [],
    impact: impact || 'moderate',
    isMilestone: isMilestone || false,
    milestoneType,
    recurring: recurring || false,
    tags: tags || []
  });

  storage.stories.get(userId).push(story.toJSON());

  res.json({
    success: true,
    story: story.toJSON(),
    message: 'Story created'
  });
});

/**
 * GET /story/:userId/:storyId
 * Get a specific story
 */
router.get('/story/:userId/:storyId', async (req, res) => {
  const { userId, storyId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const story = stories.find(s => s.id === storyId);

  if (!story) {
    return res.status(404).json({
      success: false,
      error: 'Story not found'
    });
  }

  // Update access count
  story.accessCount = (story.accessCount || 0) + 1;
  story.lastAccessed = new Date().toISOString();
  storage.stories.set(userId, stories);

  // Get related stories
  const related = getStoryConnections(stories, storyId);

  res.json({
    success: true,
    story,
    related
  });
});

/**
 * PUT /story/:userId/:storyId
 * Update a story
 */
router.put('/story/:userId/:storyId', async (req, res) => {
  const { userId, storyId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const index = stories.findIndex(s => s.id === storyId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Story not found'
    });
  }

  updates.updatedAt = new Date().toISOString();
  stories[index] = { ...stories[index], ...updates };
  storage.stories.set(userId, stories);

  res.json({
    success: true,
    story: stories[index]
  });
});

/**
 * DELETE /story/:userId/:storyId
 * Delete a story
 */
router.delete('/story/:userId/:storyId', async (req, res) => {
  const { userId, storyId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const filtered = stories.filter(s => s.id !== storyId);

  if (filtered.length === stories.length) {
    return res.status(404).json({
      success: false,
      error: 'Story not found'
    });
  }

  storage.stories.set(userId, filtered);

  res.json({
    success: true,
    message: 'Story deleted'
  });
});

/**
 * POST /story/:userId/:storyId/favorite
 * Toggle favorite status
 */
router.post('/story/:userId/:storyId/favorite', async (req, res) => {
  const { userId, storyId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const index = stories.findIndex(s => s.id === storyId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Story not found'
    });
  }

  stories[index].isFavorite = !stories[index].isFavorite;
  stories[index].updatedAt = new Date().toISOString();
  storage.stories.set(userId, stories);

  res.json({
    success: true,
    isFavorite: stories[index].isFavorite
  });
});

/**
 * GET /story/:userId/milestones
 * Get milestone stories
 */
router.get('/story/:userId/milestones', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const milestones = stories
    .filter(s => s.isMilestone || s.impact === 'high' || s.impact === 'transformative')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    milestones,
    count: milestones.length
  });
});

/**
 * GET /story/:userId/favorites
 * Get favorite stories
 */
router.get('/story/:userId/favorites', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const favorites = stories
    .filter(s => s.isFavorite)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    favorites,
    count: favorites.length
  });
});

/**
 * GET /story/:userId/timeline
 * Get story timeline
 */
router.get('/story/:userId/timeline', async (req, res) => {
  const { userId } = req.params;
  const { year } = req.query;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const timeline = generateStoryTimeline(stories, year || new Date().getFullYear());

  res.json({
    success: true,
    timeline,
    count: timeline.length
  });
});

/**
 * GET /story/:userId/anniversary
 * Get story anniversaries for today
 */
router.get('/story/:userId/anniversary', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];
  const anniversaries = detectAnniversary(stories, new Date());

  res.json({
    success: true,
    anniversaries,
    count: anniversaries.length
  });
});

/**
 * GET /story/:userId/search
 * Search stories
 */
router.get('/story/:userId/search', async (req, res) => {
  const { userId } = req.params;
  const { q, people, location, category } = req.query;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];

  let results = stories;

  // Text search
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(s =>
      s.title?.toLowerCase().includes(query) ||
      s.content?.toLowerCase().includes(query) ||
      s.summary?.toLowerCase().includes(query)
    );
  }

  // Filter by people
  if (people) {
    const person = people.toLowerCase();
    results = results.filter(s => s.people?.some(p => p.toLowerCase().includes(person)));
  }

  // Filter by location
  if (location) {
    const loc = location.toLowerCase();
    results = results.filter(s => s.location?.toLowerCase().includes(loc));
  }

  // Filter by category
  if (category) {
    results = results.filter(s => s.category === category);
  }

  // Sort by relevance then date
  results = results
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  res.json({
    success: true,
    query: q,
    results,
    count: results.length
  });
});

/**
 * GET /story/:userId/stats
 * Get story statistics
 */
router.get('/story/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const stories = storage.stories.get(userId) || [];

  // Category distribution
  const byCategory = {};
  stories.forEach(s => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  });

  // Year distribution
  const byYear = {};
  stories.forEach(s => {
    const year = new Date(s.date).getFullYear();
    byYear[year] = (byYear[year] || 0) + 1;
  });

  // Most mentioned people
  const allPeople = stories.flatMap(s => s.people || []);
  const peopleCount = {};
  allPeople.forEach(p => {
    peopleCount[p] = (peopleCount[p] || 0) + 1;
  });
  const topPeople = Object.entries(peopleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => ({ name, count: peopleCount[name] }));

  // Most used tags
  const allTags = stories.flatMap(s => s.tags || []);
  const tagCount = {};
  allTags.forEach(t => {
    tagCount[t] = (tagCount[t] || 0) + 1;
  });
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => ({ tag, count: tagCount[tag] }));

  res.json({
    success: true,
    stats: {
      total: stories.length,
      byCategory,
      byYear,
      topPeople,
      topTags,
      avgImportance: stories.reduce((a, s) => a + (s.importance || 5), 0) / stories.length,
      milestones: stories.filter(s => s.isMilestone).length,
      favorites: stories.filter(s => s.isFavorite).length
    }
  });
});

export default router;
