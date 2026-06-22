import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { memoryService } from '../services/memoryService.js';

const router = express.Router();

const CreateProfileSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional()
});

/**
 * GET /api/profiles
 * Get profile by identifier
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, email, phone } = req.query;

    const profile = await memoryService.getProfile(tenantId, {
      userId: userId as string,
      email: email as string,
      phone: phone as string
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profiles
 * Create a new profile
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const validated = CreateProfileSchema.parse(req.body);
    const profile = await memoryService.createProfile({ tenantId, ...validated });

    res.status(201).json({ success: true, data: profile });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * PATCH /api/profiles
 * Update profile
 */
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { userId, email, phone, ...updates } = req.body;

    const profile = await memoryService.updateProfile(tenantId, { userId, email, phone }, updates);

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

export default router;
