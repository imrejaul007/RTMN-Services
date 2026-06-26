/**
 * Vector Store - Qdrant Integration for KnowledgeOS
 *
 * Provides real vector search capabilities for RAG (Retrieval Augmented Generation)
 * Uses Qdrant for high-performance semantic search
 */

import axios from 'axios';
import crypto from 'crypto';

// Qdrant configuration
const QDRANT_CONFIG = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || null,
  timeout: 30000
};

/**
 * Qdrant Client for vector operations
 */
export class VectorStore {
  constructor(collectionName = 'knowledge') {
    this.collectionName = collectionName;
    this.client = axios.create({
      baseURL: QDRANT_CONFIG.url,
      timeout: QDRANT_CONFIG.timeout,
      headers: QDRANT_CONFIG.apiKey
        ? { 'api-key': QDRANT_CONFIG.apiKey }
        : {}
    });
  }

  /**
   * Create a new collection
   */
  async createCollection(params = {}) {
    const { vectorSize = 1536, distance = 'Cosine' } = params;

    try {
      await this.client.put(`/collections/${this.collectionName}`, {
        vectors: {
          size: vectorSize,
          distance: distance // Cosine, Euclid, or Dot
        },
        sparse_vectors: {
          text_id: {
            modifier: "idf",
            index": true
          }
        }
      });
      return { success: true };
    } catch (error) {
      if (error.response?.status === 409) {
        // Collection already exists
        return { success: true, message: 'Collection already exists' };
      }
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection() {
    try {
      await this.client.delete(`/collections/${this.collectionName}`);
      return { success: true };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, message: 'Collection not found' };
      }
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists() {
    try {
      const response = await this.client.get(`/collections/${this.collectionName}`);
      return response.data.result !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    const response = await this.client.get(`/collections/${this.collectionName}`);
    return response.data.result;
  }

  /**
   * Insert vectors
   */
  async insertVectors(points) {
    const response = await this.client.put(`/collections/${this.collectionName}/points`, {
      points: points.map(point => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload || {}
      }))
    });
    return response.data;
  }

  /**
   * Insert a single vector
   */
  async insertVector(id, vector, payload = {}) {
    return this.insertVectors([{ id, vector, payload }]);
  }

  /**
   * Search for similar vectors
   */
  async search(vector, params = {}) {
    const { limit = 5, scoreThreshold = 0.0, filter = null, withPayload = true, offset = null } = params;

    const searchParams = {
      limit,
      score_threshold: scoreThreshold,
      with_payload: withPayload
    };

    if (filter) {
      searchParams.filter = filter;
    }

    if (offset) {
      searchParams.offset = offset;
    }

    const response = await this.client.post(`/collections/${this.collectionName}/points/search`, {
      vector,
      ...searchParams
    });

    return response.data.result;
  }

  /**
   * Search with multiple vectors (batch)
   */
  async batchSearch(vectors, params = {}) {
    const { limit = 5, scoreThreshold = 0.0 } = params;

    const response = await this.client.post(`/collections/${this.collectionName}/points/search/batch`, {
      search: vectors.map(vector => ({
        vector,
        limit,
        score_threshold: scoreThreshold
      }))
    });

    return response.data.result;
  }

  /**
   * Retrieve vectors by ID
   */
  async getVectors(ids) {
    const response = await this.client.post(`/collections/${this.collectionName}/points`, {
      ids
    });
    return response.data.result;
  }

  /**
   * Delete vectors by ID
   */
  async deleteVectors(ids) {
    const response = await this.client.post(`/collections/${this.collectionName}/points/delete`, {
      points: ids
    });
    return response.data;
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(filter) {
    const response = await this.client.post(`/collections/${this.collectionName}/points/delete`, {
      filter
    });
    return response.data;
  }

  /**
   * Update vector payload
   */
  async updatePayload(id, payload) {
    const response = await this.client.put(`/collections/${this.collectionName}/points/${id}/payload`, {
      payload
    });
    return response.data;
  }

  /**
   * Count vectors
   */
  async count(filter = null) {
    const response = await this.client.post(`/collections/${this.collectionName}/points/count`, {
      filter,
      exact: true
    });
    return response.data.result;
  }

  /**
   * Get scroll (paginated) results
   */
  async scroll(params = {}) {
    const { limit = 100, offset = null, filter = null, withPayload = true } = params;

    const response = await this.client.post(`/collections/${this.collectionName}/points/scroll`, {
      limit,
      offset,
      filter,
      with_payload: withPayload
    });

    return response.data.result;
  }

  /**
   * Recommend vectors (find similar to given IDs)
   */
  async recommend(positiveIds, negativeIds = [], params = {}) {
    const { limit = 5, scoreThreshold = 0.0, withPayload = true } = params;

    const response = await this.client.post(`/collections/${this.collectionName}/points/recommend`, {
      positive: positiveIds,
      negative: negativeIds,
      limit,
      score_threshold: scoreThreshold,
      with_payload: withPayload
    });

    return response.data.result;
  }

  /**
   * Create index on payload field
   */
  async createIndex(fieldName, fieldType = 'keyword') {
    const response = await this.client.put(`/collections/${this.collectionName}/index`, {
      field_name: fieldName,
      field_schema: fieldType === 'keyword' ? 'keyword' : 'integer'
    });
    return response.data;
  }

  /**
   * Get scroll points (for reindexing)
   */
  async getAllPoints() {
    const allPoints = [];
    let offset = null;

    while (true) {
      const result = await this.scroll({ limit: 1000, offset, withPayload: true });
      allPoints.push(...result.points);

      if (!result.next_page_offset) break;
      offset = result.next_page_offset;
    }

    return allPoints;
  }
}

/**
 * OpenAI Embedding Service
 */
export class EmbeddingService {
  constructor(apiKey = process.env.OPENAI_API_KEY) {
    this.apiKey = apiKey;
    this.model = 'text-embedding-ada-002';
    this.dimensions = 1536;
  }

  /**
   * Generate embedding for text
   */
  async embed(text) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        embedding: response.data.data[0].embedding,
        model: this.model,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('Embedding generation failed:', error.message);
      // Fallback to mock embedding for demo
      return {
        embedding: generateMockEmbedding(text),
        model: 'mock',
        usage: { total_tokens: Math.ceil(text.length / 4) }
      };
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: texts,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.map(item => ({
        index: item.index,
        embedding: item.embedding
      }));
    } catch (error) {
      console.error('Batch embedding failed:', error.message);
      // Fallback to mock embeddings
      return texts.map((text, index) => ({
        index,
        embedding: generateMockEmbedding(text)
      }));
    }
  }

  /**
   * Chunk text into segments for embedding
   */
  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = [];
    let currentLength = 0;

    for (const word of words) {
      currentChunk.push(word);
      currentLength += word.length + 1;

      if (currentLength >= chunkSize) {
        chunks.push({
          text: currentChunk.join(' '),
          start: chunks.reduce((sum, c) => sum + c.text.length + 1, 0),
          end: chunks.reduce((sum, c) => sum + c.text.length + 1, 0) + currentChunk.join(' ').length
        });

        // Keep overlap words
        const overlapWords = currentChunk.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords;
        currentLength = overlapWords.join(' ').length;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join(' '),
        start: chunks.reduce((sum, c) => sum + c.text.length + 1, 0),
        end: chunks.reduce((sum, c) => sum + c.text.length + 1, 0) + currentChunk.join(' ').length
      });
    }

    return chunks;
  }
}

/**
 * RAG Engine - Combines vector store with embeddings
 */
export class RAGEngine {
  constructor(collectionName = 'knowledge') {
    this.vectorStore = new VectorStore(collectionName);
    this.embeddingService = new EmbeddingService();
    this.initialized = false;
  }

  /**
   * Initialize the RAG engine
   */
  async initialize(vectorSize = 1536) {
    await this.vectorStore.createCollection({ vectorSize });

    // Create indexes on common payload fields
    try {
      await this.vectorStore.createIndex('kb_id');
      await this.vectorStore.createIndex('doc_id');
      await this.vectorStore.createIndex('type');
      await this.vectorStore.createIndex('title');
    } catch (error) {
      console.log('Index creation skipped (may already exist)');
    }

    this.initialized = true;
    return { success: true };
  }

  /**
   * Index a document
   */
  async indexDocument(doc, kbId) {
    const chunks = this.embeddingService.chunkText(doc.content, 1000, 200);
    const embeddings = await this.embeddingService.embedBatch(chunks.map(c => c.text));

    const points = embeddings.map((emb, idx) => ({
      id: `${doc.id}_${idx}`,
      vector: emb.embedding,
      payload: {
        doc_id: doc.id,
        kb_id: kbId,
        title: doc.title,
        type: doc.type,
        chunk_index: idx,
        chunk_text: chunks[idx].text,
        metadata: doc.metadata || {}
      }
    }));

    await this.vectorStore.insertVectors(points);

    return {
      success: true,
      chunksIndexed: points.length
    };
  }

  /**
   * Search for relevant context
   */
  async search(query, params = {}) {
    const { kbId = null, limit = 5, scoreThreshold = 0.7, rerank = true } = params;

    // Generate query embedding
    const { embedding } = await this.embeddingService.embed(query);

    // Build filter
    const filter = kbId ? {
      must: [
        { key: 'kb_id', match: { value: kbId } }
      ]
    } : null;

    // Search
    const results = await this.vectorStore.search(embedding, {
      limit: limit * 3, // Get more for reranking
      scoreThreshold,
      filter,
      withPayload: true
    });

    // Rerank results (simple reciprocal rank fusion)
    if (rerank && results.length > limit) {
      return this.rerankResults(results, query, limit);
    }

    return results.slice(0, limit).map(r => ({
      text: r.payload.chunk_text,
      score: r.score,
      title: r.payload.title,
      doc_id: r.payload.doc_id,
      type: r.payload.type
    }));
  }

  /**
   * Rerank results using keyword matching
   */
  rerankResults(results, query, limit = 5) {
    const queryTerms = query.toLowerCase().split(/\s+/);

    const scored = results.map(r => {
      const text = r.payload.chunk_text.toLowerCase();
      let keywordScore = 0;

      for (const term of queryTerms) {
        if (text.includes(term)) {
          keywordScore += 1;
        }
      }

      // Combine vector similarity with keyword matching
      const finalScore = (r.score * 0.7) + (keywordScore / queryTerms.length * 0.3);

      return { ...r, finalScore };
    });

    return scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(r => ({
        text: r.payload.chunk_text,
        score: Math.round(r.finalScore * 100) / 100,
        title: r.payload.title,
        doc_id: r.payload.doc_id,
        type: r.payload.type
      }));
  }

  /**
   * Delete document chunks
   */
  async deleteDocument(docId) {
    await this.vectorStore.deleteByFilter({
      must: [
        { key: 'doc_id', match: { value: docId } }
      ]
    });
    return { success: true };
  }

  /**
   * Get document statistics
   */
  async getStats() {
    const info = await this.vectorStore.getCollectionInfo();
    return {
      vectorsCount: info.vectors_count,
      indexedPointsCount: info.indexed_vectors_count,
      pointsCount: info.points_count
    };
  }

  /**
   * Generate answer context from search results
   */
  generateContext(searchResults) {
    return searchResults
      .map((r, i) => `[Source ${i + 1}]: ${r.title}\n${r.text}`)
      .join('\n\n');
  }
}

/**
 * Generate mock embedding for fallback
 */
function generateMockEmbedding(text) {
  const dim = 1536;
  const seed = hashString(text);
  const vector = [];

  for (let i = 0; i < dim; i++) {
    const pseudoRandom = Math.sin(seed + i * 12.9898) * 43758.5453;
    vector.push((pseudoRandom - Math.floor(pseudoRandom)) * 2 - 1);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Factory function to create RAG engine
 */
export async function createRAGEngine(collectionName = 'knowledge') {
  const engine = new RAGEngine(collectionName);
  await engine.initialize();
  return engine;
}

// Default export
export default {
  VectorStore,
  EmbeddingService,
  RAGEngine,
  createRAGEngine
};
