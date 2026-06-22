/**
 * Hojai Flow - Knowledge Engine Service
 *
 * RAG + Knowledge Management:
 * - Vector storage
 * - Context assembly
 * - Source retrieval
 * - Knowledge graphs
 */

import { v4 as uuid } from 'uuid';

export interface KnowledgeDocument {
  id: string;
  source: string;
  sourceType: 'pdf' | 'website' | 'crm' | 'faq' | 'document' | 'policy' | 'database' | 'email' | 'message';
  title: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  relevanceScore?: number;
}

export interface KnowledgeQuery {
  text: string;
  filters?: {
    source?: string;
    sourceType?: KnowledgeDocument['sourceType'];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
  };
  limit?: number;
  includeContext?: boolean;
}

export interface KnowledgeResult {
  document: KnowledgeDocument;
  relevance: number;
  highlights: string[];
  context?: string;
}

export interface ContextPack {
  query: string;
  documents: KnowledgeResult[];
  assembledContext: string;
  sources: string[];
  metadata: Record<string, unknown>;
}

export type SourceType = KnowledgeDocument['sourceType'];

const SOURCE_HANDLERS: Record<SourceType, {
  fetch: (source: string, metadata: Record<string, unknown>) => Promise<KnowledgeDocument[]>;
  transform: (content: unknown, metadata: Record<string, unknown>) => KnowledgeDocument[];
}> = {
  pdf: {
    fetch: async (source, metadata) => {
      // In production: use PDF parser
      return [];
    },
    transform: (content, metadata) => [],
  },
  website: {
    fetch: async (source, metadata) => {
      // In production: use web scraper
      return [];
    },
    transform: (content, metadata) => [],
  },
  crm: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => {
      if (Array.isArray(content)) {
        return content.map((item) => ({
          id: uuid(),
          source: metadata.source as string || 'crm',
          sourceType: 'crm' as const,
          title: item.name || item.title || 'CRM Record',
          content: JSON.stringify(item),
          metadata: { ...metadata, recordId: item.id },
          createdAt: new Date(),
          updatedAt: new Date(),
          accessCount: 0,
        }));
      }
      return [];
    },
  },
  faq: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => {
      if (Array.isArray(content)) {
        return content.map((item) => ({
          id: uuid(),
          source: metadata.source as string || 'faq',
          sourceType: 'faq' as const,
          title: item.question || 'FAQ',
          content: `${item.question}\n\n${item.answer}`,
          metadata: { ...metadata, category: item.category },
          createdAt: new Date(),
          updatedAt: new Date(),
          accessCount: 0,
        }));
      }
      return [];
    },
  },
  document: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => [{
      id: uuid(),
      source: metadata.source as string || 'document',
      sourceType: 'document' as const,
      title: metadata.title as string || 'Document',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
    }],
  },
  policy: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => [{
      id: uuid(),
      source: metadata.source as string || 'policy',
      sourceType: 'policy' as const,
      title: metadata.title as string || 'Policy',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata: { ...metadata, effectiveDate: metadata.effectiveDate },
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
    }],
  },
  database: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => {
      if (Array.isArray(content)) {
        return content.map((record) => ({
          id: uuid(),
          source: metadata.source as string || 'database',
          sourceType: 'database' as const,
          title: record.name || record.title || `Record ${record.id}` || 'DB Record',
          content: JSON.stringify(record),
          metadata: { ...metadata, table: metadata.table, recordId: record.id },
          createdAt: new Date(),
          updatedAt: new Date(),
          accessCount: 0,
        }));
      }
      return [];
    },
  },
  email: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => [{
      id: uuid(),
      source: metadata.source as string || 'email',
      sourceType: 'email' as const,
      title: metadata.subject as string || 'Email',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata: { ...metadata, from: metadata.from, to: metadata.to },
      createdAt: new Date(metadata.sentAt as string || Date.now()),
      updatedAt: new Date(),
      accessCount: 0,
    }],
  },
  message: {
    fetch: async (source, metadata) => [],
    transform: (content, metadata) => [{
      id: uuid(),
      source: metadata.source as string || 'message',
      sourceType: 'message' as const,
      title: metadata.channel as string || 'Message',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata,
      createdAt: new Date(metadata.timestamp as string || Date.now()),
      updatedAt: new Date(),
      accessCount: 0,
    }],
  },
};

export class KnowledgeEngine {
  private documents: Map<string, KnowledgeDocument>;
  private embeddings: Map<string, number[]>;
  private sourceHandlers: Record<SourceType, typeof SOURCE_HANDLERS[SourceType]>;
  private contextWindow: number;

  constructor(contextWindow = 3) {
    this.documents = new Map();
    this.embeddings = new Map();
    this.sourceHandlers = SOURCE_HANDLERS;
    this.contextWindow = contextWindow;
  }

  /**
   * Index a document
   */
  async indexDocument(
    content: string,
    metadata: Record<string, unknown>
  ): Promise<KnowledgeDocument> {
    const id = uuid();

    const document: KnowledgeDocument = {
      id,
      source: metadata.source as string || 'unknown',
      sourceType: (metadata.sourceType as SourceType) || 'document',
      title: metadata.title as string || 'Untitled',
      content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
    };

    // Generate embedding (simplified - in production use actual embedding model)
    document.embedding = this.generateEmbedding(content);

    // Store
    this.documents.set(id, document);
    this.embeddings.set(id, document.embedding);

    return document;
  }

  /**
   * Index from source
   */
  async indexFromSource(
    source: string,
    sourceType: SourceType,
    content: unknown,
    metadata: Record<string, unknown>
  ): Promise<KnowledgeDocument[]> {
    const handler = this.sourceHandlers[sourceType];
    if (!handler) throw new Error(`Unknown source type: ${sourceType}`);

    const documents = handler.transform(content, { ...metadata, source, sourceType });

    for (const doc of documents) {
      doc.embedding = this.generateEmbedding(doc.content);
      this.documents.set(doc.id, doc);
      this.embeddings.set(doc.id, doc.embedding);
    }

    return documents;
  }

  /**
   * Query knowledge base
   */
  async query(query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const queryEmbedding = this.generateEmbedding(query.text);
    const results: KnowledgeResult[] = [];

    // Calculate similarity scores
    for (const [id, doc] of this.documents) {
      if (!doc.embedding) continue;

      // Apply filters
      if (query.filters?.source && doc.source !== query.filters.source) continue;
      if (query.filters?.sourceType && doc.sourceType !== query.filters.sourceType) continue;
      if (query.filters?.dateRange) {
        const date = doc.createdAt.getTime();
        if (date < query.filters.dateRange.start.getTime() ||
            date > query.filters.dateRange.end.getTime()) continue;
      }
      if (query.filters?.tags?.length) {
        const docTags = doc.metadata.tags as string[] || [];
        if (!query.filters.tags.some((tag) => docTags.includes(tag))) continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

      if (similarity > 0.3) { // Threshold
        // Extract highlights
        const highlights = this.extractHighlights(doc.content, query.text);

        results.push({
          document: doc,
          relevance: similarity,
          highlights,
        });

        // Update access count
        doc.accessCount++;
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Limit results
    return results.slice(0, query.limit || 10);
  }

  /**
   * Build context pack for LLM
   */
  async buildContextPack(query: KnowledgeQuery): Promise<ContextPack> {
    const results = await this.query(query);

    // Get surrounding context for top results
    if (query.includeContext) {
      for (const result of results.slice(0, this.contextWindow)) {
        result.context = this.getContextAround(result.document, query.text);
      }
    }

    // Assemble context
    const assembledContext = this.assembleContext(results, query.text);

    // Get unique sources
    const sources = [...new Set(results.map((r) => r.document.source))];

    return {
      query: query.text,
      documents: results,
      assembledContext,
      sources,
      metadata: {
        resultCount: results.length,
        topRelevance: results[0]?.relevance || 0,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Generate simple embedding (simplified)
   * In production: use OpenAI embeddings, local models, or vector DB
   */
  private generateEmbedding(text: string): number[] {
    const dimension = 128;
    const embedding = new Array(dimension).fill(0);

    // Simple word frequency-based embedding
    const words = text.toLowerCase().split(/\W+/);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      const index = Math.abs(hash) % dimension;
      embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Extract matching highlights
   */
  private extractHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const queryWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);

    // Find sentences containing query words
    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (queryWords.some((word) => lowerSentence.includes(word))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 300) {
          highlights.push(trimmed);
        }
      }
    }

    return highlights.slice(0, 3);
  }

  /**
   * Get context around a document
   */
  private getContextAround(doc: KnowledgeDocument, query: string): string {
    // In production: fetch surrounding documents from same source
    // For now, return document content
    return doc.content;
  }

  /**
   * Assemble context from results
   */
  private assembleContext(results: KnowledgeResult[], query: string): string {
    const parts: string[] = [];

    parts.push(`Query: ${query}\n`);

    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const result = results[i];
      parts.push(`\n--- Source ${i + 1}: ${result.document.title} ---`);
      if (result.context) {
        parts.push(result.context);
      } else {
        parts.push(result.document.content.slice(0, 500) + '...');
      }
      if (result.highlights.length) {
        parts.push(`\nRelevant: ${result.highlights.join(' ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<KnowledgeDocument | null> {
    return this.documents.get(id) || null;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<boolean> {
    this.documents.delete(id);
    this.embeddings.delete(id);
    return true;
  }

  /**
   * Get knowledge statistics
   */
  getStats(): {
    totalDocuments: number;
    bySourceType: Record<SourceType, number>;
    avgAccessCount: number;
    totalSources: number;
  } {
    const bySourceType: Record<SourceType, number> = {
      pdf: 0, website: 0, crm: 0, faq: 0,
      document: 0, policy: 0, database: 0, email: 0, message: 0,
    };

    let totalAccess = 0;
    const sources = new Set<string>();

    for (const doc of this.documents.values()) {
      bySourceType[doc.sourceType]++;
      totalAccess += doc.accessCount;
      sources.add(doc.source);
    }

    return {
      totalDocuments: this.documents.size,
      bySourceType,
      avgAccessCount: this.documents.size ? totalAccess / this.documents.size : 0,
      totalSources: sources.size,
    };
  }
}

// Singleton export
export const knowledgeEngine = new KnowledgeEngine();

export default knowledgeEngine;
