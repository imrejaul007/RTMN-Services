/**
 * HR Recruiter Agent - Zod Validation Schemas
 */

import { z } from 'zod';
import { CandidateStatus, InterviewType, InterviewStatus, OnboardingStatus, ExperienceLevel, EmploymentType, SalaryCurrency } from './types';

// Re-export schemas for convenience
export { CandidateStatus, InterviewType, InterviewStatus, OnboardingStatus, ExperienceLevel, EmploymentType, SalaryCurrency } from './types';

// ============================================
// ENUMS
// ============================================

export const CandidateStatusSchema = z.nativeEnum(CandidateStatus);

export const InterviewTypeSchema = z.nativeEnum(InterviewType);

export const InterviewStatusSchema = z.nativeEnum(InterviewStatus);

export const OnboardingStatusSchema = z.nativeEnum(OnboardingStatus);

export const ExperienceLevelSchema = z.nativeEnum(ExperienceLevel);

export const EmploymentTypeSchema = z.nativeEnum(EmploymentType);

export const SalaryCurrencySchema = z.nativeEnum(SalaryCurrency);

// ============================================
// CORE SCHEMAS
// ============================================

export const ContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  linkedin: z.string().url().optional(),
  portfolio: z.string().url().optional(),
  location: z.string().optional(),
});

export const EducationSchema = z.object({
  degree: z.string().min(1).max(200),
  field: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export const WorkExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  current: z.boolean(),
  location: z.string().optional(),
  salary: z.object({
    amount: z.number().positive(),
    currency: SalaryCurrencySchema,
  }).optional(),
});

export const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  yearsOfExperience: z.number().min(0).optional(),
  verified: z.boolean().optional(),
  endorsements: z.number().int().min(0).optional(),
});

export const CertificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  dateObtained: z.string(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
});

export const LanguageSchema = z.object({
  language: z.string().min(1).max(100),
  proficiency: z.enum(['elementary', 'limited', 'professional', 'full_professional', 'native']),
});

// ============================================
// CANDIDATE SCHEMAS
// ============================================

export const CreateCandidateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  contact: ContactInfoSchema,
  headline: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),

  experience: z.array(WorkExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
  skills: z.array(SkillSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  languages: z.array(LanguageSchema).optional(),

  source: z.string().optional(),
  referredBy: z.string().optional(),
  jobId: z.string().uuid().optional(),

  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
  rating: z.number().min(1).max(5).optional(),
  salaryExpectation: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    currency: SalaryCurrencySchema,
  }).optional(),
  noticePeriod: z.string().optional(),
  availableFrom: z.string().optional(),
});

export const UpdateCandidateSchema = CreateCandidateSchema.partial().extend({
  status: CandidateStatusSchema.optional(),
});

export const CandidateQuerySchema = z.object({
  status: z.array(CandidateStatusSchema).optional(),
  jobId: z.string().uuid().optional(),
  source: z.string().optional(),
  minRating: z.number().min(1).max(5).optional(),
  skills: z.array(z.string()).optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'rating', 'firstName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// RESUME SCHEMAS
// ============================================

export const ScreeningCriteriaSchema = z.object({
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  minYearsExperience: z.number().min(0).optional(),
  maxYearsExperience: z.number().min(0).optional(),
  educationRequirements: z.array(z.string()).optional(),
  certificationsRequired: z.array(z.string()).optional(),
  minSalary: z.number().positive().optional(),
  maxSalary: z.number().positive().optional(),
  noticePeriodMax: z.string().optional(),
  visaSponsorship: z.boolean().optional(),
});

export const ScreenResumeSchema = z.object({
  candidateId: z.string().uuid(),
  resumeText: z.string().min(1),
  criteria: ScreeningCriteriaSchema.optional(),
});

export const ResumeParseSchema = z.object({
  candidateId: z.string().uuid(),
  resumeText: z.string().min(1),
  fileName: z.string().optional(),
});

// ============================================
// QUALIFICATION SCHEMAS
// ============================================

export const QualificationCriteriaSchema = z.object({
  minQualificationScore: z.number().min(0).max(100).default(60),
  minExperienceYears: z.number().min(0).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  educationLevel: z.string().optional(),
  certificationsRequired: z.array(z.string()).optional(),
  maxSalaryExpectation: z.number().positive().optional(),
  noticePeriodMax: z.string().optional(),
});

export const QualifyCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  criteria: QualificationCriteriaSchema.optional(),
});

// ============================================
// JOB SCHEMAS
// ============================================

export const JobRequirementSchema = z.object({
  skill: z.string().min(1).max(100),
  required: z.boolean().default(true),
  minYears: z.number().min(0).optional(),
  priority: z.enum(['must_have', 'should_have', 'nice_to_have']).default('must_have'),
});

export const CreateJobSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  employmentType: EmploymentTypeSchema.default(EmploymentType.FULL_TIME),
  experienceLevel: ExperienceLevelSchema,

  description: z.string().min(1).max(5000),
  responsibilities: z.array(z.string()).min(1),
  requirements: z.array(JobRequirementSchema).min(1),
  preferredQualifications: z.array(z.string()).optional(),

  salary: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    currency: SalaryCurrencySchema,
    isNegotiable: z.boolean().default(false),
  }).optional(),

  benefits: z.array(z.string()).optional(),
  workingHours: z.string().optional(),
  remotePolicy: z.enum(['onsite', 'hybrid', 'remote']).default('onsite'),

  interviewRounds: z.array(z.object({
    name: z.string(),
    type: InterviewTypeSchema,
    duration: z.number().min(15).max(480),
    interviewers: z.array(z.string()),
    description: z.string().optional(),
    order: z.number().int().positive(),
  })).optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'closed']).optional(),
});

export const MatchCandidatesSchema = z.object({
  jobId: z.string().uuid(),
  candidateIds: z.array(z.string().uuid()).optional(),
  filters: z.object({
    minMatchScore: z.number().min(0).max(100).optional(),
    status: z.array(CandidateStatusSchema).optional(),
  }).optional(),
});

// ============================================
// INTERVIEW SCHEMAS
// ============================================

export const ScheduleInterviewSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  interviewType: InterviewTypeSchema,
  roundNumber: z.number().int().positive().default(1),

  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(480).default(60),
  timezone: z.string().default('Asia/Kolkata'),

  location: z.string().optional(),
  meetingLink: z.string().url().optional(),

  interviewerIds: z.array(z.string().uuid()).min(1),

  notes: z.string().max(1000).optional(),
});

export const UpdateInterviewSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(480).optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  status: InterviewStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const SubmitFeedbackSchema = z.object({
  interviewId: z.string().uuid(),
  interviewerId: z.string().uuid(),

  technicalSkills: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  problemSolving: z.number().min(1).max(5),
  cultureFit: z.number().min(1).max(5),
  overallScore: z.number().min(1).max(5),

  strengths: z.array(z.string()).min(1),
  concerns: z.array(z.string()),
  recommendation: z.enum(['strong_hire', 'hire', 'no_hire', 'strong_no_hire']),
  notes: z.string().max(2000).optional(),
});

export const InterviewQuerySchema = z.object({
  candidateId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  status: z.array(InterviewStatusSchema).optional(),
  interviewerId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================
// ONBOARDING SCHEMAS
// ============================================

export const StartOnboardingSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid(),
  startDate: z.string().datetime(),
  targetCompletionDate: z.string().datetime().optional(),

  managerId: z.string().uuid(),
  buddyId: z.string().uuid().optional(),

  templateId: z.string().uuid().optional(),
  customChecklists: z.array(z.object({
    name: z.string(),
    category: z.enum(['document', 'training', 'equipment', 'introduction', 'task']),
    description: z.string(),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().datetime().optional(),
    order: z.number().int().positive(),
  })).optional(),
});

export const UpdateOnboardingSchema = z.object({
  status: OnboardingStatusSchema.optional(),
  targetCompletionDate: z.string().datetime().optional(),
  managerId: z.string().uuid().optional(),
  buddyId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const CompleteChecklistItemSchema = z.object({
  onboardingId: z.string().uuid(),
  checklistId: z.string().uuid(),
  completedAt: z.string().datetime().optional(),
});

export const SubmitOnboardingFeedbackSchema = z.object({
  onboardingId: z.string().uuid(),
  type: z.enum(['day1', 'week1', 'month1', '90day']),

  ratings: z.object({
    onboardingQuality: z.number().min(1).max(5),
    managerSupport: z.number().min(1).max(5),
    clarityOfRole: z.number().min(1).max(5),
    overallSatisfaction: z.number().min(1).max(5),
  }),

  positiveAspects: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  comments: z.string().max(2000).optional(),
});

// ============================================
// SKILLS & SALARY SCHEMAS
// ============================================

export const AnalyzeSkillsSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
});

export const GetSalaryBenchmarkSchema = z.object({
  jobTitle: z.string().min(1),
  location: z.string().min(1),
  experienceLevel: ExperienceLevelSchema,
  currency: SalaryCurrencySchema.default(SalaryCurrency.INR),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;
export type CandidateQueryInput = z.infer<typeof CandidateQuerySchema>;
export type ScreenResumeInput = z.infer<typeof ScreenResumeSchema>;
export type QualifyCandidateInput = z.infer<typeof QualifyCandidateSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type MatchCandidatesInput = z.infer<typeof MatchCandidatesSchema>;
export type ScheduleInterviewInput = z.infer<typeof ScheduleInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof UpdateInterviewSchema>;
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type InterviewQueryInput = z.infer<typeof InterviewQuerySchema>;
export type StartOnboardingInput = z.infer<typeof StartOnboardingSchema>;
export type UpdateOnboardingInput = z.infer<typeof UpdateOnboardingSchema>;
export type CompleteChecklistItemInput = z.infer<typeof CompleteChecklistItemSchema>;
export type SubmitOnboardingFeedbackInput = z.infer<typeof SubmitOnboardingFeedbackSchema>;
export type AnalyzeSkillsInput = z.infer<typeof AnalyzeSkillsSchema>;
export type GetSalaryBenchmarkInput = z.infer<typeof GetSalaryBenchmarkSchema>;
