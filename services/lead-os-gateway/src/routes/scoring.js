import { Router } from 'express';
const router = Router();

router.post('/lead', (req, res) => {
  const score = Math.floor(Math.random() * 100);
  res.json({ success: true, score, tier: score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold' });
});
export default router;
