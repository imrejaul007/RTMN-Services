import { Router } from 'express';
const router = Router();

router.post('/lead', (req, res) => {
  res.json({ success: true, qualified: true, type: 'warm', confidence: 0.85 });
});
export default router;
