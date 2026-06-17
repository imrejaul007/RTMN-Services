/**
 * REZ SalesMind - Social Media Routes
 * REST API endpoints for all social media integrations
 */

import { Router, Request, Response } from 'express';
import { socialMediaManager } from '../services/socialMedia.js';

const router = Router();

// ==================== WhatsApp Routes ====================

/**
 * POST /api/social/whatsapp/send
 * Send a WhatsApp message
 */
router.post('/whatsapp/send', async (req: Request, res: Response) => {
  try {
    const { to, message, template, params } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    const result = await socialMediaManager.whatsapp.sendWhatsAppMessage(to, message, template, params);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send WhatsApp message' });
  }
});

/**
 * POST /api/social/whatsapp/template
 * Send a WhatsApp template message
 */
router.post('/whatsapp/template', async (req: Request, res: Response) => {
  try {
    const { to, templateName, params } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({ error: 'Missing required fields: to, templateName' });
    }

    const result = await socialMediaManager.whatsapp.sendWhatsAppTemplate(to, templateName, params);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('WhatsApp template error:', error);
    res.status(500).json({ error: error.message || 'Failed to send WhatsApp template' });
  }
});

/**
 * GET /api/social/whatsapp/templates
 * Get available WhatsApp templates
 */
router.get('/whatsapp/templates', async (req: Request, res: Response) => {
  try {
    const templates = await socialMediaManager.whatsapp.getWhatsAppTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('WhatsApp templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get templates' });
  }
});

/**
 * GET /api/social/whatsapp/status/:messageId
 * Get message delivery status
 */
router.get('/whatsapp/status/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const status = await socialMediaManager.whatsapp.getWhatsAppMessageStatus(messageId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get message status' });
  }
});

// ==================== Instagram Routes ====================

/**
 * POST /api/social/instagram/send
 * Send an Instagram direct message
 */
router.post('/instagram/send', async (req: Request, res: Response) => {
  try {
    const { to, message, storyId } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    let result;
    if (storyId) {
      result = await socialMediaManager.instagram.sendStoryReply(storyId, message);
    } else {
      result = await socialMediaManager.instagram.sendInstagramMessage(to, message);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Instagram send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send Instagram message' });
  }
});

/**
 * POST /api/social/instagram/story-reply
 * Reply to an Instagram story
 */
router.post('/instagram/story-reply', async (req: Request, res: Response) => {
  try {
    const { storyId, message } = req.body;

    if (!storyId || !message) {
      return res.status(400).json({ error: 'Missing required fields: storyId, message' });
    }

    const result = await socialMediaManager.instagram.sendStoryReply(storyId, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Instagram story reply error:', error);
    res.status(500).json({ error: error.message || 'Failed to send story reply' });
  }
});

// ==================== LinkedIn Routes ====================

/**
 * POST /api/social/linkedin/send
 * Send a LinkedIn message
 */
router.post('/linkedin/send', async (req: Request, res: Response) => {
  try {
    const { to, message, attachmentUrl } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    let result;
    if (attachmentUrl) {
      result = await socialMediaManager.linkedin.sendLinkedInMessageWithAttachment(to, message, attachmentUrl);
    } else {
      result = await socialMediaManager.linkedin.sendLinkedInMessage(to, message);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('LinkedIn send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send LinkedIn message' });
  }
});

/**
 * POST /api/social/linkedin/connect
 * Send a LinkedIn connection request
 */
router.post('/linkedin/connect', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Missing required field: to' });
    }

    const result = await socialMediaManager.linkedin.sendLinkedInConnectionRequest(to, message || '');
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('LinkedIn connect error:', error);
    res.status(500).json({ error: error.message || 'Failed to send connection request' });
  }
});

/**
 * POST /api/social/linkedin/scrape
 * Scrape LinkedIn profile or company data
 */
router.post('/linkedin/scrape', async (req: Request, res: Response) => {
  try {
    const { url, type } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing required field: url' });
    }

    let result;
    if (type === 'company') {
      result = await socialMediaManager.linkedin.getLinkedInCompanyInfo(url);
    } else {
      result = await socialMediaManager.linkedin.scrapeLinkedInProfile(url);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('LinkedIn scrape error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape LinkedIn data' });
  }
});

/**
 * GET /api/social/linkedin/messages/:conversationId
 * Get LinkedIn conversation messages
 */
router.get('/linkedin/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const messages = await socialMediaManager.linkedin.getLinkedInMessages(conversationId);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('LinkedIn messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

// ==================== Twitter Routes ====================

/**
 * POST /api/social/twitter/send
 * Post a tweet
 */
router.post('/twitter/send', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Missing required field: content' });
    }

    if (content.length > 280) {
      return res.status(400).json({ error: 'Tweet content exceeds 280 characters' });
    }

    const result = await socialMediaManager.twitter.sendTweet(content);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Twitter send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send tweet' });
  }
});

/**
 * POST /api/social/twitter/dm
 * Send a Twitter direct message
 */
router.post('/twitter/dm', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    const result = await socialMediaManager.twitter.sendDM(to, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Twitter DM error:', error);
    res.status(500).json({ error: error.message || 'Failed to send DM' });
  }
});

/**
 * GET /api/social/twitter/mentions
 * Get account mentions
 */
router.get('/twitter/mentions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await socialMediaManager.twitter.getMentions(limit);
    res.json({ success: true, data: result.mentions || [] });
  } catch (error: any) {
    console.error('Twitter mentions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get mentions' });
  }
});

/**
 * GET /api/social/twitter/timeline
 * Get account timeline
 */
router.get('/twitter/timeline', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await socialMediaManager.twitter.getTimeline(limit);
    res.json({ success: true, data: result.timeline || [] });
  } catch (error: any) {
    console.error('Twitter timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get timeline' });
  }
});

/**
 * GET /api/social/twitter/search
 * Search tweets
 */
router.get('/twitter/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Missing required query parameter: q' });
    }

    const result = await socialMediaManager.twitter.searchTweets(query, limit);
    res.json({ success: true, data: result.searchResults || [] });
  } catch (error: any) {
    console.error('Twitter search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search tweets' });
  }
});

// ==================== TikTok Routes ====================

/**
 * POST /api/social/tiktok/send
 * Send a TikTok message
 */
router.post('/tiktok/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    const result = await socialMediaManager.tiktok.sendTikTokMessage(to, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('TikTok send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send TikTok message' });
  }
});

/**
 * GET /api/social/tiktok/analytics
 * Get TikTok analytics
 */
router.get('/tiktok/analytics', async (req: Request, res: Response) => {
  try {
    const result = await socialMediaManager.tiktok.getTikTokAnalytics();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('TikTok analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get analytics' });
  }
});

// ==================== Facebook Routes ====================

/**
 * POST /api/social/facebook/post
 * Post to Facebook page
 */
router.post('/facebook/post', async (req: Request, res: Response) => {
  try {
    const { content, groupId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Missing required field: content' });
    }

    let result;
    if (groupId) {
      result = await socialMediaManager.facebook.postToGroup(groupId, content);
    } else {
      result = await socialMediaManager.facebook.postToPage(content);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Facebook post error:', error);
    res.status(500).json({ error: error.message || 'Failed to post to Facebook' });
  }
});

/**
 * POST /api/social/facebook/send
 * Send Facebook Messenger message
 */
router.post('/facebook/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    const result = await socialMediaManager.instagram.sendFacebookMessage(to, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Facebook send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send Facebook message' });
  }
});

/**
 * GET /api/social/facebook/insights
 * Get Facebook page insights
 */
router.get('/facebook/insights', async (req: Request, res: Response) => {
  try {
    const result = await socialMediaManager.facebook.getPageInsights();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Facebook insights error:', error);
    res.status(500).json({ error: error.message || 'Failed to get page insights' });
  }
});

/**
 * POST /api/social/facebook/ad
 * Send Facebook ad message
 */
router.post('/facebook/ad', async (req: Request, res: Response) => {
  try {
    const { adAccountId, message } = req.body;

    if (!adAccountId || !message) {
      return res.status(400).json({ error: 'Missing required fields: adAccountId, message' });
    }

    const result = await socialMediaManager.facebook.sendFacebookAdMessage(adAccountId, message);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Facebook ad error:', error);
    res.status(500).json({ error: error.message || 'Failed to send ad' });
  }
});

// ==================== Status Route ====================

/**
 * GET /api/social/status
 * Get connection status for all platforms
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const statuses = await socialMediaManager.getAllPlatformStatus();
    res.json({ success: true, data: statuses });
  } catch (error: any) {
    console.error('Social media status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

export { router as socialMediaRoutes };
export default router;
