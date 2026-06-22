// ── Commerce Memory Context ─────────────────────────────────────────────────────
// Integration between Chat AI and Commerce Memory
// Provides intent context to AI conversations
// Uses dependency injection to avoid circular dependencies

import { getIntentGraphProvider } from '../intent-graph';
import { logger } from '../logger';

export interface CommerceMemoryContext {
  userId: string;
  activeIntents: IntentSummary[];
  dormantIntents: DormantIntentSummary[];
  profile: UserProfile;
  recommendations: string[];
  formattedContext: string;
}

export interface IntentSummary {
  key: string;
  category: string;
  confidence: number;
  lastSeen: string;
  displayName: string;
}

export interface DormantIntentSummary {
  key: string;
  category: string;
  daysDormant: number;
  revivalScore: number;
  displayName: string;
  actionSuggestion: string;
}

export interface UserProfile {
  travelAffinity: number;
  diningAffinity: number;
  retailAffinity: number;
  preferredChannel: string;
  totalConversions: number;
}

// ── Get Commerce Memory Context ────────────────────────────────────────────────

export async function getCommerceMemoryContext(
  userId: string,
  options: {
    includeActive?: boolean;
    includeDormant?: boolean;
    includeProfile?: boolean;
  } = {}
): Promise<CommerceMemoryContext | null> {
  const { includeActive = true, includeDormant = true, includeProfile = true } = options;

  try {
    logger.info('[CommerceMemoryContext] Loading context', { userId });

    // Get enriched context from Intent Graph (via dependency injection)
    const intentGraphProvider = getIntentGraphProvider();
    const enrichedContext = await intentGraphProvider.getEnrichedContext(userId);

    if (!enrichedContext) {
      logger.info('[CommerceMemoryContext] No context found', { userId });
      return null;
    }

    // Filter based on options
    const filteredActive = includeActive ? enrichedContext.activeIntents : [];
    const filteredDormant = includeDormant ? enrichedContext.dormantIntents : [];
    const filteredProfile = includeProfile ? enrichedContext.profile : undefined;

    // Format active intents
    const activeIntents: IntentSummary[] = filteredActive.map((intent: { category: string; key: string; confidence: number; lastSeen: Date }) => ({
      key: intent.key,
      category: intent.category,
      confidence: intent.confidence,
      lastSeen: formatTimeAgo(intent.lastSeen.toISOString()),
      displayName: formatIntentDisplayName(intent.key, intent.category),
    }));

    // Format dormant intents
    const dormantIntents: DormantIntentSummary[] = filteredDormant.map((intent: { category: string; key: string; revivalScore: number; daysDormant: number }) => {
      const displayName = formatIntentDisplayName(intent.key, intent.category);
      return {
        key: intent.key,
        category: intent.category,
        daysDormant: intent.daysDormant,
        revivalScore: intent.revivalScore,
        displayName,
        actionSuggestion: getActionSuggestion({ ...intent, displayName, actionSuggestion: '' }),
      };
    });

    // Format profile
    const profile: UserProfile = filteredProfile
      ? {
          travelAffinity: filteredProfile.travelAffinity,
          diningAffinity: filteredProfile.diningAffinity,
          retailAffinity: filteredProfile.retailAffinity,
          preferredChannel: getPreferredChannel(filteredProfile),
          totalConversions: filteredProfile.totalConversions,
        }
      : {
          travelAffinity: 33,
          diningAffinity: 33,
          retailAffinity: 33,
          preferredChannel: 'push',
          totalConversions: 0,
        };

    // Generate recommendations
    const recommendations = generateRecommendations(activeIntents, dormantIntents, profile);

    // Format for AI prompt
    const formattedContext = formatContextForAI(activeIntents, dormantIntents, profile);

    const context: CommerceMemoryContext = {
      userId,
      activeIntents,
      dormantIntents,
      profile,
      recommendations,
      formattedContext,
    };

    logger.info('[CommerceMemoryContext] Context loaded', {
      userId,
      activeIntents: activeIntents.length,
      dormantIntents: dormantIntents.length,
    });

    return context;
  } catch (error) {
    logger.error('[CommerceMemoryContext] Failed to load context', { userId, error });
    return null;
  }
}

// ── Quick Context Check ────────────────────────────────────────────────────────

export async function hasRelevantIntent(
  userId: string,
  query: string
): Promise<{ hasIntent: boolean; intentKey?: string; category?: string }> {
  const context = await getCommerceMemoryContext(userId, {
    includeActive: true,
    includeDormant: false,
    includeProfile: false,
  });

  if (!context) {
    return { hasIntent: false };
  }

  const queryLower = query.toLowerCase();

  // Check active intents
  for (const intent of context.activeIntents) {
    if (
      intent.key.toLowerCase().includes(queryLower) ||
      queryLower.includes(intent.key.toLowerCase()) ||
      matchesCategory(queryLower, intent.category)
    ) {
      return {
        hasIntent: true,
        intentKey: intent.key,
        category: intent.category,
      };
    }
  }

  // Check dormant intents
  for (const intent of context.dormantIntents) {
    if (
      intent.key.toLowerCase().includes(queryLower) ||
      queryLower.includes(intent.key.toLowerCase()) ||
      matchesCategory(queryLower, intent.category)
    ) {
      return {
        hasIntent: true,
        intentKey: intent.key,
        category: intent.category,
      };
    }
  }

  return { hasIntent: false };
}

// ── Format Context for AI Prompt ─────────────────────────────────────────────

function formatContextForAI(
  activeIntents: IntentSummary[],
  dormantIntents: DormantIntentSummary[],
  profile: UserProfile
): string {
  const parts: string[] = [];

  parts.push('## User Commerce Memory');

  // Active intents
  if (activeIntents.length > 0) {
    parts.push('\n### Currently Viewing:');
    for (const intent of activeIntents.slice(0, 5)) {
      parts.push(
        `- ${intent.displayName} (${Math.round(intent.confidence * 100)}% interest, ${intent.lastSeen})`
      );
    }
  }

  // Dormant intents (re-engagement opportunities)
  if (dormantIntents.length > 0) {
    parts.push('\n### Left Behind Earlier:');
    for (const intent of dormantIntents.slice(0, 3)) {
      parts.push(
        `- ${intent.displayName} (${intent.daysDormant} days ago, ${Math.round(intent.revivalScore * 100)}% likely to convert)`
      );
    }
  }

  // Profile
  parts.push('\n### User Profile:');
  const dominantCategory = getDominantCategory(profile);
  parts.push(`- Shopping style: ${dominantCategory}-focused`);
  parts.push(`- Total conversions: ${profile.totalConversions}`);
  parts.push(`- Best notification: ${profile.preferredChannel}`);

  return parts.join('\n');
}

// ── Helper Functions ───────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatIntentDisplayName(key: string, category: string): string {
  // Convert "hotel_goa_weekend" → "Hotels in Goa for weekend"
  const parts = key
    .split('_')
    .filter(
      (w) =>
        !['view', 'search', 'hold', 'hotel', 'restaurant', 'retail', 'order', 'cart'].includes(
          w.toLowerCase()
        )
    );

  if (parts.length === 0) {
    return getCategoryName(category);
  }

  const formatted = parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  switch (category) {
    case 'TRAVEL':
      return `Hotels in ${formatted}`;
    case 'DINING':
      return `Restaurants near ${formatted}`;
    case 'RETAIL':
      return `${formatted} products`;
    default:
      return formatted;
  }
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    TRAVEL: 'Travel/Hotels',
    DINING: 'Restaurants/Dining',
    RETAIL: 'Shopping/Retail',
    HOTEL_SERVICE: 'Hotel Services',
    GENERAL: 'General',
  };
  return names[category] || category;
}

function getActionSuggestion(intent: DormantIntentSummary): string {
  if (intent.revivalScore > 0.8) {
    return 'High priority - offer discount';
  }
  if (intent.revivalScore > 0.6) {
    return 'Good timing - gentle reminder';
  }
  return 'Personalized suggestion';
}

function getPreferredChannel(profile: { travelAffinity: number; diningAffinity: number; retailAffinity: number }): string {
  const max = Math.max(profile.travelAffinity, profile.diningAffinity, profile.retailAffinity);
  if (max === profile.travelAffinity) return 'email';
  if (max === profile.diningAffinity) return 'push';
  return 'in_app';
}

function getDominantCategory(profile: UserProfile): string {
  const max = Math.max(profile.travelAffinity, profile.diningAffinity, profile.retailAffinity);
  if (max === profile.travelAffinity) return 'Travel';
  if (max === profile.diningAffinity) return 'Dining';
  return 'Retail';
}

function matchesCategory(query: string, category: string): boolean {
  const keywords: Record<string, string[]> = {
    TRAVEL: ['hotel', 'flight', 'trip', 'vacation', 'stay', 'booking', 'room', 'resort', 'goa', 'mumbai', 'delhi'],
    DINING: ['restaurant', 'food', 'order', 'eat', 'meal', 'dinner', 'lunch', 'breakfast', 'menu', 'biryani', 'pizza'],
    RETAIL: ['buy', 'shop', 'product', 'item', 'price', 'cart', 'discount', 'clothes', 'shoes'],
  };

  const categoryKeywords = keywords[category] || [];
  return categoryKeywords.some((kw) => query.includes(kw));
}

function generateRecommendations(
  active: IntentSummary[],
  dormant: DormantIntentSummary[],
  profile: UserProfile
): string[] {
  const recs: string[] = [];

  // Based on dormant intents with high revival score
  const highPriorityDormant = dormant.filter((d) => d.revivalScore > 0.7);
  if (highPriorityDormant.length > 0) {
    recs.push(`Suggest revisiting: ${highPriorityDormant[0].displayName}`);
  }

  // Based on dominant category
  if (profile.travelAffinity > 60) {
    recs.push('Focus on hotel and travel recommendations');
  } else if (profile.diningAffinity > 60) {
    recs.push('Focus on restaurant and food recommendations');
  }

  // Based on active intents
  if (active.length > 0) {
    recs.push(`Continue from: ${active[0].displayName}`);
  }

  return recs;
}
