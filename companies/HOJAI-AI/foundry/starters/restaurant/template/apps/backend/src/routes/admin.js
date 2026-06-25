import { Router } from 'express';
import { store } from '../services/store.js';

const r = Router();

r.get('/overview', (_req, res) => {
  res.json({
    counts: Object.fromEntries(Object.keys(store).map(k => [k, store[k]().length]))
  });
});

r.post('/reset', (_req, res) => {
  store.reset();
  res.json({ ok: true });
});

export default r;
