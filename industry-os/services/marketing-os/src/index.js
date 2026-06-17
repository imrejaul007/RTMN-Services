/**
 * Marketing OS - The Autonomous Marketing Department
 *
 * 13 Operating Systems:
 * 1. Brand OS - Brand management
 * 2. Campaign OS - Enterprise campaign planning
 * 3. Journey OS - Customer journey orchestration
 * 4. Content OS - Content marketing
 * 5. Social OS - Social media management
 * 6. SEO OS - Search optimization
 * 7. Messaging OS - Email, WhatsApp, SMS
 * 8. Loyalty OS - Rewards and referral
 * 9. Event OS - Event marketing
 * 10. Influencer OS - Influencer campaigns
 * 11. Analytics OS - Marketing intelligence
 * 12. Budget OS - Marketing finance
 *
 * Plus AI Marketing Brain with 15 specialized agents
 *
 * Port: 5075
 * Part of: RTMN Industry OS Ecosystem
 * Version: 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');

const app = express();
const PORT = process.env.MARKETING_OS_PORT || 5075;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES - Complete Marketing Platform
// ============================================================

const dataStores = {
  // ===== BRAND OS =====
  brands: new Map(),
  brandGuidelines: new Map(),
  brandAssets: new Map(),

  // ===== CAMPAIGN OS =====
  campaigns: new Map(),
  campaignBudgets: new Map(),
  campaignAnalytics: new Map(),

  // ===== JOURNEY OS =====
  journeys: new Map(),
  journeySteps: new Map(),
  journeyAnalytics: new Map(),

  // ===== CONTENT OS =====
  content: new Map(),
  contentCalendar: new Map(),
  contentCategories: new Map(),

  // ===== SOCIAL OS =====
  socialAccounts: new Map(),
  socialPosts: new Map(),
  socialAnalytics: new Map(),

  // ===== SEO OS =====
  seoKeywords: new Map(),
  seoAudits: new Map(),
  seoRankings: new Map(),

  // ===== MESSAGING OS =====
  emailCampaigns: new Map(),
  smsCampaigns: new Map(),
  whatsappCampaigns: new Map(),
  templates: new Map(),

  // ===== LOYALTY OS =====
  loyaltyPrograms: new Map(),
  loyaltyMembers: new Map(),
  loyaltyRewards: new Map(),
  loyaltyTransactions: new Map(),

  // ===== EVENT OS =====
  events: new Map(),
  eventRegistrations: new Map(),
  eventSessions: new Map(),

  // ===== INFLUENCER OS =====
  influencers: new Map(),
  influencerCampaigns: new Map(),
  influencerContracts: new Map(),

  // ===== ANALYTICS OS =====
  analyticsDashboards: new Map(),
  marketingMetrics: new Map(),
  attributionModels: new Map(),

  // ===== BUDGET OS =====
  marketingBudgets: new Map(),
  budgetAllocations: new Map(),
  budgetForecasts: new Map(),

  // ===== AUDIENCES (CDP) =====
  audiences: new Map(),
  audienceSegments: new Map(),

  // ===== AI MARKETING BRAIN =====
  aiAgents: new Map(),

  // ===== INTEGRATIONS =====
  integrations: new Map(),
};

// ============================================================
// AUTHENTICATION
// ============================================================
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization required' });
  }
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }
  req.user = session;
  next();
}

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initSampleData() {
  // ===== BRANDS =====
  const brands = [
    { id: 'BRAND001', name: 'RTMN', tagline: 'Real-Time Multi-Network', logo: 'rtmn-logo.png', primaryColor: '#2563EB', secondaryColor: '#1E40AF', website: 'https://rtmn.com', status: 'active' },
    { id: 'BRAND002', name: 'AdBazaar', tagline: 'Smart Advertising Platform', logo: 'adbazaar-logo.png', primaryColor: '#10B981', secondaryColor: '#059669', website: 'https://adbazaar.com', status: 'active' },
    { id: 'BRAND003', name: 'REZ-Commerce', tagline: 'Commerce Made Simple', logo: 'rez-logo.png', primaryColor: '#F59E0B', secondaryColor: '#D97706', website: 'https://rez-commerce.com', status: 'active' },
  ];
  brands.forEach(b => dataStores.brands.set(b.id, b));

  // ===== CAMPAIGNS =====
  const campaigns = [
    { id: 'CMP001', name: 'Q2 Enterprise Push', type: 'email', status: 'active', budget: 500000, spent: 125000, startDate: '2026-04-01', endDate: '2026-06-30', channels: ['email', 'social', 'ads'], impressions: 1500000, clicks: 45000, conversions: 562, ctr: 3.0, cvr: 1.25 },
    { id: 'CMP002', name: 'Healthcare Summit 2026', type: 'event', status: 'active', budget: 200000, spent: 45000, startDate: '2026-05-01', endDate: '2026-07-15', channels: ['event', 'social'], impressions: 500000, clicks: 15000, conversions: 45, ctr: 3.0, cvr: 0.3 },
    { id: 'CMP003', name: 'SMB Winter Sale', type: 'discount', status: 'completed', budget: 100000, spent: 98000, startDate: '2026-01-01', endDate: '2026-03-31', channels: ['email', 'social', 'ads'], impressions: 2000000, clicks: 80000, conversions: 1200, ctr: 4.0, cvr: 1.5 },
    { id: 'CMP004', name: 'Product Launch - AI Suite', type: 'product', status: 'planning', budget: 750000, spent: 0, startDate: '2026-07-01', endDate: '2026-09-30', channels: ['email', 'social', 'ads', 'influencer'], impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0 },
    { id: 'CMP005', name: 'Partner Recruitment', type: 'partners', status: 'active', budget: 300000, spent: 78000, startDate: '2026-03-01', endDate: '2026-12-31', channels: ['email', 'linkedin'], impressions: 300000, clicks: 12000, conversions: 85, ctr: 4.0, cvr: 0.71 },
  ];
  campaigns.forEach(c => dataStores.campaigns.set(c.id, c));

  // ===== JOURNEYS =====
  const journeys = [
    { id: 'JRN001', name: 'New Lead Nurture', type: 'lead_nurture', status: 'active', steps: ['welcome_email', 'product_demo', 'case_study', 'demo_request', 'sales_handoff'], enrolled: 1540, completed: 423, conversionRate: 27.5 },
    { id: 'JRN002', name: 'Customer Onboarding', type: 'onboarding', status: 'active', steps: ['welcome', 'setup_guide', 'training_invite', 'success_check', 'expansion_offer'], enrolled: 89, completed: 67, conversionRate: 75.3 },
    { id: 'JRN003', name: 'Win-Back Campaign', type: 'winback', status: 'active', steps: ['reengagement_email', 'special_offer', 'last_chance', 'exit_survey'], enrolled: 234, completed: 78, conversionRate: 33.3 },
    { id: 'JRN004', name: 'Renewal Reminder', type: 'renewal', status: 'active', steps: ['90_day', '60_day', '30_day', 'final_notice'], enrolled: 45, completed: 32, conversionRate: 71.1 },
  ];
  journeys.forEach(j => dataStores.journeys.set(j.id, j));

  // ===== CONTENT =====
  const content = [
    { id: 'CNT001', title: 'How AI is Transforming Enterprise Sales', type: 'blog', status: 'published', author: 'Marketing Team', views: 12500, shares: 234, leads: 156, publishedAt: '2026-06-01' },
    { id: 'CNT002', title: 'Complete Guide to Healthcare Digital Transformation', type: 'whitepaper', status: 'published', author: 'Content Team', views: 8900, shares: 445, leads: 89, publishedAt: '2026-05-15' },
    { id: 'CNT003', title: 'RTMN Platform Demo 2026', type: 'video', status: 'published', author: 'Marketing Team', views: 45000, shares: 567, leads: 234, publishedAt: '2026-04-20' },
    { id: 'CNT004', title: 'Customer Success Stories - TechCorp', type: 'case_study', status: 'published', author: 'Content Team', views: 6700, shares: 123, leads: 45, publishedAt: '2026-05-01' },
    { id: 'CNT005', title: 'Q3 Product Launch Announcement', type: 'blog', status: 'draft', author: 'Marketing Team', views: 0, shares: 0, leads: 0, publishedAt: null },
  ];
  content.forEach(c => dataStores.content.set(c.id, c));

  // ===== SOCIAL ACCOUNTS =====
  const socialAccounts = [
    { id: 'SOC001', platform: 'linkedin', handle: 'rtmn-official', followers: 25000, posts: 245, engagement: 4.5, status: 'active' },
    { id: 'SOC002', platform: 'twitter', handle: 'rtmn_ai', followers: 15000, posts: 567, engagement: 3.2, status: 'active' },
    { id: 'SOC003', platform: 'youtube', handle: 'RTMNOfficial', subscribers: 8500, videos: 45, views: 125000, status: 'active' },
    { id: 'SOC004', platform: 'instagram', handle: 'rtmn.platform', followers: 12000, posts: 189, engagement: 5.1, status: 'active' },
  ];
  socialAccounts.forEach(s => dataStores.socialAccounts.set(s.id, s));

  // ===== SOCIAL POSTS =====
  const socialPosts = [
    { id: 'POST001', accountId: 'SOC001', content: 'Excited to announce our Q2 results! 🚀', type: 'announcement', likes: 234, comments: 45, shares: 67, reach: 12500, publishedAt: '2026-06-10' },
    { id: 'POST002', accountId: 'SOC001', content: 'New case study: How TechCorp increased sales by 40% with RTMN', type: 'case_study', likes: 189, comments: 32, shares: 89, reach: 9800, publishedAt: '2026-06-08' },
    { id: 'POST003', accountId: 'SOC002', content: 'AI is the future of sales. Here\'s why...', type: 'thread', likes: 456, comments: 78, shares: 123, reach: 25000, publishedAt: '2026-06-12' },
  ];
  socialPosts.forEach(p => dataStores.socialPosts.set(p.id, p));

  // ===== EMAIL CAMPAIGNS =====
  const emailCampaigns = [
    { id: 'EML001', name: 'Monthly Newsletter June', status: 'sent', sent: 45000, delivered: 44800, opened: 13400, clicked: 2680, bounced: 200, unsubscribed: 45, conversion: 156, openRate: 29.9, clickRate: 6.0 },
    { id: 'EML002', name: 'Product Update - June', status: 'sent', sent: 25000, delivered: 24850, opened: 7455, clicked: 1491, bounced: 150, unsubscribed: 23, conversion: 89, openRate: 30.0, clickRate: 6.0 },
    { id: 'EML003', name: 'Q2 Performance Report', status: 'scheduled', scheduledFor: '2026-06-25', sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, conversion: 0, openRate: 0, clickRate: 0 },
  ];
  emailCampaigns.forEach(e => dataStores.emailCampaigns.set(e.id, e));

  // ===== AUDIENCES =====
  const audiences = [
    { id: 'AUD001', name: 'Enterprise Prospects', type: 'firmographic', size: 5000, criteria: { industry: ['Technology', 'Finance', 'Healthcare'], employees: { min: 500 } }, conversionRate: 2.5 },
    { id: 'AUD002', name: 'SMB Owners', type: 'demographic', size: 25000, criteria: { industry: ['Retail', 'Restaurant', 'Services'], employees: { max: 100 } }, conversionRate: 1.8 },
    { id: 'AUD003', name: 'High Intent Visitors', type: 'behavioral', size: 5000, criteria: { pages: ['/pricing', '/demo'], visits: { min: 3 } }, conversionRate: 5.2 },
    { id: 'AUD004', name: 'Churned Customers', type: 'behavioral', size: 500, criteria: { activity: 'inactive_90d' }, conversionRate: 0.5 },
  ];
  audiences.forEach(a => dataStores.audiences.set(a.id, a));

  // ===== LOYALTY PROGRAMS =====
  const loyaltyPrograms = [
    { id: 'LP001', name: 'RTMN Rewards', type: 'points', status: 'active', members: 15000, pointsIssued: 5000000, pointsRedeemed: 3500000, redemptionRate: 70 },
    { id: 'LP002', name: 'Partner Rewards', type: 'tiered', status: 'active', members: 500, tiers: ['Bronze', 'Silver', 'Gold', 'Platinum'], benefits: ['Discounts', 'Early Access', 'Dedicated Support'] },
  ];
  loyaltyPrograms.forEach(l => dataStores.loyaltyPrograms.set(l.id, l));

  // ===== LOYALTY REWARDS =====
  const loyaltyRewards = [
    { id: 'RWD001', name: '10% Discount', points: 1000, type: 'discount', status: 'active', redemptions: 456 },
    { id: 'RWD002', name: 'Free Training', points: 5000, type: 'service', status: 'active', redemptions: 123 },
    { id: 'RWD003', name: 'VIP Event Access', points: 10000, type: 'experience', status: 'active', redemptions: 45 },
  ];
  loyaltyRewards.forEach(r => dataStores.loyaltyRewards.set(r.id, r));

  // ===== EVENTS =====
  const events = [
    { id: 'EVT001', name: 'Healthcare Summit 2026', type: 'conference', status: 'active', date: '2026-07-15', location: 'Mumbai', capacity: 500, registered: 345, attended: 0 },
    { id: 'EVT002', name: 'Product Demo Day', type: 'webinar', status: 'active', date: '2026-06-28', location: 'Online', capacity: 1000, registered: 567, attended: 0 },
    { id: 'EVT003', name: 'Partner Meet 2026', type: 'meeting', status: 'planning', date: '2026-08-20', location: 'Bangalore', capacity: 100, registered: 45, attended: 0 },
  ];
  events.forEach(e => dataStores.events.set(e.id, e));

  // ===== INFLUENCERS =====
  const influencers = [
    { id: 'INF001', name: 'Tech Review Pro', platform: 'youtube', followers: 500000, niche: 'Technology', engagement: 4.5, cost: 50000, status: 'active' },
    { id: 'INF002', name: 'Business Growth Hub', platform: 'linkedin', followers: 100000, niche: 'Business', engagement: 5.2, cost: 25000, status: 'active' },
    { id: 'INF003', name: 'Startup Founders', platform: 'twitter', followers: 75000, niche: 'Startups', engagement: 6.1, cost: 15000, status: 'active' },
  ];
  influencers.forEach(i => dataStores.influencers.set(i.id, i));

  // ===== INFLUENCER CAMPAIGNS =====
  const influencerCampaigns = [
    { id: 'IC001', name: 'AI Suite Launch', influencerId: 'INF001', status: 'active', budget: 150000, spent: 50000, posts: 3, impressions: 1500000, engagement: 4.8 },
    { id: 'IC002', name: 'Enterprise Awareness', influencerId: 'INF002', status: 'completed', budget: 75000, spent: 75000, posts: 5, impressions: 500000, engagement: 5.5 },
  ];
  influencerCampaigns.forEach(i => dataStores.influencerCampaigns.set(i.id, i));

  // ===== SEO KEYWORDS =====
  const seoKeywords = [
    { id: 'SEO001', keyword: 'CRM software India', position: 3, searchVolume: 12000, difficulty: 78, trend: 'stable' },
    { id: 'SEO002', keyword: 'best sales software', position: 5, searchVolume: 8000, difficulty: 72, trend: 'up' },
    { id: 'SEO003', keyword: 'restaurant POS system', position: 2, searchVolume: 15000, difficulty: 85, trend: 'up' },
    { id: 'SEO004', keyword: 'healthcare management software', position: 4, searchVolume: 5000, difficulty: 68, trend: 'stable' },
    { id: 'SEO005', keyword: 'hotel management system', position: 6, searchVolume: 9000, difficulty: 75, trend: 'down' },
  ];
  seoKeywords.forEach(s => dataStores.seoKeywords.set(s.id, s));

  // ===== BUDGETS =====
  const marketingBudgets = [
    { id: 'BUD001', period: 'Q2-2026', total: 2000000, allocated: 1850000, spent: 1200000, channels: { digital: 800000, events: 300000, content: 200000, partnerships: 150000, other: 50000 } },
    { id: 'BUD002', period: 'Q3-2026', total: 2500000, allocated: 0, spent: 0, channels: { digital: 0, events: 0, content: 0, partnerships: 0, other: 0 } },
  ];
  marketingBudgets.forEach(b => dataStores.marketingBudgets.set(b.id, b));

  // ===== AI MARKETING AGENTS =====
  const aiAgents = [
    { id: 'MAG001', name: 'Content Generation Agent', type: 'content', status: 'active', tasks: 456, accuracy: 92.5 },
    { id: 'MAG002', name: 'Audience Targeting Agent', type: 'targeting', status: 'active', tasks: 789, accuracy: 88.7 },
    { id: 'MAG003', name: 'Campaign Optimizer', type: 'optimization', status: 'active', tasks: 1234, accuracy: 85.2 },
    { id: 'MAG004', name: 'SEO Agent', type: 'seo', status: 'active', tasks: 567, accuracy: 90.1 },
    { id: 'MAG005', name: 'Social Media Agent', type: 'social', status: 'active', tasks: 890, accuracy: 87.6 },
    { id: 'MAG006', name: 'Email Marketing Agent', type: 'email', status: 'active', tasks: 2345, accuracy: 91.4 },
    { id: 'MAG007', name: 'Journey Orchestrator', type: 'journey', status: 'active', tasks: 456, accuracy: 89.3 },
    { id: 'MAG008', name: 'Influencer Matching Agent', type: 'influencer', status: 'active', tasks: 234, accuracy: 86.8 },
    { id: 'MAG009', name: 'Budget Optimizer', type: 'budget', status: 'active', tasks: 345, accuracy: 93.2 },
    { id: 'MAG010', name: 'Attribution Agent', type: 'attribution', status: 'active', tasks: 567, accuracy: 88.9 },
    { id: 'MAG011', name: 'Competitor Analysis Agent', type: 'competitor', status: 'active', tasks: 123, accuracy: 84.5 },
    { id: 'MAG012', name: 'Trend Forecasting Agent', type: 'trends', status: 'active', tasks: 234, accuracy: 87.1 },
    { id: 'MAG013', name: 'A/B Testing Agent', type: 'testing', status: 'active', tasks: 678, accuracy: 91.8 },
    { id: 'MAG014', name: 'Personalization Agent', type: 'personalization', status: 'active', tasks: 1234, accuracy: 89.5 },
    { id: 'MAG015', name: 'ROI Predictor', type: 'roi', status: 'active', tasks: 456, accuracy: 90.7 },
  ];
  aiAgents.forEach(a => dataStores.aiAgents.set(a.id, a));

  // ===== INTEGRATIONS =====
  const integrations = [
    { id: 'INT001', name: 'AdBazaar DSP', type: 'advertising', status: 'connected' },
    { id: 'INT002', name: 'Sales OS', type: 'crm', status: 'connected' },
    { id: 'INT003', name: 'Media OS', type: 'content', status: 'connected' },
    { id: 'INT004', name: 'Google Analytics', type: 'analytics', status: 'connected' },
    { id: 'INT005', name: 'Meta Ads', type: 'advertising', status: 'connected' },
    { id: 'INT006', name: 'LinkedIn Ads', type: 'advertising', status: 'connected' },
    { id: 'INT007', name: 'Mailchimp', type: 'email', status: 'connected' },
    { id: 'INT008', name: 'HubSpot', type: 'crm', status: 'connected' },
  ];
  integrations.forEach(i => dataStores.integrations.set(i.id, i));

  console.log(`[Marketing OS] Initialized: ${campaigns.length} campaigns, ${content.length} content pieces, ${audiences.length} audiences, ${aiAgents.length} AI agents`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Marketing OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    modules: {
      brand: { brands: dataStores.brands.size },
      campaign: { campaigns: dataStores.campaigns.size },
      journey: { journeys: dataStores.journeys.size },
      content: { content: dataStores.content.size },
      social: { accounts: dataStores.socialAccounts.size, posts: dataStores.socialPosts.size },
      messaging: { email: dataStores.emailCampaigns.size, templates: dataStores.templates.size },
      loyalty: { programs: dataStores.loyaltyPrograms.size, rewards: dataStores.loyaltyRewards.size },
      events: { events: dataStores.events.size },
      influencer: { influencers: dataStores.influencers.size, campaigns: dataStores.influencerCampaigns.size },
      seo: { keywords: dataStores.seoKeywords.size },
      budget: { budgets: dataStores.marketingBudgets.size },
      audiences: { audiences: dataStores.audiences.size },
      aiAgents: { total: dataStores.aiAgents.size, active: Array.from(dataStores.aiAgents.values()).filter(a => a.status === 'active').length },
    },
    integrations: Array.from(dataStores.integrations.values()),
  });
});

app.get('/status', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);

  res.json({
    overview: {
      campaigns: campaigns.length,
      content: dataStores.content.size,
      audiences: dataStores.audiences.size,
      socialAccounts: dataStores.socialAccounts.size,
      aiAgents: dataStores.aiAgents.size,
    },
    performance: {
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
      avgCVR: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0,
    },
    budget: {
      total: 4500000,
      spent: 1200000,
      remaining: 3300000,
    },
  });
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const token = generateToken();
  sessions.set(token, { userId: `user-${Date.now()}`, email, role: 'admin' });
  res.json({ success: true, token, expiresIn: 86400 });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.headers['authorization']?.replace('Bearer ', ''));
  res.json({ success: true });
});

// ============================================================
// BRAND OS ENDPOINTS
// ============================================================

app.get('/api/brands', (req, res) => {
  const brands = Array.from(dataStores.brands.values());
  res.json({ success: true, count: brands.length, brands });
});

app.get('/api/brands/:id', (req, res) => {
  const brand = dataStores.brands.get(req.params.id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });
  res.json({ success: true, brand });
});

app.post('/api/brands', requireAuth, (req, res) => {
  const { name, tagline, primaryColor, secondaryColor, website } = req.body;
  const brand = {
    id: `BRAND${String(dataStores.brands.size + 1).padStart(3, '0')}`,
    name,
    tagline,
    primaryColor,
    secondaryColor,
    website,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  dataStores.brands.set(brand.id, brand);
  res.status(201).json({ success: true, brand });
});

// ============================================================
// CAMPAIGN OS ENDPOINTS
// ============================================================

app.get('/api/campaigns', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  res.json({ success: true, count: campaigns.length, campaigns });
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaign = dataStores.campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  res.json({ success: true, campaign });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const { name, type, budget, startDate, endDate, channels } = req.body;
  const campaign = {
    id: `CMP${String(dataStores.campaigns.size + 1).padStart(3, '0')}`,
    name,
    type,
    status: 'planning',
    budget: parseInt(budget) || 0,
    spent: 0,
    startDate,
    endDate,
    channels: channels || [],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cvr: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

app.put('/api/campaigns/:id/status', requireAuth, (req, res) => {
  const campaign = dataStores.campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

  campaign.status = req.body.status;
  dataStores.campaigns.set(campaign.id, campaign);
  res.json({ success: true, campaign });
});

app.get('/api/campaigns/:id/analytics', (req, res) => {
  const campaign = dataStores.campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

  res.json({
    success: true,
    analytics: {
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      ctr: campaign.ctr,
      cvr: campaign.cvr,
      spent: campaign.spent,
      budget: campaign.budget,
      cpm: campaign.impressions > 0 ? ((campaign.spent / campaign.impressions) * 1000).toFixed(2) : 0,
      cpc: campaign.clicks > 0 ? (campaign.spent / campaign.clicks).toFixed(2) : 0,
      cpa: campaign.conversions > 0 ? (campaign.spent / campaign.conversions).toFixed(2) : 0,
    },
  });
});

// ============================================================
// JOURNEY OS ENDPOINTS
// ============================================================

app.get('/api/journeys', (req, res) => {
  const journeys = Array.from(dataStores.journeys.values());
  res.json({ success: true, count: journeys.length, journeys });
});

app.get('/api/journeys/:id', (req, res) => {
  const journey = dataStores.journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });
  res.json({ success: true, journey });
});

app.post('/api/journeys', requireAuth, (req, res) => {
  const { name, type, steps } = req.body;
  const journey = {
    id: `JRN${String(dataStores.journeys.size + 1).padStart(3, '0')}`,
    name,
    type,
    status: 'draft',
    steps: steps || [],
    enrolled: 0,
    completed: 0,
    conversionRate: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.journeys.set(journey.id, journey);
  res.status(201).json({ success: true, journey });
});

// ============================================================
// CONTENT OS ENDPOINTS
// ============================================================

app.get('/api/content', (req, res) => {
  const { type, status } = req.query;
  let content = Array.from(dataStores.content.values());

  if (type) content = content.filter(c => c.type === type);
  if (status) content = content.filter(c => c.status === status);

  res.json({ success: true, count: content.length, content });
});

app.get('/api/content/:id', (req, res) => {
  const content = dataStores.content.get(req.params.id);
  if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
  res.json({ success: true, content });
});

app.post('/api/content', requireAuth, (req, res) => {
  const { title, type, body, author } = req.body;
  const content = {
    id: `CNT${String(dataStores.content.size + 1).padStart(3, '0')}`,
    title,
    type,
    body,
    status: 'draft',
    author: author || req.user.email,
    views: 0,
    shares: 0,
    leads: 0,
    publishedAt: null,
    createdAt: new Date().toISOString(),
  };
  dataStores.content.set(content.id, content);
  res.status(201).json({ success: true, content });
});

// ============================================================
// SOCIAL OS ENDPOINTS
// ============================================================

app.get('/api/social/accounts', (req, res) => {
  const accounts = Array.from(dataStores.socialAccounts.values());
  res.json({ success: true, count: accounts.length, accounts });
});

app.get('/api/social/posts', (req, res) => {
  const { accountId } = req.query;
  let posts = Array.from(dataStores.socialPosts.values());

  if (accountId) posts = posts.filter(p => p.accountId === accountId);

  res.json({ success: true, count: posts.length, posts });
});

app.post('/api/social/posts', requireAuth, (req, res) => {
  const { accountId, content, scheduledFor } = req.body;
  const post = {
    id: `POST${String(dataStores.socialPosts.size + 1).padStart(3, '0')}`,
    accountId,
    content,
    type: 'post',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    scheduledFor: scheduledFor || null,
    publishedAt: scheduledFor ? null : new Date().toISOString(),
    status: scheduledFor ? 'scheduled' : 'published',
  };
  dataStores.socialPosts.set(post.id, post);
  res.status(201).json({ success: true, post });
});

// ============================================================
// MESSAGING OS ENDPOINTS
// ============================================================

app.get('/api/email/campaigns', (req, res) => {
  const campaigns = Array.from(dataStores.emailCampaigns.values());
  res.json({ success: true, count: campaigns.length, campaigns });
});

app.post('/api/email/campaigns', requireAuth, (req, res) => {
  const { name, subject, body, audienceId } = req.body;
  const campaign = {
    id: `EML${String(dataStores.emailCampaigns.size + 1).padStart(3, '0')}`,
    name,
    subject,
    body,
    audienceId,
    status: 'draft',
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    conversion: 0,
    openRate: 0,
    clickRate: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.emailCampaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

// ============================================================
// AUDIENCE / CDP ENDPOINTS
// ============================================================

app.get('/api/audiences', (req, res) => {
  const audiences = Array.from(dataStores.audiences.values());
  res.json({ success: true, count: audiences.length, audiences });
});

app.get('/api/audiences/:id', (req, res) => {
  const audience = dataStores.audiences.get(req.params.id);
  if (!audience) return res.status(404).json({ success: false, error: 'Audience not found' });
  res.json({ success: true, audience });
});

app.post('/api/audiences', requireAuth, (req, res) => {
  const { name, type, size, criteria } = req.body;
  const audience = {
    id: `AUD${String(dataStores.audiences.size + 1).padStart(3, '0')}`,
    name,
    type,
    size: parseInt(size) || 0,
    criteria: criteria || {},
    conversionRate: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.audiences.set(audience.id, audience);
  res.status(201).json({ success: true, audience });
});

// ============================================================
// LOYALTY OS ENDPOINTS
// ============================================================

app.get('/api/loyalty/programs', (req, res) => {
  const programs = Array.from(dataStores.loyaltyPrograms.values());
  res.json({ success: true, count: programs.length, programs });
});

app.get('/api/loyalty/rewards', (req, res) => {
  const rewards = Array.from(dataStores.loyaltyRewards.values());
  res.json({ success: true, count: rewards.length, rewards });
});

// ============================================================
// EVENTS ENDPOINTS
// ============================================================

app.get('/api/events', (req, res) => {
  const { status } = req.query;
  let events = Array.from(dataStores.events.values());

  if (status) events = events.filter(e => e.status === status);

  res.json({ success: true, count: events.length, events });
});

app.get('/api/events/:id', (req, res) => {
  const event = dataStores.events.get(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
  res.json({ success: true, event });
});

app.post('/api/events', requireAuth, (req, res) => {
  const { name, type, date, location, capacity } = req.body;
  const event = {
    id: `EVT${String(dataStores.events.size + 1).padStart(3, '0')}`,
    name,
    type,
    status: 'planning',
    date,
    location,
    capacity: parseInt(capacity) || 100,
    registered: 0,
    attended: 0,
    createdAt: new Date().toISOString(),
  };
  dataStores.events.set(event.id, event);
  res.status(201).json({ success: true, event });
});

// ============================================================
// INFLUENCER OS ENDPOINTS
// ============================================================

app.get('/api/influencers', (req, res) => {
  const influencers = Array.from(dataStores.influencers.values());
  res.json({ success: true, count: influencers.length, influencers });
});

app.get('/api/influencers/campaigns', (req, res) => {
  const campaigns = Array.from(dataStores.influencerCampaigns.values());
  res.json({ success: true, count: campaigns.length, campaigns });
});

// ============================================================
// SEO OS ENDPOINTS
// ============================================================

app.get('/api/seo/keywords', (req, res) => {
  const keywords = Array.from(dataStores.seoKeywords.values());
  res.json({ success: true, count: keywords.length, keywords });
});

// ============================================================
// BUDGET OS ENDPOINTS
// ============================================================

app.get('/api/budgets', (req, res) => {
  const budgets = Array.from(dataStores.marketingBudgets.values());
  res.json({ success: true, count: budgets.length, budgets });
});

app.get('/api/budgets/:period', (req, res) => {
  const budget = Array.from(dataStores.marketingBudgets.values()).find(b => b.period === req.params.period);
  if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });
  res.json({ success: true, budget });
});

// ============================================================
// AI MARKETING AGENTS ENDPOINTS
// ============================================================

app.get('/api/ai-agents', (req, res) => {
  const agents = Array.from(dataStores.aiAgents.values());
  res.json({ success: true, count: agents.length, agents });
});

app.post('/api/ai-agents/:id/generate', requireAuth, (req, res) => {
  const agent = dataStores.aiAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const { prompt, type } = req.body;
  const result = {
    id: `RES${Date.now()}`,
    agentId: agent.id,
    agentName: agent.name,
    prompt,
    result: `AI-generated ${type || 'content'} based on your input`,
    confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
    generatedAt: new Date().toISOString(),
  };

  res.json({ success: true, result });
});

// ============================================================
// ANALYTICS ENDPOINTS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  const content = Array.from(dataStores.content.values());

  res.json({
    success: true,
    overview: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalContent: content.length,
      publishedContent: content.filter(c => c.status === 'published').length,
      totalReach: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
    },
  });
});

app.get('/api/analytics/performance', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  const channels = {};

  campaigns.forEach(c => {
    c.channels.forEach(channel => {
      if (!channels[channel]) {
        channels[channel] = { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
      }
      channels[channel].impressions += c.impressions;
      channels[channel].clicks += c.clicks;
      channels[channel].conversions += c.conversions;
      channels[channel].spend += c.spent;
    });
  });

  Object.keys(channels).forEach(channel => {
    const ch = channels[channel];
    ch.ctr = ch.impressions > 0 ? ((ch.clicks / ch.impressions) * 100).toFixed(2) : 0;
    ch.cvr = ch.clicks > 0 ? ((ch.conversions / ch.clicks) * 100).toFixed(2) : 0;
  });

  res.json({ success: true, channels });
});

// ============================================================
// INTEGRATIONS ENDPOINTS
// ============================================================

app.get('/api/integrations', (req, res) => {
  const integrations = Array.from(dataStores.integrations.values());
  res.json({ success: true, count: integrations.length, integrations });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Marketing OS Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// START
// ============================================================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MARKETING OS v1.0.0                                      ║
║              The Autonomous Marketing Department                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                                   ║
║  Status: Running                                                              ║
║                                                                             ║
║  13 OPERATING SYSTEMS: Brand | Campaign | Journey | Content | Social | SEO   ║
║  Messaging | Loyalty | Events | Influencer | Analytics | Budget             ║
║                                                                             ║
║  15 AI MARKETING AGENTS: Content | Targeting | Optimization | SEO | Social  ║
║  Email | Journey | Influencer | Budget | Attribution | Competitor | Trends   ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
