import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4752;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';

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
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

// Authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-internal-token'] as string;
  if (token !== INTERNAL_TOKEN && process.env.NODE_ENV === 'production') {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'hojai-lead-service', timestamp: new Date().toISOString() });
});

// Import routes
import scoreRouter from './routes/score.js';
import enrichRouter from './routes/enrich.js';
import prospectsRouter from './routes/prospects.js';

// API Routes
app.use('/score', authMiddleware, scoreRouter);
app.use('/enrich', authMiddleware, enrichRouter);
app.use('/prospects', authMiddleware, prospectsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'HOJAI Lead Service',
    version: '1.0.0',
    description: 'Lead scoring, enrichment, and prospect data',
    endpoints: {
      health: '/health',
      score: 'POST /score',
      enrich: 'POST /enrich',
      prospects: 'GET /prospects?limit='
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  HOJAI Lead Service                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                                ║
║  Status:   Running                                              ║
║  Version:  1.0.0                                                ║
║                                                               ║
║  Endpoints:                                                    ║
║  ├── GET  /health                                              ║
║  ├── POST /score                                               ║
║  ├── POST /enrich                                              ║
║  └── GET  /prospects?limit=                                    ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
