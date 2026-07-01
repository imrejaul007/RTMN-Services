/**
 * SalesOS - Sales Analytics
 */
import { Router } from 'express';
const router = Router();

export interface SalesMetric { repId: string; repName: string; period: string; quota: number; achieved: number; attainment: number; deals: number; avgDealSize: number; cycleTime: number; }
export interface PipelineStage { name: string; count: number; value: number; avgTime: number; conversionRate: number; }
export interface WinLoss { id: string; type: 'won' | 'lost'; value: number; competitor?: string; reason?: string; date: Date; }

const metrics = new Map<string, SalesMetric[]>();
const stages = new Map<string, PipelineStage[]>();
const winLoss = new Map<string, WinLoss[]>();

router.post('/metrics', (req, res) => {
  const m: SalesMetric = { id: crypto.randomUUID(), ...req.body, attainment: req.body.quota > 0 ? (req.body.achieved / req.body.quota * 100) : 0 };
  const existing = metrics.get(m.repId) || [];
  existing.push(m);
  metrics.set(m.repId, existing);
  res.status(201).json({ success: true, metric: m });
});

router.get('/metrics/:repId', (req, res) => { res.json({ success: true, metrics: metrics.get(req.params.repId) || [] }); });
router.get('/metrics', (req, res) => {
  const all = Array.from(metrics.values()).flat();
  res.json({ success: true, metrics: all, avgAttainment: all.length ? all.reduce((s,m) => s + m.attainment, 0) / all.length : 0 });
});

router.get('/pipeline/:period', (req, res) => {
  const s = stages.get(req.params.period) || [
    { name: 'Prospecting', count: 50, value: 5000000, avgTime: 5, conversionRate: 60 },
    { name: 'Qualified', count: 30, value: 4000000, avgTime: 10, conversionRate: 50 },
    { name: 'Demo', count: 15, value: 2500000, avgTime: 15, conversionRate: 40 },
    { name: 'Proposal', count: 8, value: 1800000, avgTime: 20, conversionRate: 60 },
    { name: 'Negotiation', count: 4, value: 1200000, avgTime: 10, conversionRate: 75 },
    { name: 'Closed Won', count: 3, value: 900000, avgTime: 5, conversionRate: 100 },
  ];
  res.json({ success: true, stages: s });
});

router.post('/win-loss', (req, res) => {
  const w: WinLoss = { id: crypto.randomUUID(), ...req.body, date: new Date() };
  const existing = winLoss.get(w.type) || [];
  existing.push(w);
  winLoss.set(w.type, existing);
  res.status(201).json({ success: true, record: w });
});

router.get('/forecast/:period', (req, res) => {
  const pipeline = 12000000;
  const commit = pipeline * 0.7;
  const best = pipeline * 0.9;
  const mostLikely = pipeline * 0.75;
  res.json({ success: true, forecast: { pipeline, commit, best, mostLikely, accuracy: 85 } });
});

router.get('/report/team', (req, res) => {
  const all = Array.from(metrics.values()).flat();
  res.json({ success: true, team: { total: all.length, avgAttainment: all.length ? all.reduce((s,m) => s + m.attainment, 0) / all.length : 0, topPerformer: all.sort((a,b) => b.attainment - a.attainment)[0]?.repName } });
});

export default router;
