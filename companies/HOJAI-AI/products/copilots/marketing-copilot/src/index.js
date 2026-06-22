const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4929;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// In-memory stores
// ============================================================
const campaigns = new Map([
  ['cmp-001', {
    id: 'cmp-001',
    name: 'Summer Sale 2026',
    goal: 'Increase Q3 revenue by 20%',
    audience: 'high-value customers',
    channels: ['email', 'social', 'paid_ads'],
    status: 'active',
    budget: 50000,
    spent: 12000,
    metrics: { impressions: 250000, clicks: 8500, conversions: 245, revenue: 92000 },
    createdAt: new Date().toISOString()
  }]
]);

const content = new PersistentMap('content', { serviceName: 'marketing-copilot' });
const audiences = new Map([
  ['aud-001', { id: 'aud-001', name: 'Tech Enthusiasts', size: 25000, demographics: { age: '25-45', interests: ['technology', 'AI'], location: 'US' } }],
  ['aud-002', { id: 'aud-002', name: 'Small Business Owners', size: 15000, demographics: { age: '30-55', interests: ['business', 'productivity'] } }]
]);

const seoReports = new PersistentMap('seo-reports', { serviceName: 'marketing-copilot' });

// ============================================================
// Health & Info
// ============================================================
app.get('/health', (req, res) => res.json({
  status: 'healthy',
  service: 'marketing-copilot',
  version: '1.0.0',
  port: PORT,
  counts: { campaigns: campaigns.size, content: content.size, audiences: audiences.size, seoReports: seoReports.size },
  timestamp: new Date().toISOString()
}));

app.get('/', (req, res) => res.json({
  service: 'Marketing Copilot',
  version: '1.0.0',
  port: PORT,
  status: 'running',
  capabilities: [
    '/api/campaigns - List campaigns',
    '/api/campaigns/generate - Generate campaign',
    '/api/campaigns/:id - Get campaign',
    '/api/content/generate - Generate content',
    '/api/content/:id - Get content piece',
    '/api/audiences - List audiences',
    '/api/audience/insights - Get audience insights',
    '/api/audiences/:id - Get audience',
    '/api/seo/analyze - SEO analysis',
    '/api/seo/keywords - Keyword research',
    '/api/email/subject - Generate email subject lines',
    '/api/email/body - Generate email body',
    '/api/social/post - Generate social post',
    '/api/landing/generate - Generate landing page copy',
    '/api/ab-test - Create A/B test variant',
    '/api/calendar - Get content calendar',
    '/api/performance - Get performance metrics'
  ]
}));

// ============================================================
// Campaigns
// ============================================================
app.get('/api/campaigns', (req, res) => {
  const { status } = req.query;
  let results = Array.from(campaigns.values());
  if (status) results = results.filter(c => c.status === status);
  res.json({ campaigns: results, count: results.length });
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

app.post('/api/campaigns/generate',requireAuth,  (req, res) => {
  const { goal, audience, channels, budget, duration } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });

  const id = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const campaign = {
    id,
    name: `AI Campaign: ${goal}`,
    goal,
    audience: audience || 'general',
    channels: channels || ['email', 'social'],
    budget: budget || 10000,
    duration: duration || '30 days',
    status: 'draft',
    recommendations: [
      'Launch with email sequence (3 emails over 7 days)',
      'Back with social posts (2-3 per week)',
      'Create dedicated landing page',
      'Set up retargeting pixel'
    ],
    suggestedContent: {
      emailSubject: `Discover: ${goal}`,
      socialHook: `Tired of struggling with ${goal}? Here's the solution.`,
      landingHeadline: `Transform Your ${goal} Strategy`
    },
    estimatedReach: 50000,
    estimatedROI: '3.5x',
    createdAt: new Date().toISOString()
  };
  campaigns.set(id, campaign);
  res.status(201).json(campaign);
});

app.patch('/api/campaigns/:id',requireAuth,  (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  Object.assign(campaign, req.body, { updatedAt: new Date().toISOString() });
  res.json(campaign);
});

// ============================================================
// Content Generation
// ============================================================
app.post('/api/content/generate',requireAuth,  (req, res) => {
  const { topic, tone, platform, length, keywords } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const id = `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const contentPiece = {
    id,
    topic,
    tone: tone || 'professional',
    platform: platform || 'blog',
    length: length || 'medium',
    content: generateContent(topic, tone || 'professional', platform || 'blog'),
    variations: 3,
    hashtags: generateHashtags(topic),
    keywords: keywords || [],
    wordCount: 250,
    readingTime: '2 min',
    seoScore: 82,
    createdAt: new Date().toISOString()
  };
  content.set(id, contentPiece);
  res.status(201).json(contentPiece);
});

app.get('/api/content/:id', (req, res) => {
  const c = content.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Content not found' });
  res.json(c);
});

// ============================================================
// Audiences
// ============================================================
app.get('/api/audiences', (req, res) => {
  res.json({ audiences: Array.from(audiences.values()) });
});

app.get('/api/audiences/:id', (req, res) => {
  const aud = audiences.get(req.params.id);
  if (!aud) return res.status(404).json({ error: 'Audience not found' });
  res.json(aud);
});

app.post('/api/audience/insights',requireAuth,  (req, res) => {
  const { segmentId } = req.body;
  if (!segmentId) return res.status(400).json({ error: 'segmentId is required' });

  const aud = audiences.get(segmentId);
  res.json({
    segmentId,
    audience: aud || null,
    insights: {
      size: aud ? aud.size : 15000,
      demographics: aud ? aud.demographics : { age: '25-45', interests: ['tech', 'business'] },
      behaviors: ['High email engagement', 'Prefers mobile', 'Active on social'],
      preferences: ['Quality over price', 'Quick customer support', 'Personalization'],
      bestChannels: ['email', 'instagram', 'linkedin'],
      bestTimeToReach: 'Tue-Thu 9-11am',
      conversionRate: 0.045
    }
  });
});

app.post('/api/audiences',requireAuth,  (req, res) => {
  const { name, demographics } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = `aud-${Date.now()}`;
  const aud = { id, name, size: Math.floor(Math.random() * 30000) + 5000, demographics: demographics || {}, createdAt: new Date().toISOString() };
  audiences.set(id, aud);
  res.status(201).json(aud);
});

// ============================================================
// SEO
// ============================================================
app.post('/api/seo/analyze',requireAuth,  (req, res) => {
  const { url, content: pageContent } = req.body;
  if (!url && !pageContent) return res.status(400).json({ error: 'url or content required' });

  res.json({
    url: url || null,
    score: 78,
    issues: [
      { severity: 'medium', issue: 'Missing meta description', recommendation: 'Add a 150-160 char meta description' },
      { severity: 'low', issue: 'Image alt tags missing', recommendation: 'Add descriptive alt text to all images' }
    ],
    strengths: ['Good heading structure', 'Mobile-friendly', 'Fast load time'],
    keywordDensity: 0.025,
    recommendations: ['Add 2-3 more H2 tags', 'Improve internal linking', 'Add FAQ schema']
  });
});

app.post('/api/seo/keywords',requireAuth,  (req, res) => {
  const { topic, count } = req.body;
  res.json({
    topic,
    keywords: [
      { keyword: `${topic} guide`, volume: 12000, difficulty: 0.45, cpc: 2.5 },
      { keyword: `best ${topic}`, volume: 8500, difficulty: 0.62, cpc: 3.2 },
      { keyword: `${topic} tips`, volume: 5400, difficulty: 0.35, cpc: 1.8 },
      { keyword: `how to ${topic}`, volume: 15200, difficulty: 0.55, cpc: 2.1 },
      { keyword: `${topic} examples`, volume: 3200, difficulty: 0.28, cpc: 1.5 }
    ].slice(0, count || 5)
  });
});

// ============================================================
// Email
// ============================================================
app.post('/api/email/subject',requireAuth,  (req, res) => {
  const { topic, tone } = req.body;
  res.json({
    subjectLines: [
      `${topic} - You'll love this`,
      `Quick guide to ${topic}`,
      `[New] ${topic} revealed`,
      `The ${topic} breakthrough`,
      `Last chance: ${topic}`
    ]
  });
});

app.post('/api/email/body',requireAuth,  (req, res) => {
  const { topic, audience, length } = req.body;
  res.json({
    body: `Hi there,\n\nI wanted to share something exciting about ${topic}...\n\n[Generated body tailored for ${audience || 'general audience'}, length: ${length || 'medium'}]\n\nBest,\nThe Team`,
    wordCount: 180,
    estimatedReadTime: '1 min'
  });
});

// ============================================================
// Social
// ============================================================
app.post('/api/social/post',requireAuth,  (req, res) => {
  const { topic, platform, tone } = req.body;
  const platformData = {
    twitter: { maxLength: 280, hashtagCount: 2 },
    linkedin: { maxLength: 3000, hashtagCount: 5 },
    instagram: { maxLength: 2200, hashtagCount: 10 },
    facebook: { maxLength: 5000, hashtagCount: 3 }
  };
  const pf = platformData[platform] || platformData.linkedin;

  res.json({
    content: `${topic}\n\nKey takeaway: This changes everything.\n\nWhat do you think?`,
    platform: platform || 'linkedin',
    hashtags: generateHashtags(topic).slice(0, pf.hashtagCount),
    characterCount: 200,
    withinLimit: 200 <= pf.maxLength
  });
});

// ============================================================
// Landing Page
// ============================================================
app.post('/api/landing/generate',requireAuth,  (req, res) => {
  const { product, audience, goal } = req.body;
  res.json({
    headline: `Transform Your ${product || 'Business'} Today`,
    subheadline: `Join thousands of ${audience || 'professionals'} achieving ${goal || 'success'} with our platform`,
    cta: 'Get Started Free',
    sections: [
      { type: 'hero', headline: `Welcome to ${product}`, cta: 'Try Free' },
      { type: 'features', title: 'Why Choose Us', bullets: ['Save time', 'Increase revenue', 'Delight customers'] },
      { type: 'testimonial', quote: 'Game changer for our business!', author: 'Happy Customer' },
      { type: 'cta', headline: 'Ready to start?', cta: 'Sign Up Now' }
    ]
  });
});

// ============================================================
// A/B Testing
// ============================================================
app.post('/api/ab-test',requireAuth,  (req, res) => {
  const { name, variants, metric } = req.body;
  res.json({
    id: uuidv4(),
    name: name || 'A/B Test',
    variants: variants || [
      { id: 'A', name: 'Control', traffic: 0.5 },
      { id: 'B', name: 'Variant', traffic: 0.5 }
    ],
    metric: metric || 'conversion_rate',
    status: 'draft',
    estimatedDuration: '14 days',
    createdAt: new Date().toISOString()
  });
});

// ============================================================
// Content Calendar
// ============================================================
app.get('/api/calendar', (req, res) => {
  const today = new Date();
  const calendar = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    calendar.push({
      date: d.toISOString().split('T')[0],
      slots: [
        { time: '09:00', type: 'social', platform: 'linkedin' },
        { time: '14:00', type: 'email', topic: 'Newsletter' }
      ]
    });
  }
  res.json({ calendar });
});

// ============================================================
// Performance
// ============================================================
app.get('/api/performance', (req, res) => {
  const allCampaigns = Array.from(campaigns.values());
  const totalSpend = allCampaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const totalRevenue = allCampaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0);

  res.json({
    summary: {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === 'active').length,
      totalSpend,
      totalRevenue,
      roi: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 0
    },
    topCampaigns: allCampaigns.slice(0, 5)
  });
});

// ============================================================
// Helpers
// ============================================================
function generateContent(topic, tone, platform) {
  const intros = {
    professional: `In today's competitive landscape, ${topic} has become increasingly important.`,
    casual: `Let's talk about ${topic} - it's everywhere right now!`,
    educational: `Understanding ${topic} is essential for modern professionals.`
  };
  return `${intros[tone] || intros.professional}\n\nThis comprehensive guide explores the key aspects of ${topic}, providing actionable insights for ${platform} readers.\n\nKey Points:\n• Understanding the fundamentals\n• Best practices and common pitfalls\n• Real-world examples and case studies\n• Actionable next steps\n\n[Content continues with detailed analysis tailored to ${platform} audience]`;
}

function generateHashtags(topic) {
  const tag = topic.toLowerCase().replace(/\s+/g, '');
  return [`#${tag}`, `#${tag}Tips`, `#${tag}2026`, `#Digital`, `#Innovation`, `#Growth`, `#Strategy`, `#Marketing`];
}

// ============================================================
// Error handler
// ============================================================
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => console.log(`📣 Marketing Copilot running on port ${PORT}`));
installGracefulShutdown(server);
