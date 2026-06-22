/**
 * GENIE Household Service - API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as householdService from '../services/householdService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createLogger } from '../utils/logger.js';
import {
  CreateHouseholdSchema,
  UpdateHouseholdSchema,
  CreateExpenseSchema,
  CreateTaskSchema,
  CreateEventSchema,
  CreateInvitationSchema,
  CreateSharedMemorySchema,
} from '../types.js';

const logger = createLogger('household-routes');
const router = Router();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string; details?: Record<string, unknown> }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() } };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => { Promise.resolve(fn(req, res, next)).catch(next); };
}

router.use(tenantMiddleware());

// ============================================================================
// Household Routes
// ============================================================================

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;

  const parseResult = CreateHouseholdSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() }));
    return;
  }

  const { name, type, description, photo_url } = parseResult.data;
  const household = await householdService.createHousehold(tenantId, userId, name, type, description);

  res.status(201).json(createResponse(true, household));
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;

  const households = await householdService.getUserHouseholds(tenantId, userId);
  res.json(createResponse(true, households));
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;

  const household = await householdService.getHousehold(tenantId, id);
  if (!household) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Household not found' }));
    return;
  }
  res.json(createResponse(true, household));
}));

router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = UpdateHouseholdSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const household = await householdService.updateHousehold(tenantId, id, userId, parseResult.data);
  if (!household) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Household not found' }));
    return;
  }
  res.json(createResponse(true, household));
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const deleted = await householdService.deleteHousehold(tenantId, id, userId);
  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Household not found' }));
    return;
  }
  res.json(createResponse(true, { deleted: true }));
}));

// ============================================================================
// Members
// ============================================================================

router.get('/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;

  const members = await householdService.getHouseholdMembers(tenantId, id);
  res.json(createResponse(true, members));
}));

router.post('/:id/leave', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  await householdService.leaveHousehold(tenantId, id, userId);
  res.json(createResponse(true, { message: 'Left household successfully' }));
}));

// ============================================================================
// Invitations
// ============================================================================

router.post('/:id/invitations', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = CreateInvitationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const { invitee_email, invitee_phone, invitee_name, role } = parseResult.data;
  const result = await householdService.createInvitation(tenantId, id, userId, role, invitee_email, invitee_phone, invitee_name);

  res.status(201).json(createResponse(true, { invitation_id: result.invitation.id, token: result.token }));
}));

router.post('/invitations/:token/accept', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { token } = req.params;

  const invitation = await householdService.acceptInvitation(tenantId, token, userId);
  if (!invitation) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Invitation not found or expired' }));
    return;
  }
  res.json(createResponse(true, { household_id: invitation.household_id }));
}));

router.post('/invitations/:token/decline', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { token } = req.params;

  const declined = await householdService.declineInvitation(tenantId, token);
  res.json(createResponse(true, { declined }));
}));

// ============================================================================
// Shared Memories
// ============================================================================

router.post('/:id/memories', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = CreateSharedMemorySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const memory = await householdService.createSharedMemory(
    tenantId, id, userId, parseResult.data.title, parseResult.data.content,
    parseResult.data.category, parseResult.data.importance, parseResult.data.tags, parseResult.data.visibility
  );
  res.status(201).json(createResponse(true, memory));
}));

router.get('/:id/memories', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const category = req.query.category as string;

  const memories = await householdService.getSharedMemories(tenantId, id, userId, { category, limit, offset });
  res.json(createResponse(true, memories));
}));

// ============================================================================
// Expenses
// ============================================================================

router.post('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = CreateExpenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const expense = await householdService.createExpense(
    tenantId, id, userId, parseResult.data.title,
    parseResult.data.amount, parseResult.data.paid_by, parseResult.data.category,
    { description: parseResult.data.description, splits: parseResult.data.splits?.map(s => ({ userId: s.user_id, amount: s.amount, percentage: s.percentage })) }
  );
  res.status(201).json(createResponse(true, expense));
}));

router.get('/:id/expenses', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const expenses = await householdService.getExpenses(tenantId, id, { limit, offset });
  res.json(createResponse(true, expenses));
}));

// ============================================================================
// Tasks
// ============================================================================

router.post('/:id/tasks', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const task = await householdService.createTask(tenantId, id, userId, parseResult.data.title, parseResult.data.assigned_to, {
    description: parseResult.data.description,
    priority: parseResult.data.priority,
    dueDate: parseResult.data.due_date ? new Date(parseResult.data.due_date) : undefined,
  });
  res.status(201).json(createResponse(true, task));
}));

router.get('/:id/tasks', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;
  const status = req.query.status as 'pending' | 'in_progress' | 'completed' | 'cancelled';
  const assignedTo = req.query.assigned_to as string;
  const limit = parseInt(req.query.limit as string) || 50;

  const tasks = await householdService.getTasks(tenantId, id, { status, assignedTo, limit });
  res.json(createResponse(true, tasks));
}));

router.patch('/:householdId/tasks/:taskId/complete', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { householdId, taskId } = req.params;

  const task = await householdService.completeTask(tenantId, taskId, userId);
  if (!task) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Task not found' }));
    return;
  }
  res.json(createResponse(true, task));
}));

// ============================================================================
// Events
// ============================================================================

router.post('/:id/events', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = CreateEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request body' }));
    return;
  }

  const event = await householdService.createEvent(
    tenantId, id, userId, parseResult.data.title, new Date(parseResult.data.start_date), {
      description: parseResult.data.description,
      endDate: parseResult.data.end_date ? new Date(parseResult.data.end_date) : undefined,
      allDay: parseResult.data.all_day,
      location: parseResult.data.location,
      attendees: parseResult.data.attendees,
    }
  );
  res.status(201).json(createResponse(true, event));
}));

router.get('/:id/events', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const events = await householdService.getEvents(tenantId, id, { limit });
  res.json(createResponse(true, events));
}));

// ============================================================================
// Feed
// ============================================================================

router.get('/:id/feed', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const feed = await householdService.getFeed(tenantId, id, { limit, offset });
  res.json(createResponse(true, feed));
}));

// ============================================================================
// Context (for GENIE AI)
// ============================================================================

router.get('/:id/context', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { id } = req.params;

  const context = await householdService.getHouseholdContext(tenantId, id, userId);
  if (!context.household) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Household not found' }));
    return;
  }
  res.json(createResponse(true, context));
}));

export default router;
