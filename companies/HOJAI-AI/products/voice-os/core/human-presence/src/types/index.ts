/**
 * Human Presence Engine Types
 * =========================
 * Detects and adapts to human presence, attention, energy, and context.
 */

// Presence states
export type PresenceState =
  | 'active'        // Fully engaged
  | 'distracted'    // Attention wandering
  | 'tired'         // Low energy
  | 'focused'       // Deep focus
  | 'multi-tasking' // Split attention
  | 'stressed'      // High pressure
  | 'relaxed';      // Calm state

// Energy levels
export type EnergyLevel = 'high' | 'medium' | 'low' | 'critical';
export type EnergyType = 'mental' | 'physical' | 'emotional' | 'social';

export interface EnergyState {
  mental: EnergyLevel;
  physical: EnergyLevel;
  emotional: EnergyLevel;
  social: EnergyLevel;
  overall: EnergyLevel;
  score: number; // 0-100
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: string;
}

// Attention states
export interface AttentionState {
  level: number; // 0-100
  focus: number; // 0-100
  distractions: number;
  lastFocused: string;
  focusDuration: number; // seconds
  pattern: AttentionPattern;
}

export type AttentionPattern =
  | 'deep-focus'
  | 'shallow'
  | 'scattered'
  | 'recovering'
  | 'flow';

// Context types
export interface PresenceContext {
  location?: 'home' | 'office' | 'commuting' | 'traveling' | ' outdoors' | 'gym' | 'restaurant' | 'meeting';
  activity?: 'working' | 'resting' | 'exercising' | 'eating' | 'socializing' | 'commuting' | 'sleeping';
  socialContext?: 'alone' | 'family' | 'friends' | 'colleagues' | 'strangers';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: 'weekday' | 'weekend';
  calendarStatus?: 'free' | 'busy' | 'in-meeting' | 'blocked';
}

// Curiosity states
export interface CuriosityState {
  level: number; // 0-100
  topics: string[];
  questionsAsked: number;
  deepDives: number;
  pattern: CuriosityPattern;
}

export type CuriosityPattern = 'exploratory' | 'focused' | 'passive' | 'engaged';

// Humor states
export interface HumorState {
  level: number; // 0-100
  jokesMade: number;
  laughterDetected: number;
  appropriateTopics: string[];
  inappropriateTopics: string[];
  pattern: HumorPattern;
}

export type HumorPattern = 'playful' | 'serious' | 'sarcastic' | 'warm' | 'neutral';

// Conflict states
export interface ConflictState {
  level: number; // 0-100
  disagreementDetected: boolean;
  topicsOfDisagreement: string[];
  responseStyle: ConflictResponseStyle;
  openness: number; // 0-100
}

export type ConflictResponseStyle = 'avoiding' | 'accommodating' | 'competing' | 'collaborating' | 'compromising';

// Complete presence
export interface HumanPresence {
  userId: string;
  state: PresenceState;
  energy: EnergyState;
  attention: AttentionState;
  curiosity: CuriosityState;
  humor: HumorState;
  conflict: ConflictState;
  context: PresenceContext;
  lastUpdated: string;
  confidence: number; // 0-100
}

// Presence adaptation
export interface PresenceAdaptation {
  responsePace: number; // words per minute
  responseLength: 'short' | 'medium' | 'long';
  formality: number; // 0-1
  warmth: number; // 0-1
  interruptions: 'allowed' | 'minimal' | 'none';
  humor: 'none' | 'light' | 'moderate' | 'high';
  emotion: 'neutral' | 'empathetic' | 'warm' | 'professional';
  recommendedTone: string;
}

// API Request/Response types
export interface UpdatePresenceRequest {
  userId: string;
  state?: PresenceState;
  energy?: Partial<EnergyState>;
  attention?: Partial<AttentionState>;
  context?: Partial<PresenceContext>;
}

export interface GetPresenceRequest {
  userId: string;
  includeAdaptation?: boolean;
}

export interface AnalyzeConversationRequest {
  userId: string;
  transcript: string;
  emotionalSignals?: string[];
  speakingPace?: number;
  pausePatterns?: number[];
}

export interface PresenceInsight {
  type: 'attention' | 'energy' | 'curiosity' | 'humor' | 'conflict';
  insight: string;
  confidence: number;
  suggestion?: string;
}
