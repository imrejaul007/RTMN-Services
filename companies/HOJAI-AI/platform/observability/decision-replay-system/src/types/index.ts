/**
 * Decision Replay System - Type Definitions
 * Full chain replay from agent → decision → negotiation → contract → economy
 */

// Span types for tracing
export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  serviceName: string;
  operationType: OperationType;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  tags: Record<string, string | number | boolean>;
  logs: SpanLog[];
  errors?: SpanError[];
  metadata?: Record<string, unknown>;
}

export type SpanStatus = 'started' | 'running' | 'completed' | 'error' | 'cancelled';

export type OperationType =
  | 'agent_invocation'
  | 'decision_evaluation'
  | 'negotiation_round'
  | 'contract_creation'
  | 'contract_signing'
  | 'payment_processing'
  | 'economy_transaction'
  | 'trust_calculation'
  | 'reputation_update'
  | 'capability_match'
  | 'discovery_search'
  | 'message_delivery'
  | 'workflow_execution'
  | 'api_call'
  | 'database_query'
  | 'cache_operation'
  | 'external_call';

export interface SpanLog {
  timestamp: number;
  message: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  fields?: Record<string, unknown>;
}

export interface SpanError {
  timestamp: number;
  message: string;
  code?: string;
  stack?: string;
  attributes?: Record<string, unknown>;
}

// Trace types
export interface Trace {
  id: string;
  rootSpanId: string;
  spans: Map<string, Span>;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  metadata: TraceMetadata;
  timeline?: TimelineEvent[];
  branchComparison?: BranchComparison;
  performanceAnalysis?: PerformanceAnalysis;
}

export type TraceStatus = 'running' | 'completed' | 'error' | 'partial' | 'exported';

export interface TraceMetadata {
  userId?: string;
  sessionId?: string;
  agentId?: string;
  decisionId?: string;
  negotiationId?: string;
  contractId?: string;
  transactionId?: string;
  industryVertical?: string;
  useCase?: string;
  tags: string[];
  source: 'sutar' | 'external' | 'manual';
}

// Timeline for visualization
export interface TimelineEvent {
  id: string;
  spanId: string;
  timestamp: number;
  type: 'span_start' | 'span_end' | 'span_error' | 'log' | 'annotation' | 'branch_point';
  title: string;
  description?: string;
  duration?: number;
  status: 'success' | 'error' | 'warning' | 'info';
  depth: number;
  children?: TimelineEvent[];
}

// Branch comparison for time-travel debugging
export interface BranchComparison {
  branchPoint: BranchPoint;
  branches: Branch[];
  selectedBranchId?: string;
  divergenceAnalysis?: DivergenceAnalysis;
}

export interface BranchPoint {
  spanId: string;
  timestamp: number;
  reason: string;
  alternatives: BranchAlternative[];
}

export interface BranchAlternative {
  id: string;
  description: string;
  parameters: Record<string, unknown>;
  estimatedOutcome?: unknown;
  confidence?: number;
}

export interface Branch {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  spans: Span[];
  outcome?: unknown;
  cost?: number;
  duration?: number;
  path: string[];
}

export interface DivergenceAnalysis {
  firstDivergencePoint: string;
  divergenceReasons: string[];
  impactAssessment: {
    costImpact: number;
    timeImpact: number;
    qualityImpact: number;
  };
  recommendations: string[];
}

// Performance analysis
export interface PerformanceAnalysis {
  totalDuration: number;
  timeBreakdown: TimeBreakdown;
  criticalPath: string[];
  bottlenecks: Bottleneck[];
  optimizationSuggestions: OptimizationSuggestion[];
  percentileAnalysis: PercentileAnalysis;
}

export interface TimeBreakdown {
  byService: Record<string, number>;
  byOperation: Record<OperationType, number>;
  byAgent: Record<string, number>;
  waiting: number;
  processing: number;
  externalCalls: number;
}

export interface Bottleneck {
  spanId: string;
  location: string;
  duration: number;
  percentageOfTotal: number;
  causes: string[];
  estimatedSavings: number;
}

export interface OptimizationSuggestion {
  type: 'parallelization' | 'caching' | 'batching' | 'retry' | 'circuit_breaker' | 'timeout';
  targetSpanId?: string;
  description: string;
  estimatedImprovement: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface PercentileAnalysis {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  comparedToBaseline: {
    p50Delta: number;
    p90Delta: number;
    p95Delta: number;
    p99Delta: number;
  };
}

// Cost attribution
export interface CostAttribution {
  traceId: string;
  totalCost: number;
  breakdown: CostBreakdown;
  currency: string;
  billingPeriod: string;
}

export interface CostBreakdown {
  byService: Record<string, number>;
  byOperation: Record<OperationType, number>;
  byAgent: Record<string, number>;
  byDecision: Record<string, number>;
  infrastructure: {
    compute: number;
    storage: number;
    network: number;
    external: number;
  };
  llmCosts?: {
    byModel: Record<string, number>;
    byOperation: Record<string, number>;
    tokenCounts: TokenCounts;
  };
}

export interface TokenCounts {
  prompt: number;
  completion: number;
  total: number;
  cached: number;
}

// Recording types
export interface RecordDecisionRequest {
  traceId?: string;
  parentSpanId?: string;
  operationType: OperationType;
  serviceName: string;
  name: string;
  tags?: Record<string, string | number | boolean>;
  metadata?: Record<string, unknown>;
}

export interface RecordDecisionResponse {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  startTime: number;
}

export interface EndSpanRequest {
  spanId: string;
  traceId: string;
  status?: SpanStatus;
  tags?: Record<string, string | number | boolean>;
  logs?: SpanLog[];
  errors?: SpanError[];
}

export interface TimelineRequest {
  traceId: string;
  startTime?: number;
  endTime?: number;
  depth?: number;
  includeSpans?: boolean;
}

export interface ExportRequest {
  traceId: string;
  format: 'json' | 'csv' | 'html' | 'pprof';
  includeSpans?: boolean;
  includeMetrics?: boolean;
  includeTimeline?: boolean;
}

export interface ExportResponse {
  exportId: string;
  traceId: string;
  format: string;
  downloadUrl: string;
  expiresAt: number;
  size: number;
}

// Query and filtering
export interface TraceQuery {
  traceId?: string;
  serviceName?: string;
  operationType?: OperationType;
  status?: TraceStatus;
  startTime?: number;
  endTime?: number;
  durationMin?: number;
  durationMax?: number;
  tags?: Record<string, string>;
  agentId?: string;
  decisionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'startTime' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface TraceListResponse {
  traces: TraceSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface TraceSummary {
  id: string;
  rootSpanId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  services: string[];
  operationTypes: OperationType[];
  spanCount: number;
  errorCount: number;
  metadata: TraceMetadata;
}

// Storage interface for different backends
export interface TraceStorage {
  saveTrace(trace: Trace): Promise<void>;
  getTrace(traceId: string): Promise<Trace | null>;
  deleteTrace(traceId: string): Promise<boolean>;
  queryTraces(query: TraceQuery): Promise<TraceListResponse>;
  getSpansByTraceId(traceId: string): Promise<Span[]>;
  saveSpan(span: Span): Promise<void>;
  updateSpan(spanId: string, updates: Partial<Span>): Promise<void>;
}

// Analytics
export interface TraceAnalytics {
  totalTraces: number;
  tracesByStatus: Record<TraceStatus, number>;
  tracesByService: Record<string, number>;
  tracesByOperation: Record<OperationType, number>;
  averageDuration: number;
  percentileDurations: PercentileAnalysis;
  errorRate: number;
  topErrors: TopError[];
}

export interface TopError {
  errorCode?: string;
  errorMessage: string;
  count: number;
  lastOccurrence: number;
  affectedTraces: string[];
}
