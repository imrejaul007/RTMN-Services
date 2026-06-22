import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

import { botRoutes, templateRoutes, conversationRoutes } from './routes';
import { templateService } from './services';

const app = express();
const PORT = process.env.PORT || 4850;

// ============ MIDDLEWARE ============

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Compression & Logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-studio',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ready',
      mongodb: mongoStatus
    });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Service unavailable' });
  }
});

// ============ ROUTES ============

app.use('/api/bots', botRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/conversations', conversationRoutes);

// ============ API ROUTES ============

// Node types
app.get('/api/node-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { type: 'trigger', name: 'Trigger', description: 'Starts the conversation', icon: '⚡' },
      { type: 'message', name: 'Message', description: 'Send a text or media message', icon: '💬' },
      { type: 'quick_reply', name: 'Quick Reply', description: 'Message with quick reply options', icon: '🔘' },
      { type: 'button', name: 'Button', description: 'Interactive buttons', icon: '🔳' },
      { type: 'ai_response', name: 'AI Response', description: 'AI-powered response', icon: '🤖' },
      { type: 'condition', name: 'Condition', description: 'Branch based on conditions', icon: '🔀' },
      { type: 'action', name: 'Action', description: 'Perform an action', icon: '⚙️' },
      { type: 'webhook', name: 'Webhook', description: 'Call external API', icon: '🌐' },
      { type: 'delay', name: 'Delay', description: 'Wait before next step', icon: '⏱️' },
      { type: 'handoff', name: 'Handoff', description: 'Transfer to human agent', icon: '👤' },
      { type: 'end', name: 'End', description: 'End the conversation', icon: '🏁' }
    ]
  });
});

// Industries
app.get('/api/industries', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'banking', name: 'Banking & Finance', icon: '🏦' },
      { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
      { id: 'restaurant', name: 'Restaurant & Food', icon: '🍽️' },
      { id: 'retail', name: 'Retail & E-commerce', icon: '🛒' },
      { id: 'travel', name: 'Travel & Hospitality', icon: '✈️' },
      { id: 'hr', name: 'Human Resources', icon: '👥' },
      { id: 'ecommerce', name: 'E-commerce', icon: '📦' },
      { id: 'general', name: 'General', icon: '📱' }
    ]
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'welcome', name: 'Welcome & Onboarding', icon: '👋' },
      { id: 'onboarding', name: 'User Onboarding', icon: '🚀' },
      { id: 'support', name: 'Customer Support', icon: '💬' },
      { id: 'marketing', name: 'Marketing & Campaigns', icon: '📢' },
      { id: 'order', name: 'Order & Shipping', icon: '📦' },
      { id: 'appointment', name: 'Appointments', icon: '📅' },
      { id: 'feedback', name: 'Feedback & Survey', icon: '⭐' },
      { id: 'notification', name: 'Notifications', icon: '🔔' },
      { id: 'custom', name: 'Custom', icon: '🛠️' }
    ]
  });
});

// Action types
app.get('/api/action-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { type: 'send_email', name: 'Send Email', icon: '📧' },
      { type: 'send_sms', name: 'Send SMS', icon: '📱' },
      { type: 'send_push', name: 'Send Push Notification', icon: '🔔' },
      { type: 'update_variable', name: 'Update Variable', icon: '📝' },
      { type: 'increment_counter', name: 'Increment Counter', icon: '➕' },
      { type: 'add_tag', name: 'Add Tag', icon: '🏷️' },
      { type: 'remove_tag', name: 'Remove Tag', icon: '❌' },
      { type: 'add_to_list', name: 'Add to List', icon: '📋' },
      { type: 'create_ticket', name: 'Create Support Ticket', icon: '🎫' },
      { type: 'send_webhook', name: 'Send Webhook', icon: '🌐' },
      { type: 'create_order', name: 'Create Order', icon: '🛍️' },
      { type: 'reserve_appointment', name: 'Reserve Appointment', icon: '📅' },
      { type: 'ai_memory_store', name: 'Store in AI Memory', icon: '🧠' },
      { type: 'ai_memory_recall', name: 'Recall from AI Memory', icon: '💭' }
    ]
  });
});

// ============ ERROR HANDLING ============

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ============ DATABASE & SERVER ============

async function startServer() {
  try {
    // MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_studio';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Redis
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      const redis = createClient({ url: REDIS_URL });
      await redis.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache');
    }

    // Seed default templates
    await templateService.seedDefaultTemplates();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║              HOJAI STUDIO - Visual Conversation Builder    ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                          ║
║  Health:   http://localhost:${PORT}/health                    ║
║  API:      http://localhost:${PORT}/api                       ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

export default app;
