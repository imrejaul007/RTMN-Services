/**
 * HOJAI SiteOS Social Media Connector
 * Port: 5492
 * Multi-platform posting, scheduling, analytics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5492;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/social-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

// Mock posting
const postToSocial = async (platform, content) => {
  console.log(`[Social] ${platform}: ${content.text.substring(0, 50)}...`);
  return { postId: `post_${uuidv4().substring(0, 8)}`, platform, success: true };
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'social-connector', port: PORT });
});

// Get connected accounts
app.get('/api/accounts', requireAuth, (req, res) => {
  const accounts = loadData(req.companyId, 'accounts');
  res.json({ accounts });
});

// Connect account
app.post('/api/accounts', requireAuth, (req, res) => {
  const { platform, accessToken, pageId } = req.body;
  if (!platform || !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Valid platform required' });
  }

  const account = {
    id: uuidv4(),
    companyId: req.companyId,
    platform,
    accessToken,
    pageId: pageId || null,
    connected: true,
    connectedAt: new Date().toISOString()
  };

  const accounts = loadData(req.companyId, 'accounts');
  accounts.push(account);
  saveData(req.companyId, 'accounts', accounts);

  res.json({ success: true, account });
});

// Disconnect account
app.delete('/api/accounts/:id', requireAuth, (req, res) => {
  let accounts = loadData(req.companyId, 'accounts');
  accounts = accounts.filter(a => a.id !== req.params.id);
  saveData(req.companyId, 'accounts', accounts);
  res.json({ success: true });
});

// Create post
app.post('/api/posts', requireAuth, async (req, res) => {
  const { platforms, content, media, scheduledAt } = req.body;

  if (!platforms || !Array.isArray(platforms) || !content) {
    return res.status(400).json({ error: 'platforms array and content required' });
  }

  const post = {
    postId: uuidv4(),
    companyId: req.companyId,
    content,
    media: media || [],
    platforms,
    scheduledAt: scheduledAt || null,
    status: scheduledAt ? 'scheduled' : 'published',
    publishedAt: scheduledAt ? null : new Date().toISOString(),
    results: [],
    createdAt: new Date().toISOString()
  };

  // Publish immediately if not scheduled
  if (!scheduledAt) {
    for (const platform of platforms) {
      try {
        const result = await postToSocial(platform, content);
        post.results.push({ platform, ...result });
      } catch (err) {
        post.results.push({ platform, success: false, error: err.message });
      }
    }
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
  }

  const posts = loadData(req.companyId, 'posts');
  posts.push(post);
  saveData(req.companyId, 'posts', posts);

  res.json({ success: true, post });
});

// Get posts
app.get('/api/posts', requireAuth, (req, res) => {
  const { status, platform, page = 1, limit = 20 } = req.query;
  let posts = loadData(req.companyId, 'posts');

  if (status) posts = posts.filter(p => p.status === status);
  if (platform) posts = posts.filter(p => p.platforms.includes(platform));

  posts = posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const start = (page - 1) * limit;

  res.json({ posts: posts.slice(start, start + Number(limit)), total: posts.length });
});

// Schedule post
app.post('/api/schedule', requireAuth, (req, res) => {
  const { platforms, content, media, scheduledAt } = req.body;

  const schedule = {
    id: uuidv4(),
    companyId: req.companyId,
    platforms,
    content,
    media: media || [],
    scheduledAt,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const schedules = loadData(req.companyId, 'schedules');
  schedules.push(schedule);
  saveData(req.companyId, 'schedules', schedules);

  res.json({ success: true, schedule });
});

// Get calendar
app.get('/api/calendar', requireAuth, (req, res) => {
  const { start, end } = req.query;
  const schedules = loadData(req.companyId, 'schedules');
  const posts = loadData(req.companyId, 'posts');

  const all = [
    ...schedules.map(s => ({ ...s, type: 'scheduled' })),
    ...posts.map(p => ({ ...p, type: 'published' }))
  ];

  res.json({ items: all });
});

// Get metrics
app.get('/api/metrics', requireAuth, (req, res) => {
  const posts = loadData(req.companyId, 'posts');
  const published = posts.filter(p => p.status === 'published');

  res.json({
    totalPosts: published.length,
    byPlatform: PLATFORMS.reduce((acc, p) => {
      acc[p] = published.filter(post => post.platforms.includes(p)).length;
      return acc;
    }, {}),
    avgEngagement: Math.floor(Math.random() * 500) + 100,
    topPosts: published.slice(0, 5)
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Social Connector running on port ${PORT}`);
});

export default app;
