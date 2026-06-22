/**
 * HOJAI Industry Intelligence
 * Port: 4700
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4700', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface IndustryPattern {
  id: string;
  industry: string;
  type: string;
  pattern: any;
  confidence: number;
  createdAt: Date;
}

const patterns = new Map<string, IndustryPattern>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-industry', version: '1.0.0', uptime: process.uptime() });
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

// Get industries
app.get('/api/industries', (req: Request, res: Response) => {
  res.json({
    industries: [
      { id: 'retail', name: 'Retail' },
      { id: 'healthcare', name: 'Healthcare' },
      { id: 'finance', name: 'Finance' },
      { id: 'education', name: 'Education' },
      { id: 'hospitality', name: 'Hospitality' },
      { id: 'manufacturing', name: 'Manufacturing' },
    ],
  });
});

// Get patterns
app.get('/api/patterns', (req: Request, res: Response) => {
  const { industry, type } = req.query;
  let list = Array.from(patterns.values());

  if (industry) list = list.filter(p => p.industry === industry);
  if (type) list = list.filter(p => p.type === type);

  res.json({ count: list.length, patterns: list });
});

// Add pattern
app.post('/api/patterns', (req: Request, res: Response) => {
  const { industry, type, pattern, confidence } = req.body;
  if (!industry || !type) return res.status(400).json({ error: 'industry and type are required' });

  const p: IndustryPattern = {
    id: uuidv4(),
    industry,
    type,
    pattern: pattern || {},
    confidence: confidence || 0.5,
    createdAt: new Date(),
  };

  patterns.set(p.id, p);
  res.status(201).json({ success: true, pattern: p });
});

// Get benchmark
app.get('/api/benchmarks/:industry', (req: Request, res: Response) => {
  const industryPatterns = Array.from(patterns.values()).filter(p => p.industry === req.params.industry);

  res.json({
    industry: req.params.industry,
    patternCount: industryPatterns.length,
    avgConfidence: industryPatterns.length > 0
      ? industryPatterns.reduce((sum, p) => sum + p.confidence, 0) / industryPatterns.length
      : 0,
  });
});

app.listen(PORT, () => {
  console.log(`\n🏭 HOJAI Industry Intelligence (${PORT})\n`);
});

export default app;