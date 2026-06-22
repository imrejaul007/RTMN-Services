/**
 * Hojai Wellness - Type Definitions
 *
 * Emotional wellness, mood tracking, mindfulness for Hojai AI
 */

export interface WellnessScore {
  overall: number; // 0-100
  mental: number;
  emotional: number;
  social: number;
  purpose: number;
  growth: number;
}

export interface MoodState {
  current: string;
  energy: number; // 0-100
  stress: number; // 0-100
  socialEnergy: number; // 0-100
}

export interface CosmicState {
  energyLevel: 'high' | 'medium' | 'low';
  emotionalTone: string;
  focusScore: number;
  socialEnergy: number;
}

export interface WellnessCheckIn {
  userId: string;
  mood: 'radiant' | 'bright' | 'balanced' | 'clouded' | 'stormy' | 'peaceful' | 'restless' | 'tired';
  energy: 1 | 2 | 3 | 4 | 5;
  note?: string;
  gratitude?: string;
}

export interface WellnessInsights {
  trends: string[];
  recommendations: string[];
  affirmations: string[];
  risks: string[];
}

export interface CosmicReading {
  dailyTheme: string;
  affirmation: string;
  guidance: string;
  agents: string[];
  timingAdvice: string;
}

export interface MindfulnessSession {
  userId: string;
  type: 'breathing' | 'meditation' | 'gratitude' | 'reflection' | 'body_scan';
  duration: number; // minutes
  completed: boolean;
}

export interface JournalEntry {
  userId: string;
  prompt: string;
  reflection: string;
  mood?: string;
  timestamp: Date;
}
