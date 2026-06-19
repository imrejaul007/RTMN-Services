/**
 * CorpID Cloud - Trust Engine
 * Risk scoring, fraud detection, and trust evaluation
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const trustScores = new Map(); // userId -> TrustScore
export const riskChecks = []; // RiskCheck history
export const fraudFlags = new Map();
export const anomalies = [];

// ============ MODEL FACTORY ============

/**
 * Create or update trust score
 */
export function createTrustScore(userId) {
  const score = {
    userId,

    // Overall
    overallScore: 50, // 0-100
    grade: 'medium', // very_low, low, medium, high, very_high

    // Component scores
    components: {
      identityScore: 50,    // Based on verification, KYC, etc.
      behaviorScore: 50,    // Based on activity patterns
      deviceScore: 50,      // Based on device trust
      transactionScore: 50, // Based on financial history
      historyScore: 50      // Based on account age, violations
    },

    // Risk factors
    riskFactors: [],

    // Anomalies
    anomalies: [],

    // Recommendations
    recommendations: [],

    // History
    scoreHistory: [],

    // Last evaluation
    lastEvaluatedAt: new Date().toISOString(),
    evaluationCount: 0,

    // Metadata
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  trustScores.set(userId, score);
  return score;
}

/**
 * Evaluate trust score based on factors
 */
export function evaluateTrust(userId, factors = {}) {
  let score = trustScores.get(userId) || createTrustScore(userId);

  // Calculate component scores
  const identityScore = calculateIdentityScore(factors.identity || {});
  const behaviorScore = calculateBehaviorScore(factors.behavior || {});
  const deviceScore = calculateDeviceScore(factors.device || {});
  const transactionScore = calculateTransactionScore(factors.transaction || {});
  const historyScore = calculateHistoryScore(factors.history || {});

  // Update components
  score.components = {
    identityScore,
    behaviorScore,
    deviceScore,
    transactionScore,
    historyScore
  };

  // Calculate overall (weighted average)
  const weights = {
    identityScore: 0.25,
    behaviorScore: 0.25,
    deviceScore: 0.15,
    transactionScore: 0.20,
    historyScore: 0.15
  };

  score.overallScore = Math.round(
    identityScore * weights.identityScore +
    behaviorScore * weights.behaviorScore +
    deviceScore * weights.deviceScore +
    transactionScore * weights.transactionScore +
    historyScore * weights.historyScore
  );

  // Calculate grade
  score.grade = score.overallScore >= 80 ? 'very_high' :
                score.overallScore >= 60 ? 'high' :
                score.overallScore >= 40 ? 'medium' :
                score.overallScore >= 20 ? 'low' : 'very_low';

  // Generate risk factors
  score.riskFactors = generateRiskFactors(factors);

  // Generate recommendations
  score.recommendations = generateRecommendations(score, factors);

  // Update history
  score.scoreHistory.push({
    score: score.overallScore,
    grade: score.grade,
    at: new Date().toISOString(),
    reason: factors.reason || 'evaluation'
  });

  // Keep last 50 history entries
  if (score.scoreHistory.length > 50) {
    score.scoreHistory = score.scoreHistory.slice(-50);
  }

  score.lastEvaluatedAt = new Date().toISOString();
  score.evaluationCount++;
  score.updatedAt = new Date().toISOString();

  trustScores.set(userId, score);
  return score;
}

// ============ SCORING FUNCTIONS ============

function calculateIdentityScore(identity) {
  let score = 30; // Base score

  if (identity.emailVerified) score += 10;
  if (identity.phoneVerified) score += 10;
  if (identity.mfaEnabled) score += 20;
  if (identity.idVerified) score += 20;
  if (identity.kycLevel === 3) score += 20;
  else if (identity.kycLevel === 2) score += 15;
  else if (identity.kycLevel === 1) score += 10;

  return Math.min(100, score);
}

function calculateBehaviorScore(behavior) {
  let score = 50; // Base score

  if (behavior.consistentLogins) score += 10;
  if (behavior.normalActivity) score += 10;
  if (behavior.lowFailedAttempts) score += 15;
  if (behavior.noSuspiciousActivity) score += 15;

  if (behavior.recentFailedAttempts > 5) score -= 20;
  if (behavior.unusualLocation) score -= 15;
  if (behavior.unusualTime) score -= 10;
  if (behavior.rapidActions) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function calculateDeviceScore(device) {
  let score = 30; // Base score

  if (device.trusted) score += 30;
  if (device.recognized) score += 20;
  if (device.biometric) score += 15;
  if (device.secureEnclave) score += 10;

  if (device.blocked) score = 0;
  if (device.newDevice) score -= 10;
  if (device.vpn) score -= 5;
  if (device.tor) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function calculateTransactionScore(transaction) {
  let score = 50; // Base score

  if (transaction.historyMonths > 12) score += 15;
  else if (transaction.historyMonths > 6) score += 10;
  else if (transaction.historyMonths > 3) score += 5;

  if (transaction.disputes === 0) score += 20;
  if (transaction.refundRate < 0.05) score += 10;
  if (transaction.averageOrderValue === 'consistent') score += 5;

  if (transaction.disputes > 3) score -= 20;
  if (transaction.refundRate > 0.2) score -= 15;
  if (transaction.largeDeviation) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function calculateHistoryScore(history) {
  let score = 40; // Base score

  if (history.accountAge > 365) score += 20;
  else if (history.accountAge > 180) score += 15;
  else if (history.accountAge > 90) score += 10;

  if (history.noViolations) score += 20;
  if (history.goodStanding) score += 20;
  if (history.positiveReviews > 10) score += 10;

  if (history.violations > 0) score -= 15;
  if (history.recentSuspensions) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function generateRiskFactors(factors) {
  const risks = [];

  if (factors.identity && !factors.identity.emailVerified) {
    risks.push({
      factor: 'unverified_email',
      weight: 'medium',
      description: 'Email address is not verified'
    });
  }

  if (factors.identity && !factors.identity.mfaEnabled) {
    risks.push({
      factor: 'no_mfa',
      weight: 'medium',
      description: 'Multi-factor authentication is not enabled'
    });
  }

  if (factors.behavior && factors.behavior.recentFailedAttempts > 5) {
    risks.push({
      factor: 'high_failed_attempts',
      weight: 'high',
      description: `${factors.behavior.recentFailedAttempts} failed login attempts recently`
    });
  }

  if (factors.device && factors.device.newDevice) {
    risks.push({
      factor: 'new_device',
      weight: 'low',
      description: 'Login from a new device'
    });
  }

  if (factors.device && factors.device.tor) {
    risks.push({
      factor: 'tor_network',
      weight: 'high',
      description: 'Connection from Tor network'
    });
  }

  return risks;
}

function generateRecommendations(score, factors) {
  const recommendations = [];

  if (score.overallScore < 60) {
    recommendations.push({
      action: 'enable_mfa',
      priority: 'high',
      automated: true
    });
  }

  if (factors.identity && !factors.identity.emailVerified) {
    recommendations.push({
      action: 'verify_email',
      priority: 'high',
      automated: true
    });
  }

  if (factors.behavior && factors.behavior.recentFailedAttempts > 3) {
    recommendations.push({
      action: 'review_activity',
      priority: 'medium',
      automated: false
    });
  }

  return recommendations;
}

// ============ RISK CHECK ============

/**
 * Perform a risk check
 */
export function performRiskCheck(data) {
  const check = {
    id: `risk-${uuidv4().slice(0, 12)}`,
    userId: data.userId,
    sessionId: data.sessionId || null,

    // Action being attempted
    action: data.action, // 'login', 'payment', 'profile_change'
    context: {
      ip: data.context?.ip || null,
      deviceId: data.context?.deviceId || null,
      location: data.context?.location || null,
      userAgent: data.context?.userAgent || null,
      timestamp: new Date().toISOString()
    },

    // Result
    riskLevel: 'low',
    riskScore: 0,
    decision: 'allow', // allow, challenge, deny

    // Challenges
    challenges: [],

    // Flags
    fraudFlags: [],

    // Details
    details: data.context || {},

    createdAt: new Date().toISOString()
  };

  // Calculate risk based on context
  let riskScore = 0;
  const flags = [];

  if (data.context?.newIp) { riskScore += 20; flags.push('new_ip'); }
  if (data.context?.newDevice) { riskScore += 15; flags.push('new_device'); }
  if (data.context?.unusualTime) { riskScore += 10; flags.push('unusual_time'); }
  if (data.context?.unusualLocation) { riskScore += 25; flags.push('unusual_location'); }
  if (data.context?.vpn) { riskScore += 15; flags.push('vpn'); }
  if (data.context?.tor) { riskScore += 50; flags.push('tor'); }
  if (data.context?.highValueTransaction) { riskScore += 20; flags.push('high_value'); }
  if (data.context?.velocityExceeded) { riskScore += 30; flags.push('velocity'); }

  check.riskScore = Math.min(100, riskScore);
  check.fraudFlags = flags;

  // Determine risk level and decision
  if (check.riskScore >= 80) {
    check.riskLevel = 'critical';
    check.decision = 'deny';
  } else if (check.riskScore >= 60) {
    check.riskLevel = 'high';
    check.decision = 'challenge';
    check.challenges = [
      { type: 'mfa', required: true, completed: false },
      { type: 'phone_verification', required: true, completed: false }
    ];
  } else if (check.riskScore >= 30) {
    check.riskLevel = 'medium';
    check.decision = 'challenge';
    check.challenges = [
      { type: 'mfa', required: true, completed: false }
    ];
  } else {
    check.riskLevel = 'low';
    check.decision = 'allow';
  }

  riskChecks.push(check);

  // Trim if too many
  if (riskChecks.length > 10000) {
    riskChecks.shift();
  }

  return check;
}

/**
 * Get trust score for user
 */
export function getTrustScore(userId) {
  return trustScores.get(userId) || createTrustScore(userId);
}

/**
 * Get risk check history
 */
export function getRiskChecks(userId, options = {}) {
  let checks = riskChecks.filter(c => c.userId === userId);

  if (options.action) {
    checks = checks.filter(c => c.action === options.action);
  }
  if (options.decision) {
    checks = checks.filter(c => c.decision === options.decision);
  }

  return checks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Record anomaly
 */
export function recordAnomaly(data) {
  const anomaly = {
    id: uuidv4(),
    userId: data.userId,
    type: data.type,
    severity: data.severity || 'low',
    description: data.description,
    detectedAt: new Date().toISOString(),
    resolved: false,
    resolvedAt: null
  };

  anomalies.push(anomaly);
  return anomaly;
}
