import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import campaignsRouter from './routes/campaigns';
import contentRouter from './routes/content';
import audienceRouter from './routes/audience';
import optimizeRouter from './routes/optimize';
import insightsRouter from './routes/insights';

// Import services for initialization
import './services/contentGenerator';
import './services/segmentation';
import './services/optimization';
import './services/insights';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4929;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthcheck = {
    status: 'healthy',
    service: 'marketing-copilot',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    routes: {
      campaigns: '/api/marketing/campaigns',
      content: '/api/marketing/content',
      audience: '/api/marketing/audience',
      optimize: '/api/marketing/optimize',
      insights: '/api/marketing/insights'
    }
  };
  res.json(healthcheck);
});

// Readiness endpoint
app.get('/ready', (req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 1;
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/marketing/campaigns', campaignsRouter);
app.use('/api/marketing/content', contentRouter);
app.use('/api/marketing/audience', audienceRouter);
app.use('/api/marketing/optimize', optimizeRouter);
app.use('/api/marketing/insights', insightsRouter);

// API info endpoint
app.get('/api/marketing', (req: Request, res: Response) => {
  res.json({
    service: 'Marketing Copilot',
    version: '1.0.0',
    description: 'AI-powered marketing assistant for content generation, audience segmentation, and campaign optimization',
    endpoints: {
      campaigns: {
        'GET /api/marketing/campaigns': 'List all campaigns',
        'GET /api/marketing/campaigns/suggestions': 'Get campaign suggestions',
        'GET /api/marketing/campaigns/:id': 'Get campaign by ID',
        'POST /api/marketing/campaigns': 'Create new campaign',
        'PUT /api/marketing/campaigns/:id': 'Update campaign',
        'DELETE /api/marketing/campaigns/:id': 'Delete campaign',
        'POST /api/marketing/campaigns/:id/generate-content': 'Generate content for campaign',
        'POST /api/marketing/campaigns/:id/start': 'Start campaign',
        'POST /api/marketing/campaigns/:id/pause': 'Pause campaign'
      },
      content: {
        'GET /api/marketing/content': 'List all content',
        'GET /api/marketing/content/:id': 'Get content by ID',
        'POST /api/marketing/content/generate': 'Generate content using AI',
        'POST /api/marketing/content': 'Create new content',
        'PUT /api/marketing/content/:id': 'Update content',
        'DELETE /api/marketing/content/:id': 'Delete content',
        'POST /api/marketing/content/:id/publish': 'Publish content',
        'POST /api/marketing/content/:id/variations': 'Generate content variations'
      },
      audience: {
        'GET /api/marketing/audience/segment': 'Get audience segments',
        'GET /api/marketing/audience/segment/:id': 'Get specific segment',
        'GET /api/marketing/audience/segment/:id/growth': 'Get segment growth prediction',
        'POST /api/marketing/audience/analyze': 'Analyze audience',
        'GET /api/marketing/audience/insights': 'Get audience insights',
        'GET /api/marketing/audience/distribution': 'Get segment distribution',
        'GET /api/marketing/audience/engagement': 'Get engagement metrics'
      },
      optimize: {
        'GET /api/marketing/optimize/:campaignId': 'Get optimization recommendations',
        'GET /api/marketing/optimize/:campaignId/predictions': 'Get ROI predictions',
        'GET /api/marketing/optimize/:campaignId/ab-tests': 'Get A/B test recommendations',
        'GET /api/marketing/optimize/:campaignId/budget': 'Get budget recommendations',
        'GET /api/marketing/optimize/:campaignId/score': 'Get campaign score',
        'GET /api/marketing/optimize/:campaignId/recommendations': 'Get recommendations',
        'POST /api/marketing/optimize/:campaignId/apply': 'Apply recommendations'
      },
      insights: {
        'GET /api/marketing/insights': 'Get comprehensive insights',
        'GET /api/marketing/insights/overview': 'Get overview metrics',
        'GET /api/marketing/insights/top-performers': 'Get top performers',
        'GET /api/marketing/insights/trends': 'Get marketing trends',
        'GET /api/marketing/insights/opportunities': 'Get opportunities',
        'GET /api/marketing/insights/warnings': 'Get warnings',
        'GET /api/marketing/insights/channels': 'Get channel performance',
        'GET /api/marketing/insights/competitor': 'Get competitor insights',
        'GET /api/marketing/insights/seasonality': 'Get seasonality analysis',
        'GET /api/marketing/insights/summary': 'Get executive summary'
      }
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection
const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketing-copilot';

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Running in demo mode without database');
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   Marketing Copilot Service                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                          ║
║  Status:      Running                                         ║
║  Version:     1.0.0                                           ║
║                                                              ║
║  Endpoints:                                                  ║
║  - Health:    http://localhost:${PORT}/health                    ║
║  - API Info:  http://localhost:${PORT}/api/marketing            ║
║                                                              ║
║  Routes:                                                     ║
║  - Campaigns: /api/marketing/campaigns                       ║
║  - Content:   /api/marketing/content                          ║
║  - Audience:  /api/marketing/audience                         ║
║  - Optimize:  /api/marketing/optimize                         ║
║  - Insights:  /api/marketing/insights                        ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch(console.error);
