/**
 * Preferences Routes - User preferences and style learning
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// PREFERENCES MODEL
// ============================================================================

const PreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },

  // Voice settings
  voiceEnabled: { type: Boolean, default: true },
  voiceStyle: { type: String, enum: ['default', 'whisper', 'fast'], default: 'default' },

  // Writing style
  style: { type: String, enum: ['professional', 'casual', 'friendly'], default: 'professional' },

  // Language
  language: { type: String, default: 'en' },

  // Privacy
  privacy: {
    shareContext: { type: Boolean, default: true },
    learnFromInteractions: { type: Boolean, default: true },
  },

  // Learned preferences
  learned: {
    commonWords: [String],           // Words user uses often
    commonPhrases: [String],         // Phrases user uses
    responseLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    formalityLevel: { type: Number, min: 1, max: 10, default: 5 }, // 1=casual, 10=formal
    greetingStyle: String,            // "Hi", "Hello", "Hey"
    signaturePhrases: [String],      // User's characteristic phrases
  },

  // Statistics
  stats: {
    totalInteractions: { type: Number, default: 0 },
    voiceUsage: { type: Number, default: 0 },
    textUsage: { type: Number, default: 0 },
    lastInteractionAt: Date,
  },

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Preference = mongoose.model('Preference', PreferenceSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/preferences
 * Get user preferences
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    let pref = await Preference.findOne({ userId, tenantId });

    if (!pref) {
      // Create default preferences
      pref = await Preference.create({
        userId,
        tenantId,
        voiceEnabled: true,
        voiceStyle: 'default',
        style: 'professional',
        language: 'en',
        privacy: { shareContext: true, learnFromInteractions: true },
        learned: {
          commonWords: [],
          commonPhrases: [],
          responseLength: 'medium',
          formalityLevel: 5,
          greetingStyle: 'Hello',
          signaturePhrases: [],
        },
        stats: {
          totalInteractions: 0,
          voiceUsage: 0,
          textUsage: 0,
        }
      });
    }

    res.json({ success: true, data: pref });
  } catch (error) {
    console.error('[Preferences] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * PATCH /api/preferences
 * Update preferences
 */
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { userId, ...updates } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const pref = await Preference.findOneAndUpdate(
      { userId, tenantId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: pref });
  } catch (error) {
    console.error('[Preferences] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/preferences/learn
 * Learn from user interaction
 */
router.post('/learn', async (req: Request, res: Response) => {
  try {
    const { userId, text, isVoice } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !text) {
      return res.status(400).json({ success: false, error: 'userId and text required' });
    }

    const words = text.toLowerCase().split(/\s+/);
    const phrases = extractPhrases(text);

    // Update learned preferences
    const pref = await Preference.findOneAndUpdate(
      { userId, tenantId },
      {
        $push: {
          'learned.commonWords': { $each: words.slice(0, 10), $slice: -100 },
          'learned.signaturePhrases': { $each: phrases.slice(0, 5), $slice: -50 },
        },
        $inc: {
          'stats.totalInteractions': 1,
          'stats.voiceUsage': isVoice ? 1 : 0,
          'stats.textUsage': isVoice ? 0 : 1,
        },
        $set: { 'stats.lastInteractionAt': new Date(), updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, learned: pref.learned });
  } catch (error) {
    console.error('[Preferences] Learn error:', error);
    res.status(500).json({ success: false, error: 'Failed to learn' });
  }
});

/**
 * POST /api/preferences/style
 * Analyze and update writing style
 */
router.post('/style', async (req: Request, res: Response) => {
  try {
    const { userId, sampleText } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !sampleText) {
      return res.status(400).json({ success: false, error: 'userId and sampleText required' });
    }

    // Analyze writing style
    const analysis = analyzeWritingStyle(sampleText);

    const pref = await Preference.findOneAndUpdate(
      { userId, tenantId },
      {
        $set: {
          style: analysis.recommendedStyle,
          'learned.formalityLevel': analysis.formalityLevel,
          'learned.responseLength': analysis.responseLength,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({ success: true, data: { analysis, preferences: pref } });
  } catch (error) {
    console.error('[Preferences] Style analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze style' });
  }
});

/**
 * GET /api/preferences/suggest
 * Get style suggestions
 */
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const pref = await Preference.findOne({ userId, tenantId });

    if (!pref) {
      return res.json({
        success: true,
        data: {
          style: 'professional',
          greeting: 'Hello',
          formality: 5,
        }
      });
    }

    res.json({
      success: true,
      data: {
        style: pref.style,
        greeting: pref.learned.greetingStyle || 'Hello',
        formality: pref.learned.formalityLevel,
        responseLength: pref.learned.responseLength,
        commonWords: pref.learned.commonWords.slice(-10),
        signaturePhrases: pref.learned.signaturePhrases.slice(-5),
      }
    });
  } catch (error) {
    console.error('[Preferences] Suggest error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function extractPhrases(text: string): string[] {
  // Extract common phrases (2-4 word combinations)
  const words = text.toLowerCase().split(/\s+/);
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words.slice(i, i + 2).join(' '));
  }

  return phrases;
}

function analyzeWritingStyle(text: string): {
  recommendedStyle: 'professional' | 'casual' | 'friendly';
  formalityLevel: number;
  responseLength: 'short' | 'medium' | 'long';
} {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;

  // Indicators of formality
  const formalWords = ['therefore', 'furthermore', 'consequently', 'regarding', 'concerning', 'acknowledge', 'endeavor'];
  const casualWords = ['gonna', 'wanna', 'yeah', 'cool', 'awesome', 'btw', 'tbh', 'lol', 'lol', 'super'];
  const friendlyWords = ['great', 'amazing', 'wonderful', 'lovely', 'fantastic', 'appreciate'];

  let formalScore = 0;
  let casualScore = 0;
  let friendlyScore = 0;

  for (const word of words) {
    if (formalWords.some(fw => word.includes(fw))) formalScore++;
    if (casualWords.some(cw => word.includes(cw))) casualScore++;
    if (friendlyWords.some(fw => word.includes(fw))) friendlyScore++;
  }

  const total = formalScore + casualScore + friendlyScore;
  const formalityLevel = total > 0
    ? Math.round(5 + ((formalScore - casualScore) / total) * 5)
    : 5;

  // Determine style
  let recommendedStyle: 'professional' | 'casual' | 'friendly' = 'professional';
  if (casualScore > formalScore && casualScore > friendlyScore) {
    recommendedStyle = 'casual';
  } else if (friendlyScore > formalScore && friendlyScore > casualScore) {
    recommendedStyle = 'friendly';
  }

  // Determine response length
  let responseLength: 'short' | 'medium' | 'long' = 'medium';
  if (wordCount < 10) responseLength = 'short';
  else if (wordCount > 30) responseLength = 'long';

  return {
    recommendedStyle,
    formalityLevel: Math.max(1, Math.min(10, formalityLevel)),
    responseLength,
  };
}

export default router;
