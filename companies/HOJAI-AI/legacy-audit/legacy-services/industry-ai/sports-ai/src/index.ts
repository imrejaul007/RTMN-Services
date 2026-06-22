/**
 * Sports AI Service - Industry AI Vertical
 * "AI-Powered Sports Management"
 *
 * @port 4513
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4513', 10);

app.use(helmet(), cors(), compression(), express.json());

const teams = new Map();
const players = new Map();
const matches = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'sports-ai', version: '1.0.0' }));
app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (req, res) => res.json({ status: 'ready', agents: ['Scout Agent', 'Fan Engagement Agent', 'Ticket Pricing Agent', 'Schedule Optimization Agent', 'Media Agent'] }));

app.get('/ai/agents', (req, res) => {
  res.json({
    active: true,
    agents: [
      { name: 'Scout Agent', status: 'active', capabilities: ['Player scouting', 'Performance analysis', 'Recruitment'] },
      { name: 'Fan Engagement Agent', status: 'active', capabilities: ['Campaigns', 'Personalization', 'Retention'] },
      { name: 'Ticket Pricing Agent', status: 'active', capabilities: ['Dynamic pricing', 'Demand forecasting', 'Revenue optimization'] },
      { name: 'Schedule Optimization Agent', status: 'active', capabilities: ['Match scheduling', 'Travel optimization', 'Rest management'] },
      { name: 'Media Agent', status: 'active', capabilities: ['Content creation', 'Social media', 'Broadcast coordination'] }
    ]
  });
});

app.get('/api/teams', (req, res) => res.json({ success: true, teams: Array.from(teams.values()) }));
app.post('/api/teams', (req, res) => {
  const { name, sport, league } = req.body;
  if (!name || !sport) return res.status(400).json({ error: 'Missing required fields' });
  const team = { teamId: uuidv4(), name, sport, league, status: 'active' };
  teams.set(team.teamId, team);
  res.status(201).json({ success: true, team });
});

app.get('/api/players', (req, res) => res.json({ success: true, players: Array.from(players.values()) }));
app.post('/api/players', (req, res) => {
  const { name, teamId, position } = req.body;
  if (!name || !teamId) return res.status(400).json({ error: 'Missing required fields' });
  const player = { playerId: uuidv4(), name, teamId, position, status: 'active' };
  players.set(player.playerId, player);
  res.status(201).json({ success: true, player });
});

app.get('/api/matches', (req, res) => res.json({ success: true, matches: Array.from(matches.values()) }));
app.post('/api/matches', (req, res) => {
  const { homeTeam, awayTeam, date } = req.body;
  if (!homeTeam || !awayTeam || !date) return res.status(400).json({ error: 'Missing required fields' });
  const match = { matchId: uuidv4(), homeTeam, awayTeam, date, status: 'scheduled' };
  matches.set(match.matchId, match);
  res.status(201).json({ success: true, match });
});

app.get('/', (req, res) => res.json({ name: 'Sports AI', tagline: 'AI-Powered Sports Management', version: '1.0.0', port: PORT }));

app.listen(PORT, () => console.log(`Sports AI running on port ${PORT}`));
export default app;
