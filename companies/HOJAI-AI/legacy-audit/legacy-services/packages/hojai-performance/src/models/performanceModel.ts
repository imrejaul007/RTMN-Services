/**
 * HOJAI Performance Dashboard - MongoDB Models
 *
 * Mongoose schemas for KPI tracking, evaluations, compensation, and leaderboards.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Re-export constants from types
export { DEFAULT_EVALUATION_WEIGHTS } from '../types/index.js';

// ============================================
// KPI MODEL
// ============================================

export interface IKPI extends Document {
  kpiId: string;
  employeeId: string;
  tenantId: string;
  period: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
  tasksCancelled: number;
  totalTasksAttempted: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  customerSatisfaction: number;
  qualityScore: number;
  revenueGenerated: number;
  revenuePerTask: number;
  conversionRate: number;
  errorRate: number;
  escalationRate: number;
  escalationCount: number;
  utilizationRate: number;
  avgResolutionTime: number;
  throughputPerHour: number;
  peerRating: number;
  teamContributionScore: number;
}

const KPISchema = new Schema<IKPI>(
  {
    kpiId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    period: { type: String, required: true, index: true },
    tasksCompleted: { type: Number, default: 0 },
    tasksFailed: { type: Number, default: 0 },
    tasksInProgress: { type: Number, default: 0 },
    tasksCancelled: { type: Number, default: 0 },
    totalTasksAttempted: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    minResponseTime: { type: Number, default: 0 },
    maxResponseTime: { type: Number, default: 0 },
    p95ResponseTime: { type: Number, default: 0 },
    customerSatisfaction: { type: Number, default: 0, min: 0, max: 100 },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    revenueGenerated: { type: Number, default: 0 },
    revenuePerTask: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 1 },
    errorRate: { type: Number, default: 0, min: 0, max: 1 },
    escalationRate: { type: Number, default: 0, min: 0, max: 1 },
    escalationCount: { type: Number, default: 0 },
    utilizationRate: { type: Number, default: 0, min: 0, max: 1 },
    avgResolutionTime: { type: Number, default: 0 },
    throughputPerHour: { type: Number, default: 0 },
    peerRating: { type: Number, default: 0, min: 0, max: 100 },
    teamContributionScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

KPISchema.index({ tenantId: 1, period: 1 });
KPISchema.index({ employeeId: 1, period: 1 });
KPISchema.index({ tenantId: 1, employeeId: 1, period: 1 }, { unique: true });

export const KPI: Model<IKPI> = mongoose.model<IKPI>('KPI', KPISchema);

// ============================================
// KPI HISTORY MODEL
// ============================================

export interface IKPIHistory extends Document {
  historyId: string;
  kpiId: string;
  employeeId: string;
  tenantId: string;
  changes: Record<string, { old: number; new: number }>;
  timestamp: Date;
}

const KPIHistorySchema = new Schema<IKPIHistory>(
  {
    historyId: { type: String, required: true, unique: true, index: true },
    kpiId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    changes: { type: Map, of: new Schema({ old: Number, new: Number }, { _id: false }) },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const KPIHistory: Model<IKPIHistory> = mongoose.model<IKPIHistory>('KPIHistory', KPIHistorySchema);

// ============================================
// EVALUATION MODEL
// ============================================

export interface IEvaluation extends Document {
  evaluationId: string;
  employeeId: string;
  tenantId: string;
  evaluatorId: string;
  period: string;
  periodType: 'weekly' | 'monthly' | 'quarterly';
  qualityScore: number;
  productivityScore: number;
  reliabilityScore: number;
  collaborationScore: number;
  growthScore: number;
  overallScore: number;
  percentileRank: number;
  tenantPercentileRank: number;
  status: 'draft' | 'completed' | 'archived';
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  completedAt?: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    evaluationId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    evaluatorId: { type: String, required: true },
    period: { type: String, required: true, index: true },
    periodType: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly'],
      required: true,
    },
    qualityScore: { type: Number, required: true, min: 0, max: 100 },
    productivityScore: { type: Number, required: true, min: 0, max: 100 },
    reliabilityScore: { type: Number, required: true, min: 0, max: 100 },
    collaborationScore: { type: Number, required: true, min: 0, max: 100 },
    growthScore: { type: Number, required: true, min: 0, max: 100 },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    percentileRank: { type: Number, default: 0, min: 0, max: 1 },
    tenantPercentileRank: { type: Number, default: 0, min: 0, max: 1 },
    status: {
      type: String,
      enum: ['draft', 'completed', 'archived'],
      default: 'draft',
    },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    recommendations: [{ type: String }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

EvaluationSchema.index({ employeeId: 1, period: 1 });
EvaluationSchema.index({ tenantId: 1, period: 1 });
EvaluationSchema.index({ employeeId: 1, period: 1, periodType: 1 }, { unique: true });

export const Evaluation: Model<IEvaluation> = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);

// ============================================
// EVALUATION CONFIG MODEL
// ============================================

export interface IEvaluationConfig extends Document {
  configId: string;
  tenantId: string;
  weights: {
    quality: number;
    productivity: number;
    reliability: number;
    collaboration: number;
    growth: number;
  };
  thresholds: {
    exceptional: number;
    exceeds: number;
    meets: number;
    needs: number;
  };
  autoEvaluation: boolean;
  evaluationFrequency: 'weekly' | 'monthly' | 'quarterly';
  updatedAt: Date;
}

const EvaluationConfigSchema = new Schema<IEvaluationConfig>(
  {
    configId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    weights: {
      type: Object,
      default: {
        quality: 0.30,
        productivity: 0.25,
        reliability: 0.20,
        collaboration: 0.15,
        growth: 0.10,
      },
    },
    thresholds: {
      exceptional: { type: Number, default: 95 },
      exceeds: { type: Number, default: 85 },
      meets: { type: Number, default: 70 },
      needs: { type: Number, default: 50 },
    },
    autoEvaluation: { type: Boolean, default: true },
    evaluationFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly'],
      default: 'monthly',
    },
  },
  { timestamps: true }
);

EvaluationConfigSchema.index({ tenantId: 1 }, { unique: true });

export const EvaluationConfig: Model<IEvaluationConfig> = mongoose.model<IEvaluationConfig>(
  'EvaluationConfig',
  EvaluationConfigSchema
);

// ============================================
// COMPENSATION MODEL
// ============================================

export interface ICompensation extends Document {
  compensationId: string;
  employeeId: string;
  tenantId: string;
  period: string;
  baseAmount: number;
  compensationType: 'salary' | 'bonus' | 'commission' | 'performance_payout';
  performanceBonus: number;
  qualityBonus: number;
  revenueShare: number;
  penalty: number;
  grossAmount: number;
  taxDeduction: number;
  otherDeductions: number;
  netAmount: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  calculationDetails: {
    baseHourlyRate: number;
    hoursWorked: number;
    tasksCompleted: number;
    qualityMultiplier: number;
    performanceMultiplier: number;
    revenueSharePercentage: number;
    penaltyReasons: string[];
  };
  billingTransactionId?: string;
}

const CompensationSchema = new Schema<ICompensation>(
  {
    compensationId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    period: { type: String, required: true, index: true },
    baseAmount: { type: Number, required: true },
    compensationType: {
      type: String,
      enum: ['salary', 'bonus', 'commission', 'performance_payout'],
      required: true,
    },
    performanceBonus: { type: Number, default: 0 },
    qualityBonus: { type: Number, default: 0 },
    revenueShare: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    grossAmount: { type: Number, required: true },
    taxDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'calculated', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    calculationDetails: {
      baseHourlyRate: { type: Number, required: true },
      hoursWorked: { type: Number, required: true },
      tasksCompleted: { type: Number, required: true },
      qualityMultiplier: { type: Number, required: true },
      performanceMultiplier: { type: Number, required: true },
      revenueSharePercentage: { type: Number, required: true },
      penaltyReasons: [{ type: String }],
    },
    billingTransactionId: { type: String, index: true },
  },
  { timestamps: true }
);

CompensationSchema.index({ employeeId: 1, period: 1 });
CompensationSchema.index({ tenantId: 1, period: 1 });
CompensationSchema.index({ tenantId: 1, status: 1 });
CompensationSchema.index({ employeeId: 1, period: 1 }, { unique: true });

export const Compensation: Model<ICompensation> = mongoose.model<ICompensation>('Compensation', CompensationSchema);

// ============================================
// LEADERBOARD MODEL
// ============================================

export interface ILeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  score: number;
  previousRank?: number;
  rankChange: number;
  metrics: Record<string, number>;
  badge?: string;
}

export interface ILeaderboard extends Document {
  leaderboardId: string;
  tenantId: string;
  metric: 'overall' | 'productivity' | 'quality' | 'revenue' | 'efficiency';
  period: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  entries: ILeaderboardEntry[];
  totalParticipants: number;
  generatedAt: Date;
}

const LeaderboardEntrySchema = new Schema(
  {
    rank: { type: Number, required: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, required: true },
    score: { type: Number, required: true },
    previousRank: { type: Number },
    rankChange: { type: Number, default: 0 },
    metrics: { type: Map, of: Number },
    badge: { type: String },
  },
  { _id: false }
);

const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    leaderboardId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    metric: {
      type: String,
      enum: ['overall', 'productivity', 'quality', 'revenue', 'efficiency'],
      required: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    periodLabel: { type: String, required: true },
    entries: [LeaderboardEntrySchema],
    totalParticipants: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeaderboardSchema.index({ tenantId: 1, metric: 1, period: 1, periodLabel: 1 });
LeaderboardSchema.index({ tenantId: 1, metric: 1, period: 1, periodLabel: 1 }, { unique: true });

export const Leaderboard: Model<ILeaderboard> = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);

// ============================================
// PERFORMANCE REPORT MODEL
// ============================================

export interface IPerformanceReport extends Document {
  reportId: string;
  employeeId: string;
  tenantId: string;
  reportType: 'individual' | 'team' | 'department' | 'organization';
  period: string;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    overallScore: number;
    scoreChange: number;
    percentileChange: number;
    topStrength?: string;
    topImprovement?: string;
    totalTasks: number;
    completionRate: number;
    avgCustomerSatisfaction: number;
    totalRevenue: number;
    periodHighlights: string[];
  };
  kpiData: any;
  evaluationHistory: any;
  compensationHistory: any;
  trendAnalysis: any;
  generatedAt: Date;
  generatedBy: string;
}

const PerformanceReportSchema = new Schema<IPerformanceReport>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    reportType: {
      type: String,
      enum: ['individual', 'team', 'department', 'organization'],
      required: true,
    },
    period: { type: String, required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    summary: {
      overallScore: { type: Number, required: true },
      scoreChange: { type: Number, default: 0 },
      percentileChange: { type: Number, default: 0 },
      topStrength: { type: String },
      topImprovement: { type: String },
      totalTasks: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      avgCustomerSatisfaction: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      periodHighlights: [{ type: String }],
    },
    kpiData: { type: mongoose.Schema.Types.Mixed },
    evaluationHistory: { type: mongoose.Schema.Types.Mixed },
    compensationHistory: { type: mongoose.Schema.Types.Mixed },
    trendAnalysis: { type: mongoose.Schema.Types.Mixed },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

PerformanceReportSchema.index({ employeeId: 1, period: 1 });
PerformanceReportSchema.index({ tenantId: 1, reportType: 1 });
PerformanceReportSchema.index({ tenantId: 1, employeeId: 1, period: 1 }, { unique: true });

export const PerformanceReport: Model<IPerformanceReport> = mongoose.model<IPerformanceReport>(
  'PerformanceReport',
  PerformanceReportSchema
);

// ============================================
// EMPLOYEE PROFILE MODEL
// ============================================

export interface IEmployeeProfile extends Document {
  employeeId: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  level: number;
  managerId?: string;
  hireDate: Date;
  status: 'active' | 'inactive' | 'onboarding';
  baseSalary: number;
  hourlyRate: number;
}

const EmployeeProfileSchema = new Schema<IEmployeeProfile>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, required: true },
    level: { type: Number, default: 1, min: 1, max: 10 },
    managerId: { type: String },
    hireDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'onboarding'],
      default: 'active',
    },
    baseSalary: { type: Number, required: true },
    hourlyRate: { type: Number, required: true },
  },
  { timestamps: true }
);

EmployeeProfileSchema.index({ tenantId: 1, department: 1 });
EmployeeProfileSchema.index({ tenantId: 1, status: 1 });

export const EmployeeProfile: Model<IEmployeeProfile> = mongoose.model<IEmployeeProfile>('EmployeeProfile', EmployeeProfileSchema);

// ============================================
// EXPORT ALL MODELS
// ============================================

export const models = {
  KPI,
  KPIHistory,
  Evaluation,
  EvaluationConfig,
  Compensation,
  Leaderboard,
  PerformanceReport,
  EmployeeProfile,
};

export default models;
