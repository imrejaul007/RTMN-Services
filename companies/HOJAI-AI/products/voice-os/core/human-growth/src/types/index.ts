/**
 * Human Growth Engine Types
 * ========================
 * Tracks personal growth: skills, habits, goals, values evolution.
 */

// Growth categories
export type GrowthCategory =
  | 'skills'
  | 'habits'
  | 'health'
  | 'faith'
  | 'career'
  | 'relationships'
  | 'finance'
  | 'creativity'
  | 'knowledge'
  | 'leadership';

export interface GrowthMetric {
  id: string;
  userId: string;
  category: GrowthCategory;
  name: string;
  description: string;
  currentLevel: number; // 1-10
  targetLevel?: number;
  streak?: number;
  bestStreak?: number;
  totalSessions: number;
  lastUpdated: string;
  history: GrowthDataPoint[];
}

export interface GrowthDataPoint {
  timestamp: string;
  value: number;
  note?: string;
}

// Goals
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'long-term';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: GrowthCategory;
  status: GoalStatus;
  priority: GoalPriority;
  timeframe: GoalTimeframe;
  progress: number; // 0-100
  milestones: GoalMilestone[];
  createdAt: string;
  targetDate?: string;
  completedAt?: string;
  relatedHabits: string[];
  relatedSkills: string[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

// Habits
export type HabitFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: GrowthCategory;
  frequency: HabitFrequency;
  customDays?: number[]; // 0-6 for custom weekly
  status: HabitStatus;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number; // percentage
  reminderTime?: string;
  createdAt: string;
  history: HabitCompletion[];
}

export interface HabitCompletion {
  date: string;
  completed: boolean;
  skipped: boolean;
  note?: string;
}

// Skills
export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: GrowthCategory;
  level: number; // 1-10
  endorsements: number;
  verified: boolean;
  learningStarted?: string;
  lastPracticed?: string;
  resources: SkillResource[];
  progress: SkillProgress[];
}

export interface SkillResource {
  title: string;
  url?: string;
  type: 'course' | 'book' | 'article' | 'video' | 'practice';
  completed: boolean;
}

export interface SkillProgress {
  date: string;
  level: number;
  note?: string;
}

// Values & Principles
export interface Value {
  id: string;
  userId: string;
  name: string;
  description: string;
  importance: number; // 1-10
  alignment: number; // how well living up to it 0-100
  examples: string[];
  violations?: string[];
}

export interface ValueEvolution {
  userId: string;
  values: Value[];
  timeline: ValueChange[];
  insights: ValueInsight[];
}

export interface ValueChange {
  timestamp: string;
  valueId: string;
  change: 'added' | 'removed' | 'updated';
  previousValue?: number;
  newValue?: number;
  reason: string;
}

export interface ValueInsight {
  type: 'growth' | 'challenge' | 'alignment';
  insight: string;
  timestamp: string;
}

// Growth Summary
export interface GrowthSummary {
  userId: string;
  period: 'week' | 'month' | 'year';
  generatedAt: string;
  overallGrowth: number; // percentage
  topWins: string[];
  areasForImprovement: string[];
  newHabitsFormed: number;
  goalsCompleted: number;
  skillsImproved: string[];
  insights: GrowthInsight[];
  recommendations: string[];
  reflection: string;
}

export interface GrowthInsight {
  type: 'pattern' | 'achievement' | 'struggle' | 'opportunity';
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
}

// API Request/Response types
export interface TrackProgressRequest {
  userId: string;
  category: GrowthCategory;
  name: string;
  value: number;
  note?: string;
}

export interface CreateGoalRequest {
  userId: string;
  title: string;
  description?: string;
  category: GrowthCategory;
  priority: GoalPriority;
  timeframe: GoalTimeframe;
  targetDate?: string;
}

export interface CreateHabitRequest {
  userId: string;
  name: string;
  description?: string;
  category: GrowthCategory;
  frequency: HabitFrequency;
  customDays?: number[];
  reminderTime?: string;
}

export interface GetGrowthSummaryRequest {
  userId: string;
  period: 'week' | 'month' | 'year';
}
