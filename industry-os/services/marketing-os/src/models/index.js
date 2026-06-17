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

module.exports = {
  mongoose,
  connectDB,
  disconnectDB,
  Brand,
  Campaign,
  Journey,
  MarketingTwin,
};
