/**
 * MEDIA OS - Industry Operating System
 * Digital Media & Content Management Platform
 *
 * Features:
 * - Content Management
 * - Multi-Platform Distribution
 * - Ad Monetization
 * - Subscription Management
 * - Analytics & Insights
 * - Rights Management
 *
 * @module media-os
 * @version 1.0.0
 * @port 5600
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5600;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// In-memory data stores
const content = new Map();
const creators = new Map();
const platforms = new Map();
const viewers = new Map();
const subscriptions = new Map();
const campaigns = new Map();
const adInventory = new Map();
const rights = new Map();

// Digital Twins
const twins = {
  content: { id: 'content-twin', status: 'active', items: [] },
  creator: { id: 'creator-twin', status: 'active', creators: [] },
  viewer: { id: 'viewer-twin', status: 'active', viewers: [] },
  platform: { id: 'platform-twin', status: 'active', distribution: {} },
  ad: { id: 'ad-twin', status: 'active', inventory: 0 }
};

// Initialize sample data
function initializeSampleData() {
  // Sample platforms
  const platformList = [
    { id: 'p1', name: 'YouTube', type: 'video', reach: 2000000 },
    { id: 'p2', name: 'Instagram', type: 'social', reach: 5000000 },
    { id: 'p3', name: 'Website', type: 'web', reach: 100000 },
    { id: 'p4', name: 'OTT Platform', type: 'streaming', reach: 500000 }
  ];
  platformList.forEach(p => {
    platforms.set(p.id, p);
    twins.platform.distribution[p.name] = 0;
  });

  // Sample creators
  const creatorList = [
    { id: 'cr1', name: 'Tech Reviewer Pro', type: 'influencer', followers: 100000, platform: 'YouTube', revenue: 50000 },
    { id: 'cr2', name: 'Food Vlogger', type: 'influencer', followers: 50000, platform: 'Instagram', revenue: 25000 },
    { id: 'cr3', name: 'News Channel', type: 'publisher', followers: 1000000, platform: 'Website', revenue: 100000 }
  ];
  creatorList.forEach(c => {
    creators.set(c.id, c);
    twins.creator.creators.push(c);
  });

  // Sample content
  const contentList = [
    { id: 'ct1', title: 'Latest Smartphone Review', type: 'video', creatorId: 'cr1', status: 'published', views: 50000 },
    { id: 'ct2', title: 'Best Street Food Guide', type: 'article', creatorId: 'cr2', status: 'published', views: 25000 },
    { id: 'ct3', title: 'Breaking News Update', type: 'news', creatorId: 'cr3', status: 'published', views: 100000 }
  ];
  contentList.forEach(c => {
    content.set(c.id, { ...c, createdAt: new Date().toISOString() });
    twins.content.items.push(c);
  });

  // Sample ad inventory
  const adList = [
    { id: 'ad1', type: 'pre-roll', format: 'video', price: 0.05, available: 10000 },
    { id: 'ad2', type: 'display', format: 'banner', price: 0.01, available: 50000 },
    { id: 'ad3', type: 'sponsored', format: 'content', price: 0.10, available: 1000 }
  ];
  adList.forEach(a => {
    adInventory.set(a.id, a);
    twins.ad.inventory += a.available;
  });

  logger.info('Media OS sample data initialized');
}

initializeSampleData();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'media-os',
    version: '1.0.0',
    tagline: 'Digital Media & Content Management Platform',
    timestamp: new Date().toISOString(),
    twins: Object.keys(twins)
  });
});

// ============= CONTENT ENDPOINTS =============

app.get('/api/content', (req, res) => {
  const { type, creatorId, status } = req.query;
  let list = Array.from(content.values());
  if (type) list = list.filter(c => c.type === type);
  if (creatorId) list = list.filter(c => c.creatorId === creatorId);
  if (status) list = list.filter(c => c.status === status);
  res.json({ success: true, count: list.length, content: list });
});

app.get('/api/content/:id', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  res.json({ success: true, content: item });
});

app.post('/api/content', (req, res) => {
  const { title, type, creatorId, description, tags } = req.body;
  if (!title || !type || !creatorId) return res.status(400).json({ error: 'title, type, and creatorId required' });

  const item = {
    id: uuidv4(),
    title,
    type,
    creatorId,
    description: description || '',
    tags: tags || [],
    status: 'draft',
    views: 0,
    engagement: 0,
    revenue: 0,
    createdAt: new Date().toISOString(),
    publishedAt: null
  };
  content.set(item.id, item);
  twins.content.items.push(item);
  logger.info(`Content created: ${item.title}`);
  res.status(201).json({ success: true, content: item });
});

app.patch('/api/content/:id', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  Object.assign(item, req.body);
  res.json({ success: true, content: item });
});

app.post('/api/content/:id/publish', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  item.status = 'published';
  item.publishedAt = new Date().toISOString();
  res.json({ success: true, content: item });
});

app.post('/api/content/:id/views', (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  item.views = (item.views || 0) + 1;
  res.json({ success: true, views: item.views });
});

// ============= CREATOR ENDPOINTS =============

app.get('/api/creators', (req, res) => {
  const { type } = req.query;
  let list = Array.from(creators.values());
  if (type) list = list.filter(c => c.type === type);
  res.json({ success: true, count: list.length, creators: list });
});

app.get('/api/creators/:id', (req, res) => {
  const creator = creators.get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  const creatorContent = Array.from(content.values()).filter(c => c.creatorId === req.params.id);
  const totalViews = creatorContent.reduce((sum, c) => sum + (c.views || 0), 0);

  res.json({ success: true, creator, contentCount: creatorContent.length, totalViews });
});

app.post('/api/creators', (req, res) => {
  const { name, type, platform } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });

  const creator = {
    id: uuidv4(),
    name,
    type,
    platform: platform || 'Website',
    followers: 0,
    revenue: 0,
    createdAt: new Date().toISOString()
  };
  creators.set(creator.id, creator);
  twins.creator.creators.push(creator);
  res.status(201).json({ success: true, creator });
});

app.patch('/api/creators/:id', (req, res) => {
  const creator = creators.get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  Object.assign(creator, req.body);
  res.json({ success: true, creator });
});

// ============= PLATFORM ENDPOINTS =============

app.get('/api/platforms', (req, res) => {
  const platformsList = Array.from(platforms.values());
  res.json({ success: true, count: platformsList.length, platforms: platformsList });
});

app.get('/api/platforms/:id', (req, res) => {
  const platform = platforms.get(req.params.id);
  if (!platform) return res.status(404).json({ error: 'Platform not found' });

  const platformContent = Array.from(content.values()).filter(c =>
    Array.from(creators.values()).find(cr => cr.id === c.creatorId && cr.platform === platform.name)
  );

  res.json({ success: true, platform, contentCount: platformContent.length });
});

app.post('/api/platforms/distribute', (req, res) => {
  const { contentId, platformId } = req.body;
  if (!contentId || !platformId) return res.status(400).json({ error: 'contentId and platformId required' });

  const platform = platforms.get(platformId);
  if (!platform) return res.status(404).json({ error: 'Platform not found' });

  twins.platform.distribution[platform.name] = (twins.platform.distribution[platform.name] || 0) + 1;
  res.json({ success: true, distributedTo: platform.name });
});

// ============= SUBSCRIPTION ENDPOINTS =============

app.get('/api/subscriptions', (req, res) => {
  const { status, tier } = req.query;
  let list = Array.from(subscriptions.values());
  if (status) list = list.filter(s => s.status === status);
  if (tier) list = list.filter(s => s.tier === tier);
  res.json({ success: true, count: list.length, subscriptions: list });
});

app.post('/api/subscriptions', (req, res) => {
  const { viewerId, tier, price } = req.body;
  if (!viewerId || !tier) return res.status(400).json({ error: 'viewerId and tier required' });

  const subscription = {
    id: uuidv4(),
    viewerId,
    tier,
    price: price || (tier === 'basic' ? 99 : tier === 'premium' ? 299 : 499),
    status: 'active',
    startDate: new Date().toISOString(),
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  subscriptions.set(subscription.id, subscription);
  res.status(201).json({ success: true, subscription });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const subscription = subscriptions.get(req.params.id);
  if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ success: true, subscription });
});

// ============= ADVERTISING ENDPOINTS =============

app.get('/api/ads/inventory', (req, res) => {
  const inventory = Array.from(adInventory.values());
  res.json({ success: true, inventory });
});

app.post('/api/ads/campaigns', (req, res) => {
  const { advertiserId, name, budget, targetAudience } = req.body;
  if (!advertiserId || !name) return res.status(400).json({ error: 'advertiserId and name required' });

  const campaign = {
    id: uuidv4(),
    advertiserId,
    name,
    budget: parseFloat(budget) || 10000,
    targetAudience: targetAudience || {},
    status: 'active',
    impressions: 0,
    clicks: 0,
    spent: 0,
    createdAt: new Date().toISOString()
  };
  campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

app.get('/api/ads/campaigns', (req, res) => {
  const { advertiserId, status } = req.query;
  let list = Array.from(campaigns.values());
  if (advertiserId) list = list.filter(c => c.advertiserId === advertiserId);
  if (status) list = list.filter(c => c.status === status);
  res.json({ success: true, count: list.length, campaigns: list });
});

app.post('/api/ads/campaigns/:id/impressions', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  campaign.impressions = (campaign.impressions || 0) + 1;
  res.json({ success: true, impressions: campaign.impressions });
});

// ============= ANALYTICS ENDPOINTS =============

app.get('/api/analytics', (req, res) => {
  const contentList = Array.from(content.values());
  const totalViews = contentList.reduce((sum, c) => sum + (c.views || 0), 0);
  const publishedContent = contentList.filter(c => c.status === 'published');
  const activeSubscriptions = Array.from(subscriptions.values()).filter(s => s.status === 'active');
  const activeCampaigns = Array.from(campaigns.values()).filter(c => c.status === 'active');

  res.json({
    success: true,
    analytics: {
      totalContent: contentList.length,
      publishedContent: publishedContent.length,
      totalViews,
      creators: creators.size,
      subscriptions: activeSubscriptions.length,
      activeCampaigns: activeCampaigns.length,
      totalRevenue: activeSubscriptions.reduce((sum, s) => sum + s.price, 0),
      adSpend: activeCampaigns.reduce((sum, c) => sum + c.spent, 0),
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/analytics/trending', (req, res) => {
  const contentList = Array.from(content.values())
    .filter(c => c.status === 'published')
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  res.json({ success: true, trending: contentList });
});

// ============= TWINS ENDPOINTS =============

app.get('/api/twins', (req, res) => {
  res.json({ success: true, twins });
});

app.get('/api/twins/:name', (req, res) => {
  const twin = twins[req.params.name];
  if (!twin) return res.status(404).json({ error: 'Twin not found' });
  res.json({ success: true, twin });
});

// ============= VIEWER ENDPOINTS =============

app.get('/api/viewers', (req, res) => {
  const viewersList = Array.from(viewers.values());
  res.json({ success: true, count: viewersList.length, viewers: viewersList });
});

app.post('/api/viewers', (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const viewer = {
    id: uuidv4(),
    name,
    email: email || '',
    subscriptionId: null,
    preferences: {},
    createdAt: new Date().toISOString()
  };
  viewers.set(viewer.id, viewer);
  twins.viewer.viewers.push(viewer);
  res.status(201).json({ success: true, viewer });
});

app.get('/api/viewers/:id', (req, res) => {
  const viewer = viewers.get(req.params.id);
  if (!viewer) return res.status(404).json({ error: 'Viewer not found' });
  res.json({ success: true, viewer });
});

// Start server
app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════════════════════════╗
║  MEDIA OS - Digital Media & Content Management Platform               ║
║  Port: ${PORT}                                                          ║
║  Features: Content, Creators, Distribution, Ads, Subscriptions        ║
║  Twins: Content, Creator, Viewer, Platform, Ad                    ║
╚══════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
