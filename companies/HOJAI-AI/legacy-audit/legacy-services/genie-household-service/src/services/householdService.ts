/**
 * GENIE Household Service - Main Service Logic
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Household,
  HouseholdMember,
  SharedMemory,
  HouseholdExpense,
  HouseholdTask,
  HouseholdEvent,
  HouseholdInvitation,
  HouseholdFeedItem,
  IHousehold,
  IHouseholdMember,
  ISharedMemory,
  IHouseholdExpense,
  IHouseholdTask,
  IHouseholdEvent,
  IHouseholdInvitation,
} from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('household-service');

// ============================================================================
// Household CRUD
// ============================================================================

export async function createHousehold(
  tenantId: string,
  ownerId: string,
  name: string,
  type: IHousehold['type'] = 'family',
  description?: string
): Promise<IHousehold> {
  const household = await Household.create({
    tenant_id: tenantId,
    name,
    type,
    description,
    owner_id: ownerId,
    settings: {
      allow_member_invites: true,
      require_approval_for_expenses: false,
      default_expense_split: 'equal',
      share_calendar: true,
      share_tasks: true,
      share_budget: true,
      notify_new_members: true,
      allow_guest_access: false,
    },
    stats: {
      member_count: 1,
      expense_count: 0,
      task_count: 0,
      event_count: 0,
      total_expenses: 0,
    },
  });

  // Add owner as first member
  await addMember(tenantId, household.id, ownerId, 'owner', name, 'active');

  // Create feed item
  await createFeedItem(tenantId, household.id, ownerId, 'member_joined', undefined, undefined, `Created household: ${name}`);

  logger.info('household_created', { tenantId, ownerId, householdId: household.id });
  return household;
}

export async function getHousehold(tenantId: string, householdId: string): Promise<IHousehold | null> {
  return Household.findOne({ tenant_id: tenantId, _id: householdId });
}

export async function getUserHouseholds(tenantId: string, userId: string): Promise<IHousehold[]> {
  const memberships = await HouseholdMember.find({ tenant_id: tenantId, user_id: userId, status: 'active' });
  const householdIds = memberships.map((m) => m.household_id);
  return Household.find({ tenant_id: tenantId, _id: { $in: householdIds } });
}

export async function updateHousehold(
  tenantId: string,
  householdId: string,
  userId: string,
  updates: Partial<IHousehold>
): Promise<IHousehold | null> {
  const household = await Household.findOne({ tenant_id: tenantId, _id: householdId });
  if (!household) return null;

  // Check permission
  if (household.owner_id !== userId) {
    const member = await HouseholdMember.findOne({
      tenant_id: tenantId,
      household_id: householdId,
      user_id: userId,
      role: { $in: ['owner', 'admin'] },
    });
    if (!member) throw new Error('Insufficient permissions');
  }

  Object.assign(household, updates);
  await household.save();

  if (updates.settings || updates.name) {
    await createFeedItem(tenantId, householdId, userId, 'setting_changed', 'setting', householdId, 'Updated household settings');
  }

  return household;
}

export async function deleteHousehold(tenantId: string, householdId: string, userId: string): Promise<boolean> {
  const household = await Household.findOne({ tenant_id: tenantId, _id: householdId });
  if (!household) return false;
  if (household.owner_id !== userId) throw new Error('Only owner can delete household');

  await Promise.all([
    Household.deleteOne({ tenant_id: tenantId, _id: householdId }),
    HouseholdMember.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    SharedMemory.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    HouseholdExpense.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    HouseholdTask.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    HouseholdEvent.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    HouseholdInvitation.deleteMany({ tenant_id: tenantId, household_id: householdId }),
    HouseholdFeedItem.deleteMany({ tenant_id: tenantId, household_id: householdId }),
  ]);

  logger.info('household_deleted', { tenantId, householdId });
  return true;
}

// ============================================================================
// Member Management
// ============================================================================

export async function addMember(
  tenantId: string,
  householdId: string,
  userId: string,
  role: IHouseholdMember['role'] = 'member',
  displayName?: string,
  status: IHouseholdMember['status'] = 'active'
): Promise<IHouseholdMember> {
  const member = await HouseholdMember.create({
    tenant_id: tenantId,
    household_id: householdId,
    user_id: userId,
    role,
    status,
    display_name: displayName || userId,
    joined_at: new Date(),
  });

  // Update household member count
  await Household.updateOne({ tenant_id: tenantId, _id: householdId }, { $inc: { 'stats.member_count': 1 } });

  return member;
}

export async function getMember(tenantId: string, householdId: string, userId: string): Promise<IHouseholdMember | null> {
  return HouseholdMember.findOne({ tenant_id: tenantId, household_id: householdId, user_id: userId });
}

export async function getHouseholdMembers(tenantId: string, householdId: string): Promise<IHouseholdMember[]> {
  return HouseholdMember.find({ tenant_id: tenantId, household_id: householdId, status: 'active' });
}

export async function updateMemberRole(
  tenantId: string,
  householdId: string,
  targetUserId: string,
  requesterId: string,
  newRole: IHouseholdMember['role']
): Promise<IHouseholdMember | null> {
  // Only owner can change roles
  const household = await Household.findOne({ tenant_id: tenantId, _id: householdId });
  if (!household || household.owner_id !== requesterId) {
    throw new Error('Only owner can change member roles');
  }

  if (targetUserId === household.owner_id) {
    throw new Error('Cannot change owner role');
  }

  const member = await HouseholdMember.findOneAndUpdate(
    { tenant_id: tenantId, household_id: householdId, user_id: targetUserId },
    { role: newRole },
    { new: true }
  );

  return member;
}

export async function removeMember(
  tenantId: string,
  householdId: string,
  targetUserId: string,
  requesterId: string
): Promise<boolean> {
  const household = await Household.findOne({ tenant_id: tenantId, _id: householdId });
  if (!household) return false;

  // Owner can't be removed
  if (targetUserId === household.owner_id) {
    throw new Error('Cannot remove owner');
  }

  // Check permission
  if (requesterId !== household.owner_id && requesterId !== targetUserId) {
    const member = await HouseholdMember.findOne({
      tenant_id: tenantId,
      household_id: householdId,
      user_id: requesterId,
      role: { $in: ['owner', 'admin'] },
    });
    if (!member) throw new Error('Insufficient permissions');
  }

  await HouseholdMember.deleteOne({ tenant_id: tenantId, household_id: householdId, user_id: targetUserId });
  await Household.updateOne({ tenant_id: tenantId, _id: householdId }, { $inc: { 'stats.member_count': -1 } });
  await createFeedItem(tenantId, householdId, requesterId, 'member_left', 'member', targetUserId, `Removed member: ${targetUserId}`);

  return true;
}

export async function leaveHousehold(tenantId: string, householdId: string, userId: string): Promise<boolean> {
  return removeMember(tenantId, householdId, userId, userId);
}

// ============================================================================
// Invitations
// ============================================================================

export async function createInvitation(
  tenantId: string,
  householdId: string,
  invitedBy: string,
  role: IHouseholdInvitation['role'] = 'member',
  inviteeEmail?: string,
  inviteePhone?: string,
  inviteeName?: string
): Promise<{ invitation: IHouseholdInvitation; token: string }> {
  const token = uuidv4();
  const invitation = await HouseholdInvitation.create({
    tenant_id: tenantId,
    household_id: householdId,
    invited_by: invitedBy,
    invitee_email: inviteeEmail,
    invitee_phone: inviteePhone,
    invitee_name: inviteeName,
    role,
    status: 'pending',
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  logger.info('invitation_created', { tenantId, householdId, inviteeEmail, inviteePhone });
  return { invitation, token };
}

export async function acceptInvitation(tenantId: string, token: string, userId: string): Promise<IHouseholdInvitation | null> {
  const invitation = await HouseholdInvitation.findOne({ tenant_id: tenantId, token, status: 'pending', expires_at: { $gt: new Date() } });
  if (!invitation) return null;

  // Add as member
  await addMember(tenantId, invitation.household_id, userId, invitation.role, invitation.invitee_name || userId, 'active');

  // Update invitation
  invitation.status = 'accepted';
  invitation.accepted_at = new Date();
  await invitation.save();

  await createFeedItem(tenantId, invitation.household_id, userId, 'member_joined', undefined, undefined, `Joined household via invitation`);

  return invitation;
}

export async function declineInvitation(tenantId: string, token: string): Promise<boolean> {
  const result = await HouseholdInvitation.updateOne(
    { tenant_id: tenantId, token, status: 'pending' },
    { status: 'declined' }
  );
  return result.modifiedCount > 0;
}

export async function getPendingInvitations(tenantId: string, householdId: string): Promise<IHouseholdInvitation[]> {
  return HouseholdInvitation.find({ tenant_id: tenantId, household_id: householdId, status: 'pending' });
}

// ============================================================================
// Shared Memories
// ============================================================================

export async function createSharedMemory(
  tenantId: string,
  householdId: string,
  creatorId: string,
  title: string,
  content: string,
  category: ISharedMemory['category'] = 'general',
  importance: ISharedMemory['importance'] = 'medium',
  tags: string[] = [],
  visibility: ISharedMemory['visibility'] = 'all'
): Promise<ISharedMemory> {
  const memory = await SharedMemory.create({
    tenant_id: tenantId,
    household_id: householdId,
    creator_id: creatorId,
    title,
    content,
    category,
    importance,
    tags,
    visibility,
  });

  await createFeedItem(tenantId, householdId, creatorId, 'memory_shared', 'memory', memory.id, `Shared memory: ${title}`);

  return memory;
}

export async function getSharedMemories(
  tenantId: string,
  householdId: string,
  userId: string,
  options?: { category?: string; limit?: number; offset?: number }
): Promise<ISharedMemory[]> {
  const query: Record<string, unknown> = { tenant_id: tenantId, household_id: householdId };

  if (options?.category) {
    query.category = options.category;
  }

  return SharedMemory.find(query)
    .sort({ created_at: -1 })
    .skip(options?.offset || 0)
    .limit(options?.limit || 50);
}

// ============================================================================
// Expenses
// ============================================================================

export async function createExpense(
  tenantId: string,
  householdId: string,
  creatorId: string,
  title: string,
  amount: number,
  paidBy: string,
  category: string,
  options?: {
    description?: string;
    currency?: string;
    splitType?: IHouseholdExpense['split_type'];
    splits?: Array<{ userId: string; amount?: number; percentage?: number }>;
    receiptUrl?: string;
    date?: Date;
  }
): Promise<IHouseholdExpense> {
  const members = await getHouseholdMembers(tenantId, householdId);
  let splits = options?.splits || [];

  // Auto-generate splits if not provided
  if (splits.length === 0 && options?.splitType !== 'who_paid') {
    const perPerson = amount / members.length;
    splits = members.map((m) => ({ userId: m.user_id, amount: perPerson }));
  }

  const expense = await HouseholdExpense.create({
    tenant_id: tenantId,
    household_id: householdId,
    creator_id: creatorId,
    title,
    description: options?.description,
    amount,
    currency: options?.currency || 'INR',
    category,
    split_type: options?.splitType || 'equal',
    splits: splits.map((s) => ({
      user_id: s.userId,
      amount: s.amount || 0,
      percentage: s.percentage,
      settled: s.userId === paidBy,
    })),
    paid_by: paidBy,
    receipt_url: options?.receiptUrl,
    date: options?.date || new Date(),
    status: 'pending',
  });

  await Household.updateOne(
    { tenant_id: tenantId, _id: householdId },
    { $inc: { 'stats.expense_count': 1, 'stats.total_expenses': amount } }
  );

  await createFeedItem(tenantId, householdId, creatorId, 'expense_added', 'expense', expense.id, `Added expense: ${title}`);

  return expense;
}

export async function getExpenses(
  tenantId: string,
  householdId: string,
  options?: { limit?: number; offset?: number }
): Promise<IHouseholdExpense[]> {
  return HouseholdExpense.find({ tenant_id: tenantId, household_id: householdId })
    .sort({ date: -1 })
    .skip(options?.offset || 0)
    .limit(options?.limit || 50);
}

export async function settleExpense(tenantId: string, expenseId: string, userId: string): Promise<IHouseholdExpense | null> {
  const expense = await HouseholdExpense.findOneAndUpdate(
    { tenant_id: tenantId, _id: expenseId },
    { status: 'settled' },
    { new: true }
  );
  return expense;
}

// ============================================================================
// Tasks
// ============================================================================

export async function createTask(
  tenantId: string,
  householdId: string,
  creatorId: string,
  title: string,
  assignedTo: string[],
  options?: {
    description?: string;
    priority?: IHouseholdTask['priority'];
    dueDate?: Date;
    recurring?: { frequency: IHouseholdTask['recurring']['frequency']; endDate?: Date };
  }
): Promise<IHouseholdTask> {
  const task = await HouseholdTask.create({
    tenant_id: tenantId,
    household_id: householdId,
    creator_id: creatorId,
    assigned_to: assignedTo,
    title,
    description: options?.description,
    priority: options?.priority || 'medium',
    due_date: options?.dueDate,
    recurring: options?.recurring ? {
      frequency: options.recurring.frequency,
      end_date: options.recurring.endDate,
    } : undefined,
    status: 'pending',
  });

  await Household.updateOne({ tenant_id: tenantId, _id: householdId }, { $inc: { 'stats.task_count': 1 } });

  return task;
}

export async function getTasks(
  tenantId: string,
  householdId: string,
  options?: { status?: IHouseholdTask['status']; assignedTo?: string; limit?: number }
): Promise<IHouseholdTask[]> {
  const query: Record<string, unknown> = { tenant_id: tenantId, household_id: householdId };
  if (options?.status) query.status = options.status;
  if (options?.assignedTo) query.assigned_to = options.assignedTo;

  return HouseholdTask.find(query)
    .sort({ priority: -1, due_date: 1 })
    .limit(options?.limit || 50);
}

export async function completeTask(tenantId: string, taskId: string, userId: string): Promise<IHouseholdTask | null> {
  const task = await HouseholdTask.findOneAndUpdate(
    { tenant_id: tenantId, _id: taskId },
    { status: 'completed', completed_at: new Date() },
    { new: true }
  );

  if (task) {
    await createFeedItem(tenantId, task.household_id, userId, 'task_completed', 'task', task.id, `Completed task: ${task.title}`);
  }

  return task;
}

// ============================================================================
// Events
// ============================================================================

export async function createEvent(
  tenantId: string,
  householdId: string,
  creatorId: string,
  title: string,
  startDate: Date,
  options?: {
    description?: string;
    endDate?: Date;
    allDay?: boolean;
    location?: string;
    attendees?: string[];
    reminders?: Array<{ time: number }>;
    recurrence?: { frequency: IHouseholdEvent['recurrence']['frequency']; endDate?: Date };
  }
): Promise<IHouseholdEvent> {
  const event = await HouseholdEvent.create({
    tenant_id: tenantId,
    household_id: householdId,
    creator_id: creatorId,
    title,
    description: options?.description,
    start_date: startDate,
    end_date: options?.endDate,
    all_day: options?.allDay || false,
    location: options?.location,
    attendees: options?.attendees || [],
    reminders: options?.reminders?.map((r) => ({ time: r.time, sent: false })) || [],
    recurrence: options?.recurrence ? {
      frequency: options.recurrence.frequency,
      end_date: options.recurrence.endDate,
    } : undefined,
  });

  await Household.updateOne({ tenant_id: tenantId, _id: householdId }, { $inc: { 'stats.event_count': 1 } });
  await createFeedItem(tenantId, householdId, creatorId, 'event_created', 'event', event.id, `Created event: ${title}`);

  return event;
}

export async function getEvents(
  tenantId: string,
  householdId: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
): Promise<IHouseholdEvent[]> {
  const query: Record<string, unknown> = { tenant_id: tenantId, household_id: householdId };

  if (options?.startDate) {
    query.start_date = { $gte: options.startDate };
  }
  if (options?.endDate) {
    query.end_date = { ...(query.end_date as object || {}), $lte: options.endDate };
  }

  return HouseholdEvent.find(query)
    .sort({ start_date: 1 })
    .limit(options?.limit || 50);
}

// ============================================================================
// Feed
// ============================================================================

export async function createFeedItem(
  tenantId: string,
  householdId: string,
  actorId: string,
  actionType: IHouseholdFeedItem['action_type'],
  targetType?: IHouseholdFeedItem['target_type'],
  targetId?: string,
  description?: string
): Promise<IHouseholdFeedItem> {
  return HouseholdFeedItem.create({
    tenant_id: tenantId,
    household_id: householdId,
    actor_id: actorId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    description: description || actionType,
  });
}

export async function getFeed(
  tenantId: string,
  householdId: string,
  options?: { limit?: number; offset?: number }
): Promise<IHouseholdFeedItem[]> {
  return HouseholdFeedItem.find({ tenant_id: tenantId, household_id: householdId })
    .sort({ created_at: -1 })
    .skip(options?.offset || 0)
    .limit(options?.limit || 50);
}

// ============================================================================
// Household Context for GENIE
// ============================================================================

export async function getHouseholdContext(
  tenantId: string,
  householdId: string,
  userId: string
): Promise<{
  household: IHousehold | null;
  members: IHouseholdMember[];
  upcomingEvents: IHouseholdEvent[];
  pendingTasks: IHouseholdTask[];
  recentExpenses: IHouseholdExpense[];
  recentMemories: ISharedMemory[];
  feed: IHouseholdFeedItem[];
}> {
  const [household, members, upcomingEvents, pendingTasks, recentExpenses, recentMemories, feed] = await Promise.all([
    getHousehold(tenantId, householdId),
    getHouseholdMembers(tenantId, householdId),
    getEvents(tenantId, householdId, { startDate: new Date(), limit: 10 }),
    getTasks(tenantId, householdId, { status: 'pending', limit: 10 }),
    getExpenses(tenantId, householdId, { limit: 5 }),
    getSharedMemories(tenantId, householdId, userId, { limit: 5 }),
    getFeed(tenantId, householdId, { limit: 20 }),
  ]);

  return {
    household,
    members,
    upcomingEvents,
    pendingTasks,
    recentExpenses,
    recentMemories,
    feed,
  };
}
