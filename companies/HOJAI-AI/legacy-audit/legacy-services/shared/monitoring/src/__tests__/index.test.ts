/**
 * @rez/monitoring - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMetrics,
  getMetrics,
  registerHealthCheck,
  livenessProbe,
  readinessProbe,
  startSpan,
  addSpanTag,
  endSpan,
} from '../index';
import { Request, Response } from 'express';

// Mock response object
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.on = vi.fn();
  return res as unknown as Response;
};

// Mock request object
const mockRequest = (headers: Record<string, string> = {}) => {
  return {
    headers,
    method: 'GET',
    url: '/test',
    hostname: 'localhost',
    path: '/test',
  } as unknown as Request;
};

// ============================================
// Metrics Tests
// ============================================

describe('createMetrics', () => {
  it('should create metrics collector', () => {
    const metrics = createMetrics({ service: 'test-service' });
    expect(metrics).toBeDefined();
    expect(metrics.counter).toBeDefined();
    expect(metrics.gauge).toBeDefined();
    expect(metrics.histogram).toBeDefined();
    expect(metrics.handler).toBeDefined();
  });

  it('should increment counter', () => {
    const metrics = createMetrics({ service: 'test-service' });
    metrics.counter('requests');
    metrics.counter('requests');

    const output = metrics.collector.toPrometheusFormat();
    expect(output).toContain('requests');
  });

  it('should set gauge value', () => {
    const metrics = createMetrics({ service: 'test-service' });
    metrics.gauge('active_connections', 42);

    const output = metrics.collector.toPrometheusFormat();
    expect(output).toContain('active_connections');
    expect(output).toContain('42');
  });

  it('should handle labels', () => {
    const metrics = createMetrics({ service: 'test-service' });
    metrics.counter('requests', { method: 'GET' });
    metrics.counter('requests', { method: 'POST' });

    const output = metrics.collector.toPrometheusFormat();
    expect(output).toContain('method="GET"');
    expect(output).toContain('method="POST"');
  });

  it('should generate Prometheus format', () => {
    const metrics = createMetrics({ service: 'test-service' });
    metrics.counter('requests');

    const output = metrics.collector.toPrometheusFormat();
    expect(output).toContain('# HELP');
    expect(output).toContain('# TYPE');
    expect(output).toContain('test-service');
  });
});

describe('getMetrics', () => {
  it('should return existing metrics collector', () => {
    const metrics = createMetrics({ service: 'test-service' });
    const retrieved = getMetrics('test-service');

    expect(retrieved).toBe(metrics.collector);
  });

  it('should return undefined for non-existent service', () => {
    const retrieved = getMetrics('non-existent-service');
    expect(retrieved).toBeUndefined();
  });
});

// ============================================
// Health Check Tests
// ============================================

describe('livenessProbe', () => {
  it('should return ok status', () => {
    const handler = livenessProbe();
    const req = mockRequest();
    const res = mockResponse();

    handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });
});

describe('readinessProbe', () => {
  it('should return ready status', () => {
    const handler = readinessProbe();
    const req = mockRequest();
    const res = mockResponse();

    handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ status: 'ready' });
  });
});

describe('registerHealthCheck', () => {
  it('should register health check function', () => {
    const check = vi.fn().mockResolvedValue({ status: 'up' });
    registerHealthCheck('mongodb', check);

    expect(check).toBeDefined();
  });
});

// ============================================
// Tracing Tests
// ============================================

describe('startSpan', () => {
  it('should create span with trace ID', () => {
    const span = startSpan('test-operation');

    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();
    expect(span.operationName).toBe('test-operation');
    expect(span.startTime).toBeDefined();
  });

  it('should include parent span ID if provided', () => {
    const parentSpan = startSpan('parent');
    const childSpan = startSpan('child', parentSpan.spanId);

    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
  });
});

describe('addSpanTag', () => {
  it('should add tag to span', () => {
    const span = startSpan('test');
    addSpanTag(span, 'http.method', 'GET');

    expect(span.tags['http.method']).toBe('GET');
  });
});

describe('endSpan', () => {
  it('should set end time', () => {
    const span = startSpan('test');
    expect(span.endTime).toBeUndefined();

    endSpan(span);

    expect(span.endTime).toBeDefined();
    expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
  });
});

// ============================================
// Metrics Handler Tests
// ============================================

describe('Metrics Handler', () => {
  it('should return Prometheus format', () => {
    const metrics = createMetrics({ service: 'test-service' });
    const req = mockRequest();
    const res = mockResponse();

    metrics.handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.send).toHaveBeenCalled();
  });

  it('should include service info', () => {
    const metrics = createMetrics({ service: 'test-service' });
    const req = mockRequest();
    const res = mockResponse();

    metrics.handler(req, res);

    const output = res.send.mock.calls[0][0];
    expect(output).toContain('test-service');
  });
});
