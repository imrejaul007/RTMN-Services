/**
 * HIB Code Intelligence - Document Intelligence Service
 * Summarizes, extracts entities, and processes documents
 */

import type { DocumentSummary, Entity, Relationship, ResearchResult, Source } from '../types';

interface DocumentProcessOptions {
  extractEntities?: boolean;
  extractRelationships?: boolean;
  generateSummary?: boolean;
}

export class DocumentIntelligence {
  /**
   * Process a document and extract structured information
   */
  async process(
    content: string,
    options: DocumentProcessOptions = {}
  ): Promise<DocumentSummary> {
    const {
      extractEntities = true,
      extractRelationships = true,
      generateSummary = true,
    } = options;

    // Extract title (first line or first heading)
    const title = this.extractTitle(content);

    // Generate summary
    const summary = generateSummary ? this.generateSummary(content) : '';

    // Extract key points
    const keyPoints = this.extractKeyPoints(content);

    // Extract entities
    const entities = extractEntities ? this.extractEntities(content) : [];

    // Extract relationships
    const relationships = extractRelationships ? this.extractRelationships(content, entities) : [];

    return {
      id: this.generateId(content),
      title,
      summary,
      keyPoints,
      entities,
      relationships,
    };
  }

  /**
   * Extract title from document
   */
  private extractTitle(content: string): string {
    const lines = content.split('\n').filter(l => l.trim());

    // Check first line
    const firstLine = lines[0]?.trim() || 'Untitled';

    // If it looks like a heading, use it
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '').trim();
    }

    // If it's short and doesn't look like a paragraph, use it
    if (firstLine.length < 100 && !firstLine.includes('.')) {
      return firstLine;
    }

    // Otherwise, truncate the first line
    return firstLine.substring(0, 80) + (firstLine.length > 80 ? '...' : '');
  }

  /**
   * Generate a summary of the document
   */
  private generateSummary(content: string): string {
    // Simple extractive summarization
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    // Score sentences by position and keyword presence
    const importantKeywords = [
      'important', 'significant', 'main', 'key', 'primary',
      'essential', 'critical', 'major', 'fundamental'
    ];

    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;

      // First sentences are usually more important
      score += Math.max(0, 10 - index * 0.5);

      // Check for important keywords
      const lowerSentence = sentence.toLowerCase();
      importantKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          score += 5;
        }
      });

      // Longer sentences often contain more information
      score += Math.min(sentence.length / 50, 5);

      return { sentence, score };
    });

    // Get top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.sentence);

    return topSentences.join('. ').substring(0, 500) + (topSentences.join('. ').length > 500 ? '...' : '');
  }

  /**
   * Extract key points from document
   */
  private extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    const lines = content.split('\n');

    // Look for list items, headings, and bullet points
    for (const line of lines) {
      const trimmed = line.trim();

      // Check for headings
      if (trimmed.startsWith('#')) {
        const heading = trimmed.replace(/^#+\s*/, '');
        if (heading.length > 5 && heading.length < 100) {
          keyPoints.push(heading);
        }
      }

      // Check for bullet points
      if (trimmed.match(/^[-*•]\s/)) {
        const point = trimmed.replace(/^[-*•]\s*/, '');
        if (point.length > 5 && point.length < 200) {
          keyPoints.push(point);
        }
      }

      // Check for numbered lists
      if (trimmed.match(/^\d+[.)]\s/)) {
        const point = trimmed.replace(/^\d+[.)]\s*/, '');
        if (point.length > 5 && point.length < 200) {
          keyPoints.push(point);
        }
      }
    }

    return keyPoints.slice(0, 20); // Limit to 20 key points
  }

  /**
   * Extract named entities from content
   */
  private extractEntities(content: string): Entity[] {
    const entities: Entity[] = [];

    // Simple regex-based entity extraction
    // In production, use NLP libraries like spaCy or Stanford NER

    // Capitalized words that might be names/organizations
    const capitalPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    const matches = content.match(capitalPattern) || [];

    // Count occurrences and filter
    const counts = new Map<string, number>();
    matches.forEach(match => {
      // Skip common words
      if (['The', 'This', 'That', 'These', 'Those', 'There', 'Here', 'What', 'When', 'Where', 'Which'].includes(match)) {
        return;
      }
      counts.set(match, (counts.get(match) || 0) + 1);
    });

    // Add entities with confidence based on occurrence count
    counts.forEach((count, name) => {
      const confidence = Math.min(1, count / 5);

      // Determine entity type based on context (simplified)
      let type: Entity['type'] = 'concept';

      // Check if it looks like a person (2-3 capitalized words)
      if (name.split(' ').length >= 2 && name.split(' ').length <= 3) {
        type = 'person';
      }

      // Check if it looks like an organization (common suffixes)
      if (['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Organization', 'Institute'].some(s => name.includes(s))) {
        type = 'organization';
      }

      entities.push({ name, type, confidence });
    });

    // Extract dates
    const datePattern = /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;
    const dates = content.match(datePattern) || [];
    dates.forEach(date => {
      entities.push({ name: date, type: 'date', confidence: 0.9 });
    });

    // Extract numbers with context
    const numberPattern = /\b(?:\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:percent|%|users?|customers?|people|items?|products?|dollars?|rupees?|USD|INR|million|billion)\b/gi;
    const numbers = content.match(numberPattern) || [];
    numbers.forEach(num => {
      entities.push({ name: num, type: 'number', confidence: 0.8 });
    });

    return entities.slice(0, 50); // Limit to 50 entities
  }

  /**
   * Extract relationships between entities
   */
  private extractRelationships(content: string, entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];

    // Simple relationship patterns
    const patterns = [
      { pattern: /(\w+)\s+(?:is|was|are|were)\s+(?:a|an|the)?\s*(\w+)/gi, type: 'is_a' },
      { pattern: /(\w+)\s+(?:works|works for|employed by|joined)\s+(\w+)/gi, type: 'works_for' },
      { pattern: /(\w+)\s+(?:created|built|developed|designed)\s+(\w+)/gi, type: 'created' },
      { pattern: /(\w+)\s+(?:uses|utilizes|employs)\s+(\w+)/gi, type: 'uses' },
    ];

    // Map entity names to entities for lookup
    const entityMap = new Map(entities.map(e => [e.name.toLowerCase(), e]));

    patterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const source = entityMap.get(match[1].toLowerCase());
        const target = entityMap.get(match[2].toLowerCase());

        if (source && target) {
          relationships.push({
            source: source.name,
            target: target.name,
            type,
            confidence: 0.7,
          });
        }
      }
    });

    return relationships.slice(0, 20); // Limit to 20 relationships
  }

  /**
   * Generate a unique ID for a document
   */
  private generateId(content: string): string {
    // Simple hash-based ID
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `doc_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Process a research query and return results
   */
  async research(query: string, context?: string): Promise<ResearchResult> {
    // In production, this would integrate with search APIs or RAG systems

    const sources: Source[] = [
      {
        title: 'Related Documentation',
        snippet: 'Based on the query, relevant documentation will be retrieved.',
        relevance: 0.9,
      },
    ];

    return {
      query,
      answer: `Research findings for "${query}":\n\nBased on available information, here are the key findings...\n\nFor more detailed information, please refer to the linked sources.`,
      sources,
      confidence: 0.75,
    };
  }
}

export const documentIntelligence = new DocumentIntelligence();
