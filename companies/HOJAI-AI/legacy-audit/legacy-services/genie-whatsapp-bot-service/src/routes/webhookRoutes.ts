/**
 * WhatsApp Webhook Routes
 */
import { Router, Request, Response } from 'express';
import * as botService from '../services/whatsappBotService.js';

const router = Router();

// WhatsApp webhook verification
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'genie_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// WhatsApp incoming messages
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        for (const message of change.value?.messages || []) {
          // Send to Genie WhatsApp Bot
          await botService.handleIncomingMessage({
            from: message.from,
            to: message.to,
            body: message.text?.body || '',
            timestamp: message.timestamp,
            id: message.id,
            type: message.type,
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Error');
  }
});

export default router;
