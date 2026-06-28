/**
 * TwinOS Behavior Model v1.0
 * Port: 4718
 *
 * Behavior learning and pattern detection for digital twins.
 *
 * Features:
 * - Behavior pattern capture and detection
 * - Preference learning
 * - Anomaly detection
 * - Routine identification
 * - Personality modeling
 * - Communication style analysis
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4718', 10);

// ============================================================
// TYPES
// ============================================================

export interface TwinBehavior {
  twinId: string;
  patterns: Pattern[];
  preferences: Record<string, any>;
  personality?: PersonalityProfile;
  communicationStyle?: CommunicationStyle;
  riskTolerance: number;
  strengths: string[];
  weaknesses: string[];
  learningStyle?: string;
  decisionStyle?: string;
  routines: Routine[];
  anomalies: Anomaly[];
  lastUpdated: string;
}

export interface Pattern {
  id: string;
  name: string;
  type: 'temporal' | 'behavioral' | 'preferential' | 'sequential';
  frequency: number;
  confidence: number;
  examples: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface PersonalityProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  primaryType: string;
  traits: string[];
}

export interface CommunicationStyle {
  preferredChannel: 'email' | 'chat' | 'call' | 'meeting' | 'slack';
  formalityLevel: 'formal' | 'casual' | 'mixed';
  responseTime: 'quick' | 'moderate' | 'slow';
  verbosity: 'brief' | 'moderate' | 'detailed';
  tone: 'friendly' | 'professional' | 'direct';
}

export interface Routine {
  id: string;
  name: string;
  schedule: string;
  activities: string[];
  consistency: number;
  variations: string[];
}

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  context?: string;
}

export interface BehaviorEvent {
  twinId: string;
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
  context?: Record<string, any>;
}

export interface Preference {
  category: string;
  value: any;
  confidence: number;
  frequency: number;
  lastExpressed: string;
}

// ============================================================
// IN-MEMORY STORES
// ============================================================

const behaviors = new Map<string, TwinBehavior>();
const events = new Map<string, BehaviorEvent[]>();
const preferences = new Map<string, Preference[]>();
const patterns = new Map<string, Pattern[]>();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

function createBehaviorProfile(twinId: string): TwinBehavior {
  return {
    twinId,
    patterns: [],
    preferences: {},
    personality: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
      primaryType: 'balanced',
      traits: [],
    },
    riskTolerance: 0.5,
    strengths: [],
    weaknesses: [],
    routines: [],
    anomalies: [],
    lastUpdated: new Date().toISOString(),
  };
}

function detectPatterns(twinId: string, eventType: string): Pattern[] {
  const twinEvents = events.get(twinId) || [];
  const eventCount = twinEvents.filter(e => e.eventType === eventType).length;

  if (eventCount >= 3) {
    const existingPattern = patterns.get(twinId) || [];
    const hasPattern = existingPattern.find(p => p.name === eventType);

    if (!hasPattern) {
      const newPattern: Pattern = {
        id: generateId('pat'),
        name: eventType,
        type: 'behavioral',
        frequency: eventCount,
        confidence: Math.min(eventCount / 10, 0.95),
        examples: twinEvents.slice(-3).map(e => e.eventType),
        firstSeen: twinEvents[0]?.timestamp || new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      existingPattern.push(newPattern);
      patterns.set(twinId, existingPattern);
      return existingPattern;
    }
  }
  return patterns.get(twinId) || [];
}

function detectAnomaly(twinId: string, event: BehaviorEvent): Anomaly | null {
  const twinEvents = events.get(twinId) || [];

  // Simple anomaly detection: unusual timing
  const hour = new Date(event.timestamp).getHours();
  if (hour < 6 || hour > 22) {
    return {
      id: generateId('anom'),
      type: 'unusual_timing',
      description: `Event ${event.eventType} at unusual hour (${hour}:00)`,
      severity: 'low',
      detectedAt: new Date().toISOString(),
      context: { hour },
    };
  }

  // Check for rapid repeated events
  const recentEvents = twinEvents.filter(
    e => e.eventType === event.eventType &&
    new Date(e.timestamp).getTime() > Date.now() - 60000
  );

  if (recentEvents.length > 5) {
    return {
      id: generateId('anom'),
      type: 'rapid_repetition',
      description: `${event.eventType} repeated ${recentEvents.length} times in 1 minute`,
      severity: 'medium',
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

function calculatePersonality(events: BehaviorEvent[]): PersonalityProfile {
  // Simplified personality calculation based on event types
  const eventTypes = events.map(e => e.eventType);

  let openness = 0.5;
  let conscientiousness = 0.5;
  let extraversion = 0.5;
  let agreeableness = 0.5;
  let neuroticism = 0.5;

  // Adjust based on event patterns
  if (eventTypes.includes('meeting')) extraversion += 0.1;
  if (eventTypes.includes('email')) agreeableness += 0.1;
  if (eventTypes.includes('task_complete')) conscientiousness += 0.2;
  if (eventTypes.includes('late_submission')) neuroticism += 0.1;
  if (eventTypes.includes('innovation')) openness += 0.2;

  // Normalize to 0-1
  openness = Math.max(0, Math.min(1, openness));
  conscientiousness = Math.max(0, Math.min(1, conscientiousness));
  extraversion = Math.max(0, Math.min(1, extraversion));
  agreeableness = Math.max(0, Math.min(1, agreeableness));
  neuroticism = Math.max(0, Math.min(1, neuroticism));

  // Determine primary type
  const traits: string[] = [];
  if (openness > 0.7) traits.push('Curious');
  if (conscientiousness > 0.7) traits.push('Organized');
  if (extraversion > 0.7) traits.push('Outgoing');
  if (agreeableness > 0.7) traits.push('Collaborative');
  if (neuroticism > 0.7) traits.push('Cautious');

  return {
    openness: Math.round(openness * 100) / 100,
    conscientiousness: Math.round(conscientiousness * 100) / 100,
    extraversion: Math.round(extraversion * 100) / 100,
    agreeableness: Math.round(agreeableness * 100) / 100,
    neuroticism: Math.round(neuroticism * 100) / 100,
    primaryType: traits[0] || 'balanced',
    traits,
  };
}

function analyzePreferences(twinId: string): Record<string, any> {
  const twinPrefs = preferences.get(twinId) || [];
  const result: Record<string, any> = {};

  twinPrefs.forEach(pref => {
    result[pref.category] = {
      value: pref.value,
      confidence: pref.confidence,
    };
  });

  return result;
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use((req: Request, _res: Response, next) => {
  (req as any).requestId = uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// ============================================================
// ROUTES
// ============================================================

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'twin-behavior-model',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      twins: behaviors.size,
      events: Array.from(events.values()).reduce((sum, e) => sum + e.length, 0),
    },
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, service: 'twin-behavior-model' });
});

// Observe behavior event
app.post('/api/behavior/observe', (req: Request, res: Response) => {
  const { twinId, eventType, data, context } = req.body;

  if (!twinId || !eventType) {
    return res.status(400).json({ error: 'twinId and eventType are required' });
  }

  const event: BehaviorEvent = {
    twinId,
    eventType,
    timestamp: new Date().toISOString(),
    data: data || {},
    context,
  };

  // Store event
  const twinEvents = events.get(twinId) || [];
  twinEvents.push(event);
  events.set(twinId, twinEvents.slice(-1000)); // Keep last 1000 events

  // Get or create behavior profile
  let behavior = behaviors.get(twinId);
  if (!behavior) {
    behavior = createBehaviorProfile(twinId);
  }

  // Detect patterns
  const detectedPatterns = detectPatterns(twinId, eventType);
  behavior.patterns = detectedPatterns;

  // Detect anomalies
  const anomaly = detectAnomaly(twinId, event);
  if (anomaly) {
    behavior.anomalies.push(anomaly);
    behavior.anomalies = behavior.anomalies.slice(-100); // Keep last 100
  }

  // Update personality if enough events
  if (twinEvents.length >= 10) {
    behavior.personality = calculatePersonality(twinEvents);
  }

  behavior.lastUpdated = new Date().toISOString();
  behaviors.set(twinId, behavior);

  res.json({
    success: true,
    event,
    patterns: detectedPatterns.length,
    anomaly: anomaly ? 'detected' : null,
  });
});

// Get behavior profile
app.get('/api/behavior/profile/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  let behavior = behaviors.get(twinId);

  if (!behavior) {
    behavior = createBehaviorProfile(twinId);
  }

  // Add calculated preferences
  behavior.preferences = analyzePreferences(twinId);

  res.json({
    success: true,
    behavior,
    eventCount: (events.get(twinId) || []).length,
  });
});

// Update personality
app.put('/api/behavior/personality/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  const personality = req.body;

  let behavior = behaviors.get(twinId);
  if (!behavior) {
    behavior = createBehaviorProfile(twinId);
  }

  behavior.personality = { ...behavior.personality, ...personality };
  behavior.lastUpdated = new Date().toISOString();
  behaviors.set(twinId, behavior);

  res.json({ success: true, personality: behavior.personality });
});

// Add preference
app.post('/api/behavior/preferences', (req: Request, res: Response) => {
  const { twinId, category, value, confidence = 0.5 } = req.body;

  if (!twinId || !category) {
    return res.status(400).json({ error: 'twinId and category are required' });
  }

  const twinPrefs = preferences.get(twinId) || [];
  const existingIndex = twinPrefs.findIndex(p => p.category === category);

  const pref: Preference = {
    category,
    value,
    confidence,
    frequency: existingIndex >= 0 ? twinPrefs[existingIndex].frequency + 1 : 1,
    lastExpressed: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    twinPrefs[existingIndex] = pref;
  } else {
    twinPrefs.push(pref);
  }

  preferences.set(twinId, twinPrefs);

  res.json({ success: true, preference: pref });
});

// Get preferences
app.get('/api/behavior/preferences/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  const twinPrefs = preferences.get(twinId) || [];
  res.json({ success: true, preferences: twinPrefs });
});

// Detect patterns
app.post('/api/behavior/patterns', (req: Request, res: Response) => {
  const { twinId } = req.body;

  if (!twinId) {
    return res.status(400).json({ error: 'twinId is required' });
  }

  const twinEvents = events.get(twinId) || [];
  const eventTypes = [...new Set(twinEvents.map(e => e.eventType))];

  const detectedPatterns: Pattern[] = [];
  eventTypes.forEach(type => {
    const patterns_ = detectPatterns(twinId, type);
    detectedPatterns.push(...patterns_);
  });

  res.json({
    success: true,
    patterns: detectedPatterns,
    count: detectedPatterns.length,
  });
});

// Detect anomalies
app.post('/api/behavior/anomalies', (req: Request, res: Response) => {
  const { twinId } = req.body;

  if (!twinId) {
    return res.status(400).json({ error: 'twinId is required' });
  }

  const behavior = behaviors.get(twinId);
  const anomalies = behavior?.anomalies || [];

  res.json({
    success: true,
    anomalies,
    count: anomalies.length,
  });
});

// Learn preferences
app.post('/api/behavior/learn', (req: Request, res: Response) => {
  const { twinId, preference } = req.body;

  if (!twinId || !preference) {
    return res.status(400).json({ error: 'twinId and preference are required' });
  }

  const twinPrefs = preferences.get(twinId) || [];
  const existingIndex = twinPrefs.findIndex(p => p.category === preference.category);

  const pref: Preference = {
    ...preference,
    confidence: Math.min(1, (preference.confidence || 0.5) + 0.1),
    frequency: existingIndex >= 0 ? twinPrefs[existingIndex].frequency + 1 : 1,
    lastExpressed: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    twinPrefs[existingIndex] = pref;
  } else {
    twinPrefs.push(pref);
  }

  preferences.set(twinId, twinPrefs);

  res.json({ success: true, learned: pref });
});

// Get events
app.get('/api/behavior/events/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  const { limit = 100, type } = req.query;

  let twinEvents = events.get(twinId) || [];

  if (type) {
    twinEvents = twinEvents.filter(e => e.eventType === type);
  }

  twinEvents = twinEvents.slice(-Number(limit));

  res.json({
    success: true,
    events: twinEvents,
    count: twinEvents.length,
  });
});

// Error handling
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Behavior Model] Error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`🎭 Twin Behavior Model v1.0.0 running on port ${PORT}`);
});

export default app;
