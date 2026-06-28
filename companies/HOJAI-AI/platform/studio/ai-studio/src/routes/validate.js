import { Router } from 'express';
import { validateWorkflow } from '../validator.js';

const router = Router();

// POST /api/validate
router.post('/validate', (req, res) => {
  const { workflow } = req.body;
  if (!workflow) return res.status(400).json({ error: 'workflow is required' });
  const errors = validateWorkflow(workflow);
  res.json({ valid: errors.length === 0, errors, count: errors.length });
});

export default router;
