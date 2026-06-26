/**
 * Knowledge Twin Types
 * Knowledge management, expertise tracking, and knowledge extraction
 */

/**
 * Knowledge type
 */
export type KnowledgeType =
  | 'procedural'
  | 'declarative'
  | 'tacit'
  | 'explicit'
  | 'domain';

/**
 * Knowledge source
 */
export type KnowledgeSource =
  | 'document'
  | 'training'
  | 'experience'
  | 'certification'
  | 'course'
  | 'mentorship'
  | 'observation';

/**
 * Knowledge node
 */
export interface KnowledgeNode {
  id: string;
  employeeId: string;
  concept: string;
  description: string;
  type: KnowledgeType;
  category: string;
  tags: string[];
  confidence: number;              // 0-100
  source: KnowledgeSource;
  sourceId?: string;
  relatedConcepts: string[];
  examples?: string[];
  prerequisites?: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  verifiedBy?: string;
  usageCount: number;
  lastUsed?: string;
  teachingAbility: number;       // 0-100
  applicability: string[];       // contexts where this knowledge applies
  createdAt: string;
  updatedAt: string;
}

/**
 * Expertise level
 */
export interface Expertise {
  id: string;
  employeeId: string;
  domain: string;
  subdomains: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'thought-leader';
  yearsExperience: number;
  certifications: string[];
  notableAchievements?: string[];
  currentProjects?: string[];
  teachingExperience?: number;
  publications?: string[];
  speakingEngagements?: number;
  mentorCount?: number;
  confidence: number;            // 0-100
  lastAssessed?: string;
  verified: boolean;
  endorsements?: number;
  rating?: number;              // 1-5
  endorsementsFrom?: string[];
}

/**
 * Knowledge gap
 */
export interface KnowledgeGap {
  id: string;
  employeeId: string;
  topic: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: 'required' | 'growth' | 'interest';
  currentLevel: string;
  desiredLevel: string;
  estimatedEffort: number;        // hours to fill
  suggestedResources: string[];
  deadline?: string;
  filled: boolean;
  filledAt?: string;
  createdAt: string;
}

/**
 * Knowledge extraction result
 */
export interface ExtractedKnowledge {
  id: string;
  employeeId: string;
  source: 'document' | 'meeting' | 'email' | 'conversation' | 'observation';
  sourceId?: string;
  content: string;
  summary: string;
  keyPoints: string[];
  entities: {
    name: string;
    type: string;
    confidence: number;
  }[];
  concepts: string[];
  questions?: string[];
  nextSteps?: string[];
  extractedAt: string;
  validated: boolean;
  validatedBy?: string;
}

/**
 * Knowledge graph edge
 */
export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: 'prerequisite' | 'related' | 'example' | 'contrasting' | 'part-of';
  weight: number;                // 0-1
  confidence: number;            // 0-100
  source: 'explicit' | 'inferred';
  createdAt: string;
}

/**
 * Learning resource
 */
export interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'book' | 'article' | 'video' | 'workshop' | 'mentorship' | 'project';
  url?: string;
  provider?: string;
  duration?: number;             // minutes
  level: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  rating?: number;              // 1-5
  reviews?: number;
  cost?: number;
  free: boolean;
  certification?: boolean;
}

/**
 * Knowledge assessment
 */
export interface KnowledgeAssessment {
  id: string;
  employeeId: string;
  topic: string;
  questions: {
    question: string;
    type: 'multiple_choice' | 'practical' | 'essay';
    correctAnswer?: string;
    employeeAnswer?: string;
    correct: boolean;
    confidence: number;
  }[];
  score: number;                // 0-100
  timeTaken: number;            // minutes
  completedAt: string;
  nextReviewDate?: string;
}

/**
 * Knowledge sharing session
 */
export interface KnowledgeSharingSession {
  id: string;
  employeeId: string;           // presenter
  title: string;
  type: 'presentation' | 'workshop' | 'mentorship' | 'pairing';
  topics: string[];
  participants: string[];
  duration: number;             // minutes
  feedback?: {
    rating: number;
    comments?: string[];
    learned: string[];
  };
  conductedAt: string;
}

/**
 * Knowledge Q&A
 */
export interface KnowledgeQA {
  id: string;
  question: string;
  topic: string;
  context?: string;
  answeredBy?: string;         // employee ID
  answer?: string;
  confidence?: number;          // 0-100
  sources?: string[];
  helpful?: number;
  notHelpful?: number;
  createdAt: string;
  answeredAt?: string;
}

/**
 * Knowledge analytics
 */
export interface KnowledgeAnalytics {
  employeeId: string;
  totalKnowledgeNodes: number;
  expertiseAreas: string[];
  knowledgeDepth: Record<string, number>;  // domain -> level
  coverageScore: number;        // 0-100
  teachingAbilityScore: number;
  learningVelocity: number;      // nodes added per week
  sharingScore: number;        // based on sessions conducted
  collaborationScore: number;
  growthTrajectory: 'accelerating' | 'stable' | 'declining';
  recommendations: string[];
  period: {
    start: string;
    end: string;
  };
}

/**
 * Knowledge query result
 */
export interface KnowledgeQueryResult {
  nodes: KnowledgeNode[];
  expertise: Expertise[];
  totalScore: number;
  relevanceScores: Record<string, number>;
  suggestions?: string[];
}

/**
 * Knowledge validation request
 */
export interface KnowledgeValidationRequest {
  employeeId: string;
  topic: string;
  claim: string;
  source?: string;
}

/**
 * Knowledge validation result
 */
export interface KnowledgeValidationResult {
  valid: boolean;
  confidence: number;           // 0-100
  explanation: string;
  sources?: string[];
  warnings?: string[];
  suggestions?: string[];
}
