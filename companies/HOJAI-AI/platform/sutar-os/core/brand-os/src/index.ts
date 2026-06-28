import { requireAuth } from '@rtmn/shared/auth';
/**
 * Brand OS - Production Implementation
 * Brand guidelines, assets, compliance checking
 * Port: 4879
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4879;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface BrandAsset { id: string; name: string; type: string; url: string; tags: string[]; uploadedAt: string; uploadedBy: string; size: number; format: string; }
interface BrandGuideline { id: string; name: string; category: string; content: string; version: string; updatedAt: string; }
interface BrandColor { name: string; hex: string; rgb: string; usage: string; }
interface BrandFont { name: string; family: string; weights: string[]; usage: string; }
interface ComplianceCheck { assetId: string; guidelineId: string; passed: boolean; warnings: string[]; timestamp: string; }

const assets = new Map<string, BrandAsset>();
const guidelines = new Map<string, BrandGuideline>();
const colors: BrandColor[] = [
  { name: 'Primary', hex: '#0066FF', rgb: '0, 102, 255', usage: 'Main brand color, CTAs' },
  { name: 'Secondary', hex: '#00AA66', rgb: '0, 170, 102', usage: 'Accent color' },
  { name: 'Dark', hex: '#1A1A1A', rgb: '26, 26, 26', usage: 'Text and headers' },
  { name: 'Light', hex: '#F5F5F5', rgb: '245, 245, 245', usage: 'Backgrounds' },
  { name: 'Accent', hex: '#FF6B35', rgb: '255, 107, 53', usage: 'Highlights' },
];
const fonts: BrandFont[] = [
  { name: 'Inter', family: 'Inter, sans-serif', weights: ['400', '500', '600', '700'], usage: 'Body text' },
  { name: 'Roboto', family: 'Roboto, sans-serif', weights: ['400', '500', '700'], usage: 'Headings' },
];
const complianceChecks: ComplianceCheck[] = [];

const seedGuidelines: BrandGuideline[] = [
  { id: 'logo', name: 'Logo Usage', category: 'identity', content: 'Always maintain clear space around logo. Minimum size: 24px height. Do not stretch or distort.', version: '2.0', updatedAt: new Date().toISOString() },
  { id: 'colors', name: 'Color Palette', category: 'identity', content: 'Use primary for CTAs, secondary for accents. Never use more than 3 colors in a design.', version: '1.5', updatedAt: new Date().toISOString() },
  { id: 'typography', name: 'Typography', category: 'identity', content: 'Use Inter for body (16px), Roboto for headings. Maintain consistent line heights.', version: '1.2', updatedAt: new Date().toISOString() },
  { id: 'voice', name: 'Brand Voice', category: 'tone', content: 'Professional yet approachable. Clear and concise. Never jargon.', version: '1.0', updatedAt: new Date().toISOString() },
  { id: 'imagery', name: 'Imagery Guidelines', category: 'visuals', content: 'Use high-quality photos. Natural lighting preferred. Show real people.', version: '1.1', updatedAt: new Date().toISOString() },
];
seedGuidelines.forEach(g => guidelines.set(g.id, g));

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'brand-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), assets: assets.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ ASSETS ============
app.get('/api/assets', (req, res) => {
  let result = Array.from(assets.values());
  if (req.query.type) result = result.filter(a => a.type === req.query.type);
  if (req.query.tag) result = result.filter(a => a.tags.includes(req.query.tag as string));
  res.json({ total: result.length, assets: result });
});

app.get('/api/assets/:id', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

app.post('/api/assets',requireAuth,  (req, res) => {
  const { name, type, url, tags, uploadedBy, size, format } = req.body;
  if (!name || !type || !url) return res.status(400).json({ error: 'name, type, url required' });
  const id = uuidv4();
  assets.set(id, { id, name, type, url, tags: tags || [], uploadedAt: new Date().toISOString(), uploadedBy: uploadedBy || 'system', size: size || 0, format: format || 'png' });
  res.status(201).json(assets.get(id));
});

app.put('/api/assets/:id',requireAuth,  (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  Object.assign(asset, req.body);
  res.json(asset);
});

app.delete('/api/assets/:id',requireAuth,  (req, res) => {
  if (!assets.has(req.params.id)) return res.status(404).json({ error: 'Asset not found' });
  assets.delete(req.params.id);
  res.json({ success: true });
});

// ============ GUIDELINES ============
app.get('/api/guidelines', (req, res) => {
  let result = Array.from(guidelines.values());
  if (req.query.category) result = result.filter(g => g.category === req.query.category);
  res.json({ total: result.length, guidelines: result });
});

app.get('/api/guidelines/:id', (req, res) => {
  const g = guidelines.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guideline not found' });
  res.json(g);
});

app.post('/api/guidelines',requireAuth,  (req, res) => {
  const { name, category, content, version } = req.body;
  if (!name || !category || !content) return res.status(400).json({ error: 'name, category, content required' });
  const id = uuidv4();
  guidelines.set(id, { id, name, category, content, version: version || '1.0', updatedAt: new Date().toISOString() });
  res.status(201).json(guidelines.get(id));
});

app.put('/api/guidelines/:id',requireAuth,  (req, res) => {
  const g = guidelines.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Guideline not found' });
  Object.assign(g, req.body);
  g.updatedAt = new Date().toISOString();
  res.json(g);
});

// ============ COLORS & FONTS ============
app.get('/api/colors', (_req, res) => res.json({ colors }));
app.get('/api/fonts', (_req, res) => res.json({ fonts }));

// ============ COMPLIANCE ============
app.get('/api/compliance', (req, res) => {
  const { assetId, guidelineId } = req.query;
  let checks = [...complianceChecks];
  if (assetId) checks = checks.filter(c => c.assetId === assetId);
  if (guidelineId) checks = checks.filter(c => c.guidelineId === guidelineId);
  res.json({ total: checks.length, checks });
});

app.post('/api/compliance/check',requireAuth,  (req, res) => {
  const { assetId, guidelineId } = req.body;
  if (!assetId || !guidelineId) return res.status(400).json({ error: 'assetId, guidelineId required' });
  const asset = assets.get(assetId);
  const guideline = guidelines.get(guidelineId);
  if (!asset || !guideline) return res.status(404).json({ error: 'Asset or guideline not found' });

  const warnings: string[] = [];
  let passed = true;

  // Simple compliance checks
  if (asset.type === 'logo' && asset.size < 1000) { warnings.push('Logo file too small'); passed = false; }
  if (guideline.category === 'identity' && !asset.tags.includes('brand-approved')) { warnings.push('Not tagged as brand-approved'); passed = false; }

  const check: ComplianceCheck = { assetId, guidelineId, passed, warnings, timestamp: new Date().toISOString() };
  complianceChecks.push(check);
  res.json(check);
});

// ============ EXPORT ============
app.get('/api/export', (_req, res) => {
  res.json({
    brand: {
      colors, fonts,
      guidelines: Array.from(guidelines.values()),
      assetCount: assets.size,
    },
  });
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const all = Array.from(assets.values());
  res.json({ totalAssets: all.length, byType: { logo: all.filter(a => a.type === 'logo').length, icon: all.filter(a => a.type === 'icon').length, photo: all.filter(a => a.type === 'photo').length }, complianceChecks: complianceChecks.length });
});

app.listen(PORT, () => console.log(`[brand-os] listening on :${PORT}`));
export default app;