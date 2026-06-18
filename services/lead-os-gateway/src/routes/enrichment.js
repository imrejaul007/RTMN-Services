import { Router } from 'express';
const router = Router();

router.post('/company', (req, res) => {
  res.json({ success: true, company: { name: req.body.domain || 'Company', employees: '500', revenue: '$10M' } });
});
export default router;
