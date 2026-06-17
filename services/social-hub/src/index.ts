import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Routes
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import webhookRoutes from './routes/webhooks';

// Models (for mongoose connection check)
import './models/Channel';
import './models/SocialMessage';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4893;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'social-hub',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'social-hub',
    description: 'Social Media Hub Service - Unified inbox for Instagram, Telegram, Facebook, Twitter',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      channels: '/api/channels',
      messages: '/api/messages',
      webhooks: '/api/webhooks'
    }
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-hub';

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Continue running without database for development
    console.log('Running in standalone mode without database');
  }
};

// Start server
const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Social Hub Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Webhooks: http://localhost:${PORT}/api/webhooks`);
  });
};

startServer().catch(console.error);

export default app;