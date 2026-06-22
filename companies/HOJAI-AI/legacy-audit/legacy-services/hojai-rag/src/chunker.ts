/**
 * Smart Document Chunker
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Implements multiple chunking strategies:
 * - Fixed: Split by character count
 * - Sentence: Split by sentence boundaries
 * - Paragraph: Split by paragraph boundaries
 * - Semantic: Split by semantic similarity
 */

import type {
  Document,
  Chunk,
  ChunkOptions,
  ChunkMetadata,
  ChunkStrategy,
} from './types.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types.js';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Handle common abbreviations to avoid false splits
  const abbrevs = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Inc.', 'Ltd.', 'Corp.'];
  let processed = text;

  for (const abbrev of abbrevs) {
    processed = processed.replace(new RegExp(abbrev.replace('.', '\\.'), 'g'), abbrev.replace('.', '<<<DOT>>>'));
  }

  // Split on sentence-ending punctuation followed by whitespace and capital letter
  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.replace(/<<<DOT>>>/g, '.').trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Calculate approximate token count (rough estimate: 4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Semantic Chunker
// ============================================================================

/**
 * Semantic chunker using sentence embeddings
 *
 * Chunks text based on semantic similarity between sentences.
 * Creates boundaries where similarity drops significantly.
 */
export class SemanticChunker {
  private embeddingUrl: string;
  private retryConfig: RetryConfig;

  constructor(embeddingUrl: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.embeddingUrl = embeddingUrl;
    this.retryConfig = retryConfig;
  }

  /**
   * Chunk a document using semantic boundaries
   *
   * @param document - Document to chunk
   * @param options - Chunking options
   * @returns Array of chunks
   */
  async chunk(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    switch (options.strategy) {
      case 'fixed':
        return this.chunkFixed(document, options);
      case 'sentence':
        return this.chunkBySentence(document, options);
      case 'paragraph':
        return this.chunkByParagraph(document, options);
      case 'semantic':
        return this.chunkSemantic(document, options);
      default:
        return this.chunkSemantic(document, options);
    }
  }

  /**
   * Fixed-size chunking
   */
  private async chunkFixed(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    const text = document.text;
    const chunks: Chunk[] = [];
    const { chunkSize, overlap, minChunkSize } = options;

    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      const endPosition = Math.min(position + chunkSize, text.length);
      let chunkText = text.slice(position, endPosition);

      // Try to break at word boundary if we're not at the end
      if (endPosition < text.length) {
        const lastSpace = chunkText.lastIndexOf(' ');
        if (lastSpace > chunkSize / 2) {
          chunkText = chunkText.slice(0, lastSpace);
        }
      }

      // Ensure minimum chunk size (except for last chunk)
      if (chunkText.length >= minChunkSize || position + chunkText.length >= text.length) {
        const metadata: ChunkMetadata = {
          documentId: document.id,
          startPosition: position,
          endPosition: position + chunkText.length,
          ...document.metadata,
        };

        const embedding = await this.embedText(chunkText);

        chunks.push({
          id: `chunk_${document.id}_${chunkIndex}`,
          text: chunkText,
          embedding,
          metadata,
        });

        chunkIndex++;
      }

      // Move position with overlap
      position += chunkText.length - overlap;
      if (position < 0) position = 0;
    }

    return chunks;
  }

  /**
   * Sentence-based chunking
   */
  private async chunkBySentence(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    const sentences = splitIntoSentences(document.text);
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let startPosition = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceLength = sentence.length;

      // If adding this sentence exceeds chunk size and we have content
      if (currentLength + sentenceLength > options.chunkSize && currentChunk.length > 0) {
        // Check if we should wait for more or emit current chunk
        if (currentLength >= options.minChunkSize) {
          const chunkText = currentChunk.join(' ');
          const metadata: ChunkMetadata = {
            documentId: document.id,
            startPosition,
            endPosition: startPosition + chunkText.length,
            ...document.metadata,
          };

          const embedding = await this.embedText(chunkText);

          chunks.push({
            id: `chunk_${document.id}_${chunkIndex}`,
            text: chunkText,
            embedding,
            metadata,
          });

          chunkIndex++;
          startPosition = startPosition + chunkText.length - options.overlap;
          currentChunk = [];
          currentLength = 0;
        }
      }

      currentChunk.push(sentence);
      currentLength += sentenceLength + 1; // +1 for space
    }

    // Handle remaining content
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      if (chunkText.length >= options.minChunkSize || chunks.length === 0) {
        const metadata: ChunkMetadata = {
          documentId: document.id,
          startPosition,
          endPosition: startPosition + chunkText.length,
          ...document.metadata,
        };

        const embedding = await this.embedText(chunkText);

        chunks.push({
          id: `chunk_${document.id}_${chunkIndex}`,
          text: chunkText,
          embedding,
          metadata,
        });
      }
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking
   */
  private async chunkByParagraph(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    const paragraphs = splitIntoParagraphs(document.text);
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    let startPosition = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If paragraph itself is larger than chunk size, split it
      if (paragraph.length > options.chunkSize) {
        const subChunks = await this.chunkFixed(
          { id: document.id, text: paragraph, metadata: document.metadata },
          options
        );

        for (const subChunk of subChunks) {
          subChunk.id = `chunk_${document.id}_${chunkIndex}`;
          subChunk.metadata.startPosition = startPosition;
          chunks.push(subChunk);
          chunkIndex++;
        }

        startPosition += paragraph.length + 2;
        currentChunk = [];
        currentLength = 0;
        continue;
      }

      // If adding this paragraph exceeds chunk size
      if (currentLength + paragraph.length > options.chunkSize && currentChunk.length > 0) {
        if (currentLength >= options.minChunkSize) {
          const chunkText = currentChunk.join('\n\n');
          const metadata: ChunkMetadata = {
            documentId: document.id,
            startPosition,
            endPosition: startPosition + chunkText.length,
            ...document.metadata,
          };

          const embedding = await this.embedText(chunkText);

          chunks.push({
            id: `chunk_${document.id}_${chunkIndex}`,
            text: chunkText,
            embedding,
            metadata,
          });

          chunkIndex++;
          startPosition = startPosition + chunkText.length - options.overlap;
          currentChunk = [];
          currentLength = 0;
        }
      }

      currentChunk.push(paragraph);
      currentLength += paragraph.length + 2; // +2 for \n\n
    }

    // Handle remaining content
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n\n');
      const metadata: ChunkMetadata = {
        documentId: document.id,
        startPosition,
        endPosition: startPosition + chunkText.length,
        ...document.metadata,
      };

      const embedding = await this.embedText(chunkText);

      chunks.push({
        id: `chunk_${document.id}_${chunkIndex}`,
        text: chunkText,
        embedding,
        metadata,
      });
    }

    return chunks;
  }

  /**
   * Semantic chunking using sentence embeddings
   *
   * Groups sentences based on semantic similarity.
   * Creates boundaries where similarity drops below threshold.
   */
  private async chunkSemantic(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    const sentences = splitIntoSentences(document.text);

    if (sentences.length === 0) {
      return [];
    }

    // Get embeddings for all sentences
    const embeddings = await this.embedBatch(sentences);

    // Group sentences into chunks based on semantic similarity
    const chunks: Chunk[] = [];
    let currentChunk: string[] = [];
    let currentEmbeddings: number[][] = [];
    let currentLength = 0;
    let startPosition = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const embedding = embeddings[i];
      const sentenceLength = sentence.length;

      // Check if adding this sentence exceeds chunk size
      if (currentLength + sentenceLength > options.chunkSize && currentChunk.length > 0) {
        // Check semantic boundary
        if (this.shouldSplit(embeddings, i, currentChunk.length)) {
          // Emit current chunk
          const chunkText = currentChunk.join(' ');
          const metadata: ChunkMetadata = {
            documentId: document.id,
            startPosition,
            endPosition: startPosition + chunkText.length,
            ...document.metadata,
          };

          const avgEmbedding = this.averageEmbedding(currentEmbeddings);

          chunks.push({
            id: `chunk_${document.id}_${chunkIndex}`,
            text: chunkText,
            embedding: avgEmbedding,
            metadata,
          });

          chunkIndex++;
          startPosition = startPosition + chunkText.length - options.overlap;
          currentChunk = [];
          currentEmbeddings = [];
          currentLength = 0;
        }
      }

      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentEmbeddings.push(embedding);
      currentLength += sentenceLength + 1;

      // If chunk is too big, force split
      if (currentLength > options.chunkSize * 1.5 && currentChunk.length > 1) {
        const chunkText = currentChunk.join(' ');
        const metadata: ChunkMetadata = {
          documentId: document.id,
          startPosition,
          endPosition: startPosition + chunkText.length,
          ...document.metadata,
        };

        const avgEmbedding = this.averageEmbedding(currentEmbeddings);

        chunks.push({
          id: `chunk_${document.id}_${chunkIndex}`,
          text: chunkText,
          embedding: avgEmbedding,
          metadata,
        });

        chunkIndex++;
        startPosition = startPosition + chunkText.length - options.overlap;
        currentChunk = [];
        currentEmbeddings = [];
        currentLength = 0;
      }
    }

    // Handle remaining content
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      if (chunkText.length >= options.minChunkSize || chunks.length === 0) {
        const metadata: ChunkMetadata = {
          documentId: document.id,
          startPosition,
          endPosition: startPosition + chunkText.length,
          ...document.metadata,
        };

        const avgEmbedding = this.averageEmbedding(currentEmbeddings);

        chunks.push({
          id: `chunk_${document.id}_${chunkIndex}`,
          text: chunkText,
          embedding: avgEmbedding,
          metadata,
        });
      }
    }

    return chunks;
  }

  /**
   * Determine if we should split at the current position based on semantic similarity
   */
  private shouldSplit(embeddings: number[][], currentIndex: number, chunkLength: number): boolean {
    if (chunkLength < 2 || currentIndex < 2) return false;

    const prevIndex = currentIndex - 1;
    const prevPrevIndex = currentIndex - 2;

    if (prevPrevIndex < 0) return false;

    const prevSim = cosineSimilarity(embeddings[prevPrevIndex], embeddings[prevIndex]);
    const currSim = cosineSimilarity(embeddings[prevIndex], embeddings[currentIndex]);

    // Split if similarity drops by more than 30%
    const threshold = 0.7;
    return currSim < prevSim * threshold;
  }

  /**
   * Calculate average embedding for a chunk
   */
  private averageEmbedding(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0];

    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += embedding[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      avg[i] /= embeddings.length;
    }

    return avg;
  }

  /**
   * Embed a single text
   */
  private async embedText(text: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.embeddingUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`Embedding request failed: ${response.status}`);
        }

        const data = await response.json() as { embedding: number[] };
        return data.embedding;
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

    // Return mock embedding on failure
    console.warn(`Embedding failed after retries: ${lastError?.message}`);
    return new Array(1536).fill(0);
  }

  /**
   * Embed a batch of texts
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(text => this.embedText(text)));
      embeddings.push(...results);
    }

    return embeddings;
  }
}
