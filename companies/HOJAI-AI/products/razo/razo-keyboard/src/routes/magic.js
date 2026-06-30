/**
 * API Routes for new RAZO features
 *
 * /api/magic/* - Magic Wand (one-tap help)
 * /api/emotion/* - Emotion detection + buttons
 * /api/modes/* - Mode management (Mom Mode, etc.)
 * /api/voice/* - Voice gateway integration
 * /api/i18n/* - Language detection + translation + greetings
 * /api/family/* - Family quick reply
 * /api/pay/* - Pay anyone
 * /api/life/* - Auto life assistant
 */

const express = require('express');

function createMagicRoutes(magicWand) {
  const router = express.Router();

  // Help Me - one-tap magic
  router.post('/help', async (req, res) => {
    try {
      const { text, userId, sessionId, language } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_TEXT', message: 'text required' } });
      }
      const result = await magicWand.helpMe({ text, userId, sessionId, language });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Execute recommended action
  router.post('/execute', async (req, res) => {
    try {
      const { requestId, userId, sessionId } = req.body;
      const result = await magicWand.executeRecommended({ requestId, userId, sessionId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Stats
  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: magicWand.getStats() });
  });

  return router;
}

function createEmotionRoutes(emotionDetector) {
  const router = express.Router();

  // Analyze message for emotion
  router.post('/analyze', async (req, res) => {
    try {
      const { message, behavior } = req.body;
      const result = emotionDetector.analyze(message);
      const signals = emotionDetector.detectBehaviorSignals(behavior || {});
      const suggestion = emotionDetector.suggestEmotionButton(result, signals);
      res.json({ success: true, emotion: result, behavior: signals, suggestion });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Generate emotion-appropriate replies
  router.post('/generate', async (req, res) => {
    try {
      const { emotion, message, language } = req.body;
      const result = await emotionDetector.generateReply(emotion, message, language);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: emotionDetector.getStats() });
  });

  return router;
}

function createModesRoutes() {
  const router = express.Router();
  const { getMyMomMode, getActionButtons, getConsumerLabel, getProactiveSuggestion } = require('../core/consumerLabels');

  // Get My Mom Mode UI
  router.get('/mom-mode', (req, res) => {
    res.json({ success: true, mode: getMyMomMode() });
  });

  // Get all action button labels
  router.get('/actions', (req, res) => {
    res.json({ success: true, actions: getActionButtons() });
  });

  // Get consumer label for a power feature
  router.get('/label/:type/:key', (req, res) => {
    const { type, key } = req.params;
    const label = getConsumerLabel(type, key);
    if (!label) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }
    res.json({ success: true, label });
  });

  // Get proactive suggestion template
  router.get('/proactive/:key', (req, res) => {
    const suggestion = getProactiveSuggestion(req.params.key);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }
    res.json({ success: true, suggestion });
  });

  return router;
}

function createVoiceRoutes(voiceGateway) {
  const router = express.Router();

  // Speech-to-text
  router.post('/stt', async (req, res) => {
    try {
      const { audio, language, userId } = req.body;
      const audioBuffer = Buffer.from(audio || '', 'base64');
      const result = await voiceGateway.speechToText(audioBuffer, { language, userId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Text-to-speech
  router.post('/tts', async (req, res) => {
    try {
      const { text, language, voice } = req.body;
      const result = await voiceGateway.textToSpeech(text, { language, voice });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Start listening session
  router.post('/session/start', async (req, res) => {
    try {
      const { userId, language, wakeWordEnabled } = req.body;
      const result = await voiceGateway.startListeningSession(userId, { language, wakeWordEnabled });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Process voice command in session
  router.post('/session/:sessionId/process', async (req, res) => {
    try {
      const { audio } = req.body;
      const audioBuffer = Buffer.from(audio || '', 'base64');
      const result = await voiceGateway.processVoiceCommand(req.params.sessionId, audioBuffer);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // End listening session
  router.post('/session/:sessionId/end', (req, res) => {
    const result = voiceGateway.endSession(req.params.sessionId);
    res.json(result);
  });

  // Voice biometrics
  router.post('/identify', async (req, res) => {
    try {
      const { audio } = req.body;
      const audioBuffer = Buffer.from(audio || '', 'base64');
      const result = await voiceGateway.identifySpeaker(audioBuffer);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: voiceGateway.getStats() });
  });

  return router;
}

function createI18nRoutes(i18n) {
  const router = express.Router();

  // Detect language
  router.post('/detect', (req, res) => {
    const { text } = req.body;
    const language = i18n.detectLanguage(text);
    const isHinglish = i18n.isHinglish(text);
    res.json({ success: true, language, isHinglish });
  });

  // Translate (cultural adaptation)
  router.post('/translate', async (req, res) => {
    try {
      const { text, fromLang, toLang, context } = req.body;
      const result = await i18n.translate(text, fromLang, toLang, context);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Get greeting
  router.post('/greeting', (req, res) => {
    const { recipientContext, language } = req.body;
    const greeting = i18n.getGreeting(recipientContext, language);
    res.json({ success: true, greeting });
  });

  // Get festival greeting
  router.get('/festival/:festival', (req, res) => {
    const { language, religion } = req.query;
    const greeting = i18n.getFestivalGreeting(req.params.festival, language, religion);
    res.json({ success: true, greeting });
  });

  // Current festival
  router.get('/current-festival/:userId', (req, res) => {
    const { region } = req.query;
    const festival = i18n.getCurrentFestival(req.params.userId, region);
    res.json({ success: true, festival });
  });

  // Supported languages
  router.get('/languages', (req, res) => {
    res.json({ success: true, languages: i18n.getSupportedLanguages() });
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: i18n.getStats() });
  });

  return router;
}

function createFamilyRoutes(familyQuickReply) {
  const router = express.Router();

  // Detect family relationship
  router.post('/detect', async (req, res) => {
    try {
      const { senderId, userId } = req.body;
      const contact = await familyQuickReply.detectFamilyRelationship(senderId, userId);
      res.json({ success: true, isFamily: !!contact, contact });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Generate family reply
  router.post('/reply', async (req, res) => {
    try {
      const { message, senderId, userId, language } = req.body;
      const result = await familyQuickReply.generateFamilyReply({ message, senderId, userId, language });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: familyQuickReply.getStats() });
  });

  return router;
}

function createPayRoutes(payAnyone) {
  const router = express.Router();

  // Pay by voice
  router.post('/voice', async (req, res) => {
    try {
      const { audio, userId } = req.body;
      const audioBuffer = Buffer.from(audio || '', 'base64');
      const result = await payAnyone.payByVoice({ audioBuffer, userId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Pay by QR
  router.post('/qr', async (req, res) => {
    try {
      const { qrData, amount, userId } = req.body;
      const result = await payAnyone.payByQR({ qrData, amount, userId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Pay by contact
  router.post('/contact', async (req, res) => {
    try {
      const { contact, amount, userId, currency } = req.body;
      const result = await payAnyone.payByContact({ contact, amount, userId, currency });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Recent recipients
  router.get('/recent/:userId', (req, res) => {
    const recipients = payAnyone.getRecentRecipients(req.params.userId);
    res.json({ success: true, recipients });
  });

  // History
  router.get('/history/:userId', (req, res) => {
    const history = payAnyone.getHistory(req.params.userId);
    res.json({ success: true, transactions: history });
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: payAnyone.getStats() });
  });

  return router;
}

function createLifeRoutes(autoLifeAssistant) {
  const router = express.Router();

  // Check proactive suggestions
  router.get('/check/:userId', async (req, res) => {
    try {
      const result = await autoLifeAssistant.checkProactive(req.params.userId);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  // Snooze a suggestion
  router.post('/snooze', (req, res) => {
    const { userId, triggerId, hours } = req.body;
    const result = autoLifeAssistant.snoozeSuggestion(userId, triggerId, hours || 24);
    res.json({ success: true, ...result });
  });

  // Disable a category
  router.post('/disable-category', (req, res) => {
    const { userId, category } = req.body;
    const result = autoLifeAssistant.disableCategory(userId, category);
    res.json({ success: true, ...result });
  });

  // Track action
  router.post('/track', async (req, res) => {
    const { userId, triggerId, action } = req.body;
    const result = await autoLifeAssistant.trackAction(userId, triggerId, action);
    res.json({ success: true, ...result });
  });

  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: autoLifeAssistant.getStats() });
  });

  return router;
}

module.exports = {
  createMagicRoutes,
  createEmotionRoutes,
  createModesRoutes,
  createVoiceRoutes,
  createI18nRoutes,
  createFamilyRoutes,
  createPayRoutes,
  createLifeRoutes
};