/**
 * Ambient Alert Types — Spec Part 25: Ambient Intelligence
 */

export type AlertType =
  | 'wellness'      // Tired, stressed, low energy
  | 'relationship'  // Haven't called X, forgot birthday
  | 'work'          // Overloaded, deadline approaching
  | 'health'        // Sleep pattern, exercise
  | 'focus'         // Distraction alert
  | 'mindfulness';  // Take a break, breathe

export type AlertSeverity = 'info' | 'gentle' | 'urgent';

export interface AmbientAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  reason: string;          // Why this alert?
  actions: AlertAction[];
  data?: any;              // Source data
  dismissed: boolean;
  actedOn?: string;        // Action ID user took
  createdAt: Date;
  expiresAt?: Date;
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'move' | 'call' | 'schedule' | 'rest' | 'drink' | 'exercise' | 'dismiss';
  payload?: any;
}

export interface AmbientSignals {
  userId: string;
  voiceTone?: {
    stressed: boolean;
    tired: boolean;
    confidence: number;
  };
  sleep?: {
    hours: number;
    quality: string;
    trend: 'improving' | 'stable' | 'declining';
  };
  energy?: {
    level: number;        // 0-100
    trend: 'up' | 'stable' | 'down';
  };
  calendar?: {
    meetingsToday: number;
    meetingsThisWeek: number;
    focusTime: number;     // minutes
    overdueTasks: number;
  };
  relationships?: {
    longestContactGap: { personId: string; personName: string; days: number };
    upcomingBirthdays: { personId: string; personName: string; days: number }[];
  };
  work?: {
    activeProjects: number;
    blockedItems: number;
    lastBreakHours: number;
  };
}