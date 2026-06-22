/**
 * GENIE Browser History Service - Simplified
 * Port: 4715
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4715', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

interface BrowserVisit {
  id: string;
  userId: string;
  url: string;
  domain: string;
  title: string;
  category: string;
  timeSpent: number;
  timestamp: Date;
}

const visits = new Map<string, BrowserVisit[]>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'genie-browser-history', version: '1.0.0', uptime: process.uptime() });
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

// Add visits
app.post('/api/visits', (req: Request, res: Response) => {
  const { userId, visits: newVisits } = req.body;

  if (!userId || !Array.isArray(newVisits)) {
    return res.status(400).json({ error: 'userId and visits array required' });
  }

  const userVisits = visits.get(userId) || [];

  for (const v of newVisits) {
    const domain = new URL(v.url).hostname.replace('www.', '');
    userVisits.push({
      id: uuidv4(),
      userId,
      url: v.url,
      domain,
      title: v.title || '',
      category: categorize(domain),
      timeSpent: v.timeSpent || 0,
      timestamp: new Date(),
    });
  }

  visits.set(userId, userVisits);
  res.status(201).json({ success: true, count: newVisits.length });
});

// Get visits
app.get('/api/visits/:userId', (req: Request, res: Response) => {
  const userVisits = visits.get(req.params.userId) || [];
  res.json({ count: userVisits.length, visits: userVisits });
});

// Get patterns
app.get('/api/patterns/:userId', (req: Request, res: Response) => {
  const userVisits = visits.get(req.params.userId) || [];

  const patterns = {
    totalVisits: userVisits.length,
    topDomains: getTopItems(userVisits, 'domain'),
    topCategories: getTopItems(userVisits, 'category'),
    totalTimeSpent: userVisits.reduce((sum, v) => sum + v.timeSpent, 0),
  };

  res.json({ userId: req.params.userId, patterns });
});

function categorize(domain: string): string {
  const cats: Record<string, string[]> = {
    shopping: ['amazon', 'flipkart', 'myntra'],
    social: ['facebook', 'twitter', 'instagram', 'linkedin'],
    video: ['youtube', 'netflix'],
    news: ['news', 'bbc', 'cnn'],
    tech: ['github', 'stackoverflow'],
  };
  for (const [cat, domains] of Object.entries(cats)) {
    if (domains.some(d => domain.includes(d))) return cat;
  }
  return 'other';
}

function getTopItems(arr: BrowserVisit[], key: keyof BrowserVisit): { item: string; count: number }[] {
  const counts: Record<string, number> = {};
  arr.forEach(v => { counts[String(v[key])] = (counts[String(v[key])] || 0) + 1; });
  return Object.entries(counts)
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

app.listen(PORT, () => {
  console.log(`\n🌐 GENIE Browser History Service (${PORT})\n`);
});

export default app;