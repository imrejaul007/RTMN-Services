/**
 * Behavioral Twin Types
 * Work style, productivity, and behavioral patterns
 */

/**
 * Work pattern type
 */
export type WorkPatternType = 'morning' | 'evening' | 'night' | 'flexible';

/**
 * Communication style preference
 */
export type CommunicationPreference = 'async' | 'sync' | 'mixed';

/**
 * Collaboration preference
 */
export type CollaborationPreference = 'solo' | 'team' | 'hybrid';

/**
 * Decision speed
 */
export type DecisionSpeed = 'fast' | 'deliberate' | 'data-driven' | 'intuitive';

/**
 * Feedback preference
 */
export type FeedbackPreference = 'frequent' | 'periodic' | 'minimal';

/**
 * Time range
 */
export interface TimeRange {
  start: string;  // "09:00"
  end: string;    // "17:00"
}

/**
 * Day schedule
 */
export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  working: boolean;
  hours?: TimeRange;
  breaks?: TimeRange[];
}

/**
 * Work pattern
 */
export interface WorkPattern {
  type: WorkPatternType;
  preferredStartTime?: string;    // "09:00"
  preferredEndTime?: string;      // "18:00"
  peakHours: TimeRange[];
  lowEnergyHours: TimeRange[];
  flexibleHours: boolean;
  remotePreference: 'remote' | 'office' | 'hybrid';
}

/**
 * Work style
 */
export interface WorkStyle {
  employeeId: string;
  workPattern: WorkPattern;
  communicationPreference: CommunicationPreference;
  collaborationPreference: CollaborationPreference;
  decisionSpeed: DecisionSpeed;
  riskTolerance: number;          // 0-100
  changeAdaptation: number;        // 0-100
  structurePreference: number;     // 0 = chaos, 100 = rigid
  autonomyPreference: number;      // 0-100
  feedbackPreference: FeedbackPreference;
  planningStyle: 'spontaneous' | 'planned' | 'detailed';
  multitaskingLevel: 'single' | 'moderate' | 'high';
  focusDuration: number;          // minutes they can focus
  meetingPreference: 'back-to-back' | 'spaced' | 'minimal';
  emailStyle: 'immediate' | 'batched' | 'minimal';
  socialInteraction: number;      // 0-100, need for social interaction
  confidence: number;             // 0-100
  learnedFrom: number;            // observations
  lastUpdated: string;
}

/**
 * Task type energy mapping
 */
export interface TaskTypeEnergy {
  taskType: string;
  requiredEnergy: number;          // 0-100
  generatedEnergy: number;         // 0-100
  bestTimeOfDay?: string;        // morning, afternoon, evening
}

/**
 * Energy level
 */
export interface EnergyLevel {
  timestamp: string;
  level: number;                  // 0-100
  notes?: string;
  source: 'manual' | 'inferred';
}

/**
 * Energy map
 */
export interface EnergyMap {
  employeeId: string;
  weeklyPattern: Record<string, {
    highEnergy: TimeRange[];
    lowEnergy: TimeRange[];
    tasks: string[];
  }>;
  taskEnergyMapping: TaskTypeEnergy[];
  recoveryNeeds: number;         // hours per week
  optimalMeetingTimes: TimeRange[];
  energyLevel: 'high' | 'moderate' | 'low';
  burnoutRisk: number;           // 0-100
  recoveryActivities?: string[];
  lastUpdated: string;
}

/**
 * Productivity metric
 */
export interface ProductivityMetrics {
  employeeId: string;
  date: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  meetingsHours: number;
  deepWorkHours: number;
  collaborationHours: number;
  focusScore: number;            // 0-100
  efficiency: number;            // 0-100
  outputQuality: number;         // 0-100
  contextSwitches: number;
  interruptions: number;
  score: number;                 // overall productivity 0-100
}

/**
 * Behavior anomaly
 */
export interface BehaviorAnomaly {
  id: string;
  employeeId: string;
  type: 'productivity_drop' | 'unusual_pattern' | 'engagement_change' | 'health_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  baseline: number;
  current: number;
  deviation: number;             // percentage
  possibleCauses?: string[];
  recommendations?: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

/**
 * Behavioral pattern
 */
export interface BehavioralPattern {
  id: string;
  employeeId: string;
  name: string;
  description: string;
  category: 'productivity' | 'communication' | 'collaboration' | 'wellness' | 'learning';
  frequency: number;             // times per week
  duration?: number;             // minutes
  triggers?: string[];
  outcomes?: string[];
  consistency: number;          // 0-100
  confidence: number;           // 0-100
  learnedFrom: number;         // observations
  lastObserved: string;
  isHealthy: boolean;
  recommendations?: string[];
}

/**
 * Wellness check
 */
export interface WellnessCheck {
  id: string;
  employeeId: string;
  date: string;
  stress: number;               // 0-100
  energy: number;               // 0-100
  focus: number;                // 0-100
  workload: number;              // 0-100
  satisfaction: number;          // 0-100
  burnoutRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Learning style
 */
export interface LearningStyle {
  employeeId: string;
  visual: number;               // 0-100
  auditory: number;             // 0-100
  reading: number;              // 0-100
  kinesthetic: number;         // 0-100
  preferredMethod: string;
  learningPace: 'slow' | 'moderate' | 'fast';
  breaksNeeded: boolean;
  practiceTime: number;         // minutes per day
  confidence: number;           // 0-100
  lastUpdated: string;
}

/**
 * Work-life balance
 */
export interface WorkLifeBalance {
  employeeId: string;
  workHoursAvg: number;         // hours per day
  workHoursIdeal: number;
  boundaryClarity: number;      // 0-100
  afterHoursWork: number;       // times per week
  weekendWork: number;           // times per month
  vacationDaysUsed: number;
  sickDaysUsed: number;
  personalProjectsTime: number;  // hours per week
  socialLife: number;           // 0-100
  familyTime: number;           // 0-100
  exercise: number;              // hours per week
  score: number;                 // 0-100
  risks: string[];
  recommendations: string[];
  lastUpdated: string;
}

/**
 * Optimal time recommendation
 */
export interface OptimalTimeRecommendation {
  taskType: string;
  recommendedTime: TimeRange;
  confidence: number;
  reason: string;
  alternatives?: TimeRange[];
}

/**
 * Behavioral prediction
 */
export interface BehavioralPrediction {
  employeeId: string;
  metric: string;
  predictedValue: number;
  confidence: number;           // 0-100
  timeframe: string;            // "next_week", "next_month"
  basedOnPatterns: string[];    // pattern IDs
  warnings?: string[];
  recommendations?: string[];
}
