import { Customer, ICustomer } from '../models/Customer';
import { IdentityLink } from '../models/IdentityLink';
import logger from '../utils/logger';

export interface IdentityMatch {
  customer: ICustomer;
  confidence: number;
  matchedFields: string[];
  matchType: 'exact' | 'fuzzy' | 'probable';
}

export interface IdentityResolutionResult {
  masterCustomer: ICustomer;
  linkedCustomers: ICustomer[];
  allIdentities: Array<{ type: string; value: string; verified: boolean }>;
  wasResolved: boolean;
  action: 'found' | 'merged' | 'created';
}

export interface ResolutionCandidate {
  customer: ICustomer;
  score: number;
  matchedFields: string[];
}

class IdentityResolutionService {
  private readonly EXACT_MATCH_THRESHOLD = 0.95;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.60;

  /**
   * Resolve customer identity by finding or creating the master record
   */
  async resolveIdentity(identities: {
    email?: string;
    phone?: string;
    deviceId?: string;
    cookieId?: string;
    externalId?: string;
  }, source: string): Promise<IdentityResolutionResult> {
    const candidates: ResolutionCandidate[] = [];
    const matchedFields: string[] = [];

    // Search for existing customers by each identity
    if (identities.email) {
      const emailMatches = await this.findByEmail(identities.email);
      candidates.push(...emailMatches.map(c => ({
        customer: c,
        score: 0.95,
        matchedFields: ['email']
      })));
    }

    if (identities.phone) {
      const phoneMatches = await this.findByPhone(identities.phone);
      candidates.push(...phoneMatches.map(c => ({
        customer: c,
        score: 0.90,
        matchedFields: ['phone']
      })));
    }

    if (identities.deviceId) {
      const deviceMatches = await this.findByIdentity('device_id', identities.deviceId);
      candidates.push(...deviceMatches.map(c => ({
        customer: c,
        score: 0.80,
        matchedFields: ['device_id']
      })));
    }

    if (identities.cookieId) {
      const cookieMatches = await this.findByIdentity('cookie_id', identities.cookieId);
      candidates.push(...cookieMatches.map(c => ({
        customer: c,
        score: 0.70,
        matchedFields: ['cookie_id']
      })));
    }

    if (identities.externalId) {
      const externalMatches = await this.findByIdentity('external_id', identities.externalId);
      candidates.push(...externalMatches.map(c => ({
        customer: c,
        score: 0.85,
        matchedFields: ['external_id']
      })));
    }

    // Remove duplicates and merge scores for same customers
    const mergedCandidates = this.mergeCandidates(candidates);

    // Find the best match
    const bestMatch = mergedCandidates.reduce((best, current) =>
      current.score > best.score ? current : best,
      { customer: null as unknown as ICustomer, score: 0, matchedFields: [] as string[] }
    );

    if (bestMatch.customer && bestMatch.score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      // Found existing master customer
      logger.info(`Identity resolved: Found master customer ${bestMatch.customer.customerId}`, {
        score: bestMatch.score,
        matchedFields: bestMatch.matchedFields
      });

      return this.buildResolutionResult(bestMatch.customer, 'found');
    }

    if (mergedCandidates.length > 1) {
      // Multiple candidates - potential merge needed
      const topTwo = mergedCandidates.slice(0, 2);

      if (topTwo[0].score + topTwo[1].score >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        // High combined confidence - merge candidates
        logger.info('Identity resolution: Merging multiple candidates', {
          primary: topTwo[0].customer.customerId,
          secondary: topTwo[1].customer.customerId,
          scores: [topTwo[0].score, topTwo[1].score]
        });

        return this.mergeCustomers(topTwo[0].customer, topTwo[1].customer, source);
      }
    }

    // No match or low confidence - create new customer
    logger.info('Identity resolution: Creating new customer', {
      providedIdentities: Object.keys(identities).filter(k => identities[k as keyof typeof identities])
    });

    const newCustomer = await this.createWithIdentities(identities, source);
    return this.buildResolutionResult(newCustomer, 'created');
  }

  /**
   * Link two customer records together
   */
  async linkCustomers(
    masterId: string,
    linkedId: string,
    linkType: 'merged' | 'resolved' | 'associated',
    confidence: number,
    matchedFields: string[],
    linkedBy: string = 'system'
  ): Promise<IdentityLink> {
    const master = await Customer.findByCustomerId(masterId);
    const linked = await Customer.findByCustomerId(linkedId);

    if (!master || !linked) {
      throw new Error('One or both customers not found');
    }

    // Update masterId on linked customer
    linked.masterId = masterId;
    await linked.save();

    // Create identity link record
    const link = await IdentityLink.linkCustomers(
      masterId,
      linkedId,
      linkType,
      confidence,
      matchedFields,
      linkedBy
    );

    logger.info('Customers linked', {
      masterId,
      linkedId,
      linkType,
      confidence
    });

    return link;
  }

  /**
   * Get all linked customers for a master customer
   */
  async getLinkedCustomers(masterId: string): Promise<{
    master: ICustomer;
    linked: ICustomer[];
    allIdentities: Array<{ type: string; value: string; verified: boolean }>;
  }> {
    const master = await Customer.findByCustomerId(masterId);
    if (!master) {
      throw new Error('Master customer not found');
    }

    const linkedIds = await IdentityLink.getAllLinkedIds(masterId);
    const linked = await Customer.find({ customerId: { $in: linkedIds } });

    // Collect all identities
    const allIdentities: Array<{ type: string; value: string; verified: boolean }> = [];

    [...(master.identities || []), ...linked.flatMap(c => c.identities || [])]
      .forEach(id => {
        if (!allIdentities.some(existing =>
          existing.type === id.type && existing.value === id.value
        )) {
          allIdentities.push({
            type: id.type,
            value: id.value,
            verified: id.verified
          });
        }
      });

    return {
      master,
      linked,
      allIdentities
    };
  }

  /**
   * Calculate identity match confidence between two customer records
   */
  calculateMatchScore(customer1: Partial<ICustomer>, customer2: Partial<ICustomer>): {
    score: number;
    matchedFields: string[];
    matchType: 'exact' | 'fuzzy' | 'probable';
  } {
    let score = 0;
    const matchedFields: string[] = [];
    let exactMatches = 0;
    let possibleMatches = 0;

    // Email match (highest weight)
    if (customer1.email && customer2.email) {
      if (customer1.email.toLowerCase() === customer2.email.toLowerCase()) {
        score += 0.40;
        exactMatches++;
        matchedFields.push('email');
      }
    }

    // Phone match (high weight)
    if (customer1.phone && customer2.phone) {
      const phone1 = customer1.phone.replace(/\D/g, '');
      const phone2 = customer2.phone.replace(/\D/g, '');
      if (phone1 === phone2 && phone1.length >= 10) {
        score += 0.30;
        exactMatches++;
        matchedFields.push('phone');
      }
    }

    // Name match (medium weight)
    if (customer1.firstName && customer2.firstName) {
      if (customer1.firstName.toLowerCase() === customer2.firstName.toLowerCase()) {
        score += 0.10;
        possibleMatches++;
        matchedFields.push('firstName');
      }
    }

    if (customer1.lastName && customer2.lastName) {
      if (customer1.lastName.toLowerCase() === customer2.lastName.toLowerCase()) {
        score += 0.10;
        possibleMatches++;
        matchedFields.push('lastName');
      }
    }

    // Company match (low weight)
    if (customer1.company && customer2.company) {
      if (customer1.company.toLowerCase() === customer2.company.toLowerCase()) {
        score += 0.10;
        possibleMatches++;
        matchedFields.push('company');
      }
    }

    // Determine match type
    let matchType: 'exact' | 'fuzzy' | 'probable' = 'probable';
    if (exactMatches >= 2) {
      matchType = 'exact';
    } else if (exactMatches >= 1 || possibleMatches >= 2) {
      matchType = 'fuzzy';
    }

    return {
      score: Math.min(1, score),
      matchedFields,
      matchType
    };
  }

  // Private helper methods

  private async findByEmail(email: string): Promise<ICustomer[]> {
    const customer = await Customer.findByEmail(email);
    return customer ? [customer] : [];
  }

  private async findByPhone(phone: string): Promise<ICustomer[]> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const customer = await Customer.findByPhone(normalizedPhone);
    return customer ? [customer] : [];
  }

  private async findByIdentity(type: string, value: string): Promise<ICustomer[]> {
    return Customer.findByIdentity(type, value);
  }

  private mergeCandidates(candidates: ResolutionCandidate[]): ResolutionCandidate[] {
    const mergedMap = new Map<string, ResolutionCandidate>();

    for (const candidate of candidates) {
      const existing = mergedMap.get(candidate.customer.customerId);
      if (existing) {
        // Update score and fields
        existing.score = Math.min(1, existing.score + candidate.score * 0.5);
        existing.matchedFields = [...new Set([...existing.matchedFields, ...candidate.matchedFields])];
      } else {
        mergedMap.set(candidate.customer.customerId, {
          ...candidate,
          matchedFields: [...candidate.matchedFields]
        });
      }
    }

    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score);
  }

  private async mergeCustomers(
    primary: ICustomer,
    secondary: ICustomer,
    source: string
  ): Promise<IdentityResolutionResult> {
    // Link secondary to primary
    await this.linkCustomers(
      primary.customerId,
      secondary.customerId,
      'merged',
      0.85,
      ['email', 'phone'],
      'identity-resolution-service'
    );

    // Merge identities
    const mergedIdentities = [
      ...primary.identities,
      ...secondary.identities.filter(
        s => !primary.identities.some(p => p.type === s.type && p.value === s.value)
      )
    ];

    // Merge metrics (take highest values)
    primary.identities = mergedIdentities;
    primary.metrics = {
      totalOrders: Math.max(primary.metrics.totalOrders, secondary.metrics.totalOrders),
      totalRevenue: Math.max(primary.metrics.totalRevenue, secondary.metrics.totalRevenue),
      averageOrderValue: Math.max(primary.metrics.averageOrderValue, secondary.metrics.averageOrderValue),
      lifetimeDays: Math.max(primary.metrics.lifetimeDays, secondary.metrics.lifetimeDays),
      engagementScore: Math.max(primary.metrics.engagementScore, secondary.metrics.engagementScore),
      activityDays: Math.max(primary.metrics.activityDays, secondary.metrics.activityDays),
      lastActivityDate: primary.lastActivityAt > (secondary.lastActivityAt || new Date(0))
        ? primary.lastActivityAt
        : secondary.lastActivityAt
    };

    // Merge tags
    primary.tags = [...new Set([...primary.tags, ...secondary.tags])];

    await primary.save();

    logger.info('Customers merged', {
      primary: primary.customerId,
      secondary: secondary.customerId
    });

    return this.buildResolutionResult(primary, 'merged');
  }

  private async createWithIdentities(
    identities: {
      email?: string;
      phone?: string;
      deviceId?: string;
      cookieId?: string;
      externalId?: string;
    },
    source: string
  ): Promise<ICustomer> {
    const identityRecords: Array<{ type: string; value: string; verified: boolean }> = [];

    if (identities.email) {
      identityRecords.push({
        type: 'email',
        value: identities.email.toLowerCase(),
        verified: false
      });
    }

    if (identities.phone) {
      identityRecords.push({
        type: 'phone',
        value: identities.phone.replace(/\D/g, ''),
        verified: false
      });
    }

    if (identities.deviceId) {
      identityRecords.push({
        type: 'device_id',
        value: identities.deviceId,
        verified: false
      });
    }

    if (identities.cookieId) {
      identityRecords.push({
        type: 'cookie_id',
        value: identities.cookieId,
        verified: false
      });
    }

    if (identities.externalId) {
      identityRecords.push({
        type: 'external_id',
        value: identities.externalId,
        verified: false
      });
    }

    const customer = new Customer({
      email: identities.email?.toLowerCase(),
      phone: identities.phone?.replace(/\D/g, ''),
      identities: identityRecords,
      source,
      status: 'active'
    });

    await customer.save();
    return customer;
  }

  private async buildResolutionResult(
    customer: ICustomer,
    action: 'found' | 'merged' | 'created'
  ): Promise<IdentityResolutionResult> {
    const linked = customer.masterId
      ? await Customer.find({ masterId: customer.customerId })
      : [];

    const allIdentities = [
      ...(customer.identities || []),
      ...linked.flatMap(c => c.identities || [])
    ].filter((id, index, self) =>
      index === self.findIndex(i => i.type === id.type && i.value === id.value)
    );

    return {
      masterCustomer: customer,
      linkedCustomers: linked,
      allIdentities,
      wasResolved: action !== 'created',
      action
    };
  }
}

export const identityResolutionService = new IdentityResolutionService();
