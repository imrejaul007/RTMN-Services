/**
 * REZ SalesMind - Unified Communication Routes
 * REST API endpoints for unified communication hub
 */

import { Router, Request, Response } from 'express';
import { unifiedComms, ChannelType, Contact, UnifiedMessage } from '../services/unifiedComms.js';

const router = Router();

// ==================== Message Sending ====================

/**
 * POST /api/comms/send
 * Send a message across one or more channels
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { contactId, contact, message, channels, subject, metadata } = req.body;

    if (!message || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ error: 'Missing required fields: message, channels (array)' });
    }

    let contactObj: Contact;

    // Get or use provided contact
    if (contactId) {
      const existing = await unifiedComms.getContact(contactId);
      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      contactObj = existing;
    } else if (contact) {
      contactObj = await unifiedComms.saveContact(contact as Contact);
    } else {
      return res.status(400).json({ error: 'Either contactId or contact object is required' });
    }

    const result = await unifiedComms.sendUnifiedMessage(contactObj, message, channels, { subject, metadata });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

/**
 * POST /api/comms/schedule
 * Schedule a message for future delivery
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { contactId, contact, message, schedule, channels, subject, metadata } = req.body;

    if (!message || !schedule || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ error: 'Missing required fields: message, schedule, channels' });
    }

    const scheduleDate = new Date(schedule);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ error: 'Invalid schedule date' });
    }

    if (scheduleDate <= new Date()) {
      return res.status(400).json({ error: 'Schedule date must be in the future' });
    }

    let contactObj: Contact;

    if (contactId) {
      const existing = await unifiedComms.getContact(contactId);
      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      contactObj = existing;
    } else if (contact) {
      contactObj = await unifiedComms.saveContact(contact as Contact);
    } else {
      return res.status(400).json({ error: 'Either contactId or contact object is required' });
    }

    const result = await unifiedComms.scheduleUnifiedMessage(
      contactObj,
      message,
      scheduleDate,
      channels,
      { subject, metadata }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Schedule message error:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule message' });
  }
});

/**
 * DELETE /api/comms/schedule/:scheduleId
 * Cancel a scheduled message
 */
router.delete('/schedule/:scheduleId', async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const success = await unifiedComms.cancelScheduledMessage(scheduleId);

    if (!success) {
      return res.status(404).json({ error: 'Scheduled message not found' });
    }

    res.json({ success: true, message: 'Scheduled message cancelled' });
  } catch (error: any) {
    console.error('Cancel scheduled message error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel message' });
  }
});

// ==================== Inbox ====================

/**
 * GET /api/comms/inbox
 * Get unified inbox
 */
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const channel = req.query.channel as ChannelType | undefined;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await unifiedComms.getUnifiedInbox({ channel, isRead, limit, offset });
    res.json({ success: true, data: result.items, meta: { total: result.total, limit, offset } });
  } catch (error: any) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: error.message || 'Failed to get inbox' });
  }
});

/**
 * GET /api/comms/inbox/:id
 * Get a specific inbox item
 */
router.get('/inbox/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inboxItems = await unifiedComms.getUnifiedInbox();
    const item = inboxItems.items.find(i => i.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Get inbox item error:', error);
    res.status(500).json({ error: error.message || 'Failed to get inbox item' });
  }
});

/**
 * PUT /api/comms/inbox/:id/read
 * Mark inbox item as read
 */
router.put('/inbox/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await unifiedComms.markAsRead(id);

    if (!success) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

/**
 * PUT /api/comms/inbox/:id/archive
 * Archive inbox item
 */
router.put('/inbox/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await unifiedComms.archiveMessage(id);

    if (!success) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    res.json({ success: true, message: 'Archived' });
  } catch (error: any) {
    console.error('Archive error:', error);
    res.status(500).json({ error: error.message || 'Failed to archive' });
  }
});

// ==================== Conversations ====================

/**
 * GET /api/comms/conversation/:contactId
 * Get conversation history with a contact
 */
router.get('/conversation/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const allChannels = req.query.allChannels !== 'false';

    const conversations = await unifiedComms.getConversationHistory(contactId, allChannels);
    res.json({ success: true, data: conversations });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversation' });
  }
});

/**
 * GET /api/comms/conversation/:contactId/channel/:channel
 * Get conversation history with a contact on specific channel
 */
router.get('/conversation/:contactId/channel/:channel', async (req: Request, res: Response) => {
  try {
    const { contactId, channel } = req.params;

    const conversations = await unifiedComms.getConversationHistory(contactId, false);
    const channelConv = conversations.find(c => c.channel === channel);

    if (!channelConv) {
      return res.json({ success: true, data: { contactId, channel, messages: [] } });
    }

    res.json({ success: true, data: channelConv });
  } catch (error: any) {
    console.error('Get channel conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversation' });
  }
});

// ==================== Messages ====================

/**
 * GET /api/comms/message/:id
 * Get a specific message
 */
router.get('/message/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await unifiedComms.getMessage(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ error: error.message || 'Failed to get message' });
  }
});

/**
 * PUT /api/comms/message/:id/read
 * Mark message as read
 */
router.put('/message/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await unifiedComms.markAsRead(id);

    if (!success) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

/**
 * GET /api/comms/contact/:contactId/messages
 * Get all messages for a contact
 */
router.get('/contact/:contactId/messages', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const messages = await unifiedComms.getContactMessages(contactId);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

// ==================== Channels ====================

/**
 * GET /api/comms/channels
 * Get status of all channels
 */
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const statuses = await unifiedComms.getChannelStatus();
    res.json({ success: true, data: statuses });
  } catch (error: any) {
    console.error('Get channel status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get channel status' });
  }
});

/**
 * POST /api/comms/channels/:channel/connect
 * Connect a new channel
 */
router.post('/channels/:channel/connect', async (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { credentials } = req.body;

    const validChannels: ChannelType[] = ['email', 'sms', 'whatsapp', 'call', 'linkedin', 'instagram', 'facebook', 'twitter'];
    if (!validChannels.includes(channel as ChannelType)) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }

    const result = await unifiedComms.connectChannel(channel as ChannelType, credentials || {});
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    console.error('Connect channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to connect channel' });
  }
});

/**
 * POST /api/comms/channels/:channel/disconnect
 * Disconnect a channel
 */
router.post('/channels/:channel/disconnect', async (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const result = await unifiedComms.disconnectChannel(channel as ChannelType);
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    console.error('Disconnect channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to disconnect channel' });
  }
});

// ==================== Contacts ====================

/**
 * GET /api/comms/contacts
 * Get all contacts
 */
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const contacts = await unifiedComms.getAllContacts();
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get contacts' });
  }
});

/**
 * GET /api/comms/contacts/:id
 * Get a specific contact
 */
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contact = await unifiedComms.getContact(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (error: any) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: error.message || 'Failed to get contact' });
  }
});

/**
 * POST /api/comms/contacts
 * Create or update a contact
 */
router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const contact = req.body;

    if (!contact.name) {
      return res.status(400).json({ error: 'Contact name is required' });
    }

    const saved = await unifiedComms.saveContact(contact as Contact);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    console.error('Save contact error:', error);
    res.status(500).json({ error: error.message || 'Failed to save contact' });
  }
});

/**
 * PUT /api/comms/contacts/:id
 * Update a contact
 */
router.put('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await unifiedComms.getContact(id);

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const updated = { ...existing, ...req.body, id };
    const saved = await unifiedComms.saveContact(updated);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: error.message || 'Failed to update contact' });
  }
});

// ==================== Scheduled ====================

/**
 * GET /api/comms/scheduled
 * Get all scheduled messages
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const scheduled = await unifiedComms.getScheduledMessages();
    res.json({ success: true, data: scheduled });
  } catch (error: any) {
    console.error('Get scheduled error:', error);
    res.status(500).json({ error: error.message || 'Failed to get scheduled messages' });
  }
});

// ==================== Statistics ====================

/**
 * GET /api/comms/stats
 * Get communication statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await unifiedComms.getCommsStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

/**
 * GET /api/comms/auto-select
 * Auto-select best channel for a contact
 */
router.get('/auto-select', async (req: Request, res: Response) => {
  try {
    const { contactId, preferredChannels } = req.query;

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const contact = await unifiedComms.getContact(contactId as string);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const channels = (preferredChannels as string || 'email,whatsapp,linkedin').split(',') as ChannelType[];
    const selected = await unifiedComms.autoSelectChannel(channels, contact);

    res.json({
      success: true,
      data: {
        selectedChannel: selected,
        contact,
        attemptedChannels: channels,
      },
    });
  } catch (error: any) {
    console.error('Auto-select error:', error);
    res.status(500).json({ error: error.message || 'Failed to select channel' });
  }
});

export { router as unifiedCommsRoutes };
export default router;
