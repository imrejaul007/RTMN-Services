/**
 * GENIE Personal Twin Service - Business Logic
 * Version: 1.0.0 | Date: June 15, 2026
 *
 * Creates and manages Personal Twins for Genie
 * A Personal Twin is a digital representation of each user
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import { PersonalTwin, CreateTwinSchema, Goal } from '../types.js';

const logger = createLogger('personal-twin-service');

// In-memory storage (replace with database in production)
const twins = new Map<string, PersonalTwin>();

// ============================================================================
// Twin CRUD
// ============================================================================

/**
 * Create a new Personal Twin
 */
export async function createTwin(
  userId: string,
  input: { identity?: { name: string; [key: string]: unknown } }
): Promise<PersonalTwin> {
  logger.info('create_twin', { userId });

  const twin: PersonalTwin = {
    id: uuidv4(),
    user_id: userId,

    // Identity
    identity: {
      name: input.identity?.name || 'User',
      location: { country: 'India', timezone: 'Asia/Kolkata' },
      languages: ['English'],
      ...input.identity,
    },

    // Profile
    profile: {
      personality: {
        openness: 70,
        conscientiousness: 60,
        extraversion: 50,
        agreeableness: 70,
        neurotocism: 40,
      },
      values: [],
      interests: [],
      hobbies: [],
      beliefs: [],
      strengths: [],
      weaknesses: [],
      motivations: [],
      fears: [],
    },

    // Preferences
    preferences: {
      food: {
        cuisines: [],
        dietary_restrictions: [],
        allergies: [],
        favorite_restaurants: [],
        price_range: 'moderate',
        cooking_skill: 'intermediate',
        meal_preferences: {},
      },
      travel: {
        destinations: [],
        travel_style: 'comfortable',
        accommodation_types: [],
        activities: [],
        preferred_seasons: [],
        frequent_flyer: false,
        passport_countries: 0,
      },
      shopping: {
        brands: [],
        categories: [],
        price_sensitivity: 50,
        prefer_online: true,
        loyalty_programs: [],
      },
      entertainment: {
        movies: [],
        music: [],
        books: [],
        sports: [],
        games: [],
        streaming_services: [],
      },
      communication: {
        tone: 'casual',
        response_style: 'detailed',
        preferred_channel: 'chat',
        notification_preferences: {
          email: true,
          push: true,
          sms: false,
          frequency: 'realtime',
        },
      },
      lifestyle: {
        sleep_schedule: '23:00',
        exercise_frequency: 'weekly',
        work_schedule: '09:00-18:00',
        social_frequency: 'weekly',
        environment: 'city',
      },
    },

    // Behavioral
    behavioral: {
      daily_routine: [],
      purchase_patterns: [],
      browsing_patterns: [],
      engagement_score: 50,
      activity_score: 50,
      last_active: new Date().toISOString(),
      active_hours: [9, 10, 11, 14, 15, 16, 17, 18],
      active_days: [1, 2, 3, 4, 5], // Mon-Fri
    },

    // Goals
    goals: [],

    // Timeline
    timeline: [],

    // Relationships
    relationships: {
      family: [],
      close_friends: [],
      professional_contacts: 0,
      acquaintances: 0,
      recent_interactions: [],
      relationship_health: [],
    },

    // Financial
    financial: {
      income_bracket: 'mid',
      investment_profile: 'moderate',
      monthly_expenses: 0,
      financial_goals: [],
    },

    // Health
    health: {
      fitness_level: 'moderate',
      health_goals: [],
    },

    // Professional
    professional: {
      years_experience: 0,
      skills: [],
    },

    // Predictive
    predictive: {
      churn_risk: 10,
      lifetime_value: 0,
      engagement_trend: 'stable',
      recommendations: [],
    },

    // Communication Style
    communication: {
      formality: 50,
      verbosity: 50,
      humor: 50,
      empathy: 70,
      directness: 60,
      preferred_greeting: 'Hi',
      preferred_closing: 'Thanks',
    },

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };

  twins.set(twin.id, twin);
  twins.set(userId, twin); // Also index by userId

  logger.info('twin_created', { twinId: twin.id, userId });
  return twin;
}

/**
 * Get Personal Twin by user ID
 */
export async function getTwin(userId: string): Promise<PersonalTwin | null> {
  logger.info('get_twin', { userId });
  return twins.get(userId) || null;
}

/**
 * Update Personal Twin
 */
export async function updateTwin(
  userId: string,
  updates: Partial<PersonalTwin>
): Promise<PersonalTwin | null> {
  logger.info('update_twin', { userId, updates });

  const twin = twins.get(userId);
  if (!twin) return null;

  const updated: PersonalTwin = {
    ...twin,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  twins.set(userId, updated);
  logger.info('twin_updated', { userId });
  return updated;
}

// ============================================================================
// Goals
// ============================================================================

/**
 * Add a goal
 */
export async function addGoal(
  userId: string,
  goal: { title: string; description?: string; category?: string; target_date?: string }
): Promise<Goal | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  const newGoal: Goal = {
    id: uuidv4(),
    title: goal.title,
    description: goal.description || '',
    category: (goal.category as Goal['category']) || 'personal',
    status: 'active',
    progress: 0,
    target_date: goal.target_date,
    milestones: [],
    created_at: new Date().toISOString(),
  };

  twin.goals.push(newGoal);
  twin.updated_at = new Date().toISOString();
  twins.set(userId, twin);

  logger.info('goal_added', { userId, goalId: newGoal.id });
  return newGoal;
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  userId: string,
  goalId: string,
  progress: number
): Promise<Goal | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  const goal = twin.goals.find(g => g.id === goalId);
  if (!goal) return null;

  goal.progress = Math.min(100, Math.max(0, progress));
  if (goal.progress === 100) {
    goal.status = 'completed';
    goal.completed_at = new Date().toISOString();
  }

  twin.updated_at = new Date().toISOString();
  twins.set(userId, twin);

  logger.info('goal_progress_updated', { userId, goalId, progress });
  return goal;
}

// ============================================================================
// Timeline
// ============================================================================

/**
 * Add timeline event
 */
export async function addTimelineEvent(
  userId: string,
  event: {
    type: string;
    title: string;
    description?: string;
    date: string;
    location?: string;
    people_involved?: string[];
  }
): Promise<PersonalTwin['timeline'][0] | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  const timelineEvent = {
    id: uuidv4(),
    type: event.type as PersonalTwin['timeline'][0]['type'],
    title: event.title,
    description: event.description || '',
    date: event.date,
    location: event.location,
    people_involved: event.people_involved,
  };

  twin.timeline.unshift(timelineEvent);
  twin.updated_at = new Date().toISOString();
  twins.set(userId, twin);

  logger.info('timeline_event_added', { userId, eventId: timelineEvent.id });
  return timelineEvent;
}

// ============================================================================
// Preferences
// ============================================================================

/**
 * Learn preference from behavior
 */
export async function learnPreference(
  userId: string,
  category: 'food' | 'travel' | 'shopping' | 'entertainment' | 'lifestyle',
  key: string,
  value: unknown
): Promise<PersonalTwin | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  // Learn based on category
  switch (category) {
    case 'food':
      if (Array.isArray(twin.preferences.food.cuisines)) {
        if (!twin.preferences.food.cuisines.includes(key)) {
          twin.preferences.food.cuisines.push(key);
        }
      }
      break;
    case 'travel':
      if (Array.isArray(twin.preferences.travel.destinations)) {
        if (!twin.preferences.travel.destinations.includes(key)) {
          twin.preferences.travel.destinations.push(key);
        }
      }
      break;
    case 'shopping':
      if (Array.isArray(twin.preferences.shopping.categories)) {
        if (!twin.preferences.shopping.categories.includes(key)) {
          twin.preferences.shopping.categories.push(key);
        }
      }
      break;
    case 'entertainment':
      if (Array.isArray(twin.preferences.entertainment.movies)) {
        if (!twin.preferences.entertainment.movies.includes(key)) {
          twin.preferences.entertainment.movies.push(key);
        }
      }
      break;
  }

  twin.behavioral.engagement_score = Math.min(100, twin.behavioral.engagement_score + 1);
  twin.last_active = new Date().toISOString();
  twin.updated_at = new Date().toISOString();
  twins.set(userId, twin);

  logger.info('preference_learned', { userId, category, key });
  return twin;
}

// ============================================================================
// Predictive Intelligence
// ============================================================================

/**
 * Get recommendations based on twin
 */
export async function getRecommendations(userId: string): Promise<PersonalTwin['predictive']['recommendations']> {
  const twin = twins.get(userId);
  if (!twin) return [];

  const recommendations: PersonalTwin['predictive']['recommendations'] = [];

  // Check goals
  const activeGoals = twin.goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    recommendations.push({
      category: 'goals',
      title: `You have ${activeGoals.length} active goals`,
      description: 'Keep making progress on your goals',
      priority: 'high',
      reason: 'Active goals detected',
    });
  }

  // Check relationships
  const neglectedRelationships = twin.relationships.relationship_health.filter(
    r => r.health_score < 50
  );
  if (neglectedRelationships.length > 0) {
    recommendations.push({
      category: 'relationships',
      title: 'Some relationships need attention',
      description: `${neglectedRelationships.length} relationships have low interaction`,
      priority: 'medium',
      reason: 'Relationship health',
    });
  }

  // Check health
  if (twin.health.fitness_level === 'sedentary') {
    recommendations.push({
      category: 'health',
      title: 'Consider more physical activity',
      description: 'Your fitness level could be improved',
      priority: 'low',
      reason: 'Fitness assessment',
    });
  }

  return recommendations;
}

/**
 * Update predictive data
 */
export async function updatePredictiveData(
  userId: string,
  data: Partial<PersonalTwin['predictive']>
): Promise<PersonalTwin | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  twin.predictive = { ...twin.predictive, ...data };
  twin.updated_at = new Date().toISOString();
  twins.set(userId, twin);

  logger.info('predictive_updated', { userId });
  return twin;
}

// ============================================================================
// Summary
// ============================================================================

/**
 * Get twin summary
 */
export async function getTwinSummary(userId: string): Promise<{
  identity: PersonalTwin['identity'];
  goals_summary: { active: number; completed: number };
  timeline_summary: { total: number; recent: number };
  engagement_score: number;
  top_interests: string[];
  next_action?: string;
} | null> {
  const twin = twins.get(userId);
  if (!twin) return null;

  return {
    identity: twin.identity,
    goals_summary: {
      active: twin.goals.filter(g => g.status === 'active').length,
      completed: twin.goals.filter(g => g.status === 'completed').length,
    },
    timeline_summary: {
      total: twin.timeline.length,
      recent: twin.timeline.slice(0, 5).length,
    },
    engagement_score: twin.behavioral.engagement_score,
    top_interests: twin.profile.interests.slice(0, 5),
    next_action: twin.predictive.recommendations[0]?.title,
  };
}
