/**
 * HOJAI Identity Service
 * Port: 4610
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4610', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Identity {
  id: string;
  type: 'user' | 'agent' | 'service' | 'device';
  name: string;
  email?: string;
  verified: boolean;
  trustScore: number;
  createdAt: Date;
}

const identities = new Map<string, Identity>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-identity', version: '1.0.0', uptime: process.uptime() });
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

// Create identity
app.post('/api/identities', (req: Request, res: Response) => {
  const { type, name, email } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'type and name are required' });

  const identity: Identity = {
    id: uuidv4(),
    type,
    name,
    email,
    verified: false,
    trustScore: 50,
    createdAt: new Date(),
  };

  identities.set(identity.id, identity);
  res.status(201).json({ success: true, identity });
});

// Get identity
app.get('/api/identities/:id', (req: Request, res: Response) => {
  const identity = identities.get(req.params.id);
  if (!identity) return res.status(404).json({ error: 'Identity not found' });
  res.json(identity);
});

// Verify identity
app.post('/api/identities/:id/verify', (req: Request, res: Response) => {
  const identity = identities.get(req.params.id);
  if (!identity) return res.status(404).json({ error: 'Identity not found' });

  identity.verified = true;
  identity.trustScore = 80;
  identities.set(identity.id, identity);

  res.json({ success: true, identity });
});

// Update trust score
app.post('/api/identities/:id/trust', (req: Request, res: Response) => {
  const identity = identities.get(req.params.id);
  if (!identity) return res.status(404).json({ error: 'Identity not found' });

  const { score } = req.body;
  if (score !== undefined) {
    identity.trustScore = Math.max(0, Math.min(100, score));
    identities.set(identity.id, identity);
  }

  res.json({ success: true, identity });
});

app.listen(PORT, () => {
  console.log(`\n🔐 HOJAI Identity Service (${PORT})\n`);
});

export default app;