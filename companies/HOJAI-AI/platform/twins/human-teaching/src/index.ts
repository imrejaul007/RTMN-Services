/**
 * Human Teaching Service
 * Port: 4748
 *
 * Enables employees to teach their twins through:
 * - Screen recordings with voice
 * - Step-by-step guidance
 * - Knowledge extraction
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4748', 10);
app.use(express.json());

// Types
interface TeachingSession {
  id: string;
  employeeId: string;
  twinId: string;
  topic: string;
  description: string;
  type: 'screen_recording' | 'voice_explanation' | 'step_by_step' | 'document_upload';
  status: 'draft' | 'recording' | 'completed' | 'processing' | 'published';
  duration: number;
  frames: { timestamp: number; description: string; keyPoints: string[] }[];
  voiceSegments: { start: number; end: number; text: string; confidence: number }[];
  explanations: { timestamp: number; text: string; topic: string }[];
  extractedKnowledge: { concept: string; description: string; confidence: number }[];
  linkedTwins: string[];
  createdAt: string;
  completedAt?: string;
}

interface TeachingStep {
  id: string;
  sessionId: string;
  order: number;
  description: string;
  screenshot?: string;
  voiceNote?: string;
  keyPoints: string[];
  linkedKnowledge?: string[];
}

interface ExtractedKnowledge {
  id: string;
  sessionId: string;
  employeeId: string;
  concept: string;
  description: string;
  type: 'skill' | 'workflow' | 'decision' | 'preference' | 'rule';
  source: 'screen' | 'voice' | 'document';
  confidence: number;
  validated: boolean;
  usedForTwin: string[];
  createdAt: string;
}

// Storage
const sessions = new Map<string, TeachingSession>();
const steps = new Map<string, TeachingStep>();
const extractedKnowledge = new Map<string, ExtractedKnowledge[]>();

// Middleware
app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

// Health
app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'human-teaching',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  stats: { sessions: sessions.size, knowledge: extractedKnowledge.size }
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ SESSIONS ============

/**
 * Create teaching session
 */
app.post('/api/teaching/sessions', (req, res) => {
  const { employeeId, twinId, topic, description, type } = req.body;

  if (!employeeId || !topic) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'employeeId and topic are required' } });
  }

  const session: TeachingSession = {
    id: uuidv4(),
    employeeId,
    twinId: twinId || '',
    topic,
    description: description || '',
    type: type || 'screen_recording',
    status: 'draft',
    duration: 0,
    frames: [],
    voiceSegments: [],
    explanations: [],
    extractedKnowledge: [],
    linkedTwins: [],
    createdAt: new Date().toISOString()
  };

  sessions.set(session.id, session);
  res.status(201).json({ success: true, data: session });
});

/**
 * Start recording
 */
app.post('/api/teaching/sessions/:id/start', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  session.status = 'recording';
  res.json({ success: true, data: session });
});

/**
 * Stop recording
 */
app.post('/api/teaching/sessions/:id/stop', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  res.json({ success: true, data: session });
});

/**
 * Get session
 */
app.get('/api/teaching/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  // Include steps
  const sessionSteps = Array.from(steps.values())
    .filter(s => s.sessionId === req.params.id)
    .sort((a, b) => a.order - b.order);

  res.json({ success: true, data: { ...session, steps: sessionSteps } });
});

/**
 * List sessions for employee
 */
app.get('/api/teaching/sessions', (req, res) => {
  const { employeeId, status, twinId } = req.query;
  let all = Array.from(sessions.values());

  if (employeeId) all = all.filter(s => s.employeeId === employeeId);
  if (status) all = all.filter(s => s.status === status);
  if (twinId) all = all.filter(s => s.twinId === twinId);

  res.json({ success: true, data: { sessions: all, total: all.length } });
});

// ============ FRAMES (Screen Recording) ============

/**
 * Add frame
 */
app.post('/api/teaching/sessions/:id/frames', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  const { timestamp, description, keyPoints } = req.body;

  session.frames.push({
    timestamp: timestamp || Date.now(),
    description: description || '',
    keyPoints: keyPoints || []
  });

  res.status(201).json({ success: true, data: { frameAdded: true, totalFrames: session.frames.length } });
});

// ============ VOICE SEGMENTS ============

/**
 * Add voice segment (transcription)
 */
app.post('/api/teaching/sessions/:id/voice', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  const { start, end, text, confidence } = req.body;

  session.voiceSegments.push({
    start: start || 0,
    end: end || 0,
    text: text || '',
    confidence: confidence || 80
  });

  res.status(201).json({ success: true, data: { segmentAdded: true, totalSegments: session.voiceSegments.length } });
});

// ============ EXPLANATIONS ============

/**
 * Add explanation
 */
app.post('/api/teaching/sessions/:id/explanations', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  const { timestamp, text, topic } = req.body;

  session.explanations.push({
    timestamp: timestamp || Date.now(),
    text: text || '',
    topic: topic || ''
  });

  res.status(201).json({ success: true, data: { explanationAdded: true, total: session.explanations.length } });
});

// ============ EXTRACT KNOWLEDGE ============

/**
 * Extract knowledge from session (AI processing)
 */
app.post('/api/teaching/sessions/:id/extract', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });

  session.status = 'processing';

  // Simulate AI extraction from explanations and voice
  const extracted = [];

  // Extract from explanations
  session.explanations.forEach(exp => {
    if (exp.topic || exp.text.length > 20) {
      extracted.push({
        concept: exp.topic || `Concept ${extracted.length + 1}`,
        description: exp.text,
        confidence: 75
      });
    }
  });

  // Extract from voice segments
  session.voiceSegments.forEach(seg => {
    if (seg.text.length > 10) {
      extracted.push({
        concept: `Knowledge from voice`,
        description: seg.text,
        confidence: seg.confidence
      });
    }
  });

  // Extract from key points
  session.frames.forEach(frame => {
    frame.keyPoints.forEach(kp => {
      extracted.push({
        concept: kp,
        description: frame.description,
        confidence: 80
      });
    });
  });

  session.extractedKnowledge = extracted;
  session.status = 'completed';

  // Store extracted knowledge
  const existing = extractedKnowledge.get(session.employeeId) || [];
  extractedKnowledge.set(session.employeeId, [...existing, ...extracted.map(e => ({
    id: uuidv4(),
    sessionId: session.id,
    employeeId: session.employeeId,
    concept: e.concept,
    description: e.description,
    type: 'skill' as const,
    source: 'voice' as const,
    confidence: e.confidence,
    validated: false,
    usedForTwin: [],
    createdAt: new Date().toISOString()
  }))]);

  res.json({ success: true, data: { extracted: extracted.length, knowledge: session.extractedKnowledge } });
});

// ============ STEPS ============

/**
 * Add step to session
 */
app.post('/api/teaching/sessions/:sessionId/steps', (req, res) => {
  const { description, screenshot, voiceNote, keyPoints } = req.body;

  const sessionSteps = Array.from(steps.values()).filter(s => s.sessionId === req.params.sessionId);

  const step: TeachingStep = {
    id: uuidv4(),
    sessionId: req.params.sessionId,
    order: sessionSteps.length + 1,
    description: description || '',
    screenshot,
    voiceNote,
    keyPoints: keyPoints || []
  };

  steps.set(step.id, step);
  res.status(201).json({ success: true, data: step });
});

/**
 * Get steps for session
 */
app.get('/api/teaching/sessions/:sessionId/steps', (req, res) => {
  const sessionSteps = Array.from(steps.values())
    .filter(s => s.sessionId === req.params.sessionId)
    .sort((a, b) => a.order - b.order);

  res.json({ success: true, data: { steps: sessionSteps, total: sessionSteps.length } });
});

// ============ VALIDATE KNOWLEDGE ============

/**
 * Validate extracted knowledge
 */
app.post('/api/teaching/knowledge/:knowledgeId/validate', (req, res) => {
  const { employeeId, validated } = req.body;

  // Find and update knowledge
  for (const [empId, knowledges] of extractedKnowledge.entries()) {
    const idx = knowledges.findIndex(k => k.id === req.params.knowledgeId);
    if (idx !== -1) {
      knowledges[idx].validated = validated !== false;
      res.json({ success: true, data: knowledges[idx] });
      return;
    }
  }

  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge not found' } });
});

/**
 * Get all knowledge for employee
 */
app.get('/api/teaching/knowledge/:employeeId', (req, res) => {
  const knowledges = extractedKnowledge.get(req.params.employeeId) || [];
  const { validated, type } = req.query;

  let filtered = knowledges;
  if (validated !== undefined) filtered = filtered.filter(k => k.validated === (validated === 'true'));
  if (type) filtered = filtered.filter(k => k.type === type);

  res.json({ success: true, data: { knowledge: filtered, total: filtered.length } });
});

// ============ LINK TO TWINS ============

/**
 * Link knowledge to twins
 */
app.post('/api/teaching/knowledge/:knowledgeId/link', (req, res) => {
  const { twinId } = req.body;

  for (const [empId, knowledges] of extractedKnowledge.entries()) {
    const knowledge = knowledges.find(k => k.id === req.params.knowledgeId);
    if (knowledge) {
      if (!knowledge.usedForTwin.includes(twinId)) {
        knowledge.usedForTwin.push(twinId);
      }
      res.json({ success: true, data: knowledge });
      return;
    }
  }

  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge not found' } });
});

// Catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Human Teaching Service - Started                   ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Screen Recording, Voice, Knowledge Extraction    ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
