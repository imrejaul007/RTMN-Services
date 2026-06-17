// Core Types for Root Cause Intelligence Engine

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  settings?: Record<string, unknown>;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ImpactLevel = 'severe' | 'significant' | 'moderate' | 'minimal';
export type FactorType = 'process' | 'technology' | 'human' | 'external' | 'resource' | 'policy';
export type ControlLevel = 'controllable' | 'partially_controllable' | 'uncontrollable';
export type ChainLevel = 'symptom' | 'issue' | 'cause' | 'root_cause';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ComplaintData {
  id?: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  severity: Severity;
  affectedUsers: number;
  revenueImpact?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CausalNode {
  id: string;
  level: ChainLevel;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  relatedComplaints: string[];
  factorContributions?: FactorContribution[];
}

export interface FactorContribution {
  factorId: string;
  factorName: string;
  contribution: number; // 0-100 percentage
  controllable: ControlLevel;
}

export interface CausalChain {
  id: string;
  analysisId: string;
  tenantId: string;
  nodes: CausalNode[];
  chainStrength: number; // 0-100
  primaryRootCause: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributingFactor {
  id: string;
  analysisId: string;
  tenantId: string;
  type: FactorType;
  name: string;
  description: string;
  impact: number; // 0-100
  controllability: ControlLevel;
  frequency: number; // How often it appears
  affectedComplaints: string[];
  recommendations?: string[];
  createdAt: Date;
}

export interface Recommendation {
  id: string;
  analysisId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: number; // 1-10
  expectedImpact: ImpactLevel;
  estimatedCost?: number;
  estimatedSavings?: number;
  roi?: number;
  implementationEffort: 'low' | 'medium' | 'high';
  timeframe: string;
  relatedFactors: string[];
  linkedHistoricalCases?: string[];
  status: 'proposed' | 'approved' | 'implemented' | 'rejected';
  createdAt: Date;
}

export interface RootCauseAnalysis {
  id: string;
  tenantId: string;
  complaintIds: string[];
  causalChainId?: string;
  factorIds: string[];
  recommendationIds: string[];
  summary: string;
  primaryRootCause: string;
  confidence: ConfidenceLevel;
  impact: ImpactLevel;
  totalAffectedUsers: number;
  totalRevenueImpact: number;
  similarCases: SimilarCase[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SimilarCase {
  analysisId: string;
  title: string;
  rootCause: string;
  similarity: number; // 0-100
  resolution?: string;
}

export interface AnalysisRequest {
  tenantId: string;
  complaints: ComplaintData[];
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  depth?: number; // How deep to trace causal chains
  includeHistorical?: boolean;
  similarityThreshold?: number;
  maxRecommendations?: number;
}

export interface AnalysisResponse {
  analysisId: string;
  causalChain: CausalChain;
  factors: ContributingFactor[];
  recommendations: Recommendation[];
  similarCases: SimilarCase[];
  summary: string;
  metadata: {
    totalComplaints: number;
    totalAffectedUsers: number;
    totalRevenueImpact: number;
    confidence: ConfidenceLevel;
    processingTimeMs: number;
  };
}

export interface PatternDetection {
  patternType: string;
  frequency: number;
  severity: Severity;
  commonFactors: string[];
  complaintIds: string[];
  detectedAt: Date;
}

export interface ImpactMetrics {
  usersAffected: number;
  revenueLoss: number;
  reputationScore: number; // 0-100
  operationalCost: number;
  totalImpact: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
