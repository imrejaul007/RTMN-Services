import { Router } from 'express';
const router = Router();

router.get('/overview', (req, res) => {
  res.json({ success: true, totalLeads: 1247, qualifiedLeads: 423, revenue: 2450000 });
});
export default router;
