import { Router } from 'express';
const router = Router();

router.post('/sequence', (req, res) => {
  res.json({ success: true, campaignId: 'camp_' + Date.now() });
});
export default router;
