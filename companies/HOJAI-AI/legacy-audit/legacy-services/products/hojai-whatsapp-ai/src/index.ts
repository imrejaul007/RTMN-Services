import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyWhatsAppSignature, verifyWebhookChallenge } from './middleware/webhookAuth.js';
import { merchantService } from './services/merchantService.js';
import { conversationService } from './services/conversationService.js';
import { openaiService } from './services/openaiService.js';
import { sessionService } from './services/tenantService.js';
import { whatsappService } from './services/whatsappService.js';
import { signalBridge } from './services/bridgeService.js';
import { merchantIntegration } from './services/merchantIntegration.js';
import merchantRoutes from './routes/merchantRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';

// ============================================================================
// APP SETUP
// ============================================================================

const app = express();
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// CONFIG
// ============================================================================

const PORT = process.env.PORT || 4570;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-whatsapp';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hojai-verify-token';
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || 'hojai-webhook-secret';
const REZ_BRIDGE_ENABLED = process.env.REZ_BRIDGE_ENABLED === 'true';

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-whatsapp-ai',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'demo_mode',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'demo_mode',
    rez_bridge: REZ_BRIDGE_ENABLED ? 'enabled' : 'disabled'
  });
});

// ============================================================================
// WHATSAPP WEBHOOK
// ============================================================================

// Verify webhook
app.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = verifyWebhookChallenge(
    String(mode || ''),
    String(token || ''),
    String(challenge || ''),
    WHATSAPP_VERIFY_TOKEN
  );

  if (result.verified) {
    console.log('[Webhook] Verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle incoming messages
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!verifyWhatsAppSignature(JSON.stringify(req.body), signature, WHATSAPP_WEBHOOK_SECRET)) {
    console.error('[Webhook] Invalid signature');
    return res.sendStatus(403);
  }

  try {
    const { entry } = req.body;
    const changes = entry?.[0]?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages?.length) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const phoneNumberId = changes?.value?.metadata?.phone_number_id;
    const from = message.from;

    console.log(`[Webhook] Message from ${from}`);

    // Process asynchronously
    processMessage(phoneNumberId, message, changes?.value).catch(err => {
      console.error('[Webhook] Processing error:', err);
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.sendStatus(500);
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api', merchantRoutes);
app.use('/', onboardingRoutes);

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

async function processMessage(phoneNumberId: string, message: any, value: any) {
  const from = message.from;
  const customerName = value?.contacts?.[0]?.profile?.name || 'Customer';
  const messageContent = message.text?.body || '';

  // Get merchant
  const merchant = await merchantService.getMerchantByTenantId(
    process.env.TENANT_ID || 'demo'
  );

  if (!merchant) {
    console.error('[Process] No merchant configured');
    return;
  }

  // Create/get conversation
  const conversation = await conversationService.getOrCreateConversation(
    merchant.tenantId,
    merchant.id,
    from,
    from,
    customerName
  );

  // Store inbound message
  await conversationService.addMessage({
    tenantId: merchant.tenantId,
    merchantId: merchant.id,
    conversationId: conversation.id,
    messageId: message.id,
    direction: 'inbound',
    role: 'user',
    content: messageContent
  });

  // Get context
  const [knowledgeBase, history, session] = await Promise.all([
    merchantService.getKnowledgeBase(merchant.id),
    conversationService.getHistory(conversation.id, 10),
    sessionService.getSession(merchant.id, from)
  ]);

  // Get REZ Merchant context (orders, menu, availability)
  let merchantContext = {};
  if (process.env.REZ_MERCHANT_URL) {
    try {
      const context = await merchantIntegration.getContext(merchant.id, from);
      if (context) {
        merchantContext = {
          merchantName: context.merchant.name,
          businessType: context.merchant.businessType,
          features: context.merchant.features,
          customerLoyalty: context.customer?.loyaltyTier,
          customerPoints: context.customer?.loyaltyPoints,
          recentOrders: context.orders.slice(0, 3).map(o => ({
            date: o.createdAt,
            total: o.total,
            status: o.status
          })),
          availableSlots: context.availability.slots.slice(0, 5)
        };
      }
    } catch (e) {
      console.log('[Merchant] Context not available');
    }
  }

  // Get REZ enrichment if bridge enabled
  let enrichedContext = session?.context;
  if (REZ_BRIDGE_ENABLED && session?.userId) {
    try {
      enrichedContext = await signalBridge.getEnrichedContext(session.userId, {
        ...session?.context
      });
    } catch (e) {
      console.log('[Bridge] No REZ context available');
    }
  }

  // Generate AI response with merchant + REZ context
  const aiResponse = await openaiService.generateResponse({
    merchantPersona: merchant.persona || 'Friendly assistant',
    knowledgeBase,
    userMessage: messageContent,
    conversationHistory: history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    customerName,
    customerContext: {
      ...enrichedContext,
      ...merchantContext
    }
  });

  console.log(`[AI] Intent: ${aiResponse.intent} (${aiResponse.confidence})`);

  // Store outbound message
  await conversationService.addMessage({
    tenantId: merchant.tenantId,
    merchantId: merchant.id,
    conversationId: conversation.id,
    messageId: `out_${Date.now()}`,
    direction: 'outbound',
    role: 'assistant',
    content: aiResponse.response
  });

  // Update session
  await sessionService.saveSession(merchant.id, from, {
    tenantId: merchant.tenantId,
    context: {
      lastIntent: aiResponse.intent,
      ...(session?.context || {})
    },
    state: 'resolved'
  });

  // Emit signals to REZ (if enabled)
  if (REZ_BRIDGE_ENABLED && session?.userId) {
    await emitSignals(merchant, session.userId, from, aiResponse);
  }

  // Send via WhatsApp
  const sent = await whatsappService.sendTextMessage(from, aiResponse.response);

  if (sent.success) {
    console.log(`[WhatsApp] Sent to ${from}`);
  } else {
    console.log(`[WhatsApp] Demo: ${aiResponse.response.substring(0, 50)}...`);
  }
}

// ============================================================================
// SIGNAL EMISSION TO REZ
// ============================================================================

async function emitSignals(
  merchant: any,
  userId: string,
  phone: string,
  aiResponse: { intent: string; confidence: number }
) {
  try {
    // Emit engagement signal
    await signalBridge.emitEngagement({
      userId,
      merchantId: merchant.id,
      action: 'message',
      metadata: {
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        channel: 'whatsapp'
      }
    });

    // Emit behavioral signal
    await signalBridge.emitBehavioralSignal({
      userId,
      merchantId: merchant.id,
      signal: aiResponse.intent,
      value: aiResponse.confidence
    });

    console.log('[Bridge] Signals emitted to REZ');
  } catch (error) {
    console.error('[Bridge] Signal emission failed:', error);
    // Don't fail the message processing
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
  });
});

// ============================================================================
// START
// ============================================================================

async function start() {
  console.log('[Hojai WhatsApp AI] Starting...');

  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected to', MONGODB_URI);

  console.log('[WhatsApp]', process.env.WHATSAPP_ACCESS_TOKEN ? 'API configured' : 'Demo mode');
  console.log('[OpenAI]', process.env.OPENAI_API_KEY ? 'Configured' : 'Demo mode');
  console.log('[REZ Bridge]', REZ_BRIDGE_ENABLED ? 'Enabled' : 'Disabled');
  console.log('[Redis]', process.env.REDIS_URL ? 'Configured' : 'Using mock');

  app.listen(PORT, () => {
    console.log(`[Hojai WhatsApp AI] Running on port ${PORT}`);
    console.log(`[Hojai WhatsApp AI] Webhook: /webhook/whatsapp`);
    console.log(`[Hojai WhatsApp AI] Health: http://localhost:${PORT}/health`);
  });
}

process.on('SIGTERM', async () => {
  console.log('[Hojai WhatsApp AI] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Hojai WhatsApp AI] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

start().catch((error) => {
  console.error('[Hojai WhatsApp AI] Failed to start:', error);
  process.exit(1);
});

export default app;
