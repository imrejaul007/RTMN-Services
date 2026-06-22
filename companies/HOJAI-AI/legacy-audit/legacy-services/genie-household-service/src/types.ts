/**
 * GENIE Household Service - Type Definitions
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Family/Household AI for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Household Role
 */
export type HouseholdRole = 'owner' | 'admin' | 'member' | 'guest';

/**
 * Member Status
 */
export type MemberStatus = 'active' | 'invited' | 'pending' | 'suspended';

/**
 * Household Type
 */
export type HouseholdType = 'family' | 'couple' | 'roommates' | 'shared_living' | 'other';

/**
 * Invitation Status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * Expense Split Type
 */
export type ExpenseSplitType = 'equal' | 'percentage' | 'custom' | 'who_paid';

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Task Status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Reminder Frequency
 */
export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Household Interface
 */
export interface Household {
  id: string;
  name: string;
  type: HouseholdType;
  description?: string;
  photo_url?: string;
  owner_id: string;
  settings: HouseholdSettings;
  stats: HouseholdStats;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Household Settings
 */
export interface HouseholdSettings {
  allow_member_invites: boolean;
  require_approval_for_expenses: boolean;
  default_expense_split: ExpenseSplitType;
  share_calendar: boolean;
  share_tasks: boolean;
  share_budget: boolean;
  notify_new_members: boolean;
  allow_guest_access: boolean;
}

/**
 * Household Statistics
 */
export interface HouseholdStats {
  member_count: number;
  expense_count: number;
  task_count: number;
  event_count: number;
  total_expenses: number;
}

/**
 * Household Member Interface
 */
export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: MemberStatus;
  display_name: string;
  avatar_url?: string;
  joined_at: Date;
  last_active?: Date;
  personal_settings: MemberPersonalSettings;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Member Personal Settings
 */
export interface MemberPersonalSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  show_on_household_feed: boolean;
  share_location_with_household: boolean;
}

/**
 * Shared Memory Interface
 */
export interface SharedMemory {
  id: string;
  household_id: string;
  creator_id: string;
  title: string;
  content: string;
  category: 'event' | 'decision' | 'preference' | 'important' | 'general';
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  attached_members: string[]; // User IDs
  visibility: 'all' | 'admins' | 'specific';
  comment_count: number;
  reaction_count: number;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Household Expense Interface
 */
export interface HouseholdExpense {
  id: string;
  household_id: string;
  creator_id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: string;
  split_type: ExpenseSplitType;
  splits: ExpenseSplit[];
  paid_by: string; // User ID
  receipt_url?: string;
  date: Date;
  status: 'pending' | 'settled' | 'cancelled';
  created_at: Date;
  updated_at?: Date;
}

/**
 * Expense Split
 */
export interface ExpenseSplit {
  user_id: string;
  amount: number;
  percentage?: number;
  settled: boolean;
}

/**
 * Household Task Interface
 */
export interface HouseholdTask {
  id: string;
  household_id: string;
  creator_id: string;
  assigned_to: string[]; // User IDs
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: Date;
  recurring?: {
    frequency: ReminderFrequency;
    end_date?: Date;
  };
  completed_at?: Date;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Household Event Interface
 */
export interface HouseholdEvent {
  id: string;
  household_id: string;
  creator_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  all_day: boolean;
  location?: string;
  attendees: string[]; // User IDs
  reminders: Array<{
    time: number; // minutes before
    sent: boolean;
  }>;
  recurrence?: {
    frequency: ReminderFrequency;
    end_date?: Date;
  };
  created_at: Date;
  updated_at?: Date;
}

/**
 * Household Invitation Interface
 */
export interface HouseholdInvitation {
  id: string;
  household_id: string;
  invited_by: string; // User ID
  invitee_email?: string;
  invitee_phone?: string;
  invitee_name?: string;
  role: HouseholdRole;
  status: InvitationStatus;
  token: string;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
}

/**
 * Household Feed Item Interface
 */
export interface HouseholdFeedItem {
  id: string;
  household_id: string;
  actor_id: string; // User who performed action
  action_type: 'member_joined' | 'member_left' | 'expense_added' | 'task_completed' | 'event_created' | 'memory_shared' | 'setting_changed';
  target_type?: 'member' | 'expense' | 'task' | 'event' | 'memory' | 'setting';
  target_id?: string;
  target_title?: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

/**
 * Budget Interface
 */
export interface HouseholdBudget {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  categories: Array<{
    name: string;
    amount: number;
    spent: number;
  }>;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const HouseholdSettingsSchema = z.object({
  allow_member_invites: z.boolean().default(true),
  require_approval_for_expenses: z.boolean().default(false),
  default_expense_split: z.enum(['equal', 'percentage', 'custom', 'who_paid']).default('equal'),
  share_calendar: z.boolean().default(true),
  share_tasks: z.boolean().default(true),
  share_budget: z.boolean().default(true),
  notify_new_members: z.boolean().default(true),
  allow_guest_access: z.boolean().default(false),
});

export const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['family', 'couple', 'roommates', 'shared_living', 'other']).default('family'),
  description: z.string().max(500).optional(),
  photo_url: z.string().url().optional(),
});

export const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  photo_url: z.string().url().optional(),
  settings: HouseholdSettingsSchema.partial(),
});

export const CreateMemberSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'guest']).default('member'),
  display_name: z.string().min(1).max(50),
  avatar_url: z.string().url().optional(),
});

export const CreateExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  category: z.string().min(1).max(50),
  split_type: z.enum(['equal', 'percentage', 'custom', 'who_paid']).default('equal'),
  splits: z.array(z.object({
    user_id: z.string(),
    amount: z.number().optional(),
    percentage: z.number().optional(),
  })).optional(),
  paid_by: z.string().min(1),
  receipt_url: z.string().url().optional(),
  date: z.string().datetime().optional(),
});

export const CreateTaskSchema = z.object({
  assigned_to: z.array(z.string()).min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().datetime().optional(),
  recurring: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    end_date: z.string().datetime().optional(),
  }).optional(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  all_day: z.boolean().default(false),
  location: z.string().max(200).optional(),
  attendees: z.array(z.string()).default([]),
  reminders: z.array(z.object({
    time: z.number().min(0),
  })).default([]),
  recurrence: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    end_date: z.string().datetime().optional(),
  }).optional(),
});

export const CreateInvitationSchema = z.object({
  invitee_email: z.string().email().optional(),
  invitee_phone: z.string().optional(),
  invitee_name: z.string().min(1).max(100).optional(),
  role: z.enum(['owner', 'admin', 'member', 'guest']).default('member'),
});

export const CreateSharedMemorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.enum(['event', 'decision', 'preference', 'important', 'general']).default('general'),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  attached_members: z.array(z.string()).default([]),
  visibility: z.enum(['all', 'admins', 'specific']).default('all'),
});

// ============================================================================
// Type Inference
// ============================================================================

export type HouseholdSettingsInput = z.infer<typeof HouseholdSettingsSchema>;
export type CreateHouseholdInput = z.infer<typeof CreateHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof UpdateHouseholdSchema>;
export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type CreateSharedMemoryInput = z.infer<typeof CreateSharedMemorySchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
