/**
 * User Profiler Module
 * Build and maintain user profiles
 */

interface UserBehavior {
  userId: string;
  productId: string;
  action: string;
  context?: any;
  timestamp?: string;
}

// In-memory storage (use Redis/DB in production)
const userProfiles = new Map<string, UserProfile>();
const userBehaviors = new Map<string, UserBehavior[]>();

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

export class UserProfiler {
  /**
   * Build user profile from behavior
   */
  async buildProfile(userId: string): Promise<UserProfile> {
    let profile = userProfiles.get(userId);

    if (profile) {
      // Update last active
      profile.lastActive = new Date().toISOString();
      return profile;
    }

    // Build new profile
    const behaviors = userBehaviors.get(userId) || [];

    const categories: Record<string, number> = {};
    const interests: string[] = [];
    const purchaseHistory: string[] = [];
    const viewHistory: string[] = [];

    for (const behavior of behaviors) {
      if (behavior.action === 'view') viewHistory.push(behavior.productId);
      if (behavior.action === 'purchase') purchaseHistory.push(behavior.productId);
      // Mock: derive categories from productId
      const category = behavior.productId.split('-')[0] || 'general';
      categories[category] = (categories[category] || 0) + 1;
    }

    profile = {
      userId,
      preferences: this.extractPreferences(behaviors),
      interests: Array.from(new Set(interests)),
      purchaseHistory,
      viewHistory,
      categories,
      priceRange: { min: 0, max: 10000 },
      lastActive: new Date().toISOString(),
    };

    userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Track user behavior
   */
  async trackBehavior(behavior: UserBehavior): Promise<void> {
    const timestamped: UserBehavior = {
      ...behavior,
      timestamp: behavior.timestamp || new Date().toISOString(),
    };

    const existing = userBehaviors.get(behavior.userId) || [];
    existing.push(timestamped);
    userBehaviors.set(behavior.userId, existing);

    // Invalidate cache to rebuild profile
    userProfiles.delete(behavior.userId);
  }

  /**
   * Extract preferences from behaviors
   */
  private extractPreferences(behaviors: UserBehavior[]): string[] {
    const preferences: string[] = [];

    // Analyze pattern: most common action types
    const actionCounts: Record<string, number> = {};
    for (const b of behaviors) {
      actionCounts[b.action] = (actionCounts[b.action] || 0) + 1;
    }

    // Derive preferences
    if (actionCounts.purchase > 5) preferences.push('frequent-buyer');
    if (actionCounts.view > 20) preferences.push('browser');
    if (actionCounts.cart > 3) preferences.push('considering');

    return preferences;
  }

  /**
   * Get user profile (cached)
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return userProfiles.get(userId) || null;
  }
}

export default new UserProfiler();
