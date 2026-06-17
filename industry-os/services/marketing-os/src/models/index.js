/**
 * Marketing OS - Models Index
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

// Models
const Brand = require('./Brand');
const Campaign = require('./Campaign');
const Journey = require('./Journey');
const MarketingTwin = require('./MarketingTwin');
const Lead = require('./Lead');
const Audience = require('./Audience');
const MarketingContent = require('./Content');

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
      database: 'marketing-os',
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
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
 * Seed initial data
 */
async function seedData() {
  if (config.NODE_ENV !== 'development') return;

  logger.info('Seeding initial data...');

  // Sample brands
  const brands = [
    {
      name: 'StayOwn Hotels',
      displayName: 'StayOwn',
      tagline: 'Your Home Away From Home',
      industry: 'Hospitality',
      organizationId: 'org_stayown',
      colors: [
        { name: 'Primary', hex: '#2563EB', usage: ['buttons', 'headers'] },
        { name: 'Secondary', hex: '#10B981', usage: ['accents'] },
      ],
      typography: [
        { name: 'Headings', family: 'Poppins', weights: ['600', '700'], usage: 'Headlines' },
      ],
    },
  ];

  await Brand.insertMany(brands);
  logger.info(`Seeded ${brands.length} brands`);

  logger.info('Initial data seeding completed');
}

module.exports = {
  mongoose,
  connectDB,
  disconnectDB,
  seedData,
  Brand,
  Campaign,
  Journey,
  MarketingTwin,
  Lead,
  Audience,
  MarketingContent,
};
