import { requireAuth } from '@rtmn/shared/auth';
/**
 * Twin Shadow Mode - Port: 4762
 * Watch mode - observe without acting
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4762', 10);
app.use(express.json());

interface ShadowSession { id: string; employeeId: string; startedAt: string; status: 'active' | 'paused' | 'ended'; suggestions: number; accepted: number; }
interface Suggestion { id: string; sessionId: string; description: string; confidence: number; status: 'pending' | 'accepted' | 'rejected'; }
const sessions = new Map<string, ShadowSession>();
const suggestions = new Map<string, Suggestion>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'twin-shadow-mode' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/shadow/sessions',requireAuth,  (req: Request, res: Response) => {
  const { employeeId } = req.body;
  const session: ShadowSession = { id: `s_${Date.now()}`, employeeId, startedAt: new Date().toISOString(), status: 'active', suggestions: 0, accepted: 0 };
  sessions.set(session.id, session);
  res.status(201).json({ success: true, data: session });
});

app.post('/api/shadow/sessions/:sessionId/suggest',requireAuth,  (req: Request, res: Response) => {
  const { description, confidence } = req.body;
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const s: Suggestion = { id: `sg_${Date.now()}`, sessionId: session.id, description, confidence: confidence || 50, status: 'pending' };
  suggestions.set(s.id, s);
  session.suggestions++;
  res.status(201).json({ success: true, data: s });
});

app.post('/api/shadow/suggestions/:id/accept',requireAuth,  (req, res) => {
  const s = suggestions.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Not found' });
  s.status = 'accepted';
  const session = sessions.get(s.sessionId);
  if (session) session.accepted++;
  res.json({ success: true, data: s });
});

app.post('/api/shadow/sessions/:sessionId/end',requireAuth,  (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Not found' });
  session.status = 'ended';
  res.json({ success: true, data: { sessionId: session.id, duration: Date.now() - new Date(session.startedAt).getTime() } });
});

app.get('/api/shadow/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: 'Not found' });
  const sessionSuggestions = Array.from(suggestions.values()).filter(s => s.sessionId === session.id);
  res.json({ success: true, data: { session, suggestions: sessionSuggestions } });
});

const server = app.listen(PORT, () => console.log(`Twin Shadow Mode - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
