/**
 * GENIE Household Service - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Household Model
// ============================================================================

export interface IHousehold extends Document {
  name: string;
  type: 'family' | 'couple' | 'roommates' | 'shared_living' | 'other';
  description?: string;
  photo_url?: string;
  owner_id: string;
  settings: {
    allow_member_invites: boolean;
    require_approval_for_expenses: boolean;
    default_expense_split: 'equal' | 'percentage' | 'custom' | 'who_paid';
    share_calendar: boolean;
    share_tasks: boolean;
    share_budget: boolean;
    notify_new_members: boolean;
    allow_guest_access: boolean;
  };
  stats: {
    member_count: number;
    expense_count: number;
    task_count: number;
    event_count: number;
    total_expenses: number;
  };
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: { type: String, required: true, maxlength: 100 },
    type: {
      type: String,
      enum: ['family', 'couple', 'roommates', 'shared_living', 'other'],
      default: 'family',
    },
    description: { type: String, maxlength: 500 },
    photo_url: { type: String },
    owner_id: { type: String, required: true, index: true },
    settings: {
      allow_member_invites: { type: Boolean, default: true },
      require_approval_for_expenses: { type: Boolean, default: false },
      default_expense_split: {
        type: String,
        enum: ['equal', 'percentage', 'custom', 'who_paid'],
        default: 'equal',
      },
      share_calendar: { type: Boolean, default: true },
      share_tasks: { type: Boolean, default: true },
      share_budget: { type: Boolean, default: true },
      notify_new_members: { type: Boolean, default: true },
      allow_guest_access: { type: Boolean, default: false },
    },
    stats: {
      member_count: { type: Number, default: 0 },
      expense_count: { type: Number, default: 0 },
      task_count: { type: Number, default: 0 },
      event_count: { type: Number, default: 0 },
      total_expenses: { type: Number, default: 0 },
    },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdSchema.index({ tenant_id: 1, owner_id: 1 });
HouseholdSchema.index({ tenant_id: 1, name: 1 });

export const Household = mongoose.model<IHousehold>('Household', HouseholdSchema);

// ============================================================================
// Household Member Model
// ============================================================================

export interface IHouseholdMember extends Document {
  household_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'active' | 'invited' | 'pending' | 'suspended';
  display_name: string;
  avatar_url?: string;
  joined_at: Date;
  last_active?: Date;
  personal_settings: {
    notifications_enabled: boolean;
    email_notifications: boolean;
    push_notifications: boolean;
    show_on_household_feed: boolean;
    share_location_with_household: boolean;
  };
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const HouseholdMemberSchema = new Schema<IHouseholdMember>(
  {
    household_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'guest'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'pending', 'suspended'],
      default: 'active',
    },
    display_name: { type: String, required: true, maxlength: 50 },
    avatar_url: { type: String },
    joined_at: { type: Date, default: Date.now },
    last_active: { type: Date },
    personal_settings: {
      notifications_enabled: { type: Boolean, default: true },
      email_notifications: { type: Boolean, default: true },
      push_notifications: { type: Boolean, default: true },
      show_on_household_feed: { type: Boolean, default: true },
      share_location_with_household: { type: Boolean, default: false },
    },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdMemberSchema.index({ tenant_id: 1, household_id: 1, user_id: 1 }, { unique: true });
HouseholdMemberSchema.index({ tenant_id: 1, user_id: 1 });

export const HouseholdMember = mongoose.model<IHouseholdMember>('HouseholdMember', HouseholdMemberSchema);

// ============================================================================
// Shared Memory Model
// ============================================================================

export interface ISharedMemory extends Document {
  household_id: string;
  creator_id: string;
  title: string;
  content: string;
  category: 'event' | 'decision' | 'preference' | 'important' | 'general';
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  attached_members: string[];
  visibility: 'all' | 'admins' | 'specific';
  comment_count: number;
  reaction_count: number;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const SharedMemorySchema = new Schema<ISharedMemory>(
  {
    household_id: { type: String, required: true, index: true },
    creator_id: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ['event', 'decision', 'preference', 'important', 'general'],
      default: 'general',
    },
    importance: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    tags: [{ type: String }],
    attached_members: [{ type: String }],
    visibility: {
      type: String,
      enum: ['all', 'admins', 'specific'],
      default: 'all',
    },
    comment_count: { type: Number, default: 0 },
    reaction_count: { type: Number, default: 0 },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

SharedMemorySchema.index({ tenant_id: 1, household_id: 1, created_at: -1 });
SharedMemorySchema.index({ tenant_id: 1, household_id: 1, category: 1 });

export const SharedMemory = mongoose.model<ISharedMemory>('SharedMemory', SharedMemorySchema);

// ============================================================================
// Household Expense Model
// ============================================================================

export interface IExpenseSplit {
  user_id: string;
  amount: number;
  percentage?: number;
  settled: boolean;
}

export interface IHouseholdExpense extends Document {
  household_id: string;
  creator_id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: string;
  split_type: 'equal' | 'percentage' | 'custom' | 'who_paid';
  splits: IExpenseSplit[];
  paid_by: string;
  receipt_url?: string;
  date: Date;
  status: 'pending' | 'settled' | 'cancelled';
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const ExpenseSplitSchema = new Schema<IExpenseSplit>(
  {
    user_id: { type: String, required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number },
    settled: { type: Boolean, default: false },
  },
  { _id: false }
);

const HouseholdExpenseSchema = new Schema<IHouseholdExpense>(
  {
    household_id: { type: String, required: true, index: true },
    creator_id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', maxlength: 3 },
    category: { type: String, required: true, maxlength: 50 },
    split_type: {
      type: String,
      enum: ['equal', 'percentage', 'custom', 'who_paid'],
      default: 'equal',
    },
    splits: [ExpenseSplitSchema],
    paid_by: { type: String, required: true },
    receipt_url: { type: String },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'settled', 'cancelled'],
      default: 'pending',
    },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdExpenseSchema.index({ tenant_id: 1, household_id: 1, date: -1 });
HouseholdExpenseSchema.index({ tenant_id: 1, creator_id: 1 });

export const HouseholdExpense = mongoose.model<IHouseholdExpense>('HouseholdExpense', HouseholdExpenseSchema);

// ============================================================================
// Household Task Model
// ============================================================================

export interface IHouseholdTask extends Document {
  household_id: string;
  creator_id: string;
  assigned_to: string[];
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: Date;
  recurring?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    end_date?: Date;
  };
  completed_at?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const HouseholdTaskSchema = new Schema<IHouseholdTask>(
  {
    household_id: { type: String, required: true, index: true },
    creator_id: { type: String, required: true },
    assigned_to: [{ type: String }],
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    due_date: { type: Date },
    recurring: {
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'yearly'],
      },
      end_date: { type: Date },
    },
    completed_at: { type: Date },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdTaskSchema.index({ tenant_id: 1, household_id: 1, status: 1, due_date: 1 });

export const HouseholdTask = mongoose.model<IHouseholdTask>('HouseholdTask', HouseholdTaskSchema);

// ============================================================================
// Household Event Model
// ============================================================================

export interface IHouseholdEvent extends Document {
  household_id: string;
  creator_id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  all_day: boolean;
  location?: string;
  attendees: string[];
  reminders: Array<{ time: number; sent: boolean }>;
  recurrence?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    end_date?: Date;
  };
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const HouseholdEventSchema = new Schema<IHouseholdEvent>(
  {
    household_id: { type: String, required: true, index: true },
    creator_id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    start_date: { type: Date, required: true },
    end_date: { type: Date },
    all_day: { type: Boolean, default: false },
    location: { type: String, maxlength: 200 },
    attendees: [{ type: String }],
    reminders: [
      {
        time: { type: Number, required: true },
        sent: { type: Boolean, default: false },
      },
    ],
    recurrence: {
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'yearly'],
      },
      end_date: { type: Date },
    },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdEventSchema.index({ tenant_id: 1, household_id: 1, start_date: 1 });

export const HouseholdEvent = mongoose.model<IHouseholdEvent>('HouseholdEvent', HouseholdEventSchema);

// ============================================================================
// Invitation Model
// ============================================================================

export interface IHouseholdInvitation extends Document {
  household_id: string;
  invited_by: string;
  invitee_email?: string;
  invitee_phone?: string;
  invitee_name?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  expires_at: Date;
  accepted_at?: Date;
  tenant_id: string;
  created_at: Date;
}

const HouseholdInvitationSchema = new Schema<IHouseholdInvitation>(
  {
    household_id: { type: String, required: true, index: true },
    invited_by: { type: String, required: true },
    invitee_email: { type: String },
    invitee_phone: { type: String },
    invitee_name: { type: String },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'guest'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    accepted_at: { type: Date },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdInvitationSchema.index({ tenant_id: 1, token: 1 });
HouseholdInvitationSchema.index({ tenant_id: 1, invitee_email: 1 });
HouseholdInvitationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const HouseholdInvitation = mongoose.model<IHouseholdInvitation>(
  'HouseholdInvitation',
  HouseholdInvitationSchema
);

// ============================================================================
// Feed Item Model
// ============================================================================

export interface IHouseholdFeedItem extends Document {
  household_id: string;
  actor_id: string;
  action_type: 'member_joined' | 'member_left' | 'expense_added' | 'task_completed' | 'event_created' | 'memory_shared' | 'setting_changed';
  target_type?: 'member' | 'expense' | 'task' | 'event' | 'memory' | 'setting';
  target_id?: string;
  target_title?: string;
  description: string;
  metadata?: Record<string, unknown>;
  tenant_id: string;
  created_at: Date;
}

const HouseholdFeedItemSchema = new Schema<IHouseholdFeedItem>(
  {
    household_id: { type: String, required: true, index: true },
    actor_id: { type: String, required: true },
    action_type: {
      type: String,
      enum: [
        'member_joined',
        'member_left',
        'expense_added',
        'task_completed',
        'event_created',
        'memory_shared',
        'setting_changed',
      ],
      required: true,
    },
    target_type: {
      type: String,
      enum: ['member', 'expense', 'task', 'event', 'memory', 'setting'],
    },
    target_id: { type: String },
    target_title: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

HouseholdFeedItemSchema.index({ tenant_id: 1, household_id: 1, created_at: -1 });

export const HouseholdFeedItem = mongoose.model<IHouseholdFeedItem>('HouseholdFeedItem', HouseholdFeedItemSchema);
