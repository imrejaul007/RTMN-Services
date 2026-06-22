/**
 * Identity Bridge - Cross-company identity resolution
 *
 * Connects user identities across:
 * - RABTUL (primary auth)
 * - REZ-Intelligence (unified profile)
 * - REZ-Media (engagement profiles)
 * - BuzzLocal (local community)
 * - REZ-Merchant (business profiles)
 */

import { v4 as uuidv4 } from 'uuid';

export interface IdentityLink {
  id: string;
  primaryId: string;
  company: 'RABTUL' | 'REZ-Intelligence' | 'REZ-Media' | 'REZ-Consumer' | 'REZ-Merchant';
  externalId: string;
  linkedAt: Date;
  lastSeen: Date;
}

export interface UnifiedIdentity {
  id: string;
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  links: IdentityLink[];
  createdAt: Date;
  updatedAt: Date;
}

export class IdentityBridge {
  private identities: Map<string, UnifiedIdentity> = new Map();
  private externalToPrimary: Map<string, string> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // This would normally load from database
    // For now, just initializing the structure
  }

  /**
   * Create or get unified identity for a user
   */
  async getOrCreate(userId: string, company: IdentityLink['company']): Promise<UnifiedIdentity> {
    const existing = Array.from(this.identities.values()).find(
      identity => identity.links.some(link => link.company === company && link.externalId === userId)
    );

    if (existing) {
      return existing;
    }

    // Create new unified identity
    const identity: UnifiedIdentity = {
      id: uuidv4(),
      userId,
      links: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.identities.set(identity.id, identity);
    await this.link(identity.id, userId, company);

    return identity;
  }

  /**
   * Link an external ID to a unified identity
   */
  async link(
    primaryId: string,
    externalId: string,
    company: IdentityLink['company']
  ): Promise<IdentityLink> {
    const identity = this.identities.get(primaryId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Check if already linked
    const existingLink = identity.links.find(
      link => link.company === company && link.externalId === externalId
    );
    if (existingLink) {
      return existingLink;
    }

    const link: IdentityLink = {
      id: uuidv4(),
      primaryId,
      company,
      externalId,
      linkedAt: new Date(),
      lastSeen: new Date(),
    };

    identity.links.push(link);
    identity.updatedAt = new Date();

    // Create reverse mapping
    this.externalToPrimary.set(`${company}:${externalId}`, primaryId);

    return link;
  }

  /**
   * Resolve external ID to unified identity
   */
  async resolve(
    externalId: string,
    company: IdentityLink['company']
  ): Promise<UnifiedIdentity | null> {
    const primaryId = this.externalToPrimary.get(`${company}:${externalId}`);
    if (!primaryId) return null;

    const identity = this.identities.get(primaryId);
    if (!identity) return null;

    // Update last seen
    const link = identity.links.find(
      l => l.company === company && l.externalId === externalId
    );
    if (link) {
      link.lastSeen = new Date();
    }
    identity.updatedAt = new Date();

    return identity;
  }

  /**
   * Get all linked IDs for a unified identity
   */
  async getLinkedIds(primaryId: string): Promise<Map<IdentityLink['company'], string>> {
    const identity = this.identities.get(primaryId);
    if (!identity) return new Map();

    const result = new Map<IdentityLink['company'], string>();
    identity.links.forEach(link => {
      result.set(link.company, link.externalId);
    });

    return result;
  }

  /**
   * Merge two unified identities
   */
  async merge(sourceId: string, targetId: string): Promise<UnifiedIdentity> {
    const source = this.identities.get(sourceId);
    const target = this.identities.get(targetId);

    if (!source || !target) {
      throw new Error('Identity not found');
    }

    // Merge links
    source.links.forEach(link => {
      const exists = target.links.some(
        l => l.company === link.company && l.externalId === link.externalId
      );
      if (!exists) {
        target.links.push(link);
        this.externalToPrimary.set(`${link.company}:${link.externalId}`, targetId);
      }
    });

    // Update metadata
    if (source.email && !target.email) target.email = source.email;
    if (source.phone && !target.phone) target.phone = source.phone;
    if (source.name && !target.name) target.name = source.name;
    target.updatedAt = new Date();

    // Remove source identity
    this.identities.delete(sourceId);

    return target;
  }

  /**
   * Update user profile info
   */
  async updateProfile(
    primaryId: string,
    data: { email?: string; phone?: string; name?: string }
  ): Promise<UnifiedIdentity | null> {
    const identity = this.identities.get(primaryId);
    if (!identity) return null;

    if (data.email) identity.email = data.email;
    if (data.phone) identity.phone = data.phone;
    if (data.name) identity.name = data.name;
    identity.updatedAt = new Date();

    return identity;
  }

  /**
   * Get all unified identities (admin)
   */
  list(limit = 100): UnifiedIdentity[] {
    return Array.from(this.identities.values()).slice(0, limit);
  }
}
