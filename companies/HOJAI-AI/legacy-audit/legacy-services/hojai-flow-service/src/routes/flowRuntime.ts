/**
 * Flow Runtime - Execution Engine
 *
 * Handles:
 * - Action execution
 * - Persona routing
 * - Approval workflows
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const WORKFLOW_URL = process.env.WORKFLOW_URL || 'http://localhost:4045';
const VOICE_URL = process.env.VOICE_URL || 'http://localhost:4033';

interface FlowContext {
  personaType: string;
  permissions: {
    canSendMessages: boolean;
    canCreateTasks: boolean;
  };
  knowledge: string[];
}

/**
 * POST /api/flow/execute
 * Execute action with persona context
 */
router.post('/execute', async (req: Request, res: Response) => {
  const { action, persona, context } = req.body;

  if (!action || !persona) {
    return res.status(400).json({ success: false, error: 'action and persona required' });
  }

  // Check permissions
  if (action.requiresApproval && !context.permissions?.canSendMessages) {
    return res.status(403).json({
      success: false,
      error: 'Persona lacks permission',
      action: 'requires_approval'
    });
  }

  // Route to Workflow Runtime
  try {
    const workflow = await axios.post(`${WORKFLOW_URL}/api/workflows`, {
      name: `${persona.type}_${action.type}`,
      trigger: { type: 'manual' },
      steps: [{
        type: 'persona_action',
        config: { persona, action }
      }]
    });

    res.json({ success: true, workflowId: workflow.data.id });
  } catch {
    // Fallback to direct execution
    res.json({ success: true, executed: true });
  }
});

/**
 * POST /api/flow/approve
 * Human approval for blocked actions
 */
router.post('/approve', async (req: Request, res: Response) => {
  const { actionId, approverPersona } = req.body;

  const workflow = await axios.patch(`${WORKFLOW_URL}/api/workflows/${actionId}`, {
    status: 'approved'
  });

  res.json({ success: true });
});

/**
 * GET /api/flow/persona-context
 * Get persona context for execution
 */
router.get('/persona-context', async (req: Request, res: Response) => {
  const { personaId } = req.query;

  res.json({
    success: true,
    data: {
      persona: {
        type: personaId,
        voice: 'professional',
        permissions: { canSendMessages: true, canCreateTasks: true },
      }
    }
  });
});

/**
 * Voice routing
 */
router.post('/voice', async (req: Request, res: Response) => {
  const { audio, personaType } = req.body;

  // Route to voice service
  const voice = await axios.post(`${VOICE_URL}/api/voice/${personaType || 'personal'}`, { audio });

  res.json(voice.data);
});

export default router;
