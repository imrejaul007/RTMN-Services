/**
 * Focus Types — Spec Part 31: FocusOS
 */

export interface FocusSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  category: string;             // "writing", "coding", etc.
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  interruptions: number;
  notes?: string;
}

export interface OptimalTime {
  hour: number;                 // 0-23
  dayOfWeek: number;            // 0-6
  quality: number;              // 0-100
  category?: string;
  confidence: number;
}

export interface FocusInsight {
  type: 'best_time' | 'best_day' | 'productivity_pattern' | 'interruption_source';
  description: string;
  data: any;
  recommendations: string[];
}

export interface DistractionLog {
  id: string;
  userId: string;
  timestamp: Date;
  source: 'phone' | 'email' | 'colleague' | 'meeting' | 'social_media' | 'other';
  durationMinutes: number;
  context?: string;
}