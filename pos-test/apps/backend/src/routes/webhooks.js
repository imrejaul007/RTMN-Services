import { Router } from 'express';

const r = Router();

r.post('/nexha', (req, res) => {
  console.log('[nexha webhook]', JSON.stringify(req.body || {}).slice(0, 200));
  res.json({ ok: true });
});
r.post('/payment', (req, res) => {
  console.log('[payment webhook]', JSON.stringify(req.body || {}).slice(0, 200));
  res.json({ ok: true });
});

export default r;
