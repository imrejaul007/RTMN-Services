/**
 * Dream Types — Spec Part 33: Dream Journal
 */

export interface Dream {
  id: string;
  userId: string;
  capturedAt: Date;
  dreamDate: Date;              // When the dream happened
  description: string;
  vividness?: number;           // 1-10
  lucidity?: boolean;           // Lucid dream?
  emotions?: string[];
  symbols?: string[];
  people?: string[];
  locations?: string[];
  interpretation?: string;      // AI-generated interpretation
  themes?: string[];            // Detected themes
}

export interface DreamPattern {
  pattern: string;
  frequency: number;
  symbols: string[];
  emotions: string[];
  occurrences: Date[];
}

export interface DreamInsight {
  type: 'recurring' | 'emotional' | 'symbolic' | 'person' | 'location';
  title: string;
  description: string;
  patterns: DreamPattern[];
  interpretation: string;
  confidence: number;
}