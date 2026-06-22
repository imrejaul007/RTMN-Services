/**
 * HOJAI RAG Service - LLM Service
 *
 * Simple LLM integration for RAG-powered generation.
 * Supports OpenAI-compatible APIs.
 */

import axios from 'axios';
import config from '../config';
import type { SearchResult } from '../types';

interface LLMResponse {
  answer: string;
  tokens_used?: number;
}

/**
 * Build context string from search results
 */
function buildContext(searchResults: SearchResult[]): string {
  if (!searchResults || searchResults.length === 0) {
    return '';
  }

  const contextParts = searchResults.map((result, index) => {
    return `[Document ${index + 1}] ${result.title}\n${result.content}`;
  });

  return contextParts.join('\n\n---\n\n');
}

/**
 * Build prompt for RAG
 */
function buildPrompt(query: string, context: string): string {
  if (!context) {
    return `Answer the following question based on your general knowledge:\n\nQuestion: ${query}\n\nAnswer:`;
  }

  return `You are a helpful AI assistant. Use the following context to answer the user's question.\n\nIf the context contains relevant information, use it to provide a detailed answer.\nIf the context doesn't contain enough information, say so and answer based on your general knowledge.\n\nContext:\n${context}\n\n---\n\nQuestion: ${query}\n\nAnswer:`;
}

/**
 * Call LLM API (OpenAI-compatible)
 */
export async function generateWithContext(
  query: string,
  searchResults?: SearchResult[],
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const model = options?.model || config.openaiModel;
  const maxTokens = options?.max_tokens || config.defaultMaxTokens;
  const temperature = options?.temperature || config.defaultTemperature;

  // Build context and prompt
  const context = buildContext(searchResults || []);
  const prompt = buildPrompt(query, context);

  // Check if API key is configured
  if (!config.openaiApiKey) {
    // Return mock response for development
    return generateMockResponse(query, searchResults);
  }

  try {
    const response = await axios.post(
      `${config.openaiBaseUrl}/chat/completions`,
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that answers questions based on the provided context.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`,
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    const answer = data.choices?.[0]?.message?.content || 'No response generated.';
    const tokensUsed = data.usage?.total_tokens;

    return { answer, tokens_used: tokensUsed };
  } catch (error) {
    console.error('LLM API error:', error);
    // Fallback to mock response
    return generateMockResponse(query, searchResults);
  }
}

/**
 * Generate mock response for development without API key
 */
function generateMockResponse(
  query: string,
  searchResults?: SearchResult[]
): LLMResponse {
  if (!searchResults || searchResults.length === 0) {
    return {
      answer: `Based on your query "${query}", I don't have any relevant documents in my knowledge base to provide a specific answer. Please add relevant documents first or ask a general question.`,
      tokens_used: 0,
    };
  }

  const topResult = searchResults[0];
  const relevantCount = searchResults.filter(r => r.score > 0.5).length;

  const answer = `Based on my knowledge base, here are relevant findings for "${query}":

**Most Relevant Document:** ${topResult.title}
**Relevance Score:** ${(topResult.score * 100).toFixed(1)}%

${topResult.content.substring(0, 500)}${topResult.content.length > 500 ? '...' : ''}

I found ${searchResults.length} document${searchResults.length > 1 ? 's' : ''} with relevance to your query${relevantCount > 0 ? `, ${relevantCount} with high relevance (>50%)` : ''}.`;

  return {
    answer,
    tokens_used: Math.floor(answer.length / 4), // Rough estimate
  };
}

/**
 * Generate completion without context (general query)
 */
export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const model = options?.model || config.openaiModel;
  const maxTokens = options?.max_tokens || config.defaultMaxTokens;
  const temperature = options?.temperature || config.defaultTemperature;

  if (!config.openaiApiKey) {
    return {
      answer: `This is a mock response for: "${prompt.substring(0, 100)}..."\n\nConfigure OPENAI_API_KEY to enable real LLM generation.`,
      tokens_used: 0,
    };
  }

  try {
    const response = await axios.post(
      `${config.openaiBaseUrl}/chat/completions`,
      {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`,
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    const answer = data.choices?.[0]?.message?.content || 'No response generated.';

    return {
      answer,
      tokens_used: data.usage?.total_tokens,
    };
  } catch (error) {
    console.error('LLM API error:', error);
    throw new Error('Failed to generate completion');
  }
}
