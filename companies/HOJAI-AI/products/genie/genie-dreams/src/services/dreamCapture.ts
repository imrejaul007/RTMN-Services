/**
 * Dream Capture — Record dreams
 * Spec Part 33: Dream Journal
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Dream } from '../types/dream.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

const DREAM_KEY = (userId: string) => `user:${userId}:dreams`;

const INTERPRETATION_PROMPT = `You are a dream interpreter. Analyze the following dream and provide:
1. Key symbols and their potential meanings
2. Dominant emotions
3. People who appeared
4. Locations and their significance
5. A thoughtful interpretation

Return JSON:
{
  "interpretation": "thoughtful interpretation here",
  "symbols": ["symbol1", "symbol2"],
  "emotions": ["emotion1", "emotion2"],
  "themes": ["theme1", "theme2"]
}

Dream:
`;

export const DreamCapture = {
  async capture(
    userId: string,
    description: string,
    dreamDate: Date = new Date(),
    vividness?: number,
    lucidity?: boolean
  ): Promise<Dream> {
    // Get AI interpretation
    const interpretation = await interpretDream(description);

    const dream: Dream = {
      id: `dream_${uuidv4()}`,
      userId,
      capturedAt: new Date(),
      dreamDate,
      description,
      vividness,
      lucidity,
      interpretation: interpretation.interpretation,
      symbols: interpretation.symbols,
      emotions: interpretation.emotions,
      themes: interpretation.themes,
    };

    await redis.set(`dream:${dream.id}`, JSON.stringify(dream));
    await redis.sadd(DREAM_KEY(userId), dream.id);

    return dream;
  },

  async getHistory(userId: string, limit: number = 50): Promise<Dream[]> {
    const ids = await redis.smembers(DREAM_KEY(userId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`dream:${id}`));
    const results = await pipeline.exec();

    const dreams = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    return dreams
      .sort((a: Dream, b: Dream) => new Date(b.dreamDate).getTime() - new Date(a.dreamDate).getTime())
      .slice(0, limit);
  },

  async getOne(dreamId: string): Promise<Dream | null> {
    const data = await redis.get(`dream:${dreamId}`);
    return data ? JSON.parse(data) : null;
  },
};

async function interpretDream(description: string): Promise<{
  interpretation: string;
  symbols: string[];
  emotions: string[];
  themes: string[];
}> {
  try {
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt: INTERPRETATION_PROMPT + description,
        model: 'claude-haiku',
        maxTokens: 1500,
        temperature: 0.5,
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
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('[dream-capture] LLM failed, using fallback');
  }

  return fallbackInterpretation(description);
}

function fallbackInterpretation(description: string): {
  interpretation: string;
  symbols: string[];
  emotions: string[];
  themes: string[];
} {
  const lower = description.toLowerCase();

  // Extract simple symbols
  const symbolWords = ['water', 'fire', 'house', 'animal', 'road', 'tree', 'mirror', 'door', 'stairs', 'fly'];
  const symbols = symbolWords.filter(w => lower.includes(w));

  // Extract emotions
  const emotionWords = ['happy', 'sad', 'angry', 'afraid', 'anxious', 'peaceful', 'confused', 'lost'];
  const emotions = emotionWords.filter(w => lower.includes(w));

  // Detect themes
  const themes: string[] = [];
  if (lower.includes('water') || lower.includes('swim')) themes.push('emotions');
  if (lower.includes('fly') || lower.includes('fall')) themes.push('freedom');
  if (lower.includes('house') || lower.includes('home')) themes.push('family');
  if (lower.includes('work') || lower.includes('office')) themes.push('career');

  return {
    interpretation: `This dream contains ${symbols.length} symbols and ${emotions.length} emotions. The dominant themes suggest reflection on ${themes.join(', ') || 'current life'}.`,
    symbols,
    emotions,
    themes,
  };
}