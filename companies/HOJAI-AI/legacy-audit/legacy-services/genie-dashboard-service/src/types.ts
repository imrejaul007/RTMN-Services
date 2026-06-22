/**
 * GENIE Dashboard Service - Type Definitions
 * Version: 1.0.0 | Date: June 14, 2026
 * Purpose: Simple unified dashboard for Genie AI (like Vellum)
 *
 * Tagline: "Your Personal Intelligence, Simplified"
 */

import { z } from 'zod';

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardData {
  user_id: string;
  summary: DashboardSummary;
  memory: MemorySummary;
  calendar: CalendarSummary;
  email: EmailSummary;
  briefings: BriefingSummary;
  relationships: RelationshipSummary;
  tasks: TaskSummary;
  quickActions: QuickAction[];
  insights: Insight[];
  lastUpdated: string;
}

export interface DashboardSummary {
  greeting: string;
  totalMemories: number;
  upcomingEvents: number;
  unreadEmails: number;
  pendingTasks: number;
  relationshipsCount: number;
  streak: number; // consecutive days using Genie
}

export interface MemorySummary {
  recentMemories: MemoryItem[];
  totalCount: number;
  topCategories: { name: string; count: number }[];
  recentRecall: string;
}

export interface MemoryItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  importance: number;
}

export interface CalendarSummary {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  upcomingCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface EmailSummary {
  unreadCount: number;
  recentEmails: EmailItem[];
}

export interface EmailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  received_at: string;
  read: boolean;
}

export interface BriefingSummary {
  todayBriefing?: BriefingContent;
  hasBriefing: boolean;
  briefingTime: string;
}

export interface BriefingContent {
  id: string;
  greeting: string;
  sections: BriefingSection[];
  summary: string;
}

export interface BriefingSection {
  id: string;
  type: 'weather' | 'tasks' | 'calendar' | 'memory' | 'email' | 'insights';
  title: string;
  content: string;
  items?: { text: string; done?: boolean }[];
}

export interface RelationshipSummary {
  recentInteractions: Interaction[];
  upcomingEvents: string[];
  topRelationships: { name: string; lastContact: string }[];
}

export interface Interaction {
  personId: string;
  name: string;
  type: 'call' | 'message' | 'meeting' | 'email';
  date: string;
  summary?: string;
}

export interface TaskSummary {
  pending: TaskItem[];
  completed: number;
  total: number;
}

export interface TaskItem {
  id: string;
  title: string;
  due_date?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  params?: Record<string, string>;
}

export interface Insight {
  id: string;
  type: 'memory' | 'pattern' | 'suggestion' | 'reminder';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const DashboardQuerySchema = z.object({
  refresh: z.boolean().optional(),
  focus: z.enum(['today', 'week', 'month']).optional(),
});

export const UpdatePreferenceSchema = z.object({
  briefing_time: z.string().optional(),
  briefing_enabled: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
  greeting_style: z.enum(['formal', 'casual', 'friendly']).optional(),
});

// ============================================================================
// Express Types
// ============================================================================

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
