/**
 * Life Timeline Intelligence Types
 * ================================
 * Types for tracking life chapters, milestones, and personal evolution.
 */

// Life chapters
export type LifeChapter =
  | 'childhood'
  | 'education'
  | 'early-career'
  | 'career'
  | 'entrepreneurship'
  | 'relationships'
  | 'marriage'
  | 'parenthood'
  | 'midlife'
  | 'retirement'
  | 'legacy';

export interface LifeChapterData {
  chapter: LifeChapter;
  title: string;
  startYear: number;
  endYear?: number;
  summary: string;
  keyEvents: LifeEvent[];
  goals: string[];
  emotions: string[];
  lessons: string[];
  people: string[]; // People who were important during this chapter
  status: 'completed' | 'current' | 'planned';
}

// Life events
export interface LifeEvent {
  id: string;
  userId: string;
  type: EventType;
  title: string;
  description: string;
  date: string; // ISO date
  year: number;
  chapter?: LifeChapter;
  category: EventCategory;
  impact: 'low' | 'moderate' | 'high' | 'transformative';
  emotions: string[];
  emotionIntensity: number;
  people?: string[];
  location?: string;
  lessons?: string[];
  connections?: string[]; // Related event IDs
  milestone?: boolean;
  milestoneType?: MilestoneType;
  recurring?: boolean;
  recurringInterval?: 'yearly' | 'monthly' | 'weekly';
  photos?: string[];
  importance: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | 'achievement'
  | 'failure'
  | 'relationship-start'
  | 'relationship-end'
  | 'career-change'
  | 'location-change'
  | 'health-event'
  | 'financial-event'
  | 'learning'
  | 'travel'
  | 'family-event'
  | 'spiritual-event'
  | 'personal-growth'
  | 'milestone';

export type EventCategory =
  | 'personal'
  | 'career'
  | 'health'
  | 'finance'
  | 'relationship'
  | 'family'
  | 'education'
  | 'travel'
  | 'spiritual'
  | 'creative'
  | 'social';

export type MilestoneType =
  | 'birthday'
  | 'anniversary'
  | 'graduation'
  | 'promotion'
  | 'marriage'
  | 'child-birth'
  | 'first-home'
  | 'first-company'
  | 'retirement'
  | 'award'
  | 'recovery';

// Personal identity evolution
export interface IdentityEvolution {
  userId: string;
  timeline: IdentitySnapshot[];
  currentIdentity: CurrentIdentity;
  growthTrajectory: GrowthTrajectory;
}

export interface IdentitySnapshot {
  timestamp: string;
  year: number;
  age: number;
  lifeChapter: LifeChapter;
  values: string[];
  priorities: string[];
  goals: string[];
  relationships: string[];
  location: string;
  career: string;
  summary: string;
}

export interface CurrentIdentity {
  userId: string;
  currentChapter: LifeChapter;
  age: number;
  values: string[]; // e.g., ["family", "growth", "impact"]
  priorities: string[]; // e.g., ["time with family", "building something meaningful"]
  currentGoals: string[];
  keyRelationships: string[];
  currentLocation: string;
  careerStage: string;
  reflection?: string; // AI-generated reflection on current state
}

export interface GrowthTrajectory {
  direction: 'ascending' | 'stable' | 'descending' | 'transitioning';
  confidence: number;
  milestones: MilestoneSummary[];
  insights: GrowthInsight[];
}

export interface MilestoneSummary {
  title: string;
  date: string;
  type: MilestoneType;
  impact: number; // 1-10
}

export interface GrowthInsight {
  type: 'achievement' | 'learning' | 'challenge' | 'pattern';
  insight: string;
  suggestion: string;
  date: string;
}

// Memory integration
export interface TimelineMemory {
  eventId: string;
  memoryId: string;
  type: 'episodic' | 'semantic' | 'relationship';
  relevance: number; // 0-1
  createdAt: string;
}

// Anniversary tracking
export interface Anniversary {
  eventId: string;
  title: string;
  date: string;
  yearsSince: number;
  type: 'yearly' | 'monthly' | 'first' | 'decade';
  importance: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

// Conversation context for voice
export interface TimelineContext {
  userId: string;
  currentChapter: LifeChapter;
  currentGoals: string[];
  recentEvents: LifeEvent[];
  upcomingMilestones: Anniversary[];
  emotionalState: {
    dominantEmotion: string;
    intensity: number;
  };
  growthInsight?: string;
  reflection?: string;
}

// API Request/Response types
export interface AddEventRequest {
  userId: string;
  type: EventType;
  title: string;
  description?: string;
  date?: string;
  category?: EventCategory;
  impact?: 'low' | 'moderate' | 'high' | 'transformative';
  emotions?: string[];
  people?: string[];
  location?: string;
  isMilestone?: boolean;
  milestoneType?: MilestoneType;
}

export interface AddEventResponse {
  success: boolean;
  event: LifeEvent;
  chapterUpdate?: LifeChapterData;
  anniversaries?: Anniversary[];
}

export interface GetTimelineRequest {
  userId: string;
  startYear?: number;
  endYear?: number;
  chapter?: LifeChapter;
  category?: EventCategory;
  limit?: number;
}

export interface GetTimelineResponse {
  success: boolean;
  events: LifeEvent[];
  chapters: LifeChapterData[];
  anniversaries: Anniversary[];
  stats: TimelineStats;
}

export interface TimelineStats {
  totalEvents: number;
  byCategory: Record<string, number>;
  byChapter: Record<string, number>;
  byYear: Record<string, number>;
  milestones: number;
  averageImpact: number;
}

export interface GenerateReflectionRequest {
  userId: string;
  timeRange?: 'week' | 'month' | 'year' | 'lifetime';
  focus?: 'growth' | 'relationships' | 'career' | 'emotional';
}

export interface GenerateReflectionResponse {
  success: boolean;
  reflection: string;
  insights: GrowthInsight[];
  milestones: MilestoneSummary[];
  comparison?: {
    then: string;
    now: string;
    growth: string;
  };
}
