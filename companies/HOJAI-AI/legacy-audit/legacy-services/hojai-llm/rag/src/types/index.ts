/**
 * HOJAI RAG Service - Type Definitions
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  created_at: string;
  updated_at?: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  namespace?: string;
  min_score?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateRequest {
  query: string;
  context?: SearchResult[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface GenerateResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
  tokens_used?: number;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  namespace?: string;
}

export interface DocumentBatchRequest {
  documents: DocumentCreateRequest[];
  namespace?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}
