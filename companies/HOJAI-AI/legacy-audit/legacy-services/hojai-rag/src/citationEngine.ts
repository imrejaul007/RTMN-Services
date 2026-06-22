/**
 * Citation Engine
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Generates citations and source attribution for RAG responses.
 * Supports multiple citation formats and overlap detection.
 */

import type {
  Citation,
  CitationResult,
  RerankedResult,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum phrase length for citation matching
 */
const MIN_PHRASE_LENGTH = 10;

/**
 * Minimum word overlap for citation match
 */
const MIN_WORD_OVERLAP = 0.5;

/**
 * Citation format styles
 */
export type CitationStyle = 'inline' | 'superscript' | 'bracket' | 'numeric';

/**
 * Citation configuration
 */
export interface CitationConfig {
  /** Citation style */
  style: CitationStyle;
  /** Include page numbers */
  includePageNumbers: boolean;
  /** Include source URLs */
  includeUrls: boolean;
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Maximum citations per answer */
  maxCitations: number;
}

// ============================================================================
// Citation Engine
// ============================================================================

/**
 * Citation Engine for source attribution
 *
 * Extracts citations from RAG responses by matching
 * key phrases from source documents to the generated answer.
 */
export class CitationEngine {
  private config: CitationConfig;

  constructor(config?: Partial<CitationConfig>) {
    this.config = {
      style: config?.style || 'bracket',
      includePageNumbers: config?.includePageNumbers ?? true,
      includeUrls: config?.includeUrls ?? true,
      minConfidence: config?.minConfidence ?? 0.3,
      maxCitations: config?.maxCitations ?? 10,
    };
  }

  /**
   * Generate citations for an answer
   *
   * @param answer - Generated answer text
   * @param sourceChunks - Source chunks used to generate the answer
   * @returns Citation result with formatted answer
   */
  generateCitations(answer: string, sourceChunks: RerankedResult[]): CitationResult {
    const citations: Citation[] = [];

    // Extract key phrases from each source chunk
    for (const chunk of sourceChunks) {
      const keyPhrases = this.extractKeyPhrases(chunk.text);

      // Find matching phrases in answer
      for (const phrase of keyPhrases) {
        const match = this.findPhraseInAnswer(phrase, answer);

        if (match) {
          const citation: Citation = {
            chunkId: chunk.id,
            text: phrase,
            source: this.getSourceName(chunk),
            page: chunk.metadata?.page as number | undefined,
            startIndex: match.start,
            endIndex: match.end,
            confidence: this.calculateConfidence(chunk, phrase, answer),
          };

          // Only add if above confidence threshold
          if (citation.confidence >= this.config.minConfidence) {
            citations.push(citation);
          }
        }
      }
    }

    // Merge overlapping citations
    const mergedCitations = this.mergeOverlappingCitations(citations);

    // Format answer with citations
    const formattedAnswer = this.formatAnswerWithCitations(answer, mergedCitations);

    // Get unique sources
    const sources = this.getUniqueSources(mergedCitations);

    return {
      formattedAnswer,
      citations: mergedCitations.slice(0, this.config.maxCitations),
      sources,
    };
  }

  /**
   * Extract key phrases from text
   *
   * Key phrases are significant phrases that can be used
   * for citation matching.
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Extract sentences as phrases
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > MIN_PHRASE_LENGTH);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Skip very short sentences
      if (trimmed.length < MIN_PHRASE_LENGTH) continue;

      // Add full sentence
      phrases.push(trimmed);

      // Also add noun phrases (simplified extraction)
      const nounPhrases = this.extractNounPhrases(trimmed);
      phrases.push(...nounPhrases);
    }

    // Remove duplicates and short phrases
    const uniquePhrases = [...new Set(phrases)];

    return uniquePhrases.filter(p => p.length >= MIN_PHRASE_LENGTH);
  }

  /**
   * Extract noun phrases from text (simplified)
   */
  private extractNounPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Simple pattern matching for common noun phrase patterns
    const patterns = [
      // "the [adjective] [noun]" or "the [noun] of [noun]"
      /the\s+(?:[\w]+(?:ing|ed|ful|ous|ive|able|ible|al|ous)\s+)?[\w]+(?:\s+of\s+[\w]+)?/gi,
      // "a [noun] that" or "an [noun] that"
      /[a]n?\s+[\w]+(?:\s+that|\s+which|\s+is|\s+was)?/gi,
      // "according to [entity]"
      /according to\s+[\w\s,]+/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(...matches);
      }
    }

    return phrases;
  }

  /**
   * Find a phrase in the answer text
   */
  private findPhraseInAnswer(
    phrase: string,
    answer: string
  ): { start: number; end: number } | null {
    // Try exact match first
    const normalizedPhrase = phrase.toLowerCase().trim();
    const normalizedAnswer = answer.toLowerCase();

    const index = normalizedAnswer.indexOf(normalizedPhrase);
    if (index !== -1) {
      return {
        start: index,
        end: index + phrase.length,
      };
    }

    // Try fuzzy match
    const words = normalizedPhrase.split(/\s+/);
    const answerWords = normalizedAnswer.split(/\s+/);

    // Find start position
    let startPos = -1;
    let matchedWords = 0;

    for (let i = 0; i < answerWords.length - words.length + 1; i++) {
      matchedWords = 0;
      for (let j = 0; j < words.length; j++) {
        if (answerWords[i + j] === words[j] ||
            answerWords[i + j].includes(words[j]) ||
            words[j].includes(answerWords[i + j])) {
          matchedWords++;
        }
      }

      if (matchedWords / words.length >= MIN_WORD_OVERLAP) {
        startPos = i;
        break;
      }
    }

    if (startPos === -1) return null;

    // Calculate character positions
    const beforeMatch = answerWords.slice(0, startPos).join(' ').length;
    const matchLength = answerWords.slice(startPos, startPos + words.length).join(' ').length;

    return {
      start: beforeMatch + startPos, // + startPos for spaces
      end: beforeMatch + startPos + matchLength + words.length,
    };
  }

  /**
   * Calculate citation confidence
   */
  private calculateConfidence(
    chunk: RerankedResult,
    phrase: string,
    answer: string
  ): number {
    // Base confidence from reranker score
    const baseScore = chunk.crossEncoderScore;

    // Boost if phrase is verbatim in answer
    const isVerbatim = answer.toLowerCase().includes(phrase.toLowerCase());
    const verbatimBoost = isVerbatim ? 0.2 : 0;

    // Boost if chunk has high final score
    const scoreBoost = chunk.finalScore * 0.1;

    // Boost if phrase appears early in answer
    const answerPosition = answer.toLowerCase().indexOf(phrase.toLowerCase());
    const positionBoost = answerPosition < 100 ? 0.1 : 0;

    return Math.min(1, baseScore + verbatimBoost + scoreBoost + positionBoost);
  }

  /**
   * Merge overlapping citations
   */
  private mergeOverlappingCitations(citations: Citation[]): Citation[] {
    if (citations.length === 0) return [];

    // Sort by start index
    const sorted = [...citations].sort((a, b) => a.startIndex - b.startIndex);

    const merged: Citation[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check for overlap
      if (next.startIndex <= current.endIndex) {
        // Merge: keep the one with higher confidence
        if (next.confidence > current.confidence) {
          current = {
            ...next,
            startIndex: Math.min(current.startIndex, next.startIndex),
            endIndex: Math.max(current.endIndex, next.endIndex),
            confidence: (current.confidence + next.confidence) / 2,
          };
        }
      } else {
        // No overlap, add current and move to next
        merged.push(current);
        current = { ...next };
      }
    }

    // Add the last one
    merged.push(current);

    return merged;
  }

  /**
   * Get unique source list
   */
  private getUniqueSources(citations: Citation[]): string[] {
    const sources = new Set<string>();

    for (const citation of citations) {
      if (citation.source) {
        sources.add(citation.source);
      }
    }

    return [...sources];
  }

  /**
   * Get source name from chunk metadata
   */
  private getSourceName(chunk: RerankedResult): string {
    // Try various metadata fields
    if (chunk.metadata?.source) {
      return String(chunk.metadata.source);
    }

    if (chunk.metadata?.url) {
      return String(chunk.metadata.url);
    }

    if (chunk.metadata?.title) {
      return String(chunk.metadata.title);
    }

    if (chunk.metadata?.documentId) {
      return `Document: ${chunk.metadata.documentId}`;
    }

    return chunk.id;
  }

  /**
   * Format answer with inline citations
   */
  private formatAnswerWithCitations(answer: string, citations: Citation[]): string {
    if (citations.length === 0) {
      return answer;
    }

    let formatted = answer;

    // Sort citations by position (reverse order to preserve indices)
    const sortedCitations = [...citations]
      .filter(c => c.startIndex >= 0 && c.endIndex <= answer.length)
      .sort((a, b) => b.startIndex - a.startIndex);

    for (const citation of sortedCitations) {
      const marker = this.getCitationMarker(citation.chunkId);
      formatted = formatted.slice(0, citation.endIndex) + marker + formatted.slice(citation.endIndex);
    }

    return formatted;
  }

  /**
   * Get citation marker based on style
   */
  private getCitationMarker(chunkId: string): string {
    switch (this.config.style) {
      case 'superscript':
        return `<sup>[${chunkId}]</sup>`;
      case 'numeric':
        return `[${chunkId}]`;
      case 'inline':
        return ` (${chunkId})`;
      case 'bracket':
      default:
        return `[${chunkId}]`;
    }
  }

  /**
   * Format citations as a list
   */
  formatCitationList(citations: Citation[]): string {
    const lines: string[] = ['## Sources\n'];

    // Group by source
    const sourceGroups = new Map<string, Citation[]>();
    for (const citation of citations) {
      if (!sourceGroups.has(citation.source)) {
        sourceGroups.set(citation.source, []);
      }
      sourceGroups.get(citation.source)!.push(citation);
    }

    // Format each source
    for (const [source, srcCitations] of sourceGroups) {
      lines.push(`### ${source}`);

      for (const citation of srcCitations) {
        const page = this.config.includePageNumbers && citation.page
          ? ` (page ${citation.page})`
          : '';
        lines.push(`- [${citation.chunkId}] "${citation.text.slice(0, 100)}..."${page}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<CitationConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
