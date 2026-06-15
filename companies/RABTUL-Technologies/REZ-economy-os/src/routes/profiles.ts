import { Router, Request, Response, NextFunction } from 'express';
import { agentProfileService } from '../services/agentProfileService';
import { validators } from '../validators/schemas';

const router = Router();

/**
 * GET /api/v1/profiles/:agentId - Get full agent economic profile
 */
router.get('/:agentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const profile = agentProfileService.get(agentId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/profiles/:agentId/summary - Get financial summary
 */
router.get('/:agentId/summary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = validators.isString(req.params.agentId, 'agentId');
    const summary = agentProfileService.summary(agentId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;
