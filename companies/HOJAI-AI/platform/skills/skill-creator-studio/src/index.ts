/**
 * Skill Creator Studio Service
 * Port: 4754
 * Enables employees to create, test, and publish skills
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4754', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface SkillDraft { id: string; name: string; description: string; tools: string[]; category: string; status: 'draft' | 'testing' | 'published'; createdAt: string; }
const drafts = new Map<string, SkillDraft>();

function generateId(p: string) { return `${p}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`; }

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'skill-creator-studio', version: '1.0.0' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/creator/drafts', (req: Request, res: Response) => {
  const { name, description, tools, category } = req.body;
  const draft: SkillDraft = { id: generateId('draft'), name: name || '', description: description || '', tools: tools || [], category: category || 'general', status: 'draft', createdAt: new Date().toISOString() };
  drafts.set(draft.id, draft);
  res.status(201).json({ success: true, data: draft });
});

app.get('/api/creator/drafts/:id', (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  res.json({ success: true, data: draft });
});

app.patch('/api/creator/drafts/:id', (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  Object.assign(draft, req.body);
  res.json({ success: true, data: draft });
});

app.post('/api/creator/test/:draftId', (req, res) => {
  const draft = drafts.get(req.params.draftId);
  if (!draft) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  draft.status = 'testing';
  res.json({ success: true, data: { testId: generateId('test'), draftId: draft.id, status: 'testing', results: { passed: true, message: 'Test passed (would run in sandbox)' } });
});

app.post('/api/creator/publish/:draftId', (req, res) => {
  const draft = drafts.get(req.params.draftId);
  if (!draft) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  draft.status = 'published';
  res.json({ success: true, data: { published: true, skillId: draft.id, marketplace: 'BAM' } });
});

app.get('/api/creator/skills', (req, res) => {
  const { status } = req.query;
  let all = Array.from(drafts.values());
  if (status) all = all.filter(d => d.status === status);
  res.json({ success: true, data: { skills: all, total: all.length } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => console.log(`Skill Creator Studio - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
export default app;
