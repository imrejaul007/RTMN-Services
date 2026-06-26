/**
 * Reputation Twin Types
 * Trust scores, reviews, and reputation management
 */

/**
 * Reputation source
 */
export type ReputationSource =
  | 'peer_review'
  | 'customer_feedback'
  | 'project_completion'
  | 'certification'
  | 'award'
  | 'incident';

/**
 * Review type
 */
export type ReviewType =
  | 'performance'
  | 'peer'
  | 'customer'
  | 'project'
  | '360';

/**
 * Review sentiment
 */
export type ReviewSentiment = 'positive' | 'neutral' | 'negative';

/**
 * Reputation badge
 */
export interface ReputationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'expertise' | 'behavior' | 'leadership';
  criteria: string[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: string;
  expiresAt?: string;
}

/**
 * Reputation review
 */
export interface ReputationReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerRole?: string;
  type: ReviewType;
  projectId?: string;
  rating: number;                // 1-5
  sentiment: ReviewSentiment;
  strengths: string[];
  areasForImprovement: string[];
  specificFeedback?: string;
  wouldRecommend: boolean;       // for colleague reviews
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Competency rating
 */
export interface CompetencyRating {
  competency: string;
  rating: number;               // 1-5
  evidence?: string[];
}

/**
 * Performance review
 */
export interface PerformanceReview extends ReputationReview {
  type: 'performance';
  period: {
    start: string;
    end: string;
  };
  competencyRatings: CompetencyRating[];
  overallRating: number;        // 1-5
  goalsAchieved: number;
  goalsTotal: number;
  recommendedActions: string[];
  promotionReady: boolean;
  managerComments?: string;
}

/**
 * Customer feedback
 */
export interface CustomerFeedback {
  id: string;
  employeeId: string;
  customerId: string;
  customerName?: string;
  interactionType: 'email' | 'call' | 'meeting' | 'support';
  rating: number;                // 1-5
  sentiment: ReviewSentiment;
  comment?: string;
  product?: string;
  resolved?: boolean;
  resolutionTime?: number;      // minutes
  createdAt: string;
}

/**
 * Trust score breakdown
 */
export interface TrustScoreBreakdown {
  overall: number;             // 0-100
  reliability: number;         // 0-100
  competence: number;          // 0-100
  communication: number;       // 0-100
  collaboration: number;       // 0-100
  integrity: number;            // 0-100
  consistency: number;          // 0-100
}

/**
 * Trust trend
 */
export interface TrustTrend {
  date: string;
  score: number;
  change: number;               // delta from previous
}

/**
 * Reputation metrics
 */
export interface ReputationMetrics {
  employeeId: string;
  overallScore: number;         // 0-100
  trustScore: TrustScoreBreakdown;
  totalReviews: number;
  avgRating: number;           // 1-5
  trend: TrustTrend[];
  badges: ReputationBadge[];
  recentReviews: ReputationReview[];
  rank?: number;               // percentile
  peerEndorsements: number;
  certifications: number;
  completedProjects: number;
  customerSatisfaction: number; // 0-100
  calculatedAt: string;
}

/**
 * Peer endorsement
 */
export interface PeerEndorsement {
  id: string;
  employeeId: string;           // who endorsed
  endorsedFor: string;        // skill or competency
  endorsedBy: string;
  endorsedByName?: string;
  message?: string;
  createdAt: string;
}

/**
 * Achievement
 */
export interface Achievement {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category: 'performance' | 'innovation' | 'leadership' | 'teamwork' | 'customer';
  impact: string;
  metrics?: {
    before?: number;
    after?: number;
    improvement?: number;
  };
  awardedBy?: string;
  awardedAt: string;
  expiresAt?: string;
}

/**
 * Incident record
 */
export interface IncidentRecord {
  id: string;
  employeeId: string;
  type: 'positive' | 'negative' | 'neutral';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  resolved: boolean;
  resolution?: string;
  reviewedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Reputation query
 */
export interface ReputationQuery {
  employeeId: string;
  sources?: ReputationSource[];
  period?: {
    start: string;
    end: string;
  };
  includeTrend?: boolean;
  includeReviews?: boolean;
}

/**
 * Reputation comparison
 */
export interface ReputationComparison {
  employeeA: string;
  employeeB: string;
  scores: {
    metric: string;
    employeeA: number;
    employeeB: number;
    winner: 'A' | 'B' | 'tie';
  }[];
  overallWinner: 'A' | 'B' | 'tie';
  summary: string;
}

/**
 * Reputation prediction
 */
export interface ReputationPrediction {
  employeeId: string;
  predictedScore: number;        // 0-100
  confidence: number;           // 0-100
  timeframe: string;           // "next_month"
  factors: {
    factor: string;
    impact: number;             // positive or negative
    weight: number;
  }[];
  warnings?: string[];
  recommendations?: string[];
}

/**
 * Review request
 */
export interface ReviewRequest {
  employeeId: string;
  reviewerId: string;
  type: ReviewType;
  projectId?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'declined';
  reminderSent: boolean;
  createdAt: string;
}

/**
 * Feedback sentiment analysis
 */
export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;               // -1 to 1
  keywords: {
    word: string;
    sentiment: 'positive' | 'negative';
    frequency: number;
  }[];
  themes: string[];
  confidence: number;          // 0-100
}

/**
 * Badge eligibility
 */
export interface BadgeEligibility {
  badge: ReputationBadge;
  criteriaMet: number;
  criteriaTotal: number;
  progress: {
    criteria: string;
    met: boolean;
    evidence?: string;
  }[];
  estimatedCompletion?: string;
}
