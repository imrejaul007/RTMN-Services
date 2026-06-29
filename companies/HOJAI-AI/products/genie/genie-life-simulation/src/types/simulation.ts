/**
 * Simulation Types — Spec Part 34: Life Simulation
 */

export interface SimulationRequest {
  userId: string;
  scenario: string;
  parameters: Record<string, any>;
  horizonMonths?: number;
}

export interface SimulationResult {
  scenarioId: string;
  userId: string;
  scenario: string;
  timeline: TimelineEvent[];
  impacts: Impact[];
  risks: Risk[];
  recommendations: string[];
  confidence: number;
  summary: string;
}

export interface TimelineEvent {
  month: number;
  event: string;
  category: 'financial' | 'health' | 'career' | 'relationships' | 'lifestyle';
  impact: 'positive' | 'neutral' | 'negative';
  magnitude: number;     // 0-100
}

export interface Impact {
  area: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  magnitude: number;     // 0-100
  timeframe: string;
}

export interface Risk {
  category: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high';
  mitigation?: string;
}