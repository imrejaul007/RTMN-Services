/**
 * Agency Mode - Multi-agent orchestration
 * Port 4640
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4640;
app.use(express.json());

const teams = new Map();

app.post('/api/teams', (req, res) => {
  const { name, mission, agents, size } = req.body;
  const team = { id: uuidv4(), name, mission, agents: agents || [], status: 'forming', createdAt: new Date().toISOString() };
  teams.set(team.id, team);
  res.json(team);
});

app.get('/api/teams', (req, res) => res.json({ teams: Array.from(teams.values()) }));
app.get('/api/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  team ? res.json(team) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/teams/:id/assign', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Not found' });
  const { task, agentId } = req.body;
  const result = { id: uuidv4(), task, agentId, status: 'completed', result: 'Task completed by agent' };
  res.json(result);
});

app.listen(PORT, () => console.log(`Agency Mode running on port ${PORT}`));
export default app;