/**
 * Product OS - Feature Tracking & PRD Management
 * Port: 5271
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5271;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const features = new Map();
const requirements = new Map();
const releases = new Map();
const userStories = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'product-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['feature_tracking', 'prd_management', 'user_stories', 'roadmap_planning']
}));

// Features Routes
app.post('/api/features', (req, res) => {
  const { name, description, priority, status, owner, effort, value } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const feature = {
    id: `feat-${uuidv4().slice(0, 8)}`,
    name,
    description: description || '',
    priority: priority || 'medium',
    status: status || 'backlog',
    owner: owner || null,
    effort: effort || null,
    value: value || null,
    acceptanceCriteria: [],
    linkedRequirements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  features.set(feature.id, feature);
  res.status(201).json(feature);
});

app.get('/api/features', (req, res) => {
  let list = Array.from(features.values());
  if (req.query.priority) list = list.filter(f => f.priority === req.query.priority);
  if (req.query.status) list = list.filter(f => f.status === req.query.status);
  if (req.query.owner) list = list.filter(f => f.owner === req.query.owner);
  res.json({ count: list.length, features: list });
});

app.get('/api/features/:id', (req, res) => {
  const feature = features.get(req.params.id);
  if (!feature) return res.status(404).json({ error: 'Not found' });
  res.json(feature);
});

app.put('/api/features/:id', (req, res) => {
  const feature = features.get(req.params.id);
  if (!feature) return res.status(404).json({ error: 'Not found' });

  Object.assign(feature, req.body);
  feature.updatedAt = new Date().toISOString();
  features.set(feature.id, feature);
  res.json(feature);
});

app.post('/api/features/:id/criteria', (req, res) => {
  const feature = features.get(req.params.id);
  if (!feature) return res.status(404).json({ error: 'Not found' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  feature.acceptanceCriteria.push({
    id: `ac-${uuidv4().slice(0, 8)}`,
    text,
    completed: false,
    createdAt: new Date().toISOString()
  });
  features.set(feature.id, feature);
  res.json(feature);
});

// Requirements Routes
app.post('/api/requirements', (req, res) => {
  const { title, type, description, linkedFeature } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const requirement = {
    id: `req-${uuidv4().slice(0, 8)}`,
    title,
    type: type || 'functional',
    description: description || '',
    linkedFeature: linkedFeature || null,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  requirements.set(requirement.id, requirement);
  res.status(201).json(requirement);
});

app.get('/api/requirements', (req, res) => {
  const list = Array.from(requirements.values());
  res.json({ count: list.length, requirements: list });
});

app.get('/api/requirements/:id', (req, res) => {
  const req = requirements.get(req.params.id);
  if (!req) return res.status(404).json({ error: 'Not found' });
  res.json(req);
});

// User Stories Routes
app.post('/api/stories', (req, res) => {
  const { title, asA, iWant, soThat, points, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const story = {
    id: `story-${uuidv4().slice(0, 8)}`,
    title,
    asA: asA || 'user',
    iWant: iWant || '',
    soThat: soThat || '',
    points: points || null,
    priority: priority || 'medium',
    status: 'todo',
    tasks: [],
    createdAt: new Date().toISOString()
  };

  userStories.set(story.id, story);
  res.status(201).json(story);
});

app.get('/api/stories', (req, res) => {
  let list = Array.from(userStories.values());
  if (req.query.status) list = list.filter(s => s.status === req.query.status);
  if (req.query.priority) list = list.filter(s => s.priority === req.query.priority);
  res.json({ count: list.length, stories: list });
});

app.post('/api/stories/:id/tasks', (req, res) => {
  const story = userStories.get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Not found' });

  const { text, assignee } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  story.tasks.push({
    id: `task-${uuidv4().slice(0, 8)}`,
    text,
    assignee: assignee || null,
    completed: false,
    createdAt: new Date().toISOString()
  });
  userStories.set(story.id, story);
  res.json(story);
});

// Releases & Roadmap
app.post('/api/releases', (req, res) => {
  const { name, date, features: featureIds, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const release = {
    id: `rel-${uuidv4().slice(0, 8)}`,
    name,
    date: date || null,
    features: featureIds || [],
    description: description || '',
    status: 'planned',
    createdAt: new Date().toISOString()
  };

  releases.set(release.id, release);
  res.status(201).json(release);
});

app.get('/api/releases', (req, res) => {
  const list = Array.from(releases.values());
  res.json({ count: list.length, releases: list });
});

app.get('/api/roadmap', (req, res) => {
  const roadmap = {
    quarter: new Date().getFullYear() + ' Q' + Math.ceil((new Date().getMonth() + 1) / 3),
    features: Array.from(features.values()).filter(f => f.priority !== 'low'),
    releases: Array.from(releases.values()),
    stats: {
      totalFeatures: features.size,
      inProgress: Array.from(features.values()).filter(f => f.status === 'in_progress').length,
      completed: Array.from(features.values()).filter(f => f.status === 'done').length
    }
  };
  res.json(roadmap);
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    features: features.size,
    requirements: requirements.size,
    stories: userStories.size,
    releases: releases.size
  });
});

app.listen(PORT, () => {
  console.log(`[ProductOS] Product OS running on port ${PORT}`);
  console.log('Capabilities: Feature Tracking, PRD Management, User Stories, Roadmap Planning');
});
