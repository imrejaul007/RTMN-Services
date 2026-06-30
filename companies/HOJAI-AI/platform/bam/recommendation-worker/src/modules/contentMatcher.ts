/**
 * Content Matcher Module
 * Match products based on content similarity
 */

interface MatchResult {
  productId: string;
  score: number;
  reason: string;
  metadata: any;
}

interface UserProfile {
  userId: string;
  preferences: string[];
  interests: string[];
  purchaseHistory: string[];
  viewHistory: string[];
  categories: Record<string, number>;
}

export class ContentMatcher {
  /**
   * Match products based on user profile content
   */
  async match(userProfile: UserProfile, context: string): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    // Generate recommendations based on user interests
    const topCategories = Object.entries(userProfile.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    for (let i = 0; i < 20; i++) {
      const category = topCategories[i % topCategories.length] || 'general';

      results.push({
        productId: `${category.toUpperCase()}-PROD-${i + 1}`,
        score: Math.random() * 0.5 + 0.5,
        reason: this.getReason(context, category),
        metadata: { category, score: Math.random() },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Find products similar to a given product
   */
  async findSimilar(productId: string, limit: number): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    for (let i = 0; i < limit; i++) {
      results.push({
        productId: `${productId}-SIMILAR-${i + 1}`,
        score: Math.random() * 0.5 + 0.4,
        reason: 'Customers also bought',
        metadata: { relatedTo: productId },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Bundle recommendations
   */
  async bundleRecommendations(
    userId: string,
    cartItems: string[],
    limit: number
  ): Promise<any[]> {
    const bundles: any[] = [];

    for (let i = 0; i < limit; i++) {
      bundles.push({
        bundleId: `BUNDLE-${i + 1}`,
        products: [
          ...(cartItems.slice(0, 2) || []),
          `COMPLEMENT-${i + 1}`,
        ],
        comboPrice: 999,
        discount: 200,
        score: 0.85,
      });
    }

    return bundles;
  }

  /**
   * Get recommendation reason
   */
  private getReason(context: string, category: string): string {
    const reasons = {
      homepage: 'Trending in your area',
      product: 'Frequently bought together',
      cart: 'Customers who added this also bought',
      search: 'Similar to your search',
      category: `Popular in ${category}`,
    };

    return reasons[context as keyof typeof reasons] || 'Recommended for you';
  }
}

export default new ContentMatcher();
