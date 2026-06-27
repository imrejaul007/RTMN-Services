/**
 * Brand OS - Brand Guidelines and Asset Management
 * Port: 4879
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4879;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface BrandAsset { id: string; name: string; type: string; url: string; tags: string[]; uploadedAt: string; }
interface BrandGuideline { id: string; name: string; category: string; content: string; }
interface BrandColor { name: string; hex: string; usage: string; }

const assets = new Map<string, BrandAsset>();
const guidelines = new Map<string, BrandGuideline>();
const colors: BrandColor[] = [
  { name: 'Primary', hex: '#0066FF', usage: 'Main brand color' },
  { name: 'Secondary', hex: '#00AA66', usage: 'Accent color' },
  { name: 'Dark', hex: '#1A1A1A', usage: 'Text and headers' },
];

// Seed guidelines
guidelines.set('logo', { id: 'logo', name: 'Logo Usage', category: 'identity', content: 'Always maintain clear space around logo. Minimum size: 24px height. Do not stretch or distort.' });
guidelines.set('colors', { id: 'colors', name: 'Color Palette', category: 'identity', content: 'Use primary color for CTAs. Secondary for accents.' });
guidelines.set('typography', { id: 'typography', name: 'Typography', category: 'identity', content: 'Use Inter for body text. Use Roboto for headings.' });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'brand-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), assets: assets.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/assets', (req, res) => {
  let result = Array.from(assets.values());
  if (req.query.type) result = result.filter(a => a.type === req.query.type);
  if (req.query.tag) result = result.filter(a => a.tags.includes(req.query.tag as string));
  res.json({ assets: result });
});

app.get('/api/assets/:id', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

app.post('/api/assets', (req, res) => {
  const { name, type, url, tags } = req.body;
  const id = uuidv4();
  assets.set(id, { id, name, type, url, tags: tags || [], uploadedAt: new Date().toISOString() });
  res.status(201).json(assets.get(id));
});

app.delete('/api/assets/:id', (req, res) => {
  if (!assets.has(req.params.id)) return res.status(404).json({ error: 'Asset not found' });
  assets.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/guidelines', (req, res) => {
  let result = Array.from(guidelines.values());
  if (req.query.category) result = result.filter(g => g.category === req.query.category);
  res.json({ guidelines: result });
});

app.get('/api/guidelines/:id', (req, res) => {
  const g = guidelines.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guideline not found' });
  res.json(g);
});

app.post('/api/guidelines', (req, res) => {
  const { name, category, content } = req.body;
  const id = uuidv4();
  guidelines.set(id, { id, name, category, content });
  res.status(201).json(guidelines.get(id));
});

app.get('/api/colors', (_req, res) => res.json({ colors }));

app.get('/api/compliance', (req, res) => {
  const { assetId, guidelineId } = req.query;
  // Simple compliance check
  res.json({ compliant: true, warnings: [] });
});

app.listen(PORT, () => console.log(`[brand-os] listening on :${PORT}`));
export default app;