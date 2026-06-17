import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import memoryRoutes from './routes/memory';
import vectorRoutes from './routes/vectors';
import contextRoutes from './routes/context';

const app: Express = express();
const PORT = process.env.PORT || 4762;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'leverge-memory', timestamp: new Date().toISOString() }));
app.use('/api/memory', authMiddleware, memoryRoutes);
app.use('/api/vectors', authMiddleware, vectorRoutes);
app.use('/api/context', authMiddleware, contextRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leverge_memory')
  .then(() => app.listen(PORT, () => logger.info(`Leverge Memory running on port ${PORT}`)))
  .catch((err) => { logger.error('Failed to start:', err); process.exit(1); });

export default app;
