/**
 * Executive Assistant Types
 *
 * Central type definitions for all modules
 */

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface CalendarEvent {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  attendees?: Attendee[];
  reminders?: ReminderConfig[];
  recurrence?: RecurrenceConfig;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  color?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendee {
  id: string;
  email: string;
  name?: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  responseAt?: Date;
}

export interface ReminderConfig {
  method: 'email' | 'popup' | 'sms' | 'notification';
  minutesBefore: number;
  isActive: boolean;
}

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  byDay?: string[];
  exceptions?: Date[];
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  location?: string;
  attendees?: Omit<Attendee, 'id' | 'status' | 'responseAt'>[];
  reminders?: ReminderConfig[];
  recurrence?: Omit<RecurrenceConfig, 'exceptions'>;
  visibility?: 'public' | 'private' | 'confidential';
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface Email {
  id: string;
  userId: string;
  tenantId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  from: EmailAddress;
  subject: string;
  body: string;
  bodyHtml?: string;
  isDraft: boolean;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  labels?: string[];
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

export interface DraftEmailInput {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: Omit<Attachment, 'id'>[];
  labels?: string[];
}

// ============================================================================
// NOTES TYPES
// ============================================================================

export interface Note {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  content: string;
  contentHtml?: string;
  format: 'plain' | 'markdown' | 'rich';
  isPinned: boolean;
  isArchived: boolean;
  color?: string;
  tags?: string[];
  folder?: string;
  linkedEvents?: string[];
  linkedTasks?: string[];
  collaborators?: Collaborator[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collaborator {
  userId: string;
  email?: string;
  name?: string;
  permission: 'read' | 'write' | 'admin';
}

export interface CreateNoteInput {
  title: string;
  content: string;
  contentHtml?: string;
  format?: 'plain' | 'markdown' | 'rich';
  isPinned?: boolean;
  color?: string;
  tags?: string[];
  folder?: string;
  collaborators?: { userId: string; name?: string; permission?: 'read' | 'write' | 'admin' }[];
  metadata?: Record<string, unknown>;
}

export interface UpdateNoteInput extends Partial<Omit<CreateNoteInput, 'collaborators'>> {
  isArchived?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// REMINDER TYPES
// ============================================================================

export interface Reminder {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  description?: string;
  type: 'once' | 'recurring';
  triggerTime: Date;
  recurrence?: RecurrencePattern;
  channel: 'push' | 'email' | 'sms' | 'whatsapp';
  isActive: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  linkedEntityType?: 'event' | 'task' | 'note' | 'email';
  linkedEntityId?: string;
  snoozeOptions?: SnoozeOption[];
  metadata?: Record<string, unknown>;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  until?: Date;
  count?: number;
}

export interface SnoozeOption {
  minutes: number;
  label: string;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  type?: 'once' | 'recurring';
  triggerTime: string;
  recurrence?: RecurrencePattern;
  channel?: 'push' | 'email' | 'sms' | 'whatsapp';
  linkedEntityType?: 'event' | 'task' | 'note' | 'email';
  linkedEntityId?: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface Task {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  progress: number;
  tags?: string[];
  folder?: string;
  project?: string;
  subtasks?: Subtask[];
  linkedEvents?: string[];
  linkedNotes?: string[];
  linkedEmails?: string[];
  assignees?: Assignee[];
  checklist?: ChecklistItem[];
  dependencies?: string[];
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface Assignee {
  userId: string;
  email?: string;
  name?: string;
  role: 'owner' | 'assignee' | 'reviewer' | 'observer';
}

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
  assignedTo?: string;
  completedAt?: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  tags?: string[];
  folder?: string;
  project?: string;
  subtasks?: Omit<Subtask, 'id' | 'isCompleted' | 'completedAt'>[];
  assignees?: { userId: string; email?: string; name?: string; role?: 'owner' | 'assignee' | 'reviewer' | 'observer' }[];
  checklist?: Omit<ChecklistItem, 'id' | 'isChecked' | 'completedAt'>[];
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, 'subtasks' | 'assignees' | 'checklist'>> {
  status?: Task['status'];
  progress?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
}
