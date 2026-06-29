/**
 * Preference Types — Spec Part 23: Continuous Learning
 */

export interface LearnedPreference {
  id: string;
  userId: string;
  pattern: string;           // e.g., "meetings_after_8pm"
  examples: string[];        // Original feedback texts
  action: string;            // What to do: "Block 8-10 PM daily"
  category: 'time' | 'communication' | 'work' | 'personal' | 'health' | 'finance';
  confidence: number;        // 0-1
  autoApply: boolean;        // Should auto-apply?
  triggered: number;         // How many times triggered
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  userId: string;
  text: string;              // User's feedback
  type: 'preference' | 'correction' | 'approval' | 'rejection';
  context?: string;
  timestamp: Date;
  processed: boolean;
  extractedPreference?: string; // Pattern ID if extracted
}

export interface BehaviorPattern {
  id: string;
  userId: string;
  pattern: string;           // e.g., "morning_focus"
  occurrences: number;       // How many times observed
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  description: string;
  suggestedAction?: string;
  confidence: number;
  observedFrom: Date;
  observedTo?: Date;
}

export interface AdaptationAction {
  id: string;
  userId: string;
  preferenceId: string;
  type: 'calendar' | 'notification' | 'communication' | 'reminder';
  action: string;
  applied: boolean;
  result?: string;
  appliedAt?: Date;
}