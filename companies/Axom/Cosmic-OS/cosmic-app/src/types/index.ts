/**
 * Cosmic OS - Types
 */

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

export type Domain = 'emotional' | 'relationship' | 'career' | 'financial' | 'health' | 'spiritual' | 'social';

export type AgentType = 'mystic' | 'healer' | 'strategist' | 'oracle' | 'connector' | 'wealth_guide' | 'explorer';

export interface CosmicState {
  energyLevel: EnergyLevel;
  emotionalTone: string;
  socialEnergy: number;
  focusScore: number;
  relationshipEnergy: number;
  financialEnergy: number;
  growthEnergy: number;
}

export interface MoodOption {
  value: Mood;
  label: string;
  emoji: string;
  color: string;
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

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  specialty: Domain;
  emoji: string;
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
}
