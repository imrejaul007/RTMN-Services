/**
 * Health connector — pure functions
 *
 * The health-connector service is the entry point for all health data flowing
 * into the Personal Intelligence OS. It supports 5 data sources (Apple Health,
 * Google Fit, Whoop, Oura, manual) but **all processing happens here, in
 * pure functions, so it can be tested without any external API**.
 *
 * Storage: PersistentMap. Per-user namespace.
 *
 * Privacy principles (mirroring PHASE-5-LIFE-OS-INTEGRATION.md):
 *   - Default OFF (every source is opt-in)
 *   - Read-only by default (manual writes are explicit)
 *   - On-device processing preferred (this service stores aggregates, not raw streams)
 *   - Every read/write is audit-logged via memory-substrate (handled by the runtime)
 *   - Disconnect = full data deletion (handled by DELETE endpoint)
 */

// ---------- source registry ----------

/**
 * The 5 supported sources. Real production would dispatch to provider-specific
 * clients; here we treat them as opaque source identifiers so the rest of the
 * service is provider-agnostic.
 */
export const SOURCES = Object.freeze({
  APPLE_HEALTH: 'apple_health',
  GOOGLE_FIT:   'google_fit',
  WHOOP:        'whoop',
  OURA:         'oura',
  MANUAL:       'manual',
});

export const SOURCE_LIST = Object.values(SOURCES);

/**
 * What metrics each source provides. Used to validate incoming payloads and to
 * tell the UI which fields are available when the user enables a source.
 */
export const SOURCE_METRICS = Object.freeze({
  [SOURCES.APPLE_HEALTH]: ['steps', 'sleep_minutes', 'heart_rate', 'hrv', 'workouts', 'mindful_minutes'],
  [SOURCES.GOOGLE_FIT]:   ['steps', 'sleep_minutes', 'workouts'],
  [SOURCES.WHOOP]:        ['recovery_score', 'strain', 'sleep_minutes', 'workouts'],
  [SOURCES.OURA]:         ['readiness_score', 'sleep_minutes', 'activity_score'],
  [SOURCES.MANUAL]:       ['mood', 'energy', 'food', 'water_ml', 'notes'],
});

// ---------- normalization ----------

/**
 * Coerce any incoming reading into our standard shape. The provider adapters
 * (Apple Health, Google Fit, etc.) produce different field names; we normalize
 * here so downstream services (correlation engine, predictive nudges) can rely
 * on a stable schema.
 *
 * Required input fields: source, metric, value, takenAt
 * Optional: unit, note
 */
export function normalizeReading(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Reading must be an object');
  }
  const source = input.source;
  const metric = input.metric;
  if (!source || !SOURCE_LIST.includes(source)) {
    throw new Error(`Unknown source: ${source}`);
  }
  if (!metric || !SOURCE_METRICS[source].includes(metric)) {
    throw new Error(`Metric ${metric} not supported by source ${source}`);
  }
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    throw new Error(`Value must be a finite number, got ${input.value}`);
  }
  const takenAt = input.takenAt || new Date().toISOString();
  const ts = Date.parse(takenAt);
  if (Number.isNaN(ts)) {
    throw new Error(`takenAt must be a valid date, got ${takenAt}`);
  }
  return {
    source,
    metric,
    value,
    unit: input.unit || defaultUnit(metric),
    takenAt,
    note: input.note || null,
  };
}

function defaultUnit(metric) {
  if (metric === 'steps') return 'count';
  if (metric === 'sleep_minutes') return 'min';
  if (metric === 'workouts') return 'count';
  if (metric === 'mindful_minutes') return 'min';
  if (metric === 'heart_rate') return 'bpm';
  if (metric === 'hrv') return 'ms';
  if (metric === 'water_ml') return 'ml';
  if (metric === 'recovery_score' || metric === 'readiness_score' || metric === 'activity_score') return 'score';
  if (metric === 'strain') return 'strain';
  if (metric === 'mood' || metric === 'energy') return '0-10';
  return '';
}

// ---------- aggregation ----------

/**
 * Aggregate readings into a daily summary. The summary is what the correlation
 * engine sees — not the raw stream. Aggregates are timezone-naive (we bucket by
 * the date portion of takenAt, which is the user's local date).
 *
 * Returned shape:
 *   { date: 'YYYY-MM-DD', metrics: { steps: 8500, sleep_minutes: 420, ... } }
 */
export function dailySummary(readings, dateStr) {
  const target = dateStr || new Date().toISOString().slice(0, 10);
  const totals = {};
  let count = 0;
  for (const r of readings || []) {
    const readingDate = (r.takenAt || '').slice(0, 10);
    if (readingDate !== target) continue;
    const m = r.metric;
    if (m === 'mood' || m === 'energy' || m === 'recovery_score' || m === 'readiness_score' || m === 'activity_score') {
      // Scores are averaged, not summed.
      if (!totals[m]) totals[m] = { sum: 0, n: 0 };
      totals[m].sum += r.value;
      totals[m].n += 1;
    } else {
      totals[m] = (totals[m] || 0) + r.value;
    }
    count += 1;
  }
  const metrics = {};
  for (const [k, v] of Object.entries(totals)) {
    metrics[k] = v && typeof v === 'object' ? Math.round((v.sum / v.n) * 100) / 100 : Math.round(v * 100) / 100;
  }
  return { date: target, metrics, readingCount: count };
}

/**
 * Last N days of daily summaries. Returns oldest-first so callers can chart
 * trends without reversing.
 */
export function weeklyTrend(readings, days = 7) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    out.push(dailySummary(readings, dateStr));
  }
  return out;
}

// ---------- correlation (the "Genie learns from your body" piece) ----------

/**
 * Compute Pearson correlation between two equal-length numeric series.
 * Returns null if undefined or if all values are identical (zero variance).
 * Range: -1 to 1.
 *
 * Why we ship our own: the correlation engine is a tiny pure function and
 * pulling in a stats library is overkill. Tests cover it directly.
 */
export function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
    return null;
  }
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = xs[i] - meanX;
    const ey = ys[i] - meanY;
    num += ex * ey;
    dx += ex * ex;
    dy += ey * ey;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return null;
  return Math.round((num / denom) * 10000) / 10000;
}

/**
 * Find simple correlations between mood/energy and other metrics across the
 * last N days. Used by the correlation engine to surface insights like
 * "your mood is highest on days you sleep > 7.5h".
 *
 * Returns only correlations stronger than |threshold| (default 0.5).
 */
export function findCorrelations(readings, days = 14, threshold = 0.5) {
  const trend = weeklyTrend(readings, days);
  const mood = trend.map((d) => d.metrics.mood).filter((v) => v !== undefined);
  const energy = trend.map((d) => d.metrics.energy).filter((v) => v !== undefined);
  const candidates = ['steps', 'sleep_minutes', 'workouts', 'recovery_score', 'mindful_minutes'];
  const out = [];
  for (const metric of candidates) {
    const series = trend.map((d) => d.metrics[metric] || 0);
    if (mood.length >= 3) {
      const r = pearson(mood, series.slice(-mood.length));
      if (r !== null && Math.abs(r) >= threshold) {
        out.push({ driver: 'mood', target: metric, r, days: mood.length });
      }
    }
    if (energy.length >= 3) {
      const r = pearson(energy, series.slice(-energy.length));
      if (r !== null && Math.abs(r) >= threshold) {
        out.push({ driver: 'energy', target: metric, r, days: energy.length });
      }
    }
  }
  return out;
}

// ---------- predictive nudges ----------

/**
 * The "your productivity drops 40% on day 4" style nudges from the Phase 5
 * doc. Pure functions — the runtime decides whether to surface them, the
 * connector just generates the candidates.
 */
export function nudgeForSleepDebt(trend) {
  let debtDays = 0;
  for (let i = trend.length - 1; i >= 0; i--) {
    const sleep = trend[i].metrics.sleep_minutes;
    if (sleep !== undefined && sleep < 360) debtDays += 1; // < 6h
    else break;
  }
  if (debtDays >= 3) {
    return {
      kind: 'sleep_debt',
      severity: debtDays >= 5 ? 'high' : 'medium',
      message: `You've slept under 6 hours ${debtDays} nights in a row. Want me to block your calendar tomorrow morning for recovery?`,
    };
  }
  return null;
}

export function nudgeForWorkoutGoal(trend, weeklyTargetKm = 12) {
  // Sum "workouts" as a proxy (real impl would convert to km). The point of
  // this function in the connector layer is the *shape* of the nudge, not
  // the unit conversion.
  const total = trend.reduce((acc, d) => acc + (d.metrics.workouts || 0), 0);
  if (total < weeklyTargetKm / 4) {
    return {
      kind: 'workout_budget',
      severity: 'low',
      message: `You're ${Math.round(weeklyTargetKm - total)} workouts behind this week's goal. Should I find a plan?`,
    };
  }
  return null;
}

// ---------- opt-in registry ----------

/**
 * Per-user opt-in. Stored as `enabledSources: string[]`. The runtime layer
 * reads this before pulling data; the connector itself just stores the
 * preference.
 */
export function isSourceEnabled(prefs, source) {
  if (!prefs || !Array.isArray(prefs.enabledSources)) return false;
  return prefs.enabledSources.includes(source);
}

export function defaultPrefs() {
  return {
    enabledSources: [],
    // Write access is opt-in per source. Default false.
    writeEnabled: {},
    // Daily digest time (UTC hour). 8 = 8am UTC. Runtime can localize.
    digestHourUtc: 8,
  };
}

/**
 * Toggle a source on/off. Returns a new prefs object — we don't mutate.
 */
export function setSourceEnabled(prefs, source, enabled) {
  if (!SOURCE_LIST.includes(source)) {
    throw new Error(`Unknown source: ${source}`);
  }
  const base = prefs || defaultPrefs();
  const current = new Set(base.enabledSources || []);
  if (enabled) current.add(source);
  else current.delete(source);
  return { ...base, enabledSources: Array.from(current) };
}
