import { Router } from 'express';
import resolutionRouter from './resolution.js';

const router = Router();

// Mount resolution routes
router.use('/resolve', resolutionRouter);
router.use('/entities', resolutionRouter);
router.use('/review-queue', resolutionRouter);
router.use('/graph', resolutionRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'entity-resolution', timestamp: new Date().toISOString() });
});

export default router;
