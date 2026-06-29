/**
 * Prediction Types — Spec Part 36: Anticipation Engine
 */

export type PredictionType =
  | 'travel'        // Flight, packing
  | 'follow_up'     // Investor, customer
  | 'relationship'  // Birthday, anniversary
  | 'health'        // Appointment, medication
  | 'work'          // Deadline, meeting
  | 'finance'       // Bill, payment
  | 'social';       // Event, gathering

export interface Prediction {
  id: string;
  userId: string;
  type: PredictionType;
  trigger: string;         // What triggered this
  title: string;           // "Flight tomorrow 8 AM"
  suggestion: string;      // "Pack tonight"
  urgency: 'low' | 'medium' | 'high';
  confidence: number;       // 0-1
  actionType?: 'calendar' | 'reminder' | 'communication' | 'task';
  relatedEventId?: string;
  expiresAt?: Date;
  dismissed: boolean;
  dismissedUntil?: Date;
  actedOn: boolean;
  createdAt: Date;
}

export interface PredictionContext {
  userId: string;
  upcomingEvents?: Array<{
    id: string;
    title: string;
    start: Date;
    type: string;
    location?: string;
  }>;
  recentInteractions?: Array<{
    personId: string;
    personName: string;
    lastContact: Date;
    type: 'call' | 'meeting' | 'email';
  }>;
  importantDates?: Array<{
    personId: string;
    personName: string;
    type: 'birthday' | 'anniversary' | 'custom';
    date: Date;
  }>;
  goals?: Array<{
    id: string;
    title: string;
    deadline?: Date;
  }>;
  pendingTasks?: Array<{
    id: string;
    title: string;
    dueDate?: Date;
  }>;
}