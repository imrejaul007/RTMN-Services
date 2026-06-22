/**
 * GENIE Personal Twin Service - Type Definitions
 * Version: 1.0.0 | Date: June 15, 2026
 * Purpose: Personal Twin for Genie - Individual user intelligence
 *
 * This creates a digital twin of each user with:
 * - Identity & Profile
 * - Preferences & Habits
 * - Goals & Aspirations
 * - Timeline & History
 * - Behavioral Patterns
 * - Predictive Intelligence
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export interface PersonalTwin {
  id: string;
  user_id: string;

  // Identity Layer
  identity: Identity;

  // Profile Layer
  profile: Profile;

  // Preference Layer
  preferences: Preferences;

  // Behavioral Layer
  behavioral: BehavioralData;

  // Goals & Aspirations
  goals: Goal[];

  // Timeline of life events
  timeline: TimelineEvent[];

  // Relationships
  relationships: RelationshipContext;

  // Financial Context
  financial: FinancialContext;

  // Health Context
  health: HealthContext;

  // Professional Context
  professional: ProfessionalContext;

  // Predictive Intelligence
  predictive: PredictiveData;

  // Communication Style
  communication: CommunicationStyle;

  // Created & Updated
  created_at: string;
  updated_at: string;
  last_active: string;
}

export interface Identity {
  name: string;
  age?: number;
  date_of_birth?: string;
  gender?: string;
  location?: Location;
  occupation?: string;
  bio?: string;
  avatar_url?: string;
  languages: string[];
  timezone: string;
}

export interface Location {
  city?: string;
  state?: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface Profile {
  personality: Personality;
  values: string[];
  interests: string[];
  hobbies: string[];
  beliefs: string[];
  strengths: string[];
  weaknesses: string[];
  motivations: string[];
  fears: string[];
}

export interface Personality {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neurotocism: number;

  // Big Five sub-traits
  big_five?: {
    openness: { adventurous, creative, curious };
    conscientiousness: { organized, dependable, disciplined };
    extraversion: { outgoing, energetic, enthusiastic };
    agreeableness: { trustworthy, altruistic, cooperative };
    neuroticism: { anxious, moody, emotional };
  };
}

export interface Preferences {
  // Food & Dining
  food: FoodPreferences;

  // Travel
  travel: TravelPreferences;

  // Shopping
  shopping: ShoppingPreferences;

  // Entertainment
  entertainment: EntertainmentPreferences;

  // Communication
  communication: CommunicationPreferences;

  // Lifestyle
  lifestyle: LifestylePreferences;
}

export interface FoodPreferences {
  cuisines: string[];
  dietary_restrictions: string[];
  allergies: string[];
  favorite_restaurants: string[];
  price_range: 'budget' | 'moderate' | 'expensive' | 'luxury';
  cooking_skill: 'novice' | 'intermediate' | 'expert';
  meal_preferences: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
}

export interface TravelPreferences {
  destinations: string[];
  travel_style: 'backpacker' | 'budget' | 'comfortable' | 'luxury';
  accommodation_types: string[];
  activities: string[];
  preferred_seasons: string[];
  frequent_flyer: boolean;
  passport_countries: number;
}

export interface ShoppingPreferences {
  brands: string[];
  categories: string[];
  price_sensitivity: number; // 0-100
  prefer_online: boolean;
  loyalty_programs: string[];
}

export interface EntertainmentPreferences {
  movies: string[];
  music: string[];
  books: string[];
  sports: string[];
  games: string[];
  streaming_services: string[];
}

export interface CommunicationPreferences {
  tone: 'formal' | 'casual' | 'friendly';
  response_style: 'quick' | 'detailed' | 'minimal';
  preferred_channel: 'chat' | 'voice' | 'email';
  notification_preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
}

export interface LifestylePreferences {
  sleep_schedule: string;
  exercise_frequency: string;
  work_schedule: string;
  social_frequency: string;
  environment: 'city' | 'suburban' | 'rural';
}

export interface BehavioralData {
  // Daily patterns
  daily_routine: RoutineEvent[];

  // Purchase patterns
  purchase_patterns: PurchasePattern[];

  // Browsing patterns
  browsing_patterns: BrowsingPattern[];

  // Engagement scores
  engagement_score: number;
  activity_score: number;

  // Last active
  last_active: string;
  active_hours: number[]; // 0-23
  active_days: number[]; // 0-6 (Sunday-Saturday)
}

export interface RoutineEvent {
  time: string; // HH:mm
  activity: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

export interface PurchasePattern {
  category: string;
  frequency: string;
  average_amount: number;
  preferred_stores: string[];
  last_purchase?: string;
}

export interface BrowsingPattern {
  category: string;
  frequency: string;
  avg_time_spent: number; // minutes
  devices: string[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'career' | 'financial' | 'personal' | 'relationship' | 'learning';
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  progress: number; // 0-100
  target_date?: string;
  milestones: Milestone[];
  created_at: string;
  completed_at?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'personal' | 'professional' | 'travel' | 'health' | 'relationship' | 'financial' | 'achievement';
  title: string;
  description: string;
  date: string;
  location?: string;
  people_involved?: string[];
  emotions?: string[];
  impact?: 'positive' | 'negative' | 'neutral';
}

export interface RelationshipContext {
  family: FamilyMember[];
  close_friends: string[];
  professional_contacts: number;
  acquaintances: number;
  recent_interactions: Interaction[];
  relationship_health: RelationshipHealth;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  birthday?: string;
  anniversary?: string;
  contact_frequency: string;
  last_contact?: string;
  notes?: string;
}

export interface Interaction {
  person_id: string;
  type: 'call' | 'message' | 'meeting' | 'email' | 'social';
  date: string;
  duration_minutes?: number;
  notes?: string;
}

export interface RelationshipHealth {
  person_id: string;
  name: string;
  health_score: number; // 0-100
  last_interaction: string;
  next_action?: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface FinancialContext {
  income_bracket: string;
  savings_rate?: number;
  investment_profile: 'conservative' | 'moderate' | 'aggressive';
  monthly_expenses: number;
  financial_goals: string[];
  bankAccounts?: BankAccount[];
  investments?: Investment[];
}

export interface BankAccount {
  bank: string;
  type: 'savings' | 'checking' | 'current';
  balance: number;
  account_number_masked: string;
}

export interface Investment {
  type: string;
  amount: number;
  returns?: number;
  risk_level: string;
}

export interface HealthContext {
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  fitness_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  health_goals: string[];
  fitness_history?: FitnessEvent[];
  last_checkup?: string;
}

export interface FitnessEvent {
  date: string;
  activity: string;
  duration_minutes: number;
  calories_burned?: number;
}

export interface ProfessionalContext {
  current_role?: string;
  company?: string;
  industry?: string;
  years_experience: number;
  skills: string[];
  certifications?: string[];
  education?: Education[];
  career_goals?: string[];
  networking_goals?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year_graduated?: string;
}

export interface PredictiveData {
  // Likelihood scores
  churn_risk: number; // 0-100
  lifetime_value: number;
  engagement_trend: 'increasing' | 'stable' | 'decreasing';

  // Next likely actions
  next_purchase_category?: string;
  next_travel_destination?: string;
  next_goal_suggestion?: string;

  // Risk indicators
  burnout_risk?: number;
  financial_stress_risk?: number;
  health_risk_factors?: string[];

  // Recommendations
  recommendations: Recommendation[];
}

export interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CommunicationStyle {
  formality: number; // 0-100 (casual-formal)
  verbosity: number; // 0-100 (brief-verbose)
  humor: number; // 0-100
  empathy: number; // 0-100
  directness: number; // 0-100
  preferred_greeting: string;
  preferred_closing: string;
  phrases_to_use?: string[];
  phrases_to_avoid?: string[];
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateTwinSchema = z.object({
  user_id: z.string().min(1),
  identity: z.object({
    name: z.string().min(1),
    age: z.number().optional(),
    gender: z.string().optional(),
    location: z.object({
      city: z.string().optional(),
      country: z.string().default('India'),
      timezone: z.string().default('Asia/Kolkata'),
    }).optional(),
    occupation: z.string().optional(),
    languages: z.array(z.string()).default(['English']),
    timezone: z.string().default('Asia/Kolkata'),
  }),
});

export const UpdateTwinSchema = z.object({
  identity: z.object({
    name: z.string().min(1).optional(),
    occupation: z.string().optional(),
    bio: z.string().optional(),
  }).optional(),
  preferences: z.object({
    food: z.object({
      cuisines: z.array(z.string()).optional(),
      dietary_restrictions: z.array(z.string()).optional(),
      price_range: z.enum(['budget', 'moderate', 'expensive', 'luxury']).optional(),
    }).optional(),
  }).optional(),
  goals: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(['health', 'career', 'financial', 'personal', 'relationship', 'learning']).optional(),
    target_date: z.string().optional(),
  })).optional(),
});

// ============================================================================
// Express Types
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
