/**
 * Marketing OS - Models Index
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

const Brand = require('./Brand');
const Campaign = require('./Campaign');
const Journey = require('./Journey');
const MarketingTwin = require('./MarketingTwin');
const Lead = require('./Lead');
const Audience = require('./Audience');

async function connectDB() {
  try {
    const dbConfig = config.DATABASE || config;
    const uri = dbConfig.uri || dbConfig.MONGODB_URI || 'mongodb://localhost:27017/marketing-os';
    await mongoose.connect(uri);
    logger.info('MongoDB connected', { database: 'marketing-os' });
    mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
}

async function disconnectDB() {
  try { await mongoose.disconnect(); logger.info('MongoDB disconnected'); } catch (error) { throw error; }
}

async function seedData() {
  if (config.NODE_ENV !== 'development') return;
  try {
    const existingBrands = await Brand.countDocuments();
    if (existingBrands > 0) {
      logger.info(`Skipping seed - ${existingBrands} brands already exist`);
      return;
    }
    logger.info('Seeding initial data...');
    const brands = [{ name: 'StayOwn Hotels', displayName: 'StayOwn', tagline: 'Your Home Away From Home', industry: 'Hospitality', organizationId: 'org_stayown', colors: [{ name: 'Primary', hex: '#2563EB', usage: ['buttons'] }] }];
    await Brand.insertMany(brands);
    logger.info(`Seeded ${brands.length} brands`);
  } catch (error) {
    logger.warn('Seed skipped or partial', { error: error.message });
  }
}

module.exports = { mongoose, connectDB, disconnectDB, seedData, Brand, Campaign, Journey, MarketingTwin, Lead, Audience };
