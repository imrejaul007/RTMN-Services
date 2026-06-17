/**
 * Media OS - AI Company Platform
 *
 * Complete Media & Entertainment Management System
 * Port: 5600
 * Industry: Media (Broadcasting, Streaming, Publishing, Agencies)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5600;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const INDUSTRY = 'media';

// ============================================
// IN-MEMORY DATABASE
// ============================================

const channels = new Map();
const programs = new Map();
const episodes = new Map();
const advertisers = new Map();
const campaigns = new Map();
const bookings = new Map();
const playlists = new Map();
const schedules = new Map();
const viewers = new Map();
const content = new Map();
const creators = new Map();
const podcasts = new Map();
const articles = new Map();
const videos = new Map();
const invoices = new Map();
const payments = new Map();
const analytics = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// ============================================
// SAMPLE DATA - MEDIA CHANNELS & PROGRAMS
// ============================================

// Initialize sample channels
const sampleChannels = [
  {
    id: 'CH001',
    name: 'NewsNow 24/7',
    type: 'news',
    category: 'News & Current Affairs',
    language: 'English',
    region: 'National',
    logo: 'https://cdn.rtmn.in/channels/newsnow.png',
    tagline: 'Breaking News, Anytime',
    targetAudience: 'Adults 25-54',
    subscriptionType: 'free',
    adSupported: true,
    hdAvailable: true,
    reach: 45000000,
    avgViewers: 1250000,
    trp: 3.2,
    createdAt: '2022-01-15T10:00:00Z'
  },
  {
    id: 'CH002',
    name: 'MovieMax HD',
    type: 'movie',
    category: 'Entertainment',
    language: 'Hindi',
    region: 'National',
    logo: 'https://cdn.rtmn.in/channels/moviemax.png',
    tagline: 'Bollywood ke Dumasia',
    targetAudience: 'Adults 18-45',
    subscriptionType: 'premium',
    adSupported: false,
    hdAvailable: true,
    reach: 28000000,
    avgViewers: 890000,
    trp: 2.4,
    createdAt: '2021-06-20T10:00:00Z'
  },
  {
    id: 'CH003',
    name: 'SportsX Live',
    type: 'sports',
    category: 'Sports',
    language: 'English',
    region: 'National',
    logo: 'https://cdn.rtmn.in/channels/sportsx.png',
    tagline: 'Every Game, Every Moment',
    targetAudience: 'Males 18-45',
    subscriptionType: 'premium',
    adSupported: true,
    hdAvailable: true,
    reach: 35000000,
    avgViewers: 2100000,
    trp: 5.8,
    createdAt: '2020-03-10T10:00:00Z'
  },
  {
    id: 'CH004',
    name: 'KidsZone TV',
    type: 'kids',
    category: 'Kids',
    language: 'English',
    region: 'National',
    logo: 'https://cdn.rtmn.in/channels/kidszone.png',
    tagline: 'Fun Learning for Kids',
    targetAudience: 'Kids 4-14',
    subscriptionType: 'freemium',
    adSupported: true,
    hdAvailable: true,
    reach: 22000000,
    avgViewers: 1500000,
    trp: 4.1,
    createdAt: '2021-09-01T10:00:00Z'
  },
  {
    id: 'CH005',
    name: 'MusicRadio India',
    type: 'music',
    category: 'Music',
    language: 'Hindi',
    region: 'National',
    logo: 'https://cdn.rtmn.in/channels/musicradio.png',
    tagline: 'India ka Music Radio',
    targetAudience: 'Youth 15-35',
    subscriptionType: 'free',
    adSupported: true,
    hdAvailable: false,
    reach: 55000000,
    avgViewers: 3200000,
    trp: 2.1,
    createdAt: '2019-05-15T10:00:00Z'
  }
];
sampleChannels.forEach(ch => channels.set(ch.id, ch));

// Initialize sample programs
const samplePrograms = [
  {
    id: 'PRG001',
    name: 'Morning Prime',
    channelId: 'CH001',
    type: 'news_show',
    genre: 'Morning Show',
    language: 'English',
    duration: 180,
    frequency: 'daily',
    slot: '06:00-09:00',
    targetRating: 2.5,
    currentRating: 2.8,
    sponsors: ['Pepsi', 'Samsung'],
    status: 'active',
    hosts: ['Anchors'],
    createdAt: '2022-01-20T10:00:00Z'
  },
  {
    id: 'PRG002',
    name: 'Cricket Masters',
    channelId: 'CH003',
    type: 'sports_show',
    genre: 'Cricket Analysis',
    language: 'Hindi',
    duration: 120,
    frequency: 'weekly',
    slot: 'Sat 20:00',
    targetRating: 4.5,
    currentRating: 5.2,
    sponsors: ['Star Sports', 'BCCI'],
    status: 'active',
    hosts: ['Expert Panel'],
    createdAt: '2022-06-15T10:00:00Z'
  },
  {
    id: 'PRG003',
    name: 'Kids Kartoon Hour',
    channelId: 'CH004',
    type: 'cartoon',
    genre: 'Animation',
    language: 'English',
    duration: 60,
    frequency: 'daily',
    slot: '17:00-18:00',
    targetRating: 3.5,
    currentRating: 4.2,
    sponsors: ['Mamamoo', 'Cadbury'],
    status: 'active',
    hosts: [],
    createdAt: '2021-09-10T10:00:00Z'
  }
];
samplePrograms.forEach(prg => programs.set(prg.id, prg));

// Initialize sample advertisers
const sampleAdvertisers = [
  {
    id: 'ADV001',
    name: 'PepsiCo India',
    industry: 'FMCG',
    contactPerson: 'Rahul Sharma',
    email: 'rahul.sharma@pepsico.in',
    phone: '+91 11 4567 8900',
    address: 'DLF Cyber City, Gurugram',
    gstin: '06AAACP1234A1ZB',
    creditLimit: 50000000,
    outstandingBalance: 8500000,
    paymentTerms: 30,
    status: 'active',
    campaigns: 12,
    totalSpent: 45000000,
    avatar: '🥤',
    createdAt: '2021-03-15T10:00:00Z'
  },
  {
    id: 'ADV002',
    name: 'Samsung India Electronics',
    industry: 'Electronics',
    contactPerson: 'Priya Patel',
    email: 'priya.patel@samsung.in',
    phone: '+91 80 4567 8901',
    address: 'Manyata Tech Park, Bangalore',
    gstin: '29AAACS1234A1ZY',
    creditLimit: 100000000,
    outstandingBalance: 12500000,
    paymentTerms: 45,
    status: 'active',
    campaigns: 24,
    totalSpent: 120000000,
    avatar: '📱',
    createdAt: '2020-01-10T10:00:00Z'
  }
];
sampleAdvertisers.forEach(adv => advertisers.set(adv.id, adv));

// Initialize sample campaigns
const sampleCampaigns = [
  {
    id: 'CMP001',
    advertiserId: 'ADV001',
    name: 'Pepsi Summer Splash 2024',
    objective: 'brand_awareness',
    status: 'active',
    startDate: '2024-04-01',
    endDate: '2024-05-31',
    budget: 15000000,
    spent: 8750000,
    impressions: 45000000,
    clicks: 225000,
    conversions: 15000,
    cpm: 194,
    ctr: 0.5,
    channels: ['CH001', 'CH002', 'CH005'],
    targeting: { age: '18-35', gender: 'all', location: 'tier1' },
    creatives: ['Banner_v1.jpg', 'Video_30s.mp4'],
    createdAt: '2024-03-25T10:00:00Z'
  },
  {
    id: 'CMP002',
    advertiserId: 'ADV002',
    name: 'Samsung Galaxy S25 Launch',
    objective: 'product_launch',
    status: 'active',
    startDate: '2024-05-01',
    endDate: '2024-06-30',
    budget: 25000000,
    spent: 5200000,
    impressions: 28000000,
    clicks: 560000,
    conversions: 28000,
    cpm: 186,
    ctr: 2.0,
    channels: ['CH001', 'CH003'],
    targeting: { age: '25-45', gender: 'all', location: 'tier1,tier2' },
    creatives: ['Product_reveal.mp4', 'Feature_specs.jpg'],
    createdAt: '2024-04-20T10:00:00Z'
  }
];
sampleCampaigns.forEach(cmp => campaigns.set(cmp.id, cmp));

// Initialize sample content
const sampleContent = [
  {
    id: 'CNT001',
    title: 'Dhoom 4 - The Action Spectacular',
    type: 'movie',
    language: 'Hindi',
    duration: 162,
    releaseDate: '2024-06-15',
    genre: ['Action', 'Thriller'],
    rating: 'UA',
    cast: ['Superstar A', 'Actress B'],
    director: 'Director X',
    producer: 'Yash Raj Films',
    synopsis: 'High-octane action thriller',
    thumbnail: 'https://cdn.rtmn.in/content/dhoom4.jpg',
    videoUrl: 'https://cdn.rtmn.in/streaming/dhoom4.m3u8',
    subtitles: ['English', 'Hindi'],
    audioTracks: ['Hindi 5.1', 'Tamil 5.1'],
    licenseType: 'exclusive',
    licenseFrom: '2024-06-15',
    licenseTo: '2025-06-15',
    price: 199,
    views: 0,
    avgWatchTime: 0,
    completionRate: 0,
    status: 'scheduled',
    createdAt: '2024-05-01T10:00:00Z'
  },
  {
    id: 'CNT002',
    title: 'Indias Got Talent - Season 5',
    type: 'reality_show',
    language: 'Hindi',
    episodes: 24,
    currentEpisode: 12,
    genre: ['Reality', 'Talent'],
    judges: ['Judge A', 'Judge B', 'Judge C'],
    host: 'Popular Host',
    productionHouse: 'Endemol Shine',
    synopsis: 'Search for Indias hidden talent',
    thumbnail: 'https://cdn.rtmn.in/content/igt5.jpg',
    viewsPerEpisode: 2500000,
    avgWatchTime: 45,
    completionRate: 72,
    status: 'ongoing',
    createdAt: '2024-02-01T10:00:00Z'
  },
  {
    id: 'CNT003',
    title: 'Tech Talk with Trivia',
    type: 'podcast',
    language: 'English',
    episodeCount: 48,
    currentEpisode: 45,
    genre: ['Technology', 'Interview'],
    host: 'Tech Enthusiast',
    description: 'Weekly tech news and gadget reviews',
    thumbnail: 'https://cdn.rtmn.in/content/techtalk.jpg',
    avgListeners: 85000,
    platforms: ['Spotify', 'Apple Podcasts', 'YouTube'],
    sponsors: ['TechGear', 'CloudService'],
    status: 'ongoing',
    createdAt: '2023-01-15T10:00:00Z'
  }
];
sampleContent.forEach(cnt => content.set(cnt.id, cnt));

// Initialize sample creators
const sampleCreators = [
  {
    id: 'CRE001',
    name: 'Chef Kitchen Secrets',
    type: 'food_vlogger',
    platform: 'YouTube',
    subscribers: 5500000,
    totalViews: 450000000,
    avgViewsPerVideo: 1200000,
    engagementRate: 4.5,
    email: 'chef@kitchensecrets.in',
    phone: '+91 98765 43210',
    manager: 'Influencer Management Agency',
    paymentRate: 150000,
    revenueShare: 0.45,
    status: 'active',
    videos: 380,
    lastVideoViews: 1500000,
    avatar: '👨‍🍳',
    createdAt: '2020-05-20T10:00:00Z'
  },
  {
    id: 'CRE002',
    name: 'Fitness with Preethi',
    type: 'fitness_instructor',
    platform: 'Instagram',
    followers: 2800000,
    avgLikes: 85000,
    engagementRate: 3.0,
    email: 'preethi@fitnesswithpreethi.in',
    phone: '+91 98765 43211',
    manager: null,
    paymentRate: 75000,
    revenueShare: 0.40,
    status: 'active',
    posts: 1250,
    lastPostLikes: 92000,
    avatar: '💪',
    createdAt: '2021-02-15T10:00:00Z'
  }
];
sampleCreators.forEach(cre => creators.set(cre.id, cre));

// Initialize sample viewers
const sampleViewers = [
  {
    id: 'VWR001',
    name: 'Arjun Mehta',
    email: 'arjun.m@email.com',
    phone: '+91 98765 11111',
    age: 28,
    gender: 'male',
    location: 'Mumbai',
    tier: 'premium',
    subscriptionPlan: 'Annual Pack',
    subscriptionExpiry: '2025-06-15',
    watchHistory: ['CNT001', 'CNT002'],
    watchTime: 45.5,
    favoriteChannels: ['CH001', 'CH003'],
    device: 'Smart TV',
    lastActive: '2024-06-16T22:30:00Z',
    createdAt: '2023-06-15T10:00:00Z'
  },
  {
    id: 'VWR002',
    name: 'Sneha Reddy',
    email: 'sneha.r@email.com',
    phone: '+91 98765 22222',
    age: 24,
    gender: 'female',
    location: 'Hyderabad',
    tier: 'free',
    subscriptionPlan: null,
    watchHistory: ['CNT003'],
    watchTime: 12.5,
    favoriteChannels: ['CH004', 'CH005'],
    device: 'Mobile',
    lastActive: '2024-06-17T14:00:00Z',
    createdAt: '2024-02-20T10:00:00Z'
  }
];
sampleViewers.forEach(vwr => viewers.set(vwr.id, vwr));

// ============================================
// AUTHENTICATION
// ============================================

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'producer',
    name: businessName || email.split('@')[0],
    industry: INDUSTRY,
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// CHANNEL MANAGEMENT
// ============================================

app.get('/api/channels', requireAuth, (req, res) => {
  const { type, language, subscriptionType } = req.query;
  let result = Array.from(channels.values());
  if (type) result = result.filter(c => c.type === type);
  if (language) result = result.filter(c => c.language === language);
  if (subscriptionType) result = result.filter(c => c.subscriptionType === subscriptionType);
  res.json({ success: true, count: result.length, channels: result });
});

app.get('/api/channels/:id', requireAuth, (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const channelPrograms = Array.from(programs.values()).filter(p => p.channelId === channel.id);
  res.json({ success: true, channel, programs: channelPrograms });
});

app.post('/api/channels', requireAuth, (req, res) => {
  const channel = {
    id: 'CH' + String(channels.size + 1).padStart(3, '0'),
    ...req.body,
    reach: 0, avgViewers: 0, trp: 0,
    createdAt: new Date().toISOString()
  };
  channels.set(channel.id, channel);
  res.status(201).json({ success: true, channel });
});

app.patch('/api/channels/:id', requireAuth, (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const updated = { ...channel, ...req.body };
  channels.set(channel.id, updated);
  res.json({ success: true, channel: updated });
});

// ============================================
// PROGRAM MANAGEMENT
// ============================================

app.get('/api/programs', requireAuth, (req, res) => {
  const { channelId, type, status } = req.query;
  let result = Array.from(programs.values());
  if (channelId) result = result.filter(p => p.channelId === channelId);
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, programs: result });
});

app.get('/api/programs/:id', requireAuth, (req, res) => {
  const program = programs.get(req.params.id);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  res.json({ success: true, program });
});

app.post('/api/programs', requireAuth, (req, res) => {
  const program = {
    id: 'PRG' + String(programs.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'planned',
    createdAt: new Date().toISOString()
  };
  programs.set(program.id, program);
  res.status(201).json({ success: true, program });
});

app.patch('/api/programs/:id', requireAuth, (req, res) => {
  const program = programs.get(req.params.id);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const updated = { ...program, ...req.body };
  programs.set(program.id, updated);
  res.json({ success: true, program: updated });
});

// ============================================
// CONTENT MANAGEMENT
// ============================================

app.get('/api/content', requireAuth, (req, res) => {
  const { type, language, genre, status } = req.query;
  let result = Array.from(content.values());
  if (type) result = result.filter(c => c.type === type);
  if (language) result = result.filter(c => c.language === language);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, content: result });
});

app.get('/api/content/:id', requireAuth, (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  res.json({ success: true, content: item });
});

app.post('/api/content', requireAuth, (req, res) => {
  const item = {
    id: 'CNT' + Date.now(),
    ...req.body,
    views: 0, avgWatchTime: 0, completionRate: 0,
    status: req.body.status || 'draft',
    createdAt: new Date().toISOString()
  };
  content.set(item.id, item);
  res.status(201).json({ success: true, content: item });
});

app.patch('/api/content/:id', requireAuth, (req, res) => {
  const item = content.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Content not found' });
  const updated = { ...item, ...req.body };
  content.set(item.id, updated);
  res.json({ success: true, content: updated });
});

// ============================================
// ADVERTISER MANAGEMENT
// ============================================

app.get('/api/advertisers', requireAuth, (req, res) => {
  const { industry, status } = req.query;
  let result = Array.from(advertisers.values());
  if (industry) result = result.filter(a => a.industry === industry);
  if (status) result = result.filter(a => a.status === status);
  res.json({ success: true, count: result.length, advertisers: result });
});

app.get('/api/advertisers/:id', requireAuth, (req, res) => {
  const advertiser = advertisers.get(req.params.id);
  if (!advertiser) return res.status(404).json({ error: 'Advertiser not found' });
  const advertiserCampaigns = Array.from(campaigns.values()).filter(c => c.advertiserId === advertiser.id);
  res.json({ success: true, advertiser, campaigns: advertiserCampaigns });
});

app.post('/api/advertisers', requireAuth, (req, res) => {
  const advertiser = {
    id: 'ADV' + String(advertisers.size + 1).padStart(3, '0'),
    ...req.body,
    outstandingBalance: 0, campaigns: 0, totalSpent: 0,
    createdAt: new Date().toISOString()
  };
  advertisers.set(advertiser.id, advertiser);
  res.status(201).json({ success: true, advertiser });
});

app.patch('/api/advertisers/:id', requireAuth, (req, res) => {
  const advertiser = advertisers.get(req.params.id);
  if (!advertiser) return res.status(404).json({ error: 'Advertiser not found' });
  const updated = { ...advertiser, ...req.body };
  advertisers.set(advertiser.id, updated);
  res.json({ success: true, advertiser: updated });
});

// ============================================
// CAMPAIGN MANAGEMENT
// ============================================

app.get('/api/campaigns', requireAuth, (req, res) => {
  const { advertiserId, status, objective } = req.query;
  let result = Array.from(campaigns.values());
  if (advertiserId) result = result.filter(c => c.advertiserId === advertiserId);
  if (status) result = result.filter(c => c.status === status);
  if (objective) result = result.filter(c => c.objective === objective);
  res.json({ success: true, count: result.length, campaigns: result });
});

app.get('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const advertiser = advertisers.get(campaign.advertiserId);
  res.json({ success: true, campaign, advertiser });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const campaign = {
    id: 'CMP' + Date.now(),
    ...req.body,
    status: 'draft',
    spent: 0, impressions: 0, clicks: 0, conversions: 0,
    createdAt: new Date().toISOString()
  };
  campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

app.patch('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const updated = { ...campaign, ...req.body };
  campaigns.set(campaign.id, updated);
  res.json({ success: true, campaign: updated });
});

// ============================================
// AD BOOKING MANAGEMENT
// ============================================

app.get('/api/bookings', requireAuth, (req, res) => {
  const { campaignId, channelId, status } = req.query;
  let result = Array.from(bookings.values());
  if (campaignId) result = result.filter(b => b.campaignId === campaignId);
  if (channelId) result = result.filter(b => b.channelId === channelId);
  if (status) result = result.filter(b => b.status === status);
  res.json({ success: true, count: result.length, bookings: result });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { campaignId, channelId, slot, dates, rate, duration } = req.body;
  const booking = {
    id: 'BKG' + Date.now(),
    campaignId, channelId, slot, dates,
    duration: duration || 30,
    rate: rate || 5000,
    totalCost: (rate || 5000) * (duration || 30) * dates.length,
    status: 'confirmed',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  bookings.set(booking.id, booking);
  res.status(201).json({ success: true, booking });
});

app.patch('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const updated = { ...booking, ...req.body };
  bookings.set(booking.id, updated);
  res.json({ success: true, booking: updated });
});

// ============================================
// CREATOR MANAGEMENT
// ============================================

app.get('/api/creators', requireAuth, (req, res) => {
  const { type, platform, status } = req.query;
  let result = Array.from(creators.values());
  if (type) result = result.filter(c => c.type === type);
  if (platform) result = result.filter(c => c.platform === platform);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, creators: result });
});

app.get('/api/creators/:id', requireAuth, (req, res) => {
  const creator = creators.get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  res.json({ success: true, creator });
});

app.post('/api/creators', requireAuth, (req, res) => {
  const creator = {
    id: 'CRE' + String(creators.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  creators.set(creator.id, creator);
  res.status(201).json({ success: true, creator });
});

app.patch('/api/creators/:id', requireAuth, (req, res) => {
  const creator = creators.get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  const updated = { ...creator, ...req.body };
  creators.set(creator.id, updated);
  res.json({ success: true, creator: updated });
});

// ============================================
// VIEWER/SUBSCRIBER MANAGEMENT
// ============================================

app.get('/api/viewers', requireAuth, (req, res) => {
  const { tier, location } = req.query;
  let result = Array.from(viewers.values());
  if (tier) result = result.filter(v => v.tier === tier);
  if (location) result = result.filter(v => v.location === location);
  res.json({ success: true, count: result.length, viewers: result });
});

app.get('/api/viewers/:id', requireAuth, (req, res) => {
  const viewer = viewers.get(req.params.id);
  if (!viewer) return res.status(404).json({ error: 'Viewer not found' });
  res.json({ success: true, viewer });
});

app.post('/api/viewers', requireAuth, (req, res) => {
  const viewer = {
    id: 'VWR' + Date.now(),
    ...req.body,
    tier: req.body.tier || 'free',
    watchTime: 0,
    createdAt: new Date().toISOString()
  };
  viewers.set(viewer.id, viewer);
  res.status(201).json({ success: true, viewer });
});

app.patch('/api/viewers/:id', requireAuth, (req, res) => {
  const viewer = viewers.get(req.params.id);
  if (!viewer) return res.status(404).json({ error: 'Viewer not found' });
  const updated = { ...viewer, ...req.body };
  viewers.set(viewer.id, updated);
  res.json({ success: true, viewer: updated });
});

// ============================================
// BILLING & INVOICING
// ============================================

app.get('/api/invoices', requireAuth, (req, res) => {
  const { advertiserId, status } = req.query;
  let result = Array.from(invoices.values());
  if (advertiserId) result = result.filter(i => i.advertiserId === advertiserId);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { advertiserId, campaignId, amount, description, dueDate } = req.body;
  const invoice = {
    id: 'INV' + String(invoices.size + 1).padStart(4, '0'),
    invoiceNumber: `MED/2024/${String(invoices.size + 1).padStart(4, '0')}`,
    advertiserId, campaignId, amount,
    tax: Math.round(amount * 0.18),
    total: Math.round(amount * 1.18),
    description: description || 'Advertising services',
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

app.patch('/api/invoices/:id/status', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  invoice.status = req.body.status;
  invoices.set(invoice.id, invoice);
  res.json({ success: true, invoice });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const campaignList = Array.from(campaigns.values());
  const totalAdSpend = campaignList.filter(c => c.status === 'active').reduce((sum, c) => sum + c.spent, 0);
  const totalImpressions = campaignList.filter(c => c.status === 'active').reduce((sum, c) => sum + c.impressions, 0);

  res.json({
    success: true,
    overview: {
      totalChannels: channels.size,
      activeChannels: channels.size,
      totalPrograms: programs.size,
      totalContent: content.size,
      activeCampaigns: campaignList.filter(c => c.status === 'active').length,
      totalAdSpend,
      totalImpressions,
      avgCTR: campaignList.length > 0 ? campaignList.reduce((sum, c) => sum + c.ctr, 0) / campaignList.length : 0,
      totalAdvertisers: advertisers.size,
      premiumSubscribers: viewers.size,
      totalCreators: creators.size
    }
  });
});

app.get('/api/analytics/channels', requireAuth, (req, res) => {
  const channelList = Array.from(channels.values());
  const channelPerformance = channelList.map(ch => {
    const channelCampaigns = Array.from(campaigns.values()).filter(c => c.channels && c.channels.includes(ch.id));
    return {
      channelId: ch.id,
      name: ch.name,
      type: ch.type,
      trp: ch.trp,
      reach: ch.reach,
      avgViewers: ch.avgViewers,
      adRevenue: channelCampaigns.reduce((sum, c) => sum + c.spent, 0)
    };
  });
  res.json({ success: true, channels: channelPerformance });
});

app.get('/api/analytics/campaigns', requireAuth, (req, res) => {
  const campaignList = Array.from(campaigns.values());
  res.json({
    success: true,
    campaigns: campaignList.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      budget: c.budget,
      spent: c.spent,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
      cpm: c.cpm
    }))
  });
});

// ============================================
// RTMN LAYER INTEGRATIONS
// ============================================

app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({ layer: 1, name: 'Intelligence', capabilities: ['Content Recommendation AI', 'Audience Prediction', 'Trend Analysis'], status: 'available' });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({ layer: 2, name: 'Customer Growth', capabilities: ['Subscriber Acquisition', 'Churn Prediction', 'CRM'], status: 'available' });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({ layer: 3, name: 'Commerce', capabilities: ['Ad Sales', 'Content Licensing', 'PPV'], status: 'available' });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({ layer: 4, name: 'Finance', capabilities: ['Ad Billing', 'Subscriber Billing', 'Revenue Split'], status: 'available' });
});

app.get('/api/layers', requireAuth, async (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Media OS', layers: 15, version: '2.0.0' });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Media OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Media & Entertainment',
    timestamp: new Date().toISOString(),
    stats: {
      channels: channels.size,
      programs: programs.size,
      content: content.size,
      advertisers: advertisers.size,
      campaigns: campaigns.size,
      creators: creators.size,
      viewers: viewers.size
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  MEDIA OS v2.0.0                     ║
║          Complete Media & Entertainment System        ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║                                                          ║
║  Features:                                             ║
║  • Channel Management (TV, Streaming)                  ║
║  • Program & Content Management                        ║
║  • Ad Management & Campaigns                           ║
║  • Creator & Influencer Management                     ║
║  • Viewer/Subscriber Management                        ║
║  • Billing & Invoicing                                 ║
║  • Analytics & Performance Reports                     ║
║                                                          ║
║  RTMN Integrations:                                   ║
║  • Memory OS (4703) - Viewer Preferences              ║
║  • TwinOS (4705) - Content Twins                     ║
║  • SUTAR OS (4140) - Audience Prediction             ║
║  • Event Bus (4510) - Live Events                    ║
╚══════════════════════════════════════════════════════════╝
  `);
});
