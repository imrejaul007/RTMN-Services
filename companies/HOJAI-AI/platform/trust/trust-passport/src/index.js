/**
 * Trust Passport Service - v1.0.0
 * =================================
 * Portable trust credentials across networks.
 *
 * Port: 4980
 *
 * Features:
 * - Trust scores across dimensions
 * - Portable trust badges
 * - Trust verification
 * - Cross-network trust transfer
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4980;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const passports = new Map();     // entityId -> TrustPassport
const verifications = new Map();  // verificationId -> Verification
const badges = new Map();        // badgeId -> Badge

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────���─────────────

function createPassportId(entityId, network) {
  return `${network}:${entityId}`;
}

function calculateOverallTrust(scores) {
  const weights = { reliability: 0.3, competence: 0.25, integrity: 0.25, responsiveness: 0.2 };
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) {
      total += scores[key] * weight;
      weightSum += weight;
    }
  }

  return Math.round((total / weightSum) * 100) / 100;
}

function getTrustLevel(score) {
  if (score >= 90) return { level: 'platinum', badge: '🏆', multiplier: 1.5 };
  if (score >= 80) return { level: 'gold', badge: '⭐', multiplier: 1.3 };
  if (score >= 70) return { level: 'silver', badge: '🥈', multiplier: 1.1 };
  if (score >= 50) return { level: 'bronze', badge: '🥉', multiplier: 1.0 };
  if (score >= 30) return { level: 'iron', badge: '⚙️', multiplier: 0.9 };
  return { level: 'restricted', badge: '⚠️', multiplier: 0.5 };
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSPORT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /passport - Create trust passport
 */
app.post('/passport', (req, res) => {
  const { entityId, entityType, network, dimensions, metadata } = req.body;

  if (!entityId || !entityType) {
    return res.status(400).json({ error: 'entityId and entityType required' });
  }

  const passportId = createPassportId(entityId, network || 'hojai');
  const scores = {
    reliability: dimensions?.reliability || 70,
    competence: dimensions?.competence || 70,
    integrity: dimensions?.integrity || 70,
    responsiveness: dimensions?.responsiveness || 70
  };

  const overall = calculateOverallTrust(scores);
  const trustInfo = getTrustLevel(overall);

  const passport = {
    id: passportId,
    entityId,
    entityType,  // 'human', 'merchant', 'agent', 'company'
    network: network || 'hojai',
    scores,
    overallTrust: overall,
    trustLevel: trustInfo.level,
    badge: trustInfo.badge,
    multiplier: trustInfo.multiplier,
    badges: [],
    verifications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: metadata || {}
  };

  passports.set(passportId, passport);

  res.json({ success: true, passport });
});

/**
 * GET /passport/:passportId - Get passport
 */
app.get('/passport/:passportId', (req, res) => {
  const { passportId } = req.params;
  const passport = passports.get(passportId);

  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  res.json({ passport });
});

/**
 * PUT /passport/:passportId - Update passport scores
 */
app.put('/passport/:passportId', (req, res) => {
  const { passportId } = req.params;
  const { dimensions } = req.body;

  let passport = passports.get(passportId);
  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  if (dimensions) {
    passport.scores = { ...passport.scores, ...dimensions };
    passport.overallTrust = calculateOverallTrust(passport.scores);
    const trustInfo = getTrustLevel(passport.overallTrust);
    passport.trustLevel = trustInfo.level;
    passport.badge = trustInfo.badge;
    passport.multiplier = trustInfo.multiplier;
  }

  passport.updatedAt = new Date().toISOString();
  passports.set(passportId, passport);

  res.json({ success: true, passport });
});

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /badge - Award a badge
 */
app.post('/badge', (req, res) => {
  const { passportId, badgeType, issuer, reason, expiresAt } = req.body;

  if (!passportId || !badgeType) {
    return res.status(400).json({ error: 'passportId and badgeType required' });
  }

  let passport = passports.get(passportId);
  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const badge = {
    id: uuidv4(),
    type: badgeType,
    issuer: issuer || 'system',
    reason: reason || '',
    awardedAt: new Date().toISOString(),
    expiresAt: expiresAt || null
  };

  passport.badges.push(badge);
  passport.updatedAt = new Date().toISOString();
  passports.set(passportId, passport);
  badges.set(badge.id, badge);

  res.json({ success: true, badge });
});

/**
 * GET /passport/:passportId/badges - Get all badges
 */
app.get('/passport/:passportId/badges', (req, res) => {
  const { passportId } = req.params;
  const passport = passports.get(passportId);

  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const validBadges = passport.badges.filter(b => !b.expiresAt || new Date(b.expiresAt) > new Date());

  res.json({ badges: validBadges });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /verify - Verify trust passport
 */
app.post('/verify', (req, res) => {
  const { passportId, verifierId, purpose } = req.body;

  if (!passportId) {
    return res.status(400).json({ error: 'passportId required' });
  }

  const passport = passports.get(passportId);

  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const verification = {
    id: uuidv4(),
    passportId,
    verifierId: verifierId || 'anonymous',
    purpose: purpose || 'general',
    overallTrust: passport.overallTrust,
    trustLevel: passport.trustLevel,
    badge: passport.badge,
    dimensions: passport.scores,
    verifiedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };

  verifications.set(verification.id, verification);

  res.json({ verification });
});

/**
 * POST /verify/score - Get verification score
 */
app.post('/verify/score', (req, res) => {
  const { passportId, requestingEntity, trustRequirement } = req.body;

  const passport = passports.get(passportId);
  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const meetsRequirement = passport.overallTrust >= (trustRequirement || 50);
  const score = passport.overallTrust * passport.multiplier;

  res.json({
    passportId,
    overallTrust: passport.overallTrust,
    multiplier: passport.multiplier,
    finalScore: Math.round(score * 100) / 100,
    meetsRequirement,
    trustLevel: passport.trustLevel
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-NETWORK TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /transfer - Transfer trust to another network
 */
app.post('/transfer', (req, res) => {
  const { passportId, targetNetwork } = req.body;

  const passport = passports.get(passportId);
  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const newPassportId = createPassportId(passport.entityId, targetNetwork);

  // Create new passport with reduced trust (cross-network penalty)
  const transferredPassport = {
    ...passport,
    id: newPassportId,
    network: targetNetwork,
    overallTrust: passport.overallTrust * 0.9, // 10% reduction for cross-network
    transferredFrom: passportId,
    transferredAt: new Date().toISOString()
  };

  const trustInfo = getTrustLevel(transferredPassport.overallTrust);
  transferredPassport.trustLevel = trustInfo.level;
  transferredPassport.badge = trustInfo.badge;

  passports.set(newPassportId, transferredPassport);

  res.json({ success: true, passport: transferredPassport });
});

// ─────────────────────────────────────────────────────────────────────────────
// ECONOMIC BENEFITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /passport/:passportId/benefits - Get economic benefits
 */
app.get('/passport/:passportId/benefits', (req, res) => {
  const passport = passports.get(req.params.passportId);

  if (!passport) {
    return res.status(404).json({ error: 'Passport not found' });
  }

  const benefits = [];

  // Fee reduction
  if (passport.trustLevel === 'platinum') {
    benefits.push({ type: 'fee_reduction', value: '50%', description: 'Platform fees reduced by 50%' });
  } else if (passport.trustLevel === 'gold') {
    benefits.push({ type: 'fee_reduction', value: '30%', description: 'Platform fees reduced by 30%' });
  } else if (passport.trustLevel === 'silver') {
    benefits.push({ type: 'fee_reduction', value: '15%', description: 'Platform fees reduced by 15%' });
  }

  // Faster payouts
  if (passport.trustLevel === 'platinum' || passport.trustLevel === 'gold') {
    benefits.push({ type: 'payout_speed', value: 'instant', description: 'Instant payouts available' });
  }

  // Priority support
  if (passport.overallTrust >= 80) {
    benefits.push({ type: 'support', value: 'priority', description: 'Priority customer support' });
  }

  // Trust multiplier
  benefits.push({ type: 'trust_multiplier', value: passport.multiplier, description: `Current trust multiplier: ${passport.multiplier}x` });

  res.json({ passportId, trustLevel: passport.trustLevel, benefits });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trust-passport',
    port: PORT,
    passports: passports.size
  });
});

app.listen(PORT, () => {
  console.log(`Trust Passport Service running on port ${PORT}`);
});

export default app;
