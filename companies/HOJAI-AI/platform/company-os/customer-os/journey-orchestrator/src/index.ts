/**
 * CustomerJourneyOS
 *
 * Autonomous customer lifecycle operating system
 * Inspired by: Gainsight + Braze + Pendo + Salesforce Journey Builder
 *
 * Modules:
 * - Journey Mapping
 * - Lifecycle Engine
 * - Omnichannel Orchestrator
 * - Event & Trigger Engine
 * - Intent Intelligence
 * - Personalization
 * - Journey Twins
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Journey {
  id: string;
  name: string;
  type: 'acquisition' | 'onboarding' | 'engagement' | 'retention' | 'expansion' | 'winback' | 'custom';
  industry?: string;
  stages: JourneyStage[];
  triggers: Trigger[];
  goals: JourneyGoal[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  metrics: {
    enrolled: number;
    completed: number;
    dropped: number;
    conversionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface JourneyStage {
  id: string;
  name: string;
  order: number;
  type: 'manual' | 'automated' | 'ai';
  entryCriteria: EntryCriterion[];
  exitCriteria: ExitCriterion[];
  actions: JourneyAction[];
  delay?: { type: 'immediate' | 'hours' | 'days' | 'weeks'; value: number };
  aiPersonalization?: boolean;
}

export interface EntryCriterion {
  type: 'event' | 'condition' | 'segment' | 'manual';
  event?: string;
  field?: string;
  operator?: string;
  value?: any;
}

export interface ExitCriterion {
  type: 'action' | 'time' | 'condition';
  action?: string;
  days?: number;
  field?: string;
  operator?: string;
  value?: any;
}

export interface JourneyAction {
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'call' | 'task' | 'agent' | 'webhook';
  channel?: string;
  template?: string;
  content?: string;
  delay?: { value: number; unit: 'minutes' | 'hours' | 'days' };
  conditions?: Condition[];
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
  value: any;
}

export interface JourneyGoal {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'retention';
  metric: string;
  target: number;
  progress: number;
}

export interface Trigger {
  id: string;
  event: string;
  conditions: Condition[];
  journeyId: string;
  status: 'active' | 'paused';
}

// ============================================================
// ENROLLMENT TYPES
// ============================================================

export interface Enrollment {
  id: string;
  customerId: string;
  journeyId: string;
  journeyName: string;
  currentStageId: string;
  currentStageName: string;
  stageHistory: StageHistory[];
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'completed' | 'dropped' | 'paused';
  events: CustomerEvent[];
  personalization: Record<string, any>;
}

export interface StageHistory {
  stageId: string;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  actions: string[];
  outcome?: 'success' | 'dropped' | 'skipped';
}

export interface CustomerEvent {
  type: string;
  timestamp: Date;
  properties: Record<string, any>;
  channel?: string;
  journeyId?: string;
  stageId?: string;
}

// ============================================================
// INTENT TYPES
// ============================================================

export interface IntentSignal {
  id: string;
  customerId: string;
  type: 'search' | 'browse' | 'cart' | 'checkout' | 'support' | 'feedback' | 'social';
  intent: {
    category: 'buy' | 'browse' | 'inquire' | 'cancel' | 'upgrade' | 'renew';
    confidence: number;
    products?: string[];
    keywords?: string[];
  };
  source: string;
  context: Record<string, any>;
  recommendedActions: string[];
  priority: 'low' | 'medium' | 'high';
  processed: boolean;
  createdAt: Date;
}

// ============================================================
// PERSONALIZATION TYPES
// ============================================================

export interface PersonalizationContext {
  customerId: string;
  journeyId: string;
  stage: string;
  previousInteractions: number;
  channelPreferences: string[];
  language: string;
  timezone: string;
  preferences: Record<string, any>;
  behavior: {
    lastBrowse?: string;
    recentPurchases?: string[];
    avgOrderValue?: number;
    engagementScore?: number;
  };
}

export interface PersonalizedContent {
  channel: string;
  subject?: string;
  headline: string;
  body: string;
  cta: string;
  ctaUrl?: string;
  image?: string;
  variants?: { name: string; content: any }[];
}

// ============================================================
// TWIN TYPES
// ============================================================

export interface JourneyTwin {
  id: string;
  journeyId: string;
  currentEnrollment?: string;
  status: 'draft' | 'active' | 'optimizing';
  performance: {
    enrolled: number;
    completed: number;
    dropped: number;
    conversionRate: number;
    avgTimeToComplete: number;
    revenue: number;
  };
  insights: {
    dropOffPoints: string[];
    bestTimeToEngage: string;
    optimalChannel: string;
    winningVariants: string[];
  };
  recommendations: string[];
  updatedAt: Date;
}

// ============================================================
// STORAGE
// ============================================================

const journeys = new Map<string, Journey>();
const enrollments = new Map<string, Enrollment>();
const intents = new Map<string, IntentSignal>();
const triggers = new Map<string, Trigger>();
const journeyTwins = new Map<string, JourneyTwin>();

// ============================================================
// ROUTES - JOURNEYS
// ============================================================

router.post('/journeys', async (req, res) => {
  try {
    const { name, type, stages, triggers: journeyTriggers } = req.body;

    const journey: Journey = {
      id: crypto.randomUUID(),
      name: name || 'New Journey',
      type: type || 'custom',
      industry: req.body.industry,
      stages: stages || [],
      triggers: journeyTriggers || [],
      goals: req.body.goals || [],
      status: 'draft',
      metrics: { enrolled: 0, completed: 0, dropped: 0, conversionRate: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    journeys.set(journey.id, journey);

    // Create twin
    const twin: JourneyTwin = {
      id: crypto.randomUUID(),
      journeyId: journey.id,
      status: 'draft',
      performance: { enrolled: 0, completed: 0, dropped: 0, conversionRate: 0, avgTimeToComplete: 0, revenue: 0 },
      insights: { dropOffPoints: [], bestTimeToEngage: '', optimalChannel: '', winningVariants: [] },
      recommendations: [],
      updatedAt: new Date(),
    };
    journeyTwins.set(journey.id, twin);

    res.status(201).json({ success: true, journey, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/journeys', async (req, res) => {
  try {
    const { type, status, industry } = req.query;

    let result = Array.from(journeys.values());

    if (type) result = result.filter(j => j.type === type);
    if (status) result = result.filter(j => j.status === status);
    if (industry) result = result.filter(j => j.industry === industry);

    res.json({ success: true, journeys: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/journeys/:id', async (req, res) => {
  try {
    const journey = journeys.get(req.params.id);
    if (!journey) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    const twin = journeyTwins.get(journey.id);

    res.json({ success: true, journey, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/journeys/:id', async (req, res) => {
  try {
    const journey = journeys.get(req.params.id);
    if (!journey) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    Object.assign(journey, req.body, { updatedAt: new Date() });
    journeys.set(req.params.id, journey);

    res.json({ success: true, journey });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - ENROLLMENTS
// ============================================================

router.post('/enroll', async (req, res) => {
  try {
    const { customerId, journeyId, triggers: eventTriggers } = req.body;

    const journey = journeys.get(journeyId);
    if (!journey) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      customerId,
      journeyId,
      journeyName: journey.name,
      currentStageId: journey.stages[0]?.id || '',
      currentStageName: journey.stages[0]?.name || '',
      stageHistory: [{
        stageId: journey.stages[0]?.id || '',
        stageName: journey.stages[0]?.name || '',
        enteredAt: new Date(),
        actions: [],
      }],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active',
      events: eventTriggers?.map((e: any) => ({
        ...e,
        timestamp: new Date(),
      })) || [],
      personalization: {},
    };

    enrollments.set(enrollment.id, enrollment);

    // Update journey metrics
    journey.metrics.enrolled++;
    journey.updatedAt = new Date();
    journeys.set(journeyId, journey);

    // Update twin
    updateJourneyTwin(journeyId);

    res.status(201).json({ success: true, enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/enrollments/:id', async (req, res) => {
  try {
    const enrollment = enrollments.get(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }
    res.json({ success: true, enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/enrollments/customer/:customerId', async (req, res) => {
  try {
    const result = Array.from(enrollments.values())
      .filter(e => e.customerId === req.params.customerId);

    res.json({ success: true, enrollments: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - INTENT
// ============================================================

router.post('/intents', async (req, res) => {
  try {
    const { customerId, type, source, intent } = req.body;

    const signal: IntentSignal = {
      id: crypto.randomUUID(),
      customerId,
      type: type || 'browse',
      intent: intent || { category: 'browse', confidence: 0 },
      source: source || 'system',
      context: req.body.context || {},
      recommendedActions: req.body.recommendedActions || [],
      priority: intent?.confidence > 0.7 ? 'high' : intent?.confidence > 0.4 ? 'medium' : 'low',
      processed: false,
      createdAt: new Date(),
    };

    intents.set(signal.id, signal);

    res.status(201).json({ success: true, signal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/intents/customer/:customerId', async (req, res) => {
  try {
    const result = Array.from(intents.values())
      .filter(i => i.customerId === req.params.customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, signals: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - PERSONALIZATION
// ============================================================

router.post('/personalize', async (req, res) => {
  try {
    const { customerId, journeyId, channel, template } = req.body;

    const context: PersonalizationContext = {
      customerId,
      journeyId,
      stage: req.body.stage || '',
      previousInteractions: countInteractions(customerId),
      channelPreferences: ['whatsapp', 'email'],
      language: req.body.language || 'en',
      timezone: req.body.timezone || 'Asia/Kolkata',
      preferences: req.body.preferences || {},
      behavior: req.body.behavior || {},
    };

    const content = generatePersonalizedContent(context, channel, template);

    res.json({ success: true, content, context });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - TRIGGERS
// ============================================================

router.post('/triggers', async (req, res) => {
  try {
    const { event, conditions, journeyId } = req.body;

    const trigger: Trigger = {
      id: crypto.randomUUID(),
      event,
      conditions: conditions || [],
      journeyId,
      status: 'active',
    };

    triggers.set(trigger.id, trigger);

    res.status(201).json({ success: true, trigger });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/events/process', async (req, res) => {
  try {
    const { customerId, event, properties } = req.body;

    // Find matching triggers
    const matchingTriggers = Array.from(triggers.values())
      .filter(t => t.event === event && t.status === 'active')
      .filter(t => evaluateConditions(t.conditions, properties));

    const enrollments_to_start: string[] = [];

    for (const trigger of matchingTriggers) {
      // Auto-enroll if journey is active
      const journey = journeys.get(trigger.journeyId);
      if (journey?.status === 'active') {
        enrollments_to_start.push(trigger.journeyId);
      }
    }

    res.json({
      success: true,
      matchedTriggers: matchingTriggers.length,
      enrollmentsToStart: enrollments_to_start,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - TWINS
// ============================================================

router.get('/twins/:journeyId', async (req, res) => {
  try {
    const twin = journeyTwins.get(req.params.journeyId);
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin not found' });
    }
    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/twins', async (req, res) => {
  try {
    const result = Array.from(journeyTwins.values());
    res.json({ success: true, twins: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function countInteractions(customerId: string): number {
  return Array.from(enrollments.values())
    .filter(e => e.customerId === customerId)
    .reduce((sum, e) => sum + e.events.length, 0);
}

function generatePersonalizedContent(
  context: PersonalizationContext,
  channel?: string,
  template?: string
): PersonalizedContent {
  const name = context.preferences.name || 'there';

  const content: PersonalizedContent = {
    channel: channel || 'whatsapp',
    headline: `Hey ${name}!`,
    body: getPersonalizedBody(context),
    cta: 'Learn More',
    ctaUrl: '/discover',
  };

  return content;
}

function getPersonalizedBody(context: PersonalizationContext): string {
  const behaviors = context.behavior;

  if (behaviors.recentPurchases?.length) {
    return `Based on your recent interest, we have something special for you!`;
  }
  if (behaviors.avgOrderValue && behaviors.avgOrderValue > 500) {
    return `Premium picks just for you, ${context.preferences.name || 'there'}!`;
  }
  return `We've missed you! Here's what's new:`;
}

function evaluateConditions(conditions: Condition[], properties: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(cond => {
    const value = properties[cond.field];

    switch (cond.operator) {
      case 'equals': return value === cond.value;
      case 'not_equals': return value !== cond.value;
      case 'contains': return String(value).includes(String(cond.value));
      case 'gt': return Number(value) > Number(cond.value);
      case 'lt': return Number(value) < Number(cond.value);
      default: return true;
    }
  });
}

function updateJourneyTwin(journeyId: string): void {
  const journey = journeys.get(journeyId);
  const twin = journeyTwins.get(journeyId);
  if (!journey || !twin) return;

  twin.performance = { ...journey.metrics, avgTimeToComplete: 0, revenue: 0 };
  twin.updatedAt = new Date();
  journeyTwins.set(journeyId, twin);
}

// ============================================================
// JOURNEY TEMPLATES
// ============================================================

router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'welcome-onboarding',
        name: 'Welcome Onboarding',
        type: 'onboarding',
        description: 'First 30 days new customer journey',
        stages: 5,
      },
      {
        id: 'reengagement',
        name: 'Re-engagement',
        type: 'winback',
        description: 'Win back dormant customers',
        stages: 4,
      },
      {
        id: 'premium-upgrade',
        name: 'Premium Upgrade',
        type: 'expansion',
        description: 'Drive premium tier adoption',
        stages: 3,
      },
      {
        id: 'churn-prevention',
        name: 'Churn Prevention',
        type: 'retention',
        description: 'Save at-risk customers',
        stages: 6,
      },
    ];

    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
