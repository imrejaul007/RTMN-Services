import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// In-memory twin store
interface DigitalTwin {
  id: string;
  name: string;
  type: 'person' | 'business' | 'product';
  preferences: Record<string, any>;
  history: Array<{ action: string; timestamp: string; data: any }>;
  insights: Array<{ category: string; insight: string; confidence: number }>;
  personality?: {
    tone: string[];
    style: string;
    interests: string[];
  };
  communication_preferences?: {
    preferred_channel: string;
    best_time: string;
    frequency: string;
  };
  created_at: string;
  updated_at: string;
}

const twins: Map<string, DigitalTwin> = new Map([
  ['twin-1', {
    id: 'twin-1',
    name: 'Sarah Chen',
    type: 'person',
    preferences: {
      industries: ['Technology', 'AI', 'SaaS'],
      communication_style: 'concise',
      meeting_duration: '30min',
      price_sensitivity: 'low'
    },
    history: [
      { action: 'demo_requested', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), data: { product: 'CloudPlatform' } },
      { action: 'pricing_viewed', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), data: { pages: ['Enterprise', 'Pricing'] } },
      { action: 'case_study_downloaded', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), data: { title: 'How TechCorp Reduced Costs by 40%' } },
      { action: 'demo_completed', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), data: { feedback: 'positive' } }
    ],
    insights: [
      { category: 'buying_stage', insight: 'High-intent evaluation stage', confidence: 85 },
      { category: 'budget', insight: 'Enterprise budget confirmed', confidence: 90 },
      { category: 'decision_maker', insight: 'Can approve independently', confidence: 75 },
      { category: 'timeline', insight: 'Q2 implementation preferred', confidence: 70 }
    ],
    personality: {
      tone: ['professional', 'data-driven'],
      style: 'executive',
      interests: ['AI innovation', 'efficiency metrics', 'team productivity']
    },
    communication_preferences: {
      preferred_channel: 'email',
      best_time: 'morning',
      frequency: 'weekly'
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }],
  ['twin-2', {
    id: 'twin-2',
    name: 'TechCorp Inc',
    type: 'business',
    preferences: {
      industries: ['Technology'],
      company_size: 'enterprise',
      tech_savvy: 'high',
      integration_focus: true
    },
    history: [
      { action: 'account_created', timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), data: {} },
      { action: 'onboarding_completed', timestamp: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(), data: { modules_completed: 5 } },
      { action: 'feature_adopted', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), data: { feature: 'Analytics Dashboard' } },
      { action: 'support_ticket', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), data: { type: 'integration', status: 'resolved' } }
    ],
    insights: [
      { category: 'adoption', insight: 'Core features well adopted', confidence: 88 },
      { category: 'expansion', insight: 'Likely to expand seats', confidence: 72 },
      { category: 'retention', insight: 'Low churn risk', confidence: 85 },
      { category: 'nps', insight: 'Promoter (NPS 9)', confidence: 95 }
    ],
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }]
]);

// GET /twin - Get twin data
router.get('/', (req: Request, res: Response) => {
  const { id, name, type } = req.query;

  // Find by ID
  if (id && typeof id === 'string') {
    const twin = twins.get(id);
    if (!twin) {
      res.status(404).json({ success: false, error: 'Twin not found' });
      return;
    }
    res.json({ success: true, data: twin });
    return;
  }

  // Find by name
  if (name && typeof name === 'string') {
    const nameLower = name.toLowerCase();
    const found = Array.from(twins.values()).find(t => t.name.toLowerCase().includes(nameLower));
    if (found) {
      res.json({ success: true, data: found });
      return;
    }
    res.status(404).json({ success: false, error: 'Twin not found' });
    return;
  }

  // Filter by type
  if (type && typeof type === 'string') {
    const filtered = Array.from(twins.values()).filter(t => t.type === type);
    res.json({ success: true, data: filtered, total: filtered.length });
    return;
  }

  // Return all
  const allTwins = Array.from(twins.values());
  res.json({ success: true, data: allTwins, total: allTwins.length });
});

// POST /twin - Create/update twin
router.post('/', (req: Request, res: Response) => {
  const { id, name, type, preferences, history, insights, personality, communication_preferences } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: 'name is required' });
    return;
  }

  const twinId = id || `twin-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const existing = twins.get(twinId);

  const twin: DigitalTwin = {
    id: twinId,
    name,
    type: type || 'person',
    preferences: preferences || existing?.preferences || {},
    history: history || existing?.history || [],
    insights: insights || existing?.insights || [],
    personality: personality || existing?.personality,
    communication_preferences: communication_preferences || existing?.communication_preferences,
    created_at: existing?.created_at || now,
    updated_at: now
  };

  twins.set(twinId, twin);

  res.status(existing ? 200 : 201).json({
    success: true,
    data: twin
  });
});

// DELETE /twin/:id - Delete twin
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!twins.has(id)) {
    res.status(404).json({ success: false, error: 'Twin not found' });
    return;
  }

  twins.delete(id);

  res.json({ success: true, message: 'Twin deleted' });
});

export default router;
