export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    userId?: string;
    pendingTasks?: number;
    userProfile?: UserProfile;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  nudge?: Nudge;
  userPreferences?: UserPreferenceSchema;
  microSprint?: MicroSprintPrompt;
  celebration?: CelebrationCopy;
  agent: string;
  timestamp: number;
}

export interface UserProfile {
  tendencies: string[];
  status: string;
  preferredChannel: 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH';
  communicationFrequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY';
  motivationalTriggers: string[];
}

export interface UserPreferenceSchema {
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH';
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY';
  tone: 'encouraging' | 'direct' | 'playful' | 'professional';
  focusHours?: string[];
  motivationalStyle: 'gamification' | 'direct_instruction' | 'social_proof' | 'achievement';
}

export interface Nudge {
  channel: string;
  message: string;
  actionButton?: string;
  urgency: 'high' | 'medium' | 'low';
  followUpSchedule?: string[];
}

export interface MicroSprintPrompt {
  task: string;
  duration: string;
  encouragement: string;
  nextStep?: string;
  offRamp: string;
}

export interface CelebrationCopy {
  headline: string;
  achievements: string[];
  stats: string;
  continuation: string;
  offRamp: string;
}

export interface NudgeSequence {
  day1: { channel: string; message: string };
  day3: { channel: string; message: string };
  day7: { channel: string; message: string };
}
