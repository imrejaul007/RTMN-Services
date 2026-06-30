/**
 * RAZO Keyboard - Communication OS v2.0 (Mass Adoption Ready)
 * Port 4299
 *
 * The keyboard that thinks — but you don't have to.
 *
 * v2.0 Modules:
 * - Core: Intent Router, Context Engine, Action Engine, Channel Bridge
 * - Magic Wand: One-tap "Help Me" button
 * - Emotion Detector: Universal emotion buttons
 * - Consumer Labels: Founder → consumer translation
 * - Voice Gateway: Voice-first interaction
 * - i18n: 6 languages with cultural adaptation
 * - Family Quick Reply: Relationship-aware responses
 * - Pay Anyone: Voice/Photo/Contact money transfer
 * - Auto Life Assistant: Proactive suggestions
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const IntentRouter = require('./intents/router');
const ChannelBridge = require('./channels/bridge');
const ContextEngine = require('./context/engine');
const ActionEngine = require('./actions/engine');
const intentRoutes = require('./routes/intents');
const messageRoutes = require('./routes/messages');
const sessionRoutes = require('./routes/sessions');
const webhookRoutes = require('./routes/webhooks');

// v2.0 Modules
const MagicWand = require('./core/magicWand');
const EmotionDetector = require('./core/emotionDetector');
const VoiceGateway = require('./core/voiceGateway');
const I18n = require('./core/i18n');
const FamilyQuickReply = require('./core/familyQuickReply');
const PayAnyone = require('./core/payAnyone');
const AutoLifeAssistant = require('./core/autoLifeAssistant');

const {
  createMagicRoutes,
  createEmotionRoutes,
  createModesRoutes,
  createVoiceRoutes,
  createI18nRoutes,
  createFamilyRoutes,
  createPayRoutes,
  createLifeRoutes
} = require('./routes/magic');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`, meta)
};

const PORT = process.env.PORT || 4299;

// ── Health check (BEFORE auth) ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-keyboard',
    version: '2.0.0',
    tagline: 'Your phone finally understands you.',
    port: PORT,
    timestamp: new Date().toISOString(),
    modules: {
      v1: ['intentRouter', 'contextEngine', 'actionEngine', 'channelBridge'],
      v2: ['magicWand', 'emotionDetector', 'voiceGateway', 'i18n', 'familyQuickReply', 'payAnyone', 'autoLifeAssistant']
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    v1: { intentRouter: true, contextEngine: true, actionEngine: true, channelBridge: true },
    v2: { magicWand: true, emotionDetector: true, voiceGateway: true, i18n: true, familyQuickReply: true, payAnyone: true, autoLifeAssistant: true }
  });
});

// ── Initialize v1 modules ─────────────────────────────────────────────
const intentRouter = new IntentRouter(logger);
const channelBridge = new ChannelBridge(logger);
const contextEngine = new ContextEngine(logger);
const actionEngine = new ActionEngine(logger, {
  genieGateway: process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
  doApp: process.env.DO_APP_URL || 'http://localhost:3001',
  sutar: process.env.SUTAR_GATEWAY_URL || 'http://localhost:4140',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  corpid: process.env.CORPID_URL || 'http://localhost:4300'
});

// ── Initialize v2 modules ─────────────────────────────────────────────
const voiceGateway = new VoiceGateway({ logger, gatewayUrl: process.env.VOICE_GATEWAY_URL || 'http://localhost:4880' });
const i18n = new I18n({ logger });
const familyQuickReply = new FamilyQuickReply({ intentRouter, contextEngine, logger });
const payAnyone = new PayAnyone({ logger, voiceGateway });
const autoLifeAssistant = new AutoLifeAssistant({ logger, i18n });
const emotionDetector = new EmotionDetector({ logger });
const magicWand = new MagicWand({ intentRouter, contextEngine, actionEngine, logger });

// ── v1 API Routes ─────────────────────────────────────────────────────
app.use('/api/intent', intentRoutes(intentRouter, contextEngine));
app.use('/api/message', messageRoutes(channelBridge));
app.use('/api/session', sessionRoutes(contextEngine));
app.use('/api/webhook', webhookRoutes(channelBridge));

// ── v2 API Routes ─────────────────────────────────────────────────────
app.use('/api/magic', createMagicRoutes(magicWand));
app.use('/api/emotion', createEmotionRoutes(emotionDetector));
app.use('/api/modes', createModesRoutes());
app.use('/api/voice', createVoiceRoutes(voiceGateway));
app.use('/api/i18n', createI18nRoutes(i18n));
app.use('/api/family', createFamilyRoutes(familyQuickReply));
app.use('/api/pay', createPayRoutes(payAnyone));
app.use('/api/life', createLifeRoutes(autoLifeAssistant));

// ── Root endpoint ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'RAZO Keyboard',
    tagline: 'Your phone finally understands you.',
    version: '2.0.0',
    description: 'The Communication OS for everyone',
    port: PORT,
    features: {
      v1: {
        intents: 22,
        services: 12,
        channels: 4,
        description: 'Foundation: intent detection, context, actions, channels'
      },
      v2: {
        magicWand: 'One-tap Help Me button (✨)',
        emotionButtons: 'Universal emotion responses (😡💝🤔⚡)',
        myMomMode: 'Simplified 8-button UI for non-technical users',
        voice: 'Push-to-talk + wake word + voice biometrics',
        languages: ['English', 'Hindi', 'Bengali', 'Assamese', 'Arabic', 'Urdu'],
        familyIntelligence: 'Relationship-aware replies for Mom/Dad/Spouse/etc.',
        payAnyone: 'Voice/QR/Contact money transfer with safety',
        autoLifeAssistant: 'Proactive suggestions (flight/rain/birthday/wallet)'
      }
    },
    endpoints: {
      health: '/health',
      v1: {
        intent: '/api/intent/detect',
        message: '/api/message/send',
        session: '/api/session/create',
        webhook: '/api/webhook/whatsapp'
      },
      v2: {
        magic: '/api/magic/help',
        emotion: '/api/emotion/analyze',
        momMode: '/api/modes/mom-mode',
        voice: '/api/voice/stt',
        translate: '/api/i18n/translate',
        family: '/api/family/reply',
        pay: '/api/pay/voice',
        life: '/api/life/check/:userId'
      }
    },
    goldenRules: [
      'Never make users type if tapping is possible',
      'Never make users think if RAZO can infer',
      'Never make users open another app if RAZO can execute'
    ]
  });
});

// ── Error handling ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { requestId: req.requestId, error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    }
  });
});

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`
    }
  });
});

// ── Start server ──────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 RAZO Keyboard v2.0 started on port ${PORT}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('v1.0 Modules:');
  logger.info(`  Intent Router: ${intentRouter.intents ? Object.keys(intentRouter.intents).length + ' intents' : 'ready'}`);
  logger.info(`  Context Engine: ready`);
  logger.info(`  Action Engine: ready`);
  logger.info(`  Channel Bridge: WhatsApp, Telegram, SMS, Email`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('v2.0 Modules (Mass Adoption):');
  logger.info(`  ✨ Magic Wand: One-tap Help Me`);
  logger.info(`  🆘 Emotion Detector: 4 universal buttons`);
  logger.info(`  📱 Consumer Labels: My Mom Mode + more`);
  logger.info(`  🎤 Voice Gateway: STT/TTS/Biometrics`);
  logger.info(`  🌍 i18n: 6 languages (en/hi/bn/as/ar/ur)`);
  logger.info(`  👨‍👩‍👧 Family Quick Reply: 8 relationship types`);
  logger.info(`  💰 Pay Anyone: Voice/QR/Contact`);
  logger.info(`  🔮 Auto Life Assistant: 10 proactive triggers`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('3 Golden Rules:');
  logger.info('  1. Never make users type if tapping is possible');
  logger.info('  2. Never make users think if RAZO can infer');
  logger.info('  3. Never make users open another app if RAZO can execute');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// ── Graceful shutdown ─────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  channelBridge.disconnect();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;