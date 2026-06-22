import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { marketplaceRoutes } from './routes';
import { agentTemplateService } from './services';

const app = express();
const PORT = process.env.PORT || 4580;

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-agent-marketplace',
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
    res.json({ status: 'ready', mongodb: mongoStatus });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// ============ ROUTES ============

app.use('/api/marketplace', marketplaceRoutes);

// Meta endpoints
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
      { id: 'education', name: 'Education', icon: '🎓' },
      { id: 'real_estate', name: 'Real Estate', icon: '🏠' },
      { id: 'logistics', name: 'Logistics', icon: '🚚' },
      { id: 'telecom', name: 'Telecommunications', icon: '📱' },
      { id: 'insurance', name: 'Insurance', icon: '🛡️' },
      { id: 'government', name: 'Government', icon: '🏛️' },
      { id: 'general', name: 'General', icon: '📱' }
    ]
  });
});

app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'customer_support', name: 'Customer Support', icon: '💬' },
      { id: 'sales', name: 'Sales', icon: '💼' },
      { id: 'marketing', name: 'Marketing', icon: '📢' },
      { id: 'operations', name: 'Operations', icon: '⚙️' },
      { id: 'hr', name: 'Human Resources', icon: '👥' },
      { id: 'finance', name: 'Finance', icon: '💰' },
      { id: 'it', name: 'IT Support', icon: '🖥️' },
      { id: 'compliance', name: 'Compliance', icon: '✅' },
      { id: 'analytics', name: 'Analytics', icon: '📊' },
      { id: 'automation', name: 'Automation', icon: '🤖' },
      { id: 'general', name: 'General', icon: '📱' }
    ]
  });
});

app.get('/api/tiers', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'free', name: 'Free', description: 'Basic features with limited usage' },
      { id: 'starter', name: 'Starter', description: 'For small teams getting started' },
      { id: 'professional', name: 'Professional', description: 'For growing businesses' },
      { id: 'enterprise', name: 'Enterprise', description: 'For large organizations' }
    ]
  });
});

// ============ ERROR HANDLING ============

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============ SERVER ============

async function startServer() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_agent_marketplace';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Seed agent templates
    await agentTemplateService.seedTemplates('hojai', 'Hojai AI');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           HOJAI AGENT MARKETPLACE - AI Agent Library     ║
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

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

export default app;
