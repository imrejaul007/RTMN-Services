import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const players = new Map();

router.get('/', (req, res) => {
  const { teamId, position, status } = req.query;
  let list = Array.from(players.values());
  if (teamId) list = list.filter(p => p.teamId === teamId);
  if (position) list = list.filter(p => p.position === position);
  if (status) list = list.filter(p => p.status === status);
  res.json({ success: true, players: list });
});

router.get('/:id', (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json({ success: true, player });
});

router.post('/', (req, res) => {
  const { name, teamId, position, age, nationality, jerseyNumber } = req.body;
  if (!name || !teamId) return res.status(400).json({ error: 'Missing required fields' });

  const player = {
    playerId: uuidv4(), name, teamId, position, age, nationality, jerseyNumber,
    status: 'active', stats: { matches: 0, goals: 0, assists: 0 },
    performance: { rating: 0, form: 'N/A' },
    createdAt: new Date().toISOString()
  };
  players.set(player.playerId, player);
  res.status(201).json({ success: true, player });
});

router.post('/:id/performance', (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const { rating, goals, assists } = req.body;
  player.stats.matches++;
  if (goals) player.stats.goals += goals;
  if (assists) player.stats.assists += assists;
  if (rating) player.performance.rating = rating;
  res.json({ success: true, player });
});

export default router;
