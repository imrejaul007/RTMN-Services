/**
 * Decision Replay System - Timeline Service
 * Generates visual timelines for traces with time-travel debugging
 */

import {
  Trace,
  Span,
  TimelineEvent,
  TimelineRequest,
  BranchComparison,
  BranchPoint,
  Branch,
  DivergenceAnalysis,
  Bottleneck,
  PerformanceAnalysis,
  TimeBreakdown,
  PercentileAnalysis,
  OptimizationSuggestion,
} from '../types/index.js';

export class TimelineService {
  /**
   * Generate a visual timeline from a trace
   */
  generateTimeline(trace: Trace, options?: {
    startTime?: number;
    endTime?: number;
    depth?: number;
  }): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const spans = Array.from(trace.spans.values());

    // Sort spans by start time
    spans.sort((a, b) => a.startTime - b.startTime);

    // Build span depth map (parent-child relationships)
    const spanDepths = this.calculateSpanDepths(spans);

    // Track branch points (spans with multiple children)
    const spanChildren = this.buildSpanChildren(spans);

    for (const span of spans) {
      // Apply time filters
      if (options?.startTime && span.startTime < options.startTime) continue;
      if (options?.endTime && span.endTime && span.endTime > options.endTime) continue;

      const depth = spanDepths.get(span.id) || 0;

      // Apply depth filter
      if (options?.depth && depth > options.depth) continue;

      // Add span start event
      events.push({
        id: `start-${span.id}`,
        spanId: span.id,
        timestamp: span.startTime,
        type: 'span_start',
        title: `Start: ${span.name}`,
        description: `${span.serviceName} - ${span.operationType}`,
        status: 'info',
        depth,
      });

      // Add logs as events
      for (const log of span.logs) {
        events.push({
          id: `log-${span.id}-${log.timestamp}`,
          spanId: span.id,
          timestamp: log.timestamp,
          type: 'log',
          title: `[${log.level.toUpperCase()}] ${log.message}`,
          description: log.fields ? JSON.stringify(log.fields) : undefined,
          status: log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info',
          depth: depth + 1,
        });
      }

      // Add error events
      if (span.errors && span.errors.length > 0) {
        for (const error of span.errors) {
          events.push({
            id: `error-${span.id}-${error.timestamp}`,
            spanId: span.id,
            timestamp: error.timestamp,
            type: 'span_error',
            title: `Error: ${error.message}`,
            description: error.code ? `Code: ${error.code}` : undefined,
            status: 'error',
            depth: depth + 1,
          });
        }
      }

      // Add span end event
      if (span.endTime) {
        events.push({
          id: `end-${span.id}`,
          spanId: span.id,
          timestamp: span.endTime,
          type: 'span_end',
          title: `End: ${span.name}`,
          description: `Duration: ${span.duration || 0}ms`,
          duration: span.duration,
          status: span.status === 'error' ? 'error' : span.status === 'completed' ? 'success' : 'info',
          depth,
        });
      }

      // Check for branch point (span with multiple children)
      const children = spanChildren.get(span.id);
      if (children && children.length > 1) {
        events.push({
          id: `branch-${span.id}`,
          spanId: span.id,
          timestamp: span.startTime,
          type: 'branch_point',
          title: `Branch Point: ${span.name}`,
          description: `${children.length} alternative paths`,
          status: 'info',
          depth: depth + 1,
        });
      }
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Build hierarchy
    return this.buildEventHierarchy(events, spans);
  }

  /**
   * Calculate the depth of each span based on parent relationships
   */
  private calculateSpanDepths(spans: Span[]): Map<string, number> {
    const depths = new Map<string, number>();
    const spanMap = new Map<string, Span>();

    for (const span of spans) {
      spanMap.set(span.id, span);
    }

    for (const span of spans) {
      let depth = 0;
      let current: Span | undefined = span;

      while (current && current.parentSpanId) {
        depth++;
        current = spanMap.get(current.parentSpanId);
        if (depth > 100) break; // Prevent infinite loops
      }

      depths.set(span.id, depth);
    }

    return depths;
  }

  /**
   * Build a map of parent span to child spans
   */
  private buildSpanChildren(spans: Span[]): Map<string, string[]> {
    const children = new Map<string, string[]>();

    for (const span of spans) {
      if (span.parentSpanId) {
        if (!children.has(span.parentSpanId)) {
          children.set(span.parentSpanId, []);
        }
        children.get(span.parentSpanId)!.push(span.id);
      }
    }

    return children;
  }

  /**
   * Build a hierarchical event structure
   */
  private buildEventHierarchy(events: TimelineEvent[], spans: Span[]): TimelineEvent[] {
    // For now, return flat list sorted by time
    // In production, this would build a proper tree structure
    return events;
  }

  /**
   * Compare two branches of execution
   */
  compareBranches(
    branchA: Branch,
    branchB: Branch,
    branchPoint: BranchPoint
  ): {
    durationDelta: number;
    costDelta: number;
    pathDiff: string[];
    divergencePoints: string[];
    recommendations: string[];
  } {
    const pathSetA = new Set(branchA.path);
    const pathSetB = new Set(branchB.path);
    const allPaths = [...new Set([...pathSetA, ...pathSetB])];

    const pathDiff: string[] = [];
    const divergencePoints: string[] = [];
    const recommendations: string[] = [];

    for (const p of allPaths) {
      const inA = pathSetA.has(p);
      const inB = pathSetB.has(p);
      if (inA !== inB) {
        pathDiff.push(p);
        divergencePoints.push(p);
      }
    }

    const durationDelta = (branchB.duration || 0) - (branchA.duration || 0);
    const costDelta = (branchB.cost || 0) - (branchA.cost || 0);

    // Generate recommendations
    if (durationDelta > 100) {
      recommendations.push(`Branch B is ${durationDelta}ms slower - consider optimizing ${pathDiff[0] || 'the divergent path'}`);
    }
    if (costDelta > 10) {
      recommendations.push(`Branch B costs ${costDelta} more - review cost drivers in ${pathDiff[0] || 'divergent operations'}`);
    }
    if (pathDiff.length > 5) {
      recommendations.push(`High path divergence (${pathDiff.length} steps) - consider simplifying logic flow`);
    }

    return {
      durationDelta,
      costDelta,
      pathDiff,
      divergencePoints,
      recommendations,
    };
  }

  /**
   * Analyze divergence between branches
   */
  analyzeDivergence(branchA: Branch, branchB: Branch): DivergenceAnalysis {
    const spansA = new Map(branchA.spans.map(s => [s.id, s]));
    const spansB = new Map(branchB.spans.map(s => [s.id, s]));

    let firstDivergencePoint = '';
    const divergenceReasons: string[] = [];
    let totalCostImpact = 0;
    let totalTimeImpact = 0;
    let totalQualityImpact = 0;

    // Find first divergence
    for (const spanId of branchA.path) {
      if (!spansB.has(spanId)) {
        firstDivergencePoint = spanId;
        break;
      }
    }

    // Analyze each divergence
    for (const spanId of [...new Set([...branchA.path, ...branchB.path])]) {
      const spanA = spansA.get(spanId);
      const spanB = spansB.get(spanId);

      if (spanA && !spanB) {
        divergenceReasons.push(`${spanA.name} executed only in branch A`);
        totalTimeImpact += spanA.duration || 0;
      } else if (!spanA && spanB) {
        divergenceReasons.push(`${spanB.name} executed only in branch B`);
        totalTimeImpact += spanB.duration || 0;
      } else if (spanA && spanB) {
        const timeDiff = Math.abs((spanA.duration || 0) - (spanB.duration || 0));
        if (timeDiff > 10) {
          divergenceReasons.push(`${spanA.name} has ${timeDiff}ms time difference between branches`);
        }
      }
    }

    return {
      firstDivergencePoint,
      divergenceReasons,
      impactAssessment: {
        costImpact: totalCostImpact,
        timeImpact: totalTimeImpact,
        qualityImpact: totalQualityImpact,
      },
      recommendations: this.generateDivergenceRecommendations(divergenceReasons),
    };
  }

  private generateDivergenceRecommendations(reasons: string[]): string[] {
    const recommendations: string[] = [];

    if (reasons.some(r => r.includes('time difference'))) {
      recommendations.push('Review timing variations - consider caching or async processing');
    }
    if (reasons.some(r => r.includes('executed only'))) {
      recommendations.push('Consolidate conditional logic to reduce path complexity');
    }
    if (reasons.length > 5) {
      recommendations.push('High divergence count suggests complex branching - consider refactoring');
    }

    return recommendations;
  }
}

/**
 * Performance Analysis Service
 */
export class PerformanceAnalysisService {
  /**
   * Perform comprehensive performance analysis on a trace
   */
  analyzePerformance(trace: Trace, baseline?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }): PerformanceAnalysis {
    const spans = Array.from(trace.spans.values());

    // Calculate total duration
    const totalDuration = trace.endTime
      ? trace.endTime - trace.startTime
      : spans.reduce((max, s) => Math.max(max, (s.endTime || 0) - s.startTime), 0);

    // Time breakdown
    const timeBreakdown = this.calculateTimeBreakdown(spans, totalDuration);

    // Critical path
    const criticalPath = this.identifyCriticalPath(spans);

    // Bottlenecks
    const bottlenecks = this.identifyBottlenecks(spans, totalDuration);

    // Optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(bottlenecks, spans);

    // Percentile analysis
    const percentileAnalysis = this.calculatePercentiles(spans, baseline);

    return {
      totalDuration,
      timeBreakdown,
      criticalPath,
      bottlenecks,
      optimizationSuggestions,
      percentileAnalysis,
    };
  }

  private calculateTimeBreakdown(spans: Span[], totalDuration: number): TimeBreakdown {
    const byService: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let waiting = 0;
    let processing = 0;
    let externalCalls = 0;

    for (const span of spans) {
      const duration = span.duration || 0;

      // Group by service
      byService[span.serviceName] = (byService[span.serviceName] || 0) + duration;

      // Group by operation
      byOperation[span.operationType] = (byOperation[span.operationType] || 0) + duration;

      // Group by agent (from tags)
      const agentId = span.tags.agentId as string | undefined;
      if (agentId) {
        byAgent[agentId] = (byAgent[agentId] || 0) + duration;
      }

      // Categorize
      if (span.tags.isWaiting === 'true' || span.tags.isWaiting === true) {
        waiting += duration;
      } else if (span.operationType.includes('external') || span.tags.external === 'true') {
        externalCalls += duration;
      } else {
        processing += duration;
      }
    }

    return {
      byService,
      byOperation,
      byAgent,
      waiting,
      processing,
      externalCalls,
    };
  }

  private identifyCriticalPath(spans: Span[]): string[] {
    if (spans.length === 0) return [];

    // Build parent-child relationships
    const children = new Map<string, Span[]>();
    const spanMap = new Map<string, Span>();

    for (const span of spans) {
      spanMap.set(span.id, span);
      if (span.parentSpanId) {
        if (!children.has(span.parentSpanId)) {
          children.set(span.parentSpanId, []);
        }
        children.get(span.parentSpanId)!.push(span);
      }
    }

    // Find root spans (no parent)
    const roots = spans.filter(s => !s.parentSpanId);

    // Find the longest path
    function findLongestPath(spanId: string, visited: Set<string> = new Set()): { path: string[]; duration: number } {
      if (visited.has(spanId)) return { path: [spanId], duration: 0 };
      visited.add(spanId);

      const span = spanMap.get(spanId);
      if (!span) return { path: [spanId], duration: 0 };

      const spanChildren = children.get(spanId) || [];
      if (spanChildren.length === 0) {
        return { path: [spanId], duration: span.duration || 0 };
      }

      let longest = { path: [spanId], duration: 0 };
      for (const child of spanChildren) {
        const result = findLongestPath(child.id, new Set(visited));
        const totalDuration = (span.duration || 0) + result.duration;
        if (totalDuration > longest.duration) {
          longest = { path: [spanId, ...result.path], duration: totalDuration };
        }
      }

      return longest;
    }

    let criticalPath: string[] = [];
    let maxDuration = 0;

    for (const root of roots) {
      const result = findLongestPath(root.id);
      if (result.duration > maxDuration) {
        maxDuration = result.duration;
        criticalPath = result.path;
      }
    }

    return criticalPath;
  }

  private identifyBottlenecks(spans: Span[], totalDuration: number): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const MIN_BOTTLENECK_PERCENTAGE = 5; // 5% of total duration

    for (const span of spans) {
      const duration = span.duration || 0;
      const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

      if (percentage >= MIN_BOTTLENECK_PERCENTAGE) {
        const causes: string[] = [];

        if (span.operationType === 'external_call') {
          causes.push('External API call - network latency');
        }
        if (span.operationType === 'database_query') {
          causes.push('Database operation - possible slow query');
        }
        if (span.logs.some(l => l.level === 'warn')) {
          causes.push('Warning logs present - review for issues');
        }
        if (span.errors && span.errors.length > 0) {
          causes.push('Errors occurred - may have caused delays');
        }

        bottlenecks.push({
          spanId: span.id,
          location: `${span.serviceName}:${span.name}`,
          duration,
          percentageOfTotal: percentage,
          causes,
          estimatedSavings: Math.floor(duration * 0.3), // Assume 30% potential savings
        });
      }
    }

    // Sort by duration descending
    bottlenecks.sort((a, b) => b.duration - a.duration);

    return bottlenecks;
  }

  private generateOptimizationSuggestions(bottlenecks: Bottleneck[], spans: Span[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const spanMap = new Map(spans.map(s => [s.id, s]));

    for (const bottleneck of bottlenecks) {
      const span = spanMap.get(bottleneck.spanId);
      if (!span) continue;

      // Check if can be parallelized
      const hasParallelChildren = spans.some(
        s => s.parentSpanId === span.id &&
          spans.filter(x => x.parentSpanId === span.id).length > 1
      );

      if (hasParallelChildren && bottleneck.causes.some(c => c.includes('waiting'))) {
        suggestions.push({
          type: 'parallelization',
          targetSpanId: span.id,
          description: `Parallelize operations under "${span.name}" to reduce waiting time`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.4),
          implementationComplexity: 'medium',
        });
      }

      // Check for caching opportunities
      if (span.operationType === 'database_query' || span.operationType === 'api_call') {
        suggestions.push({
          type: 'caching',
          targetSpanId: span.id,
          description: `Cache results of "${span.name}" to avoid repeated calls`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.5),
          implementationComplexity: 'low',
        });
      }

      // Check for batching opportunities
      if (span.operationType === 'api_call' && bottleneck.duration > 100) {
        suggestions.push({
          type: 'batching',
          targetSpanId: span.id,
          description: `Batch multiple "${span.name}" calls into a single request`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.6),
          implementationComplexity: 'medium',
        });
      }

      // Check for retry/circuit breaker needs
      if (span.errors && span.errors.length > 0) {
        suggestions.push({
          type: 'circuit_breaker',
          targetSpanId: span.id,
          description: `Add circuit breaker for "${span.name}" to fail fast on repeated errors`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.2),
          implementationComplexity: 'medium',
        });

        suggestions.push({
          type: 'retry',
          targetSpanId: span.id,
          description: `Implement exponential backoff retry for "${span.name}"`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.1),
          implementationComplexity: 'low',
        });
      }

      // Check timeout settings
      if (bottleneck.duration > 500 && span.operationType === 'external_call') {
        suggestions.push({
          type: 'timeout',
          targetSpanId: span.id,
          description: `Review and adjust timeout for "${span.name}" - current duration ${bottleneck.duration}ms may indicate timeout issues`,
          estimatedImprovement: Math.floor(bottleneck.duration * 0.15),
          implementationComplexity: 'low',
        });
      }
    }

    return suggestions;
  }

  private calculatePercentiles(
    spans: Span[],
    baseline?: { p50: number; p90: number; p95: number; p99: number }
  ): PercentileAnalysis {
    const durations = spans.map(s => s.duration || 0).filter(d => d > 0);
    const sorted = [...durations].sort((a, b) => a - b);

    const p50 = this.percentile(sorted, 50);
    const p90 = this.percentile(sorted, 90);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    const comparedToBaseline = baseline ? {
      p50Delta: p50 - baseline.p50,
      p90Delta: p90 - baseline.p90,
      p95Delta: p95 - baseline.p95,
      p99Delta: p99 - baseline.p99,
    } : {
      p50Delta: 0,
      p90Delta: 0,
      p95Delta: 0,
      p99Delta: 0,
    };

    return {
      p50,
      p90,
      p95,
      p99,
      comparedToBaseline,
    };
  }

  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const idx = Math.max(0, Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length)));
    return sortedArr[idx];
  }
}

// Singleton instances
let timelineService: TimelineService | null = null;
let performanceService: PerformanceAnalysisService | null = null;

export function getTimelineService(): TimelineService {
  if (!timelineService) {
    timelineService = new TimelineService();
  }
  return timelineService;
}

export function getPerformanceAnalysisService(): PerformanceAnalysisService {
  if (!performanceService) {
    performanceService = new PerformanceAnalysisService();
  }
  return performanceService;
}
