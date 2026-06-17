import { Citation } from '../types';

interface CitationMatch {
  citation: Citation;
  relevanceScore: number;
  matchedTerms: string[];
}

class CitationService {
  /**
   * Find citations relevant to a query
   */
  findRelevantCitations(citations: Citation[], query: string): CitationMatch[] {
    if (!citations || citations.length === 0) {
      return [];
    }

    const queryTerms = this.tokenize(query);
    const results: CitationMatch[] = [];

    for (const citation of citations) {
      const citationText = this.buildCitationText(citation);
      const citationTerms = this.tokenize(citationText);

      let score = 0;
      const matchedTerms: string[] = [];

      for (const queryTerm of queryTerms) {
        // Check source match
        if (citation.source.toLowerCase().includes(queryTerm)) {
          score += 5;
          matchedTerms.push(queryTerm);
        }

        // Check description match
        if (citation.description.toLowerCase().includes(queryTerm)) {
          score += 3;
          if (!matchedTerms.includes(queryTerm)) matchedTerms.push(queryTerm);
        }

        // Check term overlap
        for (const citationTerm of citationTerms) {
          if (citationTerm.includes(queryTerm) || queryTerm.includes(citationTerm)) {
            score += 1;
            if (!matchedTerms.includes(queryTerm)) matchedTerms.push(queryTerm);
          }
        }
      }

      // Boost if URL is present (more authoritative)
      if (citation.url) {
        score += 2;
      }

      if (score > 0) {
        results.push({
          citation,
          relevanceScore: score,
          matchedTerms: [...new Set(matchedTerms)]
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generate citation in various formats
   */
  formatCitation(citation: Citation, format: 'apa' | 'mla' | 'chicago' = 'apa'): string {
    const date = citation.date ? new Date(citation.date).getFullYear() : 'n.d.';

    switch (format) {
      case 'apa':
        return `${citation.source}. (${date}). ${citation.description}.${citation.url ? ` Retrieved from ${citation.url}` : ''}`;

      case 'mla':
        return `"${citation.description}" ${citation.source}, ${date}.${citation.url ? ` ${citation.url}` : ''}`;

      case 'chicago':
        return `${citation.source}, "${citation.description}," accessed ${date}.${citation.url ? ` ${citation.url}` : ''}`;

      default:
        return `${citation.source}: ${citation.description}`;
    }
  }

  /**
   * Generate bibliography from citations
   */
  generateBibliography(citations: Citation[], format: 'apa' | 'mla' | 'chicago' = 'apa'): string[] {
    return citations.map(c => this.formatCitation(c, format));
  }

  /**
   * Extract key references from content
   */
  extractReferences(citations: Citation[]): {
    government: Citation[];
    academic: Citation[];
    vendor: Citation[];
    industry: Citation[];
    other: Citation[];
  } {
    const categories = {
      government: [] as Citation[],
      academic: [] as Citation[],
      vendor: [] as Citation[],
      industry: [] as Citation[],
      other: [] as Citation[]
    };

    for (const citation of citations) {
      const source = citation.source.toLowerCase();
      const url = citation.url?.toLowerCase() || '';

      if (source.includes('gov') || url.includes('.gov') || url.includes('government')) {
        categories.government.push(citation);
      } else if (source.includes('university') || source.includes('journal') || source.includes('research')) {
        categories.academic.push(citation);
      } else if (source.includes('vendor') || source.includes('manufacturer') || source.includes('company')) {
        categories.vendor.push(citation);
      } else if (source.includes('association') || source.includes('industry') || source.includes('chamber')) {
        categories.industry.push(citation);
      } else {
        categories.other.push(citation);
      }
    }

    return categories;
  }

  /**
   * Validate citation URLs
   */
  validateCitation(citation: Citation): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!citation.source) {
      issues.push('Missing source');
    }

    if (!citation.description) {
      issues.push('Missing description');
    }

    if (citation.url) {
      try {
        const url = new URL(citation.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          issues.push('Invalid URL protocol');
        }
      } catch {
        issues.push('Invalid URL format');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Build searchable text from citation
   */
  private buildCitationText(citation: Citation): string {
    return `${citation.source} ${citation.description} ${citation.url || ''}`;
  }

  /**
   * Tokenize text into searchable terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }
}

export const citationService = new CitationService();
