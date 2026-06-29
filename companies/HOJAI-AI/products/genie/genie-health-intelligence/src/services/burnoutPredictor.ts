/**
 * Burnout Predictor — Detect burnout risk
 * Spec Part 28: Health Intelligence
 */

import axios from 'axios';
import { BurnoutRisk } from '../types/health.js';

const GENIE_WELLNESS_URL = process.env.GENIE_WELLNESS_URL || 'http://localhost:4723';
const GENIE_CALENDAR_URL = process.env.GENIE_CALENDAR_URL || 'http://localhost:4709';

interface BurnoutFactors {
  sleepAvg: number;
  exerciseFreq: number;       // per week
  meetingHours: number;        // per week
  workIntensity: number;       // 0-100
  recoveryTime: number;        // hours since last break
  socialInteraction: number;   // 0-10
}

export async function predictBurnout(userId: string): Promise<BurnoutRisk> {
  // Fetch factors
  const factors = await collectFactors(userId);

  // Calculate risk score (0-100)
  let score = 0;
  const weights: Array<{ name: string; weight: number; value: number }> = [];

  // Sleep contribution (30%)
  const sleepScore = factors.sleepAvg < 6 ? 30 : factors.sleepAvg < 7 ? 15 : 0;
  score += sleepScore;
  weights.push({ name: 'Sleep deficit', weight: 30, value: sleepScore });

  // Meeting overload (25%)
  const meetingScore = factors.meetingHours > 40 ? 25 : factors.meetingHours > 25 ? 12 : 0;
  score += meetingScore;
  weights.push({ name: 'Meeting overload', weight: 25, value: meetingScore });

  // Exercise deficit (15%)
  const exerciseScore = factors.exerciseFreq < 1 ? 15 : factors.exerciseFreq < 3 ? 7 : 0;
  score += exerciseScore;
  weights.push({ name: 'Exercise deficit', weight: 15, value: exerciseScore });

  // Work intensity (20%)
  const intensityScore = factors.workIntensity * 0.2;
  score += intensityScore;
  weights.push({ name: 'Work intensity', weight: 20, value: Math.round(intensityScore) });

  // No recovery (10%)
  const recoveryScore = factors.recoveryTime > 8 ? 10 : factors.recoveryTime > 4 ? 5 : 0;
  score += recoveryScore;
  weights.push({ name: 'No recovery time', weight: 10, value: recoveryScore });

  const riskLevel: BurnoutRisk['riskLevel'] =
    score >= 70 ? 'high' :
    score >= 40 ? 'medium' : 'low';

  const recommendations: string[] = [];
  if (factors.sleepAvg < 7) recommendations.push('Prioritize sleep — aim for 7+ hours');
  if (factors.meetingHours > 30) recommendations.push('Reduce meeting load — block focus time');
  if (factors.exerciseFreq < 3) recommendations.push('Exercise 3+ times per week');
  if (factors.recoveryTime > 4) recommendations.push('Take regular breaks');
  if (factors.socialInteraction < 3) recommendations.push('Connect with friends/family');

  return {
    userId,
    riskLevel,
    score: Math.round(score),
    factors: weights,
    recommendations,
  };
}

async function collectFactors(userId: string): Promise<BurnoutFactors> {
  // In production, fetch from wellness and calendar services
  // For now, return defaults that can be overridden by data
  return {
    sleepAvg: 7.0,
    exerciseFreq: 2,
    meetingHours: 20,
    workIntensity: 60,
    recoveryTime: 2,
    socialInteraction: 5,
  };
}