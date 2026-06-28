import { requireAuth } from '@rtmn/shared/auth';
/**
 * Desktop Agent Runtime Service
 * Port: 4752
 * Desktop automation for Windows applications (SAP, Tally, etc.)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4752', 10);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'desktop-agent', version: '1.0.0', timestamp: new Date().toISOString() }));
app.get('/ready', (_req, res) => res.json({ ready: true, service: 'desktop-agent' }));

app.post('/api/desktop/sessions',requireAuth,  (req: Request, res: Response) => {
  const { employeeId, app } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'employeeId required' } });
  const session = { id: `ds_${Date.now()}`, employeeId, app, status: 'active', startedAt: new Date().toISOString(), actions: [] };
  res.status(201).json({ success: true, data: { sessionId: session.id, session } });
});

app.post('/api/desktop/sessions/:sessionId/actions',requireAuth,  (req: Request, res: Response) => {
  const { type, action, target } = req.body;
  const result = { id: `a_${Date.now()}`, type, action, target, timestamp: new Date().toISOString(), success: true, message: 'Action recorded (desktop automation would execute)' };
  res.json({ success: true, data: result });
});

app.post('/api/desktop/apps/connect',requireAuth,  (req: Request, res: Response) => {
  const { appType, credentials } = req.body;
  res.json({ success: true, data: { appType, connected: true, message: 'Desktop app connected (automation ready)' } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));
app.use(errorHandler);

const server = app.listen(PORT, () => console.log(`Desktop Agent Runtime - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
export default app;
