/**
 * Fitness AI - Member Routes
 *
 * REST API endpoints for member management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service';
import { MembershipTier, MemberStatus } from '../models';

const router = Router();

/**
 * GET /api/members
 * List all members with pagination and filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      limit,
      status,
      tier,
      search,
    } = req.query;

    const result = await memberService.getMembers({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as MemberStatus,
      tier: tier as MembershipTier,
      search: search as string,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/members/:memberId
 * Get member by ID
 */
router.get('/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await memberService.getMemberById(req.params.memberId);

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/members
 * Create a new member
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      membershipTier,
      membershipDuration,
      source,
      dateOfBirth,
      height,
      weight,
      fitnessGoal,
    } = req.body;

    const member = await memberService.createMember({
      firstName,
      lastName,
      email,
      phone,
      membershipTier: membershipTier || MembershipTier.BASIC,
      membershipDuration: membershipDuration || 1,
      source,
      dateOfBirth,
      height,
      weight,
      fitnessGoal,
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/members/:memberId
 * Update member
 */
router.patch('/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await memberService.updateMember(req.params.memberId, req.body);

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/members/:memberId/renew
 * Renew membership
 */
router.post('/:memberId/renew', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { durationMonths } = req.body;
    const member = await memberService.renewMembership(req.params.memberId, durationMonths || 1);

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/members/:memberId/upgrade
 * Upgrade membership tier
 */
router.post('/:memberId/upgrade', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tier } = req.body;
    const member = await memberService.upgradeTier(req.params.memberId, tier);

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/members/:memberId/suspend
 * Suspend member
 */
router.post('/:memberId/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const member = await memberService.suspendMember(req.params.memberId, reason || 'No reason provided');

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/members/:memberId/visit
 * Record member visit
 */
router.post('/:memberId/visit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await memberService.recordVisit(req.params.memberId);
    res.json({ success: true, message: 'Visit recorded' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/members/stats
 * Get membership statistics
 */
router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await memberService.getStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/members/:memberId
 * Delete member
 */
router.delete('/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await memberService.deleteMember(req.params.memberId);

    if (!deleted) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json({ success: true, message: 'Member deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
