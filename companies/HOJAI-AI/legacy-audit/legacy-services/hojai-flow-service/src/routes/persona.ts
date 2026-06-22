/**
 * Persona Routes - Personal & Organization Identity
 *
 * NOT "settings" or "preferences"
 * This is a first-class feature.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// PERSONA MODEL
// ============================================================================

const PersonaSchema = new mongoose.Schema({
  personaId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },

  // Identity
  name: { type: String, required: true },
  type: { type: String, enum: ['personal', 'founder', 'sales', 'support', 'hr', 'custom'], required: true },

  // Voice
  voice: {
    enabled: { type: Boolean, default: true },
    style: { type: String, enum: ['professional', 'casual', 'friendly', 'assertive'], default: 'professional' },
    tone: { type: String, enum: ['formal', 'semi-formal', 'casual'], default: 'semi-formal' },
  },

  // Writing
  writing: {
    formality: { type: Number, min: 1, max: 10, default: 5 },
    responseLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    greetingStyle: String,
    signOffStyle: String,
  },

  // Memory scope
  memory: {
    scope: { type: String, enum: ['personal', 'team', 'organization'], default: 'personal' },
    canRememberEverything: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 365 },
  },

  // Permissions
  permissions: {
    canSendMessages: { type: Boolean, default: false },
    canMakeCalls: { type: Boolean, default: false },
    canCreateTasks: { type: Boolean, default: true },
    canAccessCalendar: { type: Boolean, default: false },
    canSpendBudget: { type: Boolean, default: false },
    budgetLimit: Number,
  },

  // Knowledge scope
  knowledgeScope: [String], // e.g., ['products', 'pricing', 'policies']

  // Learned patterns
  learned: {
    commonWords: [String],
    signaturePhrases: [String],
    bestResponseTimes: [String], // e.g., ['morning', 'after-lunch']
  },

  // Stats
  stats: {
    totalInteractions: { type: Number, default: 0 },
    successfulActions: { type: Number, default: 0 },
    lastInteractionAt: Date,
  },

  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

PersonaSchema.index({ userId: 1, tenantId: 1 });
PersonaSchema.index({ type: 1 });

export const Persona = mongoose.model('Persona', PersonaSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/personas
 * List all personas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, type } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const filter: Record<string, unknown> = { userId, tenantId, isActive: true };
    if (type) filter.type = type;

    const personas = await Persona.find(filter)
      .sort({ isDefault: -1, name: 1 });

    res.json({ success: true, data: personas });
  } catch (error) {
    console.error('[Persona] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list personas' });
  }
});

/**
 * GET /api/personas/active
 * Get active persona
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Try default first
    let persona = await Persona.findOne({ userId, tenantId, isDefault: true, isActive: true });

    // Otherwise get first active
    if (!persona) {
      persona = await Persona.findOne({ userId, tenantId, isActive: true });
    }

    if (!persona) {
      // Create default personal persona
      persona = await Persona.create({
        personaId: `persona_${Date.now()}`,
        userId,
        tenantId,
        name: 'My Persona',
        type: 'personal',
        isDefault: true,
        voice: { enabled: true, style: 'professional' },
        writing: { formality: 5, responseLength: 'medium' },
        memory: { scope: 'personal' },
        permissions: { canCreateTasks: true },
        knowledgeScope: [],
        learned: { commonWords: [], signaturePhrases: [] },
        stats: { totalInteractions: 0, successfulActions: 0 }
      });
    }

    res.json({ success: true, data: persona });
  } catch (error) {
    console.error('[Persona] Get active error:', error);
    res.status(500).json({ success: false, error: 'Failed to get persona' });
  }
});

/**
 * POST /api/personas
 * Create persona
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, name, type, ...config } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !name || !type) {
      return res.status(400).json({ success: false, error: 'userId, name, and type required' });
    }

    const persona = await Persona.create({
      personaId: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      name,
      type,
      isDefault: false,
      ...config,
    });

    res.status(201).json({ success: true, data: persona });
  } catch (error) {
    console.error('[Persona] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create persona' });
  }
});

/**
 * PATCH /api/personas/:id
 * Update persona
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { ...updates } = req.body;

    const persona = await Persona.findOneAndUpdate(
      { personaId: req.params.id },
      { $set: updates },
      { new: true }
    );

    if (!persona) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }

    res.json({ success: true, data: persona });
  } catch (error) {
    console.error('[Persona] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update persona' });
  }
});

/**
 * POST /api/personas/learn
 * Learn from interaction
 */
router.post('/learn', async (req: Request, res: Response) => {
  try {
    const { personaId, text, action } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!personaId || !text) {
      return res.status(400).json({ success: false, error: 'personaId and text required' });
    }

    // Extract patterns from text
    const words = text.toLowerCase().split(/\s+/);
    const phrases = extractPhrases(text);

    const persona = await Persona.findOneAndUpdate(
      { personaId, tenantId },
      {
        $push: {
          'learned.commonWords': { $each: words.slice(0, 5), $slice: -100 },
          'learned.signaturePhrases': { $each: phrases.slice(0, 3), $slice: -50 },
        },
        $inc: {
          'stats.totalInteractions': 1,
          ...(action === 'success' ? { 'stats.successfulActions': 1 } : {}),
        },
        $set: { 'stats.lastInteractionAt': new Date() },
      },
      { new: true }
    );

    res.json({ success: true, data: persona?.learned });
  } catch (error) {
    console.error('[Persona] Learn error:', error);
    res.status(500).json({ success: false, error: 'Failed to learn' });
  }
});

/**
 * DELETE /api/personas/:id
 * Delete persona
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Persona.findOneAndUpdate(
      { personaId: req.params.id },
      { isActive: false }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }

    res.json({ success: true, message: 'Persona deleted' });
  } catch (error) {
    console.error('[Persona] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete persona' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function extractPhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words.slice(i, i + 2).join(' '));
    if (i < words.length - 2) {
      phrases.push(words.slice(i, i + 3).join(' '));
    }
  }

  return phrases;
}

export default router;
