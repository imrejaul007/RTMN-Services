/**
 * Cosmic OS - Type Definitions
 *
 * AI Council of Agents, cosmic interpretation, spiritual abstraction
 */

// ============================================
// Enums
// ============================================

export type Mood =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative'
  | 'anxious'
  | 'calm'
  | 'energetic'
  | 'tired'
  | 'stressed'
  | 'peaceful';

export type EnergyLevel = 'high' | 'medium' | 'low';

export type Domain =
  | 'emotional'
  | 'relationship'
  | 'career'
  | 'financial'
  | 'health'
  | 'spiritual'
  | 'social';

export type AgentType =
  | 'mystic'
  | 'healer'
  | 'strategist'
  | 'oracle'
  | 'connector'
  | 'wealth_guide'
  | 'explorer';

// ============================================
// Core Types
// ============================================

export interface CosmicState {
  energyLevel: EnergyLevel;
  emotionalTone: string;
  socialEnergy: number;
  focusScore: number;
  relationshipEnergy: number;
  financialEnergy: number;
  growthEnergy: number;
}

export interface MoodCheckIn {
  userId: string;
  mood: Mood;
  energy: number;
  context?: {
    socialInteractions?: number;
    financialStress?: number;
    workStress?: number;
    healthStatus?: string;
    recentEvents?: string[];
  };
  timestamp: string;
}

export interface Insight {
  agent: AgentType;
  category: Domain;
  title: string;
  interpretation: string;
  symbolic: string;
  practical: string;
  timing?: string;
  confidence: number;
}

export interface CouncilResponse {
  cosmicState: CosmicState;
  mood: Mood;
  energy: number;
  insights: Insight[];
  consensus?: {
    theme: string;
    summary: string;
    suggestedAction: string;
  };
  dailyAffirmation?: string;
  caution?: string;
  timestamp: string;
}

export interface DailyReading {
  userId: string;
  date: string;
  cosmicState: CosmicState;
  insights: Insight[];
  affirmation: string;
  theme: string;
  suggestedActions: string[];
  avoidedActions: string[];
  moonPhase?: string;
  luckyColor?: string;
  luckyNumber?: number;
}

export interface DomainGuidance {
  domain: Domain;
  guidance: string;
  actionItems: string[];
  affirmations: string[];
  warnings?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

// ============================================
// Connected Services
// ============================================

export interface EmotionalServiceResponse {
  emotionalState: string;
  sentiment: number;
  triggers: string[];
}

export interface LifePatternResponse {
  patterns: {
    name: string;
    frequency: number;
    meaning: string;
  }[];
  growth: number;
  alignment: number;
}

export interface HumanContextResponse {
  relationships: {
    quality: number;
    stress: number;
    opportunities: string[];
  };
  goals: {
    progress: number;
    blockers: string[];
  }[];
}
