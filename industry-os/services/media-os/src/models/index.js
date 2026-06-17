/**
 * Media OS - MongoDB Connection & Model Registry
 * Initializes database connection and exports all models
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/database');

// Model imports
const Viewer = require('./Viewer');
const Creator = require('./Creator');
const Content = require('./Content');
const Campaign = require('./Campaign');
const Channel = require('./Channel');
const Program = require('./Program');
const Episode = require('./Episode');
const Advertiser = require('./Advertiser');
const Subscription = require('./Subscription');
const Booking = require('./Booking');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const License = require('./License');
const Studio = require('./Studio');
const Equipment = require('./Equipment');
const Crew = require('./Crew');
const Comment = require('./Comment');
const Follower = require('./Follower');
const AuditLog = require('./AuditLog');
const EditorialCalendar = require('./EditorialCalendar');
const Script = require('./Script');
const Metadata = require('./Metadata');
const { Production, CallSheet, DailyReport } = require('./Production');
const ProgramGrid = require('./ProgramGrid');
const EPGEntry = require('./EPG');
const Stream = require('./Streaming');
const ViewerProfile = require('./ViewerProfile');
const Royalty = require('./Royalty');
const Sponsorship = require('./Sponsorship');
const PPVTransaction = require('./PPV');
const { Revenue } = require('./Revenue');
const { CreatorStudio, CreatorAnalytics } = require('./CreatorStudio');
const BrandDeal = require('./BrandDeal');
const { Post, Community } = require('./Community');
const Plan = require('./Subscription');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const options = {
      ...config.MONGODB_OPTIONS,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    await mongoose.connect(config.MONGODB_URI, options);

    logger.info('MongoDB connected successfully', {
      host: config.MONGODB_URI.split('@')[1] || 'localhost',
      database: 'media-os',
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('MongoDB disconnect error', { error: error.message });
    throw error;
  }
}

/**
 * Seed initial data for development
 */
async function seedData() {
  const isSeeded = await mongoose.connection.db.collection('channels').countDocuments();
  if (isSeeded > 0) {
    logger.info('Database already seeded, skipping...');
    return;
  }

  logger.info('Seeding initial data...');

  // Seed channels
  const channels = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ];

  await Channel.insertMany(channels);
  logger.info(`Seeded ${channels.length} channels`);

  // Seed advertisers
  const advertisers = [
    {
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
    },
    {
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
    },
  ];

  await Advertiser.insertMany(advertisers);
  logger.info(`Seeded ${advertisers.length} advertisers`);

  // Seed sample content
  const contentDocs = [
    {
      title: 'Dhoom 4 - The Action Spectacular',
      type: 'movie',
      language: 'Hindi',
      duration: 162,
      releaseDate: new Date('2024-06-15'),
      genres: ['Action', 'Thriller'],
      rating: 'UA',
      cast: ['Superstar A', 'Actress B'],
      director: 'Director X',
      producer: 'Yash Raj Films',
      synopsis: 'High-octane action thriller',
      thumbnail: 'https://cdn.rtmn.in/content/dhoom4.jpg',
      videoUrl: 'https://cdn.rtmn.in/streaming/dhoom4.m3u8',
      subtitles: ['English', 'Hindi'],
      licenseType: 'exclusive',
      licenseFrom: new Date('2024-06-15'),
      licenseTo: new Date('2025-06-15'),
      price: 199,
      status: 'published',
    },
    {
      title: "India's Got Talent - Season 5",
      type: 'reality_show',
      language: 'Hindi',
      genres: ['Reality', 'Talent'],
      judges: ['Judge A', 'Judge B', 'Judge C'],
      host: 'Popular Host',
      productionHouse: 'Endemol Shine',
      synopsis: 'Search for Indias hidden talent',
      thumbnail: 'https://cdn.rtmn.in/content/igt5.jpg',
      status: 'ongoing',
    },
    {
      title: 'Tech Talk with Trivia',
      type: 'podcast',
      language: 'English',
      genres: ['Technology', 'Interview'],
      host: 'Tech Enthusiast',
      description: 'Weekly tech news and gadget reviews',
      thumbnail: 'https://cdn.rtmn.in/content/techtalk.jpg',
      platforms: ['Spotify', 'Apple Podcasts', 'YouTube'],
      sponsors: ['TechGear', 'CloudService'],
      status: 'ongoing',
    },
  ];

  await Content.insertMany(contentDocs);
  logger.info(`Seeded ${contentDocs.length} content items`);

  // Seed creators
  const creators = [
    {
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
    },
    {
      name: 'Fitness with Preethi',
      type: 'fitness_instructor',
      platform: 'Instagram',
      followers: 2800000,
      avgLikes: 85000,
      engagementRate: 3.0,
      email: 'preethi@fitnesswithpreethi.in',
      phone: '+91 98765 43211',
      paymentRate: 75000,
      revenueShare: 0.40,
      status: 'active',
    },
  ];

  await Creator.insertMany(creators);
  logger.info(`Seeded ${creators.length} creators`);

  logger.info('Initial data seeding completed');
}

// Export models and connection functions
module.exports = {
  mongoose,
  connectDB,
  disconnectDB,
  seedData,
  // Core Models
  Viewer,
  Creator,
  Content,
  Campaign,
  Channel,
  Program,
  Episode,
  Advertiser,
  Subscription,
  Booking,
  Invoice,
  Payment,
  License,
  Studio,
  Equipment,
  Crew,
  Comment,
  Follower,
  AuditLog,
  // Content & Production
  EditorialCalendar,
  Script,
  Metadata,
  Production,
  CallSheet,
  DailyReport,
  // Broadcasting & Streaming
  ProgramGrid,
  EPGEntry,
  Stream,
  ViewerProfile,
  // Rights & Monetization
  Royalty,
  Sponsorship,
  PPVTransaction,
  Revenue,
  // Audience & Creator
  CreatorStudio,
  CreatorAnalytics,
  BrandDeal,
  Post,
  Community,
  Plan,
};
