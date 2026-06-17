import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4595;
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
  res.json({ status: 'ok', service: 'hojai-web-intelligence', timestamp: new Date().toISOString() });
});

// Import routes
import signalsRouter from './routes/signals.js';
import trendsRouter from './routes/trends.js';
import competitorsRouter from './routes/competitors.js';

// API Routes
app.use('/signals', authMiddleware, signalsRouter);
app.use('/trends', authMiddleware, trendsRouter);
app.use('/competitors', authMiddleware, competitorsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'HOJAI Web Intelligence',
    version: '1.0.0',
    description: 'Market signals, competitor analysis, web intelligence',
    endpoints: {
      health: '/health',
      signals: '/signals/search?q=&limit=',
      trends: '/trends?industry=',
      competitors: '/competitors?company='
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
║                HOJAI Web Intelligence Service                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                                ║
║  Status:   Running                                              ║
║  Version:  1.0.0                                                ║
║                                                               ║
║  Endpoints:                                                    ║
║  ├── GET  /health                                              ║
║  ├── GET  /signals/search?q=&limit=                            ║
║  ├── GET  /trends?industry=                                    ║
║  └── GET  /competitors?company=                                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
