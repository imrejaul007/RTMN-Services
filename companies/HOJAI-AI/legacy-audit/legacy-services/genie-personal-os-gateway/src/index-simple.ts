/**
 * GENIE Personal OS Gateway - Simplified
 * Port: 4702
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4702', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'genie-personal-os-gateway', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Gateway info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'genie-personal-os-gateway',
    version: '1.0.0',
    tagline: 'You don\'t use Genie. You talk to Genie.',
    capabilities: ['memory', 'relationships', 'household', 'commerce', 'health'],
  });
});

// Unified query
app.post('/api/query', (req: Request, res: Response) => {
  const { query, context } = req.body;

  res.json({
    success: true,
    response: `Genie processed: ${query}`,
    context: context || 'all',
    timestamp: new Date().toISOString(),
  });
});

// Memory integration
app.post('/api/memory', (req: Request, res: Response) => {
  const { action, data } = req.body;

  res.json({
    success: true,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
});

// Relationships
app.post('/api/relationships', (req: Request, res: Response) => {
  const { action, contact } = req.body;

  res.json({
    success: true,
    action,
    contact,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🧞 GENIE Personal OS Gateway (${PORT})\n`);
});

export default app;