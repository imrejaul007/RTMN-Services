/**
 * Intent Routes - Wired to IntentRouter
 */

import { Router, Request, Response } from 'express';
import { intentRouter } from '../services/intentRouter.js';

const router = Router();

// Wire intent router
router.use('/', intentRouter);

/**
 * POST /api/intent/detect
 * Detect intent from text
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'text required' });
    }

    const lower = text.toLowerCase();
    let type = 'dictation';
    let subtype = 'general';
    let confidence = 0.6;

    // Dictation patterns
    if (/^(write|draft|compose|type|create a|send message)/i.test(lower)) {
      type = 'dictation';
      subtype = 'compose';
      confidence = 0.9;
    }
    // Query patterns
    else if (/^(what|where|when|who|why|how|find|search|lookup)/i.test(lower) || lower.includes('?')) {
      type = 'query';
      subtype = 'search';
      confidence = 0.9;
    }
    // Action patterns
    else if (/^(schedule|create|book|send|message|email|notify|remind)/i.test(lower)) {
      type = 'action';
      subtype = extractActionType(lower);
      confidence = 0.9;
    }
    // Workflow patterns
    else if (/^(run|execute|start|begin|trigger)/i.test(lower)) {
      type = 'workflow';
      subtype = 'automation';
      confidence = 0.85;
    }
    // Agent patterns
    else if (/^(follow.?up|check.?in|reach.?out|contact|connect)/i.test(lower)) {
      type = 'agent';
      subtype = 'outreach';
      confidence = 0.85;
    }
    // Multi-agent patterns
    else if (/^(review|analyze|report|summary)/i.test(lower)) {
      type = 'multi_agent';
      subtype = 'business_intelligence';
      confidence = 0.8;
    }

    // Extract entities
    const entities: Record<string, string> = {};
    const nameMatch = text.match(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatch) entities.person = nameMatch[1];
    if (/tomorrow/i.test(text)) entities.time = 'tomorrow';
    if (/today/i.test(text)) entities.time = 'today';
    if (/next week/i.test(text)) entities.time = 'next_week';

    res.json({
      success: true,
      data: { type, subtype, entities, confidence }
    });
  } catch (error) {
    console.error('[Intent] Detect error:', error);
    res.status(500).json({ success: false, error: 'Detection failed' });
  }
});

function extractActionType(text: string): string {
  if (/schedule|meeting|calendar/i.test(text)) return 'schedule';
  if (/send|message|email/i.test(text)) return 'send';
  if (/create|campaign/i.test(text)) return 'create';
  if (/book|reserve/i.test(text)) return 'book';
  return 'general';
}

/**
 * GET /api/intent/suggest
 * Get suggested actions
 */
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const suggestions = [
      { type: 'action', text: 'Schedule meeting tomorrow', icon: 'calendar' },
      { type: 'dictation', text: 'Draft email to team', icon: 'mail' },
      { type: 'query', text: 'What did I discuss yesterday?', icon: 'search' },
      { type: 'agent', text: 'Follow up with leads', icon: 'people' },
    ];

    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

export default router;
