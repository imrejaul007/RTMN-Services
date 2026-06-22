/**
 * HOJAI Research Assistant - Search Module
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Web search functionality for research
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SearchQuery,
  SearchFilters,
  SearchResult,
  SearchResponse,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('search-module');

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: '1',
    title: 'Market Research Report 2026: Industry Analysis & Trends',
    url: 'https://example.com/market-research-2026',
    snippet: 'Comprehensive analysis of market trends, competitor positioning, and growth opportunities for 2026 and beyond.',
    source: 'Industry Weekly',
    publishedDate: '2026-05-15',
    relevanceScore: 0.95,
    metadata: { category: 'market' },
  },
  {
    id: '2',
    title: 'Consumer Behavior Shifts: What Your Business Needs to Know',
    url: 'https://example.com/consumer-behavior-2026',
    snippet: 'Understanding the latest consumer trends and how they impact purchasing decisions in the digital age.',
    source: 'Business Insights',
    publishedDate: '2026-05-10',
    relevanceScore: 0.88,
    metadata: { category: 'consumer' },
  },
  {
    id: '3',
    title: 'Competitive Intelligence: Strategic Analysis Framework',
    url: 'https://example.com/competitive-intelligence',
    snippet: 'A comprehensive framework for analyzing competitors, market positioning, and strategic opportunities.',
    source: 'Strategy Journal',
    publishedDate: '2026-05-08',
    relevanceScore: 0.85,
    metadata: { category: 'competitive' },
  },
  {
    id: '4',
    title: 'Technology Trends Reshaping Industries in 2026',
    url: 'https://example.com/tech-trends-2026',
    snippet: 'From AI to blockchain, explore the top technology trends driving business transformation.',
    source: 'Tech Today',
    publishedDate: '2026-05-12',
    relevanceScore: 0.92,
    metadata: { category: 'technology' },
  },
  {
    id: '5',
    title: 'Global Market Overview: Opportunities and Challenges',
    url: 'https://example.com/global-market-overview',
    snippet: 'A data-driven analysis of global market conditions, emerging opportunities, and strategic considerations.',
    source: 'Global Economics Review',
    publishedDate: '2026-05-05',
    relevanceScore: 0.82,
    metadata: { category: 'market' },
  },
  {
    id: '6',
    title: 'Innovation in 2026: Case Studies from Leading Companies',
    url: 'https://example.com/innovation-case-studies',
    snippet: 'Learn from the most innovative companies and how they maintain competitive advantage.',
    source: 'Innovation Quarterly',
    publishedDate: '2026-04-28',
    relevanceScore: 0.79,
    metadata: { category: 'industry' },
  },
  {
    id: '7',
    title: 'Digital Transformation: A Strategic Roadmap',
    url: 'https://example.com/digital-transformation-roadmap',
    snippet: 'How enterprises are leveraging digital technologies to transform operations and customer experiences.',
    source: 'Digital Business Review',
    publishedDate: '2026-05-01',
    relevanceScore: 0.87,
    metadata: { category: 'technology' },
  },
  {
    id: '8',
    title: 'Startup Ecosystem Report: Funding Trends & Opportunities',
    url: 'https://example.com/startup-ecosystem-2026',
    snippet: 'Analysis of startup funding, valuation trends, and investment opportunities in 2026.',
    source: 'Venture Weekly',
    publishedDate: '2026-05-18',
    relevanceScore: 0.84,
    metadata: { category: 'market' },
  },
  {
    id: '9',
    title: 'Customer Experience Excellence: Best Practices Guide',
    url: 'https://example.com/customer-experience-guide',
    snippet: 'Strategies for delivering exceptional customer experiences that drive loyalty and growth.',
    source: 'CX Magazine',
    publishedDate: '2026-05-14',
    relevanceScore: 0.81,
    metadata: { category: 'consumer' },
  },
  {
    id: '10',
    title: 'Sustainability Trends: ESG in Business Strategy',
    url: 'https://example.com/esg-business-strategy',
    snippet: 'How environmental, social, and governance factors are becoming core to business strategy.',
    source: 'Sustainable Business',
    publishedDate: '2026-05-20',
    relevanceScore: 0.78,
    metadata: { category: 'industry' },
  },
];

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Perform a web search with query and filters
 */
export async function search(query: SearchQuery): Promise<SearchResponse> {
  const startTime = Date.now();
  const { query: searchQuery, filters, limit = 10, offset = 0 } = query;

  logger.info('search_executing', { query: searchQuery, limit, offset, filters });

  // Simulate search delay
  await simulateDelay(100, 300);

  // Filter results based on query relevance
  const matchedResults = filterAndRankResults(searchQuery, MOCK_SEARCH_RESULTS, filters);

  // Apply pagination
  const paginatedResults = matchedResults.slice(offset, offset + limit);

  const response: SearchResponse = {
    query: searchQuery,
    totalResults: matchedResults.length,
    results: paginatedResults,
    facets: generateFacets(matchedResults),
    tookMs: Date.now() - startTime,
  };

  logger.info('search_completed', {
    query: searchQuery,
    totalResults: matchedResults.length,
    returnedResults: paginatedResults.length,
    tookMs: response.tookMs,
  });

  return response;
}

/**
 * Filter results based on query and filters
 */
function filterAndRankResults(
  query: string,
  results: SearchResult[],
  filters?: SearchFilters
): SearchResult[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);

  // Score each result based on query relevance
  let scoredResults = results.map(result => {
    let score = result.relevanceScore;

    // Boost for title match
    if (result.title.toLowerCase().includes(queryLower)) {
      score += 0.15;
    }

    // Boost for snippet match
    queryTerms.forEach(term => {
      if (result.snippet.toLowerCase().includes(term)) {
        score += 0.05;
      }
    });

    return { result, score };
  });

  // Apply date filters if provided
  if (filters?.dateRange) {
    const { from, to } = filters.dateRange;
    scoredResults = scoredResults.filter(({ result }) => {
      if (!result.publishedDate) return true;
      return result.publishedDate >= from && result.publishedDate <= to;
    });
  }

  // Apply source filters if provided
  if (filters?.sources && filters.sources.length > 0) {
    scoredResults = scoredResults.filter(({ result }) =>
      filters.sources!.some(source =>
        result.source.toLowerCase().includes(source.toLowerCase())
      )
    );
  }

  // Apply language filters if provided
  if (filters?.language) {
    scoredResults = scoredResults.filter(({ result }) =>
      result.metadata?.language === filters.language
    );
  }

  // Apply region filters if provided
  if (filters?.region) {
    scoredResults = scoredResults.filter(({ result }) =>
      result.metadata?.region === filters.region
    );
  }

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults.map(({ result, score }) => ({
    ...result,
    relevanceScore: Math.min(score, 1),
    id: uuidv4(), // Generate new ID for each search
  }));
}

/**
 * Generate facets for filtering UI
 */
function generateFacets(results: SearchResult[]): Record<string, string[]> {
  const sources = [...new Set(results.map(r => r.source))];
  const categories = [...new Set(
    results
      .filter(r => r.metadata?.category)
      .map(r => r.metadata?.category as string)
  )];

  return {
    sources,
    categories,
  };
}

/**
 * Get a single search result by ID
 */
export async function getSearchResultById(id: string): Promise<SearchResult | null> {
  logger.info('get_search_result', { id });

  // In production, this would query a database
  const result = MOCK_SEARCH_RESULTS.find(r => r.id === id);

  if (!result) {
    logger.warn('search_result_not_found', { id });
    return null;
  }

  return result;
}

/**
 * Save a search result to favorites
 */
export async function saveSearchResult(
  userId: string,
  result: SearchResult
): Promise<{ id: string; saved: boolean }> {
  logger.info('save_search_result', { userId, resultId: result.id });

  // In production, this would save to database
  const savedId = `saved_${uuidv4()}`;

  return {
    id: savedId,
    saved: true,
  };
}

/**
 * Get search history for a user
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 20
): Promise<Array<{ query: string; timestamp: string; resultCount: number }>> {
  logger.info('get_search_history', { userId, limit });

  // Mock search history
  const history = [
    { query: 'market trends 2026', timestamp: '2026-05-29T10:30:00Z', resultCount: 25 },
    { query: 'competitor analysis framework', timestamp: '2026-05-28T14:15:00Z', resultCount: 18 },
    { query: 'consumer behavior shifts', timestamp: '2026-05-27T09:45:00Z', resultCount: 32 },
    { query: 'technology trends', timestamp: '2026-05-26T16:20:00Z', resultCount: 21 },
    { query: 'digital transformation strategy', timestamp: '2026-05-25T11:00:00Z', resultCount: 15 },
  ];

  return history.slice(0, limit);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simulate network delay for realistic mock behavior
 */
function simulateDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}
