import { requireAuth } from '@rtmn/shared/auth';
/**
 * Culture OS - Production Implementation
 * Company values, surveys, alignment tracking
 * Port: 4870
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4870;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface Value { id: string; name: string; description: string; priority: number; active: boolean; examples: string[]; color: string; icon?: string; createdAt: string; }
interface CultureSurvey { id: string; title: string; description: string; questions: SurveyQuestion[]; responses: number; status: 'draft' | 'active' | 'closed'; deadline?: string; createdAt: string; }
interface SurveyQuestion { id: string; text: string; type: 'rating' | 'text' | 'multiple_choice'; options?: string[]; required: boolean; }
interface AlignmentScore { userId: string; valueId: string; score: number; date: string; evidence?: string; }
interface SurveyResponse { id: string; surveyId: string; userId: string; answers: Record<string, unknown>; submittedAt: string; }
interface CulturalEvent { id: string; title: string; description: string; date: string; type: 'celebration' | 'workshop' | 'team_building' | 'recognition'; attendees: string[]; }

const values = new Map<string, Value>();
const surveys = new Map<string, CultureSurvey>();
const alignmentScores = new Map<string, AlignmentScore[]>();
const surveyResponses = new Map<string, SurveyResponse>();
const culturalEvents = new Map<string, CulturalEvent>();

// Seed values
const seedValues: Value[] = [
  { id: 'v1', name: 'Customer First', description: 'We always prioritize customer needs', priority: 1, active: true, examples: ['24/7 support', 'Quick resolution', 'Customer feedback loops'], color: '#0066FF', createdAt: new Date().toISOString() },
  { id: 'v2', name: 'Innovation', description: 'We embrace change and continuous improvement', priority: 2, active: true, examples: ['Weekly hackathons', '20% time for experiments', 'Failure is learning'], color: '#FF6B35', createdAt: new Date().toISOString() },
  { id: 'v3', name: 'Transparency', description: 'We communicate openly and honestly', priority: 3, active: true, examples: ['All-hands meetings', 'Open financials', 'Honest feedback'], color: '#00AA66', createdAt: new Date().toISOString() },
  { id: 'v4', name: 'Teamwork', description: 'We achieve more together', priority: 4, active: true, examples: ['Cross-functional teams', 'Pair programming', 'Knowledge sharing'], color: '#9B59B6', createdAt: new Date().toISOString() },
  { id: 'v5', name: 'Excellence', description: 'We deliver exceptional quality', priority: 5, active: true, examples: ['High standards', 'Continuous learning', 'Best practices'], color: '#F1C40F', createdAt: new Date().toISOString() },
];
seedValues.forEach(v => values.set(v.id, v));

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'culture-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), values: values.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ VALUES ============
app.get('/api/values', (req, res) => {
  let result = Array.from(values.values()).filter(v => v.active);
  if (req.query.sort === 'priority') result.sort((a, b) => a.priority - b.priority);
  res.json({ total: result.length, values: result });
});

app.get('/api/values/:id', (req, res) => {
  const value = values.get(req.params.id);
  if (!value) return res.status(404).json({ error: 'Value not found' });
  res.json(value);
});

app.post('/api/values',requireAuth,  (req, res) => {
  const { name, description, examples, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  const priority = values.size + 1;
  values.set(id, { id, name, description: description || '', priority, active: true, examples: examples || [], color: color || '#888888', createdAt: new Date().toISOString() });
  res.status(201).json(values.get(id));
});

app.put('/api/values/:id',requireAuth,  (req, res) => {
  const value = values.get(req.params.id);
  if (!value) return res.status(404).json({ error: 'Value not found' });
  Object.assign(value, req.body);
  res.json(value);
});

app.delete('/api/values/:id',requireAuth,  (req, res) => {
  const value = values.get(req.params.id);
  if (!value) return res.status(404).json({ error: 'Value not found' });
  value.active = false;
  res.json({ success: true });
});

// ============ ALIGNMENT ============
app.get('/api/alignment', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const scores = alignmentScores.get(userId as string) || [];
  const avgScore = scores.length > 0 ? scores.reduce((s, a) => s + a.score, 0) / scores.length : 0;
  res.json({ userId, scores, averageScore: Math.round(avgScore) });
});

app.post('/api/alignment',requireAuth,  (req, res) => {
  const { userId, valueId, score, evidence } = req.body;
  if (!userId || !valueId || score === undefined) return res.status(400).json({ error: 'userId, valueId, score required' });
  if (!alignmentScores.has(userId)) alignmentScores.set(userId, []);
  alignmentScores.get(userId)!.push({ userId, valueId, score: Math.min(100, Math.max(0, score)), date: new Date().toISOString(), evidence });
  res.json({ success: true });
});

app.get('/api/alignment/org', (_req, res) => {
  const allScores: { valueId: string; totalScore: number; count: number }[] = [];
  for (const scores of alignmentScores.values()) {
    for (const s of scores) {
      const existing = allScores.find(a => a.valueId === s.valueId);
      if (existing) { existing.totalScore += s.score; existing.count++; }
      else allScores.push({ valueId: s.valueId, totalScore: s.score, count: 1 });
    }
  }
  const result = allScores.map(a => ({
    valueId: a.valueId,
    value: values.get(a.valueId),
    averageScore: Math.round(a.totalScore / a.count),
  })).filter(a => a.value);
  res.json({ alignment: result });
});

// ============ SURVEYS ============
app.get('/api/surveys', (req, res) => {
  let result = Array.from(surveys.values());
  if (req.query.status) result = result.filter(s => s.status === req.query.status);
  res.json({ total: result.length, surveys: result });
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = surveys.get(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  const responses = Array.from(surveyResponses.values()).filter(r => r.surveyId === survey.id);
  res.json({ ...survey, responses: responses.length });
});

app.post('/api/surveys',requireAuth,  (req, res) => {
  const { title, description, questions, deadline } = req.body;
  if (!title || !questions?.length) return res.status(400).json({ error: 'title, questions required' });
  const id = uuidv4();
  const survey: CultureSurvey = { id, title, description: description || '', questions, responses: 0, status: 'draft', deadline, createdAt: new Date().toISOString() };
  surveys.set(id, survey);
  res.status(201).json(survey);
});

app.post('/api/surveys/:id/publish',requireAuth,  (req, res) => {
  const survey = surveys.get(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  survey.status = 'active';
  res.json(survey);
});

app.post('/api/surveys/:id/close',requireAuth,  (req, res) => {
  const survey = surveys.get(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  survey.status = 'closed';
  res.json(survey);
});

app.post('/api/surveys/:id/respond',requireAuth,  (req, res) => {
  const survey = surveys.get(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  if (survey.status !== 'active') return res.status(400).json({ error: 'Survey not active' });

  const { userId, answers } = req.body;
  if (!userId || !answers) return res.status(400).json({ error: 'userId, answers required' });

  const id = uuidv4();
  surveyResponses.set(id, { id, surveyId: survey.id, userId, answers, submittedAt: new Date().toISOString() });
  survey.responses++;

  res.status(201).json({ success: true });
});

app.get('/api/surveys/:id/results', (req, res) => {
  const survey = surveys.get(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  const responses = Array.from(surveyResponses.values()).filter(r => r.surveyId === survey.id);
  const results: Record<string, { type: string; answers: unknown[] }> = {};
  for (const q of survey.questions) {
    results[q.id] = { type: q.type, answers: responses.map(r => r.answers[q.id]).filter(Boolean) };
  }
  res.json({ survey, responses: responses.length, results });
});

// ============ EVENTS ============
app.get('/api/events', (req, res) => {
  let result = Array.from(culturalEvents.values());
  if (req.query.type) result = result.filter(e => e.type === req.query.type);
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json({ total: result.length, events: result });
});

app.post('/api/events',requireAuth,  (req, res) => {
  const { title, description, date, type, attendees } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'title, date required' });
  const id = uuidv4();
  culturalEvents.set(id, { id, title, description: description || '', date, type: type || 'celebration', attendees: attendees || [] });
  res.status(201).json(culturalEvents.get(id));
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const allValues = Array.from(values.values());
  const allSurveys = Array.from(surveys.values());
  const allResponses = Array.from(surveyResponses.values());
  res.json({
    activeValues: allValues.filter(v => v.active).length,
    totalSurveys: allSurveys.length,
    activeSurveys: allSurveys.filter(s => s.status === 'active').length,
    totalResponses: allResponses.length,
    culturalEvents: culturalEvents.size,
    employeeCount: alignmentScores.size,
  });
});

app.listen(PORT, () => console.log(`[culture-os] listening on :${PORT}`));
export default app;