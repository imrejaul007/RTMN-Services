/**
 * HR Recruiter Agent - Type Definitions
 * AI-powered candidate screening, interview scheduling, and onboarding
 */

// ============================================
// ENUMS
// ============================================

export enum CandidateStatus {
  NEW = 'new',
  SCREENING = 'screening',
  QUALIFIED = 'qualified',
  INTERVIEWING = 'interviewing',
  OFFERED = 'offered',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum InterviewType {
  PHONE_SCREEN = 'phone_screen',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  CULTURE_FIT = 'culture_fit',
  FINAL_ROUND = 'final_round',
  PANEL = 'panel',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  DOCUMENTS_PENDING = 'documents_pending',
  DOCUMENTS_COMPLETED = 'documents_completed',
  TRAINING_PENDING = 'training_pending',
  TRAINING_COMPLETED = 'training_complete',
  EQUIPMENT_PENDING = 'equipment_pending',
  EQUIPMENT_PROVIDED = 'equipment_provided',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExperienceLevel {
  FRESHER = 'fresher',
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
  PRINCIPAL = 'principal',
  DIRECTOR = 'director',
  VP = 'vp',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  TEMPORARY = 'temporary',
}

export enum SalaryCurrency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

// ============================================
// CORE INTERFACES
// ============================================

export interface ContactInfo {
  email: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  location?: string;
}

export interface Education {
  degree: string;
  field: string;
  institution: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  isVerified?: boolean;
}

export interface WorkExperience {
  company: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  location?: string;
  salary?: {
    amount: number;
    currency: SalaryCurrency;
  };
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  verified?: boolean;
  endorsements?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  dateObtained: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Language {
  language: string;
  proficiency: 'elementary' | 'limited' | 'professional' | 'full_professional' | 'native';
}

// ============================================
// RESUME & CANDIDATE
// ============================================

export interface Resume {
  id: string;
  candidateId: string;
  fileName: string;
  fileUrl?: string;
  extractedText: string;
  parsedData: ParsedResumeData;
  screeningResult?: ScreeningResult;
  uploadedAt: string;
  updatedAt: string;
}

export interface ParsedResumeData {
  name: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  languages?: Language[];
  projects?: Project[];
  awards?: Award[];
  publications?: Publication[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface Award {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Publication {
  title: string;
  publisher: string;
  date: string;
  url?: string;
  description?: string;
}

export interface Candidate {
  id: string;
  tenantId: string;
  userId?: string;

  // Personal Info
  firstName: string;
  lastName: string;
  contact: ContactInfo;
  headline?: string;
  summary?: string;

  // Professional Info
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  languages?: Language[];

  // Status & Tracking
  status: CandidateStatus;
  source?: string;
  referredBy?: string;
  jobId?: string;

  // Qualifications
  qualifications?: QualificationResult;

  // Resume
  resumeId?: string;
  resumeUrl?: string;

  // Metadata
  tags?: string[];
  notes?: string;
  rating?: number;
  salaryExpectation?: {
    min: number;
    max: number;
    currency: SalaryCurrency;
  };
  noticePeriod?: string;
  availableFrom?: string;

  // System fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================
// SCREENING
// ============================================

export interface ScreeningCriteria {
  requiredSkills?: string[];
  preferredSkills?: string[];
  minYearsExperience?: number;
  maxYearsExperience?: number;
  educationRequirements?: string[];
  certificationsRequired?: string[];
  minSalary?: number;
  maxSalary?: number;
  noticePeriodMax?: string;
  visaSponsorship?: boolean;
}

export interface ScreeningResult {
  candidateId: string;
  resumeId: string;

  // Scores (0-100)
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  cultureFitScore: number;

  // Analysis
  matchedSkills: string[];
  missingSkills: string[];
  highlightedStrengths: string[];
  concerns: string[];

  // Recommendation
  recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
  recommendationReason: string;

  // ATS Keywords
  atsScore: number;
  keywordMatches: {
    matched: string[];
    missing: string[];
    density: number;
  };

  // Timing
  screenedAt: string;
  screenedBy: string;
}

export interface QualificationCriteria {
  minQualificationScore?: number;
  minExperienceYears?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationLevel?: string;
  certificationsRequired?: string[];
  maxSalaryExpectation?: number;
  noticePeriodMax?: string;
}

export interface QualificationResult {
  candidateId: string;

  // Qualification Criteria
  meetsBasicRequirements: boolean;
  meetsPreferredRequirements: boolean;

  // Scoring
  qualificationScore: number;
  experienceScore: number;
  skillsMatchScore: number;
  cultureFitScore: number;

  // Assessment
  strengths: string[];
  weaknesses: string[];
  gaps: string[];

  // Verification
  educationVerified: boolean;
  employmentVerified: boolean;
  referencesChecked: boolean;

  // Decision
  qualificationStatus: 'highly_qualified' | 'qualified' | 'marginally_qualified' | 'not_qualified';
  qualificationReason: string;

  // Salary Analysis
  expectedVsMarketSalary?: {
    expected: number;
    marketMedian: number;
    percentile: number;
  };

  qualifiedAt: string;
  qualifiedBy: string;
}

// ============================================
// JOBS
// ============================================

export interface JobRequirement {
  skill: string;
  required: boolean;
  minYears?: number;
  priority?: 'must_have' | 'should_have' | 'nice_to_have';
}

export interface Job {
  id: string;
  tenantId: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;

  description: string;
  responsibilities: string[];
  requirements: JobRequirement[];
  preferredQualifications?: string[];

  salary?: {
    min: number;
    max: number;
    currency: SalaryCurrency;
    isNegotiable: boolean;
  };

  benefits?: string[];
  workingHours?: string;
  remotePolicy?: 'onsite' | 'hybrid' | 'remote';

  status: 'draft' | 'active' | 'paused' | 'closed';

  hiringManagerId: string;
  recruiterId?: string;

  interviewRounds?: InterviewRound[];

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface InterviewRound {
  name: string;
  type: InterviewType;
  duration: number; // minutes
  interviewers: string[];
  description?: string;
  order: number;
}

export interface CandidateJobMatch {
  candidateId: string;
  jobId: string;

  // Matching Scores
  overallMatchScore: number;
  skillsMatchScore: number;
  experienceMatchScore: number;
  cultureMatchScore: number;
  salaryMatchScore: number;

  // Details
  matchedSkills: string[];
  missingSkills: string[];
  matchedRequirements: string[];
  missingRequirements: string[];

  // Recommendation
  recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no';
  recommendationReason: string;

  // Ranking
  rank: number;

  matchedAt: string;
}

// ============================================
// INTERVIEWS
// ============================================

export interface InterviewSchedule {
  id: string;
  candidateId: string;
  jobId: string;

  interviewType: InterviewType;
  roundNumber: number;

  scheduledAt: string;
  duration: number; // minutes
  timezone: string;

  location?: string;
  meetingLink?: string;

  interviewers: InterviewAssignment[];
  calendarEventId?: string;

  status: InterviewStatus;
  feedback?: InterviewFeedback[];

  notes?: string;
  cancellationReason?: string;

  reminders: {
    sent24h: boolean;
    sent1h: boolean;
  };

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InterviewAssignment {
  interviewerId: string;
  interviewerName: string;
  interviewerEmail?: string;
  interviewerRole: string;
  confirmed: boolean;
  feedbackSubmitted: boolean;
}

export interface InterviewFeedback {
  interviewerId: string;
  interviewerName: string;

  // Scores (1-5)
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  cultureFit: number;
  overallScore: number;

  strengths: string[];
  concerns: string[];
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  notes?: string;

  submittedAt: string;
}

// ============================================
// ONBOARDING
// ============================================

export interface OnboardingChecklist {
  id: string;
  name: string;
  category: 'document' | 'training' | 'equipment' | 'introduction' | 'task';
  description: string;

  assigneeId?: string;
  assigneeName?: string;

  dueDate?: string;
  completedAt?: string;

  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';
  order: number;

  dependencies?: string[];

  instructions?: string;
  resources?: { name: string; url: string }[];
}

export interface OnboardingWorkflow {
  id: string;
  candidateId: string;
  jobId: string;

  // Status
  status: OnboardingStatus;
  progress: number; // 0-100

  // Templates
  templateId?: string;
  templateName?: string;

  // Start Info
  startDate: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;

  // Manager
  managerId: string;
  managerName: string;
  buddyId?: string;
  buddyName?: string;

  // Checklist
  checklists: OnboardingChecklist[];

  // Documents
  documents: OnboardingDocument[];

  // Equipment
  equipmentRequests: EquipmentRequest[];

  // Training
  trainingPrograms: TrainingEnrollment[];

  // Feedback
  feedback?: OnboardingFeedback[];

  // Notes
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDocument {
  id: string;
  name: string;
  type: 'offer_letter' | 'contract' | 'nda' | 'policy' | 'tax_form' | 'id_proof' | 'other';
  required: boolean;
  status: 'pending' | 'sent' | 'signed' | 'rejected' | 'expired';
  fileUrl?: string;
  signedAt?: string;
  dueDate?: string;
}

export interface EquipmentRequest {
  id: string;
  category: 'laptop' | 'monitor' | 'phone' | 'access_card' | 'software' | 'other';
  name: string;
  specifications?: string;
  status: 'requested' | 'approved' | 'ordered' | 'delivered' | 'returned';
  requestedAt: string;
  deliveredAt?: string;
  trackingNumber?: string;
}

export interface TrainingEnrollment {
  id: string;
  trainingProgramId: string;
  name: string;
  description?: string;
  duration: number; // hours
  status: 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  completedAt?: string;
  deadline?: string;
}

export interface OnboardingFeedback {
  type: 'day1' | 'week1' | 'month1' | '90day';
  submittedBy: string;
  submittedByName: string;
  ratings: {
    onboardingQuality: number;
    managerSupport: number;
    clarityOfRole: number;
    overallSatisfaction: number;
  };
  positiveAspects: string[];
  areasForImprovement: string[];
  comments?: string;
  submittedAt: string;
}

// ============================================
// SKILLS & MATCHING
// ============================================

export interface SkillGap {
  skill: string;
  currentLevel: string;
  requiredLevel: string;
  gapSeverity: 'critical' | 'major' | 'minor' | 'none';
  recommendedTraining?: string;
}

export interface SkillsAnalysis {
  candidateId: string;
  jobId?: string;

  currentSkills: Skill[];
  requiredSkills: string[];

  matchedSkills: SkillMatch[];
  missingSkills: string[];
  skillGaps: SkillGap[];

  skillCoveragePercent: number;
  skillRelevanceScore: number;

  recommendedTrainings: RecommendedTraining[];

  analyzedAt: string;
}

export interface SkillMatch {
  skill: string;
  candidateLevel: string;
  requiredLevel: string;
  matchPercent: number;
  isRequired: boolean;
}

export interface RecommendedTraining {
  trainingName: string;
  provider: string;
  duration: string;
  url?: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

// ============================================
// SALARY BENCHMARKING
// ============================================

export interface SalaryBenchmark {
  jobTitle: string;
  location: string;
  experienceLevel: ExperienceLevel;

  currency: SalaryCurrency;

  salaryRange: {
    min: number;
    median: number;
    max: number;
  };

  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };

  byEmploymentType: Record<EmploymentType, { min: number; median: number; max: number }>;
  byCompanySize?: Record<string, { min: number; median: number; max: number }>;

  dataSource: string;
  dataDate: string;
  sampleSize: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// SERVICE CONFIGURATION
// ============================================

export interface HRRecruiterConfig {
  port: number;
  tenantId: string;

  // Screening Settings
  screening: {
    minSkillsMatch: number; // percentage
    minAtsScore: number;
    autoRejectThreshold: number;
    autoApproveThreshold: number;
  };

  // Interview Settings
  interview: {
    defaultDuration: number; // minutes
    bufferBetweenInterviews: number; // minutes
    reminder24hBefore: boolean;
    reminder1hBefore: boolean;
  };

  // Onboarding Settings
  onboarding: {
    defaultDurationDays: number;
    autoSendDocuments: boolean;
    autoAssignBuddy: boolean;
  };

  // Skills Matching
  skills: {
    weightExperience: number;
    weightCertifications: number;
    weightEndorsements: number;
  };
}
