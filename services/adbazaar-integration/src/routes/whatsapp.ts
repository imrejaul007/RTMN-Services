import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSync } from '../services/twinSync';
import { AdBazaarWhatsAppMessage } from '../models/AdBazaarProfile';

export default function whatsappRoutes(
  customerOpsBridge: CustomerOpsBridge,
  twinSync: TwinSync,
  logger: any
): Router {
  const router = Router();

  /**
   * POST /api/whatsapp/webhook
   * Webhook for incoming WhatsApp messages
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const { entry } = req.body;

      // Process each entry
      for (const changes of entry) {
        for (const change of changes.changes) {
          const messages = change.value?.messages || [];

          for (const message of messages) {
            const waMessage: AdBazaarWhatsAppMessage = {
              id: message.id || uuidv4(),
              from: message.from,
              to: message.to,
              direction: 'inbound',
              type: message.type,
              content: message.text?.body || '',
              mediaUrl: message.image?.url || message.video?.url || message.document?.url,
              status: 'delivered',
              timestamp: new Date().toISOString(),
              metadata: {
                waMessageId: message.id,
                businessAccountId: change.value?.metadata?.phone_number_id
              }
            };

            // Find profile by phone
            const profileTwin = await twinSync.findCustomerTwinByPhone(waMessage.from);

            if (profileTwin) {
              // Update Customer Twin with WhatsApp activity
              await twinSync.syncToCustomerTwin({
                sourceId: profileTwin.id,
                source: 'whatsapp',
                customer: {
                  id: profileTwin.id,
                  whatsappNumber: waMessage.from,
                  whatsappLastMessage: waMessage.content,
                  whatsappLastMessageDate: waMessage.timestamp,
                  whatsappOptIn: true
                }
              });

              // Send to Customer Operations
              await customerOpsBridge.sendWhatsAppToCustomerOps({
                source: 'whatsapp',
                message: waMessage,
                customerId: profileTwin.id
              });
            }

            logger.info('WhatsApp webhook message received', {
              messageId: waMessage.id,
              from: waMessage.from,
              type: waMessage.type
            });
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('WhatsApp webhook processing failed', { error });
      res.status(500).send('Error processing webhook');
    }
  });

  /**
   * POST /api/whatsapp/messages
   * Send a WhatsApp message
   */
  router.post('/messages', async (req: Request, res: Response) => {
    try {
      const { to, message, type = 'text', templateId, campaignId, leadId } = req.body;

      // Get customer/lead info from Twin
      let customerTwin = null;
      if (leadId) {
        customerTwin = await twinSync.getLeadTwinBySourceId(leadId, 'lead-intelligence');
      } else {
        customerTwin = await twinSync.findCustomerTwinByPhone(to);
      }

      // Prepare message
      const waMessage: AdBazaarWhatsAppMessage = {
        id: uuidv4(),
        from: '', // Will be filled by WhatsApp API
        to,
        direction: 'outbound',
        type,
        content: message,
        status: 'sent',
        timestamp: new Date().toISOString(),
        campaignId,
        leadId,
        profileId: customerTwin?.id
      };

      // Send via Customer Operations (which forwards to WhatsApp)
      const result = await customerOpsBridge.sendWhatsAppMessage({
        to,
        message,
        type,
        templateId,
        campaignId,
        messageId: waMessage.id
      });

      // Update Customer Twin
      if (customerTwin) {
        await twinSync.syncToCustomerTwin({
          sourceId: customerTwin.id,
          source: 'whatsapp',
          customer: {
            id: customerTwin.id,
            whatsappLastMessage: message,
            whatsappLastMessageDate: new Date().toISOString()
          }
        });
      }

      logger.info('WhatsApp message sent', {
        messageId: waMessage.id,
        to,
        campaignId
      });

      res.status(201).json({
        success: true,
        message: {
          id: waMessage.id,
          to,
          status: result.status
        }
      });
    } catch (error) {
      logger.error('Failed to send WhatsApp message', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  });

  /**
   * POST /api/whatsapp/messages/bulk
   * Send bulk WhatsApp messages
   */
  router.post('/messages/bulk', async (req: Request, res: Response) => {
    try {
      const { recipients, message, type = 'text', templateId, campaignId } = req.body;

      const results = await Promise.all(
        recipients.map(async (recipient: any) => {
          try {
            const result = await customerOpsBridge.sendWhatsAppMessage({
              to: recipient.phone,
              message,
              type,
              templateId,
              campaignId,
              metadata: recipient.metadata
            });

            return {
              phone: recipient.phone,
              success: true,
              messageId: result.messageId
            };
          } catch (err) {
            return {
              phone: recipient.phone,
              success: false,
              error: String(err)
            };
          }
        })
      );

      logger.info('WhatsApp bulk messages sent', {
        total: recipients.length,
        successful: results.filter((r: any) => r.success).length
      });

      res.json({
        success: true,
        results,
        summary: {
          total: recipients.length,
          successful: results.filter((r: any) => r.success).length,
          failed: results.filter((r: any) => !r.success).length
        }
      });
    } catch (error) {
      logger.error('Failed to send bulk WhatsApp messages', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send bulk messages'
      });
    }
  });

  /**
   * GET /api/whatsapp/messages/:id
   * Get message status
   */
  router.get('/messages/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get message status from Customer Operations
      const status = await customerOpsBridge.getWhatsAppMessageStatus(id);

      res.json({
        success: true,
        messageId: id,
        status
      });
    } catch (error) {
      logger.error('Failed to get WhatsApp message status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get message status'
      });
    }
  });

  /**
   * GET /api/whatsapp/conversations/:phone
   * Get conversation history
   */
  router.get('/conversations/:phone', async (req: Request, res: Response) => {
    try {
      const { phone } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Get conversation from Customer Operations
      const conversation = await customerOpsBridge.getWhatsAppConversation(phone, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        phone,
        conversation
      });
    } catch (error) {
      logger.error('Failed to get WhatsApp conversation', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation'
      });
    }
  });

  /**
   * POST /api/whatsapp/opt-in
   * Register WhatsApp opt-in
   */
  router.post('/opt-in', async (req: Request, res: Response) => {
    try {
      const { phone, customerId, consentSource } = req.body;

      // Find and update Customer Twin
      let customerTwin = await twinSync.findCustomerTwinByPhone(phone);

      if (!customerTwin && customerId) {
        customerTwin = await twinSync.getLeadTwinBySourceId(customerId, 'lead-intelligence');
      }

      if (customerTwin) {
        await twinSync.syncToCustomerTwin({
          sourceId: customerTwin.id,
          source: 'whatsapp',
          customer: {
            id: customerTwin.id,
            whatsappNumber: phone,
            whatsappOptIn: true,
            whatsappConsentDate: new Date().toISOString(),
            consentSource
          }
        });
      }

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('whatsapp.optIn', {
        phone,
        customerId: customerTwin?.id,
        consentSource,
        timestamp: new Date().toISOString()
      });

      logger.info('WhatsApp opt-in registered', { phone });

      res.json({
        success: true,
        phone,
        optIn: true
      });
    } catch (error) {
      logger.error('Failed to register WhatsApp opt-in', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to register opt-in'
      });
    }
  });

  /**
   * POST /api/whatsapp/opt-out
   * Handle WhatsApp opt-out
   */
  router.post('/opt-out', async (req: Request, res: Response) => {
    try {
      const { phone, reason } = req.body;

      // Find and update Customer Twin
      const customerTwin = await twinSync.findCustomerTwinByPhone(phone);

      if (customerTwin) {
        await twinSync.syncToCustomerTwin({
          sourceId: customerTwin.id,
          source: 'whatsapp',
          customer: {
            id: customerTwin.id,
            whatsappOptIn: false,
            whatsappOptOutDate: new Date().toISOString(),
            whatsappOptOutReason: reason
          }
        });
      }

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('whatsapp.optOut', {
        phone,
        customerId: customerTwin?.id,
        reason,
        timestamp: new Date().toISOString()
      });

      logger.info('WhatsApp opt-out registered', { phone, reason });

      res.json({
        success: true,
        phone,
        optIn: false
      });
    } catch (error) {
      logger.error('Failed to register WhatsApp opt-out', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to register opt-out'
      });
    }
  });

  /**
   * POST /api/whatsapp/templates
   * Create a message template
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const template = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };

      // Register template with Customer Operations
      await customerOpsBridge.registerWhatsAppTemplate(template);

      logger.info('WhatsApp template created', { templateId: template.id });

      res.status(201).json({
        success: true,
        template
      });
    } catch (error) {
      logger.error('Failed to create WhatsApp template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }
  });

  /**
   * GET /api/whatsapp/templates/:id
   * Get template by ID
   */
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await customerOpsBridge.getWhatsAppTemplate(id);

      res.json({
        success: true,
        template
      });
    } catch (error) {
      logger.error('Failed to get WhatsApp template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get template'
      });
    }
  });

  return router;
}
