/**
 * Decision Replay System - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Trace,
  Span,
  TimelineEvent,
  OperationType,
  SpanStatus,
  TraceQuery,
  Branch,
  DivergenceAnalysis,
  PerformanceAnalysis,
} from '../src/types/index.js';
import { TraceStorageService } from '../src/services/traceStorage.js';
import { TimelineService, PerformanceAnalysisService } from '../src/services/timelineService.js';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE SERVICE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('TimelineService', () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    timelineService = new TimelineService();
  });

  describe('generateTimeline', () => {
    it('should generate timeline events from trace', () => {
      const trace: Trace = {
        id: 'tr_123',
        rootSpanId: 'sp_1',
        spans: new Map([
          ['sp_1', {
            id: 'sp_1',
            traceId: 'tr_123',
            name: 'agent-decision',
            serviceName: 'sutar-decision-engine',
            operationType: 'decision_evaluation',
            startTime: 1000,
            endTime: 1500,
            duration: 500,
            status: 'completed',
            tags: {},
            logs: [
              { timestamp: 1100, message: 'Evaluating options', level: 'info' },
            ],
          }],
          ['sp_2', {
            id: 'sp_2',
            traceId: 'tr_123',
            parentSpanId: 'sp_1',
            name: 'negotiation',
            serviceName: 'sutar-negotiation-engine',
            operationType: 'negotiation_round',
            startTime: 1100,
            endTime: 1400,
            duration: 300,
            status: 'completed',
            tags: {},
            logs: [],
          }],
        ]),
        startTime: 1000,
        endTime: 1500,
        duration: 500,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const timeline = timelineService.generateTimeline(trace);

      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThan(0);

      // Check for span start events
      const startEvents = timeline.filter(e => e.type === 'span_start');
      expect(startEvents.length).toBe(2);

      // Check for span end events
      const endEvents = timeline.filter(e => e.type === 'span_end');
      expect(endEvents.length).toBe(2);

      // Check for log events
      const logEvents = timeline.filter(e => e.type === 'log');
      expect(logEvents.length).toBe(1);
    });

    it('should handle empty trace', () => {
      const trace: Trace = {
        id: 'tr_empty',
        rootSpanId: '',
        spans: new Map(),
        startTime: Date.now(),
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const timeline = timelineService.generateTimeline(trace);
      expect(timeline).toEqual([]);
    });

    it('should filter by time range', () => {
      const trace: Trace = {
        id: 'tr_123',
        rootSpanId: 'sp_1',
        spans: new Map([
          ['sp_1', {
            id: 'sp_1',
            traceId: 'tr_123',
            name: 'span-1',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1000,
            endTime: 2000,
            duration: 1000,
            status: 'completed',
            tags: {},
            logs: [],
          }],
        ]),
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const timeline = timelineService.generateTimeline(trace, {
        startTime: 1500,
        endTime: 2500,
      });

      expect(timeline.length).toBeGreaterThan(0);
    });

    it('should calculate span depths correctly', () => {
      const trace: Trace = {
        id: 'tr_depth',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_root', {
            id: 'sp_root',
            traceId: 'tr_depth',
            name: 'root',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1000,
            status: 'running',
            tags: {},
            logs: [],
          }],
          ['sp_child1', {
            id: 'sp_child1',
            traceId: 'tr_depth',
            parentSpanId: 'sp_root',
            name: 'child1',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1100,
            status: 'running',
            tags: {},
            logs: [],
          }],
          ['sp_grandchild', {
            id: 'sp_grandchild',
            traceId: 'tr_depth',
            parentSpanId: 'sp_child1',
            name: 'grandchild',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1200,
            status: 'running',
            tags: {},
            logs: [],
          }],
        ]),
        startTime: 1000,
        status: 'running',
        metadata: { tags: [], source: 'sutar' },
      };

      const timeline = timelineService.generateTimeline(trace);

      // Root span should have depth 0
      const rootStart = timeline.find(e => e.spanId === 'sp_root' && e.type === 'span_start');
      expect(rootStart?.depth).toBe(0);

      // Child should have depth 1
      const childStart = timeline.find(e => e.spanId === 'sp_child1' && e.type === 'span_start');
      expect(childStart?.depth).toBe(1);

      // Grandchild should have depth 2
      const grandchildStart = timeline.find(e => e.spanId === 'sp_grandchild' && e.type === 'span_start');
      expect(grandchildStart?.depth).toBe(2);
    });
  });

  describe('compareBranches', () => {
    it('should compare two branches', () => {
      const branchA: Branch = {
        id: 'branch_a',
        name: 'Branch A',
        startTime: 1000,
        endTime: 2000,
        spans: [],
        duration: 1000,
        path: ['sp_1', 'sp_2', 'sp_3'],
      };

      const branchB: Branch = {
        id: 'branch_b',
        name: 'Branch B',
        startTime: 1000,
        endTime: 2200,
        spans: [],
        duration: 1200,
        path: ['sp_1', 'sp_2', 'sp_4'],
      };

      const result = timelineService.compareBranches(branchA, branchB, {
        spanId: 'sp_1',
        timestamp: 1000,
        reason: 'Test branch point',
        alternatives: [],
      });

      expect(result).toBeDefined();
      expect(result.durationDelta).toBe(200);
      expect(result.pathDiff).toContain('sp_3');
      expect(result.pathDiff).toContain('sp_4');
    });
  });

  describe('analyzeDivergence', () => {
    it('should analyze divergence between branches', () => {
      const branchA: Branch = {
        id: 'branch_a',
        name: 'Branch A',
        startTime: 1000,
        endTime: 1500,
        spans: [
          {
            id: 'sp_1',
            traceId: 'tr',
            name: 'step-1',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1000,
            endTime: 1100,
            duration: 100,
            status: 'completed',
            tags: {},
            logs: [],
          },
          {
            id: 'sp_2',
            traceId: 'tr',
            name: 'step-2',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1100,
            endTime: 1300,
            duration: 200,
            status: 'completed',
            tags: {},
            logs: [],
          },
        ],
        duration: 500,
        path: ['sp_1', 'sp_2'],
      };

      const branchB: Branch = {
        id: 'branch_b',
        name: 'Branch B',
        startTime: 1000,
        endTime: 1600,
        spans: [
          {
            id: 'sp_1',
            traceId: 'tr',
            name: 'step-1',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1000,
            endTime: 1100,
            duration: 100,
            status: 'completed',
            tags: {},
            logs: [],
          },
          {
            id: 'sp_3',
            traceId: 'tr',
            name: 'step-3',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 1100,
            endTime: 1600,
            duration: 500,
            status: 'completed',
            tags: {},
            logs: [],
          },
        ],
        duration: 600,
        path: ['sp_1', 'sp_3'],
      };

      const result = timelineService.analyzeDivergence(branchA, branchB);

      expect(result).toBeDefined();
      expect(result.firstDivergencePoint).toBe('sp_2');
      expect(result.divergenceReasons.length).toBeGreaterThan(0);
      expect(result.impactAssessment).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE ANALYSIS SERVICE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceAnalysisService', () => {
  let perfService: PerformanceAnalysisService;

  beforeEach(() => {
    perfService = new PerformanceAnalysisService();
  });

  describe('analyzePerformance', () => {
    it('should analyze performance of a trace', () => {
      const trace: Trace = {
        id: 'tr_perf',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_root', {
            id: 'sp_root',
            traceId: 'tr_perf',
            name: 'root-span',
            serviceName: 'sutar-gateway',
            operationType: 'agent_invocation',
            startTime: 1000,
            endTime: 2000,
            duration: 1000,
            status: 'completed',
            tags: { agentId: 'agent_1' },
            logs: [],
          }],
          ['sp_api', {
            id: 'sp_api',
            traceId: 'tr_perf',
            parentSpanId: 'sp_root',
            name: 'external-api',
            serviceName: 'external-service',
            operationType: 'external_call',
            startTime: 1100,
            endTime: 1800,
            duration: 700,
            status: 'completed',
            tags: { external: 'true' },
            logs: [],
          }],
        ]),
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const result = perfService.analyzePerformance(trace);

      expect(result).toBeDefined();
      expect(result.totalDuration).toBe(1000);
      expect(result.timeBreakdown).toBeDefined();
      expect(result.criticalPath).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.percentileAnalysis).toBeDefined();

      // Check time breakdown
      expect(result.timeBreakdown.byService['sutar-gateway']).toBe(1000);
      expect(result.timeBreakdown.externalCalls).toBe(700);

      // Check bottlenecks
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      const apiBottleneck = result.bottlenecks.find(b => b.spanId === 'sp_api');
      expect(apiBottleneck).toBeDefined();
      expect(apiBottleneck!.percentageOfTotal).toBe(70); // 700/1000 = 70%
    });

    it('should identify critical path', () => {
      const trace: Trace = {
        id: 'tr_critical',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_root', {
            id: 'sp_root',
            traceId: 'tr_critical',
            name: 'root',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 0,
            endTime: 1000,
            duration: 1000,
            status: 'completed',
            tags: {},
            logs: [],
          }],
          ['sp_slow', {
            id: 'sp_slow',
            traceId: 'tr_critical',
            parentSpanId: 'sp_root',
            name: 'slow-operation',
            serviceName: 'service',
            operationType: 'database_query',
            startTime: 100,
            endTime: 900,
            duration: 800,
            status: 'completed',
            tags: {},
            logs: [],
          }],
          ['sp_fast', {
            id: 'sp_fast',
            traceId: 'tr_critical',
            parentSpanId: 'sp_root',
            name: 'fast-operation',
            serviceName: 'service',
            operationType: 'cache_operation',
            startTime: 100,
            endTime: 200,
            duration: 100,
            status: 'completed',
            tags: {},
            logs: [],
          }],
        ]),
        startTime: 0,
        endTime: 1000,
        duration: 1000,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const result = perfService.analyzePerformance(trace);

      expect(result.criticalPath).toContain('sp_slow');
      expect(result.criticalPath).not.toContain('sp_fast');
    });

    it('should generate optimization suggestions', () => {
      const trace: Trace = {
        id: 'tr_optimize',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_root', {
            id: 'sp_root',
            traceId: 'tr_optimize',
            name: 'root',
            serviceName: 'service',
            operationType: 'agent_invocation',
            startTime: 0,
            endTime: 2000,
            duration: 2000,
            status: 'completed',
            tags: {},
            logs: [],
          }],
          ['sp_db', {
            id: 'sp_db',
            traceId: 'tr_optimize',
            parentSpanId: 'sp_root',
            name: 'database-query',
            serviceName: 'db-service',
            operationType: 'database_query',
            startTime: 100,
            endTime: 1100,
            duration: 1000,
            status: 'completed',
            tags: {},
            logs: [],
          }],
          ['sp_retry', {
            id: 'sp_retry',
            traceId: 'tr_optimize',
            parentSpanId: 'sp_root',
            name: 'api-call',
            serviceName: 'api-service',
            operationType: 'external_call',
            startTime: 1200,
            endTime: 1900,
            duration: 700,
            status: 'completed',
            tags: { external: 'true' },
            logs: [],
            errors: [{ timestamp: 1300, message: 'Connection timeout' }],
          }],
        ]),
        startTime: 0,
        endTime: 2000,
        duration: 2000,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const result = perfService.analyzePerformance(trace);

      expect(result.optimizationSuggestions.length).toBeGreaterThan(0);

      // Should have caching suggestion for DB
      const cachingSuggestion = result.optimizationSuggestions.find(s => s.type === 'caching');
      expect(cachingSuggestion).toBeDefined();

      // Should have circuit breaker and retry for failed external call
      const circuitBreaker = result.optimizationSuggestions.find(s => s.type === 'circuit_breaker');
      expect(circuitBreaker).toBeDefined();

      const retry = result.optimizationSuggestions.find(s => s.type === 'retry');
      expect(retry).toBeDefined();
    });

    it('should calculate percentiles', () => {
      const trace: Trace = {
        id: 'tr_percentiles',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_1', { id: 'sp_1', traceId: 'tr_percentiles', name: 'span1', serviceName: 'service', operationType: 'agent_invocation', startTime: 0, endTime: 100, duration: 100, status: 'completed', tags: {}, logs: [] }],
          ['sp_2', { id: 'sp_2', traceId: 'tr_percentiles', name: 'span2', serviceName: 'service', operationType: 'agent_invocation', startTime: 100, endTime: 200, duration: 100, status: 'completed', tags: {}, logs: [] }],
          ['sp_3', { id: 'sp_3', traceId: 'tr_percentiles', name: 'span3', serviceName: 'service', operationType: 'agent_invocation', startTime: 200, endTime: 400, duration: 200, status: 'completed', tags: {}, logs: [] }],
          ['sp_4', { id: 'sp_4', traceId: 'tr_percentiles', name: 'span4', serviceName: 'service', operationType: 'agent_invocation', startTime: 400, endTime: 600, duration: 200, status: 'completed', tags: {}, logs: [] }],
          ['sp_5', { id: 'sp_5', traceId: 'tr_percentiles', name: 'span5', serviceName: 'service', operationType: 'agent_invocation', startTime: 600, endTime: 1000, duration: 400, status: 'completed', tags: {}, logs: [] }],
        ]),
        startTime: 0,
        endTime: 1000,
        duration: 1000,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const result = perfService.analyzePerformance(trace);

      expect(result.percentileAnalysis.p50).toBe(200);
      expect(result.percentileAnalysis.p90).toBe(400);
      expect(result.percentileAnalysis.p99).toBe(400);
    });

    it('should compare with baseline', () => {
      const trace: Trace = {
        id: 'tr_baseline',
        rootSpanId: 'sp_root',
        spans: new Map([
          ['sp_1', { id: 'sp_1', traceId: 'tr_baseline', name: 'span1', serviceName: 'service', operationType: 'agent_invocation', startTime: 0, endTime: 500, duration: 500, status: 'completed', tags: {}, logs: [] }],
        ]),
        startTime: 0,
        endTime: 500,
        duration: 500,
        status: 'completed',
        metadata: { tags: [], source: 'sutar' },
      };

      const result = perfService.analyzePerformance(trace, {
        p50: 100,
        p90: 300,
        p95: 400,
        p99: 500,
      });

      expect(result.percentileAnalysis.comparedToBaseline.p50Delta).toBe(400);
      expect(result.percentileAnalysis.comparedToBaseline.p90Delta).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Type Validation', () => {
  it('should accept valid OperationType values', () => {
    const validTypes: OperationType[] = [
      'agent_invocation',
      'decision_evaluation',
      'negotiation_round',
      'contract_creation',
      'contract_signing',
      'payment_processing',
      'economy_transaction',
      'trust_calculation',
      'reputation_update',
      'capability_match',
      'discovery_search',
      'message_delivery',
      'workflow_execution',
      'api_call',
      'database_query',
      'cache_operation',
      'external_call',
    ];

    for (const type of validTypes) {
      const span: Span = {
        id: 'test',
        traceId: 'tr',
        name: 'test',
        serviceName: 'service',
        operationType: type,
        startTime: Date.now(),
        status: 'completed',
        tags: {},
        logs: [],
      };
      expect(span.operationType).toBe(type);
    }
  });

  it('should accept valid SpanStatus values', () => {
    const validStatuses: SpanStatus[] = ['started', 'running', 'completed', 'error', 'cancelled'];

    for (const status of validStatuses) {
      const span: Span = {
        id: 'test',
        traceId: 'tr',
        name: 'test',
        serviceName: 'service',
        operationType: 'agent_invocation',
        startTime: Date.now(),
        status,
        tags: {},
        logs: [],
      };
      expect(span.status).toBe(status);
    }
  });
});