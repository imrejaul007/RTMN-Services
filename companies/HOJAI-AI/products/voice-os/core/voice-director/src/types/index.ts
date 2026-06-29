/**
 * Voice Director Types
 * ====================
 * Voice directive generation for emotionally authentic speech synthesis.
 */

// Emotion states for voice synthesis
export const VOICE_EMOTIONS = {
  calm: { emoji: '😌', intensity: 0.5 },
  happy: { emoji: '😊', intensity: 0.8 },
  excited: { emoji: '🎉', intensity: 1.0 },
  serious: { emoji: '😐', intensity: 0.6 },
  empathetic: { emoji: '🤗', intensity: 0.7 },
  concerned: { emoji: '😟', intensity: 0.7 },
  professional: { emoji: '💼', intensity: 0.5 },
  celebratory: { emoji: '🎊', intensity: 1.0 },
  motivational: { emoji: '💪', intensity: 0.9 },
  reflective: { emoji: '🤔', intensity: 0.6 },
  whispering: { emoji: '🤫', intensity: 0.3 },
  confident: { emoji: '😎', intensity: 0.8 },
  playful: { emoji: '😄', intensity: 0.7 },
  warm: { emoji: '☺️', intensity: 0.6 },
  comforting: { emoji: '🤗', intensity: 0.7 },
  hopeful: { emoji: '🌅', intensity: 0.8 }
} as const;

export type VoiceEmotion = keyof typeof VOICE_EMOTIONS;

// Voice expressions (like stage directions)
export type VoiceExpression =
  | 'SOFT_LAUGH'
  | 'CHUCKLE'
  | 'SMILE'
  | 'WHISPER'
  | 'BREATH'
  | 'EXCITED'
  | 'SERIOUS'
  | 'THOUGHTFUL'
  | 'WARM'
  | 'CONCERNED'
  | 'EMPHATIC'
  | 'PAUSE'
  | 'SIGH'
  | 'HESITATION';

// Pace settings
export const PACE_SETTINGS = {
  very_slow: 0.6,
  slow: 0.75,
  normal: 0.9,
  fast: 1.1,
  very_fast: 1.3
} as const;

export type PaceSetting = keyof typeof PACE_SETTINGS;

// Volume levels
export type VolumeLevel = 'very_soft' | 'soft' | 'normal' | 'loud' | 'very_loud';

// Energy levels
export type EnergyLevel = 'low' | 'medium' | 'high';

// The complete voice directive
export interface VoiceDirective {
  emotion: VoiceEmotion;
  pace: number; // 0.5 - 1.5
  volume: VolumeLevel;
  pauseBeforeMs: number;
  pauseAfterMs: number;
  emphasis: string[]; // Words/phrases to emphasize
  expressions: VoiceExpression[];
  smile: boolean;
  energy: EnergyLevel;
  warmth: number; // 0-1
  formality: number; // 0-1 (casual - formal)
}

// Personality modes
export interface PersonalityMode {
  id: string;
  name: string;
  baseDirective: Partial<VoiceDirective>;
  relationshipTypes: string[];
  formalityRange: [number, number];
  warmthRange: [number, number];
  defaultPace: number;
  defaultEmotion: VoiceEmotion;
}

export const PERSONALITY_MODES: Record<string, PersonalityMode> = {
  founder: {
    id: 'founder',
    name: 'Founder Mode',
    baseDirective: { pace: 1.0, formality: 0.7, warmth: 0.6 },
    relationshipTypes: ['investor', 'partner', 'employee'],
    formalityRange: [0.5, 1.0],
    warmthRange: [0.4, 0.8],
    defaultPace: 1.0,
    defaultEmotion: 'professional'
  },
  friend: {
    id: 'friend',
    name: 'Friend Mode',
    baseDirective: { pace: 1.05, formality: 0.2, warmth: 0.9 },
    relationshipTypes: ['friend', 'family'],
    formalityRange: [0.0, 0.3],
    warmthRange: [0.7, 1.0],
    defaultPace: 1.05,
    defaultEmotion: 'playful'
  },
  mother: {
    id: 'mother',
    name: 'Mother Mode',
    baseDirective: { pace: 0.85, formality: 0.3, warmth: 1.0 },
    relationshipTypes: ['mother'],
    formalityRange: [0.1, 0.5],
    warmthRange: [0.8, 1.0],
    defaultPace: 0.85,
    defaultEmotion: 'warm'
  },
  professional: {
    id: 'professional',
    name: 'Professional Mode',
    baseDirective: { pace: 0.95, formality: 0.9, warmth: 0.5 },
    relationshipTypes: ['customer', 'investor', 'partner'],
    formalityRange: [0.7, 1.0],
    warmthRange: [0.3, 0.7],
    defaultPace: 0.95,
    defaultEmotion: 'professional'
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher Mode',
    baseDirective: { pace: 0.85, formality: 0.6, warmth: 0.7 },
    relationshipTypes: ['student', 'learner'],
    formalityRange: [0.4, 0.8],
    warmthRange: [0.5, 0.9],
    defaultPace: 0.85,
    defaultEmotion: 'reflective'
  },
  coach: {
    id: 'coach',
    name: 'Coach Mode',
    baseDirective: { pace: 1.1, formality: 0.4, warmth: 0.8 },
    relationshipTypes: ['coachee', 'team'],
    formalityRange: [0.2, 0.6],
    warmthRange: [0.6, 1.0],
    defaultPace: 1.1,
    defaultEmotion: 'motivational'
  },
  child: {
    id: 'child',
    name: 'Child Mode',
    baseDirective: { pace: 1.15, formality: 0.1, warmth: 1.0 },
    relationshipTypes: ['child'],
    formalityRange: [0.0, 0.2],
    warmthRange: [0.8, 1.0],
    defaultPace: 1.15,
    defaultEmotion: 'playful'
  }
} as const;

// Voice Blueprint - full instruction set for TTS
export interface VoiceBlueprint {
  text: string;
  directive: VoiceDirective;
  timing: {
    estimatedDurationMs: number;
    pausePoints: PausePoint[];
    expressionTimings: ExpressionTiming[];
  };
  meta: {
    relationship?: string;
    context?: string;
    originalEmotion?: string;
    generatedAt: number;
  };
}

export interface PausePoint {
  position: number; // Character position in text
  durationMs: number;
  reason: 'comma' | 'period' | 'emphasis' | 'emotional' | 'breath' | 'correction';
}

export interface ExpressionTiming {
  expression: VoiceExpression;
  startPosition: number;
  durationMs: number;
}

// API Request/Response types
export interface GenerateDirectiveRequest {
  text: string;
  emotion: string;
  relationship?: string;
  personalityMode?: string;
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    location?: string;
    urgency?: 'low' | 'medium' | 'high';
    formality?: number; // 0-1
    warmth?: number; // 0-1
  };
}

export interface GenerateDirectiveResponse {
  success: boolean;
  directive: VoiceDirective;
  blueprint: VoiceBlueprint;
}

export interface BatchDirectiveRequest {
  utterances: Array<{
    text: string;
    emotion: string;
    relationship?: string;
  }>;
  personalityMode?: string;
}

export interface BatchDirectiveResponse {
  success: boolean;
  blueprints: VoiceBlueprint[];
}
