import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

const TRACE_STATUS = {
  OK: 'ok',
  ERROR: 'error',
  TIMEOUT: 'timeout',
};

const createObservabilityEngine = () => {
  const traces = new Map();
  const spans = new Map();
  const metrics = new Map();
  const alerts = [];
  const dashboards = new Map();

  const createTrace = (workflowId, options = {}) => {
    const traceId = crypto.randomUUID();
    const now = Date.now();
    const trace = {
      id: traceId,
      workflowId,
      instanceId: options.instanceId,
      status: TRACE_STATUS.OK,
      startTime: now,
      endTime: null,
      duration: 0,
      rootSpanId: null,
      spans: [],
      tags: options.tags || {},
      metadata: options.metadata || {},
    };
    traces.set(traceId, trace);
    return trace;
  };

  const createSpan = (traceId, options = {}) => {
    const spanId = crypto.randomUUID();
    const now = Date.now();
    const trace = traces.get(traceId);
    if (!trace) throw new Error('Trace not found');

    const span = {
      id: spanId,
      traceId,
      parentId: options.parentId || null,
      name: options.name || 'unnamed',
      service: options.service || 'unknown',
      startTime: now,
      endTime: null,
      duration: 0,
      status: TRACE_STATUS.OK,
      tags: options.tags || {},
      children: [],
    };
    spans.set(spanId, span);
    if (!trace.rootSpanId) trace.rootSpanId = spanId;
    trace.spans.push(spanId);
    traces.set(traceId, trace);
    return span;
  };

  const completeSpan = (spanId, options = {}) => {
    const span = spans.get(spanId);
    if (!span) throw new Error('Span not found');
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    if (options.status) span.status = options.status;
    if (options.error) span.error = options.error;
    spans.set(spanId, span);
    return span;
  };

  const completeTrace = (traceId, options = {}) => {
    const trace = traces.get(traceId);
    if (!trace) throw new Error('Trace not found');
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    if (options.status) trace.status = options.status;
    traces.set(traceId, trace);
    return trace;
  };

  const recordMetric = (key, value) => {
    if (!metrics.has(key)) {
      metrics.set(key, { key, count: 0, sum: 0, min: Infinity, max: -Infinity, avg: 0 });
    }
    const m = metrics.get(key);
    m.count++;
    m.sum += value;
    m.avg = m.sum / m.count;
    m.min = Math.min(m.min, value);
    m.max = Math.max(m.max, value);
    metrics.set(key, m);
  };

  const getMetrics = (filter = {}) => {
    let result = Array.from(metrics.values());
    if (filter.prefix) result = result.filter(m => m.key.startsWith(filter.prefix));
    return result;
  };

  const createAlert = (alertData) => {
    const alert = { id: crypto.randomUUID(), ...alertData, status: 'active', createdAt: Date.now() };
    alerts.push(alert);
    return alert;
  };

  const getAlerts = (options = {}) => {
    let result = [...alerts];
    if (options.status) result = result.filter(a => a.status === options.status);
    return result;
  };

  const resolveAlert = (alertId) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    return alert;
  };

  const createDashboard = (config) => {
    const dashboard = {
      id: crypto.randomUUID(),
      name: config.name || 'Unnamed',
      widgets: config.widgets || [],
      createdAt: Date.now(),
    };
    dashboards.set(dashboard.id, dashboard);
    return dashboard;
  };

  const getDashboard = (id) => dashboards.get(id) || null;

  const getTrace = (id) => traces.get(id) || null;

  const queryTraces = (options = {}) => {
    let result = Array.from(traces.values());
    if (options.workflowId) result = result.filter(t => t.workflowId === options.workflowId);
    if (options.status) result = result.filter(t => t.status === options.status);
    if (options.limit) result = result.slice(-options.limit);
    return result.sort((a, b) => b.startTime - a.startTime);
  };

  return {
    createTrace, createSpan, completeSpan, completeTrace,
    recordMetric, getMetrics, createAlert, getAlerts, resolveAlert,
    createDashboard, getDashboard, getTrace, queryTraces,
    traces, spans, metrics, alerts, dashboards
  };
};

describe('ObservabilityEngine', () => {
  let service;

  beforeEach(() => {
    service = createObservabilityEngine();
  });

  describe('createTrace', () => {
    it('should create a trace with workflow ID', () => {
      const trace = service.createTrace('wf-1');

      expect(trace).toBeDefined();
      expect(trace.id).toBeDefined();
      expect(trace.workflowId).toBe('wf-1');
      expect(trace.status).toBe(TRACE_STATUS.OK);
      expect(trace.startTime).toBeDefined();
      expect(trace.endTime).toBeNull();
    });

    it('should allow custom tags and metadata', () => {
      const trace = service.createTrace('wf-1', {
        tags: { env: 'production' },
        metadata: { userId: '123' }
      });

      expect(trace.tags.env).toBe('production');
      expect(trace.metadata.userId).toBe('123');
    });
  });

  describe('createSpan', () => {
    it('should create a span within a trace', () => {
      const trace = service.createTrace('wf-1');
      const span = service.createSpan(trace.id, { name: 'step-1', service: 'flow-engine' });

      expect(span).toBeDefined();
      expect(span.id).toBeDefined();
      expect(span.name).toBe('step-1');
      expect(span.service).toBe('flow-engine');
      expect(span.traceId).toBe(trace.id);
    });

    it('should set root span for trace', () => {
      const trace = service.createTrace('wf-1');
      const span = service.createSpan(trace.id, { name: 'root' });

      expect(trace.rootSpanId).toBe(span.id);
    });

    it('should link child spans to parent', () => {
      const trace = service.createTrace('wf-1');
      const parent = service.createSpan(trace.id, { name: 'parent' });
      const child = service.createSpan(trace.id, { name: 'child', parentId: parent.id });

      // Verify parent ID is set on child
      expect(child.parentId).toBe(parent.id);
    });

    it('should throw for non-existent trace', () => {
      expect(() => service.createSpan('non-existent', { name: 'test' }))
        .toThrow('Trace not found');
    });
  });

  describe('completeSpan', () => {
    it('should complete span and calculate duration', async () => {
      const trace = service.createTrace('wf-1');
      const span = service.createSpan(trace.id, { name: 'step-1' });

      await new Promise(r => setTimeout(r, 10));

      const completed = service.completeSpan(span.id);

      expect(completed.endTime).toBeDefined();
      expect(completed.duration).toBeGreaterThan(0);
    });

    it('should record error status', () => {
      const trace = service.createTrace('wf-1');
      const span = service.createSpan(trace.id, { name: 'step-1' });

      const completed = service.completeSpan(span.id, {
        status: TRACE_STATUS.ERROR,
        error: 'Something failed'
      });

      expect(completed.status).toBe(TRACE_STATUS.ERROR);
      expect(completed.error).toBe('Something failed');
    });
  });

  describe('completeTrace', () => {
    it('should complete trace and calculate duration', async () => {
      const trace = service.createTrace('wf-1');

      await new Promise(r => setTimeout(r, 10));

      const completed = service.completeTrace(trace.id);

      expect(completed.endTime).toBeDefined();
      expect(completed.duration).toBeGreaterThan(0);
    });

    it('should allow status override', () => {
      const trace = service.createTrace('wf-1');
      const completed = service.completeTrace(trace.id, { status: TRACE_STATUS.ERROR });

      expect(completed.status).toBe(TRACE_STATUS.ERROR);
    });
  });

  describe('metrics', () => {
    it('should record and aggregate metrics', () => {
      service.recordMetric('test.counter', 10);
      service.recordMetric('test.counter', 20);
      service.recordMetric('test.counter', 30);

      const metrics = service.getMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      const metric = metrics.find(m => m.key === 'test.counter');
      expect(metric.count).toBe(3);
      expect(metric.sum).toBe(60);
      expect(metric.avg).toBe(20);
    });

    it('should track min and max', () => {
      service.recordMetric('test.values', 5);
      service.recordMetric('test.values', 15);
      service.recordMetric('test.values', 10);

      const metric = service.getMetrics().find(m => m.key === 'test.values');
      expect(metric.min).toBe(5);
      expect(metric.max).toBe(15);
    });

    it('should filter metrics by prefix', () => {
      service.recordMetric('trace.duration', 100);
      service.recordMetric('span.duration', 50);
      service.recordMetric('test.other', 25);

      const traceMetrics = service.getMetrics({ prefix: 'trace.' });
      expect(traceMetrics.length).toBe(1);
      expect(traceMetrics[0].key).toBe('trace.duration');
    });
  });

  describe('alerts', () => {
    it('should create alerts', () => {
      const alert = service.createAlert({
        name: 'High Error Rate',
        severity: 'critical',
        message: 'Error rate above threshold'
      });

      expect(alert).toBeDefined();
      expect(alert.status).toBe('active');
      expect(alert.severity).toBe('critical');
    });

    it('should get active alerts', () => {
      service.createAlert({ name: 'Alert 1', severity: 'critical' });
      service.createAlert({ name: 'Alert 2', severity: 'warning' });

      const active = service.getAlerts({ status: 'active' });
      expect(active.length).toBe(2);
    });

    it('should resolve alerts', () => {
      const alert = service.createAlert({ name: 'Test Alert' });

      const resolved = service.resolveAlert(alert.id);

      expect(resolved.status).toBe('resolved');
      // resolvedAt should be set when resolving
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe('dashboards', () => {
    it('should create dashboards', () => {
      const dashboard = service.createDashboard({
        name: 'Flow Dashboard',
        widgets: [{ type: 'metric', metric: 'trace.count' }]
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.name).toBe('Flow Dashboard');
      expect(dashboard.widgets.length).toBe(1);
    });

    it('should retrieve dashboards', () => {
      const created = service.createDashboard({ name: 'Test' });
      const retrieved = service.getDashboard(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent dashboard', () => {
      const retrieved = service.getDashboard('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('queryTraces', () => {
    it('should query traces by workflow ID', () => {
      service.createTrace('wf-1');
      service.createTrace('wf-1');
      service.createTrace('wf-2');

      const wf1Traces = service.queryTraces({ workflowId: 'wf-1' });
      expect(wf1Traces.length).toBe(2);
    });

    it('should query traces by status', () => {
      const trace1 = service.createTrace('wf-1');
      service.createTrace('wf-2');
      service.completeTrace(trace1.id, { status: TRACE_STATUS.ERROR });

      const errorTraces = service.queryTraces({ status: TRACE_STATUS.ERROR });
      expect(errorTraces.length).toBe(1);
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        service.createTrace(`wf-${i}`);
      }

      const limited = service.queryTraces({ limit: 5 });
      expect(limited.length).toBe(5);
    });
  });

  describe('full trace scenario', () => {
    it('should track complete distributed trace', async () => {
      // Create workflow trace
      const trace = service.createTrace('order-processing', {
        tags: { version: '1.0' },
        metadata: { orderId: 'order-123' }
      });

      // Root span - workflow orchestration
      const rootSpan = service.createSpan(trace.id, {
        name: 'workflow.orchestrate',
        service: 'flow-engine'
      });

      // Child span - validation
      const validateSpan = service.createSpan(trace.id, {
        name: 'validate.order',
        service: 'validator',
        parentId: rootSpan.id
      });

      await new Promise(r => setTimeout(r, 5));
      service.completeSpan(validateSpan.id);

      // Child span - payment processing
      const paymentSpan = service.createSpan(trace.id, {
        name: 'process.payment',
        service: 'payment-service',
        parentId: rootSpan.id
      });

      await new Promise(r => setTimeout(r, 10));
      service.completeSpan(paymentSpan.id);

      // Complete root span
      await new Promise(r => setTimeout(r, 5));
      service.completeSpan(rootSpan.id);

      // Complete trace
      service.completeTrace(trace.id);

      // Verify trace
      const completedTrace = service.getTrace(trace.id);
      expect(completedTrace.spans.length).toBe(3);
      expect(completedTrace.duration).toBeGreaterThan(0);

      // Record metrics
      service.recordMetric('trace.duration', completedTrace.duration);
      service.recordMetric('trace.spans', completedTrace.spans.length);

      const metrics = service.getMetrics();
      expect(metrics.some(m => m.key === 'trace.duration')).toBe(true);
    });

    it('should track error in individual spans', () => {
      const trace = service.createTrace('wf-1');
      const span = service.createSpan(trace.id, { name: 'failing-step', service: 'test' });

      const completed = service.completeSpan(span.id, {
        status: TRACE_STATUS.ERROR,
        error: 'Connection timeout'
      });

      expect(completed.status).toBe(TRACE_STATUS.ERROR);
      expect(completed.error).toBe('Connection timeout');
    });
  });
});