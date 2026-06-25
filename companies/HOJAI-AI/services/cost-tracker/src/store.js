/**
 * Cost Tracker - In-memory store for AI usage metering
 */

import { v4 as uuidv4 } from 'uuid';

// Token pricing (per 1M tokens)
const PRICING = {
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'default': { input: 1, output: 2 }
};

// STT pricing (per minute)
const STT_PRICING = {
  'whisper': 0.006,
  'deepgram': 0.0043,
  'google': 0.006,
  'sarvam': 0.003,
  'default': 0.005
};

// TTS pricing (per 1K chars)
const TTS_PRICING = {
  'elevenlabs': 0.30,
  'cartesia': 0.25,
  'google': 0.40,
  'sarvam': 0.20,
  'default': 0.30
};

// In-memory stores
const usage = new Map();     // id -> usage record
const budgets = new Map();    // userId -> budget config
const alerts = new Map();     // alertId -> alert config

// ── Usage Tracking ─────────────────────────────────────────────────────────

export function trackUsage({ userId, projectId, model, provider, inputTokens, outputTokens, sttMinutes, ttsChars, agentId }) {
  const id = uuidv4();
  const now = new Date();
  const hour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

  // Calculate cost
  const pricing = PRICING[model] || PRICING.default;
  const inputCost = (inputTokens || 0) * pricing.input / 1000000;
  const outputCost = (outputTokens || 0) * pricing.output / 1000000;
  const sttCost = (sttMinutes || 0) * (STT_PRICING[provider] || STT_PRICING.default);
  const ttsCost = (ttsChars || 0) * (TTS_PRICING[provider] || TTS_PRICING.default) / 1000;
  const totalCost = inputCost + outputCost + sttCost + ttsCost;

  const record = {
    id,
    userId,
    projectId,
    agentId,
    model,
    provider,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    sttMinutes: sttMinutes || 0,
    ttsChars: ttsChars || 0,
    inputCost,
    outputCost,
    sttCost,
    ttsCost,
    totalCost,
    hour,
    timestamp: now.toISOString()
  };

  usage.set(id, record);

  // Check budget alerts
  checkBudgetAlerts(userId);

  return record;
}

export function getUsage({ userId, projectId, startDate, endDate, limit = 100 } = {}) {
  let results = Array.from(usage.values());

  if (userId) results = results.filter(u => u.userId === userId);
  if (projectId) results = results.filter(u => u.projectId === projectId);
  if (startDate) results = results.filter(u => new Date(u.timestamp) >= new Date(startDate));
  if (endDate) results = results.filter(u => new Date(u.timestamp) <= new Date(endDate));

  return results
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// ── Aggregation ────────────────────────────────────────────────────────────

export function getUsageSummary({ userId, projectId, period = 'month' }) {
  const records = getUsage({ userId, projectId });

  const totalTokens = records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
  const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
  const totalSttMinutes = records.reduce((sum, r) => sum + r.sttMinutes, 0);
  const totalTtsChars = records.reduce((sum, r) => sum + r.ttsChars, 0);

  // By model
  const byModel = {};
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { tokens: 0, cost: 0, count: 0 };
    byModel[r.model].tokens += r.inputTokens + r.outputTokens;
    byModel[r.model].cost += r.totalCost;
    byModel[r.model].count++;
  }

  // By provider
  const byProvider = {};
  for (const r of records) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { calls: 0, cost: 0 };
    byProvider[r.provider].calls++;
    byProvider[r.provider].cost += r.totalCost;
  }

  // By hour/day
  const byHour = {};
  for (const r of records) {
    if (!byHour[r.hour]) byHour[r.hour] = { tokens: 0, cost: 0 };
    byHour[r.hour].tokens += r.inputTokens + r.outputTokens;
    byHour[r.hour].cost += r.totalCost;
  }

  return {
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    totalSttMinutes: Math.round(totalSttMinutes * 100) / 100,
    totalTtsChars,
    recordCount: records.length,
    byModel,
    byProvider,
    byHour
  };
}

// ── Budgets ──────────────────────────────────────────────────────────────

export function setBudget({ userId, monthlyLimit, alertThreshold = 80 }) {
  const budget = {
    userId,
    monthlyLimit,
    alertThreshold,
    currentSpend: 0,
    resetDate: getNextResetDate(),
    createdAt: new Date().toISOString()
  };

  budgets.set(userId, budget);
  return budget;
}

export function getBudget(userId) {
  return budgets.get(userId) || null;
}

export function checkBudgetAlerts(userId) {
  const budget = budgets.get(userId);
  if (!budget) return null;

  const usage = getUsageSummary({ userId });
  const percentUsed = (usage.totalCost / budget.monthlyLimit) * 100;

  if (percentUsed >= budget.alertThreshold) {
    // Would trigger alert in production (email, webhook, etc.)
    return { userId, percentUsed, exceeded: percentUsed >= 100 };
  }

  return null;
}

function getNextResetDate() {
  const now = new Date();
  const next = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return next.toISOString();
}

// ── Alerts ────────────────────────────────────────────────────────────────

export function createAlert({ userId, threshold, email, webhookUrl }) {
  const id = uuidv4();
  const alert = {
    id,
    userId,
    threshold,
    email,
    webhookUrl,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  alerts.set(id, alert);
  return alert;
}

export function listAlerts(userId) {
  return Array.from(alerts.values()).filter(a => a.userId === userId);
}

export function deleteAlert(id) {
  return alerts.delete(id);
}

// ── Stats ────────────────────────────────────────────────────────────────

export function getStats() {
  const allUsage = Array.from(usage.values());
  const allBudgets = Array.from(budgets.values());

  return {
    totalRecords: allUsage.length,
    totalCost: Math.round(allUsage.reduce((sum, u) => sum + u.totalCost, 0) * 100) / 100,
    totalTokens: allUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
    activeBudgets: allBudgets.length,
    activeAlerts: alerts.size
  };
}

// Export pricing for UI
export function getPricing() {
  return { PRICING, STT_PRICING, TTS_PRICING };
}
