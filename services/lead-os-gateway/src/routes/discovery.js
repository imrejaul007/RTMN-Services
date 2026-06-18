import { Router } from 'express';
const router = Router();

router.get('/google', (req, res) => {
  res.json({ success: true, results: [{ name: 'Sample Business', address: 'Dubai, UAE', rating: 4.5 }] });
});
export default router;
