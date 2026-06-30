/**
 * Collaborative Filtering Module
 * Find similar users and recommend their preferences
 */

interface SimilarUser {
  userId: string;
  similarity: number;
  topProducts: string[];
}

interface UserProfile {
  userId: string;
  preferences: string[];
  interests: string[];
  purchaseHistory: string[];
  viewHistory: string[];
  categories: Record<string, number>;
  priceRange: { min: number; max: number };
  lastActive: string;
}

// In-memory user database (mock)
const allUsers = new Map<string, UserProfile>();

export class CollaborativeFilter {
  /**
   * Find users with similar preferences
   */
  async findSimilarUsers(userId: string, userProfile: any): Promise<SimilarUser[]> {
    const similarUsers: SimilarUser[] = [];

    // In production, compute against actual user database
    // For mock, generate similar users
    for (let i = 0; i < 50; i++) {
      const simUserId = `USER-${i}`;
      if (simUserId === userId) continue;

      const similarity = Math.random() * 0.6 + 0.4;

      similarUsers.push({
        userId: simUserId,
        similarity,
        topProducts: this.getUserTopProducts(simUserId),
      });
    }

    return similarUsers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  /**
   * Get top products from similar users
   */
  async getRecommendedProducts(similarUsers: SimilarUser[]): Promise<string[]> {
    const productScores = new Map<string, number>();

    for (const user of similarUsers) {
      for (const product of user.topProducts) {
        productScores.set(product, (productScores.get(product) || 0) + user.similarity);
      }
    }

    return Array.from(productScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([product]) => product);
  }

  /**
   * Mock: Get user's top products
   */
  private getUserTopProducts(userId: string): string[] {
    const products: string[] = [];
    const count = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < count; i++) {
      products.push(`PROD${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`);
    }

    return products;
  }
}

export default new CollaborativeFilter();
