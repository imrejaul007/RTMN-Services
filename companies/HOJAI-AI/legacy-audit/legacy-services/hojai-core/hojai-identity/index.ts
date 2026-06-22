/**
 * Hojai Identity Platform
 *
 * PORT: 4600
 *
 * Purpose:
 * - Identity Resolution (link identifiers to unified identity)
 * - Identity Linking (connect identities across channels)
 * - Cross-Channel Matching (map channel-specific IDs)
 * - Consent Mapping (track consent per channel)
 *
 * This platform does NOT own:
 * - Commerce Graph (belongs to REZ Intelligence)
 * - Mobility Graph (belongs to REZ Intelligence)
 * - Trust Graph (belongs to REZ Intelligence)
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-identity');

// ============================================
// IDENTITY TYPES
// ============================================

/**
 * Identity identifier types
 */
export type IdentifierType =
  | 'phone'
  | 'email'
  | 'device_id'
  | 'device_fingerprint'
  | 'cookie_id'
  | 'account_id'
  | 'external_id';

/**
 * Channel types
 */
export type Channel =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'webchat'
  | 'pos'
  | 'app'
  | 'website'
  | 'api';

/**
 * Identity identifier
 */
export interface Identifier {
  type: IdentifierType;
  value: string;
  channel?: Channel;
  verified: boolean;
  verified_at?: string;
  first_seen_at: string;
  last_seen_at: string;
}

/**
 * Unified identity
 */
export interface UnifiedIdentity {
  id: string;
  tenant_id: string;
  primary_customer_id: string;
  identifiers: Identifier[];
  link_count: number;
  confidence_score: number;
  resolution_method: 'deterministic' | 'probabilistic' | 'manual';
  status: 'active' | 'flagged' | 'merged';
  merged_into?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Identity link
 */
export interface IdentityLink {
  id: string;
  tenant_id: string;
  identity_a_id: string;
  identity_b_id: string;
  link_type: 'same_person' | 'same_household' | 'same_device' | 'manual';
  confidence: number;
  created_at: string;
  created_by?: string;
}

/**
 * Channel mapping
 */
export interface ChannelMapping {
  id: string;
  tenant_id: string;
  identity_id: string;
  channel: Channel;
  channel_identity: string;
  created_at: string;
}

/**
 * Consent mapping
 */
export interface ConsentMapping {
  id: string;
  tenant_id: string;
  identity_id: string;
  channel: Channel;
  consent_status: Record<string, boolean>;
  last_updated: string;
}

// ============================================
// IDENTITY RESOLUTION SERVICE
// ============================================

/**
 * Identity Resolution Engine
 */
class IdentityResolutionEngine {
  private identities: Map<string, UnifiedIdentity> = new Map();
  private identityByIdentifier: Map<string, string> = new Map(); // identifier → identity_id

  /**
   * Resolve identifiers to unified identity
   */
  async resolve(
    tenantId: string,
    identifiers: { type: IdentifierType; value: string }[]
  ): Promise<{
    identity?: UnifiedIdentity;
    isNew: boolean;
    resolutionMethod: 'deterministic' | 'probabilistic' | 'none';
  }> {
    // Check if any identifier already maps to an identity
    for (const idf of identifiers) {
      const key = `${tenantId}:${idf.type}:${idf.value}`;
      const existingId = this.identityByIdentifier.get(key);

      if (existingId) {
        const identity = this.identities.get(existingId);
        if (identity) {
          // Update last_seen for all identifiers
          this.updateIdentifierLastSeen(identity, identifiers);

          return {
            identity,
            isNew: false,
            resolutionMethod: 'deterministic'
          };
        }
      }
    }

    // Create new identity
    const identity = this.createIdentity(tenantId, identifiers);
    this.identities.set(identity.id, identity);

    // Index identifiers
    for (const idf of identifiers) {
      const key = `${tenantId}:${idf.type}:${idf.value}`;
      this.identityByIdentifier.set(key, identity.id);
    }

    logger.info('identity_resolved_new', {
      tenantId,
      identityId: identity.id,
      identifierCount: identifiers.length
    });

    return {
      identity,
      isNew: true,
      resolutionMethod: 'deterministic'
    };
  }

  /**
   * Get identity by ID
   */
  async getIdentity(tenantId: string, identityId: string): Promise<UnifiedIdentity | null> {
    const identity = this.identities.get(identityId);
    if (!identity || identity.tenant_id !== tenantId) return null;
    return identity;
  }

  /**
   * Get identity by identifier
   */
  async getIdentityByIdentifier(
    tenantId: string,
    type: IdentifierType,
    value: string
  ): Promise<UnifiedIdentity | null> {
    const key = `${tenantId}:${type}:${value}`;
    const identityId = this.identityByIdentifier.get(key);
    if (!identityId) return null;
    return this.getIdentity(tenantId, identityId);
  }

  /**
   * Link two identities
   */
  async linkIdentities(
    tenantId: string,
    identityAId: string,
    identityBId: string,
    linkType: IdentityLink['link_type'],
    confidence: number = 1.0
  ): Promise<IdentityLink> {
    const identityA = this.identities.get(identityAId);
    const identityB = this.identities.get(identityBId);

    if (!identityA || !identityB) {
      throw new Error('Identity not found');
    }

    // Merge identifiers from B into A
    const mergedIdentifiers = [...identityA.identifiers, ...identityB.identifiers];

    // Update identity A
    const updatedA: UnifiedIdentity = {
      ...identityA,
      identifiers: mergedIdentifiers,
      link_count: identityA.link_count + 1,
      confidence_score: Math.min(1, identityA.confidence_score + 0.1),
      updated_at: new Date().toISOString()
    };

    this.identities.set(identityAId, updatedA);

    // Mark identity B as merged
    const updatedB: UnifiedIdentity = {
      ...identityB,
      status: 'merged',
      merged_into: identityAId,
      updated_at: new Date().toISOString()
    };

    this.identities.set(identityBId, updatedB);

    // Update identifier index for B's identifiers
    for (const idf of identityB.identifiers) {
      const key = `${tenantId}:${idf.type}:${idf.value}`;
      this.identityByIdentifier.set(key, identityAId);
    }

    // Return link record
    const link: IdentityLink = {
      id: `link_${Date.now()}`,
      tenant_id: tenantId,
      identity_a_id: identityAId,
      identity_b_id: identityBId,
      link_type: linkType,
      confidence,
      created_at: new Date().toISOString()
    };

    logger.info('identities_linked', {
      tenantId,
      identityAId,
      identityBId,
      linkType
    });

    return link;
  }

  /**
   * Get cross-channel identity
   */
  async getCrossChannelIdentity(
    tenantId: string,
    identityId: string
  ): Promise<{ channel: Channel; channelIdentity: string }[]> {
    const identity = await this.getIdentity(tenantId, identityId);
    if (!identity) return [];

    return identity.identifiers
      .filter(idf => idf.channel)
      .map(idf => ({
        channel: idf.channel!,
        channelIdentity: idf.value
      }));
  }

  /**
   * Create new identity
   */
  private createIdentity(
    tenantId: string,
    identifiers: { type: IdentifierType; value: string }[]
  ): UnifiedIdentity {
    const now = new Date().toISOString();

    return {
      id: `uid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      primary_customer_id: identifiers[0]?.value || '',
      identifiers: identifiers.map(idf => ({
        type: idf.type,
        value: idf.value,
        channel: idf.channel,
        verified: false,
        first_seen_at: now,
        last_seen_at: now
      })),
      link_count: 0,
      confidence_score: identifiers.length > 1 ? 0.9 : 0.5,
      resolution_method: 'deterministic',
      status: 'active',
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Update identifier last seen
   */
  private updateIdentifierLastSeen(
    identity: UnifiedIdentity,
    newIdentifiers: { type: IdentifierType; value: string }[]
  ): void {
    const now = new Date().toISOString();

    for (const existingIdf of identity.identifiers) {
      for (const newIdf of newIdentifiers) {
        if (
          existingIdf.type === newIdf.type &&
          existingIdf.value === newIdf.value
        ) {
          existingIdf.last_seen_at = now;
        }
      }
    }
  }
}

// ============================================
// CONSENT MAPPING SERVICE
// ============================================

/**
 * Consent Mapping Engine
 */
class ConsentMappingEngine {
  private consentMappings: Map<string, ConsentMapping> = new Map();

  /**
   * Map consent to channel for identity
   */
  async mapConsent(
    tenantId: string,
    identityId: string,
    channel: Channel,
    consentStatus: Record<string, boolean>
  ): Promise<ConsentMapping> {
    const key = `${tenantId}:${identityId}:${channel}`;
    const now = new Date().toISOString();

    const mapping: ConsentMapping = {
      id: `cmap_${Date.now()}`,
      tenant_id: tenantId,
      identity_id: identityId,
      channel,
      consent_status: consentStatus,
      last_updated: now
    };

    this.consentMappings.set(key, mapping);

    logger.info('consent_mapped', { tenantId, identityId, channel });

    return mapping;
  }

  /**
   * Get consent for identity on channel
   */
  async getConsent(
    tenantId: string,
    identityId: string,
    channel: Channel
  ): Promise<ConsentMapping | null> {
    const key = `${tenantId}:${identityId}:${channel}`;
    return this.consentMappings.get(key) || null;
  }

  /**
   * Get all consents for identity
   */
  async getAllConsents(
    tenantId: string,
    identityId: string
  ): Promise<ConsentMapping[]> {
    const results: ConsentMapping[] = [];

    for (const mapping of this.consentMappings.values()) {
      if (mapping.tenant_id === tenantId && mapping.identity_id === identityId) {
        results.push(mapping);
      }
    }

    return results;
  }

  /**
   * Check if consent is granted for all channels
   */
  async isConsentGranted(
    tenantId: string,
    identityId: string,
    consentType: string
  ): Promise<boolean> {
    const consents = await this.getAllConsents(tenantId, identityId);

    // If no consent mappings, assume not granted
    if (consents.length === 0) return false;

    // Check if granted on at least one active channel
    for (const consent of consents) {
      if (consent.consent_status[consentType] === true) {
        return true;
      }
    }

    return false;
  }
}

// ============================================
// MAIN PLATFORM
// ============================================

export class HojaiIdentityPlatform {
  private resolutionEngine: IdentityResolutionEngine;
  private consentEngine: ConsentMappingEngine;

  constructor() {
    this.resolutionEngine = new IdentityResolutionEngine();
    this.consentEngine = new ConsentMappingEngine();
  }

  // ========== IDENTITY RESOLUTION ==========

  async resolve(
    tenantId: string,
    identifiers: { type: IdentifierType; value: string }[]
  ) {
    return this.resolutionEngine.resolve(tenantId, identifiers);
  }

  async getIdentity(tenantId: string, identityId: string) {
    return this.resolutionEngine.getIdentity(tenantId, identityId);
  }

  async getIdentityByIdentifier(
    tenantId: string,
    type: IdentifierType,
    value: string
  ) {
    return this.resolutionEngine.getIdentityByIdentifier(tenantId, type, value);
  }

  async linkIdentities(
    tenantId: string,
    identityAId: string,
    identityBId: string,
    linkType: IdentityLink['link_type'],
    confidence?: number
  ) {
    return this.resolutionEngine.linkIdentities(
      tenantId,
      identityAId,
      identityBId,
      linkType,
      confidence
    );
  }

  async getCrossChannelIdentity(tenantId: string, identityId: string) {
    return this.resolutionEngine.getCrossChannelIdentity(tenantId, identityId);
  }

  // ========== CONSENT MAPPING ==========

  async mapConsent(
    tenantId: string,
    identityId: string,
    channel: Channel,
    consentStatus: Record<string, boolean>
  ) {
    return this.consentEngine.mapConsent(tenantId, identityId, channel, consentStatus);
  }

  async getConsent(
    tenantId: string,
    identityId: string,
    channel: Channel
  ) {
    return this.consentEngine.getConsent(tenantId, identityId, channel);
  }

  async getAllConsents(tenantId: string, identityId: string) {
    return this.consentEngine.getAllConsents(tenantId, identityId);
  }

  async isConsentGranted(
    tenantId: string,
    identityId: string,
    consentType: string
  ) {
    return this.consentEngine.isConsentGranted(tenantId, identityId, consentType);
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

export function createIdentityRoutes(platform: HojaiIdentityPlatform) {
  const router = express.Router();

  // ========== IDENTITY RESOLUTION ==========

  /**
   * POST /api/identity/resolve
   * Resolve identifiers to unified identity
   */
  router.post('/resolve', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { identifiers } = req.body;

      if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'identifiers array is required')
        );
      }

      const result = await platform.resolve(tenantId, identifiers);
      res.json(createResponse(result, { tenantId }));
    } catch (error: any) {
      logger.error('resolve_error', { error });
      res.status(500).json(
        createErrorResponse('RESOLVE_ERROR', error.message)
      );
    }
  });

  /**
   * GET /api/identity/:id
   * Get identity by ID
   */
  router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const identity = await platform.getIdentity(tenantId, req.params.id);

      if (!identity) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Identity not found')
        );
      }

      res.json(createResponse(identity, { tenantId }));
    } catch (error: any) {
      logger.error('get_identity_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', error.message)
      );
    }
  });

  /**
   * GET /api/identity/by-identifier/:type/:value
   * Get identity by identifier
   */
  router.get(
    '/by-identifier/:type/:value',
    tenantMiddleware(),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.tenantContext!.tenant_id;
        const { type, value } = req.params;

        const identity = await platform.getIdentityByIdentifier(
          tenantId,
          type as IdentifierType,
          decodeURIComponent(value)
        );

        if (!identity) {
          return res.status(404).json(
            createErrorResponse('NOT_FOUND', 'Identity not found')
          );
        }

        res.json(createResponse(identity, { tenantId }));
      } catch (error: any) {
        logger.error('get_by_identifier_error', { error });
        res.status(500).json(
          createErrorResponse('GET_ERROR', error.message)
        );
      }
    }
  );

  /**
   * POST /api/identity/link
   * Link two identities
   */
  router.post('/link', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { identityAId, identityBId, linkType, confidence } = req.body;

      if (!identityAId || !identityBId || !linkType) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'identityAId, identityBId, and linkType are required')
        );
      }

      const link = await platform.linkIdentities(
        tenantId,
        identityAId,
        identityBId,
        linkType,
        confidence
      );

      res.json(createResponse(link, { tenantId }));
    } catch (error: any) {
      logger.error('link_error', { error });
      res.status(400).json(
        createErrorResponse('LINK_ERROR', error.message)
      );
    }
  });

  /**
   * GET /api/identity/:id/channels
   * Get cross-channel identity
   */
  router.get('/:id/channels', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const channels = await platform.getCrossChannelIdentity(tenantId, req.params.id);
      res.json(createResponse(channels, { tenantId }));
    } catch (error: any) {
      logger.error('get_channels_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', error.message)
      );
    }
  });

  // ========== CONSENT MAPPING ==========

  /**
   * POST /api/identity/consent
   * Map consent to channel
   */
  router.post('/consent', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { identityId, channel, consentStatus } = req.body;

      if (!identityId || !channel || !consentStatus) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'identityId, channel, and consentStatus are required')
        );
      }

      const mapping = await platform.mapConsent(
        tenantId,
        identityId,
        channel,
        consentStatus
      );

      res.json(createResponse(mapping, { tenantId }));
    } catch (error: any) {
      logger.error('map_consent_error', { error });
      res.status(500).json(
        createErrorResponse('CONSENT_ERROR', error.message)
      );
    }
  });

  /**
   * GET /api/identity/consent/:identityId
   * Get all consents for identity
   */
  router.get('/consent/:identityId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const consents = await platform.getAllConsents(tenantId, req.params.identityId);
      res.json(createResponse(consents, { tenantId }));
    } catch (error: any) {
      logger.error('get_consents_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', error.message)
      );
    }
  });

  /**
   * POST /api/identity/consent/check
   * Check if consent is granted
   */
  router.post('/consent/check', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { identityId, consentType } = req.body;

      if (!identityId || !consentType) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'identityId and consentType are required')
        );
      }

      const granted = await platform.isConsentGranted(tenantId, identityId, consentType);
      res.json(createResponse({ granted }, { tenantId }));
    } catch (error: any) {
      logger.error('check_consent_error', { error });
      res.status(500).json(
        createErrorResponse('CHECK_ERROR', error.message)
      );
    }
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4600) {
  const platform = new HojaiIdentityPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-identity',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/identity', createIdentityRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_identity_platform_started', { port });
  });

  return { platform, app };
}

export default { HojaiIdentityPlatform, createIdentityRoutes, bootstrap };
