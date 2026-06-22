/**
 * GENIE Calendar Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Calendar aggregation and scheduling for Genie
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'manual';
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type ReminderType = 'email' | 'popup' | 'sms' | 'notification';

export interface Calendar {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  name: string;
  color: string;
  access_level: 'owner' | 'writer' | 'reader';
  synced_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location?: string;
  status: EventStatus;
  attendees: Attendee[];
  reminders: Reminder[];
  recurring?: RecurringRule;
  source: CalendarProvider;
  created_at: string;
  updated_at: string;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface Reminder {
  id: string;
  minutes_before: number;
  type: ReminderType;
  sent: boolean;
}

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  count?: number;
}

export interface SyncResult {
  calendar_id: string;
  events_added: number;
  events_updated: number;
  events_deleted: number;
  synced_at: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateEventSchema = z.object({
  calendar_id: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  timezone: z.string().default('Asia/Kolkata'),
  location: z.string().max(500).optional(),
  attendees: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })).optional(),
  reminders: z.array(z.object({
    minutes_before: z.number().min(0).max(10080),
    type: z.enum(['email', 'popup', 'sms', 'notification']).default('popup'),
  })).optional(),
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

export const ListEventsQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  calendar_id: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
