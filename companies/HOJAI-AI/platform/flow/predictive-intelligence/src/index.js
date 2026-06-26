/**
 * RTMN Predictive Intelligence v1.0
 *
 * General-purpose time-series forecasting, anomaly detection, trend analysis,
 * and demand prediction for the RTMN ecosystem. Part of HOJAI AI Division 3
 * (Intelligence Cloud).
 *
 * Implements the following algorithms from scratch in pure JavaScript
 * (no external ML libraries):
 *   1. Linear regression (least squares)
 *   2. Moving average (simple, weighted, exponential)
 *   3. Holt-Winters triple exponential smoothing
 *   4. Naive seasonal
 *   5. Ensemble (weighted average of multiple methods)
 *
 * Companion to:
 *   - services/sales-intelligence (5181) - sales-specific intelligence
 *   - services/customer-intelligence (4885) - customer/CDP intelligence
 *   - services/ai-intelligence (4881) - general HOJAI intelligence
 *
 * @author HOJAI AI - Division 3 (Intelligence Cloud)
 * @version 1.0.0
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4754;
const SERVICE_NAME = 'predictive-intelligence';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ============ IN-MEMORY STORAGE ============
//
// In production these would be backed by MongoDB or similar persistent store.

/** @type {Map<string, object>} forecastId -> forecast record */
const forecasts = new PersistentMap('forecasts', { serviceName: 'predictive-intelligence' });

/** @type {Array<object>} append-only audit log */
const auditLog = [];

/** Global counters for /api/stats */
let totalForecastsGenerated = 0;
let totalSeriesProcessed = 0;
let horizonSum = 0;
let horizonCount = 0;

// ============ FORECASTING MATH HELPERS ============

/**
 * Convert a series of {t, v} into aligned arrays.
 * @param {Array<{t:string,v:number}>} series
 * @returns {{values:number[], times:string[], n:number}}
 */
function alignSeries(series) {
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error('series must be a non-empty array of {t, v}');
  }
  // Sort by t just in case
  const sorted = [...series].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
  const values = sorted.map(p => Number(p.v));
  const times = sorted.map(p => p.t);
  if (values.some(v => !Number.isFinite(v))) {
    throw new Error('series values must be finite numbers');
  }
  return { values, times, n: values.length };
}

/**
 * Mean of an array.
 */
function mean(arr) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const x of arr) s += x;
  return s / arr.length;
}

/**
 * Standard deviation of an array (population).
 */
function stdev(arr) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  let s = 0;
  for (const x of arr) s += (x - m) * (x - m);
  return Math.sqrt(s / arr.length);
}

/**
 * Median of an array.
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Determine the seasonal period (in steps) for a given seasonality tag.
 * @param {string} seasonality
 * @param {Array<string>} times
 * @returns {number} period in steps; 0 if no seasonality
 */
function detectSeasonalPeriod(seasonality, times) {
  if (seasonality === 'none' || !seasonality) return 0;
  // If we have enough data, infer period from the median delta in time
  if (times.length >= 2) {
    const deltas = [];
    for (let i = 1; i < times.length; i++) {
      deltas.push(new Date(times[i]).getTime() - new Date(times[i - 1]).getTime());
    }
    const medianDelta = median(deltas);
    if (seasonality === 'daily') return Math.max(1, Math.round(DAY_MS / medianDelta));
    if (seasonality === 'weekly') return Math.max(1, Math.round(7 * DAY_MS / medianDelta));
    if (seasonality === 'monthly') return Math.max(1, Math.round(30 * DAY_MS / medianDelta));
  }
  // Fallback: use sensible defaults
  if (seasonality === 'daily') return 7;       // weekly cycle on daily data
  if (seasonality === 'weekly') return 52;     // yearly cycle on weekly data
  if (seasonality === 'monthly') return 12;    // yearly cycle on monthly data
  return 0;
}

// ============ FORECASTING METHODS ============

/**
 * Linear regression (least squares). y = a + b*x where x = 0..n-1.
 * Forecasts are extrapolated by extending x.
 * @param {number[]} values
 * @param {number} horizon
 * @returns {{predictions:number[], confidence:number, modelInfo:object}}
 */
function forecastLinear(values, horizon) {
  const n = values.length;
  if (n < 2) {
    return {
      predictions: new Array(horizon).fill(values[0] || 0),
      confidence: 0.2,
      modelInfo: { method: 'linear', note: 'insufficient data, returning last value' }
    };
  }
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const b = den === 0 ? 0 : num / den;
  const a = yMean - b * xMean;

  // R^2
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = a + b * i;
    ssTot += (values[i] - yMean) ** 2;
    ssRes += (values[i] - yHat) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  const predictions = [];
  for (let h = 1; h <= horizon; h++) {
    predictions.push(a + b * (n - 1 + h));
  }

  // Residuals for confidence
  const residuals = [];
  for (let i = 0; i < n; i++) residuals.push(values[i] - (a + b * i));
  const sigma = stdev(residuals);

  // Confidence decays with horizon
  const baseConf = 0.5 + 0.4 * rSquared;
  const confidence = Math.max(0.1, Math.min(0.95, baseConf));

  return {
    predictions,
    confidence,
    modelInfo: {
      method: 'linear',
      slope: b,
      intercept: a,
      rSquared,
      residualStd: sigma
    }
  };
}

/**
 * Simple / weighted / exponential moving average.
 * For extrapolation, repeat the last smoothed value (naive beyond history).
 * @param {number[]} values
 * @param {number} horizon
 * @param {{kind?: 'simple'|'weighted'|'exponential', window?: number, alpha?: number}} [opts]
 */
function forecastMovingAverage(values, horizon, opts = {}) {
  const kind = opts.kind || 'simple';
  const window = Math.max(1, Math.min(opts.window || Math.min(7, values.length), values.length));
  const alpha = opts.alpha != null ? opts.alpha : 0.3;

  let forecastValue;
  if (kind === 'simple') {
    const tail = values.slice(-window);
    forecastValue = mean(tail);
  } else if (kind === 'weighted') {
    // Linearly increasing weights: w[i] = i+1
    const tail = values.slice(-window);
    let num = 0, den = 0;
    for (let i = 0; i < tail.length; i++) {
      const w = i + 1;
      num += w * tail[i];
      den += w;
    }
    forecastValue = den === 0 ? mean(tail) : num / den;
  } else {
    // Exponential
    let s = values[0];
    for (let i = 1; i < values.length; i++) s = alpha * values[i] + (1 - alpha) * s;
    forecastValue = s;
  }

  // Estimate residual std
  let s2 = values[0];
  for (let i = 1; i < values.length; i++) s2 = alpha * values[i] + (1 - alpha) * s2;
  const smoothed = [];
  let s = values[0];
  smoothed.push(s);
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
    smoothed.push(s);
  }
  const resid = values.map((v, i) => v - smoothed[i]);
  const sigma = stdev(resid);

  const predictions = new Array(horizon).fill(forecastValue);
  return {
    predictions,
    confidence: Math.max(0.3, Math.min(0.9, 0.8 - sigma / (Math.abs(forecastValue) + 1))),
    modelInfo: { method: 'moving-average', kind, window, alpha, lastSmoothed: forecastValue, residualStd: sigma }
  };
}

/**
 * Holt-Winters triple exponential smoothing.
 * Handles additive seasonality. Default period 7 if not specified.
 * @param {number[]} values
 * @param {number} horizon
 * @param {number} period
 * @param {{alpha?:number,beta?:number,gamma?:number}} [opts]
 */
function forecastHoltWinters(values, horizon, period, opts = {}) {
  const n = values.length;
  const alpha = opts.alpha != null ? opts.alpha : 0.4;
  const beta = opts.beta != null ? opts.beta : 0.1;
  const gamma = opts.gamma != null ? opts.gamma : 0.3;
  const p = period > 1 ? period : 1;

  if (n < 2 * p) {
    // Not enough data for full Holt-Winters; fall back to simple MA
    return forecastMovingAverage(values, horizon, { kind: 'simple', window: Math.min(7, n) });
  }

  // Initial level = mean of first season
  let level = mean(values.slice(0, p));
  // Initial trend
  let trend = (mean(values.slice(p, 2 * p)) - level) / p;
  // Initial seasonal indices
  const seasonal = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    seasonal[i] = values[i] - level;
  }

  // Fit
  const fitted = [];
  for (let i = 0; i < n; i++) {
    const sIdx = i % p;
    const seasonalComp = seasonal[sIdx];
    const yHat = level + trend + seasonalComp;
    fitted.push(yHat);
    const prevLevel = level;
    level = alpha * (values[i] - seasonalComp) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[sIdx] = gamma * (values[i] - level) + (1 - gamma) * seasonalComp;
  }

  // Residuals
  const resid = values.map((v, i) => v - fitted[i]);
  const sigma = stdev(resid);

  // Forecast
  const predictions = [];
  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n - 1 + h) % p;
    predictions.push(level + h * trend + seasonal[sIdx]);
  }

  // Confidence: based on residual std relative to mean abs value
  const mAbs = mean(values.map(Math.abs)) || 1;
  const conf = Math.max(0.2, Math.min(0.9, 0.85 - sigma / mAbs));

  return {
    predictions,
    confidence: conf,
    modelInfo: {
      method: 'holt-winters',
      period: p,
      alpha, beta, gamma,
      finalLevel: level,
      finalTrend: trend,
      residualStd: sigma
    }
  };
}

/**
 * Naive seasonal: repeat the last `period` values, scaled by overall trend.
 */
function forecastSeasonalNaive(values, horizon, period) {
  const n = values.length;
  const p = period > 1 ? period : Math.min(7, n);
  if (n < p + 1) {
    return {
      predictions: new Array(horizon).fill(values[n - 1] || 0),
      confidence: 0.3,
      modelInfo: { method: 'seasonal-naive', note: 'insufficient data for seasonal pattern' }
    };
  }
  // Estimate trend from last two seasons
  const recentSeason = mean(values.slice(-p));
  const prevSeason = mean(values.slice(-2 * p, -p));
  const trendFactor = prevSeason === 0 ? 1 : recentSeason / prevSeason;

  const predictions = [];
  for (let h = 1; h <= horizon; h++) {
    const idx = (n - p + ((h - 1) % p));
    // Scale by cumulative trend
    const seasonNumber = Math.floor((h - 1) / p) + 1;
    const trendMultiplier = Math.pow(trendFactor, seasonNumber);
    predictions.push(values[idx] * trendMultiplier);
  }

  const sigma = stdev(values.slice(-p));
  const conf = Math.max(0.25, Math.min(0.85, 0.75 - sigma / (Math.abs(recentSeason) + 1)));

  return {
    predictions,
    confidence: conf,
    modelInfo: {
      method: 'seasonal-naive',
      period: p,
      trendFactor,
      residualStd: sigma
    }
  };
}

/**
 * Ensemble: weighted average of several forecasts.
 */
function forecastEnsemble(values, horizon, seasonality) {
  const period = detectSeasonalPeriod(seasonality, []);
  const linear = forecastLinear(values, horizon);
  const ma = forecastMovingAverage(values, horizon, { kind: 'exponential', alpha: 0.3 });
  const seasonal = period > 1
    ? forecastHoltWinters(values, horizon, period)
    : forecastSeasonalNaive(values, horizon, period);

  // Weights: more weight to seasonal when period > 1
  const wLinear = 0.2;
  const wMA = 0.3;
  const wSeasonal = 0.5;
  const predictions = [];
  for (let i = 0; i < horizon; i++) {
    predictions.push(
      wLinear * linear.predictions[i] +
      wMA * ma.predictions[i] +
      wSeasonal * seasonal.predictions[i]
    );
  }
  // Variance across methods
  const methodConfidences = [linear.confidence, ma.confidence, seasonal.confidence];
  const confidence = mean(methodConfidences);

  return {
    predictions,
    confidence,
    modelInfo: {
      method: 'ensemble',
      weights: { linear: wLinear, movingAverage: wMA, seasonal: wSeasonal },
      components: {
        linear: linear.modelInfo,
        movingAverage: ma.modelInfo,
        seasonal: seasonal.modelInfo
      }
    }
  };
}

/**
 * Pick the best method automatically based on series length and seasonality.
 */
function autoSelectAndForecast(values, horizon, seasonality) {
  const n = values.length;
  const period = detectSeasonalPeriod(seasonality, []);
  if (n < 5) return forecastMovingAverage(values, horizon, { kind: 'simple' });
  if (period > 1 && n >= 2 * period) return forecastHoltWinters(values, horizon, period);
  if (n < 12) return forecastMovingAverage(values, horizon, { kind: 'exponential' });
  return forecastEnsemble(values, horizon, seasonality);
}

/**
 * Run the requested method (or auto).
 */
function runForecast(values, horizon, method, seasonality) {
  const m = method || 'auto';
  if (m === 'linear') return forecastLinear(values, horizon);
  if (m === 'ma' || m === 'moving-average') return forecastMovingAverage(values, horizon, { kind: 'exponential' });
  if (m === 'holt-winters') {
    const p = detectSeasonalPeriod(seasonality, []) || 7;
    return forecastHoltWinters(values, horizon, p);
  }
  if (m === 'seasonal') {
    const p = detectSeasonalPeriod(seasonality, []) || 7;
    return forecastSeasonalNaive(values, horizon, p);
  }
  if (m === 'ensemble') return forecastEnsemble(values, horizon, seasonality);
  return autoSelectAndForecast(values, horizon, seasonality);
}

// ============ ANOMALY DETECTION ============

/**
 * Z-score anomaly detection.
 */
function detectAnomaliesZScore(values, threshold) {
  const m = mean(values);
  const s = stdev(values) || 1;
  return values.map((v, i) => {
    const z = (v - m) / s;
    return { index: i, value: v, score: z, isAnomaly: Math.abs(z) >= threshold };
  });
}

/**
 * IQR-based anomaly detection.
 */
function detectAnomaliesIQR(values, threshold) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - threshold * iqr;
  const upper = q3 + threshold * iqr;
  return values.map((v, i) => {
    const dist = v < lower ? lower - v : v > upper ? v - upper : 0;
    const score = iqr === 0 ? 0 : dist / iqr;
    return { index: i, value: v, score, isAnomaly: v < lower || v > upper };
  });
}

/**
 * Modified Z-score (uses median, robust to outliers).
 */
function detectAnomaliesModifiedZ(values, threshold) {
  const med = median(values);
  const absDev = values.map(v => Math.abs(v - med));
  const mad = median(absDev) || 1e-9;
  return values.map((v, i) => {
    const mz = 0.6745 * (v - med) / mad;
    return { index: i, value: v, score: mz, isAnomaly: Math.abs(mz) >= threshold };
  });
}

// ============ TREND ANALYSIS ============

/**
 * Linear regression again, plus change-point detection via CUSUM-lite.
 */
function analyzeTrend(values) {
  const n = values.length;
  if (n < 2) {
    return {
      direction: 'flat',
      slope: 0,
      rSquared: 0,
      changepoints: []
    };
  }
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * i;
    ssTot += (values[i] - yMean) ** 2;
    ssRes += (values[i] - yHat) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  // Direction
  let direction = 'flat';
  if (slope > 0.01 * (Math.abs(yMean) || 1)) direction = 'increasing';
  else if (slope < -0.01 * (Math.abs(yMean) || 1)) direction = 'decreasing';

  // Change-point detection: cumulative sum of deviations from mean
  const cusum = [0];
  for (let i = 0; i < n; i++) cusum.push(cusum[i] + (values[i] - yMean));
  const cusumRange = Math.max(...cusum) - Math.min(...cusum);
  const threshold = 0.5 * stdev(values) * Math.sqrt(n);
  const changepoints = [];
  if (cusumRange > threshold) {
    // Pick the index where cusum is farthest from 0
    let maxAbs = 0, maxIdx = 0;
    for (let i = 0; i < cusum.length; i++) {
      if (Math.abs(cusum[i]) > maxAbs) { maxAbs = Math.abs(cusum[i]); maxIdx = i; }
    }
    const magnitude = maxAbs;
    changepoints.push({ index: maxIdx, magnitude });
  }

  return { direction, slope, rSquared, changepoints };
}

/**
 * Classical decomposition: trend (moving avg) + seasonal + residual.
 */
function decomposeSeries(values, seasonality) {
  const n = values.length;
  const period = detectSeasonalPeriod(seasonality, []) || Math.min(7, Math.floor(n / 2));
  // Centered moving average for trend
  const trend = new Array(n).fill(null);
  if (period > 1 && n >= period) {
    const half = Math.floor(period / 2);
    for (let i = half; i < n - half; i++) {
      let s = 0;
      for (let k = -half; k <= half; k++) s += values[i + k];
      trend[i] = s / (half * 2 + 1);
    }
  }
  // Detrended
  const detrended = values.map((v, i) => trend[i] != null ? v - trend[i] : 0);
  // Seasonal: average of detrended for each position-in-cycle
  const seasonal = new Array(n).fill(0);
  if (period > 1 && n >= period * 2) {
    const buckets = Array.from({ length: period }, () => []);
    for (let i = 0; i < n; i++) {
      if (trend[i] != null) buckets[i % period].push(detrended[i]);
    }
    const seasonalIdx = buckets.map(b => b.length ? mean(b) : 0);
    // Center seasonal so it sums to 0
    const seasonalMean = mean(seasonalIdx);
    for (let i = 0; i < period; i++) seasonalIdx[i] -= seasonalMean;
    for (let i = 0; i < n; i++) seasonal[i] = seasonalIdx[i % period];
  }
  // Residual
  const residual = values.map((v, i) => trend[i] != null ? v - trend[i] - seasonal[i] : 0);
  return { trend, seasonal, residual, period };
}

// ============ DEMAND PREDICTION ============

/**
 * Standard inventory model:
 *   - expectedDemand over lead time = avg_daily_demand * leadTimeDays
 *   - safetyStock = z(serviceLevel) * std_daily_demand * sqrt(leadTimeDays)
 *   - reorderPoint = expectedDemand + safetyStock
 *   - orderUpTo = expectedDemand + safetyStock + buffer
 */
function predictDemand({ historicalDemand, leadTimeDays, currentStock, serviceLevel }) {
  const { values, n } = alignSeries(historicalDemand);
  // Try to compute daily demand; if series is monthly, scale by 30
  // For simplicity we treat the series as per-period demand
  const avgPerPeriod = mean(values);
  const stdPerPeriod = stdev(values);

  // Assume uniform spacing — approximate periods/day using first two timestamps
  let periodsPerDay = 1;
  if (n >= 2) {
    const dt = new Date(historicalDemand[1].t).getTime() - new Date(historicalDemand[0].t).getTime();
    if (dt > 0) periodsPerDay = DAY_MS / dt;
  }
  const dailyAvg = avgPerPeriod * periodsPerDay;
  const dailyStd = stdPerPeriod * Math.sqrt(periodsPerDay);

  // z-score for service level (two-sided)
  const zTable = { 0.80: 0.84, 0.85: 1.04, 0.90: 1.28, 0.95: 1.65, 0.97: 1.88, 0.99: 2.33 };
  const sl = serviceLevel || 0.95;
  const z = zTable[sl] || 1.65;

  const expectedDemand = dailyAvg * leadTimeDays;
  const safetyStock = z * dailyStd * Math.sqrt(leadTimeDays);
  const reorderPoint = expectedDemand + safetyStock;
  const orderUpTo = reorderPoint + safetyStock * 0.5;

  // Stockout probability: P(demand over lead time > currentStock)
  // Approx with normal CDF: P(Z > (currentStock - expectedDemand) / (dailyStd*sqrt(L)))
  const zStock = dailyStd === 0 ? 0 : (currentStock - expectedDemand) / (dailyStd * Math.sqrt(leadTimeDays));
  // Crude normal CDF approximation
  const stockoutProbability = 0.5 * Math.exp(-0.7 * zStock) / (1 + Math.exp(-0.7 * zStock));

  return {
    expectedDemand: Number(expectedDemand.toFixed(2)),
    safetyStock: Number(safetyStock.toFixed(2)),
    reorderPoint: Number(reorderPoint.toFixed(2)),
    orderUpTo: Number(orderUpTo.toFixed(2)),
    stockoutProbability: Number(stockoutProbability.toFixed(4)),
    inputs: {
      leadTimeDays,
      currentStock,
      serviceLevel: sl,
      periodsPerDay: Number(periodsPerDay.toFixed(4)),
      dailyAvg: Number(dailyAvg.toFixed(4)),
      dailyStd: Number(dailyStd.toFixed(4)),
      z
    }
  };
}

// ============ MODEL EVALUATION ============

/**
 * Train on first (1 - testSplit), evaluate on last testSplit, compute MAE/RMSE/MAPE.
 */
function evaluateModel(series, method, testSplit) {
  const { values } = alignSeries(series);
  const split = testSplit != null ? testSplit : 0.2;
  const n = values.length;
  if (n < 5) throw new Error('series must have at least 5 points for evaluation');
  const cutoff = Math.max(2, Math.floor(n * (1 - split)));
  const train = values.slice(0, cutoff);
  const test = values.slice(cutoff);
  const horizon = test.length;
  const result = runForecast(train, horizon, method, 'auto');
  const preds = result.predictions;
  let sumAbs = 0, sumSq = 0, sumPct = 0;
  for (let i = 0; i < horizon; i++) {
    const e = preds[i] - test[i];
    sumAbs += Math.abs(e);
    sumSq += e * e;
    if (test[i] !== 0) sumPct += Math.abs(e / test[i]);
  }
  const mae = sumAbs / horizon;
  const rmse = Math.sqrt(sumSq / horizon);
  const mape = (sumPct / horizon) * 100;
  return {
    method: result.modelInfo.method,
    trainSize: train.length,
    testSize: test.length,
    horizon,
    metrics: {
      MAE: Number(mae.toFixed(4)),
      RMSE: Number(rmse.toFixed(4)),
      MAPE: Number(mape.toFixed(4))
    },
    predictions: preds,
    actuals: test,
    confidence: result.confidence
  };
}

// ============ AUDIT ============

/**
 * Record an entry in the audit log.
 */
function audit(entry) {
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.push(record);
  if (auditLog.length > 10000) auditLog.shift();
  return record;
}

function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

// ============ EXPRESS APP ============

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));

// ============ HEALTH ============

app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    stats: {
      forecastsStored: forecasts.size,
      auditEntries: auditLog.length,
      totalForecastsGenerated,
      totalSeriesProcessed,
      averageHorizon: horizonCount > 0 ? Number((horizonSum / horizonCount).toFixed(2)) : 0
    },
    timestamp: new Date().toISOString()
  });
});

// ============ METHODS METADATA ============

const METHODS = [
  { id: 'auto',         name: 'Auto',           description: 'Automatically picks the best method based on series length and seasonality' },
  { id: 'linear',       name: 'Linear Regression', description: 'Least-squares line fit; good for clear trends, no seasonality' },
  { id: 'ma',           name: 'Moving Average',   description: 'Exponential moving average; good for short, noisy series' },
  { id: 'holt-winters', name: 'Holt-Winters',     description: 'Triple exponential smoothing with trend and seasonal components' },
  { id: 'seasonal',     name: 'Seasonal Naive',   description: 'Repeats the last seasonal cycle, scaled by overall trend' },
  { id: 'ensemble',     name: 'Ensemble',         description: 'Weighted average of linear, moving-average, and seasonal forecasts' }
];

app.get('/api/methods', (req, res) => {
  res.json({ count: METHODS.length, methods: METHODS });
});

// ============ FORECASTING ENDPOINTS ============

/**
 * POST /api/forecast
 * Body: { series: [{t,v}], horizon, method?, seasonality? }
 */
app.post('/api/forecast',requireAuth,  (req, res) => {
  const { series, horizon, method, seasonality } = req.body || {};
  if (!Array.isArray(series) || series.length < 2) {
    return res.status(400).json({ error: 'series must be an array of at least 2 {t,v} points' });
  }
  const h = parseInt(horizon);
  if (!Number.isFinite(h) || h < 1 || h > 365) {
    return res.status(400).json({ error: 'horizon must be an integer between 1 and 365' });
  }
  let values, times, n;
  try {
    ({ values, times, n } = alignSeries(series));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const result = runForecast(values, h, method, seasonality || 'none');
  const id = uuidv4();
  const now = new Date().toISOString();
  // Compute next timestamps by extrapolating the median delta
  let nextT = new Date(times[n - 1]).getTime();
  let delta = DAY_MS;
  if (n >= 2) delta = new Date(times[n - 1]).getTime() - new Date(times[n - 2]).getTime();
  const futureTimes = [];
  for (let i = 0; i < h; i++) {
    const t = new Date(nextT + (i + 1) * delta);
    futureTimes.push(t.toISOString());
  }
  // Confidence interval: ±1.96 * sigma / sqrt(n) growing with horizon
  const sigma = result.modelInfo.residualStd != null
    ? result.modelInfo.residualStd
    : stdev(values) * 0.1;
  const upperBound = result.predictions.map((p, i) => Number((p + 1.96 * sigma * Math.sqrt(i + 1)).toFixed(4)));
  const lowerBound = result.predictions.map((p, i) => Number((p - 1.96 * sigma * Math.sqrt(i + 1)).toFixed(4)));

  const record = {
    id,
    createdAt: now,
    method: method || 'auto',
    seasonality: seasonality || 'none',
    horizon: h,
    inputSize: n,
    predictions: result.predictions,
    upperBound,
    lowerBound,
    futureTimes,
    confidence: result.confidence,
    modelInfo: result.modelInfo,
    createdBy: principalOf(req)
  };
  forecasts.set(id, record);
  totalForecastsGenerated++;
  totalSeriesProcessed++;
  horizonSum += h;
  horizonCount++;
  audit({ op: 'forecast', forecastId: id, method: record.method, horizon: h, principal: principalOf(req), success: true });

  res.status(201).json({
    id,
    method: record.method,
    seasonality: record.seasonality,
    horizon: h,
    confidence: result.confidence,
    predictions: result.predictions.map((v, i) => ({ t: futureTimes[i], v: Number(v.toFixed(4)) })),
    upperBound,
    lowerBound,
    modelInfo: result.modelInfo
  });
});

/**
 * POST /api/forecast/batch
 * Body: { series: [{name?, series, horizon, method?, seasonality?}, ...] }
 */
app.post('/api/forecast/batch',requireAuth,  (req, res) => {
  const items = req.body && req.body.series;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'series (array) is required' });
  }
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    try {
      const { values, n } = alignSeries(it.series || []);
      const h = parseInt(it.horizon);
      if (!Number.isFinite(h) || h < 1 || h > 365) throw new Error('horizon invalid');
      const r = runForecast(values, h, it.method, it.seasonality || 'none');
      const id = uuidv4();
      const record = {
        id, name: it.name || null, createdAt: new Date().toISOString(),
        method: it.method || 'auto', horizon: h, inputSize: n,
        predictions: r.predictions, confidence: r.confidence, modelInfo: r.modelInfo,
        createdBy: principalOf(req)
      };
      forecasts.set(id, record);
      totalForecastsGenerated++;
      totalSeriesProcessed++;
      horizonSum += h;
      horizonCount++;
      results.push({ name: it.name || null, id, method: record.method, confidence: r.confidence, predictions: r.predictions });
    } catch (e) {
      results.push({ name: it.name || null, error: e.message });
    }
  }
  audit({ op: 'forecast-batch', count: items.length, principal: principalOf(req), success: true });
  res.status(201).json({ count: results.length, results });
});

/**
 * GET /api/forecast/:id
 */
app.get('/api/forecast/:id', (req, res) => {
  const f = forecasts.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Forecast not found' });
  res.json({ forecast: f });
});

/**
 * GET /api/forecasts
 */
app.get('/api/forecasts', (req, res) => {
  const list = Array.from(forecasts.values()).map(f => ({
    id: f.id,
    createdAt: f.createdAt,
    method: f.method,
    horizon: f.horizon,
    inputSize: f.inputSize,
    confidence: f.confidence
  }));
  res.json({ count: list.length, forecasts: list });
});

/**
 * DELETE /api/forecast/:id
 */
app.delete('/api/forecast/:id',requireAuth,  (req, res) => {
  const f = forecasts.get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Forecast not found' });
  forecasts.delete(req.params.id);
  audit({ op: 'forecast-delete', forecastId: req.params.id, principal: principalOf(req), success: true });
  res.json({ message: 'Forecast deleted', id: req.params.id });
});

// ============ ANOMALY ENDPOINTS ============

/**
 * POST /api/anomaly/detect
 * Body: { series, threshold?, method? }
 */
app.post('/api/anomaly/detect',requireAuth,  (req, res) => {
  const { series, threshold, method } = req.body || {};
  if (!Array.isArray(series) || series.length < 3) {
    return res.status(400).json({ error: 'series must have at least 3 points' });
  }
  const thr = threshold != null ? Number(threshold) : 2.0;
  const m = method || 'zscore';
  let values, times, n;
  try {
    ({ values, times, n } = alignSeries(series));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  let result;
  if (m === 'iqr') result = detectAnomaliesIQR(values, thr);
  else if (m === 'modified-zscore') result = detectAnomaliesModifiedZ(values, thr);
  else result = detectAnomaliesZScore(values, thr);
  // Attach timestamps
  const points = result.map(r => ({ ...r, t: times[r.index] }));
  const anomalies = points.filter(p => p.isAnomaly);
  audit({ op: 'anomaly-detect', method: m, threshold: thr, points: n, anomalies: anomalies.length, principal: principalOf(req), success: true });
  res.json({
    method: m,
    threshold: thr,
    count: n,
    anomalies: anomalies.length,
    points,
    summary: {
      mean: Number(mean(values).toFixed(4)),
      stdev: Number(stdev(values).toFixed(4))
    }
  });
});

/**
 * POST /api/anomaly/score
 * Body: { history, point, method?, threshold? }
 * Scores a single point against history. `point` is a number or {t,v}.
 */
app.post('/api/anomaly/score',requireAuth,  (req, res) => {
  const { history, point, method, threshold } = req.body || {};
  if (!Array.isArray(history) || history.length < 3) {
    return res.status(400).json({ error: 'history must have at least 3 points' });
  }
  if (point == null) return res.status(400).json({ error: 'point is required' });
  const thr = threshold != null ? Number(threshold) : 2.0;
  const m = method || 'zscore';
  let values, n;
  try {
    ({ values, n } = alignSeries(history));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const v = typeof point === 'number' ? point : Number(point.v);
  if (!Number.isFinite(v)) return res.status(400).json({ error: 'point value must be a number' });

  let score, isAnomaly;
  if (m === 'iqr') {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - thr * iqr;
    const upper = q3 + thr * iqr;
    score = v < lower ? (lower - v) / (iqr || 1) : v > upper ? (v - upper) / (iqr || 1) : 0;
    isAnomaly = v < lower || v > upper;
  } else if (m === 'modified-zscore') {
    const med = median(values);
    const mad = median(values.map(x => Math.abs(x - med))) || 1e-9;
    score = 0.6745 * (v - med) / mad;
    isAnomaly = Math.abs(score) >= thr;
  } else {
    const mu = mean(values);
    const sd = stdev(values) || 1;
    score = (v - mu) / sd;
    isAnomaly = Math.abs(score) >= thr;
  }

  audit({ op: 'anomaly-score', method: m, score, isAnomaly, principal: principalOf(req), success: true });
  res.json({ method: m, value: v, score: Number(score.toFixed(4)), isAnomaly, threshold: thr });
});

// ============ TREND ENDPOINTS ============

/**
 * POST /api/trend
 * Body: { series }
 */
app.post('/api/trend',requireAuth,  (req, res) => {
  const { series } = req.body || {};
  if (!Array.isArray(series) || series.length < 2) {
    return res.status(400).json({ error: 'series must have at least 2 points' });
  }
  let values, times, n;
  try {
    ({ values, times, n } = alignSeries(series));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const trend = analyzeTrend(values);
  audit({ op: 'trend', direction: trend.direction, rSquared: trend.rSquared, points: n, principal: principalOf(req), success: true });
  res.json({ ...trend, points: n, range: { from: times[0], to: times[n - 1] } });
});

/**
 * POST /api/trend/decompose
 * Body: { series, seasonality }
 */
app.post('/api/trend/decompose',requireAuth,  (req, res) => {
  const { series, seasonality } = req.body || {};
  if (!Array.isArray(series) || series.length < 4) {
    return res.status(400).json({ error: 'series must have at least 4 points' });
  }
  let values, times, n;
  try {
    ({ values, times, n } = alignSeries(series));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const decomp = decomposeSeries(values, seasonality || 'daily');
  audit({ op: 'trend-decompose', seasonality: seasonality || 'daily', points: n, principal: principalOf(req), success: true });
  res.json({
    seasonality: seasonality || 'daily',
    period: decomp.period,
    components: {
      trend: decomp.trend,
      seasonal: decomp.seasonal,
      residual: decomp.residual
    },
    times
  });
});

// ============ DEMAND ENDPOINT ============

/**
 * POST /api/demand/predict
 * Body: { historicalDemand, leadTimeDays, currentStock, serviceLevel? }
 */
app.post('/api/demand/predict',requireAuth,  (req, res) => {
  const { historicalDemand, leadTimeDays, currentStock, serviceLevel } = req.body || {};
  if (!Array.isArray(historicalDemand) || historicalDemand.length < 3) {
    return res.status(400).json({ error: 'historicalDemand must have at least 3 points' });
  }
  const L = parseInt(leadTimeDays);
  if (!Number.isFinite(L) || L < 1) return res.status(400).json({ error: 'leadTimeDays must be a positive integer' });
  if (currentStock == null || !Number.isFinite(Number(currentStock))) {
    return res.status(400).json({ error: 'currentStock is required' });
  }
  let result;
  try {
    result = predictDemand({
      historicalDemand,
      leadTimeDays: L,
      currentStock: Number(currentStock),
      serviceLevel: serviceLevel != null ? Number(serviceLevel) : 0.95
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  audit({ op: 'demand-predict', leadTimeDays: L, currentStock, principal: principalOf(req), success: true });
  res.json(result);
});

// ============ EVALUATION ENDPOINT ============

/**
 * POST /api/evaluate
 * Body: { series, method, testSplit? }
 */
app.post('/api/evaluate',requireAuth,  (req, res) => {
  const { series, method, testSplit } = req.body || {};
  if (!Array.isArray(series) || series.length < 5) {
    return res.status(400).json({ error: 'series must have at least 5 points' });
  }
  let result;
  try {
    result = evaluateModel(series, method || 'auto', testSplit != null ? Number(testSplit) : 0.2);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  audit({ op: 'evaluate', method: result.method, principal: principalOf(req), success: true });
  res.json(result);
});

// ============ STATS / AUDIT ============

app.get('/api/stats', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    uptime: process.uptime(),
    totalForecastsGenerated,
    totalSeriesProcessed,
    averageHorizon: horizonCount > 0 ? Number((horizonSum / horizonCount).toFixed(2)) : 0,
    forecastsStored: forecasts.size,
    auditEntries: auditLog.length,
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/audit', (req, res) => {
  let entries = auditLog;
  if (req.query.op) entries = entries.filter(e => e.op === req.query.op);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: entries.length, entries: entries.slice(-limit) });
});

// ============ STARTUP: PRE-SEED FORECAST ============
//
// Seed one example forecast using a 90-day sinusoidal series and Holt-Winters.

function seed() {
  const series = [];
  for (let i = 0; i < 90; i++) {
    const day = new Date(Date.now() - (89 - i) * DAY_MS);
    // Sinusoidal pattern with weekly seasonality + slight trend
    const trend = 100 + i * 0.3;
    const seasonal = 15 * Math.sin((2 * Math.PI * i) / 7);
    const noise = (Math.random() - 0.5) * 4;
    series.push({ t: day.toISOString().slice(0, 10), v: Number((trend + seasonal + noise).toFixed(2)) });
  }
  const { values } = alignSeries(series);
  const horizon = 14;
  const result = forecastHoltWinters(values, horizon, 7);
  const id = uuidv4();
  const now = new Date().toISOString();
  let nextT = new Date(series[series.length - 1].t).getTime();
  const futureTimes = [];
  for (let i = 0; i < horizon; i++) {
    futureTimes.push(new Date(nextT + (i + 1) * DAY_MS).toISOString().slice(0, 10));
  }
  const sigma = result.modelInfo.residualStd;
  const upperBound = result.predictions.map((p, i) => Number((p + 1.96 * sigma * Math.sqrt(i + 1)).toFixed(4)));
  const lowerBound = result.predictions.map((p, i) => Number((p - 1.96 * sigma * Math.sqrt(i + 1)).toFixed(4)));
  forecasts.set(id, {
    id,
    name: 'example-90d-sinusoidal',
    createdAt: now,
    method: 'holt-winters',
    seasonality: 'daily',
    horizon,
    inputSize: series.length,
    series,
    predictions: result.predictions,
    upperBound,
    lowerBound,
    futureTimes,
    confidence: result.confidence,
    modelInfo: result.modelInfo,
    createdBy: 'system-seed'
  });
  totalForecastsGenerated++;
  totalSeriesProcessed++;
  horizonSum += horizon;
  horizonCount++;
  audit({ op: 'seed-forecast', forecastId: id, method: 'holt-winters', horizon, principal: 'system', success: true });
  console.log(`[${SERVICE_NAME}] seeded example forecast ${id} (90d sinusoidal, Holt-Winters)`);
}

// Run seed immediately
seed();

// ============ ERROR HANDLERS ============

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Named exports for vitest
module.exports = app;
module.exports.seedData = seed;
module.exports.seed = seed;

// Auto-start gated
if (process.env.PREDICTIVE_INTELLIGENCE_NO_LISTEN !== '1' && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
    console.log(`[${SERVICE_NAME}] methods: ${METHODS.map(m => m.id).join(', ')}`);
  });
  installGracefulShutdown(server);
}
