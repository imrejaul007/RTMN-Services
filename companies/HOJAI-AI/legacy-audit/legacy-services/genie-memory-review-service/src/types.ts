/**
 * GENIE Memory Review Service - Type Definitions
 * Continuous memory reviews and nightly reflection
 */
import { z } from 'zod';

export interface MemoryReview {
  id: string;
  user_id: string;
  review_type: 'daily' | 'weekly' | 'monthly' | 'milestone';
  date: Date;
  summary: string;
  key_memories: string[];
  learned_preferences: string[];
  insights: string[];
  mood_trend?: 'improving' | 'stable' | 'declining';
  engagement_score: number;
  memory_count_start: number;
  memory_count_end: number;
  duration_minutes: number;
  status: 'pending' | 'in_progress' | 'completed';
  tenant_id: string;
  created_at: Date;
  completed_at?: Date;
}

export interface MemoryPattern {
  id: string;
  user_id: string;
  pattern_type: 'recurring' | 'trend' | 'anomaly' | 'preference';
  description: string;
  evidence: string[];
  frequency?: number;
  first_seen: Date;
  last_seen: Date;
  confidence: number;
  tenant_id: string;
}

export interface MemoryInsight {
  id: string;
  user_id: string;
  insight_type: 'growth' | 'relationship' | 'preference' | 'behavior' | 'opportunity';
  title: string;
  description: string;
  evidence: string[];
  action_suggestion?: string;
  generated_at: Date;
  tenant_id: string;
}

export interface ScheduledReview {
  id: string;
  user_id: string;
  review_type: 'daily' | 'weekly' | 'monthly';
  scheduled_time: string; // HH:mm format
  scheduled_days?: number[]; // 0-6 for weekly
  is_active: boolean;
  last_run?: Date;
  next_run: Date;
  tenant_id: string;
}

export const ReviewSettingsSchema = z.object({
  daily_review_time: z.string().regex(/^\d{2}:\d{2}$/).default('21:00'),
  weekly_review_day: z.number().min(0).max(6).default(0), // Sunday
  monthly_review_day: z.number().min(1).max(28).default(1),
  include_relationships: z.boolean().default(true),
  include_preferences: z.boolean().default(true),
  include_patterns: z.boolean().default(true),
  max_memories_per_review: z.number().min(10).max(500).default(100),
});

export interface APIResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; meta: { timestamp: string } }
export interface TenantContext { tenant_id: string; user_id?: string }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string } } }
