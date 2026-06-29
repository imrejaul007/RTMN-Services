/**
 * Life Story Writer — AI-assisted biography
 * Spec Part 35: Digital Legacy
 */

import axios from 'axios';
import { LifeChapter } from '../types/legacy.js';

const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

const STORY_PROMPT = `You are a life story writer. Create a thoughtful chapter summary based on the user's memories and entries.

Period: {PERIOD}
Key memories: {MEMORIES}

Generate a chapter with:
- A meaningful title
- A 200-word summary
- 3-5 highlights (key events)
- 2-3 lessons learned

Return JSON:
{
  "title": "Chapter Title",
  "summary": "Narrative summary...",
  "highlights": ["event1", "event2"],
  "lessons": ["lesson1", "lesson2"]
}
`;

export async function generateChapter(
  userId: string,
  period: { from: Date; to: Date },
  memories: string[]
): Promise<Omit<LifeChapter, 'id' | 'userId'>> {
  try {
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt: STORY_PROMPT
          .replace('{PERIOD}', `${period.from.toISOString()} to ${period.to.toISOString()}`)
          .replace('{MEMORIES}', memories.join('\n')),
        model: 'claude-haiku',
        maxTokens: 2000,
        temperature: 0.7,
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
      return {
        title: parsed.title || 'Untitled Chapter',
        period,
        summary: parsed.summary || '',
        highlights: parsed.highlights || [],
        lessons: parsed.lessons || [],
        significance: 5,
      };
    }
  } catch (error) {
    console.warn('[life-story-writer] LLM failed');
  }

  return {
    title: 'Untitled Chapter',
    period,
    summary: memories.join('\n\n'),
    highlights: [],
    lessons: [],
    significance: 5,
  };
}