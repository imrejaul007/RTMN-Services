import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const matches = new Map();

router.get('/', (req, res) => {
  const { teamId, status, date } = req.query;
  let list = Array.from(matches.values());
  if (teamId) list = list.filter(m => m.homeTeam === teamId || m.awayTeam === teamId);
  if (status) list = list.filter(m => m.status === status);
  res.json({ success: true, matches: list });
});

router.get('/:id', (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json({ success: true, match });
});

router.post('/', (req, res) => {
  const { homeTeam, awayTeam, date, venue, league } = req.body;
  if (!homeTeam || !awayTeam || !date) return res.status(400).json({ error: 'Missing required fields' });

  const match = {
    matchId: uuidv4(), homeTeam, awayTeam, date, venue, league,
    status: 'scheduled', score: { home: 0, away: 0 },
    events: [], ticketPrice: { min: 500, max: 5000 },
    createdAt: new Date().toISOString()
  };
  matches.set(match.matchId, match);
  res.status(201).json({ success: true, match });
});

router.post('/:id/score', (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { homeScore, awayScore, event } = req.body;
  if (homeScore !== undefined) match.score.home = homeScore;
  if (awayScore !== undefined) match.score.away = awayScore;
  if (event) match.events.push(event);
  res.json({ success: true, match });
});

export default router;
