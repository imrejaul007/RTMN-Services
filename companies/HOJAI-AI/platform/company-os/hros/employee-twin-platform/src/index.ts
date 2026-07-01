/**
 * HROS Employee Twin Platform
 * The living digital representation of every employee
 *
 * Mission: Build Employee Twins for all employees that store:
 * - Identity, Skills, Career, Learning, Performance, Relationship, Compensation, Wellness, Sentiment, Productivity, Aspirational data
 */

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ============================================================
// TWIN TYPES
// ============================================================

export interface EmployeeTwin {
  id: string;
  employeeId: string;

  // Identity Layer
  identity: IdentityTwin;

  // Skill Layer
  skills: SkillTwin;

  // Career Layer
  career: CareerTwin;

  // Learning Layer
  learning: LearningTwin;

  // Performance Layer
  performance: PerformanceTwin;

  // Relationship Layer
  relationships: RelationshipTwin;

  // Compensation Layer
  compensation: CompensationTwin;

  // Wellness Layer
  wellness: WellnessTwin;

  // Sentiment Layer
  sentiment: SentimentTwin;

  // Productivity Layer
  productivity: ProductivityTwin;

  // Aspirational Layer
  aspirational: AspirationalTwin;

  // Metadata
  lastUpdated: Date;
  confidence: number; // Data quality score 0-100
  version: number;
}

export interface IdentityTwin {
  employeeId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    pronouns?: string;
    dateOfBirth?: Date;
    nationality?: string;
    gender?: string;
    maritalStatus?: string;
  };
  contactInfo: {
    email: string;
    phone?: string;
    whatsapp?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
    address?: {
      current: string;
      permanent?: string;
    };
  };
  employmentInfo: {
    employeeNumber: string;
    joiningDate: Date;
    employmentType: 'full-time' | 'part-time' | 'contractor' | 'intern';
    department: string;
    designation: string;
    grade?: string;
    location: string;
    manager?: string;
    status: 'active' | 'on-leave' | 'terminated';
  };
  governmentIds?: {
    aadhaar?: string;
    pan?: string;
    passport?: string;
    visa?: string;
    uan?: string; // PF number
  };
  verificationStatus: 'pending' | 'verified' | 'flagged';
}

export interface SkillTwin {
  employeeId: string;

  skills: {
    technical: EmployeeSkill[];
    soft: EmployeeSkill[];
    leadership: EmployeeSkill[];
    domain: EmployeeSkill[];
  };

  certifications: {
    name: string;
    issuer: string;
    issuedDate: Date;
    expiryDate?: Date;
    status: 'active' | 'expired' | 'pending';
    verified: boolean;
  }[];

  assessments: {
    skill: string;
    score: number; // 0-100
    assessmentType: string;
    date: Date;
    assessor?: string;
  }[];

  skillGraph: {
    currentSkills: string[];
    adjacentSkills: string[];
    learningPath: string[];
    verifiedSkills: string[];
  };

  growth: {
    trajectory: 'accelerating' | 'stable' | 'declining';
    nextRoles: string[];
    recommendedLearning: string[];
    skillGapAnalysis: SkillGap[];
  };

  lastUpdated: Date;
  confidence: number;
}

export interface EmployeeSkill {
  name: string;
  proficiencyLevel: 1 | 2 | 3 | 4 | 5; // Beginner to Expert
  yearsOfExperience: number;
  lastUsed?: Date;
  endorsements?: number;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface SkillGap {
  requiredSkill: string;
  currentLevel: number;
  requiredLevel: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedActions: string[];
}

export interface CareerTwin {
  employeeId: string;

  careerPath: {
    history: CareerEvent[];
    current: {
      role: string;
      department: string;
      tenure: number; // months
      progressionVelocity: 'fast' | 'normal' | 'slow';
    };
  };

  aspirations: {
    desiredRoles: string[];
    timeline: string; // e.g., "2 years"
    industryInterests: string[];
    locationPreferences: string[];
  };

  mobility: {
    internalOpenings: boolean;
    relocation: boolean;
    international: boolean;
    promotionReadiness: 'ready' | '1year' | '2years' | '3years+';
  };

  succession: {
    isHighPotential: boolean;
    successionPool?: string;
    readinessLevel: 'ready-now' | 'ready-1year' | 'development-needed';
    developmentAreas: string[];
  };

  lastUpdated: Date;
}

export interface CareerEvent {
  type: 'promotion' | 'transfer' | 'role-change' | 'project' | 'award';
  title: string;
  department?: string;
  date: Date;
  details?: string;
}

export interface LearningTwin {
  employeeId: string;

  enrollments: {
    courseId: string;
    courseName: string;
    status: 'enrolled' | 'in-progress' | 'completed' | 'dropped';
    progress: number; // 0-100
    startedAt?: Date;
    completedAt?: Date;
    score?: number;
    certificateIssued: boolean;
  }[];

  learningHistory: {
    totalCourses: number;
    completedCourses: number;
    inProgress: number;
    totalHours: number;
    certifications: number;
    lastActivity: Date;
  };

  preferences: {
    learningStyle: 'video' | 'reading' | 'hands-on' | 'mixed';
    preferredLanguages: string[];
    scheduling: 'weekdays' | 'evenings' | 'weekends' | 'flexible';
  };

  recommendations: {
    recommendedCourses: {
      courseId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }[];
    mandatoryCourses: {
      courseId: string;
      deadline: Date;
      reason: string;
    }[];
  };

  lastUpdated: Date;
}

export interface PerformanceTwin {
  employeeId: string;

  currentCycle: {
    period: string; // e.g., "FY2026"
    status: 'not-started' | 'self-review' | 'manager-review' | 'calibration' | 'completed';
    goals: Goal[];
    selfReview?: {
      submittedAt?: Date;
      rating?: number;
      comments?: string;
    };
    managerReview?: {
      submittedAt?: Date;
      rating?: number;
      comments?: string;
    };
  };

  history: {
    cycles: {
      period: string;
      overallRating: number;
      highlights: string[];
      areasForImprovement: string[];
    }[];
    averageRating: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  competencies: {
    name: string;
    rating: number;
    evidence: string[];
  }[];

  lastUpdated: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'individual' | 'team' | 'company';
  weight: number;
  progress: number; // 0-100
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
  dueDate: Date;
}

export interface RelationshipTwin {
  employeeId: string;

  network: {
    manager?: {
      id: string;
      name: string;
      relationshipStrength: number; // 0-100
      last1on1?: Date;
    };
    skipLevelManager?: {
      id: string;
      name: string;
    };
    peers: {
      id: string;
      name: string;
      collaborationScore: number;
      interactionFrequency: 'daily' | 'weekly' | 'monthly';
    }[];
    directReports: string[];
  };

  mentors: {
    id: string;
    name: string;
    type: 'formal' | 'informal';
    startDate: Date;
    status: 'active' | 'completed';
  }[];

  advocates: {
    id: string;
    name: string;
    context: string;
    endorsement: string;
  }[];

  collaboration: {
    crossFunctionalPartners: string[];
    communities: string[];
    influenceScore: number;
  };

  lastUpdated: Date;
}

export interface CompensationTwin {
  employeeId: string;

  current: {
    baseSalary: number;
    currency: string;
    effectiveDate: Date;
    salaryBand: {
      min: number;
      mid: number;
      max: number;
    };
  };

  components: {
    ctc: number;
    fixed: number;
    variable: number;
    equity?: {
      type: 'ESOP' | 'RSU' | 'Phantom';
      granted: number;
      vested: number;
      strikePrice?: number;
    };
    benefits: {
      health: number;
      retirement: number;
      allowances: number;
    };
  };

  history: {
    revisions: {
      effectiveDate: Date;
      oldSalary: number;
      newSalary: number;
      reason: string;
      approvedBy: string;
    }[];
    lastRevision: Date;
  };

  nextReview?: {
    scheduledDate: Date;
    recommended?: number;
    range?: { min: number; max: number };
  };

  lastUpdated: Date;
}

export interface WellnessTwin {
  employeeId: string;

  physical: {
    healthScore?: number; // 0-100
    lastHealthCheckup?: Date;
    healthConditions?: string[];
    fitnessGoals?: string[];
  };

  mental: {
    stressLevel: 'low' | 'medium' | 'high' | 'critical';
    burnoutRisk: 'low' | 'medium' | 'high';
    workLifeBalance: number; // 0-100
    lastWellnessCheck?: Date;
  };

  engagement: {
    nps?: number; // 1-10
    satisfaction?: number; // 0-100
    belonging?: number; // 0-100
    lastSurvey?: Date;
  };

  leave: {
    available: {
      annual: number;
      sick: number;
      personal: number;
    };
    used: {
      annual: number;
      sick: number;
      personal: number;
    };
    patterns: {
      frequentAbsences: boolean;
      leaveSpree?: boolean;
    };
  };

  alerts: {
    burnoutRisk: boolean;
    attendanceConcerns: boolean;
    lowEngagement: boolean;
  };

  lastUpdated: Date;
}

export interface SentimentTwin {
  employeeId: string;

  signals: {
    communication: {
      tone: 'positive' | 'neutral' | 'negative';
      sentiment: number; // -100 to +100
      lastAnalyzed?: Date;
    };
    collaboration: {
      willingness: number; // 0-100
      teamContribution: number;
    };
    feedback: {
      positive: number;
      constructive: number;
      concerns: number;
    };
  };

  trends: {
    weekly: number[];
    monthly: number[];
    quarterly: number[];
    trajectory: 'improving' | 'stable' | 'declining';
  };

  alerts: {
    suddenDecline: boolean;
    isolationRisk: boolean;
    disengagement: boolean;
  };

  lastUpdated: Date;
}

export interface ProductivityTwin {
  employeeId: string;

  metrics: {
    output: number; // 0-100
    quality: number; // 0-100
    efficiency: number; // 0-100
    collaboration: number; // 0-100
  };

  patterns: {
    mostProductiveHours: string[]; // e.g., ["09:00-11:00", "14:00-16:00"]
    workStyle: 'morning' | 'evening' | 'flexible';
    remotePreference: 'office' | 'hybrid' | 'remote';
    meetingLoad: 'light' | 'moderate' | 'heavy';
  };

  capacity: {
    currentLoad: number; // 0-150
    bandwidthAvailable: number;
    overloaded: boolean;
    factors: string[];
  };

  tools: {
    appsUsed: string[];
    effectiveness: { [app: string]: number };
  };

  lastUpdated: Date;
}

export interface AspirationalTwin {
  employeeId: string;

  careerGoals: {
    shortTerm: string[]; // 1-2 years
    mediumTerm: string[]; // 3-5 years
    longTerm: string[];
  };

  skillsDesired: {
    technical: string[];
    leadership: string[];
    domain: string[];
  };

  lifestyle: {
    workLifeBalance: string;
    salaryExpectations?: { range: string; timeline: string };
    locationPreferences?: string[];
    flexibilityNeeds: 'full' | 'partial' | 'none';
  };

  growthMindset: {
    learningAgility: number; // 0-100
    feedbackSeeking: number; // 0-100
    riskComfort: number; // 0-100
    adaptability: number; // 0-100
  };

  lastDiscussedWithManager?: Date;

  lastUpdated: Date;
}

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const twins = new Map<string, EmployeeTwin>();
const twinHistory = new Map<string, EmployeeTwin[]>();

// ============================================================
// ZOD SCHEMAS
// ============================================================

const IdentitySchema = z.object({
  employeeId: z.string(),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    preferredName: z.string().optional(),
    pronouns: z.string().optional(),
    dateOfBirth: z.string().optional(),
    nationality: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
  }),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
    }).optional(),
    address: z.object({
      current: z.string(),
      permanent: z.string().optional(),
    }).optional(),
  }),
  employmentInfo: z.object({
    employeeNumber: z.string(),
    joiningDate: z.string(),
    employmentType: z.enum(['full-time', 'part-time', 'contractor', 'intern']),
    department: z.string(),
    designation: z.string(),
    grade: z.string().optional(),
    location: z.string(),
    manager: z.string().optional(),
    status: z.enum(['active', 'on-leave', 'terminated']),
  }),
  governmentIds: z.object({
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    passport: z.string().optional(),
    visa: z.string().optional(),
    uan: z.string().optional(),
  }).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'flagged']),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * Create Employee Twin
 */
router.post('/twin', async (req, res) => {
  try {
    const { employeeId, identity } = req.body;

    if (!employeeId || !identity) {
      return res.status(400).json({
        success: false,
        error: 'employeeId and identity are required'
      });
    }

    // Initialize with empty twins
    const twin: EmployeeTwin = {
      id: crypto.randomUUID(),
      employeeId,
      identity: identity as EmployeeTwin['identity'],
      skills: createEmptySkillTwin(employeeId),
      career: createEmptyCareerTwin(employeeId),
      learning: createEmptyLearningTwin(employeeId),
      performance: createEmptyPerformanceTwin(employeeId),
      relationships: createEmptyRelationshipTwin(employeeId),
      compensation: createEmptyCompensationTwin(employeeId),
      wellness: createEmptyWellnessTwin(employeeId),
      sentiment: createEmptySentimentTwin(employeeId),
      productivity: createEmptyProductivityTwin(employeeId),
      aspirational: createEmptyAspirationalTwin(employeeId),
      lastUpdated: new Date(),
      confidence: 50, // Start at 50%, increases as data is populated
      version: 1,
    };

    twins.set(employeeId, twin);

    res.status(201).json({ success: true, twin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Employee Twin
 */
router.get('/twin/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const twin = twins.get(employeeId);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    res.json({ success: true, twin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update Twin Layer
 */
router.patch('/twin/:employeeId/:layer', async (req, res) => {
  try {
    const { employeeId, layer } = req.params;
    const updates = req.body;

    const twin = twins.get(employeeId);
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    const validLayers = [
      'identity', 'skills', 'career', 'learning',
      'performance', 'relationships', 'compensation',
      'wellness', 'sentiment', 'productivity', 'aspirational'
    ];

    if (!validLayers.includes(layer)) {
      return res.status(400).json({
        success: false,
        error: `Invalid layer. Must be one of: ${validLayers.join(', ')}`
      });
    }

    // Save history
    if (!twinHistory.has(employeeId)) {
      twinHistory.set(employeeId, []);
    }
    twinHistory.get(employeeId)!.push({ ...twin });

    // Update the layer
    (twin as any)[layer] = { ...(twin as any)[layer], ...updates };
    twin.lastUpdated = new Date();
    twin.version++;
    twin.confidence = Math.min(100, twin.confidence + 5); // Increase confidence with updates

    twins.set(employeeId, twin);

    res.json({ success: true, twin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Twin History
 */
router.get('/twin/:employeeId/history', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const history = twinHistory.get(employeeId) || [];

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Twin Summary (for dashboard)
 */
router.get('/twin/:employeeId/summary', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const twin = twins.get(employeeId);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    const summary = {
      employeeId: twin.employeeId,
      name: `${twin.identity.personalInfo.firstName} ${twin.identity.personalInfo.lastName}`,
      department: twin.identity.employmentInfo.department,
      designation: twin.identity.employmentInfo.designation,
      confidence: twin.confidence,
      health: {
        overall: calculateOverallHealth(twin),
        skills: twin.skills.skillGraph.currentSkills.length,
        performance: twin.performance.currentCycle.status,
        sentiment: twin.sentiment.signals.communication.tone,
        wellness: twin.wellness.mental.stressLevel,
      },
      alerts: detectAlerts(twin),
      lastUpdated: twin.lastUpdated,
    };

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createEmptySkillTwin(employeeId: string): SkillTwin {
  return {
    employeeId,
    skills: { technical: [], soft: [], leadership: [], domain: [] },
    certifications: [],
    assessments: [],
    skillGraph: { currentSkills: [], adjacentSkills: [], learningPath: [], verifiedSkills: [] },
    growth: { trajectory: 'stable', nextRoles: [], recommendedLearning: [], skillGapAnalysis: [] },
    lastUpdated: new Date(),
    confidence: 0,
  };
}

function createEmptyCareerTwin(employeeId: string): CareerTwin {
  return {
    employeeId,
    careerPath: { history: [], current: { role: '', department: '', tenure: 0, progressionVelocity: 'normal' } },
    aspirations: { desiredRoles: [], timeline: '', industryInterests: [], locationPreferences: [] },
    mobility: { internalOpenings: false, relocation: false, international: false, promotionReadiness: '2years' },
    succession: { isHighPotential: false, readinessLevel: 'development-needed', developmentAreas: [] },
    lastUpdated: new Date(),
  };
}

function createEmptyLearningTwin(employeeId: string): LearningTwin {
  return {
    employeeId,
    enrollments: [],
    learningHistory: { totalCourses: 0, completedCourses: 0, inProgress: 0, totalHours: 0, certifications: 0, lastActivity: new Date() },
    preferences: { learningStyle: 'mixed', preferredLanguages: ['English'], scheduling: 'flexible' },
    recommendations: { recommendedCourses: [], mandatoryCourses: [] },
    lastUpdated: new Date(),
  };
}

function createEmptyPerformanceTwin(employeeId: string): PerformanceTwin {
  return {
    employeeId,
    currentCycle: { period: '', status: 'not-started', goals: [] },
    history: { cycles: [], averageRating: 0, trend: 'stable' },
    competencies: [],
    lastUpdated: new Date(),
  };
}

function createEmptyRelationshipTwin(employeeId: string): RelationshipTwin {
  return {
    employeeId,
    network: { peers: [], directReports: [] },
    mentors: [],
    advocates: [],
    collaboration: { crossFunctionalPartners: [], communities: [], influenceScore: 0 },
    lastUpdated: new Date(),
  };
}

function createEmptyCompensationTwin(employeeId: string): CompensationTwin {
  return {
    employeeId,
    current: { baseSalary: 0, currency: 'INR', effectiveDate: new Date(), salaryBand: { min: 0, mid: 0, max: 0 } },
    components: { ctc: 0, fixed: 0, variable: 0, benefits: { health: 0, retirement: 0, allowances: 0 } },
    history: { revisions: [], lastRevision: new Date() },
    lastUpdated: new Date(),
  };
}

function createEmptyWellnessTwin(employeeId: string): WellnessTwin {
  return {
    employeeId,
    physical: {},
    mental: { stressLevel: 'medium', burnoutRisk: 'low', workLifeBalance: 70 },
    engagement: {},
    leave: { available: { annual: 0, sick: 0, personal: 0 }, used: { annual: 0, sick: 0, personal: 0 }, patterns: { frequentAbsences: false } },
    alerts: { burnoutRisk: false, attendanceConcerns: false, lowEngagement: false },
    lastUpdated: new Date(),
  };
}

function createEmptySentimentTwin(employeeId: string): SentimentTwin {
  return {
    employeeId,
    signals: { communication: { tone: 'neutral', sentiment: 0 }, collaboration: { willingness: 0, teamContribution: 0 }, feedback: { positive: 0, constructive: 0, concerns: 0 } },
    trends: { weekly: [], monthly: [], quarterly: [], trajectory: 'stable' },
    alerts: { suddenDecline: false, isolationRisk: false, disengagement: false },
    lastUpdated: new Date(),
  };
}

function createEmptyProductivityTwin(employeeId: string): ProductivityTwin {
  return {
    employeeId,
    metrics: { output: 0, quality: 0, efficiency: 0, collaboration: 0 },
    patterns: { mostProductiveHours: [], workStyle: 'flexible', remotePreference: 'hybrid', meetingLoad: 'moderate' },
    capacity: { currentLoad: 0, bandwidthAvailable: 100, overloaded: false, factors: [] },
    tools: { appsUsed: [], effectiveness: {} },
    lastUpdated: new Date(),
  };
}

function createEmptyAspirationalTwin(employeeId: string): AspirationalTwin {
  return {
    employeeId,
    careerGoals: { shortTerm: [], mediumTerm: [], longTerm: [] },
    skillsDesired: { technical: [], leadership: [], domain: [] },
    lifestyle: { workLifeBalance: 'balanced', flexibilityNeeds: 'partial' },
    growthMindset: { learningAgility: 0, feedbackSeeking: 0, riskComfort: 0, adaptability: 0 },
    lastUpdated: new Date(),
  };
}

function calculateOverallHealth(twin: EmployeeTwin): number {
  let score = 50;

  // Performance contribution
  if (twin.performance.history.averageRating > 0) {
    score += twin.performance.history.averageRating * 0.2;
  }

  // Skills contribution
  score += Math.min(15, twin.skills.skillGraph.currentSkills.length * 3);

  // Wellness contribution
  if (twin.wellness.mental.workLifeBalance > 0) {
    score += twin.wellness.mental.workLifeBalance * 0.15;
  }

  // Sentiment contribution
  if (twin.sentiment.signals.communication.sentiment !== 0) {
    score += ((twin.sentiment.signals.communication.sentiment + 100) / 2) * 0.1;
  }

  return Math.round(Math.min(100, Math.max(0, score));
}

function detectAlerts(twin: EmployeeTwin): string[] {
  const alerts: string[] = [];

  if (twin.wellness.alerts.burnoutRisk) alerts.push('🔥 Burnout Risk');
  if (twin.sentiment.alerts.suddenDecline) alerts.push('📉 Sentiment Decline');
  if (twin.sentiment.alerts.disengagement) alerts.push('😔 Disengagement Risk');
  if (twin.performance.currentCycle.status === 'at-risk') alerts.push('⚠️ Performance At Risk');
  if (twin.skills.growth.trajectory === 'declining') alerts.push('📚 Skill Decay Risk');

  return alerts;
}

export default router;
