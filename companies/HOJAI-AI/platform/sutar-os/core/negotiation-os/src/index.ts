/**
 * Negotiation OS - Production Implementation
 * BATNA, multi-round bargaining, contract optimization
 * Port: 4869
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4869;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============

interface Template {
  id: string;
  name: string;
  type: 'price' | 'contract' | 'partnership' | 'supply';
  description: string;
  steps: NegotiationStep[];
  estimatedDuration: number; // minutes
  createdAt: string;
}

interface NegotiationStep {
  order: number;
  name: string;
  script: string;
  fallback: string;
  questions?: string[];
}

interface Negotiation {
  id: string;
  templateId: string;
  type: 'price' | 'contract' | 'partnership' | 'supply';
  title: string;
  parties: Party[];
  status: 'proposal' | 'negotiating' | 'counteroffer' | 'agreed' | 'failed' | 'cancelled';
  currentRound: number;
  maxRounds: number;
  deadline?: string;
  offers: Offer[];
  history: HistoryEntry[];
  batna?: BatnaScore;
  fairnessScore?: number;
  agreedTerms?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Party {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'partner' | 'mediator';
  minAcceptable?: number;
  maxAcceptable?: number;
  target?: number;
}

interface Offer {
  id: string;
  partyId: string;
  round: number;
  terms: Record<string, unknown>;
  totalValue: number;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  message?: string;
}

interface HistoryEntry {
  action: 'created' | 'offer_made' | 'offer_accepted' | 'offer_rejected' | 'counter_offer' | 'round_advance' | 'agreed' | 'failed';
  partyId: string;
  timestamp: string;
  details: string;
}

interface BatnaScore {
  partyId: string;
  score: number;
  bestAlternative: string;
  probability: number;
}

interface Strategy {
  id: string;
  name: string;
  type: 'aggressive' | 'collaborative' | 'compromising' | 'accommodating' | 'competitive';
  description: string;
  rules: StrategyRule[];
}

interface StrategyRule {
  condition: string;
  action: string;
  threshold?: number;
}

// ============ STORES ============

const templates = new Map<string, Template>();
const negotiations = new Map<string, Negotiation>();
const strategies = new Map<string, Strategy>();
const auditLogs: { negotiationId: string; action: string; partyId: string; timestamp: string }[] = [];

// ============ SEED DATA ============

const defaultTemplates: Template[] = [
  {
    id: 'saas-pricing', name: 'SaaS Pricing Negotiation', type: 'price',
    description: 'Standard SaaS contract pricing negotiation',
    steps: [
      { order: 1, name: 'Intro', script: 'Thank you for your interest. Let us discuss your requirements.', fallback: 'We can schedule a follow-up call.', questions: ['What is your current spend?', 'How many users?'] },
      { order: 2, name: 'Requirements', script: 'What are your specific needs?', fallback: 'We have standard packages available.' },
      { order: 3, name: 'Pricing', script: 'Our pricing starts at $X. What is your budget?', fallback: 'We can discuss flexible options.', questions: ['What is your budget range?', 'Annual or monthly?'] },
      { order: 4, name: 'Terms', script: 'Let us finalize the contract terms.', fallback: 'Standard terms apply.', questions: ['Contract length?', 'SLAs required?'] },
      { order: 5, name: 'Close', script: 'Let us finalize this agreement.', fallback: 'We will send the contract.' },
    ],
    estimatedDuration: 60, createdAt: new Date().toISOString(),
  },
  {
    id: 'partnership', name: 'Partnership Agreement', type: 'partnership',
    description: 'Strategic partnership negotiation',
    steps: [
      { order: 1, name: 'Proposal', script: 'We propose a strategic partnership.', fallback: 'We can explore other options.' },
      { order: 2, name: 'Terms', script: 'Here are our proposed terms.', fallback: 'We are open to negotiation.' },
      { order: 3, name: 'Equity', script: 'Let us discuss equity split.', fallback: 'Standard equity applies.' },
      { order: 4, name: 'Responsibilities', script: 'What are your responsibilities?', fallback: 'Standard roles apply.' },
      { order: 5, name: 'Close', script: 'Let us finalize the partnership.', fallback: 'We will draft the agreement.' },
    ],
    estimatedDuration: 120, createdAt: new Date().toISOString(),
  },
  {
    id: 'supply-deal', name: 'Supply Chain Deal', type: 'supply',
    description: 'Supply chain pricing and delivery negotiation',
    steps: [
      { order: 1, name: 'Volume', script: 'What volume are you looking for?', fallback: 'Standard volumes apply.' },
      { order: 2, name: 'Pricing', script: 'Our unit price is $X.', fallback: 'Volume discounts available.' },
      { order: 3, name: 'Delivery', script: 'Delivery terms are FOB.', fallback: 'Standard delivery applies.' },
      { order: 4, name: 'Payment', script: 'Payment terms are Net 30.', fallback: 'We can discuss terms.' },
    ],
    estimatedDuration: 45, createdAt: new Date().toISOString(),
  },
];
defaultTemplates.forEach(t => templates.set(t.id, t));

const defaultStrategies: Strategy[] = [
  { id: 'collaborative', name: 'Collaborative', type: 'collaborative', description: 'Win-win approach', rules: [{ condition: 'lowball_offer', action: 'counter_with_fair' }] },
  { id: 'competitive', name: 'Competitive', type: 'competitive', description: 'Maximize own value', rules: [{ condition: '，对方', action: 'hold_line' }] },
  { id: 'compromising', name: 'Compromising', type: 'compromising', description: 'Split the difference', rules: [{ condition: 'stalemate', action: 'meet_in_middle' }] },
];
defaultStrategies.forEach(s => strategies.set(s.id, s));

// ============ VALIDATION ============

const CreateNegotiationSchema = z.object({
  templateId: z.string(),
  title: z.string().min(1),
  parties: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['buyer', 'seller', 'partner', 'mediator']),
    minAcceptable: z.number().optional(),
    maxAcceptable: z.number().optional(),
    target: z.number().optional(),
  })),
  maxRounds: z.number().int().positive().max(10).default(5),
  deadline: z.string().optional(),
});

const MakeOfferSchema = z.object({
  partyId: z.string(),
  terms: z.record(z.unknown()),
  totalValue: z.number(),
  message: z.string().optional(),
});

// ============ HEALTH ============

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'negotiation-os',
  uptime: Math.floor((Date.now() - START_TIME) / 1000),
  negotiations: negotiations.size, templates: templates.size,
}));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ TEMPLATES ============

app.get('/api/templates', (req, res) => {
  const { type } = req.query;
  let result = Array.from(templates.values());
  if (type) result = result.filter(t => t.type === type);
  res.json({ total: result.length, templates: result });
});

app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

app.post('/api/templates', (req, res) => {
  const { name, type, description, steps, estimatedDuration } = req.body;
  if (!name || !type || !steps?.length) return res.status(400).json({ error: 'name, type, steps required' });

  const id = uuidv4();
  templates.set(id, { id, name, type, description: description || '', steps, estimatedDuration: estimatedDuration || 60, createdAt: new Date().toISOString() });
  res.status(201).json(templates.get(id));
});

// ============ NEGOTIATIONS ============

app.get('/api/negotiations', (req, res) => {
  const { status, type, partyId } = req.query;
  let result = Array.from(negotiations.values());
  if (status) result = result.filter(n => n.status === status);
  if (type) result = result.filter(n => n.type === type);
  if (partyId) result = result.filter(n => n.parties.some(p => p.id === partyId));
  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ total: result.length, negotiations: result });
});

app.get('/api/negotiations/:id', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  res.json(negotiation);
});

app.post('/api/negotiations', (req, res) => {
  try {
    const data = CreateNegotiationSchema.parse(req.body);
    const template = templates.get(data.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const id = uuidv4();
    const now = new Date().toISOString();

    const negotiation: Negotiation = {
      id, templateId: data.templateId, type: template.type, title: data.title,
      parties: data.parties.map(p => ({ ...p, id: uuidv4() })),
      status: 'proposal', currentRound: 1, maxRounds: data.maxRounds, deadline: data.deadline,
      offers: [], history: [{ action: 'created', partyId: 'system', timestamp: now, details: 'Negotiation created' }],
      createdAt: now, updatedAt: now,
    };

    negotiations.set(id, negotiation);
    auditLogs.push({ negotiationId: id, action: 'created', partyId: 'system', timestamp: now });
    res.status(201).json(negotiation);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/negotiations/:id/offer', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  if (negotiation.status === 'agreed' || negotiation.status === 'failed') {
    return res.status(400).json({ error: 'Negotiation already concluded' });
  }

  try {
    const data = MakeOfferSchema.parse(req.body);
    const now = new Date().toISOString();

    const offer: Offer = {
      id: uuidv4(), partyId: data.partyId, round: negotiation.currentRound,
      terms: data.terms, totalValue: data.totalValue, timestamp: now,
      status: 'pending', message: data.message,
    };

    negotiation.offers.push(offer);
    negotiation.status = 'negotiating';
    negotiation.history.push({ action: 'offer_made', partyId: data.partyId, timestamp: now, details: `Offer: $${data.totalValue}` });
    negotiation.updatedAt = now;

    auditLogs.push({ negotiationId: negotiation.id, action: 'offer', partyId: data.partyId, timestamp: now });
    res.json(offer);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/negotiations/:id/accept', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  const { partyId, offerId } = req.body;
  const now = new Date().toISOString();

  const offer = negotiation.offers.find(o => o.id === offerId);
  if (offer) offer.status = 'accepted';

  negotiation.status = 'agreed';
  negotiation.agreedTerms = offer?.terms;
  negotiation.completedAt = now;
  negotiation.updatedAt = now;
  negotiation.history.push({ action: 'agreed', partyId, timestamp: now, details: 'Terms accepted' });

  auditLogs.push({ negotiationId: negotiation.id, action: 'agreed', partyId, timestamp: now });
  res.json(negotiation);
});

app.post('/api/negotiations/:id/reject', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  const { partyId, reason, offerId } = req.body;
  const now = new Date().toISOString();

  if (offerId) {
    const offer = negotiation.offers.find(o => o.id === offerId);
    if (offer) offer.status = 'rejected';
  }

  negotiation.history.push({ action: 'offer_rejected', partyId, timestamp: now, details: reason || 'Offer rejected' });

  if (negotiation.currentRound >= negotiation.maxRounds) {
    negotiation.status = 'failed';
    negotiation.completedAt = now;
  } else {
    negotiation.currentRound++;
    negotiation.status = 'counteroffer';
    negotiation.history.push({ action: 'round_advance', partyId: 'system', timestamp: now, details: `Round ${negotiation.currentRound}` });
  }

  negotiation.updatedAt = now;
  auditLogs.push({ negotiationId: negotiation.id, action: 'rejected', partyId, timestamp: now });
  res.json(negotiation);
});

app.post('/api/negotiations/:id/cancel', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  negotiation.status = 'cancelled';
  negotiation.updatedAt = new Date().toISOString();
  res.json(negotiation);
});

// ============ BATNA ============

app.get('/api/negotiations/:id/batna', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  const batnaScores: BatnaScore[] = negotiation.parties.map(party => ({
    partyId: party.id,
    score: party.maxAcceptable ? 75 + Math.random() * 20 : 50 + Math.random() * 30,
    bestAlternative: party.role === 'buyer' ? 'competitor_product' : 'other_buyer',
    probability: 0.6 + Math.random() * 0.3,
  }));

  negotiation.batna = batnaScores[0];
  res.json({ batna: batnaScores });
});

// ============ STRATEGIES ============

app.get('/api/strategies', (_req, res) => res.json({ strategies: Array.from(strategies.values()) }));

app.post('/api/negotiations/:id/score', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  // Simple fairness scoring
  const latestOffers = negotiation.offers.filter(o => o.round === negotiation.currentRound);
  if (latestOffers.length >= 2) {
    const values = latestOffers.map(o => o.totalValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    negotiation.fairnessScore = Math.max(0, 100 - Math.sqrt(variance) / avg * 100);
  } else {
    negotiation.fairnessScore = negotiation.offers.length > 0 ? 50 : 0;
  }

  res.json({ fairnessScore: Math.round(negotiation.fairnessScore) });
});

// ============ AUDIT ============

app.get('/api/negotiations/:id/history', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  res.json({ history: negotiation.history });
});

app.get('/api/audit', (req, res) => {
  const { negotiationId } = req.query;
  let logs = [...auditLogs];
  if (negotiationId) logs = logs.filter(l => l.negotiationId === negotiationId);
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ total: logs.length, logs });
});

// ============ STATS ============

app.get('/api/stats', (_req, res) => {
  const all = Array.from(negotiations.values());
  res.json({
    total: all.length,
    active: all.filter(n => n.status === 'negotiating' || n.status === 'counteroffer' || n.status === 'proposal').length,
    agreed: all.filter(n => n.status === 'agreed').length,
    failed: all.filter(n => n.status === 'failed').length,
    avgRounds: all.length > 0 ? Math.round(all.reduce((s, n) => s + n.currentRound, 0) / all.length * 10) / 10 : 0,
    avgFairnessScore: all.filter(n => n.fairnessScore).reduce((s, n) => s + (n.fairnessScore || 0), 0) / (all.filter(n => n.fairnessScore).length || 1),
  });
});

app.listen(PORT, () => console.log(`[negotiation-os] listening on :${PORT}`));
export default app;