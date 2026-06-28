// Personalization OS - User preference learning, recommendations, adaptive UI
// Port 4893

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4893;
app.use(express.json());

// --- Profile Management ---

function loadProfiles() { return readJson('profiles.json') || []; }
function saveProfiles(list) { writeJson('profiles.json', list); }

app.get('/api/profiles', (req, res) => {
  const { userId } = req.query;
  const profiles = loadProfiles();
  if (userId) {
    const p = profiles.find(p => p.userId === userId);
    return p ? res.json(p) : res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profiles, count: profiles.length });
});

app.post('/api/profiles', (req, res) => {
  const { userId, name, preferences = {}, traits = {} } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const existing = loadProfiles().find(p => p.userId === userId);
  if (existing) return res.status(409).json({ error: 'Profile already exists', profile: existing });

  const profile = {
    userId,
    name,
    preferences,
    traits,
    affinityScores: {},
    interactionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profiles = loadProfiles();
  profiles.push(profile);
  saveProfiles(profiles);
  res.status(201).json(profile);
});

app.put('/api/profiles/:userId', (req, res) => {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.userId === req.params.userId);
  if (idx < 0) return res.status(404).json({ error: 'Profile not found' });

  const { name, preferences, traits } = req.body;
  if (name) profiles[idx].name = name;
  if (preferences) profiles[idx].preferences = { ...profiles[idx].preferences, ...preferences };
  if (traits) profiles[idx].traits = { ...profiles[idx].traits, ...traits };
  profiles[idx].updatedAt = new Date().toISOString();
  saveProfiles(profiles);
  res.json(profiles[idx]);
});

// --- Preference Tracking ---

app.post('/api/preferences/:userId/track', (req, res) => {
  const { action, itemId, itemType, value, context = {} } = req.body;
  if (!action || !itemId) return res.status(400).json({ error: 'action and itemId required' });

  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.userId === req.params.userId);
  if (idx < 0) return res.status(404).json({ error: 'Profile not found' });

  const event = {
    id: uuidv4(),
    userId: req.params.userId,
    action,
    itemId,
    itemType,
    value,
    context,
    timestamp: new Date().toISOString(),
  };

  // Update affinity score
  const category = itemType || 'general';
  const delta = action === 'like' ? 0.1 : action === 'dislike' ? -0.1 : action === 'view' ? 0.02 : 0;
  profiles[idx].affinityScores[category] = (profiles[idx].affinityScores[category] || 0) + delta;
  profiles[idx].interactionCount++;
  profiles[idx].updatedAt = new Date().toISOString();
  saveProfiles(profiles);

  // Store event
  const events = readJson('events.json') || [];
  events.push(event);
  writeJson('events.json', events);

  res.json({ event, newAffinity: profiles[idx].affinityScores });
});

app.get('/api/preferences/:userId/events', (req, res) => {
  const events = (readJson('events.json') || []).filter(e => e.userId === req.params.userId);
  res.json({ events, count: events.length });
});

// --- Recommendations ---

app.get('/api/recommendations/:userId', (req, res) => {
  const { limit = 10, type } = req.query;
  const profiles = loadProfiles();
  const profile = profiles.find(p => p.userId === req.params.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Simple affinity-based recommendation
  const scores = profile.affinityScores;
  const topCategories = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, score]) => ({ category: cat, score }));

  const recommendations = (topCategories.slice(0, parseInt(limit)))
    .map((rec, i) => ({
      itemId: `${rec.category}-rec-${i + 1}`,
      category: rec.category,
      score: rec.score,
      reason: rec.score > 0.05 ? 'high_affinity' : rec.score > 0 ? 'positive' : 'explore',
    }));

  res.json({ recommendations, userId: req.params.userId, totalScored: topCategories.length });
});

// --- Segment Analysis ---

app.get('/api/segments', (req, res) => {
  const profiles = loadProfiles();
  const segments = {};

  profiles.forEach(p => {
    const affinity = p.affinityScores || {};
    const topCat = Object.entries(affinity).sort((a, b) => b[1] - a[1])[0];
    const seg = topCat ? topCat[0] : 'unclassified';
    if (!segments[seg]) segments[seg] = { segment: seg, users: [], count: 0 };
    segments[seg].users.push(p.userId);
    segments[seg].count++;
  });

  res.json({ segments: Object.values(segments), totalSegments: Object.keys(segments).length });
});

// --- Health ---
app.get('/health', (req, res) => res.json({ service: 'personalization-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => {
  console.log(`Personalization OS running on port ${PORT}`);
});

export default server;