/**
 * Conversation Memory Routes
 *
 * INTERNAL ONLY - Not exposed to client frontends
 * Used by sales systems to get pre-call intelligence
 */

import { Router } from 'express';
import { conversationMemory } from '../services/conversationMemory.js';

const router = Router();

// ==================== INTERNAL API (No client exposure) ====================

/**
 * Add a conversation entry
 * Called by CRM/sales systems after calls/chats
 */
router.post('/conversations', (req, res) => {
  try {
    const { clientId, leadId, channel, direction, timestamp, duration, summary, topics, sentiment, keyPoints, actionItems, nextFollowUp } = req.body;

    if (!clientId || !leadId) {
      return res.status(400).json({ success: false, error: 'clientId and leadId required' });
    }

    const intelligence = conversationMemory.addConversation(clientId, leadId, {
      leadId,
      channel: channel || 'call',
      direction: direction || 'outbound',
      timestamp: timestamp || new Date().toISOString(),
      duration,
      summary: summary || '',
      topics: topics || conversationMemory.extractTopics(summary || ''),
      sentiment: sentiment || 'neutral',
      keyPoints: keyPoints || [],
      actionItems: actionItems || [],
      nextFollowUp
    });

    res.json({ success: true, intelligence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get pre-call brief for a lead (INTERNAL USE)
 * This is what sales rep sees BEFORE calling
 */
router.get('/pre-call/:clientId/:leadId', (req, res) => {
  try {
    const { clientId, leadId } = req.params;
    const brief = conversationMemory.getPreCallBrief(clientId, leadId);

    if (!brief) {
      return res.json({ success: true, data: null, message: 'No conversation history' });
    }

    res.json({ success: true, data: brief });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get lead intelligence summary (INTERNAL USE)
 */
router.get('/intelligence/:clientId/:leadId', (req, res) => {
  try {
    const { clientId, leadId } = req.params;
    const intelligence = conversationMemory.getLeadIntelligence(clientId, leadId);

    res.json({ success: true, data: intelligence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get conversation history for a lead (INTERNAL USE)
 */
router.get('/history/:clientId/:leadId', (req, res) => {
  try {
    const { clientId, leadId } = req.params;
    const conversations = conversationMemory.getConversations(clientId, leadId);

    res.json({ success: true, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Topic extraction (for AI processing)
 */
router.post('/extract-topics', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text required' });
    }

    const topics = conversationMemory.extractTopics(text);
    res.json({ success: true, topics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;