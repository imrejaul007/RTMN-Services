// ============================================================================
// HOJAI VOICE PLATFORM - Routes Index
// ============================================================================

import { Router } from 'express';
import agentRoutes from './agent.routes';
import callRoutes from './call.routes';
import sessionRoutes from './session.routes';
import transcriptionRoutes from './transcription.routes';
import synthesisRoutes from './synthesis.routes';
import intentRoutes from './intent.routes';
import analyticsRoutes from './analytics.routes';
import telecomRoutes from './telecom.routes';

const router = Router();

// Mount routes
router.use('/agents', agentRoutes);
router.use('/calls', callRoutes);
router.use('/sessions', sessionRoutes);
router.use('/transcription', transcriptionRoutes);
router.use('/synthesis', synthesisRoutes);
router.use('/intent', intentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', telecomRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'HOJAI Voice Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'HOJAI Voice Platform API',
    version: '1.0.0',
    description: 'Enterprise Voice AI for customer interactions',
    endpoints: {
      agents: '/api/agents',
      calls: '/api/calls',
      sessions: '/api/sessions',
      transcription: '/api/transcription',
      synthesis: '/api/synthesis',
      intent: '/api/intent',
      analytics: '/api/analytics',
      webhooks: '/api/webhooks',
    },
    features: [
      'Speech-to-Text (Whisper, Sarvam, Google)',
      'Text-to-Speech (ElevenLabs, Cartesia, Sarvam)',
      'Intent Recognition',
      'Sentiment Analysis',
      'Multi-language Support (10 Indian languages)',
      'Telecom Integrations (Twilio, Exotel, Knowlarity)',
    ],
  });
});

export default router;
