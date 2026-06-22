// Trust Badge Service - Manage trust verification badges

import { v4 as uuidv4 } from "uuid";
import {
  TrustBadge,
  TrustBadgeType,
  TrustLevel,
  TrustScore,
  PaginationParams,
  PaginatedResponse
} from "../types";

/**
 * Badge definitions with criteria and metadata
 */
const BADGE_DEFINITIONS: Record<TrustBadgeType, Omit<TrustBadge, "earnedAt" | "expiresAt" | "verified">> = {
  [TrustBadgeType.VERIFIED_IDENTITY]: {
    type: TrustBadgeType.VERIFIED_IDENTITY,
    name: "Verified Identity",
    description: "Identity has been verified through official channels",
    criteria: "Complete KYC verification with valid documentation",
    icon: "shield-check"
  },
  [TrustBadgeType.PREMIUM_MEMBER]: {
    type: TrustBadgeType.PREMIUM_MEMBER,
    name: "Premium Member",
    description: "Active premium subscription holder",
    criteria: "Maintain TRUST_LEVEL.PREMIUM for 30+ consecutive days",
    icon: "star-premium"
  },
  [TrustBadgeType.EARLY_ADOPTER]: {
    type: TrustBadgeType.EARLY_ADOPTER,
    name: "Early Adopter",
    description: "Joined during the platform's early stages",
    criteria: "Registered before official launch date",
    icon: "rocket"
  },
  [TrustBadgeType.TOP_RATED]: {
    type: TrustBadgeType.TOP_RATED,
    name: "Top Rated",
    description: "Consistently high ratings from network peers",
    criteria: "Maintain 4.5+ average rating with 50+ reviews",
    icon: "trophy"
  },
  [TrustBadgeType.COMPLIANCE_CHAMPION]: {
    type: TrustBadgeType.COMPLIANCE_CHAMPION,
    name: "Compliance Champion",
    description: "Outstanding contract compliance record",
    criteria: "100% contract completion rate with 50+ contracts",
    icon: "award"
  },
  [TrustBadgeType.NETWORK_TRUSTED]: {
    type: TrustBadgeType.NETWORK_TRUSTED,
    name: "Network Trusted",
    description: "Trusted by multiple verified network members",
    criteria: "Receive 20+ trust endorsements from verified members",
    icon: "users-trust"
  },
  [TrustBadgeType.LONG_STANDING]: {
    type: TrustBadgeType.LONG_STANDING,
    name: "Long Standing Member",
    description: "Established member with proven track record",
    criteria: "Active for 365+ days with positive trust trajectory",
    icon: "clock-elapsed"
  },
  [TrustBadgeType.ZERO_DISPUTES]: {
    type: TrustBadgeType.ZERO_DISPUTES,
    name: "Zero Disputes",
    description: "No disputes filed against this entity",
    criteria: "Complete 50+ transactions with zero dispute claims",
    icon: "check-circle"
  },
  [TrustBadgeType.SECURITY_CERTIFIED]: {
    type: TrustBadgeType.SECURITY_CERTIFIED,
    name: "Security Certified",
    description: "Meets platform security standards",
    criteria: "Pass security audit and enable 2FA + security key",
    icon: "lock-secure"
  },
  [TrustBadgeType.KYC_COMPLETED]: {
    type: TrustBadgeType.KYC_COMPLETED,
    name: "KYC Completed",
    description: "Know Your Customer verification completed",
    criteria: "Submit and verify government-issued ID and proof of address",
    icon: "id-card"
  }
};

/**
 * Badge eligibility criteria functions
 */
const BADGE_ELIGIBILITY: Record<TrustBadgeType, (score: TrustScore) => boolean> = {
  [TrustBadgeType.VERIFIED_IDENTITY]: (score) =>
    score.factors.some(f => f.type === "IDENTITY_VERIFICATION" && f.score >= 80),

  [TrustBadgeType.PREMIUM_MEMBER]: (score) =>
    score.level === TrustLevel.PREMIUM,

  [TrustBadgeType.EARLY_ADOPTER]: (score) =>
    score.factors.some(f => f.type === "IDENTITY_STABILITY" && f.score >= 90),

  [TrustBadgeType.TOP_RATED]: (score) =>
    score.factors.some(f => f.type === "NETWORK_REPUTATION" && f.score >= 85),

  [TrustBadgeType.COMPLIANCE_CHAMPION]: (score) =>
    score.factors.some(f => f.type === "CONTRACT_COMPLIANCE" && f.score >= 95),

  [TrustBadgeType.NETWORK_TRUSTED]: (score) =>
    score.factors.some(f => f.type === "NETWORK_CONNECTIONS" && f.score >= 70),

  [TrustBadgeType.LONG_STANDING]: (score) =>
    score.factors.some(f => f.type === "IDENTITY_STABILITY" && f.score >= 75),

  [TrustBadgeType.ZERO_DISPUTES]: (score) =>
    score.factors.some(f => f.type === "HISTORICAL_BEHAVIOR" && f.score >= 90),

  [TrustBadgeType.SECURITY_CERTIFIED]: (score) =>
    score.factors.some(f => f.type === "VERIFICATION_DEPTH" && f.score >= 80),

  [TrustBadgeType.KYC_COMPLETED]: (score) =>
    score.factors.some(f => f.type === "IDENTITY_VERIFICATION" && f.score >= 100)
};

/**
 * In-memory badge storage
 */
const badgeStore: Map<string, TrustBadge[]> = new Map();

/**
 * Trust Badge Service class
 */
export class TrustBadgeService {
  /**
   * Award a badge to an entity
   */
  awardBadge(
    entityId: string,
    badgeType: TrustBadgeType,
    expiresInDays?: number,
    issuer?: string
  ): TrustBadge {
    const badges = badgeStore.get(entityId) || [];

    // Check if already has this badge
    const existingBadge = badges.find(b => b.type === badgeType);
    if (existingBadge) {
      // Refresh the badge
      existingBadge.earnedAt = new Date().toISOString();
      if (expiresInDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        existingBadge.expiresAt = expiresAt.toISOString();
      }
      existingBadge.verified = true;
      return existingBadge;
    }

    const definition = BADGE_DEFINITIONS[badgeType];
    const now = new Date();
    const earnedAt = now.toISOString();

    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    const badge: TrustBadge = {
      ...definition,
      earnedAt,
      expiresAt,
      verified: true,
      issuer
    };

    badges.push(badge);
    badgeStore.set(entityId, badges);

    return badge;
  }

  /**
   * Revoke a badge from an entity
   */
  revokeBadge(entityId: string, badgeType: TrustBadgeType): boolean {
    const badges = badgeStore.get(entityId) || [];
    const index = badges.findIndex(b => b.type === badgeType);

    if (index === -1) return false;

    badges.splice(index, 1);
    badgeStore.set(entityId, badges);
    return true;
  }

  /**
   * Get all badges for an entity
   */
  getBadges(entityId: string): TrustBadge[] {
    const badges = badgeStore.get(entityId) || [];
    return badges.filter(badge => {
      if (badge.expiresAt && new Date(badge.expiresAt) < new Date()) {
        // Remove expired badges
        this.revokeBadge(entityId, badge.type);
        return false;
      }
      return true;
    });
  }

  /**
   * Get a specific badge
   */
  getBadge(entityId: string, badgeType: TrustBadgeType): TrustBadge | null {
    const badges = this.getBadges(entityId);
    return badges.find(b => b.type === badgeType) || null;
  }

  /**
   * Check badge eligibility and award if eligible
   */
  checkAndAwardBadges(entityId: string, score: TrustScore): TrustBadge[] {
    const awarded: TrustBadge[] = [];

    for (const [badgeType, isEligible] of Object.entries(BADGE_ELIGIBILITY)) {
      if (isEligible(score)) {
        const badge = this.awardBadge(entityId, badgeType as TrustBadgeType);
        awarded.push(badge);
      }
    }

    return awarded;
  }

  /**
   * Get eligible badges for an entity (not yet earned)
   */
  getEligibleBadges(entityId: string, score: TrustScore): TrustBadgeType[] {
    const currentBadges = this.getBadges(entityId);
    const currentTypes = new Set(currentBadges.map(b => b.type));

    const eligible: TrustBadgeType[] = [];

    for (const [badgeType, isEligible] of Object.entries(BADGE_ELIGIBILITY)) {
      if (!currentTypes.has(badgeType as TrustBadgeType) && isEligible(score)) {
        eligible.push(badgeType as TrustBadgeType);
      }
    }

    return eligible;
  }

  /**
   * Get badge definitions
   */
  getBadgeDefinitions(): typeof BADGE_DEFINITIONS {
    return { ...BADGE_DEFINITIONS };
  }

  /**
   * Get all unique badges across the platform
   */
  getAllPlatformBadges(): Array<{ badge: TrustBadge; count: number }> {
    const badgeCounts: Record<TrustBadgeType, number> = {} as Record<TrustBadgeType, number>;

    for (const badges of badgeStore.values()) {
      for (const badge of badges) {
        badgeCounts[badge.type] = (badgeCounts[badge.type] || 0) + 1;
      }
    }

    return Object.entries(BADGE_DEFINITIONS).map(([type, def]) => ({
      badge: {
        ...def,
        earnedAt: "",
        verified: true
      },
      count: badgeCounts[type as TrustBadgeType] || 0
    }));
  }

  /**
   * Get entities with a specific badge
   */
  getEntitiesWithBadge(badgeType: TrustBadgeType): string[] {
    const entities: string[] = [];

    for (const [entityId, badges] of badgeStore.entries()) {
      if (badges.some(b => b.type === badgeType)) {
        entities.push(entityId);
      }
    }

    return entities;
  }

  /**
   * Get paginated badges
   */
  getPaginatedBadges(
    entityId: string,
    pagination: PaginationParams
  ): PaginatedResponse<TrustBadge> {
    const badges = this.getBadges(entityId);
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;

    return {
      items: badges.slice(start, end),
      total: badges.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(badges.length / pagination.limit),
      hasMore: end < badges.length
    };
  }

  /**
   * Calculate badge score bonus
   */
  calculateBadgeBonus(entityId: string): number {
    const badges = this.getBadges(entityId);
    let bonus = 0;

    // Premium badges give higher bonuses
    for (const badge of badges) {
      switch (badge.type) {
        case TrustBadgeType.PREMIUM_MEMBER:
          bonus += 5;
          break;
        case TrustBadgeType.VERIFIED_IDENTITY:
        case TrustBadgeType.KYC_COMPLETED:
          bonus += 3;
          break;
        case TrustBadgeType.SECURITY_CERTIFIED:
        case TrustBadgeType.COMPLIANCE_CHAMPION:
          bonus += 2;
          break;
        default:
          bonus += 1;
      }
    }

    return Math.min(bonus, 15); // Cap at 15% bonus
  }

  /**
   * Get badge statistics for an entity
   */
  getBadgeStatistics(entityId: string): {
    totalBadges: number;
    activeBadges: number;
    expiredBadges: number;
    badgesByCategory: Record<string, number>;
    mostRecentBadge: TrustBadge | null;
  } {
    const allBadges = badgeStore.get(entityId) || [];
    const now = new Date();

    const activeBadges = allBadges.filter(b =>
      !b.expiresAt || new Date(b.expiresAt) > now
    );
    const expiredBadges = allBadges.filter(b =>
      b.expiresAt && new Date(b.expiresAt) <= now
    );

    const badgesByCategory: Record<string, number> = {};
    for (const badge of activeBadges) {
      const category = this.getBadgeCategory(badge.type);
      badgesByCategory[category] = (badgesByCategory[category] || 0) + 1;
    }

    return {
      totalBadges: allBadges.length,
      activeBadges: activeBadges.length,
      expiredBadges: expiredBadges.length,
      badgesByCategory,
      mostRecentBadge: allBadges.sort((a, b) =>
        new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
      )[0] || null
    };
  }

  /**
   * Verify a badge
   */
  verifyBadge(entityId: string, badgeType: TrustBadgeType): TrustBadge | null {
    const badge = this.getBadge(entityId, badgeType);
    if (!badge) return null;

    badge.verified = true;
    return badge;
  }

  /**
   * Delete all badges for an entity
   */
  deleteAllBadges(entityId: string): boolean {
    return badgeStore.delete(entityId);
  }

  /**
   * Export badges for an entity
   */
  exportBadges(entityId: string): string {
    return JSON.stringify(this.getBadges(entityId), null, 2);
  }

  /**
   * Get badge category
   */
  private getBadgeCategory(badgeType: TrustBadgeType): string {
    const categories: Record<string, TrustBadgeType[]> = {
      "Identity": [
        TrustBadgeType.VERIFIED_IDENTITY,
        TrustBadgeType.KYC_COMPLETED
      ],
      "Security": [
        TrustBadgeType.SECURITY_CERTIFIED
      ],
      "Reputation": [
        TrustBadgeType.PREMIUM_MEMBER,
        TrustBadgeType.TOP_RATED,
        TrustBadgeType.NETWORK_TRUSTED
      ],
      "Longevity": [
        TrustBadgeType.EARLY_ADOPTER,
        TrustBadgeType.LONG_STANDING
      ],
      "Compliance": [
        TrustBadgeType.COMPLIANCE_CHAMPION,
        TrustBadgeType.ZERO_DISPUTES
      ]
    };

    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(badgeType)) {
        return category;
      }
    }
    return "Other";
  }
}

export default TrustBadgeService;
