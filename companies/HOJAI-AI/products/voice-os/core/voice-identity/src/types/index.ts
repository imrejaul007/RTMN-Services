/**
 * Voice Identity & TrustOS Types
 * =============================
 * Voiceprint management, consent, and trust for voice interactions.
 */

// Voice identity types
export interface VoiceIdentity {
  id: string;
  userId: string;
  type: IdentityType;
  name: string;
  voiceprint: Voiceprint;
  consent: ConsentSettings;
  trustLevel: TrustLevel;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  verificationCount: number;
}

export type IdentityType =
  | 'human'           // Personal voice
  | 'agent'           // AI agent voice
  | 'company'         // Company/organization voice
  | 'family'          // Family member voice
  | 'brand';          // Brand voice (e.g., hotel, restaurant)

export interface Voiceprint {
  id: string;
  embedding: number[]; // Voice embedding vector
  model: string;
  confidence: number;
  sampleCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface ConsentSettings {
  cloneVoice: ConsentLevel;
  financialActions: ConsentLevel;
  personalData: ConsentLevel;
  shareWithAgents: ConsentLevel;
  thirdPartyAccess: ConsentLevel;
}

export type ConsentLevel = 'none' | 'family' | 'trusted' | 'all';

// Trust levels
export type TrustLevel =
  | 'unverified'      // No verification done
  | 'basic'           // Email/phone verified
  | 'verified'        // Identity verified
  | 'trusted'         // High-trust verified
  | 'platinum';       // Maximum trust

// Verification types
export interface VoiceVerification {
  id: string;
  identityId: string;
  type: VerificationType;
  status: 'pending' | 'verified' | 'failed';
  confidence: number;
  threshold: number;
  passed: boolean;
  audioSample?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export type VerificationType =
  | 'enrollment'      // Initial voice enrollment
  | 'verification'    // Verify identity
  | 'liveness';      // Real human vs recording

// Voice clone requests
export interface VoiceCloneRequest {
  id: string;
  identityId: string;
  targetIdentityId?: string; // For authorized cloning
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  consentVerified: boolean;
  sampleCount: number;
  duration: number; // seconds
  purpose: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

// Trust events
export interface TrustEvent {
  id: string;
  identityId: string;
  type: TrustEventType;
  action: 'added' | 'removed' | 'updated';
  previousValue?: unknown;
  newValue?: unknown;
  reason: string;
  verifiedBy?: string;
  createdAt: string;
}

export type TrustEventType =
  | 'identity_verified'
  | 'consent_updated'
  | 'trust_level_changed'
  | 'voiceprint_updated'
  | 'suspicious_activity'
  | 'verification_failed'
  | 'clone_request';

// Relationship graph
export interface RelationshipNode {
  id: string;
  identityId: string;
  relatedIdentityId: string;
  relationship: RelationshipType;
  trust: number; // 0-1
  sharedContexts: string[];
  lastInteraction?: string;
  interactionCount: number;
}

export type RelationshipType =
  | 'self'           // Own identities
  | 'family'         // Family member
  | 'friend'         // Friend
  | 'colleague'      // Work colleague
  | 'employee'        // Employee
  | 'customer'        // Customer
  | 'agent'          // AI agent
  | 'company';       // Company identity

// API Request/Response types
export interface RegisterVoiceRequest {
  userId: string;
  type: IdentityType;
  name: string;
  audioSamples: string[]; // base64 encoded
  consent?: Partial<ConsentSettings>;
}

export interface RegisterVoiceResponse {
  success: boolean;
  identity: VoiceIdentity;
  verificationRequired: boolean;
}

export interface VerifyVoiceRequest {
  identityId: string;
  audioSample: string;
  type: VerificationType;
}

export interface VerifyVoiceResponse {
  success: boolean;
  verification: VoiceVerification;
  isMatch: boolean;
  confidence: number;
  requiresLiveness: boolean;
}

export interface CloneVoiceRequest {
  sourceIdentityId: string;
  targetName: string;
  targetType: IdentityType;
  purpose: string;
  consentProof?: string;
}

export interface CloneVoiceResponse {
  success: boolean;
  request: VoiceCloneRequest;
  estimatedCompletion?: string;
}

export interface GetTrustScoreResponse {
  success: boolean;
  identityId: string;
  trustLevel: TrustLevel;
  score: number; // 0-100
  factors: TrustFactor[];
  recommendations: string[];
}

export interface TrustFactor {
  factor: string;
  impact: number; // positive or negative
  description: string;
}

export interface ConsentUpdateRequest {
  identityId: string;
  consent: Partial<ConsentSettings>;
  reason: string;
}

export interface RelationshipUpdateRequest {
  identityId: string;
  relatedIdentityId: string;
  relationship: RelationshipType;
  trust?: number;
}
