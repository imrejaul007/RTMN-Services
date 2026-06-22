import express from 'express';
import { whatsappService } from '../services/whatsappService.js';
import { conversationService } from '../services/conversationService.js';
import { aiService } from '../services/aiService.js';

const router = express.Router();

// Verify webhook
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle incoming messages
router.post('/webhook', async (req, res) => {
  try {
    const { entry } = req.body;
    const changes = entry?.[0]?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from;
    const customerName = changes?.value?.contacts?.[0]?.profile?.name;

    // Mark as read
    await whatsappService.markAsRead(message.id);

    // Get or create conversation
    const merchantId = process.env.MERCHANT_ID || '';
    const tenantId = process.env.TENANT_ID || '';

    const conversation = await conversationService.getOrCreateConversation(
      tenantId,
      merchantId,
      from,
      from,
      customerName
    );

    const conversationId = conversation.id;

    // Store inbound message
    await conversationService.addMessage({
      tenantId,
      merchantId,
      conversationId,
      messageId: message.id,
      direction: 'inbound',
      role: 'user',
      content: message.text?.body || ''
    });

    // Get conversation history
    const history = await conversationService.getHistory(conversationId, 10);

    // Process with AI
    const aiResult = await aiService.generateResponse({
      tenantId,
      merchantId,
      userMessage: message.text?.body || '',
      conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
      customerContext: {
        customerName,
        messageCount: conversation.messageCount || 0
      }
    });

    // Send AI response
    await whatsappService.sendTextMessage(from, aiResult.response);

    // Store outbound message
    await conversationService.addMessage({
      tenantId,
      merchantId,
      conversationId,
      messageId: `outbound_${Date.now()}`,
      direction: 'outbound',
      role: 'assistant',
      content: aiResult.response,
      type: 'text',
      intent: aiResult.intent,
      confidence: aiResult.confidence
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

export default router;
