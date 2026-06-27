/**
 * Decision Replay System - Routes
 * Express routes for recording, querying, and exporting traces
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  RecordDecisionRequest,
  EndSpanRequest,
  TimelineRequest,
  ExportRequest,
  TraceQuery,
  Span,
  Trace,
  SpanStatus,
  OperationType,
} from '../types/index.js';
import { getTraceStorageService } from '../services/traceStorage.js';
import { getTimelineService, getPerformanceAnalysisService } from '../services/timelineService.js';

const router = Router();
const storage = getTraceStorageService();
const timelineSvc = getTimelineService();
const performanceSvc = getPerformanceAnalysisService();

// In-memory active spans (for recording)
const activeSpans = new Map<string, Span>();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
}

function getActiveSpan(spanId: string, traceId: string): Span | null {
  const key = `${traceId}:${spanId}`;
  return activeSpans.get(key) || null;
}

function setActiveSpan(span: Span): void {
  const key = `${span.traceId}:${span.id}`;
  activeSpans.set(key, span);
}

function removeActiveSpan(spanId: string, traceId: string): void {
  const key = `${traceId}:${spanId}`;
  activeSpans.delete(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/replay/record
 * Record a new decision event / start a span
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const body = req.body as RecordDecisionRequest;

    // Validate required fields
    if (!body.operationType || !body.serviceName || !body.name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['operationType', 'serviceName', 'name'],
      });
    }

    const traceId = body.traceId || generateId('tr');
    const spanId = generateId('sp');
    const parentSpanId = body.parentSpanId;
    const startTime = Date.now();

    const span: Span = {
      id: spanId,
      traceId,
      parentSpanId,
      name: body.name,
      serviceName: body.serviceName,
      operationType: body.operationType,
      startTime,
      status: 'started',
      tags: body.tags || {},
      logs: [],
      errors: [],
      metadata: body.metadata || {},
    };

    // Store in active spans
    setActiveSpan(span);

    // If this is the first span, create the trace
    if (!body.traceId) {
      const trace: Trace = {
        id: traceId,
        rootSpanId: spanId,
        spans: new Map([[spanId, span]]),
        startTime,
        status: 'running',
        metadata: {
          tags: [],
          source: 'sutar',
        },
      };

      // Extract metadata from span
      if (span.tags.agentId) {
        trace.metadata.agentId = span.tags.agentId as string;
      }
      if (span.tags.decisionId) {
        trace.metadata.decisionId = span.tags.decisionId as string;
      }
      if (span.tags.negotiationId) {
        trace.metadata.negotiationId = span.tags.negotiationId as string;
      }
      if (span.tags.contractId) {
        trace.metadata.contractId = span.tags.contractId as string;
      }
      if (span.tags.transactionId) {
        trace.metadata.transactionId = span.tags.transactionId as string;
      }
      if (span.tags.industryVertical) {
        trace.metadata.industryVertical = span.tags.industryVertical as string;
      }
      if (span.tags.useCase) {
        trace.metadata.useCase = span.tags.useCase as string;
      }

      await storage.saveTrace(trace);
    } else {
      // Add span to existing trace
      await storage.saveSpan(span);
    }

    res.status(201).json({
      spanId,
      traceId,
      parentSpanId,
      startTime,
    } as RecordDecisionResponse);
  } catch (error) {
    console.error('Error recording decision:', error);
    res.status(500).json({ error: 'Failed to record decision', details: String(error) });
  }
});

/**
 * PUT /api/replay/:traceId/:spanId
 * Update/continue a span (add logs, tags)
 */
router.put('/:traceId/:spanId', async (req: Request, res: Response) => {
  try {
    const { traceId, spanId } = req.params;
    const { tags, logs, errors, status } = req.body;

    let span = getActiveSpan(spanId, traceId);

    // If not in active spans, try to get from storage
    if (!span) {
      const spans = await storage.getSpansByTraceId(traceId);
      span = spans.find(s => s.id === spanId) || null;
    }

    if (!span) {
      return res.status(404).json({ error: 'Span not found' });
    }

    // Update span
    if (tags) {
      span.tags = { ...span.tags, ...tags };
    }
    if (logs && Array.isArray(logs)) {
      span.logs.push(...logs);
    }
    if (errors && Array.isArray(errors)) {
      span.errors?.push(...errors);
    }
    if (status) {
      span.status = status as SpanStatus;
    }

    setActiveSpan(span);
    await storage.updateSpan(spanId, { tags: span.tags, logs: span.logs, errors: span.errors, status: span.status });

    res.json({ success: true, span });
  } catch (error) {
    console.error('Error updating span:', error);
    res.status(500).json({ error: 'Failed to update span', details: String(error) });
  }
});

/**
 * POST /api/replay/:traceId/:spanId/end
 * End a span
 */
router.post('/:traceId/:spanId/end', async (req: Request, res: Response) => {
  try {
    const { traceId, spanId } = req.params;
    const body = req.body as Partial<EndSpanRequest>;

    let span = getActiveSpan(spanId, traceId);

    if (!span) {
      const spans = await storage.getSpansByTraceId(traceId);
      span = spans.find(s => s.id === spanId) || null;
    }

    if (!span) {
      return res.status(404).json({ error: 'Span not found' });
    }

    // End the span
    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = body.status || (span.errors?.length ? 'error' : 'completed');

    if (body.tags) {
      span.tags = { ...span.tags, ...body.tags };
    }
    if (body.logs) {
      span.logs.push(...body.logs);
    }
    if (body.errors) {
      span.errors?.push(...body.errors);
    }

    // Remove from active spans
    removeActiveSpan(spanId, traceId);

    // Update in storage
    await storage.updateSpan(spanId, {
      endTime: span.endTime,
      duration: span.duration,
      status: span.status,
      tags: span.tags,
      logs: span.logs,
      errors: span.errors,
    });

    // Check if all spans are completed
    const allSpans = await storage.getSpansByTraceId(traceId);
    const runningSpans = allSpans.filter(s => s.status === 'running' || s.status === 'started');
    if (runningSpans.length === 0) {
      // Update trace status
      const trace = await storage.getTrace(traceId);
      if (trace) {
        trace.status = allSpans.some(s => s.status === 'error') ? 'error' : 'completed';
        trace.endTime = Math.max(...allSpans.map(s => s.endTime || 0));
        trace.duration = trace.endTime - trace.startTime;
        await storage.saveTrace(trace);
      }
    }

    res.json({
      success: true,
      span: {
        id: span.id,
        traceId: span.traceId,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        status: span.status,
      },
    });
  } catch (error) {
    console.error('Error ending span:', error);
    res.status(500).json({ error: 'Failed to end span', details: String(error) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/replay/:traceId
 * Get full trace with all spans
 */
router.get('/:traceId', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;

    const trace = await storage.getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const spans = await storage.getSpansByTraceId(traceId);

    res.json({
      traceId: trace.id,
      rootSpanId: trace.rootSpanId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.duration,
      status: trace.status,
      metadata: trace.metadata,
      spanCount: spans.length,
      errorCount: spans.filter(s => s.status === 'error').length,
      spans: spans.map(s => ({
        id: s.id,
        parentSpanId: s.parentSpanId,
        name: s.name,
        serviceName: s.serviceName,
        operationType: s.operationType,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        status: s.status,
        tags: s.tags,
        logCount: s.logs.length,
        errorCount: s.errors?.length || 0,
      })),
    });
  } catch (error) {
    console.error('Error getting trace:', error);
    res.status(500).json({ error: 'Failed to get trace', details: String(error) });
  }
});

/**
 * GET /api/replay/:traceId/timeline
 * Get visual timeline for a trace
 */
router.get('/:traceId/timeline', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const { startTime, endTime, depth, includeSpans } = req.query as Record<string, string>;

    const trace = await storage.getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const options: {
      startTime?: number;
      endTime?: number;
      depth?: number;
    } = {};

    if (startTime) options.startTime = parseInt(startTime, 10);
    if (endTime) options.endTime = parseInt(endTime, 10);
    if (depth) options.depth = parseInt(depth, 10);

    const timeline = timelineSvc.generateTimeline(trace, options);

    // Get spans if requested
    let spans: Span[] | undefined;
    if (includeSpans === 'true') {
      spans = await storage.getSpansByTraceId(traceId);
    }

    res.json({
      traceId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.duration,
      eventCount: timeline.length,
      timeline,
      spans,
    });
  } catch (error) {
    console.error('Error generating timeline:', error);
    res.status(500).json({ error: 'Failed to generate timeline', details: String(error) });
  }
});

/**
 * GET /api/replay/:traceId/performance
 * Get performance analysis for a trace
 */
router.get('/:traceId/performance', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;

    const trace = await storage.getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const spans = await storage.getSpansByTraceId(traceId);
    for (const span of spans) {
      trace.spans.set(span.id, span);
    }

    const performance = performanceSvc.analyzePerformance(trace);

    res.json({
      traceId,
      ...performance,
    });
  } catch (error) {
    console.error('Error analyzing performance:', error);
    res.status(500).json({ error: 'Failed to analyze performance', details: String(error) });
  }
});

/**
 * GET /api/replay
 * List traces with filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      traceId,
      serviceName,
      operationType,
      status,
      startTime,
      endTime,
      durationMin,
      durationMax,
      agentId,
      decisionId,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query as Record<string, string>;

    const query: TraceQuery = {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    if (traceId) query.traceId = traceId;
    if (serviceName) query.serviceName = serviceName;
    if (operationType) query.operationType = operationType as OperationType;
    if (status) query.status = status as any;
    if (startTime) query.startTime = parseInt(startTime, 10);
    if (endTime) query.endTime = parseInt(endTime, 10);
    if (durationMin) query.durationMin = parseInt(durationMin, 10);
    if (durationMax) query.durationMax = parseInt(durationMax, 10);
    if (agentId) query.agentId = agentId;
    if (decisionId) query.decisionId = decisionId;
    if (sortBy) query.sortBy = sortBy as any;
    if (sortOrder) query.sortOrder = sortOrder as any;

    const result = await storage.queryTraces(query);

    res.json(result);
  } catch (error) {
    console.error('Error listing traces:', error);
    res.status(500).json({ error: 'Failed to list traces', details: String(error) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/replay/:traceId/export
 * Export trace data in various formats
 */
router.post('/:traceId/export', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const {
      format = 'json',
      includeSpans = true,
      includeMetrics = false,
      includeTimeline = false,
    } = req.body as ExportRequest;

    const trace = await storage.getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const spans = includeSpans ? await storage.getSpansByTraceId(traceId) : [];
    let timeline: any[] | undefined;
    let performance: any;

    if (includeTimeline) {
      timeline = timelineSvc.generateTimeline(trace);
    }

    if (includeMetrics) {
      const spansForPerf = includeSpans ? spans : [];
      for (const span of spansForPerf) {
        trace.spans.set(span.id, span);
      }
      performance = performanceSvc.analyzePerformance(trace);
    }

    const exportData: Record<string, unknown> = {
      traceId: trace.id,
      exportedAt: new Date().toISOString(),
      format,
      summary: {
        rootSpanId: trace.rootSpanId,
        startTime: trace.startTime,
        endTime: trace.endTime,
        duration: trace.duration,
        status: trace.status,
        spanCount: spans.length,
      },
      metadata: trace.metadata,
    };

    if (includeSpans) {
      exportData.spans = spans;
    }
    if (timeline) {
      exportData.timeline = timeline;
    }
    if (performance) {
      exportData.performance = performance;
    }

    // Generate export ID
    const exportId = generateId('exp');

    // Store export data (in production, this would be stored in file storage/S3)
    const exports: Record<string, unknown> = {};
    exports[exportId] = {
      data: format === 'json' ? JSON.stringify(exportData) : exportData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    // For JSON, return directly; for others, return metadata
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="trace-${traceId}.json"`);
      return res.json(exportData);
    }

    res.json({
      exportId,
      traceId,
      format,
      downloadUrl: `/api/replay/exports/${exportId}`,
      expiresAt: exports[exportId].expiresAt,
      size: JSON.stringify(exportData).length,
    });
  } catch (error) {
    console.error('Error exporting trace:', error);
    res.status(500).json({ error: 'Failed to export trace', details: String(error) });
  }
});

/**
 * GET /api/replay/exports/:exportId
 * Download an exported trace
 */
router.get('/exports/:exportId', async (req: Request, res: Response) => {
  // In production, retrieve from storage
  res.status(501).json({ error: 'Export download not implemented - use format=json for direct download' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/replay/analytics
 * Get trace analytics
 */
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.query as Record<string, string>;

    const analytics = await storage.getTraceAnalytics(
      startTime ? parseInt(startTime, 10) : undefined,
      endTime ? parseInt(endTime, 10) : undefined
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics', details: String(error) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

export function registerReplayRoutes(app: Router): void {
  app.use('/api/replay', router);
}
