/**
 * CustomerOS - Customer 360 + Health + Churn + Surveys
 */
import { Router } from 'express';
const router = Router();

export interface Customer360 { id: string; name: string; email: string; phone: string; company?: string; segment: string; tier: 'bronze'|'silver'|'gold'|'platinum'; ltv: number; acquisitionDate: Date; health: number; churnRisk: number; nps?: number; engagement: number; satisfaction: number; }
export interface Survey { id: string; type: 'nps'|'csat'|'ces'; customerId: string; score?: number; questions: Question[]; status: 'pending'|'sent'|'completed'; sentAt?: Date; completedAt?: Date; }
export interface Question { id: string; text: string; type: 'rating'|'text'|'multiple_choice'; options?: string[]; }

const customers = new Map<string, Customer360>();
const surveys = new Map<string, Survey[]>();
const healthScores = new Map<string, number>();

router.post('/customers', (req, res) => {
  const c: Customer360 = { id: crypto.randomUUID(), ...req.body, health: req.body.health || 75, churnRisk: 0, acquisitionDate: new Date() };
  customers.set(c.id, c);
  res.status(201).json({ success: true, customer: c });
});
router.get('/customers/:id', (req, res) => {
  const c = customers.get(req.params.id);
  c ? res.json({ success: true, customer: c }) : res.status(404).json({ success: false, error: 'Not found' });
});
router.patch('/customers/:id/health', (req, res) => {
  const c = customers.get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: 'Not found' });
  c.health = req.body.health;
  c.churnRisk = 100 - c.health;
  customers.set(c.id, c);
  res.json({ success: true, customer: c });
});

router.post('/surveys', (req, res) => {
  const s: Survey = { id: crypto.randomUUID(), ...req.body, status: 'pending', questions: [] };
  const existing = surveys.get(s.customerId) || [];
  existing.push(s);
  surveys.set(s.customerId, existing);
  res.status(201).json({ success: true, survey: s });
});
router.get('/surveys/:customerId', (req, res) => res.json({ success: true, surveys: surveys.get(req.params.customerId) || [] }));
router.patch('/surveys/:id/respond', (req, res) => {
  const { customerId } = req.body;
  const list = surveys.get(customerId) || [];
  const s = list.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(s, req.body, { status: 'completed', completedAt: new Date() });
  if (s.score) {
    const c = customers.get(s.customerId);
    if (c) { c.nps = s.score; customers.set(s.customerId, c); }
  }
  res.json({ success: true, survey: s });
});

router.get('/analytics/health-distribution', (req, res) => {
  const all = Array.from(customers.values());
  res.json({ success: true, distribution: { healthy: all.filter(c => c.health >= 80).length, atRisk: all.filter(c => c.health >= 50 && c.health < 80).length, critical: all.filter(c => c.health < 50).length } });
});
router.get('/analytics/churn-risk', (req, res) => {
  const all = Array.from(customers.values());
  res.json({ success: true, risk: { critical: all.filter(c => c.churnRisk > 70).length, high: all.filter(c => c.churnRisk > 50 && c.churnRisk <= 70).length, medium: all.filter(c => c.churnRisk > 30 && c.churnRisk <= 50).length, low: all.filter(c => c.churnRisk <= 30).length } });
});

export default router;