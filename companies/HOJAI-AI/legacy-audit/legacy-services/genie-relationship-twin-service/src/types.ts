/**
 * GENIE Relationship Twin Service
 * Version: 1.0.0 | Date: June 15, 2026
 */

export interface Relationship {
  id: string;
  user_id: string;
  person_id: string;
  name: string;
  type: 'family' | 'friend' | 'colleague' | 'client' | 'partner' | 'acquaintance';
  relationship: string;
  importance: number; // 0-100
  health_score: number; // 0-100
  last_interaction: string;
  next_action?: string;
  interactions: Interaction[];
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  type: 'call' | 'message' | 'meeting' | 'email' | 'social' | 'birthday' | 'event';
  date: string;
  duration_minutes?: number;
  notes?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface RelationshipSummary {
  total_relationships: number;
  healthy_count: number;
  at_risk_count: number;
  neglected_count: number;
  top_relationships: Relationship[];
  needs_attention: Relationship[];
}
