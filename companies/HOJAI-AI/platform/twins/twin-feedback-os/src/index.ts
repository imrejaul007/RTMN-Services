import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4736', 10);
const REQUEST_ID_HEADER = 'x-request-id';

interface Feedback { id: string; employeeId: string; capability: string; capabilityArea: string; feedbackType: string; twinAction?: any; correction?: any; currentConfidence?: number; newConfidence: number; outcome: string; timestamp: string; }
interface CorrectionPattern { capability: string; trigger: string; correctResponse: string; reason?: string; context: Record<string, any>; frequency: number; lastUpdated: string; }
interface EmployeeFeedbackStore { [key: string]: Feedback[]; }

const feedbackStore: EmployeeFeedbackStore = {};
const correctionPatterns: Record<string, CorrectionPattern> = {};
let feedbackIdCounter = 1;

const app = express();

app.use((req: Request, _res: Response, next: NextFunction) => { (req as any).requestId = req.headers[REQUEST_ID_HEADER] as string || uuidv4(); next(); });
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"] } }, hsts: { maxAge: 31536000, includeSubDomains: true } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan('combined', { skip: (req: Request) => req.url === '/health' || req.url === '/ready' }));

const TWIN_SERVICES = { memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703', decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240', salarOS: process.env.SALAR_OS_URL || 'http://localhost:4710', twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735' };

const FEEDBACK_TYPES = { approve: { description: 'Twin was correct', impact: 'increases_confidence', requiresCorrection: false }, reject: { description: 'Twin was wrong', impact: 'decreases_confidence', requiresCorrection: false }, correct: { description: 'Here is the correct answer', impact: 'updates_pattern', requiresCorrection: true }, explain: { description: 'Here is why I am doing it this way', impact: 'adds_context', requiresCorrection: false }, suggest: { description: 'Try this alternative approach', impact: 'adds_option', requiresCorrection: false } };

async function fetchTwin(service: keyof typeof TWIN_SERVICES, path: string, options: RequestInit = {}): Promise<any> {
  const url = `${TWIN_SERVICES[service]}${path}`;
  try {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    return response.ok ? await response.json() : null;
  } catch (error: any) { console.error(`[Feedback] Failed to call ${service}:`, error.message); return null; }
}

function calculateNewConfidence(currentConfidence: number, feedbackType: string): number {
  const adjustments: Record<string, number> = { approve: 5, reject: -10, correct: 0, explain: 2, suggest: 1 };
  const adjustment = adjustments[feedbackType] || 0;
  return Math.max(0, Math.min(100, currentConfidence + adjustment));
}

function updateCorrectionPattern(feedback: Feedback): void {
  const key = `${feedback.employeeId}:${feedback.capability}`;
  const existing = correctionPatterns[key];
  if (existing) { existing.frequency += 1; if (feedback.correction?.reason) existing.reason = feedback.correction.reason; existing.lastUpdated = new Date().toISOString(); }
  else { correctionPatterns[key] = { capability: feedback.capability, trigger: feedback.twinAction?.context || feedback.twinAction?.description || '', correctResponse: feedback.correction?.value || '', reason: feedback.correction?.reason, context: feedback.correction?.context || {}, frequency: 1, lastUpdated: new Date().toISOString() }; }
}

async function applyFeedbackToTwins(feedback: Feedback): Promise<string[]> {
  const updates: string[] = [];
  if (feedback.feedbackType === 'correct' || feedback.feedbackType === 'explain') { await fetchTwin('memoryOS', '/api/memories', { method: 'POST', body: JSON.stringify({ twinId: feedback.employeeId, type: 'feedback_correction', data: { capability: feedback.capability, correction: feedback.correction, timestamp: feedback.timestamp } }) }); updates.push('memoryOS'); }
  if (feedback.capabilityArea === 'decision') { await fetchTwin('decisionEngine', '/api/decisions/feedback', { method: 'POST', body: JSON.stringify({ employeeId: feedback.employeeId, decisionId: feedback.twinAction?.id, feedback: feedback.feedbackType, correction: feedback.correction }) }); updates.push('decisionEngine'); }
  if (feedback.capabilityArea === 'skill') { const newConfidence = calculateNewConfidence(feedback.currentConfidence || 70, feedback.feedbackType); await fetchTwin('salarOS', `/api/human-twin/${feedback.employeeId}/confidence`, { method: 'PATCH', body: JSON.stringify({ capability: feedback.capability, confidence: newConfidence }) }); updates.push('salarOS'); }
  return updates;
}

interface AppError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction): void => { console.error(`[Error] ${(_req as any).requestId}:`, { message: err.message }); res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal server error', requestId: (_req as any).requestId }); };
app.use((_req: Request, res: Response) => { res.status(404).json({ success: false, error: 'Not found' }); });
app.use(errorHandler);

app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'healthy', service: 'twin-feedback-os', version: '1.0.0', timestamp: new Date().toISOString(), feedbackTypes: Object.keys(FEEDBACK_TYPES), totalFeedback: Object.keys(feedbackStore).reduce((sum, emp) => sum + feedbackStore[emp].length, 0), patterns: Object.keys(correctionPatterns).length }); });
app.get('/ready', (_req: Request, res: Response) => { res.json({ ready: true, service: 'twin-feedback-os', timestamp: new Date().toISOString() }); });

app.post('/api/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, capability, capabilityArea, feedbackType, twinAction, correction, currentConfidence } = req.body;
    if (!employeeId || !capability || !feedbackType) { const e: AppError = new Error('Missing required fields: employeeId, capability, feedbackType'); e.statusCode = 400; throw e; }
    if (!FEEDBACK_TYPES[feedbackType]) { const e: AppError = new Error(`Invalid feedbackType. Valid: ${Object.keys(FEEDBACK_TYPES).join(', ')}`); e.statusCode = 400; throw e; }
    if (FEEDBACK_TYPES[feedbackType].requiresCorrection && !correction) { const e: AppError = new Error(`Feedback type '${feedbackType}' requires a correction object`); e.statusCode = 400; throw e; }
    const feedback: Feedback = { id: `fb_${feedbackIdCounter++}`, employeeId, capability, capabilityArea: capabilityArea || 'general', feedbackType, twinAction, correction, currentConfidence, newConfidence: calculateNewConfidence(currentConfidence || 70, feedbackType), outcome: 'applied', timestamp: new Date().toISOString() };
    if (!feedbackStore[employeeId]) feedbackStore[employeeId] = [];
    feedbackStore[employeeId].push(feedback);
    if (feedbackType === 'correct' || feedbackType === 'explain') updateCorrectionPattern(feedback);
    const twinUpdates = await applyFeedbackToTwins(feedback);
    res.status(201).json({ success: true, data: { feedbackId: feedback.id, feedbackType, newConfidence: feedback.newConfidence, twinsUpdated: twinUpdates, patternLearned: feedbackType === 'correct' || feedbackType === 'explain' } });
  } catch (err) { next(err); }
});

app.post('/api/feedback/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { feedback: feedbackList } = req.body;
    if (!Array.isArray(feedbackList)) { const e: AppError = new Error('Feedback must be an array'); e.statusCode = 400; throw e; }
    const results = [];
    for (const fb of feedbackList) { try { const result = await applyFeedbackToTwins(fb); results.push({ employeeId: fb.employeeId, success: true, twinsUpdated: result }); } catch (e: any) { results.push({ employeeId: fb.employeeId, success: false, error: e.message }); } }
    res.status(201).json({ success: true, processed: feedbackList.length, results });
  } catch (err) { next(err); }
});

app.get('/api/feedback/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore[employeeId] || [];
  const byType: Record<string, number> = { approve: 0, reject: 0, correct: 0, explain: 0, suggest: 0 };
  for (const fb of feedback) byType[fb.feedbackType] = (byType[fb.feedbackType] || 0) + 1;
  res.json({ success: true, data: { employeeId, totalFeedback: feedback.length, byType, recent: feedback.slice(-10).reverse() } });
});

app.get('/api/patterns/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const patterns = Object.entries(correctionPatterns).filter(([key]) => key.startsWith(`${employeeId}:`)).map(([key, pattern]) => ({ ...pattern, key }));
  res.json({ success: true, data: { employeeId, patterns, total: patterns.length } });
});

app.get('/api/confidence/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore[employeeId] || [];
  const confidenceByCapability: Record<string, any> = {};
  for (const fb of feedback) {
    if (!confidenceByCapability[fb.capability]) confidenceByCapability[fb.capability] = { capability: fb.capability, currentConfidence: 70, totalFeedback: 0, approvals: 0, rejections: 0 };
    const cap = confidenceByCapability[fb.capability];
    cap.totalFeedback += 1; cap.currentConfidence = fb.newConfidence;
    if (fb.feedbackType === 'approve') cap.approvals += 1;
    if (fb.feedbackType === 'reject') cap.rejections += 1;
  }
  const capabilities = Object.values(confidenceByCapability);
  const overallConfidence = capabilities.length > 0 ? Math.round(capabilities.reduce((sum, c) => sum + c.currentConfidence, 0) / capabilities.length) : 0;
  res.json({ success: true, data: { employeeId, overallConfidence, capabilities, totalFeedback: feedback.length } });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  let totalFeedback = 0; const typeCount: Record<string, number> = {}; const capabilityCount: Record<string, number> = {};
  for (const feedback of Object.values(feedbackStore)) { totalFeedback += feedback.length; for (const fb of feedback) { typeCount[fb.feedbackType] = (typeCount[fb.feedbackType] || 0) + 1; capabilityCount[fb.capability] = (capabilityCount[fb.capability] || 0) + 1; } }
  const topCapabilities = Object.entries(capabilityCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cap, count]) => ({ capability: cap, count }));
  res.json({ success: true, data: { totalFeedback, employeesProvidingFeedback: Object.keys(feedbackStore).length, feedbackByType: typeCount, topCapabilities, patternsLearned: Object.keys(correctionPatterns).length } });
});

app.get('/api/rlhf/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore[employeeId] || [];
  const examples = feedback.filter((fb: Feedback) => fb.feedbackType === 'correct' || fb.feedbackType === 'reject').map((fb: Feedback) => ({ instruction: fb.twinAction?.description || '', input: fb.twinAction?.context || {}, output_preferred: fb.correction?.value || null, output_rejected: fb.feedbackType === 'reject' ? fb.twinAction?.value || null : null, metadata: { capability: fb.capability, reason: fb.correction?.reason, timestamp: fb.timestamp } }));
  res.json({ success: true, data: { employeeId, trainingExamples: examples.length, examples } });
});

let server: any;
const gracefulShutdown = (signal: string) => { console.log(`\n[${signal}] Received shutdown signal...`); if (server) { server.close(() => { console.log('[Feedback] Server closed'); process.exit(0); }); setTimeout(() => { console.error('[Feedback] Forced shutdown'); process.exit(1); }, 30000); } else process.exit(0); };
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server = app.listen(PORT, () => { console.log(`\n╔═══════════════════════════════════════════════════════════════╗\n║              Twin Feedback OS - Started                      ║\n╠═══════════════════════════════════════════════════════════════╣\n║  Port: ${PORT}                                              ║\n║  Feedback Types: approve, reject, correct, explain, suggest ║\n╚═══════════════════════════════════════════════════════════════╝`); });

export default app;
