/**
 * Organization Sync - Sync personas with organization identity
 *
 * Imports organization knowledge into personas
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// ORGANIZATION MODEL
// ============================================================================

const OrganizationSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['founder', 'sales', 'support', 'hr', 'custom'] },
  personas: [{
    personaId: String,
    name: String,
    isActive: Boolean,
  }],
  knowledge: {
    policies: [{
      title: String,
      content: String,
      category: String,
    }],
    products: [{
      name: String,
      description: String,
      pricing: String,
    }],
    scripts: [{
      name: String,
      content: String,
      useCase: String,
    }],
    objectionHandling: [{
      objection: String,
      response: String,
    }],
  },
  brandVoice: {
    style: String,
    tone: String,
    guidelines: String,
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Organization = mongoose.model('Organization', OrganizationSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/organizations
 * Create organization
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, brandVoice } = req.body;

    const org = await Organization.create({
      orgId: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      brandVoice,
      personas: [],
      knowledge: { policies: [], products: [], scripts: [], objectionHandling: [] },
    });

    res.status(201).json({ success: true, data: org });
  } catch (error) {
    console.error('[Org] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create organization' });
  }
});

/**
 * GET /api/organizations/:id
 * Get organization
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const org = await Organization.findOne({ orgId: req.params.id });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get organization' });
  }
});

/**
 * POST /api/organizations/:id/knowledge
 * Add knowledge to organization
 */
router.post('/:id/knowledge', async (req: Request, res: Response) => {
  try {
    const { policies, products, scripts, objectionHandling } = req.body;

    const update: any = {};
    if (policies) update['knowledge.policies'] = policies;
    if (products) update['knowledge.products'] = products;
    if (scripts) update['knowledge.scripts'] = scripts;
    if (objectionHandling) update['knowledge.objectionHandling'] = objectionHandling;

    const org = await Organization.findOneAndUpdate(
      { orgId: req.params.id },
      { $set: update },
      { new: true }
    );

    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add knowledge' });
  }
});

/**
 * POST /api/organizations/:id/personas
 * Sync persona with organization
 */
router.post('/:id/personas', async (req: Request, res: Response) => {
  try {
    const { personaId, name, isActive = true } = req.body;

    const org = await Organization.findOneAndUpdate(
      { orgId: req.params.id },
      {
        $push: {
          personas: { personaId, name, isActive }
        }
      },
      { new: true }
    );

    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to sync persona' });
  }
});

/**
 * GET /api/organizations/:id/persona-context
 * Get persona context from organization
 */
router.get('/:id/persona-context', async (req: Request, res: Response) => {
  try {
    const { personaType } = req.query;
    const org = await Organization.findOne({ orgId: req.params.id });

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Filter knowledge by persona type
    const context = {
      organization: {
        name: org.name,
        type: org.type,
        brandVoice: org.brandVoice,
      },
      knowledge: {
        policies: org.knowledge.policies,
        products: org.knowledge.products,
        scripts: org.knowledge.scripts,
        objectionHandling: org.knowledge.objectionHandling,
      },
      persona: org.personas.find(p => p.personaId === personaType),
    };

    res.json({ success: true, data: context });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get persona context' });
  }
});

export default router;
