/**
 * Culture OS - Company Values and Culture Management
 * Port: 4870
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4870;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Value { id: string; name: string; description: string; priority: number; active: boolean; examples: string[]; }
interface CultureSurvey { id: string; title: string; questions: { id: string; text: string; type: string }[]; responses: number; }
interface AlignmentScore { userId: string; valueId: string; score: number; date: string; }

const values = new Map<string, Value>();
const surveys = new Map<string, CultureSurvey>();
const alignmentScores = new Map<string, AlignmentScore[]>();

// Seed default values
const defaultValues = [
  { id: 'v1', name: 'Customer First', description: 'We always prioritize customer needs', priority: 1, active: true, examples: ['24/7 support', 'Quick resolution', 'Customer feedback loops'] },
  { id: 'v2', name: 'Innovation', description: 'We embrace change and continuous improvement', priority: 2, active: true, examples: ['Weekly hackathons', '20% time for experiments', 'Failure is learning'] },
  { id: 'v3', name: 'Transparency', description: 'We communicate openly and honestly', priority: 3, active: true, examples: ['All-hands meetings', 'Open financials', 'Honest feedback'] },
  { id: 'v4', name: 'Teamwork', description: 'We achieve more together', priority: 4, active: true, examples: ['Cross-functional teams', 'Pair programming', 'Knowledge sharing'] },
];
defaultValues.forEach(v => values.set(v.id, v));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'culture-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), values: values.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/values', (req, res) => {
  let result = Array.from(values.values()).filter(v => v.active);
  if (req.query.sort === 'priority') result.sort((a, b) => a.priority - b.priority);
  res.json({ values: result });
});

app.get('/api/values/:id', (req, res) => {
  const value = values.get(req.params.id);
  if (!value) return res.status(404).json({ error: 'Not found' });
  res.json(value);
});

app.post('/api/values', (req, res) => {
  const { name, description, examples } = req.body;
  const id = uuidv4();
  const priority = values.size + 1;
  values.set(id, { id, name, description, priority, active: true, examples: examples || [] });
  res.status(201).json(values.get(id));
});

app.put('/api/values/:id', (req, res) => {
  const value = values.get(req.params.id);
  if (!value) return res.status(404).json({ error: 'Not found' });
  Object.assign(value, req.body);
  res.json(value);
});

app.get('/api/alignment', (req, res) => {
  const { userId } = req.query;
  const scores = alignmentScores.get(userId as string) || [];
  const avgScore = scores.length > 0 ? scores.reduce((s, a) => s + a.score, 0) / scores.length : 0;
  res.json({ userId, scores, averageScore: Math.round(avgScore) });
});

app.post('/api/alignment', (req, res) => {
  const { userId, valueId, score } = req.body;
  if (!userId || !valueId || score === undefined) return res.status(400).json({ error: 'userId, valueId, score required' });
  const key = userId;
  if (!alignmentScores.has(key)) alignmentScores.set(key, []);
  alignmentScores.get(key)!.push({ userId, valueId, score, date: new Date().toISOString() });
  res.json({ success: true });
});

app.get('/api/surveys', (_req, res) => res.json({ surveys: Array.from(surveys.values()) }));
app.post('/api/surveys', (req, res) => {
  const { title, questions } = req.body;
  const id = uuidv4();
  surveys.set(id, { id, title, questions: questions || [], responses: 0 });
  res.status(201).json(surveys.get(id));
});

app.get('/api/stats', (_req, res) => {
  const allValues = Array.from(values.values());
  res.json({ totalValues: allValues.length, activeValues: allValues.filter(v => v.active).length, totalSurveys: surveys.size });
});

app.listen(PORT, () => console.log(`[culture-os] listening on :${PORT}`));
export default app;