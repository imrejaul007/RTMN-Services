/**
 * HOJAI Performance Dashboard - Type Definitions
 *
 * KPI, Evaluation, Compensation, and Performance Report types for AI employees.
 */

import { z } from 'zod';

// ============================================
// KPI TYPES
// ============================================

export interface KPI {
  kpiId: string;
  employeeId: string;
  tenantId: string;
  period: string; // YYYY-MM format

  // Task Metrics
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
  tasksCancelled: number;
  totalTasksAttempted: number;

  // Response Time Metrics (in milliseconds)
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;

  // Quality Metrics
  customerSatisfaction: number; // 0-100 scale
  qualityScore: number; // 0-100 scale

  // Revenue Metrics
  revenueGenerated: number;
  revenuePerTask: number;
  conversionRate: number; // 0-1 scale

  // Error Metrics
  errorRate: number; // 0-1 scale
  escalationRate: number; // 0-1 scale
  escalationCount: number;

  // Efficiency Metrics
  utilizationRate: number; // 0-1 scale
  avgResolutionTime: number; // in milliseconds
  throughputPerHour: number;

  // Collaboration Metrics
  peerRating: number; // 0-100 scale
  teamContributionScore: number; // 0-100 scale

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIUpdate {
  tasksCompleted?: number;
  tasksFailed?: number;
  responseTime?: number;
  customerSatisfaction?: number;
  revenueGenerated?: number;
  errorOccurred?: boolean;
  escalationTriggered?: boolean;
}

// ============================================
// EVALUATION TYPES
// ============================================

export type EvaluationPeriod = 'weekly' | 'monthly' | 'quarterly';
export type EvaluationStatus = 'draft' | 'completed' | 'archived';

export interface Evaluation {
  evaluationId: string;
  employeeId: string;
  tenantId: string;
  evaluatorId: string; // ID of the evaluating system or admin
  period: string; // YYYY-MM format
  periodType: EvaluationPeriod;

  // Component Scores (0-100 each)
  qualityScore: number;
  productivityScore: number;
  reliabilityScore: number;
  collaborationScore: number;
  growthScore: number;

  // Overall Score (weighted average)
  overallScore: number;

  // Percentile Rankings (0-1 scale)
  percentileRank: number;
  tenantPercentileRank: number;

  // Status
  status: EvaluationStatus;

  // Feedback
  strengths: string[];
  improvements: string[];
  recommendations: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface EvaluationWeights {
  quality: number;   // Default: 0.30
  productivity: number; // Default: 0.25
  reliability: number;  // Default: 0.20
  collaboration: number; // Default: 0.15
  growth: number;       // Default: 0.10
}

// ============================================
// COMPENSATION TYPES
// ============================================

export type CompensationStatus = 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
export type CompensationType = 'salary' | 'bonus' | 'commission' | 'performance_payout';

export interface Compensation {
  compensationId: string;
  employeeId: string;
  tenantId: string;
  period: string; // YYYY-MM format

  // Base Compensation
  baseAmount: number;
  compensationType: CompensationType;

  // Adjustments
  performanceBonus: number;
  qualityBonus: number;
  revenueShare: number;
  penalty: number;

  // Final Amount
  grossAmount: number;
  taxDeduction: number;
  otherDeductions: number;
  netAmount: number;

  // Status
  status: CompensationStatus;
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;

  // Breakdown
  calculationDetails: CompensationBreakdown;

  // Integration
  billingTransactionId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CompensationBreakdown {
  baseHourlyRate: number;
  hoursWorked: number;
  tasksCompleted: number;
  qualityMultiplier: number;
  performanceMultiplier: number;
  revenueSharePercentage: number;
  penaltyReasons: string[];
}

export interface CompensationConfig {
  baseSalary: number;
  maxBonusMultiplier: number;
  revenueSharePercentage: number;
  taxRate: number;
  qualityThreshold: number; // Minimum quality score for bonus eligibility
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export type LeaderboardMetric = 'overall' | 'productivity' | 'quality' | 'revenue' | 'efficiency';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;

  // Score/Value
  score: number;
  previousRank?: number;
  rankChange: number; // positive = improvement

  // Metrics
  metrics: {
    overall?: number;
    productivity?: number;
    quality?: number;
    revenue?: number;
    efficiency?: number;
  };

  // Badge
  badge?: 'top_performer' | 'most_improved' | 'quality_champion' | 'revenue_leader' | 'streak';
}

export interface Leaderboard {
  leaderboardId: string;
  tenantId: string;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  periodLabel: string; // e.g., "2026-05" or "Week 22"
  entries: LeaderboardEntry[];
  totalParticipants: number;
  generatedAt: Date;
}

// ============================================
// REPORT TYPES
// ============================================

export type ReportType = 'individual' | 'team' | 'department' | 'organization';
export type ReportFormat = 'json' | 'pdf' | 'csv';

export interface PerformanceReport {
  reportId: string;
  employeeId: string;
  tenantId: string;
  reportType: ReportType;
  period: string;
  periodStart: Date;
  periodEnd: Date;

  // Summary
  summary: ReportSummary;

  // Detailed Sections
  kpiData: KPISummary;
  evaluationHistory: EvaluationSummary[];
  compensationHistory: CompensationSummary[];
  trendAnalysis: TrendData[];

  // Generated Metadata
  generatedAt: Date;
  generatedBy: string; // System or admin ID

  // Timestamps
  createdAt: Date;
}

export interface ReportSummary {
  overallScore: number;
  scoreChange: number; // vs previous period
  percentileChange: number;

  topStrength: string;
  topImprovement: string;

  totalTasks: number;
  completionRate: number;
  avgCustomerSatisfaction: number;
  totalRevenue: number;

  periodHighlights: string[];
}

export interface KPISummary {
  current: Partial<KPI>;
  previous: Partial<KPI>;
  changes: Record<string, number>; // percentage change
}

export interface EvaluationSummary {
  evaluationId: string;
  period: string;
  overallScore: number;
  componentScores: {
    quality: number;
    productivity: number;
    reliability: number;
    collaboration: number;
    growth: number;
  };
}

export interface CompensationSummary {
  compensationId: string;
  period: string;
  grossAmount: number;
  netAmount: number;
  breakdown: {
    base: number;
    bonus: number;
    penalty: number;
  };
}

export interface TrendData {
  date: string;
  metric: string;
  value: number;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface KPIQueryParams {
  period?: string;
  startDate?: string;
  endDate?: string;
}

export interface LeaderboardQueryParams {
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  limit?: number;
  department?: string;
}

export interface CompensationCalculateRequest {
  employeeId: string;
  period: string;
  overrideBase?: number;
}

export interface ReportGenerateRequest {
  employeeId: string;
  reportType?: ReportType;
  periodStart: string;
  periodEnd: string;
  format?: ReportFormat;
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

export const KPIUpdateSchema = z.object({
  tasksCompleted: z.number().min(0).optional(),
  tasksFailed: z.number().min(0).optional(),
  responseTime: z.number().min(0).optional(),
  customerSatisfaction: z.number().min(0).max(100).optional(),
  revenueGenerated: z.number().min(0).optional(),
  errorOccurred: z.boolean().optional(),
  escalationTriggered: z.boolean().optional(),
});

export const CompensationCalculateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  overrideBase: z.number().min(0).optional(),
});

export const LeaderboardQuerySchema = z.object({
  metric: z.enum(['overall', 'productivity', 'quality', 'revenue', 'efficiency']).optional(),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  limit: z.number().min(1).max(100).optional(),
  department: z.string().optional(),
});

export const ReportGenerateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  reportType: z.enum(['individual', 'team', 'department', 'organization']).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format'),
  format: z.enum(['json', 'pdf', 'csv']).optional(),
});

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  quality: 0.30,
  productivity: 0.25,
  reliability: 0.20,
  collaboration: 0.15,
  growth: 0.10,
};

export const DEFAULT_COMPENSATION_CONFIG: CompensationConfig = {
  baseSalary: 50000,
  maxBonusMultiplier: 1.5,
  revenueSharePercentage: 0.05,
  taxRate: 0.18,
  qualityThreshold: 70,
};

export const KPI_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 60,
  poor: 40,
} as const;

export const EVALUATION_GRADES = {
  exceptional: { min: 95, label: 'Exceptional', color: '#22C55E' },
  exceeds: { min: 85, label: 'Exceeds Expectations', color: '#3B82F6' },
  meets: { min: 70, label: 'Meets Expectations', color: '#FACC15' },
  needs: { min: 50, label: 'Needs Improvement', color: '#F97316' },
  unsatisfactory: { min: 0, label: 'Unsatisfactory', color: '#EF4444' },
} as const;
