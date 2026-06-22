/**
 * HOJAI Research Assistant - Trends Module
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Trend detection and analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TrendItem,
  TrendSummary,
  TrendsResponse,
  TrendCategory,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('trends-module');

// ============================================================================
// Mock Trend Data
// ============================================================================

const MOCK_TRENDS: TrendItem[] = [
  // Technology Trends
  {
    id: 't1',
    title: 'Generative AI Adoption Accelerates',
    description: 'Organizations across industries are rapidly adopting generative AI technologies to enhance productivity, automate tasks, and create new value.',
    category: 'technology',
    sentiment: 'positive',
    volume: 95000,
    velocity: 'rising',
    sources: ['TechCrunch', 'Wired', 'MIT Technology Review'],
    relatedTerms: ['ChatGPT', 'LLM', 'AI assistants', 'automation'],
    firstSeen: '2025-11-15',
    lastUpdated: '2026-05-30',
  },
  {
    id: 't2',
    title: 'Edge Computing Growth',
    description: 'Edge computing continues to grow as organizations seek to reduce latency and process data closer to the source.',
    category: 'technology',
    sentiment: 'positive',
    volume: 42000,
    velocity: 'rising',
    sources: ['Forbes', 'TechRadar'],
    relatedTerms: ['IoT', '5G', 'distributed computing'],
    firstSeen: '2025-08-20',
    lastUpdated: '2026-05-28',
  },
  {
    id: 't3',
    title: 'Quantum Computing Advances',
    description: 'Breakthroughs in quantum computing are bringing practical applications closer to reality.',
    category: 'technology',
    sentiment: 'positive',
    volume: 28000,
    velocity: 'stable',
    sources: ['Nature', 'Scientific American'],
    relatedTerms: ['quantum error correction', 'quantum supremacy'],
    firstSeen: '2026-01-10',
    lastUpdated: '2026-05-25',
  },

  // Market Trends
  {
    id: 't4',
    title: 'Remote Work Normalization',
    description: 'Hybrid and remote work arrangements have become the new normal for knowledge workers globally.',
    category: 'market',
    sentiment: 'positive',
    volume: 78000,
    velocity: 'stable',
    sources: ['Harvard Business Review', 'Gallup'],
    relatedTerms: ['work from home', 'hybrid work', 'distributed teams'],
    firstSeen: '2024-03-15',
    lastUpdated: '2026-05-29',
  },
  {
    id: 't5',
    title: 'E-commerce Growth Continues',
    description: 'Online shopping continues to gain market share, with mobile commerce leading growth.',
    category: 'market',
    sentiment: 'positive',
    volume: 110000,
    velocity: 'rising',
    sources: ['McKinsey', 'eMarketer'],
    relatedTerms: ['online retail', 'mobile commerce', 'omnichannel'],
    firstSeen: '2023-06-01',
    lastUpdated: '2026-05-30',
  },
  {
    id: 't6',
    title: 'Subscription Economy Expansion',
    description: 'Subscription-based business models are expanding beyond software to consumer products and services.',
    category: 'market',
    sentiment: 'positive',
    volume: 35000,
    velocity: 'rising',
    sources: ['Bloomberg', 'Business Insider'],
    relatedTerms: ['SaaS', 'subscription boxes', 'membership'],
    firstSeen: '2025-02-10',
    lastUpdated: '2026-05-27',
  },

  // Consumer Trends
  {
    id: 't7',
    title: 'Health-Conscious Purchasing',
    description: 'Consumers increasingly prioritize health and wellness in their purchasing decisions.',
    category: 'consumer',
    sentiment: 'positive',
    volume: 62000,
    velocity: 'rising',
    sources: ['Nielsen', 'Euromonitor'],
    relatedTerms: ['wellness', 'organic', 'functional foods', 'health tracking'],
    firstSeen: '2025-05-20',
    lastUpdated: '2026-05-29',
  },
  {
    id: 't8',
    title: 'Sustainable Consumption',
    description: 'Environmental sustainability is becoming a key factor in consumer purchasing decisions.',
    category: 'consumer',
    sentiment: 'positive',
    volume: 88000,
    velocity: 'rising',
    sources: [' Deloitte', 'PwC'],
    relatedTerms: ['sustainability', 'eco-friendly', 'carbon footprint', 'circular economy'],
    firstSeen: '2024-09-01',
    lastUpdated: '2026-05-30',
  },
  {
    id: 't9',
    title: 'Experience Over Products',
    description: 'Consumers are shifting spending from material goods to experiences and services.',
    category: 'consumer',
    sentiment: 'positive',
    volume: 45000,
    velocity: 'stable',
    sources: ['McKinsey', 'Forrester'],
    relatedTerms: ['experiential buying', 'services economy', 'travel', 'entertainment'],
    firstSeen: '2025-01-15',
    lastUpdated: '2026-05-26',
  },

  // Industry Trends
  {
    id: 't10',
    title: 'Healthcare Digital Transformation',
    description: 'Healthcare organizations are accelerating digital initiatives, from telemedicine to AI diagnostics.',
    category: 'industry',
    sentiment: 'positive',
    volume: 52000,
    velocity: 'rising',
    sources: ['Health Affairs', 'Modern Healthcare'],
    relatedTerms: ['telemedicine', 'digital health', 'AI diagnostics'],
    firstSeen: '2025-07-10',
    lastUpdated: '2026-05-28',
  },
  {
    id: 't11',
    title: 'Financial Services Innovation',
    description: 'Banks and financial institutions are investing heavily in digital transformation and fintech partnerships.',
    category: 'industry',
    sentiment: 'positive',
    volume: 58000,
    velocity: 'rising',
    sources: ['American Banker', 'Financial Times'],
    relatedTerms: ['open banking', 'neobanks', 'embedded finance', 'DeFi'],
    firstSeen: '2025-04-05',
    lastUpdated: '2026-05-29',
  },
  {
    id: 't12',
    title: 'Manufacturing Automation',
    description: 'Smart manufacturing and robotics adoption is accelerating across industries.',
    category: 'industry',
    sentiment: 'positive',
    volume: 39000,
    velocity: 'rising',
    sources: ['Industry Week', 'Automotive News'],
    relatedTerms: ['Industry 4.0', 'robotics', 'IoT', 'predictive maintenance'],
    firstSeen: '2025-09-20',
    lastUpdated: '2026-05-25',
  },

  // Competitive Trends
  {
    id: 't13',
    title: 'Platform Competition Intensifies',
    description: 'Super-platforms are expanding their ecosystems, intensifying competition across segments.',
    category: 'competitive',
    sentiment: 'neutral',
    volume: 42000,
    velocity: 'stable',
    sources: ['The Economist', 'Wall Street Journal'],
    relatedTerms: ['ecosystem', 'platform business', 'network effects'],
    firstSeen: '2025-06-15',
    lastUpdated: '2026-05-27',
  },
  {
    id: 't14',
    title: 'Direct-to-Consumer Disruption',
    description: 'DTC brands continue to disrupt traditional retail with digital-first approaches.',
    category: 'competitive',
    sentiment: 'positive',
    volume: 31000,
    velocity: 'rising',
    sources: ['Retail Dive', 'Chain Store Age'],
    relatedTerms: ['DTC', 'brand.com', 'digital-first'],
    firstSeen: '2025-03-10',
    lastUpdated: '2026-05-28',
  },
  {
    id: 't15',
    title: 'Strategic Partnerships Surge',
    description: 'Companies are forming strategic partnerships to expand capabilities and market reach.',
    category: 'competitive',
    sentiment: 'positive',
    volume: 27000,
    velocity: 'rising',
    sources: ['Business Wire', 'Reuters'],
    relatedTerms: ['partnerships', 'joint ventures', 'co-opetition'],
    firstSeen: '2026-01-20',
    lastUpdated: '2026-05-29',
  },
];

// ============================================================================
// Trends Functions
// ============================================================================

/**
 * Get all trends or filter by category
 */
export async function getTrends(
  category?: TrendCategory,
  limit: number = 20
): Promise<TrendsResponse> {
  const startTime = Date.now();

  logger.info('get_trends', { category, limit });

  // Filter by category if specified
  const filteredTrends = category
    ? MOCK_TRENDS.filter(t => t.category === category)
    : MOCK_TRENDS;

  // Sort by volume and velocity
  const sortedTrends = filteredTrends.sort((a, b) => {
    const velocityScore = { rising: 3, stable: 2, declining: 1 };
    const aScore = a.volume * velocityScore[a.velocity];
    const bScore = b.volume * velocityScore[b.velocity];
    return bScore - aScore;
  });

  // Apply limit
  const limitedTrends = sortedTrends.slice(0, limit);

  // Group by category
  const categoryGroups = groupByCategory(limitedTrends);

  // Generate summaries for each category
  const allTrends: TrendSummary[] = Object.entries(categoryGroups).map(
    ([cat, trends]) => ({
      category: cat as TrendCategory,
      trends,
      totalTrends: trends.length,
      topMovers: trends.slice(0, 3),
      generatedAt: new Date().toISOString(),
    })
  );

  // Find top overall trends
  const topOverall = [...MOCK_TRENDS]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // Find emerging trends (high velocity, recent firstSeen)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const emerging = MOCK_TRENDS.filter(t => {
    const firstSeen = new Date(t.firstSeen);
    return t.velocity === 'rising' && firstSeen >= thirtyDaysAgo;
  });

  const response: TrendsResponse = {
    allTrends,
    topOverall,
    emerging,
    generatedAt: new Date().toISOString(),
  };

  logger.info('trends_retrieved', {
    category,
    totalTrends: filteredTrends.length,
    returnedTrends: limitedTrends.length,
    tookMs: Date.now() - startTime,
  });

  return response;
}

/**
 * Get trends by category
 */
export async function getTrendsByCategory(
  category: TrendCategory
): Promise<TrendSummary> {
  const startTime = Date.now();

  logger.info('get_trends_by_category', { category });

  const categoryTrends = MOCK_TRENDS.filter(t => t.category === category);

  // Sort by relevance (volume * velocity)
  const sortedTrends = categoryTrends.sort((a, b) => {
    const velocityScore = { rising: 3, stable: 2, declining: 1 };
    return b.volume * velocityScore[b.velocity] - a.volume * velocityScore[a.velocity];
  });

  const summary: TrendSummary = {
    category,
    trends: sortedTrends,
    totalTrends: sortedTrends.length,
    topMovers: sortedTrends.slice(0, 3),
    generatedAt: new Date().toISOString(),
  };

  logger.info('category_trends_retrieved', {
    category,
    trendCount: sortedTrends.length,
    tookMs: Date.now() - startTime,
  });

  return summary;
}

/**
 * Get a specific trend by ID
 */
export async function getTrendById(trendId: string): Promise<TrendItem | null> {
  logger.info('get_trend', { trendId });

  const trend = MOCK_TRENDS.find(t => t.id === trendId);

  if (!trend) {
    logger.warn('trend_not_found', { trendId });
    return null;
  }

  return trend;
}

/**
 * Get related trends for a given trend
 */
export async function getRelatedTrends(trendId: string): Promise<TrendItem[]> {
  logger.info('get_related_trends', { trendId });

  const trend = MOCK_TRENDS.find(t => t.id === trendId);

  if (!trend) {
    return [];
  }

  // Find trends with related terms
  const relatedTrends = MOCK_TRENDS.filter(t => {
    if (t.id === trendId) return false;
    if (t.category !== trend.category) return false;

    // Check for shared related terms
    const sharedTerms = t.relatedTerms?.filter(term =>
      trend.relatedTerms?.includes(term)
    );

    return sharedTerms && sharedTerms.length > 0;
  });

  return relatedTrends;
}

/**
 * Search trends by keyword
 */
export async function searchTrends(keyword: string): Promise<TrendItem[]> {
  const startTime = Date.now();
  const keywordLower = keyword.toLowerCase();

  logger.info('search_trends', { keyword });

  const matchingTrends = MOCK_TRENDS.filter(trend => {
    const titleMatch = trend.title.toLowerCase().includes(keywordLower);
    const descMatch = trend.description.toLowerCase().includes(keywordLower);
    const relatedMatch = trend.relatedTerms?.some(term =>
      term.toLowerCase().includes(keywordLower)
    );
    const sourceMatch = trend.sources.some(source =>
      source.toLowerCase().includes(keywordLower)
    );

    return titleMatch || descMatch || relatedMatch || sourceMatch;
  });

  logger.info('trends_search_complete', {
    keyword,
    matchCount: matchingTrends.length,
    tookMs: Date.now() - startTime,
  });

  return matchingTrends;
}

/**
 * Get trend analytics and insights
 */
export async function getTrendAnalytics(): Promise<{
  totalTrends: number;
  byCategory: Record<TrendCategory, number>;
  byVelocity: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
}> {
  logger.info('get_trend_analytics');

  // Count by category
  const byCategory: Record<TrendCategory, number> = {
    technology: 0,
    market: 0,
    consumer: 0,
    industry: 0,
    competitive: 0,
  };

  // Count by velocity
  const byVelocity: Record<string, number> = {
    rising: 0,
    stable: 0,
    declining: 0,
  };

  // Count sources
  const sourceCounts: Record<string, number> = {};

  MOCK_TRENDS.forEach(trend => {
    byCategory[trend.category]++;
    byVelocity[trend.velocity]++;

    trend.sources.forEach(source => {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
  });

  // Get top sources
  const topSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTrends: MOCK_TRENDS.length,
    byCategory,
    byVelocity,
    topSources,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Group trends by category
 */
function groupByCategory(trends: TrendItem[]): Record<string, TrendItem[]> {
  const groups: Record<string, TrendItem[]> = {};

  trends.forEach(trend => {
    if (!groups[trend.category]) {
      groups[trend.category] = [];
    }
    groups[trend.category].push(trend);
  });

  return groups;
}

/**
 * Calculate trend momentum score
 */
function calculateMomentum(trend: TrendItem): number {
  const velocityScore = { rising: 2, stable: 1, declining: 0.5 };
  return trend.volume * velocityScore[trend.velocity];
}
