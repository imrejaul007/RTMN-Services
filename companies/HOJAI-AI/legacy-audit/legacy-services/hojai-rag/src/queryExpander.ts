/**
 * Query Expander
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Expands user queries to improve retrieval recall.
 * Uses LLM to generate alternative phrasings and related terms.
 */

import type { ExpansionResult, LLMProvider } from './types.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Number of alternative queries to generate
 */
const NUM_ALTERNATIVES = 3;

/**
 * Maximum additional queries to include
 */
const MAX_EXPANSION_TERMS = 5;

/**
 * Similarity threshold for synonym detection
 */
const SYNONYM_THRESHOLD = 0.8;

// ============================================================================
// Query Expander
// ============================================================================

/**
 * Query Expander for improving retrieval
 *
 * Expands queries to improve recall by:
 * - Generating alternative phrasings using LLM
 * - Adding synonyms and related terms
 * - Including domain-specific terminology
 */
export class QueryExpander {
  private llmProvider: LLMProvider;
  private retryConfig: RetryConfig;
  private cache: Map<string, ExpansionResult>;

  constructor(
    llmProvider: LLMProvider,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.llmProvider = llmProvider;
    this.retryConfig = retryConfig;
    this.cache = new Map();
  }

  /**
   * Expand a query using LLM
   *
   * @param query - Original query
   * @returns Expansion result with alternative queries
   */
  async expand(query: string): Promise<ExpansionResult> {
    // Check cache first
    const cached = this.cache.get(query);
    if (cached) {
      return cached;
    }

    // Generate expansions
    const expansions = await this.generateExpansions(query);

    const result: ExpansionResult = {
      originalQuery: query,
      expandedQueries: [query, ...expansions.alternatives],
      alternatives: expansions.alternatives,
    };

    // Cache result
    this.cache.set(query, result);

    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    return result;
  }

  /**
   * Generate query expansions using LLM
   */
  private async generateExpansions(query: string): Promise<{ alternatives: string[] }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const prompt = `Generate ${NUM_ALTERNATIVES} alternative ways to ask this question.
Return ONLY the alternative questions, one per line, without numbering or bullet points.

Original question: "${query}"

Alternatives:`;

        const response = await this.llmProvider.chat([
          { role: 'user', content: prompt },
        ]);

        // Parse response into alternatives
        const alternatives = response
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && line.length < 200)
          .slice(0, NUM_ALTERNATIVES);

        return { alternatives };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Return empty on failure
    console.warn(`Query expansion failed: ${lastError?.message}`);
    return { alternatives: [] };
  }

  /**
   * Expand query with synonyms (rule-based fallback)
   */
  expandWithSynonyms(query: string): string[] {
    const expansions: string[] = [];

    // Common synonym pairs
    const synonyms: Record<string, string[]> = {
      'find': ['search', 'locate', 'get', 'obtain', 'retrieve'],
      'show': ['display', 'list', 'present', 'exhibit'],
      'get': ['obtain', 'acquire', 'fetch', 'procure'],
      'create': ['make', 'build', 'generate', 'produce', 'add'],
      'delete': ['remove', 'erase', 'eliminate', 'drop'],
      'update': ['modify', 'edit', 'change', 'alter'],
      'list': ['show', 'display', 'enumerate', 'catalog'],
      'how': ['what', 'which', 'why', 'when', 'where'],
      'why': ['how', 'what', 'for what reason'],
      'using': ['with', 'through', 'via', 'by means of'],
      'example': ['sample', 'instance', 'illustration', 'demo'],
      'help': ['assist', 'support', 'guide', 'aid'],
    };

    // Split query into words
    const words = query.toLowerCase().split(/\s+/);

    // Generate combinations with synonyms
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordSynonyms = synonyms[word];

      if (wordSynonyms) {
        for (const synonym of wordSynonyms.slice(0, MAX_EXPANSION_TERMS)) {
          const expanded = [...words];
          expanded[i] = synonym;
          expansions.push(expanded.join(' '));
        }
      }
    }

    // Remove duplicates and original query
    const unique = [...new Set(expansions)].filter(q => q !== query.toLowerCase());

    return unique.slice(0, MAX_EXPANSION_TERMS);
  }

  /**
   * Add domain-specific terminology
   */
  expandWithDomainTerms(query: string): string[] {
    const expansions: string[] = [];

    // Domain-specific term mappings
    const domainTerms: Record<string, string[]> = {
      'user': ['customer', 'client', 'account', 'profile'],
      'document': ['file', 'record', 'entry', 'item'],
      'search': ['query', 'lookup', 'find', 'filter'],
      'error': ['issue', 'problem', 'bug', 'fault', 'exception'],
      'data': ['information', 'records', 'content', 'entries'],
      'system': ['platform', 'application', 'service', 'infrastructure'],
      'report': ['summary', 'overview', 'dashboard', 'analytics'],
    };

    const words = query.toLowerCase().split(/\s+/);

    for (const word of words) {
      const terms = domainTerms[word];
      if (terms) {
        for (const term of terms.slice(0, MAX_EXPANSION_TERMS)) {
          const expanded = query.toLowerCase().replace(new RegExp(word, 'gi'), term);
          if (expanded !== query.toLowerCase()) {
            expansions.push(expanded);
          }
        }
      }
    }

    return [...new Set(expansions)];
  }

  /**
   * Clear the expansion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================================================
// HyDE (Hypothetical Document Embeddings)
// ============================================================================

/**
 * HyDE: Hypothetical Document Embeddings
 *
 * A technique that generates a hypothetical document
 * that would answer the query, then uses that for
 * embedding-based retrieval.
 *
 * Reference: Gao et al., "Precise Zero-Shot Dense Retrieval without
 * Relevance Labels" (2023)
 */
export class HyDEExpander {
  private llmProvider: LLMProvider;
  private retryConfig: RetryConfig;

  constructor(
    llmProvider: LLMProvider,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.llmProvider = llmProvider;
    this.retryConfig = retryConfig;
  }

  /**
   * Generate a hypothetical document for the query
   */
  async generateHypotheticalDocument(query: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const prompt = `Write a short passage (2-3 sentences) that directly answers this question.
The passage should contain factual information as if it were extracted from a reliable source.

Question: "${query}"

Hypothetical passage:`;

        const response = await this.llmProvider.chat([
          { role: 'user', content: prompt },
        ]);

        return response.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Return original query on failure
    console.warn(`HyDE generation failed: ${lastError?.message}`);
    return query;
  }
}
