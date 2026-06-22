/**
 * HOJAI Research Assistant - Summary Module
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Content summarization functionality
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SummarizeInput,
  SummaryResult,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('summary-module');

// ============================================================================
// Summary Templates
// ============================================================================

interface SummaryTemplate {
  minLength: number;
  maxLength: number;
  keyPointsCount: number;
}

/**
 * Get summary template based on style
 */
function getSummaryTemplate(style: 'brief' | 'standard' | 'detailed'): SummaryTemplate {
  const templates: Record<string, SummaryTemplate> = {
    brief: {
      minLength: 50,
      maxLength: 150,
      keyPointsCount: 3,
    },
    standard: {
      minLength: 150,
      maxLength: 400,
      keyPointsCount: 5,
    },
    detailed: {
      minLength: 400,
      maxLength: 1000,
      keyPointsCount: 8,
    },
  };

  return templates[style];
}

// ============================================================================
// Keyword Extraction
// ============================================================================

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  ]);

  // Tokenize and clean
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !stopWords.has(word));

  // Count word frequencies
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and get top keywords
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return sorted;
}

// ============================================================================
// Topic Extraction
// ============================================================================

/**
 * Extract main topics from content
 */
function extractTopics(content: string): string[] {
  // Define topic patterns
  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /artificial intelligence|AI|machine learning|deep learning/i, topic: 'Artificial Intelligence' },
    { pattern: /technology|tech|digital|software/i, topic: 'Technology' },
    { pattern: /market|industry|business|commercial/i, topic: 'Business & Markets' },
    { pattern: /health|medical|healthcare|wellness/i, topic: 'Healthcare' },
    { pattern: /finance|financial|banking|investment/i, topic: 'Finance' },
    { pattern: /consumer|customer|shopping|retail/i, topic: 'Consumer & Retail' },
    { pattern: /climate|environment|sustainability|green/i, topic: 'Sustainability' },
    { pattern: /data|analytics|metrics|insights/i, topic: 'Data & Analytics' },
    { pattern: /startup|entrepreneur|venture|capital/i, topic: 'Startups & Venture' },
    { pattern: /strategy|planning|growth|expansion/i, topic: 'Strategy & Growth' },
  ];

  const topics: string[] = [];

  topicPatterns.forEach(({ pattern, topic }) => {
    if (pattern.test(content)) {
      topics.push(topic);
    }
  });

  // If no topics matched, extract main nouns
  if (topics.length === 0) {
    const keywords = extractKeywords(content);
    return keywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1));
  }

  return topics;
}

// ============================================================================
// Sentiment Analysis
// ============================================================================

/**
 * Analyze sentiment of content
 */
function analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = [
    'growth', 'success', 'improve', 'innovate', 'opportunity', 'achieve',
    'positive', 'benefit', 'increase', 'advance', 'progress', 'excellent',
    'good', 'great', 'best', 'strong', 'powerful', 'effective', 'efficient',
  ];

  const negativeWords = [
    'decline', 'failure', 'risk', 'threat', 'challenge', 'problem',
    'negative', 'decrease', 'loss', 'weak', 'poor', 'difficult',
    'concern', 'uncertainty', 'volatility', 'crisis', 'debt',
  ];

  const contentLower = content.toLowerCase();
  const words = contentLower.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
    if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
  });

  const ratio = positiveCount / (positiveCount + negativeCount + 1);

  if (ratio > 0.6) return 'positive';
  if (ratio < 0.4) return 'negative';
  return 'neutral';
}

// ============================================================================
// Key Points Extraction
// ============================================================================

/**
 * Extract key points from content
 */
function extractKeyPoints(content: string, count: number): string[] {
  // Split into sentences
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length === 0) {
    return ['Content analysis complete. No significant findings.'];
  }

  // Score sentences based on position and length
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;

    // First and last sentences are often important
    if (index === 0) score += 2;
    if (index === sentences.length - 1) score += 1;

    // Medium length sentences are usually more informative
    if (sentence.length > 50 && sentence.length < 200) score += 2;

    // Sentences with numbers often contain key data
    if (/\d+/.test(sentence)) score += 1;

    // Sentences with important words
    const importantWords = ['important', 'key', 'significant', 'critical', 'main', 'major'];
    if (importantWords.some(w => sentence.toLowerCase().includes(w))) score += 2;

    return { sentence, score, index };
  });

  // Sort by score and select top sentences
  scoredSentences.sort((a, b) => b.score - a.score);

  const topSentences = scoredSentences
    .slice(0, count)
    .sort((a, b) => a.index - b.index) // Keep original order
    .map(s => s.sentence);

  // Ensure we return exactly `count` points
  while (topSentences.length < count && sentences.length > topSentences.length) {
    const remaining = sentences.filter(s => !topSentences.includes(s));
    if (remaining.length > 0) {
      topSentences.push(remaining[0]);
    } else {
      break;
    }
  }

  return topSentences.slice(0, count);
}

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate a summary of the content
 */
function generateSummaryText(
  content: string,
  maxLength: number,
  style: 'brief' | 'standard' | 'detailed'
): string {
  // For very short content, return as-is
  if (content.length <= maxLength) {
    return content;
  }

  // Split into paragraphs
  const paragraphs = content.split(/\n+/).filter(p => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return content.substring(0, maxLength) + '...';
  }

  // Generate summary based on style
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

  switch (style) {
    case 'brief':
      // Just return the first 1-2 sentences
      return sentences.slice(0, 2).join('. ').trim() + '.';

    case 'standard':
      // Return first paragraph or 2-3 key sentences
      if (paragraphs.length > 0 && paragraphs[0].length < maxLength) {
        return paragraphs[0];
      }
      return sentences.slice(0, 3).join('. ').trim() + '.';

    case 'detailed':
      // Return more comprehensive summary
      const intro = sentences.slice(0, 2).join('. ').trim() + '. ';
      const body = sentences.slice(2, 5).join('. ').trim() + '. ';
      const conclusion = sentences.slice(-2).join('. ').trim() + '.';

      let detailed = intro + body + conclusion;
      if (detailed.length > maxLength) {
        detailed = detailed.substring(0, maxLength - 3) + '...';
      }
      return detailed;
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Summarize content
 */
export async function summarize(input: SummarizeInput): Promise<SummaryResult> {
  const startTime = Date.now();
  const { content, contentType, maxLength, style, includeKeyPoints } = input;

  logger.info('summarize_content', {
    contentType,
    maxLength,
    style,
    includeKeyPoints,
    originalLength: content.length,
  });

  // Simulate processing time
  await simulateDelay(100, 300);

  // Get template based on style (default to 'standard')
  const summaryStyle = style || 'standard';
  const template = getSummaryTemplate(summaryStyle);

  // Generate summary
  const summary = generateSummaryText(content, maxLength || template.maxLength, summaryStyle);

  // Extract keywords
  const keywords = extractKeywords(content);

  // Extract topics
  const topics = extractTopics(content);

  // Analyze sentiment
  const sentiment = analyzeSentiment(content);

  // Extract key points if requested
  const keyPoints = includeKeyPoints
    ? extractKeyPoints(content, template.keyPointsCount)
    : undefined;

  const result: SummaryResult = {
    id: uuidv4(),
    originalLength: content.length,
    summaryLength: summary.length,
    summary,
    keyPoints,
    keywords: keywords.slice(0, 10),
    topics,
    sentiment,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - startTime,
  };

  logger.info('summarize_complete', {
    summaryId: result.id,
    originalLength: result.originalLength,
    summaryLength: result.summaryLength,
    keyPointsCount: result.keyPoints?.length || 0,
    tookMs: result.tookMs,
  });

  return result;
}

/**
 * Summarize multiple pieces of content
 */
export async function summarizeBatch(
  contents: string[],
  style: 'brief' | 'standard' | 'detailed' = 'standard'
): Promise<SummaryResult[]> {
  logger.info('summarize_batch', { count: contents.length, style });

  const results = await Promise.all(
    contents.map(content =>
      summarize({
        content,
        style,
        includeKeyPoints: true,
      })
    )
  );

  return results;
}

/**
 * Extract entities from content
 */
export async function extractEntities(
  content: string
): Promise<{
  organizations: string[];
  people: string[];
  locations: string[];
  dates: string[];
}> {
  logger.info('extract_entities', { contentLength: content.length });

  // Simple entity extraction using patterns
  const orgPatterns = /(?:company|corporation|inc|llc|ltd)\s+[A-Z][a-z]+/gi;
  const peoplePatterns = /(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/g;
  const locationPatterns = /(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  const datePatterns = /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;

  const organizations = [...new Set(content.match(orgPatterns) || [])];
  const people = [...new Set(content.match(peoplePatterns) || [])];
  const locations = [...new Set(
    (content.match(locationPatterns) || [])
      .map(m => m.replace(/^(?:in|at|near|from)\s+/i, ''))
      .filter(m => m.length > 2)
  )];
  const dates = [...new Set(content.match(datePatterns) || [])];

  return {
    organizations,
    people,
    locations,
    dates,
  };
}

/**
 * Compare multiple summaries
 */
export async function compareSummaries(
  summaries: string[]
): Promise<{
  commonThemes: string[];
  uniqueInsights: Array<{ index: number; unique: string[] }>;
  consensus: string;
}> {
  logger.info('compare_summaries', { count: summaries.length });

  // Extract keywords from each summary
  const allKeywords = summaries.map(s => new Set(extractKeywords(s)));

  // Find common themes (keywords appearing in all summaries)
  const commonKeywords = [...allKeywords[0]].filter(
    keyword => allKeywords.slice(1).every(set => set.has(keyword))
  );

  // Find unique insights for each summary
  const uniqueInsights = summaries.map((summary, index) => {
    const otherKeywords = new Set<string>();
    summaries.forEach((s, i) => {
      if (i !== index) {
        extractKeywords(s).forEach(k => otherKeywords.add(k));
      }
    });

    const unique = extractKeywords(summary).filter(k => !otherKeywords.has(k));
    return { index, unique };
  });

  // Generate consensus
  const consensus = commonKeywords.length > 0
    ? `All sources agree on: ${commonKeywords.slice(0, 5).join(', ')}.`
    : 'Sources present varying perspectives on this topic.';

  return {
    commonThemes: commonKeywords.slice(0, 5),
    uniqueInsights,
    consensus,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simulate processing delay
 */
function simulateDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}
