/**
 * RAZO Webhook Routes
 */

const express = require('express');
const router = express.Router();

module.exports = function(channelBridge) {
  /**
   * GET /api/webhook/whatsapp
   * WhatsApp webhook verification
   */
  router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const result = channelBridge.verifyWhatsAppWebhook(mode, token, challenge);

    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  });

  /**
   * POST /api/webhook/whatsapp
   * Receive WhatsApp messages
   */
  router.post('/whatsapp', async (req, res) => {
    try {
      // Acknowledge immediately
      res.status(200).send('OK');

      const { entry } = req.body;

      if (!entry || !entry[0]?.changes?.[0]?.value?.messages) {
        return;
      }

      const message = entry[0].changes[0].value.messages[0];
      const metadata = entry[0].changes[0].value.metadata;

      // Process message asynchronously
      processWhatsAppMessage(message, metadata).catch(console.error);

    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      // Still acknowledge to prevent retries
      res.status(200).send('OK');
    }
  });

  /**
   * POST /api/webhook/telegram
   * Receive Telegram updates
   */
  router.post('/telegram', async (req, res) => {
    try {
      const update = req.body;

      // Acknowledge immediately
      res.status(200).send('OK');

      if (update.message) {
        await processTelegramMessage(update.message);
      }

    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.status(200).send('OK');
    }
  });

  /**
   * POST /api/webhook/sms
   * Receive SMS (Twilio)
   */
  router.post('/sms', (req, res) => {
    const { From, Body, To } = req.body;

    // Acknowledge
    res.status(200).send('');

    console.log(`SMS from ${From}: ${Body}`);

    // Process SMS - in production, queue this
    // processSMS(From, Body).catch(console.error);
  });

  /**
   * POST /api/webhook/email
   * Receive email replies
   */
  router.post('/email', (req, res) => {
    const { from, subject, text, html } = req.body;

    // Acknowledge
    res.status(200).send('OK');

    console.log(`Email from ${from}: ${subject}`);

    // Process email - in production, queue this
    // processEmail(from, subject, text).catch(console.error);
  });

  /**
   * GET /api/webhook/telegram/verify
   * Telegram webhook verification
   */
  router.get('/telegram/verify', (req, res) => {
    const token = req.query.token;
    if (token === process.env.TELEGRAM_WEBHOOK_TOKEN) {
      res.status(200).send('OK');
    } else {
      res.status(403).send('Forbidden');
    }
  });

  return router;
};

/**
 * Process incoming WhatsApp message
 */
async function processWhatsAppMessage(message, metadata) {
  const { from, id, text, type } = message;
  const phoneNumberId = metadata?.phone_number_id;

  console.log(`WhatsApp message from ${from}:`, text?.body || type);

  // Here you would:
  // 1. Detect intent
  // 2. Execute action
  // 3. Send response via WhatsApp

  const IntentRouter = require('../intents/router');
  const ContextEngine = require('../context/engine');
  const ActionEngine = require('../actions/engine');
  const ChannelBridge = require('../channels/bridge');

  const intentRouter = new IntentRouter(console);
  const contextEngine = new ContextEngine(console);
  const actionEngine = new ActionEngine(console, {
    genieGateway: process.env.GENIE_GATEWAY_URL,
    doApp: process.env.DO_APP_URL
  });
  const channelBridge = new ChannelBridge(console);

  // Detect intent
  const messageText = text?.body || '';
  const intent = await intentRouter.detect(messageText);

  if (intent.intent) {
    // Execute action
    const result = await actionEngine.execute(intent, intent.entities, {
      userId: from,
      phoneNumberId
    });

    // Send response
    const response = result.success
      ? `Done! ${JSON.stringify(result.result)}`
      : `Sorry, I couldn't process that. Please try again.`;

    await channelBridge.sendWhatsApp(from, response);
  }
}

/**
 * Process incoming Telegram message
 */
async function processTelegramMessage(message) {
  const { chat, from, text } = message;

  console.log(`Telegram message from ${from?.first_name}:`, text);

  // Similar processing as WhatsApp
  const IntentRouter = require('../intents/router');
  const ChannelBridge = require('../channels/bridge');

  const intentRouter = new IntentRouter(console);
  const channelBridge = new ChannelBridge(console);

  const messageText = text || '';
  const intent = await intentRouter.detect(messageText);

  if (intent.intent) {
    await channelBridge.sendTelegram(chat.id, `Processing: ${intent.intent}`);
  }
}
