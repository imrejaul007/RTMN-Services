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
      "who": ["Name1", "Name2"],
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
`;

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
      return { decisions: parsed.decisions || [], rawResponse: content };
    }

    return { decisions: [], rawResponse: content };
  } catch (error: any) {
    console.error('Decision extraction failed:', error.message);
    return { decisions: [], rawResponse: null };
  }
}

// Pattern-based extraction (fallback when LLM unavailable)
export const extractDecisionsPattern = (
  text: string
): Array<{ what: string; why: string; confidence: number }> => {
  const decisions: Array<{ what: string; why: string; confidence: number }> = [];

  // Decision patterns
  const patterns = [
    /(?:we decided|decided|decision|made a call to|going to|will|should|must|need to)[\s\S]{1,200}/gi,
    /(?:because|since|given that)[\s\S]{1,100}/gi,
  ];

  const matches = text.match(patterns[0]) || [];
  matches.slice(0, 10).forEach((match) => {
    if (match.length > 10) {
      decisions.push({
        what: match.substring(0, 100),
        why: '',
        confidence: 0.3,
      });
    }
  });

  return decisions;
};
