import { Router, Request, Response } from 'express';
import { whatsAppService } from '../services';
import { asyncHandler, optionalAuth } from '../middleware';
import { IWhatsAppWebhookPayload } from '../types';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/v1/whatsapp/webhook
 * Verify WhatsApp webhook
 */
router.get(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const verifiedToken = whatsAppService.verifyWebhook(mode, token, challenge);

    if (verifiedToken) {
      res.status(200).send(verifiedToken);
    } else {
      res.status(403).send('Forbidden');
    }
  })
);

/**
 * POST /api/v1/whatsapp/webhook
 * Handle incoming WhatsApp messages
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify webhook signature in production
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature && process.env.WHATSAPP_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (`sha256=${expectedSignature}` !== signature) {
        res.status(403).send('Invalid signature');
        return;
      }
    }

    const payload = req.body as IWhatsAppWebhookPayload;

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Process messages asynchronously
    const { messages } = await whatsAppService.processWebhook(payload);

    for (const message of messages) {
      // Get clinic ID from the webhook (would be configured per phone number)
      const clinicId = req.body.clinicId || 'default';

      try {
        const response = await whatsAppService.handleIncomingMessage(clinicId, message);

        // Send response
        await whatsAppService.sendMessage(message.from, response);

        // Mark as read
        await whatsAppService.markAsRead(message.messageId);
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
      }
    }
  })
);

/**
 * POST /api/v1/whatsapp/send
 * Send a WhatsApp message (authenticated)
 */
router.post(
  '/send',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { to, message, templateName, languageCode, components } = req.body;

    if (!to) {
      res.status(400).json({ success: false, error: 'Recipient phone number is required' });
      return;
    }

    try {
      if (templateName) {
        const result = await whatsAppService.sendTemplateMessage(to, templateName, languageCode, components);
        res.json({ success: true, data: result });
      } else if (message) {
        const result = await whatsAppService.sendMessage(to, message);
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: 'Either message or templateName is required' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

/**
 * POST /api/v1/whatsapp/reminder
 * Send appointment reminder via WhatsApp
 */
router.post(
  '/reminder',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { patientPhone, patientName, appointmentDate, appointmentTime, doctorName, clinicName } = req.body;

    if (!patientPhone || !patientName || !appointmentDate || !appointmentTime) {
      res.status(400).json({
        success: false,
        error: 'patientPhone, patientName, appointmentDate, and appointmentTime are required',
      });
      return;
    }

    try {
      await whatsAppService.sendAppointmentReminder(
        patientPhone,
        patientName,
        new Date(appointmentDate),
        appointmentTime,
        doctorName || 'the doctor',
        clinicName || 'our clinic'
      );

      res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

/**
 * POST /api/v1/whatsapp/prescription-ready
 * Send prescription ready notification
 */
router.post(
  '/prescription-ready',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { patientPhone, patientName, clinicName } = req.body;

    if (!patientPhone || !patientName) {
      res.status(400).json({ success: false, error: 'patientPhone and patientName are required' });
      return;
    }

    try {
      await whatsAppService.sendPrescriptionReady(
        patientPhone,
        patientName,
        clinicName || 'our clinic'
      );

      res.json({ success: true, message: 'Notification sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

/**
 * POST /api/v1/whatsapp/follow-up
 * Send follow-up reminder
 */
router.post(
  '/follow-up',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { patientPhone, patientName, followUpDate, clinicName } = req.body;

    if (!patientPhone || !patientName || !followUpDate) {
      res.status(400).json({
        success: false,
        error: 'patientPhone, patientName, and followUpDate are required',
      });
      return;
    }

    try {
      await whatsAppService.sendFollowUpReminder(
        patientPhone,
        patientName,
        new Date(followUpDate),
        clinicName || 'our clinic'
      );

      res.json({ success: true, message: 'Follow-up reminder sent successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  })
);

export default router;
