/**
 * REZ Viral Loop - Entry Point
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4076', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'rez-viral-loop' });
});

// Get viral loops
app.get('/api/loops', async (_req, res) => {
  res.json({ success: true, data: [] });
});

app.listen(PORT, () => {
  logger.info(`[${new Date().toISOString()}] Viral Loop running on port ${PORT}`);
});

export default app;
