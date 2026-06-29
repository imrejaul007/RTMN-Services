/**
 * Decision Extractor — Extract decisions from text/conversations
 * Spec Part 21: Decision Intelligence
 */

import axios from 'axios';

const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

const EXTRACTION_PROMPT = `You are a Decision Extractor for a Personal Intelligence OS.

Extract ALL decisions from the text below. A decision is a clear commitment to do something or to NOT do something.

For each decision, identify:
1. WHAT was decided (the action or commitment)
2. WHY this decision was made (the reasoning)
3. WHO was involved or approved (names or "I", "we", "team")
4. ALTERNATIVES considered (especially rejected ones with reasons)
5. CONFIDENCE (0-1) based on how explicit the decision is
6. IMPACT (low/medium/high) based on scope
7. TAGS for searchability

Return as JSON:
{
  "decisions": [
    {
      "what": "string",
      "why": "string",
      "who": ["name1", "name2"],
      "alternatives": [
        {"name": "string", "rejected": true, "reason": "string"}
      ],
      "confidence": 0.0-1.0,
      "impact": "low|medium|high",
      "tags": ["tag1", "tag2"]
    }
  ]
}

If no decisions found, return {"decisions": []}.

Text:
"""

export async function extractDecisions(
  text: string,
  context?: string,
  attendees?: string[]
): Promise<{
  decisions: Array<{
    what: string;
    why: string;
    who: string[];
    alternatives: Array<{ name: string; rejected: boolean; reason?: string }>;
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    tags: string[];
  }>;
  rawResponse: any;
}> {
  // Build prompt with context
  const prompt = EXTRACTION_PROMPT +
    (context ? `\nContext: ${context}\n` : '') +
    (attendees?.length ? `\nAttendees: ${attendees.join(', ')}\n` : '') +
    `\n---\n${text}\n---\n\nJSON:`;

  try {
    // Call Genie LLM service
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt,
        model: 'claude-haiku',
        maxTokens: 2000,
        temperature: 0.1,
      },
      {
        headers: {
          'Authorization': `Bearer ${GENIE_LLM_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // Parse JSON from response
    const content = response.data?.content || response.data?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        decisions: parsed.decisions || [],
        rawResponse: parsed,
      };
    }

    return { decisions: [], rawResponse: null };
  } catch (error) {
    console.error('[decision-extractor] LLM call failed:', error);
    return { decisions: [], rawResponse: null };
  }
}

/**
 * Fallback: Pattern-based extraction (no LLM needed)
 */
export function extractDecisionsPattern(text: string): Array<{
  what: string;
  why: string;
  who: string[];
  confidence: number;
  tags: string[];
}> {
  const decisions: Array<{
    what: string;
    why: string;
    who: string[];
    confidence: number;
    tags: string[];
  }> = [];

  // Pattern 1: "We'll launch X next month"
  const willPattern = /(?:we'?ll|let'?s|going to)\s+([^\.]+?)(?:\s+(?:next|this)\s+(week|month|quarter|year))/gi;
  let match;
  while ((match = willPattern.exec(text)) !== null) {
    decisions.push({
      what: match[1].trim(),
      why: 'Inferred from context',
      who: [],
      confidence: 0.6,
      tags: ['forward-looking'],
    });
  }

  // Pattern 2: "We decided to X"
  const decidedPattern = /(?:we\s+)?decided\s+to\s+([^\.]+)/gi;
  while ((match = decidedPattern.exec(text)) !== null) {
    decisions.push({
      what: match[1].trim(),
      why: 'Explicit decision statement',
      who: [],
      confidence: 0.85,
      tags: ['decision'],
    });
  }

  // Pattern 3: "We chose X over Y because..."
  const chosePattern = /(?:we\s+)?chose\s+([^\.]+?)\s+over\s+([^\.]+?)\s+because\s+([^\.]+)/gi;
  while ((match = chosePattern.exec(text)) !== null) {
    decisions.push({
      what: `Choose ${match[1].trim()}`,
      why: match[3].trim(),
      who: [],
      confidence: 0.9,
      tags: ['choice', 'comparison'],
    });
  }

  // Pattern 4: "I should/will X"
  const iWillPattern = /i\s+(?:should|will|need to)\s+([^\.]+)/gi;
  while ((match = iWillPattern.exec(text)) !== null) {
    decisions.push({
      what: match[1].trim(),
      why: 'Personal commitment',
      who: ['I'],
      confidence: 0.7,
      tags: ['personal'],
    });
  }

  return decisions;
}