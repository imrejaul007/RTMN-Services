/**
 * Health Types — Spec Part 28: Health Intelligence
 */

export interface SleepLog {
  id: string;
  userId: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  bedtime: string;
  wakeTime: string;
  date: Date;
  notes?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  food: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: Date;
  portion?: 'small' | 'medium' | 'large';
  reaction?: 'none' | 'mild' | 'moderate' | 'severe';
  symptoms?: string[];
  notes?: string;
}

export interface ExerciseLog {
  id: string;
  userId: string;
  type: string;
  duration: number;       // minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  date: Date;
  calories?: number;
}

export interface EnergyLevel {
  userId: string;
  date: Date;
  level: number;        // 0-100
  factors?: string[];
}

export interface HealthInsight {
  type: 'sleep' | 'food' | 'exercise' | 'energy' | 'burnout';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  description: string;
  patterns: string[];
  recommendations: string[];
  confidence: number;
}

export interface GastricTrigger {
  food: string;
  symptom: string;
  correlation: number;    // 0-1
  occurrences: number;
  timeOfDay?: string;
}

export interface BurnoutRisk {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;         // 0-100
  factors: Array<{ name: string; weight: number; value: number }>;
  recommendations: string[];
}