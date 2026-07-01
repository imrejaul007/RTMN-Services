/**
 * SalesOS - Commission Engine
 */
import { Router } from 'express';
const router = Router();

export interface Plan { id: string; name: string; type: 'commission' | 'bonus'; effectiveDate: Date; reps: RepPlan[]; accelerators: Accelerator[]; }
export interface RepPlan { repId: string; repName: string; quota: number; baseRate: number; tierRates?: TierRate[]; territory?: string; }
export interface TierRate { tier: string; minAttainment: number; maxAttainment?: number; rate: number; }
export interface Accelerator { name: string; condition: string; bonus: number; type: 'flat' | 'percentage'; }
export interface Payout { id: string; repId: string; period: string; quota: number; achieved: number; baseCommission: number; accelerators: number; total: number; status: 'pending' | 'approved' | 'paid'; paidAt?: Date; paidBy?: string; }

const plans = new Map<string, Plan>();
const payouts = new Map<string, Payout[]>();

router.post('/plans', (req, res) => {
  const plan: Plan = { id: crypto.randomUUID(), ...req.body, effectiveDate: new Date() };
  plans.set(plan.id, plan);
  res.status(201).json({ success: true, plan });
});

router.get('/plans', (req, res) => res.json({ success: true, plans: Array.from(plans.values()) }));
router.get('/plans/:id', (req, res) => {
  const p = plans.get(req.params.id);
  p ? res.json({ success: true, plan: p }) : res.status(404).json({ success: false, error: 'Not found' });
});

router.post('/calculate', (req, res) => {
  const { planId, repId, achieved } = req.body;
  const plan = plans.get(planId);
  if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
  const repPlan = plan.reps.find(r => r.repId === repId);
  if (!repPlan) return res.status(404).json({ success: false, error: 'Rep not in plan' });
  const attainment = (achieved / repPlan.quota) * 100;
  let rate = repPlan.baseRate;
  repPlan.tierRates?.forEach(t => { if (attainment >= t.minAttainment && (!t.maxAttainment || attainment <= t.maxAttainment)) rate = t.rate; });
  const baseCommission = achieved * (rate / 100);
  let accelerators = 0;
  plan.accelerators?.forEach(a => { if (a.type === 'flat') accelerators += a.bonus; else accelerators += achieved * (a.bonus / 100); });
  res.json({ success: true, attainment, rate, baseCommission, accelerators, total: baseCommission + accelerators });
});

router.post('/payouts', (req, res) => {
  const { planId, repId, period, achieved } = req.body;
  const plan = plans.get(planId);
  const repPlan = plan?.reps.find(r => r.repId === repId);
  const attainment = repPlan ? (achieved / repPlan.quota) * 100 : 0;
  const rate = repPlan?.baseRate || 0;
  const baseCommission = achieved * (rate / 100);
  const p: Payout = { id: crypto.randomUUID(), repId, period, quota: repPlan?.quota || 0, achieved, baseCommission, accelerators: 0, total: baseCommission, status: 'pending' };
  const existing = payouts.get(repId) || [];
  existing.push(p);
  payouts.set(repId, existing);
  res.status(201).json({ success: true, payout: p });
});

router.get('/payouts/:repId', (req, res) => res.json({ success: true, payouts: payouts.get(req.params.repId) || [] }));
router.get('/payouts', (req, res) => {
  const all = Array.from(payouts.values()).flat();
  res.json({ success: true, payouts: all, total: all.reduce((s, p) => s + p.total, 0) });
});

export default router;
