/**
 * HOJAI RAG Service - Main Entry Point
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Production RAG Pipeline with hybrid search, re-ranking, and citations
 *
 * Features:
 * - Smart document chunking (fixed, sentence, paragraph, semantic strategies)
 * - Hybrid search (BM25 + Vector) with Reciprocal Rank Fusion
 * - Cross-encoder re-ranking for improved relevance
 * - Citation/Attribution engine for source tracking
 * - Query expansion for better retrieval
 * - Context building for LLM consumption
 */

import { SemanticChunker } from './chunker.js';
import { HybridSearch } from './hybridSearch.js';
import { CrossEncoderReranker } from './reranker.js';
import { CitationEngine } from './citationEngine.js';
import { QueryExpander } from './queryExpander.js';
import { ContextBuilder } from './contextBuilder.js';
import type {
  ChunkOptions,
  Chunk,
  Document,
  SearchResult,
  HybridSearchConfig,
  RerankedResult,
  Citation,
  CitationResult,
  ExpansionResult,
  ContextResult,
  LLMProvider,
} from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the RAG pipeline
 */
export interface RAGConfig {
  /** Vector store endpoint */
  vectorStoreUrl: string;
  /** Namespace for the vector store */
  namespace: string;
  /** Maximum number of tokens in context */
  maxContextTokens: number;
  /** Chunk options */
  chunkOptions: ChunkOptions;
  /** Hybrid search configuration */
  hybridSearchConfig: HybridSearchConfig;
  /** Embedding endpoint for query embedding */
  embeddingUrl: string;
  /** Cross-encoder model for re-ranking */
  rerankerModel?: string;
  /** RRF k parameter for fusion */
  rrfK?: number;
}

/**
 * RAG query request
 */
export interface RAGQuery {
  /** The user query */
  query: string;
  /** Number of results to return */
  topK?: number;
  /** Maximum context tokens (overrides config) */
  maxContextTokens?: number;
  /** Filter by metadata */
  filters?: Record<string, unknown>;
  /** Whether to include citations */
  includeCitations?: boolean;
  /** Whether to expand the query */
  expandQuery?: boolean;
}

/**
 * RAG response
 */
export interface RAGResponse {
  /** The generated answer */
  answer: string;
  /** Citations with source attribution */
  citations: Citation[];
  /** Unique sources */
  sources: string[];
  /** Metadata about the retrieval */
  metadata: {
    chunksRetrieved: number;
    contextTokens: number;
    queryExpansion: string[];
    reranked: boolean;
  };
}

/**
 * Vector Store interface
 */
export interface VectorStore {
  /**
   * Insert a vector with metadata
   */
  insert(embedding: number[], text: string, metadata: Record<string, unknown>): Promise<string>;
  /**
   * Search for similar vectors
   */
  search(embedding: number[], topK: number, namespace: string): Promise<Array<{
    id: string;
    text: string;
    metadata: Record<string, unknown>;
    score: number;
  }>>;
  /**
   * Delete vectors by filter
   */
  deleteByMetadata(filter: Record<string, unknown>): Promise<number>;
}

/**
 * BM25 Index interface
 */
export interface BM25Index {
  /**
   * Add documents to the index
   */
  index(documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>): Promise<void>;
  /**
   * Search the index
   */
  search(query: string, topK: number): Promise<Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
    score: number;
  }>>;
}

// ============================================================================
// Main RAG Pipeline
// ============================================================================

/**
 * Production RAG Pipeline
 *
 * Orchestrates the full retrieval-augmented generation pipeline:
 * 1. Query expansion (optional)
 * 2. Hybrid search (BM25 + Vector)
 * 3. Re-ranking with cross-encoder
 * 4. Context building
 * 5. LLM generation
 * 6. Citation generation
 */
export class ProductionRAG {
  private chunker: SemanticChunker;
  private hybridSearch: HybridSearch;
  private reranker: CrossEncoderReranker;
  private citationEngine: CitationEngine;
  private queryExpander: QueryExpander;
  private contextBuilder: ContextBuilder;
  private llmProvider: LLMProvider;
  private vectorStore: VectorStore;
  private bm25Index: BM25Index;
  private config: RAGConfig;

  constructor(
    config: RAGConfig,
    llmProvider: LLMProvider,
    vectorStore: VectorStore,
    bm25Index: BM25Index
  ) {
    this.config = config;
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.bm25Index = bm25Index;

    // Initialize components
    this.chunker = new SemanticChunker(config.embeddingUrl);
    this.hybridSearch = new HybridSearch(
      config.vectorStoreUrl,
      config.namespace,
      config.hybridSearchConfig
    );
    this.reranker = new CrossEncoderReranker(config.rerankerModel);
    this.citationEngine = new CitationEngine();
    this.queryExpander = new QueryExpander(llmProvider);
    this.contextBuilder = new ContextBuilder(config.maxContextTokens);
  }

  /**
   * Process a RAG query and return a generated response
   *
   * @param request - RAG query request
   * @returns Generated response with citations
   */
  async query(request: RAGQuery): Promise<RAGResponse> {
    const topK = request.topK || 10;
    const maxTokens = request.maxContextTokens || this.config.maxContextTokens;

    // Step 1: Query expansion
    let expandedQueries: ExpansionResult | null = null;
    if (request.expandQuery !== false) {
      expandedQueries = await this.expandQueries(request.query);
    }

    // Step 2: Hybrid search
    const candidates = await this.performHybridSearch(
      expandedQueries ? expandedQueries.expandedQueries : [request.query],
      topK * 3 // Fetch more candidates for re-ranking
    );

    if (candidates.length === 0) {
      return this.emptyResponse(request.query);
    }

    // Step 3: Re-ranking
    const reranked = await this.reranker.rerank(
      request.query,
      candidates,
      topK
    );

    // Step 4: Build context
    const context = this.contextBuilder.build(reranked, maxTokens);

    // Step 5: Generate answer
    const answer = await this.generateWithContext(request.query, context);

    // Step 6: Generate citations
    const citationResult = this.citationEngine.generateCitations(answer, reranked);

    return {
      answer: citationResult.formattedAnswer,
      citations: citationResult.citations,
      sources: citationResult.sources,
      metadata: {
        chunksRetrieved: reranked.length,
        contextTokens: context.tokenCount,
        queryExpansion: expandedQueries?.expandedQueries || [],
        reranked: true,
      },
    };
  }

  /**
   * Index documents into the RAG pipeline
   *
   * @param documents - Documents to index
   * @returns Number of chunks created
   */
  async indexDocuments(documents: Document[]): Promise<number> {
    let totalChunks = 0;

    for (const document of documents) {
      // Chunk the document
      const chunks = await this.chunker.chunk(document, this.config.chunkOptions);

      // Index chunks
      for (const chunk of chunks) {
        await this.vectorStore.insert(
          chunk.embedding,
          chunk.text,
          {
            ...chunk.metadata,
            documentId: document.id,
            chunkIndex: chunks.indexOf(chunk),
          }
        );
      }

      // Add to BM25 index
      await this.bm25Index.index(
        chunks.map((c, i) => ({
          id: c.id,
          text: c.text,
          metadata: { documentId: document.id, chunkIndex: i },
        }))
      );

      totalChunks += chunks.length;
    }

    return totalChunks;
  }

  /**
   * Expand queries using LLM
   */
  private async expandQueries(query: string): Promise<ExpansionResult> {
    return this.queryExpander.expand(query);
  }

  /**
   * Perform hybrid search with BM25 + Vector
   */
  private async performHybridSearch(
    queries: string[],
    topK: number
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    // Search with each expanded query
    for (const q of queries) {
      const results = await this.hybridSearch.search(q, topK);
      allResults.push(...results);
    }

    // Deduplicate by ID and re-score
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const result of allResults) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Generate answer using LLM with context
   */
  private async generateWithContext(
    query: string,
    context: ContextResult
  ): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant with access to the following context.
Answer the user's question based ONLY on the provided context.
If the context doesn't contain enough information to answer, say so.

IMPORTANT: Cite your sources using [chunk_id] notation when referencing specific information.`;

    const userMessage = `Context:
${context.content}

Question: ${query}

Answer:`;

    const response = await this.llmProvider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    return response;
  }

  /**
   * Return empty response when no results found
   */
  private emptyResponse(query: string): RAGResponse {
    return {
      answer: `I couldn't find any relevant information to answer your question: "${query}".`,
      citations: [],
      sources: [],
      metadata: {
        chunksRetrieved: 0,
        contextTokens: 0,
        queryExpansion: [],
        reranked: false,
      },
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a default RAG configuration
 */
export function createDefaultConfig(): RAGConfig {
  return {
    vectorStoreUrl: process.env['VECTOR_STORE_URL'] || 'http://localhost:4721',
    namespace: process.env['RAG_NAMESPACE'] || 'default',
    maxContextTokens: 4000,
    chunkOptions: {
      strategy: 'semantic',
      chunkSize: 512,
      overlap: 50,
      minChunkSize: 100,
    },
    hybridSearchConfig: {
      rrfK: 60,
      vectorWeight: 0.5,
      bm25Weight: 0.5,
    },
    embeddingUrl: process.env['EMBEDDING_URL'] || 'http://localhost:4721',
    rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    rrfK: 60,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { SemanticChunker } from './chunker.js';
export { HybridSearch } from './hybridSearch.js';
export { CrossEncoderReranker } from './reranker.js';
export { CitationEngine } from './citationEngine.js';
export { QueryExpander } from './queryExpander.js';
export { ContextBuilder } from './contextBuilder.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-rag',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
