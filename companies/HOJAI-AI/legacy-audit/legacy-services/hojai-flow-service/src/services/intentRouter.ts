/**
 * Intent Router - One Button, One Overlay, One Experience
 *
 * Philosophy:
 * - User shouldn't choose modes
 * - Router decides for them
 *
 * User Speaks → Router Decides
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Intent Types
 */
export type IntentType =
  | 'dictation'   // Write, draft, compose
  | 'query'       // What, where, when, who, why, how
  | 'action'       // Schedule, create, send
  | 'workflow'    // Run, execute, trigger
  | 'agent'       // Follow up, check in
  | 'multi_agent'; // Review, analyze

/**
 * Intent Result
 */
export interface IntentResult {
  type: IntentType;
  subtype: string;
  entities: Record<string, string>;
  confidence: number;
  action?: string;
}

/**
 * Pattern Matching Rules
 */
const PATTERNS = {
  dictation: [
    /^write/i,
    /^draft/i,
    /^compose/i,
    /^type/i,
    /^create a (email|message|letter)/i,
    /^send (email|message)/i,
    /^rewrite/i,
    /^rephrase/i,
  ],
  query: [
    /^(what|where|when|who|why|how)/i,
    /\?$/,
    /^find/i,
    /^search/i,
    /^lookup/i,
    /^get me/i,
    /^tell me/i,
  ],
  action: [
    /^schedule/i,
    /^create/i,
    /^book/i,
    /^send/i,
    /^message/i,
    /^email/i,
    /^notify/i,
    /^remind/i,
  ],
  workflow: [
    /^run/i,
    /^execute/i,
    /^start/i,
    /^begin/i,
    /^trigger/i,
  ],
  agent: [
    /^follow.?up/i,
    /^check.?in/i,
    /^reach.?out/i,
    /^contact/i,
    /^connect/i,
    /^handle this/i,
  ],
  multi_agent: [
    /^review/i,
    /^analyze/i,
    /^report/i,
    /^summary/i,
    /^business review/i,
  ],
};

/**
 * Entity Extractors
 */
function extractEntities(text: string): Record<string, string> {
  const entities: Record<string, string> = {};

  // Name extraction
  const nameMatch = text.match(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) entities.name = nameMatch[1];

  // Time extraction
  if (/\btomorrow\b/i.test(text)) entities.time = 'tomorrow';
  else if (/\btoday\b/i.test(text)) entities.time = 'today';
  else if (/\bnext week\b/i.test(text)) entities.time = 'next_week';
  else if (/\bmonday\b/i.test(text)) entities.time = 'monday';
  else if (/\btuesday\b/i.test(text)) entities.time = 'tuesday';

  // Action type
  if (/schedule|meeting|calendar/i.test(text)) entities.actionType = 'schedule';
  else if (/send|message|email/i.test(text)) entities.actionType = 'message';
  else if (/campaign/i.test(text)) entities.actionType = 'campaign';
  else if (/call/i.test(text)) entities.actionType = 'call';

  // Object
  if (/merchant/i.test(text)) entities.object = 'merchant';
  else if (/customer|client/i.test(text)) entities.object = 'customer';
  else if (/lead|prospect/i.test(text)) entities.object = 'lead';

  return entities;
}

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
    let type: IntentType = 'dictation';
    let subtype = 'general';
    let confidence = 0.6;

    // Match patterns
    for (const [intentType, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) {
          type = intentType as IntentType;
          subtype = getSubtype(lower);
          confidence = 0.9;
          break;
        }
      }
      if (confidence > 0.6) break;
    }

    const entities = extractEntities(text);

    const result: IntentResult = {
      type,
      subtype,
      entities,
      confidence,
      action: getAction(type, subtype),
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Intent] Detect error:', error);
    res.status(500).json({ success: false, error: 'Detection failed' });
  }
});

/**
 * GET /api/intent/suggest
 * Get suggested actions based on context
 */
router.get('/suggest', async (req: Request, res: Response) => {
  const { context } = req.query;

  // Generate suggestions based on recent actions
  const suggestions = [
    { type: 'action', text: 'Schedule meeting tomorrow', icon: 'calendar' },
    { type: 'dictation', text: 'Draft email to team', icon: 'mail' },
    { type: 'query', text: 'What did I discuss yesterday?', icon: 'search' },
    { type: 'agent', text: 'Follow up with leads', icon: 'people' },
  ];

  res.json({ success: true, data: suggestions });
});

/**
 * Helper: Get subtype
 */
function getSubtype(text: string): string {
  if (/email|draft|compose/i.test(text)) return 'compose';
  if (/schedule|meeting|calendar/i.test(text)) return 'schedule';
  if (/send|message|whatsapp/i.test(text)) return 'send';
  if (/campaign|marketing/i.test(text)) return 'campaign';
  if (/follow.?up|reach.?out/i.test(text)) return 'outreach';
  if (/review|report|summary/i.test(text)) return 'review';
  if (/search|find|what is/i.test(text)) return 'search';
  return 'general';
}

/**
 * Helper: Get action from intent
 */
function getAction(type: IntentType, subtype: string): string {
  const actionMap: Record<string, string> = {
    'dictation-compose': 'compose_draft',
    'query-search': 'search_knowledge',
    'action-schedule': 'create_meeting',
    'action-send': 'send_message',
    'action-campaign': 'create_campaign',
    'agent-outreach': 'follow_up',
    'workflow-trigger': 'run_workflow',
    'multi_agent-review': 'generate_report',
  };

  return actionMap[`${type}-${subtype}`] || 'general';
}

export default router;
export { router as intentRouter };
