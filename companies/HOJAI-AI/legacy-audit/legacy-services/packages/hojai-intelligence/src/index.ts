import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import predictRoutes from './routes/predict.js';
import recommendRoutes from './routes/recommend.js';
import decisionRoutes from './routes/decision.js';

const PORT = process.env.PORT || 4530;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-intelligence';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

app.use((req: any, res: Response, next: NextFunction) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-intelligence', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongoStatus, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/predict', predictRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/decide', decisionRoutes);

// Error handler
app.use((err: Error, req: any, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

async function startServer() {
  console.log('[Hojai Intelligence] Starting server...');
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected to', MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`[Hojai Intelligence] Server running on port ${PORT}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('[Hojai Intelligence] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

startServer().catch(console.error);

export default app;
