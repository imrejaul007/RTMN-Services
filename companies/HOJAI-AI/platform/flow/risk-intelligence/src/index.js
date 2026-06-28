/**
 * RTMN Risk Intelligence v1.0
 *
 * Cross-domain risk scoring engine for the HOJAI AI Intelligence Cloud.
 * Covers fraud, churn, and credit risk — the three risk dimensions that
 * the rest of the RTMN ecosystem routinely needs to query.
 *
 * This is the standalone "Risk Intelligence" module from
 * HOJAI AI Division 3 (Intelligence Cloud). It is intentionally
 * separate from the customer-specific riskScoring.ts that lives in
 * `customer-intelligence` (port 4885); that one is narrow
 * (churn on a known customer base), this one is broad
 * (any entity, any risk type).
 *
 * Design notes:
 *   - Pure CommonJS, no TypeScript, no ML framework.
 *   - All math done with built-in `Math` (sigmoid, logistic, linear
 *     combinations, weighted sums).
 *   - In-memory Maps for rule weights and the audit log.
 *   - Rule weights are mutable so callers can A/B test models.
 *
 * @author HOJAI AI - Intelligence Cloud Division
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

const PORT = process.env.PORT || 4755;
const SERVICE_NAME = 'risk-intelligence';

// Auth bypass for testing
const REQUIRE_AUTH = (process.env.RISK_INTELLIGENCE_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const authOrBypass = (req, res, next) => REQUIRE_AUTH ? requireAuth(req, res, next) : next();

// ============ IN-MEMORY STORAGE ============

/**
 * Fraud rule weights — input feature name -> weight in the linear
 * combination. Also the "model" we expose via /api/fraud/rules.
 * @type {Map<string, number>}
 */
const fraudRules = new PersistentMap('fraud-rules', { serviceName: 'risk-intelligence' });

/**
 * Churn feature weights — input feature name -> weight in the
 * logistic regression. Higher weight = stronger churn signal.
 * @type {Map<string, number>}
 */
const churnRules = new PersistentMap('churn-rules', { serviceName: 'risk-intelligence' });

/**
 * Credit scoring weights — input feature name -> weight in the
 * weighted FICO-like scale.
 * @type {Map<string, number>}
 */
const creditRules = new PersistentMap('credit-rules', { serviceName: 'risk-intelligence' });

/**
 * Risk-level thresholds — score/value -> level label.
 * Stored as a plain object so we can re-patch it wholesale.
 */
let thresholds = {
  // fraud score 0-100
  fraud: { low: 30, medium: 60, high: 85 },
  // churn probability 0-1
  churn: { low: 0.2, medium: 0.5, high: 0.75 },
  // credit score 300-850 (higher = better)
  credit: { decline: 580, review: 670 },
  // composite score 0-100
  composite: { low: 30, medium: 60, high: 80 }
};

/**
 * Composite risk weights — how much each risk type contributes
 * to the unified composite score.
 */
let compositeWeights = {
  fraud: 0.4,
  churn: 0.3,
  credit: 0.3
};

/**
 * Append-only audit log of every risk decision the service
 * has produced. Bounded in size for the in-memory stub.
 * @type {Array<object>}
 */
const auditLog = [];

// ============ DEFAULT MODELS ============
//
// Seeded rule weights based on a rough "industry-standard" prior.
// These are intentionally simple so they are easy to reason
// about and to A/B test against.

function seedDefaultRules() {
  const defaults = {
    fraud: {
      // Higher = more risky. Sigmoid squashing at the end keeps
      // the final score in [0, 100].
      amount: 0.18,             // raw dollar amount
      merchantCategoryRisk: 0.22,// pre-normalized 0-1 category risk
      countryRisk: 0.20,        // pre-normalized 0-1 country risk
      ipRiskScore: 0.30,        // 0-1 from upstream IP intel
      velocityLast1h: 0.10,     // tx count in last hour
      velocityLast24h: 0.08,    // tx count in last day
      accountAge: -0.08,        // NEGATIVE — older accounts are safer
      priorFraudFlags: 0.45     // strong prior signal
    },
    churn: {
      // Higher = more likely to churn. Logistic at the end.
      tenure: -0.12,            // NEGATIVE — longer tenure = stickier
      lastLoginDays: 0.22,      // larger = more churn risk
      monthlyActiveDays: -0.25, // NEGATIVE — more activity = stickier
      supportTicketsLast90d: 0.14,
      npsScore: -0.28,          // NEGATIVE — detractors churn more
      paymentFailures: 0.30,
      planTier: -0.10,          // NEGATIVE — higher tier = stickier
      featureAdoption: -0.18,   // NEGATIVE — more adoption = stickier
      competitorSignals: 0.32  // strong positive signal
    },
    credit: {
      // Higher credit score = lower risk. Weights tuned so the
      // final score lands in the 300-850 FICO-like range.
      monthlyIncome: 0.18,
      debtToIncome: -0.32,      // NEGATIVE — more DTI = riskier
      creditHistoryYears: 0.20,
      priorDefaults: -0.40,     // strong NEGATIVE
      employmentType: 0.12,     // salaried > freelance, etc
      requestedAmount: -0.08,   // larger request = slightly riskier
      termMonths: -0.05
    }
  };

  for (const [k, v] of Object.entries(defaults.fraud)) fraudRules.set(k, v);
  for (const [k, v] of Object.entries(defaults.churn)) churnRules.set(k, v);
  for (const [k, v] of Object.entries(defaults.credit)) creditRules.set(k, v);
}

seedDefaultRules();

// ============ HELPERS ============

/**
 * Standard logistic sigmoid. Maps R -> (0, 1).
 * Clamped to avoid overflow at extreme x.
 * @param {number} x
 * @returns {number}
 */
function sigmoid(x) {
  if (x > 50) return 0.9999999;
  if (x < -50) return 0.0000001;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Clamp helper.
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Map a fraud score (0-100) to a level + recommendation.
 */
function fraudLevelFromScore(score) {
  const t = thresholds.fraud;
  if (score >= t.high) return { level: 'critical', recommendation: 'block' };
  if (score >= t.medium) return { level: 'high', recommendation: 'review' };
  if (score >= t.low) return { level: 'medium', recommendation: 'review' };
  return { level: 'low', recommendation: 'allow' };
}

/**
 * Map a churn probability to a tier.
 */
function churnLevelFromProb(p) {
  const t = thresholds.churn;
  if (p >= t.high) return { riskTier: 'high' };
  if (p >= t.medium) return { riskTier: 'medium' };
  if (p >= t.low) return { riskTier: 'low' };
  return { riskTier: 'low' };
}

/**
 * Map a credit score to a decision.
 */
function creditDecisionFromScore(score) {
  const t = thresholds.credit;
  if (score < t.decline) return { decision: 'decline' };
  if (score < t.review) return { decision: 'review' };
  return { decision: 'approve' };
}

/**
 * Pick the top-N contributing factors from a feature/weight map.
 * @param {object} features
 * @param {Map<string, number>} weights
 * @param {number} n
 */
function topFactors(features, weights, n = 3) {
  const contributions = [];
  for (const [k, weight] of weights.entries()) {
    const fv = Number(features[k]);
    if (!Number.isFinite(fv)) continue;
    contributions.push({ feature: k, weight, value: fv, contribution: fv * weight });
  }
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return contributions.slice(0, n);
}

/**
 * Look up a pre-normalized risk score for a merchant category.
 * Real production would back this with a lookup table / DB.
 */
function merchantCategoryRisk(category) {
  const map = {
    electronics: 0.55,
    jewelry: 0.75,
    travel: 0.50,
    gambling: 0.95,
    crypto: 0.90,
    digital_goods: 0.65,
    grocery: 0.20,
    fuel: 0.30,
    restaurant: 0.25,
    apparel: 0.40,
    subscription: 0.35,
    other: 0.40
  };
  return map[category] != null ? map[category] : 0.45;
}

/**
 * Pre-normalized country risk. Real production would back this
 * with an up-to-date sanctions / fraud-rate feed.
 */
function countryRisk(country) {
  const high = ['XX', 'YY']; // placeholder high-risk codes
  const med = ['IR', 'KP', 'SY', 'CU'];
  if (!country) return 0.30;
  if (high.includes(country)) return 0.95;
  if (med.includes(country)) return 0.75;
  if (['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'SG', 'AE', 'IN'].includes(country)) return 0.15;
  return 0.45;
}

/**
 * Encode an employment type into a 0-1 stability score.
 */
function employmentStability(t) {
  const map = {
    salaried: 0.95,
    government: 0.95,
    self_employed: 0.60,
    freelance: 0.50,
    gig: 0.35,
    student: 0.30,
    unemployed: 0.10,
    retired: 0.70
  };
  return map[t] != null ? map[t] : 0.50;
}

/**
 * Build a feature vector from a raw input. Keeps the model
 * weights stable even if the caller omits fields.
 */
function buildFraudFeatures(transaction, context) {
  const amount = Number(transaction && transaction.amount) || 0;
  const merchantCategory = (transaction && transaction.merchantCategory) || 'other';
  const country = (transaction && transaction.country) || '';
  const deviceFingerprint = (context && context.deviceFingerprint) || '';
  const ipRiskScore = clamp(Number(context && context.ipRiskScore) || 0, 0, 1);
  const velocityLast1h = Number(context && context.velocityLast1h) || 0;
  const velocityLast24h = Number(context && context.velocityLast24h) || 0;
  const accountAge = Number(context && context.accountAge) || 0;
  const priorFraudFlags = Number(context && context.priorFraudFlags) || 0;

  // Normalize amount to 0-1 using a soft log scale — $10k is "high",
  // $1M is "extreme" but not 100x worse.
  const amountNorm = clamp(Math.log10(amount + 1) / 5, 0, 1); // log10(100k+)=5
  // Velocity: cap so 50/hr or 200/day saturate.
  const v1 = clamp(velocityLast1h / 50, 0, 1);
  const v24 = clamp(velocityLast24h / 200, 0, 1);
  // Account age in years, cap at 5.
  const ageYears = clamp(accountAge / 365 / 5, 0, 1);
  // Prior flags cap at 3.
  const priorNorm = clamp(priorFraudFlags / 3, 0, 1);

  return {
    amount: amountNorm,
    merchantCategoryRisk: merchantCategoryRisk(merchantCategory),
    countryRisk: countryRisk(country),
    ipRiskScore,
    velocityLast1h: v1,
    velocityLast24h: v24,
    accountAge: ageYears,
    priorFraudFlags: priorNorm,
    _raw: {
      amount,
      merchantCategory,
      country,
      deviceFingerprint: deviceFingerprint ? deviceFingerprint.slice(0, 8) + '…' : '',
      ipRiskScore,
      velocityLast1h,
      velocityLast24h,
      accountAge,
      priorFraudFlags
    }
  };
}

/**
 * Build a churn feature vector.
 */
function buildChurnFeatures(features) {
  const f = features || {};
  const tenure = clamp(Number(f.tenure) || 0, 0, 3650) / 365; // years, cap 10
  const lastLoginDays = clamp(Number(f.lastLoginDays) || 0, 0, 365) / 90; // 0-1 over 90d
  const monthlyActiveDays = clamp(Number(f.monthlyActiveDays) || 0, 0, 30) / 30; // 0-1
  const supportTicketsLast90d = clamp(Number(f.supportTicketsLast90d) || 0, 0, 20) / 10;
  const npsScore = clamp((Number(f.npsScore) || 0 + 100) / 200, 0, 1); // -100..100 -> 0..1
  const paymentFailures = clamp(Number(f.paymentFailures) || 0, 0, 10) / 5;
  const planTierMap = { free: 0, starter: 0.3, pro: 0.6, enterprise: 1.0 };
  const planTier = planTierMap[f.planTier] != null ? planTierMap[f.planTier] : 0.4;
  const featureAdoption = clamp(Number(f.featureAdoption) || 0, 0, 1);
  const competitorSignals = clamp(Number(f.competitorSignals) || 0, 0, 5) / 5;

  return {
    tenure,
    lastLoginDays,
    monthlyActiveDays,
    supportTicketsLast90d,
    npsScore,
    paymentFailures,
    planTier,
    featureAdoption,
    competitorSignals
  };
}

/**
 * Build a credit feature vector.
 */
function buildCreditFeatures(applicant) {
  const a = applicant || {};
  // monthlyIncome in thousands, cap 50k -> 1
  const monthlyIncome = clamp(Number(a.monthlyIncome) || 0, 0, 50000) / 50000;
  // debtToIncome 0-1, already in 0-1 ideally
  const debtToIncome = clamp(Number(a.debtToIncome) || 0, 0, 1);
  // creditHistoryYears cap 30
  const creditHistoryYears = clamp(Number(a.creditHistoryYears) || 0, 0, 30) / 30;
  // priorDefaults cap 5
  const priorDefaults = clamp(Number(a.priorDefaults) || 0, 0, 5) / 5;
  // employmentType -> 0-1 stability
  const employmentType = employmentStability(a.employmentType);
  // requestedAmount in $thousands, cap $100k -> 1
  const requestedAmount = clamp(Number(a.requestedAmount) || 0, 0, 100000) / 100000;
  // termMonths cap 60
  const termMonths = clamp(Number(a.termMonths) || 0, 0, 60) / 60;

  return {
    monthlyIncome,
    debtToIncome,
    creditHistoryYears,
    priorDefaults,
    employmentType,
    requestedAmount,
    termMonths
  };
}

// ============ CORE SCORING ============

/**
 * Score a transaction for fraud.
 * Algorithm: weighted linear combination -> sigmoid -> 0-100.
 */
function scoreFraud(transaction, context) {
  const features = buildFraudFeatures(transaction, context);
  let z = 0;
  for (const [k, w] of fraudRules.entries()) {
    const fv = Number(features[k]);
    if (Number.isFinite(fv)) z += fv * w;
  }
  // Map sigmoid to 0-100.
  const score = clamp(sigmoid(z) * 100, 0, 100);
  const { level, recommendation } = fraudLevelFromScore(score);
  const factors = topFactors(features, fraudRules, 3);

  return {
    score: Math.round(score * 100) / 100,
    level,
    recommendation,
    factors,
    raw: features._raw,
    inputs: { transaction, context }
  };
}

/**
 * Score a customer for churn probability.
 * Algorithm: weighted linear combination -> logistic.
 */
function scoreChurn(features) {
  const f = buildChurnFeatures(features);
  let z = 0;
  for (const [k, w] of churnRules.entries()) {
    const v = Number(f[k]);
    if (Number.isFinite(v)) z += v * w;
  }
  const churnProbability = sigmoid(z);
  const { riskTier } = churnLevelFromProb(churnProbability);
  // Expected days to churn — heuristic. Higher probability and
  // higher lastLoginDays -> sooner.
  const lastLoginDays = Number(features && features.lastLoginDays) || 0;
  const tenureDays = Number(features && features.tenure) || 0;
  // 7 days at p=1.0, 365 days at p=0.05, capped at 730
  let expectedChurnDays = Math.round(7 + (1 - churnProbability) * 360);
  if (lastLoginDays > 60) expectedChurnDays = Math.min(expectedChurnDays, 30);
  if (tenureDays > 365 * 3) expectedChurnDays = Math.max(expectedChurnDays, 90);

  let recommendedAction = 'monitor';
  if (riskTier === 'high') recommendedAction = 'outreach_within_7_days';
  else if (riskTier === 'medium') recommendedAction = 'in_app_engagement_campaign';

  const factors = topFactors(f, churnRules, 3);

  return {
    churnProbability: Math.round(churnProbability * 10000) / 10000,
    riskTier,
    expectedChurnDays,
    recommendedAction,
    factors
  };
}

/**
 * Score a credit applicant. Returns a FICO-like 300-850 score,
 * a decision, and a suggested approved amount + interest rate.
 */
function scoreCredit(applicant) {
  const f = buildCreditFeatures(applicant);
  // FICO-like scale: start at 300, weight * 550 spread.
  // We assume each weight is tuned so the linear sum roughly
  // lands in [0, 1] for an "average" applicant.
  let raw = 0;
  for (const [k, w] of creditRules.entries()) {
    const v = Number(f[k]);
    if (Number.isFinite(v)) raw += v * w;
  }
  // Sigmoid squash raw into [0,1] and scale to FICO 300-850.
  const norm = sigmoid(raw);
  const creditScore = Math.round(300 + norm * 550);

  const { decision } = creditDecisionFromScore(creditScore);
  const requestedAmount = Number(applicant && applicant.requestedAmount) || 0;
  const termMonths = Number(applicant && applicant.termMonths) || 0;

  let approvedAmount = 0;
  let interestRate = 0;
  let pd = 0; // probability of default

  if (decision === 'approve') {
    approvedAmount = requestedAmount;
    // Lower score -> higher rate. 5% at 850, 25% at 670.
    interestRate = Math.round((5 + (850 - creditScore) / 9) * 100) / 100;
    pd = Math.round((1 - norm) * 0.15 * 10000) / 10000; // capped at 15%
  } else if (decision === 'review') {
    approvedAmount = Math.round(requestedAmount * 0.5);
    interestRate = Math.round((15 + (670 - creditScore) / 5) * 100) / 100;
    pd = Math.round((1 - norm) * 0.30 * 10000) / 10000;
  } else {
    approvedAmount = 0;
    interestRate = 0;
    pd = Math.round((1 - norm) * 0.50 * 10000) / 10000;
  }

  const factors = topFactors(f, creditRules, 3);

  return {
    creditScore,
    decision,
    approvedAmount,
    interestRate,
    pd,
    termMonths,
    requestedAmount,
    factors
  };
}

/**
 * Combine multiple risk types into a single composite score.
 * Accepts a map of {fraud?, churn?, credit?} partial scores.
 */
function compositeScore(partials) {
  let total = 0;
  let totalWeight = 0;
  const breakdown = {};

  if (partials.fraud != null) {
    const w = compositeWeights.fraud || 0;
    // fraud is 0-100; normalize to 0-1
    const normalized = clamp(Number(partials.fraud) / 100, 0, 1);
    total += normalized * 100 * w;
    totalWeight += w;
    breakdown.fraud = { score: partials.fraud, weight: w, contribution: normalized * 100 * w };
  }
  if (partials.churn != null) {
    const w = compositeWeights.churn || 0;
    // churn is 0-1
    const normalized = clamp(Number(partials.churn), 0, 1);
    total += normalized * 100 * w;
    totalWeight += w;
    breakdown.churn = { probability: partials.churn, weight: w, contribution: normalized * 100 * w };
  }
  if (partials.credit != null) {
    const w = compositeWeights.credit || 0;
    // credit: 300-850. Invert so "low score" = high risk.
    const cs = Number(partials.credit);
    const normalized = clamp(1 - (cs - 300) / 550, 0, 1);
    total += normalized * 100 * w;
    totalWeight += w;
    breakdown.credit = { creditScore: cs, weight: w, contribution: normalized * 100 * w };
  }

  if (totalWeight === 0) {
    return { score: 0, level: 'low', breakdown, error: 'no risk types provided' };
  }

  const score = Math.round(total / totalWeight * 100) / 100;
  const t = thresholds.composite;
  let level = 'low';
  if (score >= t.high) level = 'critical';
  else if (score >= t.medium) level = 'high';
  else if (score >= t.low) level = 'medium';

  return { score, level, breakdown };
}

// ============ AUDIT ============

/**
 * Append a record to the audit log.
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

// ============ SEED EXAMPLES ============
//
// Pre-populate the audit log with a few representative decisions
// so the dashboard isn't empty on first boot.

(function seedAudit() {
  // 1. A low-risk transaction.
  audit({
    riskType: 'fraud',
    entityType: 'transaction',
    entityId: 'seed-tx-0001',
    decision: 'allow',
    score: 18.42,
    level: 'low',
    principal: 'system:seed',
    note: 'low-risk $42 grocery purchase, US, low velocity'
  });
  // 2. A high-risk fraud block.
  audit({
    riskType: 'fraud',
    entityType: 'transaction',
    entityId: 'seed-tx-0002',
    decision: 'block',
    score: 92.7,
    level: 'critical',
    principal: 'system:seed',
    note: '$8,500 electronics, high-risk IP, 12 prior flags, account 2 days old'
  });
  // 3. A borderline churn.
  audit({
    riskType: 'churn',
    entityType: 'customer',
    entityId: 'seed-cust-0001',
    decision: 'review',
    churnProbability: 0.54,
    level: 'medium',
    principal: 'system:seed',
    note: '180-day tenure, 14 days since last login, 1 payment failure, 2 support tickets'
  });
})();

// ============ EXPRESS APP ============

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

// ============ HEALTH ============

app.get('/health', (req, res) => res.redirect(301, '/api/health'));

app.get('/api/health', (req, res) => {
  // distribution snapshot
  const dist = { low: 0, medium: 0, high: 0, critical: 0 };
  let totalScore = 0;
  let n = 0;
  for (const e of auditLog) {
    if (e.riskType !== 'fraud') continue;
    if (e.level && dist[e.level] != null) dist[e.level]++;
    if (Number.isFinite(e.score)) {
      totalScore += e.score;
      n++;
    }
  }
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    division: 'HOJAI AI - Intelligence Cloud',
    stats: {
      fraudRules: fraudRules.size,
      churnRules: churnRules.size,
      creditRules: creditRules.size,
      auditEntries: auditLog.length,
      fraudLevelDistribution: dist,
      avgFraudScore: n ? Math.round(totalScore / n * 100) / 100 : 0
    },
    timestamp: new Date().toISOString()
  });
});

// ============ FRAUD ============

/**
 * POST /api/fraud/score
 * Body: { transaction: {amount, merchantCategory, country}, context: {deviceFingerprint, ipRiskScore, velocityLast1h, velocityLast24h, accountAge, priorFraudFlags} }
 */
app.post('/api/fraud/score',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  if (!body.transaction) {
    return res.status(400).json({ error: 'transaction object is required' });
  }
  const result = scoreFraud(body.transaction, body.context || {});
  const record = audit({
    riskType: 'fraud',
    entityType: 'transaction',
    entityId: body.transaction.id || ('tx-' + uuidv4().slice(0, 8)),
    decision: result.recommendation,
    score: result.score,
    level: result.level,
    principal: req.headers['x-actor'] || 'anonymous',
    topFactor: result.factors[0] ? result.factors[0].feature : null
  });
  res.json({ id: record.id, ...result, auditedAt: record.timestamp });
});

/**
 * POST /api/fraud/score/batch
 * Body: { items: [{transaction, context}, ...] }
 */
app.post('/api/fraud/score/batch',requireAuth, authOrBypass, (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
  if (!items) return res.status(400).json({ error: 'items (array) is required' });
  if (items.length > 500) return res.status(400).json({ error: 'max 500 items per batch' });

  const results = items.map((it) => {
    const r = scoreFraud(it.transaction || {}, it.context || {});
    const rec = audit({
      riskType: 'fraud',
      entityType: 'transaction',
      entityId: (it.transaction && it.transaction.id) || ('tx-' + uuidv4().slice(0, 8)),
      decision: r.recommendation,
      score: r.score,
      level: r.level,
      principal: req.headers['x-actor'] || 'anonymous',
      batch: true
    });
    return { id: rec.id, ...r };
  });

  res.json({ count: results.length, results });
});

/**
 * GET /api/fraud/rules
 * Returns the current fraud model weights.
 */
app.get('/api/fraud/rules', (req, res) => {
  const weights = {};
  for (const [k, v] of fraudRules.entries()) weights[k] = v;
  res.json({
    model: 'fraud-linear-sigmoid',
    version: 1,
    weights,
    thresholds: thresholds.fraud
  });
});

/**
 * PATCH /api/fraud/rules
 * Body: { weights: {feature: weight, ...} } or { thresholds: {low, medium, high} }
 * Updates the active fraud model (A/B testing).
 */
app.patch('/api/fraud/rules',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const updated = [];
  if (body.weights && typeof body.weights === 'object') {
    for (const [k, v] of Object.entries(body.weights)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      fraudRules.set(k, v);
      updated.push(k);
    }
  }
  if (body.thresholds && typeof body.thresholds === 'object') {
    const t = body.thresholds;
    if (Number.isFinite(t.low)) { thresholds.fraud.low = t.low; updated.push('thresholds.low'); }
    if (Number.isFinite(t.medium)) { thresholds.fraud.medium = t.medium; updated.push('thresholds.medium'); }
    if (Number.isFinite(t.high)) { thresholds.fraud.high = t.high; updated.push('thresholds.high'); }
  }
  audit({
    riskType: 'fraud',
    entityType: 'model',
    entityId: 'fraud-rules',
    decision: 'update',
    principal: req.headers['x-actor'] || 'anonymous',
    updated
  });
  res.json({ message: 'Fraud rules updated', updated, rulesCount: fraudRules.size });
});

// ============ CHURN ============

/**
 * POST /api/churn/score
 * Body: { customerId, features: {tenure, lastLoginDays, monthlyActiveDays, supportTicketsLast90d, npsScore, paymentFailures, planTier, featureAdoption, competitorSignals} }
 */
app.post('/api/churn/score',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const features = body.features || {};
  const result = scoreChurn(features);
  const customerId = body.customerId || ('cust-' + uuidv4().slice(0, 8));
  const record = audit({
    riskType: 'churn',
    entityType: 'customer',
    entityId: customerId,
    decision: result.riskTier,
    churnProbability: result.churnProbability,
    level: result.riskTier,
    principal: req.headers['x-actor'] || 'anonymous',
    topFactor: result.factors[0] ? result.factors[0].feature : null
  });
  res.json({ id: record.id, customerId, ...result, auditedAt: record.timestamp });
});

/**
 * POST /api/churn/cohort
 * Body: { customerIds: [...], featuresByCustomer: {id: {features}} }
 * Returns aggregated cohort risk distribution.
 */
app.post('/api/churn/cohort',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const ids = Array.isArray(body.customerIds) ? body.customerIds : null;
  const featuresByCustomer = body.featuresByCustomer || {};
  if (!ids) return res.status(400).json({ error: 'customerIds (array) is required' });

  const dist = { low: 0, medium: 0, high: 0 };
  let total = 0;
  const members = [];
  for (const id of ids) {
    const features = featuresByCustomer[id];
    if (!features) continue;
    const r = scoreChurn(features);
    dist[r.riskTier] = (dist[r.riskTier] || 0) + 1;
    total += r.churnProbability;
    members.push({ customerId: id, churnProbability: r.churnProbability, riskTier: r.riskTier });
  }
  const avg = members.length ? total / members.length : 0;

  res.json({
    cohortSize: members.length,
    averageChurnProbability: Math.round(avg * 10000) / 10000,
    distribution: dist,
    members
  });
});

/**
 * GET /api/churn/feature-importance
 * Returns the absolute weight of each churn feature (proxy for
 * model importance).
 */
app.get('/api/churn/feature-importance', (req, res) => {
  const rows = [];
  for (const [k, w] of churnRules.entries()) {
    rows.push({ feature: k, weight: w, importance: Math.abs(w) });
  }
  rows.sort((a, b) => b.importance - a.importance);
  res.json({ model: 'churn-logistic', count: rows.length, features: rows });
});

// ============ CREDIT ============

/**
 * POST /api/credit/score
 * Body: { applicant: {monthlyIncome, debtToIncome, creditHistoryYears, priorDefaults, employmentType, requestedAmount, termMonths} }
 */
app.post('/api/credit/score',requireAuth, authOrBypass, (req, res) => {
  const applicant = (req.body && req.body.applicant) || null;
  if (!applicant) return res.status(400).json({ error: 'applicant object is required' });
  const result = scoreCredit(applicant);
  const applicantId = applicant.id || ('app-' + uuidv4().slice(0, 8));
  const record = audit({
    riskType: 'credit',
    entityType: 'applicant',
    entityId: applicantId,
    decision: result.decision,
    creditScore: result.creditScore,
    level: result.decision,
    principal: req.headers['x-actor'] || 'anonymous',
    approvedAmount: result.approvedAmount,
    interestRate: result.interestRate
  });
  res.json({ id: record.id, applicantId, ...result, auditedAt: record.timestamp });
});

/**
 * POST /api/credit/simulate
 * Body: { applicant, scenarios: [{requestedAmount, termMonths?}, ...] }
 * Runs the credit decision for each scenario, keeping the
 * applicant features constant.
 */
app.post('/api/credit/simulate',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const applicant = body.applicant;
  const scenarios = Array.isArray(body.scenarios) ? body.scenarios : null;
  if (!applicant) return res.status(400).json({ error: 'applicant object is required' });
  if (!scenarios) return res.status(400).json({ error: 'scenarios (array) is required' });
  if (scenarios.length > 50) return res.status(400).json({ error: 'max 50 scenarios' });

  const results = scenarios.map((s) => {
    const merged = Object.assign({}, applicant, s);
    return scoreCredit(merged);
  });

  res.json({ count: results.length, results });
});

// ============ CROSS-CUTTING ============

/**
 * POST /api/risk/composite
 * Body: { fraud?: 0-100, churn?: 0-1, credit?: 300-850 }
 * Combines the supplied risk types into a single 0-100 score.
 */
app.post('/api/risk/composite',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const partials = {};
  if (body.fraud != null) partials.fraud = body.fraud;
  if (body.churn != null) partials.churn = body.churn;
  if (body.credit != null) partials.credit = body.credit;
  if (Object.keys(partials).length === 0) {
    return res.status(400).json({ error: 'at least one of fraud, churn, credit is required' });
  }
  const result = compositeScore(partials);
  audit({
    riskType: 'composite',
    entityType: 'composite',
    entityId: 'comp-' + uuidv4().slice(0, 8),
    decision: result.level,
    score: result.score,
    level: result.level,
    principal: req.headers['x-actor'] || 'anonymous',
    inputs: partials
  });
  res.json(result);
});

/**
 * GET /api/risk/thresholds
 * Returns the active thresholds for all risk types.
 */
app.get('/api/risk/thresholds', (req, res) => {
  res.json({
    thresholds,
    compositeWeights
  });
});

/**
 * PATCH /api/risk/thresholds
 * Body: { thresholds?: {fraud?: {...}, churn?: {...}, credit?: {...}, composite?: {...}}, compositeWeights?: {...} }
 */
app.patch('/api/risk/thresholds',requireAuth, authOrBypass, (req, res) => {
  const body = req.body || {};
  const updated = [];
  if (body.thresholds && typeof body.thresholds === 'object') {
    for (const [type, t] of Object.entries(body.thresholds)) {
      if (thresholds[type] && t && typeof t === 'object') {
        for (const [k, v] of Object.entries(t)) {
          if (Number.isFinite(v)) {
            thresholds[type][k] = v;
            updated.push(`thresholds.${type}.${k}`);
          }
        }
      }
    }
  }
  if (body.compositeWeights && typeof body.compositeWeights === 'object') {
    for (const [k, v] of Object.entries(body.compositeWeights)) {
      if (Number.isFinite(v)) {
        compositeWeights[k] = v;
        updated.push(`compositeWeights.${k}`);
      }
    }
  }
  audit({
    riskType: 'config',
    entityType: 'thresholds',
    entityId: 'risk-thresholds',
    decision: 'update',
    principal: req.headers['x-actor'] || 'anonymous',
    updated
  });
  res.json({ message: 'Thresholds updated', updated });
});

/**
 * GET /api/audit
 * Returns the full audit log. Supports filters: ?riskType, ?entityId, ?level, ?limit.
 */
app.get('/api/audit', (req, res) => {
  let entries = auditLog;
  if (req.query.riskType) entries = entries.filter(e => e.riskType === req.query.riskType);
  if (req.query.entityId) entries = entries.filter(e => e.entityId === req.query.entityId);
  if (req.query.level) entries = entries.filter(e => e.level === req.query.level);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: entries.length, entries: entries.slice(-limit) });
});

/**
 * GET /api/audit/:entityType/:entityId
 * Returns risk history for a specific entity.
 */
app.get('/api/audit/:entityType/:entityId', (req, res) => {
  const { entityType, entityId } = req.params;
  const entries = auditLog.filter(e => e.entityType === entityType && e.entityId === entityId);
  res.json({ entityType, entityId, count: entries.length, entries });
});

/**
 * GET /api/stats
 * High-level stats: total scores, distribution, average.
 */
app.get('/api/stats', (req, res) => {
  const byRiskType = {};
  const byLevel = {};
  let totalScore = 0;
  let scoreCount = 0;
  for (const e of auditLog) {
    if (e.riskType) byRiskType[e.riskType] = (byRiskType[e.riskType] || 0) + 1;
    if (e.level) byLevel[e.level] = (byLevel[e.level] || 0) + 1;
    if (Number.isFinite(e.score)) {
      totalScore += e.score;
      scoreCount++;
    }
  }
  res.json({
    totalEntries: auditLog.length,
    byRiskType,
    byLevel,
    averageFraudScore: scoreCount ? Math.round(totalScore / scoreCount * 100) / 100 : 0,
    fraudRules: fraudRules.size,
    churnRules: churnRules.size,
    creditRules: creditRules.size,
    thresholds,
    compositeWeights
  });
});

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
module.exports = { app, authOrBypass };

// Auto-start gated
if (process.env.RISK_INTELLIGENCE_NO_LISTEN !== '1' && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    // TODO: In production, replace in-memory Maps with Postgres +
    //       add JWT-based RBAC checks here via CorpID.
    // TODO: Wire up to TwinOS Hub so customer/transaction twins can
    //       pull their own risk score directly.
    // TODO: Promote linear models to gradient-boosted trees once we
    //       have enough labeled fraud/churn data.
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] fraud=${fraudRules.size} churn=${churnRules.size} credit=${creditRules.size} audit=${auditLog.length}`);
  });
  installGracefulShutdown(server);
}
