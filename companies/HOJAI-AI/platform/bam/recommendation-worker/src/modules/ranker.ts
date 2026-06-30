/**
 * Real-time Ranker Module
 * Combine multiple signals to rank recommendations
 */

interface UserProfile {
  userId: string;
  preferences: string[];
  interests: string[];
  purchaseHistory: string[];
  viewHistory: string[];
  categories: Record<string, number>;
  priceRange: { min: number; max: number };
}

interface RankInputs {
  userId: string;
  userProfile: UserProfile | undefined;
  similarUsers: any[];
  contentRecs: any[];
  context: string;
  limit: number;
}

interface RankedProduct {
  productId: string;
  score: number;
  reason: string;
  metadata: any;
}

export class Ranker {
  /**
   * Rank recommendations using multiple signals
   */
  async rank(inputs: RankInputs): Promise<RankedProduct[]> {
    const { userProfile, similarUsers, contentRecs, context, limit } = inputs;

    // Aggregate all candidates
    const candidates = new Map<string, RankedProduct>();

    // Add content-based candidates
    for (const rec of contentRecs || []) {
      if (!candidates.has(rec.productId)) {
        candidates.set(rec.productId, {
          productId: rec.productId,
          score: 0,
          reason: rec.reason,
          metadata: rec.metadata || {},
        });
      }
    }

    // Add collaborative candidates (from similar users)
    for (const user of similarUsers || []) {
      for (const productId of user.topProducts || []) {
        if (!candidates.has(productId)) {
          candidates.set(productId, {
            productId,
            score: 0,
            reason: 'Trending with similar users',
            metadata: { source: 'collaborative' },
          });
        }
      }
    }

    // Score each candidate
    const scored = Array.from(candidates.values()).map(candidate => ({
      ...candidate,
      score: this.score(candidate, inputs),
    }));

    // Deduplicate and sort
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate score for a single product
   */
  private score(candidate: RankedProduct, inputs: RankInputs): number {
    let score = 0.5;

    // Context relevance (25%)
    if (candidate.metadata?.category) {
      score += 0.1;
    }
    if (inputs.userProfile?.interests.includes(candidate.metadata?.category)) {
      score += 0.15;
    }

    // User preference match (25%)
    if (inputs.userProfile?.purchaseHistory.includes(candidate.productId)) {
      score += 0.2;
    }
    if (inputs.userProfile?.viewHistory.includes(candidate.productId)) {
      score += 0.05;
    }

    // Collaborative signal (20%)
    const similarUsers = inputs.similarUsers || [];
    const matchingUser = similarUsers.find(u =>
      u.topProducts?.includes(candidate.productId)
    );
    if (matchingUser) {
      score += matchingUser.similarity * 0.2;
    }

    // Quality (15%)
    if (candidate.reason.includes('Trending') || candidate.reason.includes('Popular')) {
      score += 0.1;
    }

    // Context boost (15%)
    if (inputs.context === 'cart' && candidate.reason.includes('together')) {
      score += 0.15;
    }
    if (inputs.context === 'homepage' && score >= 0.7) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}

export default new Ranker();
