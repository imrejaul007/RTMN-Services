/**
 * Value Extractor — Extract values from user behavior/feedback
 * Spec Part 32: Personal Constitution
 */

import axios from 'axios';
import { ConstitutionValue } from '../types/constitution.js';

const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

const EXTRACTION_PROMPT = `You are a Value Extractor for a Personal Intelligence OS.

Extract core values from user feedback. Values are principles that guide decisions.

Common values:
- honesty, integrity, trust
- family-first, relationships
- speed, efficiency
- quality, excellence
- innovation, creativity
- safety, security
- privacy, autonomy
- learning, growth
- health, wellness
- wealth, prosperity

Return JSON:
{
  "values": [
    {
      "name": "value-name",
      "weight": 0.0-1.0,
      "examples": ["evidence from text"]
    }
  ]
}

If no clear values, return {"values": []}.

Text:
`;

export async function extractValues(
  text: string,
  context?: string
): Promise<ConstitutionValue[]> {
  try {
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt: EXTRACTION_PROMPT + text,
        model: 'claude-haiku',
        maxTokens: 1500,
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

    const content = response.data?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.values || [];
    }
  } catch (error) {
    console.warn('[value-extractor] LLM failed, using pattern fallback');
  }

  return extractValuesPattern(text);
}

export function extractValuesPattern(text: string): ConstitutionValue[] {
  const values: ConstitutionValue[] = [];
  const textLower = text.toLowerCase();

  // Pattern: "I value X" or "X is important"
  const valuePatterns = [
    { name: 'honesty', patterns: ['honest', 'truth', 'transparent'] },
    { name: 'family-first', patterns: ['family', 'parents', 'kids', 'children'] },
    { name: 'speed', patterns: ['fast', 'quick', 'speed'] },
    { name: 'quality', patterns: ['quality', 'excellence', 'best'] },
    { name: 'innovation', patterns: ['innovate', 'new', 'creative'] },
    { name: 'safety', patterns: ['safe', 'security', 'protected'] },
    { name: 'privacy', patterns: ['privacy', 'private', 'confidential'] },
    { name: 'learning', patterns: ['learn', 'study', 'grow'] },
    { name: 'health', patterns: ['health', 'fitness', 'wellness'] },
    { name: 'wealth', patterns: ['money', 'wealth', 'rich', 'prosper'] },
  ];

  for (const vp of valuePatterns) {
    if (vp.patterns.some(p => textLower.includes(p))) {
      values.push({
        name: vp.name,
        weight: 0.8,
        examples: [text.slice(0, 100)],
      });
    }
  }

  return values;
}