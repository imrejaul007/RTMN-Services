/**
 * Voice Identity & TrustOS — v1.0.0
 * =================================
 * Voiceprint management, consent, and trust for voice interactions:
 * - Voice enrollment and verification
 * - Consent management
 * - Trust scoring
 * - Voice cloning authorization
 * - Relationship graph
 *
 * Port: 4884
 */

import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Types
import type {
  VoiceIdentity,
  VoiceVerification,
  VoiceCloneRequest,
  TrustEvent,
  RelationshipNode,
  ConsentSettings,
  TrustLevel
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────────────

// In-memory storage (would use MemoryOS + TrustOS in production)
const identities = new Map<string, VoiceIdentity>();
const verifications = new Map<string, VoiceVerification>();
const cloneRequests = new Map<string, VoiceCloneRequest>();
const trustEvents = new Map<string, TrustEvent[]>();
const relationships = new Map<string, RelationshipNode[]>();

// Default consent settings
const DEFAULT_CONSENT: ConsentSettings = {
  cloneVoice: 'none',
  financialActions: 'none',
  personalData: 'trusted',
  shareWithAgents: 'trusted',
  thirdPartyAccess: 'none'
};

// ── Request Schemas ───────────────────────────────────────────────────────────

const RegisterVoiceSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['human', 'agent', 'company', 'family', 'brand']),
  name: z.string().min(1),
  audioSamples: z.array(z.string()).min(1),
  consent: z.object({
    cloneVoice: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    financialActions: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    personalData: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    shareWithAgents: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    thirdPartyAccess: z.enum(['none', 'family', 'trusted', 'all']).optional()
  }).optional()
});

const VerifyVoiceSchema = z.object({
  identityId: z.string().min(1),
  audioSample: z.string().min(1),
  type: z.enum(['enrollment', 'verification', 'liveness'])
});

const CloneVoiceSchema = z.object({
  sourceIdentityId: z.string().min(1),
  targetName: z.string().min(1),
  targetType: z.enum(['human', 'agent', 'company', 'family', 'brand']),
  purpose: z.string().min(1),
  consentProof: z.string().optional()
});

const ConsentUpdateSchema = z.object({
  identityId: z.string().min(1),
  consent: z.object({
    cloneVoice: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    financialActions: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    personalData: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    shareWithAgents: z.enum(['none', 'family', 'trusted', 'all']).optional(),
    thirdPartyAccess: z.enum(['none', 'family', 'trusted', 'all']).optional()
  }),
  reason: z.string().min(1)
});

const RelationshipUpdateSchema = z.object({
  identityId: z.string().min(1),
  relatedIdentityId: z.string().min(1),
  relationship: z.enum(['self', 'family', 'friend', 'colleague', 'employee', 'customer', 'agent', 'company']),
  trust: z.number().min(0).max(1).optional()
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/identity/register
 * Register a new voice identity
 */
app.post('/api/identity/register', async (req, res) => {
  try {
    const { userId, type, name, audioSamples, consent } = RegisterVoiceSchema.parse(req.body);

    const identityId = uuidv4();
    const now = new Date().toISOString();

    // Generate voiceprint (in production, this would call a voice embedding service)
    const voiceprint = {
      id: uuidv4(),
      embedding: generateMockEmbedding(audioSamples.length),
      model: 'hojai-v1',
      confidence: 0.85 + Math.random() * 0.1,
      sampleCount: audioSamples.length,
      createdAt: now
    };

    const identity: VoiceIdentity = {
      id: identityId,
      userId,
      type,
      name,
      voiceprint,
      consent: { ...DEFAULT_CONSENT, ...consent },
      trustLevel: 'unverified',
      createdAt: now,
      updatedAt: now,
      verificationCount: 0
    };

    identities.set(identityId, identity);
    trustEvents.set(identityId, []);

    res.json({
      success: true,
      identity,
      verificationRequired: true,
      message: 'Voice identity registered. Verification required for full access.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/identity/verify
 * Verify voice identity
 */
app.post('/api/identity/verify', async (req, res) => {
  try {
    const { identityId, audioSample, type } = VerifyVoiceSchema.parse(req.body);

    const identity = identities.get(identityId);
    if (!identity) {
      return res.status(404).json({ success: false, error: 'Identity not found' });
    }

    const verificationId = uuidv4();
    const now = new Date().toISOString();

    // Simulate verification (in production, would compare embeddings)
    const confidence = 0.8 + Math.random() * 0.2;
    const threshold = type === 'liveness' ? 0.95 : 0.85;
    const passed = confidence >= threshold;

    const verification: VoiceVerification = {
      id: verificationId,
      identityId,
      type,
      status: 'verified',
      confidence,
      threshold,
      passed,
      createdAt: now,
      completedAt: now
    };

    verifications.set(verificationId, verification);

    // Update identity if verification passed
    if (passed) {
      identity.lastVerifiedAt = now;
      identity.verificationCount++;
      identity.trustLevel = getTrustLevel(identity);
      identity.updatedAt = now;

      // Add trust event
      addTrustEvent(identityId, 'identity_verified', 'Voice verification passed', { confidence });
    }

    // Liveness check always required for financial actions
    const requiresLiveness = identity.consent.financialActions !== 'none' &&
      !verifications.has(identityId + '-liveness-passed');

    res.json({
      success: true,
      verification,
      isMatch: passed,
      confidence,
      requiresLiveness
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/identity/clone
 * Request voice cloning
 */
app.post('/api/identity/clone', async (req, res) => {
  try {
    const { sourceIdentityId, targetName, targetType, purpose, consentProof } = CloneVoiceSchema.parse(req.body);

    const sourceIdentity = identities.get(sourceIdentityId);
    if (!sourceIdentity) {
      return res.status(404).json({ success: false, error: 'Source identity not found' });
    }

    // Check consent
    const canClone = checkCloneConsent(sourceIdentity.consent, consentProof);
    if (!canClone.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Clone consent not granted',
        reason: canClone.reason
      });
    }

    const requestId = uuidv4();
    const request: VoiceCloneRequest = {
      id: requestId,
      identityId: sourceIdentityId,
      status: canClone.requiresApproval ? 'pending' : 'approved',
      consentVerified: true,
      sampleCount: sourceIdentity.voiceprint.sampleCount,
      duration: sourceIdentity.voiceprint.sampleCount * 30,
      purpose,
      createdAt: new Date().toISOString()
    };

    cloneRequests.set(requestId, request);

    // Add trust event
    addTrustEvent(sourceIdentityId, 'clone_request', `Clone request: ${purpose}`, { requestId });

    res.json({
      success: true,
      request,
      estimatedCompletion: canClone.requiresApproval ? undefined :
        new Date(Date.now() + request.duration * 1000).toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/identity/:identityId
 * Get identity details
 */
app.get('/api/identity/:identityId', (req, res) => {
  const { identityId } = req.params;

  const identity = identities.get(identityId);
  if (!identity) {
    return res.status(404).json({ success: false, error: 'Identity not found' });
  }

  // Return without sensitive data
  res.json({
    success: true,
    identity: {
      id: identity.id,
      userId: identity.userId,
      type: identity.type,
      name: identity.name,
      trustLevel: identity.trustLevel,
      consent: identity.consent,
      createdAt: identity.createdAt,
      lastVerifiedAt: identity.lastVerifiedAt,
      verificationCount: identity.verificationCount
    }
  });
});

/**
 * GET /api/identity/user/:userId
 * Get all identities for a user
 */
app.get('/api/identity/user/:userId', (req, res) => {
  const { userId } = req.params;

  const userIdentities = Array.from(identities.values())
    .filter(i => i.userId === userId)
    .map(i => ({
      id: i.id,
      type: i.type,
      name: i.name,
      trustLevel: i.trustLevel,
      lastVerifiedAt: i.lastVerifiedAt
    }));

  res.json({
    success: true,
    identities: userIdentities,
    count: userIdentities.length
  });
});

/**
 * PUT /api/identity/:identityId/consent
 * Update consent settings
 */
app.put('/api/identity/:identityId/consent', async (req, res) => {
  try {
    const { identityId } = req.params;
    const { consent, reason } = ConsentUpdateSchema.parse(req.body);

    const identity = identities.get(identityId);
    if (!identity) {
      return res.status(404).json({ success: false, error: 'Identity not found' });
    }

    const previousConsent = { ...identity.consent };
    identity.consent = { ...identity.consent, ...consent };
    identity.updatedAt = new Date().toISOString();

    // Add trust event
    addTrustEvent(identityId, 'consent_updated', reason, {
      previous: previousConsent,
      new: consent
    });

    res.json({
      success: true,
      consent: identity.consent,
      message: 'Consent updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/trust/:identityId
 * Get trust score and factors
 */
app.get('/api/trust/:identityId', (req, res) => {
  const { identityId } = req.params;

  const identity = identities.get(identityId);
  if (!identity) {
    return res.status(404).json({ success: false, error: 'Identity not found' });
  }

  const score = calculateTrustScore(identity);
  const factors = calculateTrustFactors(identity);
  const recommendations = generateTrustRecommendations(identity, score);

  res.json({
    success: true,
    identityId,
    trustLevel: identity.trustLevel,
    score,
    factors,
    recommendations
  });
});

/**
 * POST /api/relationship
 * Add or update relationship
 */
app.post('/api/relationship', async (req, res) => {
  try {
    const { identityId, relatedIdentityId, relationship, trust } = RelationshipUpdateSchema.parse(req.body);

    // Get or create relationship array
    let rels = relationships.get(identityId);
    if (!rels) {
      rels = [];
      relationships.set(identityId, rels);
    }

    // Find existing relationship
    const existing = rels.find(r => r.relatedIdentityId === relatedIdentityId);

    if (existing) {
      existing.relationship = relationship;
      if (trust !== undefined) existing.trust = trust;
      existing.interactionCount++;
    } else {
      rels.push({
        id: uuidv4(),
        identityId,
        relatedIdentityId,
        relationship,
        trust: trust ?? 0.5,
        sharedContexts: [],
        interactionCount: 1
      });
    }

    res.json({
      success: true,
      message: 'Relationship updated'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/relationships/:identityId
 * Get relationships for identity
 */
app.get('/api/relationships/:identityId', (req, res) => {
  const { identityId } = req.params;

  const rels = relationships.get(identityId) || [];

  // Enrich with identity details
  const enrichedRels = rels.map(r => {
    const related = identities.get(r.relatedIdentityId);
    return {
      ...r,
      relatedName: related?.name,
      relatedType: related?.type,
      relatedTrustLevel: related?.trustLevel
    };
  });

  res.json({
    success: true,
    relationships: enrichedRels,
    count: rels.length
  });
});

/**
 * POST /api/authorize/action
 * Authorize an action based on voice trust
 */
app.post('/api/authorize/action', async (req, res) => {
  try {
    const { identityId, actionType, context } = req.body;

    const identity = identities.get(identityId);
    if (!identity) {
      return res.status(404).json({ success: false, error: 'Identity not found' });
    }

    // Check various authorization rules
    const authResult = authorizeAction(identity, actionType, context);

    // Log the attempt
    addTrustEvent(identityId, 'authorization_attempt', `Action: ${actionType}`, {
      actionType,
      authorized: authResult.authorized,
      reason: authResult.reason
    });

    res.json({
      success: true,
      ...authResult
    });
  } catch (error) {
    console.error('[voice-identity]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-identity-trustos',
    port: process.env.PORT || 4884,
    version: '1.0.0',
    capabilities: [
      'voice-enrollment',
      'voice-verification',
      'consent-management',
      'trust-scoring',
      'voice-cloning',
      'relationship-graph',
      'action-authorization'
    ],
    totalIdentities: identities.size,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      identityStorage: true,
      verificationEngine: true,
      trustScoring: true,
      consentManagement: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

function generateMockEmbedding(sampleCount: number): number[] {
  // Generate a mock embedding vector (512 dimensions)
  // In production, this would come from a real voice embedding model
  const dims = 512;
  const embedding = [];
  for (let i = 0; i < dims; i++) {
    embedding.push(Math.random() * 2 - 1);
  }
  return embedding;
}

function getTrustLevel(identity: VoiceIdentity): TrustLevel {
  const verifications = Array.from(verifications.values())
    .filter(v => v.identityId === identity.id && v.passed);

  const hasLiveness = verifications.some(v => v.type === 'liveness');
  const hasVerification = verifications.some(v => v.type === 'verification');
  const verificationCount = identity.verificationCount;

  if (hasLiveness && verificationCount >= 5) return 'platinum';
  if (hasVerification && verificationCount >= 3) return 'trusted';
  if (hasVerification) return 'verified';
  if (identity.userId) return 'basic';
  return 'unverified';
}

function calculateTrustScore(identity: VoiceIdentity): number {
  let score = 0;

  // Verification count (max 30 points)
  score += Math.min(30, identity.verificationCount * 6);

  // Trust level multiplier
  const levelScores: Record<TrustLevel, number> = {
    unverified: 0,
    basic: 10,
    verified: 30,
    trusted: 50,
    platinum: 70
  };
  score += levelScores[identity.trustLevel];

  // Recency bonus (max 10 points)
  if (identity.lastVerifiedAt) {
    const daysSince = (Date.now() - new Date(identity.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 10;
    else if (daysSince < 30) score += 5;
  }

  // Consent completeness (max 10 points)
  const consentValues = Object.values(identity.consent);
  const nonNone = consentValues.filter(v => v !== 'none').length;
  score += (nonNone / consentValues.length) * 10;

  return Math.min(100, Math.round(score));
}

function calculateTrustFactors(identity: VoiceIdentity): Array<{ factor: string; impact: number; description: string }> {
  const factors: Array<{ factor: string; impact: number; description: string }> = [];

  // Verification count
  factors.push({
    factor: 'verification_count',
    impact: identity.verificationCount > 3 ? 10 : -5,
    description: `${identity.verificationCount} verification${identity.verificationCount !== 1 ? 's' : ''} completed`
  });

  // Recency
  if (identity.lastVerifiedAt) {
    const daysSince = (Date.now() - new Date(identity.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
    factors.push({
      factor: 'recency',
      impact: daysSince < 30 ? 5 : -10,
      description: daysSince < 7 ? 'Recently verified' : `Last verified ${Math.round(daysSince)} days ago`
    });
  }

  // Consent settings
  if (identity.consent.cloneVoice === 'none') {
    factors.push({
      factor: 'clone_consent',
      impact: -5,
      description: 'Voice cloning disabled'
    });
  }

  return factors;
}

function generateTrustRecommendations(identity: VoiceIdentity, score: number): string[] {
  const recommendations: string[] = [];

  if (identity.verificationCount < 3) {
    recommendations.push('Complete 3+ verifications to increase trust');
  }

  if (!identity.lastVerifiedAt ||
      (Date.now() - new Date(identity.lastVerifiedAt).getTime()) > 30 * 24 * 60 * 60 * 1000) {
    recommendations.push('Re-verify your voice to maintain trust level');
  }

  if (identity.consent.financialActions === 'none') {
    recommendations.push('Enable financial action consent to unlock voice payments');
  }

  if (score < 50) {
    recommendations.push('Build trust by using voice authentication regularly');
  }

  return recommendations;
}

function checkCloneConsent(
  consent: ConsentSettings,
  consentProof?: string
): { allowed: boolean; requiresApproval: boolean; reason?: string } {
  if (consent.cloneVoice === 'none') {
    return { allowed: false, requiresApproval: false, reason: 'Voice cloning not permitted' };
  }

  if (consent.cloneVoice === 'family') {
    // Would check if requester is in family relationship
    return { allowed: false, requiresApproval: true, reason: 'Family consent required' };
  }

  if (consent.cloneVoice === 'trusted') {
    if (!consentProof) {
      return { allowed: false, requiresApproval: true, reason: 'Trusted agent proof required' };
    }
    return { allowed: true, requiresApproval: false };
  }

  // 'all'
  return { allowed: true, requiresApproval: false };
}

function authorizeAction(
  identity: VoiceIdentity,
  actionType: string,
  context?: Record<string, unknown>
): { authorized: boolean; reason: string; requirements?: string[] } {
  const requirements: string[] = [];

  switch (actionType) {
    case 'financial':
      if (identity.consent.financialActions === 'none') {
        return { authorized: false, reason: 'Financial action consent not granted' };
      }
      if (identity.trustLevel === 'unverified' || identity.trustLevel === 'basic') {
        requirements.push('identity_verified');
      }
      break;

    case 'personal_data':
      if (identity.consent.personalData === 'none') {
        return { authorized: false, reason: 'Personal data access not permitted' };
      }
      break;

    case 'agent_delegation':
      if (identity.consent.shareWithAgents === 'none') {
        return { authorized: false, reason: 'Agent delegation not permitted' };
      }
      break;
  }

  if (requirements.length > 0) {
    return {
      authorized: false,
      reason: 'Additional verification required',
      requirements
    };
  }

  return {
    authorized: true,
    reason: 'Action authorized based on trust level and consent'
  };
}

function addTrustEvent(
  identityId: string,
  type: string,
  reason: string,
  details?: Record<string, unknown>
): void {
  const events = trustEvents.get(identityId) || [];
  events.push({
    id: uuidv4(),
    identityId,
    type: type as TrustEvent['type'],
    action: 'added',
    newValue: details,
    reason,
    createdAt: new Date().toISOString()
  });

  // Keep only last 100 events
  if (events.length > 100) {
    events.shift();
  }

  trustEvents.set(identityId, events);
}

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4884;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          VOICE IDENTITY & TRUSTOS v1.0.0                   ║
║                                                                ║
║  🔐  Voice Security & Authorization                           ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Voice enrollment & verification                             ║
║  • Consent management                                          ║
║  • Trust scoring                                               ║
║  • Voice cloning authorization                                  ║
║  • Relationship graph                                         ║
║  • Action authorization                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[voice-identity] Shutting down...');
  server.close(() => {
    console.log('[voice-identity] Shutdown complete');
    process.exit(0);
  });
});

export default app;
