# HOJAI AI — FULL IMPLEMENTATION PLAN

**Version:** 1.0.0  
**Date:** June 2, 2026  
**Status:** PLANNING  
**Estimated Time:** 12-16 weeks (parallel execution)

---

## EXECUTIVE SUMMARY

### Current State
| Category | Current | Target |
|----------|---------|--------|
| Real LLM Providers | 2 (OpenAI, Claude) | 5+ (add Gemini, Llama, Mistral) |
| Real Vector DB | 0 (in-memory Map) | 1 (pgvector) |
| Real RAG | 0 (hash embeddings) | 1 (hybrid search) |
| AI Employees with AI | 0 | 20+ |
| Test Coverage | 0% | 80%+ |
| Database Persistence | 0 (in-memory) | 1 (MongoDB) |

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI AI - PHASE 1                            │
├─────────────────────────────────────────────────────────────────┤
│  AGENT 1: LLM Gateway + Vector DB                               │
│  ├── Gemini Provider (real)                                     │
│  ├── Llama Provider (real)                                      │
│  ├── Mistral Provider (real)                                     │
│  ├── Real pgvector integration                                   │
│  └── Model Router with fallback                                 │
├─────────────────────────────────────────────────────────────────┤
│  AGENT 2: Production RAG Pipeline                               │
│  ├── Hybrid Search (BM25 + Vector)                              │
│  ├── Re-ranking with Cross-Encoder                              │
│  ├── Citation/Attribution                                       │
│  ├── Query Expansion                                            │
│  └── Chunking Strategies                                        │
├─────────────────────────────────────────────────────────────────┤
│  AGENT 3: AI Employees → Real AI                                │
│  ├── executive-assistant (Claude)                               │
│  ├── sdr-agent (Claude)                                         │
│  ├── ai-support-agent (Claude)                                   │
│  ├── salon-growth-consultant (Claude)                           │
│  ├── restaurant-growth-consultant (Claude)                       │
│  └── Add tool definitions for all                               │
├─────────────────────────────────────────────────────────────────┤
│  AGENT 4: Enterprise Features                                   │
│  ├── Distributed Tracing (OpenTelemetry)                        │
│  ├── Compliance (GDPR, SOC2, HIPAA)                            │
│  ├── Trust/Reputation System                                   │
│  ├── Plugin Architecture                                        │
│  └── Alerting System                                           │
├─────────────────────────────────────────────────────────────────┤
│  AGENT 5: Quality & Infrastructure                             │
│  ├── Unit Tests (80% coverage)                                  │
│  ├── MongoDB Persistence                                        │
│  ├── Full TypeScript SDK                                        │
│  └── CI/CD Pipeline                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## AGENT 1: LLM GATEWAY + VECTOR DB

**Goal:** Add Gemini, Llama, Mistral providers + real pgvector

### Files to Modify/Create

```
hojai-ai/
├── hojai-llm/
│   └── providers/
│       ├── gemini.provider.ts      [CREATE]
│       ├── llama.provider.ts       [CREATE]
│       └── mistral.provider.ts     [CREATE]
├── hojai-vector/
│   └── pgvector-service/
│       ├── storage.service.ts      [REWRITE - real pgvector]
│       └── connection.ts           [CREATE]
└── hojai-core/hojai-ml/
    └── router.service.ts          [CREATE - model router]
```

### Implementation Details

#### 1. Gemini Provider (`gemini.provider.ts`)

```typescript
// API: https://generativelanguage.googleapis.com/v1beta/models
// Key Features:
// - Gemini Pro, Gemini Pro Vision, Gemini Ultra
// - Native multimodal (text, images, code)
// - 128K context window

interface GeminiConfig {
  apiKey: string;
  model: 'gemini-pro' | 'gemini-pro-vision' | 'gemini-ultra';
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta';
  maxOutputTokens: number;
  temperature: number;
}

class GeminiProvider implements LLMProvider {
  async chat(messages: Message[]): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: this.convertToGeminiFormat(messages),
        generationConfig: { maxOutputTokens, temperature }
      })
    });
    return this.parseResponse(response);
  }

  async embed(text: string): Promise<number[]> {
    // Use text-embedding-004 or newer
    const response = await fetch(`${this.baseUrl}/models/embedding-001:predict`, {...});
    return response.embedding.values;
  }
}
```

#### 2. Llama Provider (`llama.provider.ts`)

```typescript
// API: https://api.anthropic.com/v1/mistral or self-hosted
// Options:
// - Anthropic's Mistral via API
// - Ollama for local deployment
// - Replicate for cloud inference

interface LlamaConfig {
  apiKey: string;
  baseUrl: 'https://api.anthropic.com/v1' | 'http://localhost:11434';
  model: 'mistral-medium' | 'llama-3-70b' | 'codellama';
  streaming: boolean;
}

class LlamaProvider implements LLMProvider {
  async chat(messages: Message[]): Promise<LLMResponse> {
    // Use /v1/chat/completions (OpenAI-compatible API)
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages, stream: false })
    });
    return this.parseOpenAICompatible(response);
  }
}
```

#### 3. Mistral Provider (`mistral.provider.ts`)

```typescript
// API: https://api.mistral.ai/v1
// Key Features:
// - Mistral Small, Medium, Large
// - Excellent coding capabilities
// - Cost-effective

class MistralProvider implements LLMProvider {
  async chat(messages: Message[]): Promise<LLMResponse> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ model: 'mistral-large-latest', messages })
    });
    return this.parseOpenAICompatible(response);
  }
}
```

#### 4. Real pgvector Storage (`storage.service.ts`)

```typescript
// Replace in-memory Map with real PostgreSQL + pgvector

import { Pool } from 'pg';

class PGVectorStore {
  private pool: Pool;

  async initialize() {
    this.pool = new Pool({
      connectionString: process.env.PGVECTOR_CONNECTION_STRING,
    });

    // Enable pgvector extension
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create table with vector column
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        namespace TEXT NOT NULL,
        document_id TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(1536),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_embeddings_namespace 
        ON embeddings(namespace);
      CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
        ON embeddings USING ivfflat(embedding vector_cosine_ops);
    `);
  }

  async insert(embedding: number[], text: string, metadata: object) {
    await this.pool.query(`
      INSERT INTO embeddings (namespace, chunk_text, embedding, metadata)
      VALUES ($1, $2, $3, $4)
    `, [namespace, text, embedding, JSON.stringify(metadata)]);
  }

  async search(queryEmbedding: number[], topK: number, namespace: string) {
    const result = await this.pool.query(`
      SELECT id, chunk_text, metadata,
             1 - (embedding <=> $1) as similarity
      FROM embeddings
      WHERE namespace = $2
      ORDER BY embedding <=> $1
      LIMIT $3
    `, [queryEmbedding, namespace, topK]);
    return result.rows;
  }

  // Hybrid search: combine BM25 + vector
  async hybridSearch(query: string, queryEmbedding: number[], topK: number) {
    // BM25 via PostgreSQL full-text search
    const bm25Results = await this.pool.query(`
      SELECT id, chunk_text, metadata,
             ts_rank(to_tsvector('english', chunk_text), query) as bm25_score
      FROM embeddings, to_tsquery('english', $1) query
      WHERE to_tsvector('english', chunk_text) @@ query
      LIMIT $2
    `, [query, topK]);

    // Vector search
    const vectorResults = await this.search(queryEmbedding, topK, namespace);

    // Combine scores with RRF (Reciprocal Rank Fusion)
    return this.rrfFusion(bm25Results, vectorResults, k: 60);
  }

  private rrfFusion(results1, results2, k = 60) {
    const scores = new Map();
    results1.forEach((r, i) => scores.set(r.id, 1 / (k + i)));
    results2.forEach((r, i) => scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i)));
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);
  }
}
```

#### 5. Model Router (`router.service.ts`)

```typescript
interface RoutingRule {
  intent: 'chat' | 'code' | 'creative' | 'reasoning' | 'fast';
  model: string;
  fallback?: string;
  maxCost?: number;
}

class ModelRouter {
  private rules: RoutingRule[] = [
    { intent: 'fast', model: 'gemini-pro', fallback: 'gpt-3.5-turbo' },
    { intent: 'reasoning', model: 'claude-opus-4', fallback: 'gemini-pro' },
    { intent: 'code', model: 'claude-sonnet-4', fallback: 'gpt-4-turbo' },
    { intent: 'creative', model: 'gpt-4-turbo', fallback: 'claude-opus-4' },
    { intent: 'chat', model: 'gemini-pro', fallback: 'claude-haiku-3' },
  ];

  async route(intent: string, messages: Message[], context: Context) {
    const rule = this.rules.find(r => r.intent === intent) || this.rules[0];
    const model = this.selectModel(rule.model, context);

    try {
      return await this.callModel(model, messages);
    } catch (error) {
      if (rule.fallback && error.status === 429) {
        return await this.callModel(rule.fallback, messages);
      }
      throw error;
    }
  }

  private selectModel(preferred: string, context: Context): string {
    // Check token budget
    if (context.remainingBudget < 0.01) return 'gpt-3.5-turbo';
    // Check latency requirements
    if (context.latencyBudget < 1000) return 'gemini-pro';
    return preferred;
  }
}
```

### Deliverables

| File | Lines | Status |
|------|-------|--------|
| `gemini.provider.ts` | ~300 | NEW |
| `llama.provider.ts` | ~280 | NEW |
| `mistral.provider.ts` | ~250 | NEW |
| `storage.service.ts` (pgvector) | ~400 | REWRITE |
| `connection.ts` | ~100 | NEW |
| `router.service.ts` | ~200 | NEW |

**Total: ~1,530 lines of real code**

---

## AGENT 2: PRODUCTION RAG PIPELINE

**Goal:** Build real RAG with hybrid search, re-ranking, citations

### Files to Create

```
hojai-ai/
├── hojai-rag/                          [NEW DIRECTORY]
│   ├── src/
│   │   ├── index.ts                   # Main RAG service
│   │   ├── chunker.ts                 # Smart chunking
│   │   ├── hybridSearch.ts            # BM25 + Vector
│   │   ├── reranker.ts                # Cross-encoder re-ranking
│   │   ├── citationEngine.ts           # Source attribution
│   │   ├── queryExpander.ts           # Query expansion
│   │   ├── contextBuilder.ts          # Build context
│   │   └── generators/
│   │       ├── simple.ts              # Simple RAG
│   │       ├── conversational.ts       # Conversational RAG
│   │       └── multiHop.ts            # Multi-hop reasoning
│   ├── tests/
│   │   ├── chunker.test.ts
│   │   ├── hybridSearch.test.ts
│   │   └── rag.test.ts
│   └── package.json
```

### Implementation Details

#### 1. Smart Chunker (`chunker.ts`)

```typescript
interface ChunkOptions {
  strategy: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
  chunkSize: number;
  overlap: number;
  minChunkSize: number;
}

class SemanticChunker {
  async chunk(document: Document, options: ChunkOptions): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    if (options.strategy === 'semantic') {
      // Use sentence embeddings to find semantic boundaries
      const sentences = this.splitIntoSentences(document.text);
      const embeddings = await this.embedBatch(sentences);

      // Find boundaries where semantic similarity drops
      let currentChunk = [];
      let currentEmbedding = [];

      for (let i = 0; i < sentences.length; i++) {
        currentChunk.push(sentences[i]);
        currentEmbedding.push(embeddings[i]);

        const chunkText = currentChunk.join(' ');
        if (chunkText.length >= options.chunkSize ||
            (currentChunk.length > 1 && this.similarityDrops(embeddings, i))) {
          chunks.push({
            id: `chunk_${document.id}_${chunks.length}`,
            text: chunkText,
            embedding: this.averageEmbedding(currentEmbedding),
            metadata: {
              documentId: document.id,
              startSentence: i - currentChunk.length + 1,
              endSentence: i,
            }
          });
          currentChunk = [];
          currentEmbedding = [];
        }
      }
    }

    return chunks;
  }

  private similarityDrops(embeddings: number[][], index: number): boolean {
    if (index < 2) return false;
    const prevSim = cosineSimilarity(embeddings[index-1], embeddings[index]);
    const currSim = cosineSimilarity(embeddings[index], embeddings[index+1]);
    return currSim < prevSim * 0.7; // 30% drop = boundary
  }
}
```

#### 2. Hybrid Search (`hybridSearch.ts`)

```typescript
class HybridSearch {
  constructor(
    private pgVector: PGVectorStore,
    private bm25: BM25Index
  ) {}

  async search(query: string, topK: number = 20): Promise<SearchResult[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embedQuery(query);

    // 2. Parallel BM25 and vector search
    const [bm25Results, vectorResults] = await Promise.all([
      this.bm25.search(query, topK * 2),
      this.pgVector.search(queryEmbedding, topK * 2, this.namespace)
    ]);

    // 3. Reciprocal Rank Fusion
    const fused = this.rrfFusion(bm25Results, vectorResults, topK);

    // 4. Fetch full documents for re-ranking
    const results = await this.fetchFullDocuments(fused);

    return results;
  }

  private rrfFusion(results1: Result[], results2: Result[], k = 60): Result[] {
    const scores = new Map<string, { result: Result; score: number }>();

    results1.forEach((r, i) => {
      scores.set(r.id, { result: r, score: 1 / (k + i) });
    });

    results2.forEach((r, i) => {
      const existing = scores.get(r.id);
      if (existing) {
        existing.score += 1 / (k + i);
      } else {
        scores.set(r.id, { result: r, score: 1 / (k + i) });
      }
    });

    return [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .map(s => s.result);
  }
}
```

#### 3. Cross-Encoder Re-ranker (`reranker.ts`)

```typescript
// Use a cross-encoder for better relevance scoring

class CrossEncoderReranker {
  // Use a pre-trained cross-encoder model
  // Options: cross-encoder/ms-marco-MiniLML-6-v2
  //          cross-encoder/ms-marco-MiniLML-12-v2

  private model: CrossEncoder;

  async rerank(query: string, candidates: SearchResult[], topK: number): Promise<RerankedResult[]> {
    const pairs = candidates.map(doc => [query, doc.text]);

    // Get relevance scores from cross-encoder
    const scores = await this.model.predict(pairs);

    // Combine with hybrid scores
    const reranked = candidates.map((doc, i) => ({
      ...doc,
      crossEncoderScore: scores[i],
      finalScore: doc.hybridScore * 0.4 + scores[i] * 0.6
    }));

    return reranked
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK);
  }
}
```

#### 4. Citation Engine (`citationEngine.ts`)

```typescript
class CitationEngine {
  generateCitations(answer: string, sourceChunks: Chunk[]): CitationResult {
    const citations: Citation[] = [];

    // Find which parts of the answer reference which chunks
    for (const chunk of sourceChunks) {
      // Check if key phrases from chunk appear in answer
      const keyPhrases = this.extractKeyPhrases(chunk.text);
      for (const phrase of keyPhrases) {
        if (answer.includes(phrase)) {
          citations.push({
            chunkId: chunk.id,
            text: phrase,
            source: chunk.metadata.source,
            page: chunk.metadata.page,
            startIndex: answer.indexOf(phrase),
            endIndex: answer.indexOf(phrase) + phrase.length,
            confidence: chunk.relevanceScore
          });
        }
      }
    }

    return {
      answer,
      citations: this.mergeOverlappingCitations(citations),
      sources: this.getUniqueSources(citations)
    };
  }

  formatWithInlineCitations(citationResult: CitationResult): string {
    let formatted = citationResult.answer;

    // Sort citations by position in text (reverse to preserve indices)
    const sortedCitations = citationResult.citations
      .sort((a, b) => b.startIndex - a.startIndex);

    for (const citation of sortedCitations) {
      const marker = `[${citation.chunkId}]`;
      formatted = formatted.slice(0, citation.endIndex) +
                  marker +
                  formatted.slice(citation.endIndex);
    }

    return formatted + '\n\n## Sources\n' +
      citationResult.sources.map(s => `- ${s}`).join('\n');
  }
}
```

#### 5. Main RAG Service (`index.ts`)

```typescript
class ProductionRAG {
  constructor(
    private chunker: SemanticChunker,
    private hybridSearch: HybridSearch,
    private reranker: CrossEncoderReranker,
    private citationEngine: CitationEngine,
    private llmProvider: LLMProvider
  ) {}

  async query(request: RAGQuery): Promise<RAGResponse> {
    // 1. Query expansion (add related terms)
    const expandedQuery = await this.expandQuery(request.query);

    // 2. Hybrid search
    const candidates = await this.hybridSearch.search(expandedQuery, 50);

    // 3. Re-rank
    const reranked = await this.reranker.rerank(
      request.query,
      candidates,
      request.topK || 10
    );

    // 4. Build context
    const context = this.buildContext(reranked, request.maxContextTokens);

    // 5. Generate answer with citation
    const answer = await this.generateWithContext(request.query, context);

    // 6. Add citations
    const withCitations = this.citationEngine.generateCitations(
      answer,
      reranked
    );

    return {
      answer: withCitations.answer,
      citations: withCitations.citations,
      sources: withCitations.sources,
      metadata: {
        chunksRetrieved: reranked.length,
        contextTokens: this.countTokens(context),
        model: this.llmProvider.model
      }
    };
  }

  private async expandQuery(query: string): Promise<string> {
    // Use LLM to generate related queries
    const response = await this.llmProvider.chat([{
      role: 'user',
      content: `Generate 3 alternative ways to ask this question: "${query}"
        Return only the alternative questions, one per line.`
    }]);

    const alternatives = response.content.split('\n').filter(Boolean);
    return `${query}\n${alternatives.join('\n')}`;
  }
}
```

### Deliverables

| File | Lines | Status |
|------|-------|--------|
| `index.ts` (RAG service) | ~200 | NEW |
| `chunker.ts` | ~300 | NEW |
| `hybridSearch.ts` | ~200 | NEW |
| `reranker.ts` | ~150 | NEW |
| `citationEngine.ts` | ~250 | NEW |
| `queryExpander.ts` | ~100 | NEW |
| `contextBuilder.ts` | ~100 | NEW |
| Tests (5 files) | ~500 | NEW |

**Total: ~1,800 lines of real code**

---

## AGENT 3: AI EMPLOYEES → REAL AI

**Goal:** Connect agents to Claude/OpenAI with tools and memory

### Files to Modify

```
hojai-ai/
├── employees/
│   ├── executive-assistant/
│   │   ├── src/
│   │   │   ├── index.ts              [REWRITE - real LLM]
│   │   │   ├── tools/
│   │   │   │   ├── calendar.ts       [NEW]
│   │   │   │   ├── email.ts          [NEW]
│   │   │   │   ├── tasks.ts          [NEW]
│   │   │   │   └── memory.ts         [NEW]
│   │   │   └── prompts/
│   │   │       └── assistant.md      [NEW]
│   ├── sdr-agent/
│   │   ├── src/
│   │   │   ├── index.ts              [REWRITE - real LLM]
│   │   │   ├── tools/
│   │   │   │   ├── crm.ts           [NEW]
│   │   │   │   ├── email.ts          [NEW]
│   │   │   │   └── research.ts       [NEW]
│   │   │   └── prompts/
│   │   │       └── sdr.md            [NEW]
│   ├── ai-support-agent/
│   │   ├── src/
│   │   │   ├── index.ts              [REWRITE]
│   │   │   ├── tools/
│   │   │   │   ├── knowledge.ts       [NEW]
│   │   │   │   ├── tickets.ts        [NEW]
│   │   │   │   └── escalation.ts     [NEW]
│   │   │   └── prompts/
│   │   │       └── support.md        [NEW]
│   ├── salon-growth-consultant/
│   │   ├── src/
│   │   │   ├── index.ts              [REWRITE]
│   │   │   ├── tools/
│   │   │   │   ├── analytics.ts      [NEW]
│   │   │   │   └── recommendations.ts [NEW]
│   │   │   └── prompts/
│   │   │       └── salon-advisor.md  [NEW]
```

### Implementation Details

#### 1. Agent Base Class

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<ToolResult>;
}

interface AgentConfig {
  name: string;
  description: string;
  llmProvider: LLMProvider;
  tools: Tool[];
  memoryStore: MemoryStore;
  systemPrompt: string;
}

class BaseAgent {
  private conversationHistory: Message[] = [];
  private toolResults: Map<string, ToolResult> = new Map();

  constructor(private config: AgentConfig) {
    this.conversationHistory.push({
      role: 'system',
      content: this.config.systemPrompt
    });
  }

  async chat(input: string): Promise<AgentResponse> {
    // 1. Add user message
    this.conversationHistory.push({ role: 'user', content: input });

    // 2. Get LLM response with tool definitions
    const response = await this.config.llmProvider.chat(this.conversationHistory, {
      tools: this.config.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })
    });

    // 3. Handle tool calls
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        const tool = this.config.tools.find(t => t.name === toolCall.name);
        if (tool) {
          const result = await tool.execute(toolCall.arguments);
          this.toolResults.set(toolCall.id, result);
          this.conversationHistory.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      }

      // 4. Get final response after tool execution
      const finalResponse = await this.config.llmProvider.chat(
        this.conversationHistory
      );

      // 5. Save to memory
      await this.config.memoryStore.add({
        type: 'conversation',
        user: input,
        assistant: finalResponse.content,
        toolsUsed: [...this.toolResults.keys()]
      });

      return { response: finalResponse.content, toolsUsed: [...this.toolResults.keys()] };
    }

    // No tools, return direct response
    return { response: response.content, toolsUsed: [] };
  }
}
```

#### 2. Executive Assistant Tools

```typescript
// tools/calendar.ts
const calendarTool: Tool = {
  name: 'create_event',
  description: 'Create a calendar event with title, time, duration, and attendees',
  parameters: z.object({
    title: z.string(),
    startTime: z.string().datetime(),
    duration: z.number().describe('Duration in minutes'),
    attendees: z.array(z.string().email()).optional(),
    location: z.string().optional(),
  }),

  async execute(params) {
    const event = await calendarService.createEvent({
      summary: params.title,
      start: { dateTime: params.startTime },
      end: { dateTime: addMinutes(params.startTime, params.duration) },
      attendees: params.attendees?.map(email => ({ email })),
      location: params.location,
    });
    return { success: true, eventId: event.id, event };
  }
};

// tools/email.ts
const emailTool: Tool = {
  name: 'send_email',
  description: 'Send an email to one or more recipients',
  parameters: z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string(),
    body: z.string(),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
  }),

  async execute(params) {
    const message = await emailService.send({
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      text: params.body,
      cc: params.cc,
      bcc: params.bcc,
    });
    return { success: true, messageId: message.id };
  }
};

// tools/tasks.ts
const taskTool: Tool = {
  name: 'create_task',
  description: 'Create a task with title, description, due date, and priority',
  parameters: z.object({
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    assignee: z.string().optional(),
    subtasks: z.array(z.object({
      title: z.string(),
      done: z.boolean().default(false)
    })).optional(),
  }),

  async execute(params) {
    const task = await taskService.create({
      title: params.title,
      description: params.description,
      dueDate: params.dueDate,
      priority: params.priority,
      assignee: params.assignee,
      subtasks: params.subtasks,
    });
    return { success: true, taskId: task.id, task };
  }
};

// tools/memory.ts
const memoryTool: Tool = {
  name: 'remember',
  description: 'Store or retrieve information from long-term memory',
  parameters: z.object({
    action: z.enum(['save', 'recall', 'search']),
    content: z.string().optional(),
    query: z.string().optional(),
    category: z.string().optional(),
  }),

  async execute(params) {
    if (params.action === 'save') {
      await memoryService.save({
        content: params.content,
        category: params.category,
        timestamp: new Date()
      });
      return { success: true, message: 'Saved to memory' };
    }

    if (params.action === 'recall') {
      const memories = await memoryService.recall(params.query, params.category);
      return { success: true, memories };
    }

    return { success: false, error: 'Invalid action' };
  }
};
```

#### 3. Executive Assistant System Prompt

```typescript
// prompts/assistant.md
const ASSISTANT_PROMPT = `You are an expert Executive Assistant named "Alex".

You have access to the following tools:
- create_event: Create calendar events with precise times and attendees
- send_email: Send professional emails with attachments
- create_task: Manage tasks with priorities and subtasks
- remember: Store and retrieve information from memory

Your personality:
- Professional and efficient
- Proactive in suggesting follow-ups
- Excellent at organizing complex schedules
- Remember previous conversations and context

When helping users:
1. Always confirm details before taking action
2. Suggest relevant follow-up actions
3. Maintain a calendar-aware perspective
4. Remember personal preferences and recurring items

Example interactions:
User: "Schedule a meeting with John tomorrow at 3pm"
Assistant: "I'll schedule that meeting for you. What should the meeting be about, and how long should I block?"
`;
```

#### 4. SDR Agent with Real AI

```typescript
// index.ts - Rewritten with real LLM
class SDRAgent extends BaseAgent {
  constructor() {
    const tools: Tool[] = [
      searchCompanyTool,
      findContactsTool,
      enrichLeadTool,
      sendOutreachTool,
      scheduleMeetingTool,
      updateCRMInstrument,
    ];

    super({
      name: 'SDR Agent',
      description: 'Finds and qualifies leads, sends outreach, schedules meetings',
      llmProvider: new ClaudeProvider({ model: 'claude-sonnet-4' }),
      tools,
      memoryStore: new MemoryStore('sdr-agent'),
      systemPrompt: SDR_PROMPT
    });
  }

  async qualifyLead(leadData: LeadData): Promise<QualificationResult> {
    // Use LLM to score lead
    const response = await this.llmProvider.chat([{
      role: 'user',
      content: `Score this lead:
        Company: ${leadData.company}
        Title: ${leadData.title}
        Industry: ${leadData.industry}
        Company Size: ${leadData.companySize}
        Budget Signals: ${leadData.budgetSignals}
        Authority: ${leadData.authority}

        Score 1-10 for: Need, Authority, Timeline, Money, Engagement`
    }]);

    return this.parseQualification(response);
  }

  async generateOutreach(lead: QualifiedLead, stage: 'first' | 'followup' | 'breakthrough'): Promise<OutreachContent> {
    const tone = stage === 'first' ? 'value-focused' :
                 stage === 'followup' ? 'persistent but helpful' : 'urgent';

    const response = await this.llmProvider.chat([{
      role: 'user',
      content: `Generate personalized outreach for:
        Lead: ${lead.name}, ${lead.title} at ${lead.company}
        Pain Point: ${lead.painPoint}
        Stage: ${stage}

        Tone: ${tone}
        Include: Personalization hook, value prop, clear CTA
        Length: Under 100 words for email, under 50 words for LinkedIn`
    }]);

    return this.parseOutreach(response);
  }
}
```

### Deliverables

| Agent | Files | Lines | Status |
|-------|-------|-------|--------|
| executive-assistant | index.ts + 4 tools + prompt | ~800 | REWRITE |
| sdr-agent | index.ts + 5 tools + prompt | ~900 | REWRITE |
| ai-support-agent | index.ts + 3 tools + prompt | ~600 | REWRITE |
| salon-growth-consultant | index.ts + 2 tools + prompt | ~500 | REWRITE |
| restaurant-growth-consultant | index.ts + 2 tools + prompt | ~500 | REWRITE |

**Total: ~3,300 lines of real AI code**

---

## AGENT 4: ENTERPRISE FEATURES

**Goal:** Add distributed tracing, compliance, trust system, plugins, alerting

### Files to Create

```
hojai-ai/
├── hojai-tracing/                    [NEW]
│   ├── src/
│   │   ├── index.ts                 # OpenTelemetry setup
│   │   ├── exporters/
│   │   │   ├── jaeger.ts
│   │   │   ├── zipkin.ts
│   │   │   └── console.ts
│   │   ├── instrumentation/
│   │   │   ├── express.ts
│   │   │   ├── llm.ts               # LLM-specific spans
│   │   │   ├── vector.ts
│   │   │   └── agent.ts
│   │   └── middleware.ts
│   └── package.json
│
├── hojai-compliance/                 [NEW]
│   ├── src/
│   │   ├── index.ts
│   │   ├── gdpr.ts                  # GDPR compliance
│   │   ├── hipaa.ts                 # HIPAA compliance
│   │   ├── soc2.ts                  # SOC2 controls
│   │   ├── consent.ts               # Consent management
│   │   └── auditLogger.ts
│   └── package.json
│
├── hojai-trust/                      [NEW]
│   ├── src/
│   │   ├── index.ts
│   │   ├── agentScore.ts             # Agent quality scoring
│   │   ├── userTrust.ts             # User trust levels
│   │   ├── fraudDetection.ts
│   │   └── reputationEngine.ts
│   └── package.json
│
├── hojai-plugins/                    [NEW]
│   ├── src/
│   │   ├── index.ts                 # Plugin system
│   │   ├── registry.ts
│   │   ├── sandbox.ts               # Secure execution
│   │   ├── hookSystem.ts
│   │   └── builtIn/
│   │       ├── slack.ts
│   │       ├── webhook.ts
│   │       └── analytics.ts
│   └── package.json
│
├── hojai-alerting/                   [NEW]
│   ├── src/
│   │   ├── index.ts
│   │   ├── rules.ts
│   │   ├── notifiers/
│   │   │   ├── slack.ts
│   │   │   ├── pagerduty.ts
│   │   │   └── email.ts
│   │   └── alertManager.ts
│   └── package.json
```

### Implementation Details

#### 1. Distributed Tracing (`hojai-tracing/src/index.ts`)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'hojai',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    'hojai.tenant.id': process.env.TENANT_ID,
  }),
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
    }),
  ],
});

// LLM-specific instrumentation
import { trace, SpanKind, SpanStatusCode, context } from '@opentelemetry/api';

export function createLLMSpan(params: {
  model: string;
  provider: string;
  inputTokens: number;
}) {
  return trace.getTracer('hojai-llm').startSpan('llm.request', {
    kind: SpanKind.CLIENT,
    attributes: {
      'llm.model': params.model,
      'llm.provider': params.provider,
      'llm.input_tokens': params.inputTokens,
    },
  });
}

export async function withLLMSpan<T>(
  params: LLMParams,
  fn: () => Promise<T>
): Promise<T> {
  const span = createLLMSpan(params);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);

    span.setAttributes({
      'llm.output_tokens': result.usage.output_tokens,
      'llm.latency_ms': Date.now() - startTime,
      'llm.cost': calculateCost(params.model, result.usage.total_tokens),
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

#### 2. GDPR Compliance (`hojai-compliance/src/gdpr.ts`)

```typescript
interface GDPRCompliance {
  // Right to access - user can request all their data
  exportUserData(userId: string): Promise<ExportPackage>;

  // Right to rectification - correct inaccurate data
  updateUserData(userId: string, corrections: DataCorrection[]): Promise<void>;

  // Right to erasure - "right to be forgotten"
  deleteUserData(userId: string, cascade: boolean): Promise<DeletionReceipt>;

  // Data portability - export in machine-readable format
  exportPortableData(userId: string): Promise<JSONLD | CSV>;

  // Consent management
  recordConsent(userId: string, consent: Consent): Promise<void>;
  withdrawConsent(userId: string, consentType: string): Promise<void>;
  getConsentStatus(userId: string): Promise<ConsentStatus[]>;
}

class GDPRService implements GDPRCompliance {
  async deleteUserData(userId: string, cascade: boolean): Promise<DeletionReceipt> {
    const receipt: DeletionReceipt = {
      userId,
      deletedAt: new Date(),
      itemsDeleted: [],
      itemsRetained: [],
    };

    // Delete from all services
    const services = [
      'user-service',
      'memory-service',
      'conversation-service',
      'agent-service',
    ];

    for (const service of services) {
      try {
        await this.callService(service, 'DELETE', `/users/${userId}`);
        receipt.itemsDeleted.push({ service, status: 'deleted' });
      } catch (error) {
        if (error.code === 'DATA_RETENTION_REQUIRED') {
          receipt.itemsRetained.push({ service, reason: error.message });
        }
      }
    }

    // Delete from vector databases
    await this.pgVectorStore.deleteByMetadata({ userId });
    await this.embeddingsStore.deleteByMetadata({ userId });

    // Log deletion for audit
    await this.auditLog.record({
      action: 'GDPR_DELETE',
      userId,
      timestamp: new Date(),
      itemsDeleted: receipt.itemsDeleted.length,
      itemsRetained: receipt.itemsRetained.length,
    });

    return receipt;
  }
}
```

#### 3. Trust System (`hojai-trust/src/agentScore.ts`)

```typescript
interface AgentScore {
  agentId: string;
  overall: number;                    // 0-100
  dimensions: {
    accuracy: number;                // Did it answer correctly?
    helpfulness: number;              // Was it useful?
    safety: number;                   // No harmful outputs?
    coherence: number;                // Logical and consistent?
    efficiency: number;               // Resolved quickly?
  };
  totalInteractions: number;
  period: '7d' | '30d' | 'all';
}

class AgentTrustEngine {
  async scoreAgent(agentId: string, period: '7d' | '30d' | 'all'): Promise<AgentScore> {
    const interactions = await this.getInteractions(agentId, period);

    // Calculate each dimension
    const [accuracy, helpfulness, safety, coherence, efficiency] = await Promise.all([
      this.calculateAccuracy(interactions),
      this.calculateHelpfulness(interactions),
      this.calculateSafety(interactions),
      this.calculateCoherence(interactions),
      this.calculateEfficiency(interactions),
    ]);

    // Weighted overall score
    const overall = (
      accuracy * 0.30 +
      helpfulness * 0.25 +
      safety * 0.20 +
      coherence * 0.15 +
      efficiency * 0.10
    );

    return {
      agentId,
      overall: Math.round(overall),
      dimensions: {
        accuracy: Math.round(accuracy),
        helpfulness: Math.round(helpfulness),
        safety: Math.round(safety),
        coherence: Math.round(coherence),
        efficiency: Math.round(efficiency),
      },
      totalInteractions: interactions.length,
      period,
    };
  }

  private async calculateAccuracy(interactions: Interaction[]): Promise<number> {
    // Use LLM to evaluate a sample of responses
    const sample = interactions.slice(0, 50);
    let correct = 0;

    for (const interaction of sample) {
      const evaluation = await this.llm.evaluate({
        task: interaction.query,
        expected: interaction.expectedAnswer,
        actual: interaction.actualAnswer,
      });

      if (evaluation.correct) correct++;
    }

    return (correct / sample.length) * 100;
  }

  private async calculateSafety(interactions: Interaction[]): Promise<number> {
    // Check for harmful content, hallucinations, PII leaks
    let safe = 0;

    for (const interaction of interactions) {
      const [harmfulContent, hasPII] = await Promise.all([
        this.contentFilter.check(interaction.actualAnswer),
        this.piiDetector.containsPII(interaction.actualAnswer),
      ]);

      if (!harmfulContent && !hasPII) safe++;
    }

    return (safe / interactions.length) * 100;
  }
}
```

#### 4. Plugin System (`hojai-plugins/src/index.ts`)

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  hooks: PluginHooks;
  permissions: Permission[];
  sandboxConfig?: SandboxConfig;
}

interface PluginHooks {
  beforeLLMCall?: (ctx: HookContext) => Promise<HookResult | void>;
  afterLLMCall?: (ctx: HookContext & { response: LLMResponse }) => Promise<HookResult | void>;
  beforeToolCall?: (ctx: HookContext & { tool: Tool }) => Promise<HookResult | void>;
  afterToolCall?: (ctx: HookContext & { result: ToolResult }) => Promise<HookResult | void>;
  onError?: (ctx: HookContext & { error: Error }) => Promise<void>;
}

class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();
  private sandbox: PluginSandbox;

  async loadPlugin(bundle: PluginBundle): Promise<Plugin> {
    // Validate plugin manifest
    const plugin = this.validateManifest(bundle);

    // Run in sandbox for security
    await this.sandbox.validate(plugin.code, plugin.sandboxConfig);

    // Register hooks
    this.plugins.set(plugin.id, plugin);
    this.registerHooks(plugin);

    return plugin;
  }

  async executeHooks<K extends keyof PluginHooks>(
    hookName: K,
    context: Parameters<NonNullable<PluginHooks[K]>>[0]
  ): Promise<HookResult[]> {
    const results: HookResult[] = [];

    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks[hookName];
      if (hook) {
        try {
          const result = await this.sandbox.execute(hook, context, plugin.id);
          results.push(result);
        } catch (error) {
          console.error(`Plugin ${plugin.id} hook ${hookName} failed:`, error);
        }
      }
    }

    return results;
  }
}

// Built-in Slack integration plugin
const slackPlugin: Plugin = {
  id: 'hojai-slack',
  name: 'Slack Integration',
  version: '1.0.0',
  hooks: {
    afterToolCall: async (ctx) => {
      if (ctx.tool.name === 'send_message' && ctx.tool.args.channel?.startsWith('#')) {
        await this.slackClient.chat.postMessage({
          channel: ctx.tool.args.channel,
          text: ctx.result.output,
        });
      }
    },
    onError: async (ctx) => {
      await this.slackClient.chat.postMessage({
        channel: '#alerts',
        text: `Error in ${ctx.agent}: ${ctx.error.message}`,
      });
    },
  },
};
```

#### 5. Alerting System (`hojai-alerting/src/index.ts`)

```typescript
interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  notificationChannels: ('slack' | 'email' | 'pagerduty')[];
  cooldownMinutes: number;
  lastTriggered?: Date;
}

interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'status';
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | 'anomaly';
  value: number;
  windowMinutes: number;
}

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private recentAlerts: Map<string, Date> = new Map();

  async createRule(rule: AlertRule): Promise<void> {
    this.rules.set(rule.id, rule);
  }

  async evaluate(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const metrics = await this.collectMetrics();

    for (const rule of this.rules.values()) {
      // Check cooldown
      const lastTriggered = this.recentAlerts.get(rule.id);
      if (lastTriggered && Date.now() - lastTriggered.getTime() < rule.cooldownMinutes * 60 * 1000) {
        continue;
      }

      // Evaluate condition
      const triggered = await this.evaluateCondition(rule.condition, metrics);

      if (triggered) {
        const alert: Alert = {
          id: `alert_${Date.now()}`,
          ruleId: rule.id,
          severity: rule.severity,
          message: `Alert: ${rule.name}`,
          triggeredAt: new Date(),
          metrics: metrics,
        };

        alerts.push(alert);
        this.recentAlerts.set(rule.id, new Date());

        // Send notifications
        await this.notify(alert, rule.notificationChannels);
      }
    }

    return alerts;
  }

  private async evaluateCondition(condition: AlertCondition, metrics: Metrics): Promise<boolean> {
    const value = metrics[condition.metric];

    if (condition.type === 'anomaly') {
      const { mean, std } = await this.getBaseline(condition.metric);
      const zScore = Math.abs((value - mean) / std);
      return zScore > condition.value; // z-score threshold
    }

    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      case '==': return value === condition.value;
      default: return false;
    }
  }
}
```

### Deliverables

| Component | Files | Lines | Status |
|-----------|-------|-------|--------|
| Distributed Tracing | 8 files | ~600 | NEW |
| Compliance (GDPR/HIPAA/SOC2) | 6 files | ~500 | NEW |
| Trust System | 5 files | ~400 | NEW |
| Plugin System | 5 files | ~350 | NEW |
| Alerting | 5 files | ~400 | NEW |

**Total: ~2,250 lines of real code**

---

## AGENT 5: QUALITY & INFRASTRUCTURE

**Goal:** Unit tests (80% coverage), MongoDB persistence, full SDK, CI/CD

### Files to Create

```
hojai-ai/
├── tests/                             [NEW - shared test infrastructure]
│   ├── setup.ts
│   ├── mocks/
│   │   ├── llmProvider.ts
│   │   ├── vectorStore.ts
│   │   └── database.ts
│   ├── helpers/
│   │   ├── generate.ts
│   │   └── assert.ts
│   └── fixtures/
│       ├── prompts.json
│       └── testData.ts
│
├── hojai-persistence/                 [NEW]
│   ├── src/
│   │   ├── index.ts                  # MongoDB connection manager
│   │   ├── repositories/
│   │   │   ├── agentRepository.ts
│   │   │   ├── memoryRepository.ts
│   │   │   ├── workflowRepository.ts
│   │   │   └── auditRepository.ts
│   │   └── migrations/
│   │       ├── 001_initial.ts
│   │       └── 002_add_indexes.ts
│   └── package.json
│
├── packages/hojai-sdk/                [EXPAND - complete SDK]
│   ├── src/
│   │   ├── index.ts
│   │   ├── client.ts                 # Main client
│   │   ├── agents.ts                 # Agent management
│   │   ├── memory.ts                 # Memory operations
│   │   ├── workflows.ts              # Workflow management
│   │   ├── llm.ts                    # LLM operations
│   │   ├── embeddings.ts             # Embeddings
│   │   ├── rag.ts                    # RAG operations
│   │   ├── compliance.ts             # Compliance APIs
│   │   ├── trust.ts                  # Trust scores
│   │   └── types.ts                  # All types
│   ├── tests/
│   │   ├── client.test.ts
│   │   ├── agents.test.ts
│   │   └── ...
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI pipeline
│       ├── test.yml                  # Test workflow
│       ├── deploy.yml                # Deploy workflow
│       └── release.yml               # Release workflow
```

### Implementation Details

#### 1. Test Infrastructure (`tests/setup.ts`)

```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  client = new MongoClient(uri);
  await client.connect();
  global.__MONGO_CLIENT__ = client;
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean collections before each test
  const db = client.db('test');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
});
```

#### 2. Mock LLM Provider (`tests/mocks/llmProvider.ts`)

```typescript
import { vi } from 'vitest';
import type { LLMProvider, Message, LLMResponse } from '../src/types';

export function createMockLLMProvider(overrides?: Partial<LLMProvider>): LLMProvider {
  const mockResponse: LLMResponse = {
    content: 'Mock response from LLM',
    usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    model: 'mock-gpt-4',
    finishReason: 'stop',
  };

  return {
    chat: vi.fn().mockResolvedValue(mockResponse),
    embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    classify: vi.fn().mockResolvedValue('positive'),
    ...overrides,
  };
}

export function createMockWithErrors(
  errors: Array<{ count: number; error: Error }>
): LLMProvider {
  let callCount = 0;
  return createMockLLMProvider({
    chat: vi.fn().mockImplementation(() => {
      callCount++;
      for (const { count, error } of errors) {
        if (callCount === count) throw error;
      }
      return Promise.resolve({
        content: 'Success after errors',
        usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
        model: 'mock',
        finishReason: 'stop',
      });
    }),
  });
}
```

#### 3. MongoDB Persistence (`hojai-persistence/src/repositories/agentRepository.ts`)

```typescript
import { Collection, ObjectId } from 'mongodb';
import type { Agent, AgentExecution, AgentVersion } from '../types';

export class AgentRepository {
  constructor(private collection: Collection<Agent>) {}

  async create(agent: Omit<Agent, '_id'>): Promise<Agent> {
    const result = await this.collection.insertOne({
      ...agent,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });
    return { ...agent, _id: result.insertedId, version: 1 };
  }

  async findById(id: string): Promise<Agent | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByTenant(tenantId: string): Promise<Agent[]> {
    return this.collection.find({ tenantId }).toArray();
  }

  async update(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: { ...updates, updatedAt: new Date() },
        $inc: { version: 1 },
      },
      { returnDocument: 'after' }
    );
    return result;
  }

  async recordExecution(execution: Omit<AgentExecution, '_id'>): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(execution.agentId) },
      {
        $push: {
          executions: {
            ...execution,
            timestamp: new Date(),
          },
        },
        $set: { lastExecutionAt: new Date() },
      }
    );
  }

  async getAnalytics(agentId: string, days: number): Promise<Analytics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.collection.aggregate([
      { $match: { _id: new ObjectId(agentId) } },
      { $unwind: '$executions' },
      { $match: { 'executions.timestamp': { $gte: since } } },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          avgLatency: { $avg: '$executions.latencyMs' },
          successRate: {
            $avg: { $cond: [{ $eq: ['$executions.status', 'success'] }, 1, 0] }
          },
          totalCost: { $sum: '$executions.cost' },
        },
      },
    ]).toArray();

    return result[0] || { totalExecutions: 0, avgLatency: 0, successRate: 0, totalCost: 0 };
  }
}
```

#### 4. Full SDK (`packages/hojai-sdk/src/client.ts`)

```typescript
export class HojaiClient {
  private baseUrl: string;
  private apiKey: string;
  private headers: HeadersInit;

  // Sub-clients
  public agents: AgentClient;
  public memory: MemoryClient;
  public workflows: WorkflowClient;
  public llm: LLMClient;
  public embeddings: EmbeddingClient;
  public rag: RAGClient;
  public compliance: ComplianceClient;
  public trust: TrustClient;

  constructor(config: HojaiClientConfig) {
    this.baseUrl = config.baseUrl || 'https://api.hojai.ai';
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Tenant-ID': config.tenantId,
    };

    // Initialize sub-clients
    this.agents = new AgentClient(this);
    this.memory = new MemoryClient(this);
    this.workflows = new WorkflowClient(this);
    this.llm = new LLMClient(this);
    this.embeddings = new EmbeddingClient(this);
    this.rag = new RAGClient(this);
    this.compliance = new ComplianceClient(this);
    this.trust = new TrustClient(this);
  }

  async request<T>(method: string, path: string, body?: object): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new HojaiError(
        response.status,
        await response.text(),
        response.statusText
      );
    }

    return response.json();
  }
}

// Usage example
const client = new HojaiClient({
  apiKey: process.env.HOJAI_API_KEY,
  tenantId: 'my-tenant',
});

const agent = await client.agents.create({
  name: 'My Sales Agent',
  type: 'sales',
  llm: 'claude-opus-4',
});

const response = await client.agents.chat(agent.id, {
  message: 'Find me enterprise software companies in San Francisco',
});
```

#### 5. CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### Deliverables

| Component | Files | Lines | Status |
|-----------|-------|-------|--------|
| Test Infrastructure | 5 files | ~400 | NEW |
| MongoDB Persistence | 6 files | ~500 | NEW |
| Full TypeScript SDK | 15 files | ~1500 | EXPAND |
| CI/CD Pipeline | 4 files | ~200 | NEW |
| Unit Tests | ~50 files | ~3000 | NEW |

**Total: ~5,600 lines of code + tests**

---

## IMPLEMENTATION TIMELINE

### Phase 1 (Weeks 1-4): Foundation

```
Week 1:
├── AGENT 1: Gemini, Llama, Mistral providers
├── AGENT 5: Test infrastructure + CI setup
│
Week 2:
├── AGENT 1: Real pgvector integration
├── AGENT 2: Chunker + Hybrid Search
│
Week 3:
├── AGENT 1: Model Router
├── AGENT 2: Re-ranker + Citation Engine
│
Week 4:
├── AGENT 5: MongoDB persistence (agent repo)
├── All Agents: First integration tests
```

### Phase 2 (Weeks 5-8): Core AI

```
Week 5:
├── AGENT 3: Base Agent class + tools system
├── AGENT 4: OpenTelemetry tracing
│
Week 6:
├── AGENT 3: executive-assistant with real AI
├── AGENT 3: sdr-agent with real AI
│
Week 7:
├── AGENT 3: ai-support-agent
├── AGENT 3: industry consultants
│
Week 8:
├── AGENT 2: Complete RAG pipeline
├── All Agents: Integration testing
```

### Phase 3 (Weeks 9-12): Enterprise

```
Week 9:
├── AGENT 4: GDPR/HIPAA compliance
├── AGENT 5: Full SDK
│
Week 10:
├── AGENT 4: Trust/Reputation system
├── AGENT 4: Plugin architecture
│
Week 11:
├── AGENT 4: Alerting system
├── AGENT 5: Complete MongoDB persistence
│
Week 12:
├── All Agents: Full integration tests
├── All Agents: Documentation
├── Release: Alpha version
```

---

## SUCCESS METRICS

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Real LLM Providers | 2 | 5+ | Count providers with real API |
| Real Vector DB | 0 | 1 | pgvector integration |
| RAG Quality | Hash embeddings | Hybrid + Rerank | Retrieval benchmarks |
| AI Employees | 0 | 20+ | Count with real LLM calls |
| Test Coverage | 0% | 80%+ | Codecov |
| Database Persistence | 0 | 1 | MongoDB for all services |
| External Integrations | 4 | 10+ | Count real integrations |

---

## BUDGET ESTIMATE

| Phase | Tasks | Est. Lines | Priority |
|-------|-------|------------|----------|
| Phase 1 | Foundation | ~4,500 | P0 |
| Phase 2 | Core AI | ~5,500 | P0 |
| Phase 3 | Enterprise | ~5,000 | P1 |

**Total New Code: ~15,000 lines**

---

*Plan Version: 1.0.0*
*Created: June 2, 2026*
