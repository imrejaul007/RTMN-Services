/**
 * Decision Replay System - Trace Storage Service
 * Persistent storage with file-based backend (production would use PostgreSQL/Cassandra)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  Trace,
  Span,
  TraceQuery,
  TraceListResponse,
  TraceSummary,
  TraceStatus,
  OperationType,
  SpanStatus,
} from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', '..', 'data');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

const TRACES_FILE = join(DATA_DIR, 'traces.json');
const SPANS_FILE = join(DATA_DIR, 'spans.json');
const EXPORTS_FILE = join(DATA_DIR, 'exports.json');

interface TracesData {
  traces: Record<string, TraceSummary>;
  metadata: {
    totalTraces: number;
    lastUpdated: number;
  };
}

interface SpansData {
  spans: Record<string, Record<string, Span>>; // traceId -> spanId -> Span
  metadata: {
    totalSpans: number;
    lastUpdated: number;
  };
}

interface ExportsData {
  exports: Record<string, { data: string; createdAt: number; expiresAt: number }>;
}

// Load data from file
function loadTracesData(): TracesData {
  ensureDataDir();
  if (!existsSync(TRACES_FILE)) {
    return { traces: {}, metadata: { totalTraces: 0, lastUpdated: Date.now() } };
  }
  try {
    const content = readFileSync(TRACES_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { traces: {}, metadata: { totalTraces: 0, lastUpdated: Date.now() } };
  }
}

// Save data to file (atomic write)
function saveTracesData(data: TracesData): void {
  ensureDataDir();
  const tmpFile = TRACES_FILE + '.tmp';
  writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  // Atomic rename
  const fs = await import('fs/promises');
  fs.rename(tmpFile, TRACES_FILE).catch(() => {
    // Fallback to sync write if async fails
    const { writeFileSync: syncWrite, renameSync } = require('fs');
    syncWrite(tmpFile, JSON.stringify(data, null, 2));
    renameSync(tmpFile, TRACES_FILE);
  });
}

function loadSpansData(): SpansData {
  ensureDataDir();
  if (!existsSync(SPANS_FILE)) {
    return { spans: {}, metadata: { totalSpans: 0, lastUpdated: Date.now() } };
  }
  try {
    const content = readFileSync(SPANS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { spans: {}, metadata: { totalSpans: 0, lastUpdated: Date.now() } };
  }
}

function saveSpansData(data: SpansData): void {
  ensureDataDir();
  const tmpFile = SPANS_FILE + '.tmp';
  writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  const { renameSync } = require('fs');
  renameSync(tmpFile, SPANS_FILE);
}

// In-memory cache for fast access
let tracesCache: TracesData | null = null;
let spansCache: SpansData | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

function getTracesData(): TracesData {
  const now = Date.now();
  if (!tracesCache || now - cacheTime > CACHE_TTL) {
    tracesCache = loadTracesData();
    cacheTime = now;
  }
  return tracesCache;
}

function getSpansData(): SpansData {
  const now = Date.now();
  if (!spansCache || now - cacheTime > CACHE_TTL) {
    spansCache = loadSpansData();
    cacheTime = now;
  }
  return spansCache;
}

function invalidateCache(): void {
  cacheTime = 0;
}

// Trace Storage Implementation
export class TraceStorageService {
  private tracesData: TracesData;
  private spansData: SpansData;

  constructor() {
    this.tracesData = getTracesData();
    this.spansData = getSpansData();
  }

  async saveTrace(trace: Trace): Promise<void> {
    // Save spans first
    if (!this.spansData.spans[trace.id]) {
      this.spansData.spans[trace.id] = {};
    }

    for (const [spanId, span] of trace.spans.entries()) {
      this.spansData.spans[trace.id][spanId] = span;
      this.spansData.metadata.totalSpans++;
    }

    // Create summary for traces
    const summary: TraceSummary = {
      id: trace.id,
      rootSpanId: trace.rootSpanId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.duration,
      status: trace.status,
      services: [...new Set(Array.from(trace.spans.values()).map(s => s.serviceName))],
      operationTypes: [...new Set(Array.from(trace.spans.values()).map(s => s.operationType))],
      spanCount: trace.spans.size,
      errorCount: Array.from(trace.spans.values()).filter(s => s.status === 'error').length,
      metadata: trace.metadata,
    };

    this.tracesData.traces[trace.id] = summary;
    this.tracesData.metadata.totalTraces++;
    this.tracesData.metadata.lastUpdated = Date.now();

    saveTracesData(this.tracesData);
    saveSpansData(this.spansData);
    invalidateCache();
  }

  async getTrace(traceId: string): Promise<Trace | null> {
    const summary = this.tracesData.traces[traceId];
    if (!summary) return null;

    const spanMap = this.spansData.spans[traceId];
    if (!spanMap) return null;

    const spans = new Map<string, Span>();
    for (const [spanId, span] of Object.entries(spanMap)) {
      spans.set(spanId, span);
    }

    return {
      id: summary.id,
      rootSpanId: summary.rootSpanId,
      spans,
      startTime: summary.startTime,
      endTime: summary.endTime,
      duration: summary.duration,
      status: summary.status,
      metadata: summary.metadata,
      timeline: undefined,
      branchComparison: undefined,
      performanceAnalysis: undefined,
    };
  }

  async deleteTrace(traceId: string): Promise<boolean> {
    if (!this.tracesData.traces[traceId]) {
      return false;
    }

    delete this.tracesData.traces[traceId];
    delete this.spansData.spans[traceId];
    this.tracesData.metadata.lastUpdated = Date.now();

    saveTracesData(this.tracesData);
    saveSpansData(this.spansData);
    invalidateCache();

    return true;
  }

  async queryTraces(query: TraceQuery): Promise<TraceListResponse> {
    let traces = Object.values(this.tracesData.traces);

    // Apply filters
    if (query.traceId) {
      traces = traces.filter(t => t.id.includes(query.traceId!));
    }
    if (query.serviceName) {
      traces = traces.filter(t => t.services.includes(query.serviceName!));
    }
    if (query.operationType) {
      traces = traces.filter(t => t.operationTypes.includes(query.operationType!));
    }
    if (query.status) {
      traces = traces.filter(t => t.status === query.status);
    }
    if (query.startTime) {
      traces = traces.filter(t => t.startTime >= query.startTime!);
    }
    if (query.endTime) {
      traces = traces.filter(t => t.startTime <= query.endTime!);
    }
    if (query.durationMin !== undefined) {
      traces = traces.filter(t => (t.duration || 0) >= query.durationMin!);
    }
    if (query.durationMax !== undefined) {
      traces = traces.filter(t => (t.duration || 0) <= query.durationMax!);
    }
    if (query.agentId) {
      traces = traces.filter(t => t.metadata.agentId === query.agentId);
    }
    if (query.decisionId) {
      traces = traces.filter(t => t.metadata.decisionId === query.decisionId);
    }
    if (query.tags) {
      traces = traces.filter(t => {
        for (const [key, value] of Object.entries(query.tags!)) {
          if (t.metadata.tags.includes(`${key}:${value}`)) return true;
        }
        return false;
      });
    }

    const total = traces.length;

    // Sort
    const sortBy = query.sortBy || 'startTime';
    const sortOrder = query.sortOrder || 'desc';
    traces.sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

      if (sortBy === 'startTime') {
        aVal = a.startTime;
        bVal = b.startTime;
      } else if (sortBy === 'duration') {
        aVal = a.duration || 0;
        bVal = b.duration || 0;
      } else if (sortBy === 'status') {
        aVal = a.status;
        bVal = b.status;
      }

      if (aVal === undefined || bVal === undefined) return 0;
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const paginatedTraces = traces.slice(offset, offset + limit);

    return {
      traces: paginatedTraces,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async getSpansByTraceId(traceId: string): Promise<Span[]> {
    const spanMap = this.spansData.spans[traceId];
    if (!spanMap) return [];

    return Object.values(spanMap).sort((a, b) => a.startTime - b.startTime);
  }

  async saveSpan(span: Span): Promise<void> {
    if (!this.spansData.spans[span.traceId]) {
      this.spansData.spans[span.traceId] = {};
    }

    this.spansData.spans[span.traceId][span.id] = span;
    this.spansData.metadata.totalSpans++;
    saveSpansData(this.spansData);
    invalidateCache();
  }

  async updateSpan(spanId: string, updates: Partial<Span>): Promise<void> {
    // Find and update span across all traces
    for (const [traceId, spans] of Object.entries(this.spansData.spans)) {
      if (spans[spanId]) {
        this.spansData.spans[traceId][spanId] = { ...spans[spanId], ...updates };
        saveSpansData(this.spansData);
        invalidateCache();
        return;
      }
    }
    throw new Error(`Span ${spanId} not found`);
  }

  // Analytics methods
  async getTraceAnalytics(startTime?: number, endTime?: number): Promise<{
    totalTraces: number;
    tracesByStatus: Record<TraceStatus, number>;
    averageDuration: number;
    p50: number;
    p90: number;
    p99: number;
  }> {
    let traces = Object.values(this.tracesData.traces);

    if (startTime) {
      traces = traces.filter(t => t.startTime >= startTime);
    }
    if (endTime) {
      traces = traces.filter(t => t.startTime <= endTime);
    }

    const tracesByStatus: Record<TraceStatus, number> = {
      running: 0,
      completed: 0,
      error: 0,
      partial: 0,
      exported: 0,
    };

    const durations = traces
      .map(t => t.duration || 0)
      .filter(d => d > 0);

    for (const trace of traces) {
      tracesByStatus[trace.status] = (tracesByStatus[trace.status] || 0) + 1;
    }

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p50 = this.percentile(sortedDurations, 50);
    const p90 = this.percentile(sortedDurations, 90);
    const p99 = this.percentile(sortedDurations, 99);
    const avg = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalTraces: traces.length,
      tracesByStatus,
      averageDuration: avg,
      p50,
      p90,
      p99,
    };
  }

  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const idx = Math.max(0, Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length)));
    return sortedArr[idx];
  }
}

// Singleton instance
let instance: TraceStorageService | null = null;

export function getTraceStorageService(): TraceStorageService {
  if (!instance) {
    instance = new TraceStorageService();
  }
  return instance;
}
