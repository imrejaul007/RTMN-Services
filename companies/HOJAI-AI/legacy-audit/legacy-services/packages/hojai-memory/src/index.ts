import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import memoryRoutes from './routes/memory.js';
import memoryTierRoutes from './routes/memoryTierRoutes.js';
import profileRoutes from './routes/profile.js';
import conversationRoutes from './routes/conversation.js';

const PORT = process.env.PORT || 4520;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-memory';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-memory', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongoStatus, timestamp: new Date().toISOString() });
});

app.use('/api/memories', memoryRoutes);
app.use('/api/memories', memoryTierRoutes); // Memory tier routes
app.use('/api/timeline', memoryRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/conversations', conversationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

async function startServer() {
  console.log('[Hojai Memory] Starting server...');
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected to', MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`[Hojai Memory] Server running on port ${PORT}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('[Hojai Memory] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

startServer().catch(console.error);

export default app;
