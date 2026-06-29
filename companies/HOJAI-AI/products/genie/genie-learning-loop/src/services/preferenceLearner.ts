/**
 * Preference Learner — Extract preferences from feedback
 * Spec Part 23: Continuous Learning
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { LearnedPreference, Feedback } from '../types/preference.js';
import { PreferenceStorage } from './preferenceStorage.js';

const GENIE_LLM_URL = process.env.GENIE_LLM_URL || 'http://localhost:4520';
const GENIE_LLM_KEY = process.env.GENIE_LLM_KEY || '';

const EXTRACTION_PROMPT = `You are a Preference Extractor for a Personal Intelligence OS.

Extract explicit preferences from the user's feedback. A preference is a clear statement about how the user wants to do something.

Common patterns:
- Time preferences: "I don't like meetings after 8 PM" → "Block 8-10 PM"
- Communication: "I prefer email over calls" → "Use email by default"
- Work: "I work better in morning" → "Reserve 9-12 for deep work"
- Health: "I need 7 hours sleep" → "Suggest 11:30 PM bedtime"
- Finance: "I don't want to spend >$100/day" → "Alert on overspending"

Return JSON:
{
  "preferences": [
    {
      "pattern": "kebab-case-pattern",
      "category": "time|communication|work|personal|health|finance",
      "action": "specific action to take",
      "confidence": 0.0-1.0,
      "autoApply": true/false,
      "examples": ["original text"]
    }
  ]
}

If no clear preferences, return {"preferences": []}.

Feedback:
`;

export async function learnFromFeedback(feedback: Feedback): Promise<LearnedPreference[]> {
  // Call Genie LLM to extract preferences
  let extracted: { preferences: any[] } = { preferences: [] };

  try {
    const response = await axios.post(
      `${GENIE_LLM_URL}/api/llm/generate`,
      {
        prompt: EXTRACTION_PROMPT + feedback.text,
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
      extracted = JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('[preference-learner] LLM call failed:', error);
    extracted = extractPreferencesPattern(feedback.text);
  }

  // Save each preference
  const savedPreferences: LearnedPreference[] = [];
  for (const ext of extracted.preferences || []) {
    // Check if similar preference already exists
    const existing = await findSimilarPreference(feedback.userId, ext.pattern);
    if (existing) {
      // Update confidence and add example
      existing.examples.push(feedback.text);
      existing.confidence = Math.min(1, existing.confidence + 0.05);
      existing.triggered++;
      existing.updatedAt = new Date();
      await PreferenceStorage.save(existing);
      savedPreferences.push(existing);
    } else {
      const preference: LearnedPreference = {
        id: `pref_${uuidv4()}`,
        userId: feedback.userId,
        pattern: ext.pattern,
        examples: [feedback.text],
        action: ext.action,
        category: ext.category,
        confidence: ext.confidence || 0.7,
        autoApply: ext.autoApply ?? false,
        triggered: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await PreferenceStorage.save(preference);
      savedPreferences.push(preference);
    }
  }

  return savedPreferences;
}

async function findSimilarPreference(userId: string, pattern: string): Promise<LearnedPreference | null> {
  const preferences = await PreferenceStorage.getForUser(userId);
  const patternLower = pattern.toLowerCase();
  return preferences.find(p => p.pattern.toLowerCase() === patternLower) || null;
}

/**
 * Pattern-based preference extraction (fallback)
 */
export function extractPreferencesPattern(text: string): {
  preferences: Array<{
    pattern: string;
    category: string;
    action: string;
    confidence: number;
    autoApply: boolean;
    examples: string[];
  }>;
} {
  const preferences: any[] = [];
  const textLower = text.toLowerCase();

  // Time-based preferences
  const timePattern = /(?:i\s+(?:don'?t|do not)\s+like|i\s+(?:don'?t|do not)\s+want|avoid|don'?t\s+schedule)\s+(?:meetings?|calls?|work)\s+(?:after|before)\s+(\d+(?::\d+)?\s*(?:am|pm))/gi;
  let match;
  while ((match = timePattern.exec(text)) !== null) {
    preferences.push({
      pattern: `avoid_meetings_${match[1].replace(/\s/g, '').toLowerCase()}`,
      category: 'time',
      action: `Block ${match[1]} for personal time`,
      confidence: 0.85,
      autoApply: true,
      examples: [text],
    });
  }

  // Morning focus
  if (textLower.includes('morning') && (textLower.includes('focus') || textLower.includes('work better') || textLower.includes('productive'))) {
    preferences.push({
      pattern: 'morning_focus',
      category: 'work',
      action: 'Reserve 9-12 AM for deep work',
      confidence: 0.8,
      autoApply: true,
      examples: [text],
    });
  }

  // Email preference
  if (textLower.includes('email') && (textLower.includes('prefer') || textLower.includes('over') && textLower.includes('call'))) {
    preferences.push({
      pattern: 'prefer_email',
      category: 'communication',
      action: 'Use email as default contact method',
      confidence: 0.85,
      autoApply: true,
      examples: [text],
    });
  }

  // Sleep
  if (textLower.includes('sleep') && (textLower.includes('need') || textLower.includes('require'))) {
    const hourMatch = text.match(/(\d+)\s*hours?\s*(?:of\s*)?sleep/gi);
    if (hourMatch) {
      preferences.push({
        pattern: 'sleep_target',
        category: 'health',
        action: `Target ${hourMatch[0]}`,
        confidence: 0.9,
        autoApply: false,
        examples: [text],
      });
    }
  }

  return { preferences };
}