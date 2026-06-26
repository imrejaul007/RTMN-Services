/**
 * InnovationOS - Port: 4865
 * Ideas, pilots, R&D tracking
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const app = express();
const PORT = parseInt(process.env.PORT || '4865', 10);
app.use(express.json());
interface Idea { id: string; title: string; description: string; category: string; status: 'idea' | 'pilot' | 'scale' | 'archived'; impact: number; effort: number; roi: number; metrics: any; }
const ideas = new Map();
app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'innovation-os' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));
app.get('/api/ideas', (req, res) => {
  let all = Array.from(ideas.values());
  if (req.query.status) all = all.filter(i => i.status === req.query.status);
  res.json({ success: true, data: { ideas: all, total: all.length } });
});
app.post('/api/ideas', (req, res) => {
  const idea: Idea = { id: uuidv4(), ...req.body, status: 'idea' };
  ideas.set(idea.id, idea);
  res.status(201).json({ success: true, data: idea });
});
app.patch('/api/ideas/:id', (req, res) => {
  const idea = ideas.get(req.params.id);
  if (!idea) return res.status(404).json({ success: false });
  Object.assign(idea, req.body);
  res.json({ success: true, data: idea });
});
const server = app.listen(PORT, () => console.log(`InnovationOS - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
