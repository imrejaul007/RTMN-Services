import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import chatRoutes from './routes/chat';
import assistantRoutes from './routes/assistant';
import templatesRoutes from './routes/templates';

const app: Express = express();
const PORT = process.env.PORT || 4765;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'leverge-copilot', timestamp: new Date().toISOString() }));
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/assistant', authMiddleware, assistantRoutes);
app.use('/api/templates', authMiddleware, templatesRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leverge_copilot')
  .then(() => app.listen(PORT, () => logger.info(`Leverge Copilot running on port ${PORT}`)))
  .catch((err) => { logger.error('Failed to start:', err); process.exit(1); });

export default app;
