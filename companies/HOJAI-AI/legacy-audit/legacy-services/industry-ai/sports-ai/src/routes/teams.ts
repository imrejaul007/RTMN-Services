import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const teams = new Map();

router.get('/', (req, res) => {
  const { sport, league, status } = req.query;
  let list = Array.from(teams.values());
  if (sport) list = list.filter(t => t.sport === sport);
  if (league) list = list.filter(t => t.league === league);
  if (status) list = list.filter(t => t.status === status);
  res.json({ success: true, teams: list });
});

router.get('/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json({ success: true, team });
});

router.post('/', (req, res) => {
  const { name, sport, league, city, stadium, founded } = req.body;
  if (!name || !sport) return res.status(400).json({ error: 'Missing required fields' });

  const team = {
    teamId: uuidv4(), name, sport, league, city, stadium, founded,
    status: 'active', players: [], stats: { wins: 0, losses: 0, draws: 0 },
    createdAt: new Date().toISOString()
  };
  teams.set(team.teamId, team);
  res.status(201).json({ success: true, team });
});

router.patch('/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  Object.assign(team, req.body);
  res.json({ success: true, team });
});

export default router;
