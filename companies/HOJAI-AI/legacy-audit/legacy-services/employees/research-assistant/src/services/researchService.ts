/**
 * HOJAI Research Assistant - Research Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Orchestrates all research modules
 */

import * as searchModule from '../modules/searchModule.js';
import * as analysisModule from '../modules/analysisModule.js';
import * as reportModule from '../modules/reportModule.js';
import * as trendsModule from '../modules/trendsModule.js';
import * as summaryModule from '../modules/summaryModule.js';

import {
  SearchQuery,
  SearchResponse,
  CompetitorAnalysisInput,
  CompetitorAnalysis,
  ReportGenerationInput,
  GeneratedReport,
  TrendsResponse,
  TrendCategory,
  TrendSummary,
  SummarizeInput,
  SummaryResult,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('research-service');

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Execute a research search
 */
export async function search(query: SearchQuery): Promise<SearchResponse> {
  logger.info('service_search', { query: query.query });
  return searchModule.search(query);
}

/**
 * Get search result by ID
 */
export async function getSearchResult(id: string) {
  return searchModule.getSearchResultById(id);
}

/**
 * Get user's search history
 */
export async function getSearchHistory(userId: string, limit?: number) {
  return searchModule.getSearchHistory(userId, limit);
}

// ============================================================================
// Competitor Analysis Operations
// ============================================================================

/**
 * Perform competitor analysis
 */
export async function analyzeCompetitors(input: CompetitorAnalysisInput): Promise<CompetitorAnalysis> {
  logger.info('service_analyze_competitors', { company: input.company });
  return analysisModule.analyzeCompetitors(input);
}

/**
 * Get detailed competitor info
 */
export async function getCompetitorDetails(competitorName: string) {
  return analysisModule.getCompetitorDetails(competitorName);
}

/**
 * Get product comparison between companies
 */
export async function getProductComparison(company: string, competitor: string) {
  return analysisModule.getProductComparison(company, competitor);
}

/**
 * Generate competitive insights
 */
export async function generateInsights(company: string): Promise<string[]> {
  return analysisModule.generateCompetitiveInsights(company);
}

// ============================================================================
// Report Generation Operations
// ============================================================================

/**
 * Generate a research report
 */
export async function generateReport(input: ReportGenerationInput): Promise<GeneratedReport> {
  logger.info('service_generate_report', { topic: input.topic, format: input.format });
  return reportModule.generateReport(input);
}

/**
 * Get a report by ID
 */
export async function getReport(reportId: string) {
  return reportModule.getReportById(reportId);
}

/**
 * Export a report
 */
export async function exportReport(reportId: string, format: 'pdf' | 'docx' | 'html') {
  return reportModule.exportReport(reportId, format);
}

/**
 * Generate a quick summary
 */
export async function generateSummary(topic: string, length?: 'short' | 'medium' | 'long') {
  return reportModule.generateReportSummary(topic, length);
}

// ============================================================================
// Trends Operations
// ============================================================================

/**
 * Get trends
 */
export async function getTrends(category?: TrendCategory, limit?: number): Promise<TrendsResponse> {
  logger.info('service_get_trends', { category, limit });
  return trendsModule.getTrends(category, limit);
}

/**
 * Get trends by category
 */
export async function getTrendsByCategory(category: TrendCategory): Promise<TrendSummary> {
  return trendsModule.getTrendsByCategory(category);
}

/**
 * Get a specific trend
 */
export async function getTrend(trendId: string) {
  return trendsModule.getTrendById(trendId);
}

/**
 * Get related trends
 */
export async function getRelatedTrends(trendId: string) {
  return trendsModule.getRelatedTrends(trendId);
}

/**
 * Search trends
 */
export async function searchTrends(keyword: string) {
  return trendsModule.searchTrends(keyword);
}

/**
 * Get trend analytics
 */
export async function getTrendAnalytics() {
  return trendsModule.getTrendAnalytics();
}

// ============================================================================
// Summary Operations
// ============================================================================

/**
 * Summarize content
 */
export async function summarize(input: SummarizeInput): Promise<SummaryResult> {
  logger.info('service_summarize', { contentType: input.contentType, style: input.style });
  return summaryModule.summarize(input);
}

/**
 * Summarize multiple contents
 */
export async function summarizeBatch(contents: string[], style?: 'brief' | 'standard' | 'detailed') {
  return summaryModule.summarizeBatch(contents, style);
}

/**
 * Extract entities from content
 */
export async function extractEntities(content: string) {
  return summaryModule.extractEntities(content);
}

/**
 * Compare multiple summaries
 */
export async function compareSummaries(summaries: string[]) {
  return summaryModule.compareSummaries(summaries);
}

// ============================================================================
// Combined Operations
// ============================================================================

/**
 * Perform comprehensive research on a topic
 */
export async function comprehensiveResearch(
  topic: string,
  includeReport: boolean = true,
  includeTrends: boolean = true,
  includeCompetitors: boolean = false
): Promise<{
  topic: string;
  searchResults?: SearchResponse;
  trends?: TrendsResponse;
  report?: GeneratedReport;
  competitorAnalysis?: CompetitorAnalysis;
  generatedAt: string;
}> {
  logger.info('comprehensive_research', { topic, includeReport, includeTrends, includeCompetitors });

  const results: {
    topic: string;
    searchResults?: SearchResponse;
    trends?: TrendsResponse;
    report?: GeneratedReport;
    competitorAnalysis?: CompetitorAnalysis;
    generatedAt: string;
  } = {
    topic,
    generatedAt: new Date().toISOString(),
  };

  // Execute searches in parallel where possible
  const promises: Promise<void>[] = [];

  // Always search
  promises.push(
    search({ query: topic }).then(r => {
      results.searchResults = r;
    })
  );

  // Optionally include trends
  if (includeTrends) {
    promises.push(
      getTrends().then(r => {
        results.trends = r;
      })
    );
  }

  // Optionally include report
  if (includeReport) {
    promises.push(
      generateReport({
        topic,
        format: 'detailed',
        includeRecommendations: true,
      }).then(r => {
        results.report = r;
      })
    );
  }

  // Optionally include competitor analysis
  if (includeCompetitors) {
    promises.push(
      analyzeCompetitors({
        company: topic,
        includeProducts: true,
        includeMarketShare: true,
      }).then(r => {
        results.competitorAnalysis = r;
      })
    );
  }

  await Promise.all(promises);

  return results;
}

export default {
  search,
  getSearchResult,
  getSearchHistory,
  analyzeCompetitors,
  getCompetitorDetails,
  getProductComparison,
  generateInsights,
  generateReport,
  getReport,
  exportReport,
  generateSummary,
  getTrends,
  getTrendsByCategory,
  getTrend,
  getRelatedTrends,
  searchTrends,
  getTrendAnalytics,
  summarize,
  summarizeBatch,
  extractEntities,
  compareSummaries,
  comprehensiveResearch,
};
