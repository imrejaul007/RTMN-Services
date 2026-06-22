import express from 'express';
import mongoose from 'mongoose';
import bnplRoutes from './routes/bnpl';
import {
  scheduleEMIReminders,
  processOverdueAccounts,
  updateCreditScores
} from './workers/bnpl-worker';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3080;

// Middleware
app.use(express.json());

// Routes
app.use('/api/bnpl', bnplRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rez-bnpl-service' });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const isProduction = process.env.NODE_ENV === 'production';

if (!MONGODB_URI) {
  if (isProduction) {
    logger.error('MONGODB_URI environment variable is required in production');
    process.exit(1);
  }
  logger.warn('MONGODB_URI not set, using localhost (development only)');
}

mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/rez_bnpl')
  .then(() => {
    logger.info('Connected to MongoDB');

    // Schedule daily jobs
    setInterval(processOverdueAccounts, 24 * 60 * 60 * 1000); // Daily
    scheduleEMIReminders();
    updateCreditScores();

    app.listen(PORT, () => {
      logger.info(`BNPL Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
