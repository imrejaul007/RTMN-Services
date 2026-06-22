/**
 * HOJAI specialist ai
 * Port: 4896
 *
 * AI-powered specialist ai for business operations
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const PORT = 4896;
const SERVICE_NAME = 'specialist-ai';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));

// Health endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

// Info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'AI-powered specialist ai for business operations',
    capabilities: {
      task_automation: true,
      ai_assistance: true,
      reporting: true
    }
  });
});

// Main API route
app.post('/api/execute', async (req: Request, res: Response) => {
  try {
    const { task, context } = req.body;

    // TODO: Implement specialist-ai business logic
    const result = {
      task,
      status: 'completed',
      output: `specialist ai processed task: ${task || 'no task provided'}`,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  HOJAI specialist ai
║  Port: 4896
║  Status: RUNNING
╚══════════════════════════════════════════════╝
  `);
});

export default app;
