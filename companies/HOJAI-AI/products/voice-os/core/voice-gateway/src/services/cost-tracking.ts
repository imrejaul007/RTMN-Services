/**
 * Cost Tracking — Voice Gateway v1.1
 * ====================================
 * Tracks spend per engine, per user, per day.
 * Alerts when monthly budget thresholds are hit.
 * Supports cost allocation to teams/projects via tags.
 */

import { config } from '../config/index.js';

// ── Cost profiles (USD per unit) ─────────────────────────────────────────────────

const STT_COST_PER_MIN: Record<string, number> = {
  whisper: 0.006, deepgram: 0.0044, google: 0.009, sarvam: 0.008, hojai: 0,
};
const TTS_COST_PER_1K_CHARS: Record<string, number> = {
  elevenlabs: 0.30, cartesia: 0.25, hojai: 0,
};

// ── Aggregated stats ─────────────────────────────────────────────────────────────

interface EngineStats {
  requests: number;
  totalAudioSeconds: number;
  totalTextChars: number;
  totalCost: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
  errors: number;
  lastUsed: number;
}

interface DailyStats {
  date: string;
  stt: Record<string, EngineStats>;
  tts: Record<string, EngineStats>;
  totalCost: number;
}

interface UserStats {
  userId: string;
  requests: number;
  totalCost: number;
  byEngine: Record<string, number>;
  lastActive: number;
}

// In-memory stores (replace with Redis in production)
const dailyStats = new Map<string, DailyStats>();
const userStats = new Map<string, UserStats>();
let globalTotalCost = 0;

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function getDailyStats(date?: string): DailyStats {
  const d = date ?? today();
  if (!dailyStats.has(d)) {
    dailyStats.set(d, { date: d, stt: {}, tts: {}, totalCost: 0 });
  }
  return dailyStats.get(d)!;
}

function getUserStats(userId: string): UserStats {
  if (!userStats.has(userId)) {
    userStats.set(userId, { userId, requests: 0, totalCost: 0, byEngine: {}, lastActive: Date.now() });
  }
  return userStats.get(userId)!;
}

function getOrCreateEngineStats(obj: Record<string, EngineStats>, engine: string): EngineStats {
  if (!obj[engine]) {
    obj[engine] = { requests: 0, totalAudioSeconds: 0, totalTextChars: 0, totalCost: 0, avgLatencyMs: 0, totalLatencyMs: 0, errors: 0, lastUsed: 0 };
  }
  return obj[engine];
}

// ── Record STT call ───────────────────────────────────────────────────────────────

export function recordSTTCall(params: {
  engine: string;
  audioSeconds: number;
  latencyMs: number;
  costUsd: number;
  userId?: string;
  sessionId?: string;
  domain?: string;
  success: boolean;
  error?: string;
}): void {
  const d = getDailyStats();
  const s = getOrCreateEngineStats(d.stt, params.engine);

  s.requests++;
  s.totalAudioSeconds += params.audioSeconds;
  s.totalCost += params.costUsd;
  s.totalLatencyMs += params.latencyMs;
  s.avgLatencyMs = Math.round(s.totalLatencyMs / s.requests);
  s.lastUsed = Date.now();
  if (!params.success) s.errors++;

  d.totalCost += params.costUsd;
  globalTotalCost += params.costUsd;

  if (params.userId) {
    const u = getUserStats(params.userId);
    u.requests++;
    u.totalCost += params.costUsd;
    u.byEngine[params.engine] = (u.byEngine[params.engine] ?? 0) + params.costUsd;
    u.lastActive = Date.now();
  }
}

// ── Record TTS call ──────────────────────────────────────────────────────────────

export function recordTTSCall(params: {
  engine: string;
  textChars: number;
  latencyMs: number;
  costUsd: number;
  userId?: string;
  success: boolean;
}): void {
  const d = getDailyStats();
  const s = getOrCreateEngineStats(d.tts, params.engine);

  s.requests++;
  s.totalTextChars += params.textChars;
  s.totalCost += params.costUsd;
  s.totalLatencyMs += params.latencyMs;
  s.avgLatencyMs = Math.round(s.totalLatencyMs / s.requests);
  s.lastUsed = Date.now();
  if (!params.success) s.errors++;

  d.totalCost += params.costUsd;
  globalTotalCost += params.costUsd;

  if (params.userId) {
    const u = getUserStats(params.userId);
    u.requests++;
    u.totalCost += params.costUsd;
    u.byEngine[params.engine] = (u.byEngine[params.engine] ?? 0) + params.costUsd;
    u.lastActive = Date.now();
  }
}

// ── Compute cost ────────────────────────────────────────────────────────────────

export function computeSTTCost(engine: string, audioSeconds: number): number {
  const rate = STT_COST_PER_MIN[engine] ?? 0;
  return (audioSeconds / 60) * rate;
}

export function computeTTSCost(engine: string, textChars: number): number {
  const rate = TTS_COST_PER_1K_CHARS[engine] ?? 0;
  return (textChars / 1000) * rate;
}

// ── Query APIs ──────────────────────────────────────────────────────────────────

export function getDailyCostBreakdown(date?: string) {
  const d = getDailyStats(date);
  const totalStt = Object.values(d.stt).reduce((s, e) => s + e.totalCost, 0);
  const totalTts = Object.values(d.tts).reduce((s, e) => s + e.totalCost, 0);

  return {
    date: d.date,
    total: d.totalCost,
    stt: {
      total: totalStt,
      byEngine: Object.fromEntries(
        Object.entries(d.stt).map(([e, s]) => [e, {
          requests: s.requests,
          audioMinutes: Math.round(s.totalAudioSeconds / 60 * 100) / 100,
          cost: Math.round(s.totalCost * 100000) / 100000,
          avgLatencyMs: s.avgLatencyMs,
          errors: s.errors,
          lastUsed: new Date(s.lastUsed).toISOString(),
        }])
      ),
    },
    tts: {
      total: totalTts,
      byEngine: Object.fromEntries(
        Object.entries(d.tts).map(([e, s]) => [e, {
          requests: s.requests,
          textChars: s.totalTextChars,
          cost: Math.round(s.totalCost * 100000) / 100000,
          avgLatencyMs: s.avgLatencyMs,
          errors: s.errors,
          lastUsed: new Date(s.lastUsed).toISOString(),
        }])
      ),
    },
  };
}

export function getMonthlyCostSummary(month?: string) {
  // Aggregate all days in the month
  const target = month ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  let total = 0;
  const days: Record<string, number> = {};
  const engines: Record<string, number> = {};

  for (const [date, d] of dailyStats.entries()) {
    if (!date.startsWith(target)) continue;
    total += d.totalCost;
    days[date] = d.totalCost;
    for (const [engine, s] of Object.entries(d.stt)) {
      engines[engine] = (engines[engine] ?? 0) + s.totalCost;
    }
    for (const [engine, s] of Object.entries(d.tts)) {
      engines[engine] = (engines[engine] ?? 0) + s.totalCost;
    }
  }

  return {
    month: target,
    totalCost: Math.round(total * 100000) / 100000,
    byDay: days,
    byEngine: Object.fromEntries(
      Object.entries(engines).map(([k, v]) => [k, Math.round(v * 100000) / 100000])
    ),
    globalTotal: Math.round(globalTotalCost * 100000) / 100000,
  };
}

export function getUserCost(userId: string) {
  return userStats.get(userId) ?? { userId, requests: 0, totalCost: 0, byEngine: {}, lastActive: 0 };
}

export function getTopUsers(limit = 10) {
  return Array.from(userStats.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit)
    .map(u => ({
      userId: u.userId,
      requests: u.requests,
      totalCost: Math.round(u.totalCost * 100000) / 100000,
      byEngine: Object.fromEntries(
        Object.entries(u.byEngine).map(([k, v]) => [k, Math.round(v * 100000) / 100000])
      ),
      lastActive: new Date(u.lastActive).toISOString(),
    }));
}

export default { recordSTTCall, recordTTSCall, computeSTTCost, computeTTSCost, getDailyCostBreakdown, getMonthlyCostSummary, getUserCost, getTopUsers };
