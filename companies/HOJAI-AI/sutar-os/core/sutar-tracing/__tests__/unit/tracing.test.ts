/**
 * SUTAR OS — Tracing Service Tests
 */
import { describe, it, expect } from 'vitest';

describe('Tracing — Trace Lifecycle', () => {
  function startTrace(params) {
    return {
      traceId: params.traceId || 'trace-1',
      serviceName: params.serviceName || 'sutar-os',
      operationName: params.operationName,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      duration: null,
      sampled: params.sampled !== false,
      tags: params.tags || {},
      errorCount: 0,
      spanCount: 0,
    };
  }

  function endTrace(trace, params = {}) {
    const endTime = params.endTime || new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(trace.startTime).getTime();
    return { ...trace, endTime, status: params.status || 'ok', duration };
  }

  it('starts trace with running status', () => {
    const trace = startTrace({ operationName: 'negotiate_contract', serviceName: 'sutar-negotiation' });
    expect(trace.status).toBe('running');
    expect(trace.endTime).toBeNull();
    expect(trace.duration).toBeNull();
  });

  it('ends trace with duration', () => {
    const trace = startTrace({ operationName: 'test' });
    const ended = endTrace(trace);
    expect(ended.status).toBe('ok');
    expect(ended.endTime).not.toBeNull();
    expect(ended.duration).toBeGreaterThanOrEqual(0);
  });

  it('marks trace as error when errors present', () => {
    const trace = startTrace({ operationName: 'test' });
    const ended = endTrace(trace, { status: 'error' });
    expect(ended.status).toBe('error');
  });
});

describe('Tracing — Span Management', () => {
  function addSpan(trace, params) {
    const span = {
      spanId: 'span-' + Math.random().toString(36).slice(2),
      traceId: trace.traceId,
      operationName: params.operationName,
      serviceName: params.serviceName || trace.serviceName,
      startTime: params.startTime || new Date().toISOString(),
      endTime: null,
      duration: null,
      status: 'ok',
      tags: params.tags || {},
      error: params.error || null,
    };
    if (params.error) {
      span.status = 'error';
      span.tags['error'] = true;
    }
    return span;
  }

  it('creates span with tags', () => {
    const trace = { traceId: 'trace-1', serviceName: 'test' };
    const span = addSpan(trace, { operationName: 'http_request', tags: { method: 'POST', status: 200 } });
    expect(span.operationName).toBe('http_request');
    expect(span.tags.method).toBe('POST');
    expect(span.tags.status).toBe(200);
  });

  it('marks error spans', () => {
    const trace = { traceId: 'trace-1', serviceName: 'test' };
    const span = addSpan(trace, { operationName: 'db_query', error: { message: 'connection failed', kind: 'NetworkError' } });
    expect(span.status).toBe('error');
    expect(span.tags.error).toBe(true);
  });
});

describe('Tracing — Replay', () => {
  function replayTrace(trace, spans) {
    return {
      traceId: trace.traceId,
      operationName: trace.operationName,
      totalSteps: spans.length,
      totalDuration: trace.duration,
      status: trace.status,
      steps: spans.map((s, i) => ({
        step: i + 1,
        operation: s.operationName,
        service: s.serviceName,
        status: s.status,
        duration: s.duration,
      })),
      replayedAt: new Date().toISOString(),
    };
  }

  it('replays trace as ordered steps', () => {
    const trace = { traceId: 'trace-1', operationName: 'process_order', duration: 500, status: 'ok' };
    const spans = [
      { operationName: 'validate', serviceName: 'validation', status: 'ok', duration: 10 },
      { operationName: 'price', serviceName: 'pricing', status: 'ok', duration: 50 },
      { operationName: 'reserve', serviceName: 'inventory', status: 'ok', duration: 100 },
    ];
    const replay = replayTrace(trace, spans);
    expect(replay.totalSteps).toBe(3);
    expect(replay.steps[0].operation).toBe('validate');
    expect(replay.steps[1].operation).toBe('price');
    expect(replay.steps[2].operation).toBe('reserve');
  });
});

describe('Tracing — Debug / Critical Path', () => {
  function debugTrace(trace, spans) {
    const sorted = [...spans].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    const criticalPath = sorted.slice(0, 3).map(s => ({ operation: s.operationName, duration: s.duration }));
    const errors = spans.filter(s => s.status === 'error');
    return {
      traceId: trace.traceId,
      summary: {
        status: trace.status,
        totalDuration: trace.duration,
        totalSpans: spans.length,
        errorCount: errors.length,
      },
      criticalPath,
      errors: errors.map(e => ({ operation: e.operationName, error: e.error })),
    };
  }

  it('identifies critical path from longest spans', () => {
    const trace = { traceId: 'trace-1', duration: 1000, status: 'ok' };
    const spans = [
      { operationName: 'fast', duration: 5, status: 'ok' },
      { operationName: 'slow_db', duration: 400, status: 'ok' },
      { operationName: 'cache', duration: 20, status: 'ok' },
      { operationName: 'slow_api', duration: 500, status: 'ok' },
    ];
    const debug = debugTrace(trace, spans);
    expect(debug.criticalPath[0].operation).toBe('slow_api');
    expect(debug.criticalPath[1].operation).toBe('slow_db');
  });

  it('collects error spans', () => {
    const trace = { traceId: 'trace-1', duration: 500, status: 'error' };
    const spans = [
      { operationName: 'ok_step', status: 'ok' },
      { operationName: 'failed_step', status: 'error', error: { message: 'timeout' } },
    ];
    const debug = debugTrace(trace, spans);
    expect(debug.errors).toHaveLength(1);
    expect(debug.errors[0].error.message).toBe('timeout');
  });
});

describe('Tracing — Metrics', () => {
  function computeMetrics(traces) {
    const completed = traces.filter(t => t.status !== 'running');
    const errors = completed.filter(t => t.status === 'error');
    const durations = completed.map(t => t.duration).filter(Boolean).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    return {
      completedTraces: completed.length,
      errorTraces: errors.length,
      errorRate: completed.length > 0 ? (errors.length / completed.length * 100).toFixed(2) + '%' : '0%',
      latency: { p50, p95, p99 },
    };
  }

  it('calculates error rate', () => {
    const traces = [
      { status: 'ok', duration: 100 },
      { status: 'ok', duration: 200 },
      { status: 'error', duration: 50 },
      { status: 'ok', duration: 150 },
    ];
    const m = computeMetrics(traces);
    expect(m.errorRate).toBe('25.00%');
  });

  it('calculates latency percentiles', () => {
    const traces = Array.from({ length: 100 }, (_, i) => ({ status: 'ok', duration: (i + 1) * 10 }));
    const m = computeMetrics(traces);
    expect(m.latency.p50).toBe(510);  // index 50 = element 51 = (50+1)*10
    expect(m.latency.p95).toBe(960);  // index 95 = element 96 = (95+1)*10
    expect(m.latency.p99).toBe(1000); // index 99 = element 100 = (99+1)*10
  });

  it('returns zero latency when no completed traces', () => {
    const traces = [{ status: 'running', duration: null }];
    const m = computeMetrics(traces);
    expect(m.latency.p50).toBe(0);
    expect(m.errorRate).toBe('0%');
  });
});