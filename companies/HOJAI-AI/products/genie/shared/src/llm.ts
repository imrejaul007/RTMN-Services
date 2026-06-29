/**
 * LLM helper - Unified Genie LLM interface
 */

import axios from 'axios';

const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

export interface LLMRequest {
  prompt: string;
  model?: 'claude-haiku' | 'claude-sonnet' | 'gpt-4';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse | null> {
  try {
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt: req.prompt,
        model: req.model || 'claude-haiku',
        maxTokens: req.maxTokens || 2000,
        temperature: req.temperature ?? 0.3,
        system: req.systemPrompt,
      },
      {
        headers: {
          'Authorization': `Bearer ${GENIE_LLM_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    if (response.status >= 400) {
      console.warn(`[LLM] Failed: ${response.status}`);
      return null;
    }

    return {
      content: response.data?.content || response.data?.text || '',
      model: response.data?.model || req.model || 'unknown',
      usage: response.data?.usage,
    };
  } catch (error: any) {
    console.warn(`[LLM] Error: ${error.message}`);
    return null;
  }
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJSON(content: string): any | null {
  // Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting from code block
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object in text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }

    return null;
  }
}