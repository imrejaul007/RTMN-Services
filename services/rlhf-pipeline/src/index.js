// RLHF Pipeline (4166) — Reinforcement Learning from Human Feedback
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4166;
const SERVICE = 'rlhf-pipeline';

const prompts = new Map();     // id -> { id, prompt, response, model, created_at }
const ratings = new Map();     // id -> { id, prompt_id, rater, score, comment, ts }
const iterations = new Map();  // id -> { id, prompt_ids, avg_score, status, reward_model_v, created_at }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ps = [
    { prompt: 'Explain churn prediction to a CEO', response: 'Churn prediction uses ML to identify customers likely to leave...', model: 'gpt-4' },
    { prompt: 'Generate a marketing email for hotel booking', response: 'Dear traveler, discover our exclusive rates...', model: 'gpt-4' },
    { prompt: 'Summarize quarterly revenue report', response: 'Revenue grew 23% QoQ, driven by enterprise expansion...', model: 'claude-opus-4-8' }
  ];
  ps.forEach(p => { const id = uuid(); prompts.set(id, { id, ...p, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', prompts: prompts.size, ratings: ratings.size, iterations: iterations.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/prompts', (req, res) => {
  const { prompt, response, model } = req.body || {};
  if (!prompt || !response) return res.status(400).json(fail('prompt, response required'));
  const id = uuid();
  const p = { id, prompt, response, model: model || 'unknown', created_at: new Date().toISOString() };
  prompts.set(id, p);
  res.status(201).json(ok({ prompt: p }));
});
app.get('/api/prompts', (_q, r) => r.json(ok({ prompts: [...prompts.values()], count: prompts.size })));
app.get('/api/prompts/:id', (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  res.json(ok({ prompt: p }));
});

app.post('/api/ratings', (req, res) => {
  const { prompt_id, rater, score, comment } = req.body || {};
  if (!prompt_id || !rater || score == null) return res.status(400).json(fail('prompt_id, rater, score required'));
  const id = uuid();
  const r = { id, prompt_id, rater, score, comment: comment || '', ts: new Date().toISOString() };
  ratings.set(id, r);
  res.status(201).json(ok({ rating: r }));
});
app.get('/api/ratings', (req, res) => {
  const { prompt_id } = req.query;
  let list = [...ratings.values()];
  if (prompt_id) list = list.filter(r => r.prompt_id === prompt_id);
  res.json(ok({ ratings: list, count: list.length }));
});

// Run a PPO iteration: pick prompts with ratings, compute avg reward, bump reward model version
app.post('/api/iterations/run', (req, res) => {
  const allRatings = [...ratings.values()];
  if (allRatings.length === 0) return res.status(400).json(fail('no ratings yet'));
  const byPrompt = new Map();
  for (const r of allRatings) {
    if (!byPrompt.has(r.prompt_id)) byPrompt.set(r.prompt_id, []);
    byPrompt.get(r.prompt_id).push(r.score);
  }
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const entries = [...byPrompt.entries()].map(([pid, scores]) => ({ prompt_id: pid, avg_score: avg(scores), rating_count: scores.length }));
  const overall = avg(entries.map(e => e.avg_score));
  const id = uuid();
  const last = [...iterations.values()].slice(-1)[0];
  const reward_model_v = (last?.reward_model_v || 0) + 1;
  const it = { id, prompt_count: entries.length, ratings_count: allRatings.length, avg_reward: overall, reward_model_v, status: 'completed', created_at: new Date().toISOString() };
  iterations.set(id, it);
  res.status(201).json(ok({ iteration: it, breakdown: entries }));
});

app.get('/api/iterations', (_q, r) => r.json(ok({ iterations: [...iterations.values()], count: iterations.size })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));