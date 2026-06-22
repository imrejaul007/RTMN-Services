/**
 * VibeProfile Model - MongoDB Schema
 * Spontaa-inspired: captures user behavioral vibe classification
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IVibeProfile extends Document {
  userId: string;
  primaryVibe: 'spontaneous' | 'planned' | 'quality' | 'budget' | 'social' | 'solitary' | 'luxury' | 'adventurous';
  secondaryVibe: string;
  intensity: number; // 0-1
  confidence: number; // 0-1
  travelSpontaneity: number; // 0-1, how spontaneous in travel
  diningSpontaneity: number; // 0-1
  spendingProfile: 'budget' | 'moderate' | 'premium' | 'luxury';
  socialScore: number; // 0-1, how social vs solitary
  derivedFromSignals: string[]; // which event patterns informed this
  lastUpdated: Date;
}

const VibeProfileSchema = new Schema<IVibeProfile>({
  userId: { type: String, required: true, unique: true },
  primaryVibe: { type: String, enum: ['spontaneous', 'planned', 'quality', 'budget', 'social', 'solitary', 'luxury', 'adventurous'] },
  secondaryVibe: String,
  intensity: { type: Number, min: 0, max: 1, default: 0.5 },
  confidence: { type: Number, min: 0, max: 1, default: 0.3 },
  travelSpontaneity: { type: Number, min: 0, max: 1, default: 0.5 },
  diningSpontaneity: { type: Number, min: 0, max: 1, default: 0.5 },
  spendingProfile: { type: String, enum: ['budget', 'moderate', 'premium', 'luxury'] },
  socialScore: { type: Number, min: 0, max: 1, default: 0.5 },
  derivedFromSignals: [String],
  lastUpdated: { type: Date, default: Date.now },
});

export const VibeProfile = mongoose.model<IVibeProfile>('VibeProfile', VibeProfileSchema);
