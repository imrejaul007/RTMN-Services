/**
 * MarketingOS - SEO + Attribution + Automation
 */
import { Router } from 'express';
const router = Router();

export interface SEOProject { id: string; name: string; domain: string; pages: number; da: number; keywords: Keyword[]; status: 'active'|'paused'; createdAt: Date; }
export interface Keyword { id: string; keyword: string; position: number; volume: number; difficulty: number; traffic: number; }
export interface Campaign { id: string; name: string; channels: string[]; budget: number; spent: number; leads: number; conversions: number; roi: number; status: 'draft'|'active'|'paused'; }
export interface Attribution { touchpoint: string; revenue: number; conversions: number; weight: number; }

const seo = new Map<string, SEOProject>();
const campaigns = new Map<string, Campaign>();

router.post('/seo/projects', (req, res) => { const p: SEOProject = { id: crypto.randomUUID(), ...req.body, keywords: [], createdAt: new Date() }; seo.set(p.id, p); res.status(201).json({ success: true, project: p }); });
router.get('/seo/projects', (req, res) => res.json({ success: true, projects: Array.from(seo.values()) }));
router.patch('/seo/:id/keywords', (req, res) => { const p = seo.get(req.params.id); if (!p) return res.status(404).json({ error: 'Not found' }); p.keywords = req.body.keywords || []; seo.set(req.params.id, p); res.json({ success: true, project: p }); });

router.post('/campaigns', (req, res) => { const c: Campaign = { id: crypto.randomUUID(), ...req.body, roi: 0, status: 'draft' }; campaigns.set(c.id, c); res.status(201).json({ success: true, campaign: c }); });
router.get('/campaigns', (req, res) => res.json({ success: true, campaigns: Array.from(campaigns.values()) }));
router.get('/campaigns/:id', (req, res) => { const c = campaigns.get(req.params.id); c ? res.json({ success: true, campaign: c }) : res.status(404).json({ error: 'Not found' }); });
router.patch('/campaigns/:id/track', (req, res) => { const c = campaigns.get(req.params.id); if (!c) return res.status(404).json({ error: 'Not found' }); Object.assign(c, req.body); c.roi = c.revenue ? (c.conversions / c.spent * 100) : 0; campaigns.set(req.params.id, c); res.json({ success: true, campaign: c }); });

router.get('/attribution', (req, res) => {
  const touchpoints = ['Organic Search','Paid Search','Social','Email','Referral','Direct'];
  const weights = [0.3,0.25,0.2,0.15,0.07,0.03];
  const result = touchpoints.map((t, i) => ({ touchpoint: t, weight: weights[i] * 100, conversions: Math.floor(Math.random() * 100), revenue: Math.floor(Math.random() * 1000000) }));
  res.json({ success: true, attribution: result });
});

export default router;