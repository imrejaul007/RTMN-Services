/**
 * SalesOS - Lead Management
 * Complete lead lifecycle management
 */
import { Router } from 'express';
const router = Router();

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  designation?: string;
  source: 'website' | 'referral' | 'linkedin' | 'cold_outbound' | 'event' | 'campaign' | 'partner';
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  score: number;
  temperature: 'cold' | 'warm' | 'hot';
  assignedTo?: string;
  territory?: string;
  icp: { fit: number; intent: number };
  notes: string[];
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  outcome?: string;
  createdBy: string;
}

export interface Sequence {
  id: string;
  name: string;
  steps: SequenceStep[];
  status: 'draft' | 'active' | 'paused';
}

export interface SequenceStep {
  order: number;
  type: 'email' | 'call' | 'task' | 'delay';
  subject?: string;
  templateId?: string;
  delayDays?: number;
}

export interface LeadScore {
  leadId: string;
  firmographics: { employees: number; revenue: number; industry: string };
  technographics: string[];
  intentSignals: string[];
  behavioral: { websiteVisits: number; emailOpens: number; formFills: number };
  totalScore: number;
}

const leads = new Map<string, Lead>();
const sequences = new Map<string, Sequence>();

router.post('/leads', (req, res) => {
  const lead: Lead = { id: crypto.randomUUID(), ...req.body, status: 'new', score: 0, temperature: 'cold', notes: [], activities: [], createdAt: new Date(), updatedAt: new Date() };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, lead });
});

router.get('/leads', (req, res) => {
  const { status, temperature, assignedTo } = req.query;
  let result = Array.from(leads.values());
  if (status) result = result.filter(l => l.status === status);
  if (temperature) result = result.filter(l => l.temperature === temperature);
  if (assignedTo) result = result.filter(l => l.assignedTo === assignedTo);
  res.json({ success: true, leads: result, count: result.length });
});

router.get('/leads/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  lead ? res.json({ success: true, lead }) : res.status(404).json({ success: false, error: 'Lead not found' });
});

router.patch('/leads/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
  Object.assign(lead, req.body, { updatedAt: new Date() });
  if (req.body.score) {
    lead.score = req.body.score;
    lead.temperature = req.body.score >= 70 ? 'hot' : req.body.score >= 40 ? 'warm' : 'cold';
  }
  leads.set(req.params.id, lead);
  res.json({ success: true, lead });
});

router.post('/leads/:id/activities', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
  const activity: Activity = { id: crypto.randomUUID(), ...req.body, createdBy: req.body.createdBy || 'system' };
  lead.activities.push(activity);
  leads.set(req.params.id, lead);
  res.status(201).json({ success: true, activity });
});

router.post('/leads/:id/score', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
  const { firmographics, technographics, intentSignals, behavioral } = req.body;
  let score = 0;
  if (firmographics?.employees > 100) score += 20;
  if (firmographics?.revenue > 10000000) score += 25;
  if (technographics?.length > 0) score += 15;
  if (intentSignals?.length > 0) score += 20;
  if (behavioral?.websiteVisits > 5) score += 10;
  if (behavioral?.emailOpens > 10) score += 10;
  lead.score = score;
  lead.temperature = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
  if (score >= 60 && lead.status === 'new') lead.status = 'contacted';
  leads.set(req.params.id, lead);
  res.json({ success: true, score, temperature: lead.temperature });
});

router.post('/sequences', (req, res) => {
  const seq: Sequence = { id: crypto.randomUUID(), ...req.body, status: 'draft' };
  sequences.set(seq.id, seq);
  res.status(201).json({ success: true, sequence: seq });
});

router.post('/sequences/:id/enroll', (req, res) => {
  const { leadIds } = req.body;
  const seq = sequences.get(req.params.id);
  if (!seq) return res.status(404).json({ success: false, error: 'Sequence not found' });
  seq.status = 'active';
  sequences.set(req.params.id, seq);
  res.json({ success: true, enrolled: leadIds?.length || 0 });
});

router.get('/reports/pipeline', (req, res) => {
  const all = Array.from(leads.values());
  const pipeline = {
    new: all.filter(l => l.status === 'new').length,
    contacted: all.filter(l => l.status === 'contacted').length,
    qualified: all.filter(l => l.status === 'qualified').length,
    proposal: all.filter(l => l.status === 'proposal').length,
    negotiation: all.filter(l => l.status === 'negotiation').length,
    won: all.filter(l => l.status === 'won').length,
    lost: all.filter(l => l.status === 'lost').length,
    total: all.length,
  };
  res.json({ success: true, pipeline });
});

export default router;
