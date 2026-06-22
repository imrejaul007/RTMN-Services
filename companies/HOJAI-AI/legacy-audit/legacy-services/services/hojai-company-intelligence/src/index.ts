/**
 * HOJAI BrandPulse - Brand Intelligence & Monitoring
 * Port: 4770
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4770', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Brand {
  id: string;
  name: string;
  industry: string;
  competitors: string[];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  mentions: number;
  lastUpdated: Date;
}

interface Mention {
  id: string;
  brandId: string;
  source: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
}

interface CrisisAlert {
  id: string;
  brandId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
}

const brands = new Map<string, Brand>();
const mentions = new Map<string, Mention>();
const alerts = new Map<string, CrisisAlert>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-brandpulse', version: '1.0.0', uptime: process.uptime() });
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

// Brand Management
app.get('/api/brand/:name', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  res.json(brand);
});

app.post('/api/brand', (req: Request, res: Response) => {
  const { name, industry, competitors } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const brand: Brand = {
    id: uuidv4(),
    name,
    industry: industry || 'general',
    competitors: competitors || [],
    sentiment: { positive: 0, negative: 0, neutral: 0 },
    mentions: 0,
    lastUpdated: new Date(),
  };

  brands.set(brand.id, brand);
  res.status(201).json({ success: true, brand });
});

app.get('/api/companies', (req: Request, res: Response) => {
  const list = Array.from(brands.values());
  res.json({ count: list.length, companies: list });
});

// Sentiment Analysis
app.get('/api/brand/:name/sentiment', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const total = brand.sentiment.positive + brand.sentiment.negative + brand.sentiment.neutral;
  const sentimentScore = total > 0
    ? ((brand.sentiment.positive - brand.sentiment.negative) / total) * 100
    : 0;

  res.json({
    brand: brand.name,
    sentiment: brand.sentiment,
    sentimentScore: Math.round(sentimentScore),
    totalMentions: total,
  });
});

// Mentions
app.get('/api/brand/:name/mentions', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const brandMentions = Array.from(mentions.values())
    .filter(m => m.brandId === brand.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({ count: brandMentions.length, mentions: brandMentions });
});

app.post('/api/mentions', (req: Request, res: Response) => {
  const { brandId, source, content, sentiment } = req.body;

  if (!brandId || !content) {
    return res.status(400).json({ error: 'brandId and content are required' });
  }

  const mention: Mention = {
    id: uuidv4(),
    brandId,
    source: source || 'unknown',
    content,
    sentiment: sentiment || 'neutral',
    timestamp: new Date(),
  };

  mentions.set(mention.id, mention);

  // Update brand sentiment
  const brand = brands.get(brandId);
  if (brand) {
    if (mention.sentiment === 'positive') brand.sentiment.positive++;
    else if (mention.sentiment === 'negative') brand.sentiment.negative++;
    else brand.sentiment.neutral++;
    brand.mentions++;
    brand.lastUpdated = new Date();
    brands.set(brand.id, brand);
  }

  res.status(201).json({ success: true, mention });
});

// Crisis Detection
app.get('/api/crisis/:name/status', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const brandAlerts = Array.from(alerts.values())
    .filter(a => a.brandId === brand.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const criticalAlerts = brandAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  res.json({
    brand: brand.name,
    crisisLevel: criticalAlerts.length > 0 ? 'active' : 'normal',
    activeAlerts: criticalAlerts.length,
    alerts: brandAlerts.slice(0, 10),
  });
});

app.post('/api/alerts', (req: Request, res: Response) => {
  const { brandId, severity, message } = req.body;

  if (!brandId || !message) {
    return res.status(400).json({ error: 'brandId and message are required' });
  }

  const alert: CrisisAlert = {
    id: uuidv4(),
    brandId,
    severity: severity || 'medium',
    message,
    createdAt: new Date(),
  };

  alerts.set(alert.id, alert);
  res.status(201).json({ success: true, alert });
});

// Reputation Score
app.get('/api/reputation/:name/score', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const total = brand.sentiment.positive + brand.sentiment.negative + brand.sentiment.neutral;
  const reputationScore = total > 0
    ? ((brand.sentiment.positive / total) * 100)
    : 50;

  res.json({
    brand: brand.name,
    reputationScore: Math.round(reputationScore),
    totalMentions: total,
    breakdown: brand.sentiment,
  });
});

// Trends
app.get('/api/brand/:name/trends', (req: Request, res: Response) => {
  const brand = Array.from(brands.values()).find(b =>
    b.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  // Simulated trends
  res.json({
    brand: brand.name,
    trends: {
      sentiment: { change: '+5%', direction: 'up' },
      mentions: { change: '+12%', direction: 'up' },
      reach: { change: '-2%', direction: 'down' },
    },
    period: '7d',
  });
});

// Statistics
app.get('/api/stats', (req: Request, res: Response) => {
  const totalMentions = Array.from(mentions.values()).length;
  const totalAlerts = alerts.size;
  const activeCrises = Array.from(alerts.values())
    .filter(a => a.severity === 'critical' || a.severity === 'high').length;

  res.json({
    totalBrands: brands.size,
    totalMentions,
    totalAlerts,
    activeCrises,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📊 HOJAI BrandPulse (${PORT})                        ║
║   Brand Intelligence & Monitoring                      ║
║                                                       ║
║   Endpoints:                                        ║
║   GET  /api/brand/:name                             ║
║   GET  /api/brand/:name/sentiment                    ║
║   GET  /api/brand/:name/mentions                     ║
║   GET  /api/crisis/:name/status                      ║
║   GET  /api/reputation/:name/score                   ║
║   POST /api/mentions                                 ║
║   POST /api/alerts                                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;