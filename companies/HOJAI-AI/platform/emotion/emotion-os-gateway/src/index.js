/**
 * EmotionOS Gateway - Unified Entry Point
 * =======================================
 * Single entry point for all emotion intelligence services:
 * - Voice Emotion Detection (4760)
 * - Emotional Memory (4761)
 * - Empathy Response Engine (4762)
 * - Emotion Analytics (4763)
 * - Emotional Journey (4764)
 * - Emotion Alerts (4765)
 * - Cross-Modal Emotion (4766)
 * - Tone Analysis (4767)
 *
 * Port: 4760 (primary entry point)
 *
 * Architecture:
 * ┌─────────────────────────────────────┐
 * │         EmotionOS Gateway           │
 * │           (Port 4760)              │
 * └──────────────┬──────────────────────┘
 *                │
 *    ┌──────────┼──────────┬──────────┬──────────┐
 *    ▼          ▼          ▼          ▼          ▼
 * ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 * │Voice │ │Memory│ │Empathy│ │Tone   │ │Journey│ │Alerts │
 * │Emotn │ │      │ │Respns │ │Analysis│ │       │ │       │
 * └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4760;
const GATEWAY_PORT = process.env.GATEWAY_PORT || 4760;

// Service URLs (can be overridden via env)
const SERVICES = {
  voiceEmotion: process.env.VOICE_EMOTION_URL || 'http://localhost:4760',
  emotionalMemory: process.env.EMOTIONAL_MEMORY_URL || 'http://localhost:4761',
  empathyResponse: process.env.EMPATHY_RESPONSE_URL || 'http://localhost:4762',
  emotionAnalytics: process.env.EMOTION_ANALYTICS_URL || 'http://localhost:4763',
  emotionalJourney: process.env.EMOTIONAL_JOURNEY_URL || 'http://localhost:4764',
  emotionAlerts: process.env.EMOTION_ALERTS_URL || 'http://localhost:4765',
  crossModalEmotion: process.env.CROSS_MODAL_URL || 'http://localhost:4766',
  toneAnalysis: process.env.TONE_ANALYSIS_URL || 'http://localhost:4767'
};

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory session store for emotion contexts
const emotionSessions = new Map();
const emotionTimelines = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call a downstream service with fallback handling
 */
async function callService(serviceName, endpoint, method = 'POST', data = null) {
  const baseUrl = SERVICES[serviceName];
  if (!baseUrl) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  try {
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      timeout: 5000
    };
    if (data) config.data = data;

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`[EmotionOS Gateway] Service ${serviceName} error:`, error.message);
    return {
      error: true,
      service: serviceName,
      message: error.message,
      fallback: 'mock_data'
    };
  }
}

/**
 * Create unified emotion profile for an entity
 */
function createEmotionProfile(entityId, emotionData) {
  return {
    entityId,
    primary: emotionData.primary?.emotion || emotionData.dominant || 'neutral',
    confidence: emotionData.primary?.confidence || emotionData.confidence || 0.5,
    dimensions: emotionData.dimensions || {
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.5
    },
    emotions: emotionData.emotions || emotionData.allEmotions || {},
    context: emotionData.context || 'general',
    timestamp: emotionData.timestamp || new Date().toISOString()
  };
}

/**
 * Get or create emotion session
 */
function getOrCreateSession(entityId) {
  if (!emotionSessions.has(entityId)) {
    emotionSessions.set(entityId, {
      entityId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      emotionHistory: [],
      currentEmotion: null,
      emotionTrajectory: [],
      trustScore: 0.5,
      stressLevel: 0,
      engagementLevel: 0.5
    });
  }
  return emotionSessions.get(entityId);
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED EMOTION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /analyze - Unified emotion analysis
 * Accepts text, voice, or both and returns unified emotion profile
 */
app.post('/analyze', async (req, res) => {
  try {
    const { text, voice, context, entityId } = req.body;

    if (!text && !voice) {
      return res.status(400).json({
        error: 'text or voice required',
        example: {
          text: 'I am so frustrated with this service',
          voice: { pitch: 85, energy: 92, speechRate: 195 },
          context: 'customer_support'
        }
      });
    }

    const results = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      context: context || 'general',
      entityId: entityId || 'anonymous'
    };

    // Parallel calls to emotion services
    const [voiceResult, empathyResult] = await Promise.all([
      voice ? callService('voiceEmotion', '/analyze', 'POST', { audioData: voice, context }) : null,
      text ? callService('empathyResponse', '/suggest', 'POST', { emotion: 'neutral', options: {} }) : null
    ]);

    // Fuse results
    const fusedEmotion = fuseEmotionResults(voiceResult, text);

    // Create unified profile
    const profile = createEmotionProfile(entityId, {
      ...fusedEmotion,
      primary: fusedEmotion.dominant,
      context
    });

    // Update session if entityId provided
    if (entityId) {
      const session = getOrCreateSession(entityId);
      session.emotionHistory.push(profile);
      session.currentEmotion = profile;
      session.lastUpdated = new Date().toISOString();

      // Calculate trajectory
      if (session.emotionHistory.length > 1) {
        const prev = session.emotionHistory[session.emotionHistory.length - 2];
        if (prev.primary !== profile.primary) {
          session.emotionTrajectory.push({
            from: prev.primary,
            to: profile.primary,
            at: new Date().toISOString()
          });
        }
      }
    }

    res.json({
      ...results,
      profile,
      trajectory: entityId ? emotionSessions.get(entityId)?.emotionTrajectory : [],
      recommendations: generateEmotionRecommendations(profile)
    });
  } catch (error) {
    console.error('[EmotionOS Gateway] Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fuse voice and text emotion results
 */
function fuseEmotionResults(voiceResult, text) {
  // If voice result exists, use it as primary
  if (voiceResult && !voiceResult.error) {
    return {
      dominant: voiceResult.primary?.emotion || 'neutral',
      confidence: voiceResult.primary?.confidence || 0.5,
      dimensions: voiceResult.dimensions || {},
      emotions: voiceResult.emotions || {},
      source: 'voice'
    };
  }

  // Fallback: simple text sentiment
  return {
    dominant: analyzeTextSentiment(text),
    confidence: 0.6,
    dimensions: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
    emotions: {},
    source: 'text'
  };
}

/**
 * Simple text sentiment analysis
 */
function analyzeTextSentiment(text) {
  if (!text) return 'neutral';

  const lowerText = text.toLowerCase();

  const positiveWords = ['happy', 'great', 'excellent', 'love', 'wonderful', 'amazing', 'good', 'fantastic'];
  const negativeWords = ['angry', 'frustrated', 'sad', 'upset', 'terrible', 'hate', 'awful', 'disappointed', 'worst'];
  const stressWords = ['stressed', 'anxious', 'worried', 'nervous', 'concerned', 'overwhelmed'];

  let positive = 0, negative = 0, stress = 0;

  positiveWords.forEach(w => { if (lowerText.includes(w)) positive++; });
  negativeWords.forEach(w => { if (lowerText.includes(w)) negative++; });
  stressWords.forEach(w => { if (lowerText.includes(w)) stress++; });

  if (stress > positive && stress > negative) return 'anxious';
  if (negative > positive) return 'angry';
  if (positive > negative) return 'happy';

  return 'neutral';
}

/**
 * Generate emotion-based recommendations
 */
function generateEmotionRecommendations(profile) {
  const recommendations = [];
  const { primary, dimensions } = profile;

  switch (primary) {
    case 'angry':
    case 'frustrated':
      recommendations.push({
        action: 'empathetic_response',
        text: 'Acknowledge frustration and offer solution',
        priority: 'high'
      });
      recommendations.push({
        action: 'escalate_if_needed',
        text: 'Monitor for escalation to human agent',
        priority: 'medium'
      });
      break;

    case 'sad':
      recommendations.push({
        action: 'empathetic_support',
        text: 'Show understanding and offer help',
        priority: 'high'
      });
      break;

    case 'anxious':
    case 'stressed':
      recommendations.push({
        action: 'calm_approach',
        text: 'Speak slowly and reassuringly',
        priority: 'high'
      });
      recommendations.push({
        action: 'simplify',
        text: 'Break down information into smaller parts',
        priority: 'medium'
      });
      break;

    case 'happy':
    case 'excited':
      recommendations.push({
        action: 'positive_engagement',
        text: 'Match energy and enthusiasm',
        priority: 'medium'
      });
      break;

    default:
      recommendations.push({
        action: 'standard_approach',
        text: 'Continue with normal interaction',
        priority: 'low'
      });
  }

  // Adjust based on dimensions
  if (dimensions.arousal > 0.8) {
    recommendations.push({
      action: 'slow_down',
      text: 'High arousal detected - consider slowing pace',
      priority: 'medium'
    });
  }

  if (dimensions.valence < 0.3) {
    recommendations.push({
      action: 'positive_nudge',
      text: 'Low valence - consider positive framing',
      priority: 'medium'
    });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST & RELATIONSHIP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /trust - Calculate trust score for a relationship
 */
app.post('/trust', async (req, res) => {
  try {
    const { sourceId, targetId, interaction, trustHistory } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({
        error: 'sourceId and targetId required'
      });
    }

    // Calculate trust based on interaction history
    const trustScore = calculateTrustScore(trustHistory || [], interaction || {});

    res.json({
      sourceId,
      targetId,
      trustScore,
      components: {
        reliability: trustScore.reliability || 0.8,
        communication: trustScore.communication || 0.7,
        consistency: trustScore.consistency || 0.75,
        responsiveness: trustScore.responsiveness || 0.7
      },
      level: getTrustLevel(trustScore.overall || 0.8),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function calculateTrustScore(history, interaction) {
  // Simplified trust calculation
  const baseScore = 0.7;
  const interactionBonus = interaction.positive ? 0.1 : interaction.negative ? -0.2 : 0;

  const recentPositive = history.filter(h => h.positive).length;
  const total = history.length || 1;
  const historyBonus = (recentPositive / total) * 0.2;

  const overall = Math.min(1, Math.max(0, baseScore + interactionBonus + historyBonus));

  return {
    overall,
    reliability: Math.min(1, overall + 0.1),
    communication: Math.min(1, overall - 0.05),
    consistency: Math.min(1, overall + 0.05),
    responsiveness: Math.min(1, overall)
  };
}

function getTrustLevel(score) {
  if (score >= 0.9) return 'platinum';
  if (score >= 0.8) return 'gold';
  if (score >= 0.7) return 'silver';
  if (score >= 0.5) return 'bronze';
  if (score >= 0.3) return 'iron';
  return 'restricted';
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /timeline/:entityId - Get emotion timeline for an entity
 */
app.get('/timeline/:entityId', (req, res) => {
  const { entityId } = req.params;
  const { days } = req.query;

  const session = emotionSessions.get(entityId);

  if (!session) {
    return res.json({
      entityId,
      timeline: [],
      summary: {
        dominantEmotion: 'unknown',
        avgIntensity: 0,
        emotionalStability: 0
      }
    });
  }

  let history = session.emotionHistory;

  // Filter by days if specified
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    history = history.filter(e => new Date(e.timestamp) > cutoff);
  }

  const summary = summarizeTimeline(history);

  res.json({
    entityId,
    timeline: history,
    trajectory: session.emotionTrajectory,
    summary
  });
});

function summarizeTimeline(history) {
  if (history.length === 0) {
    return {
      dominantEmotion: 'unknown',
      avgIntensity: 0,
      emotionalStability: 0
    };
  }

  // Count emotions
  const emotionCounts = {};
  let totalIntensity = 0;

  history.forEach(e => {
    emotionCounts[e.primary] = (emotionCounts[e.primary] || 0) + 1;
    totalIntensity += e.confidence;
  });

  const dominant = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Calculate stability (how consistent emotions are)
  const uniqueEmotions = Object.keys(emotionCounts).length;
  const stability = 1 - (uniqueEmotions / history.length);

  return {
    dominantEmotion: dominant ? dominant[0] : 'neutral',
    dominantCount: dominant ? dominant[1] : 0,
    avgIntensity: totalIntensity / history.length,
    emotionalStability: Math.max(0, stability),
    emotionDistribution: emotionCounts,
    totalInteractions: history.length
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPATHY RESPONSE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /empathy - Generate empathetic response
 */
app.post('/empathy', async (req, res) => {
  try {
    const { emotion, context, tone, severity } = req.body;

    if (!emotion) {
      return res.status(400).json({ error: 'emotion required' });
    }

    const empathyResult = await callService(
      'empathyResponse',
      '/suggest',
      'POST',
      { emotion, context: { tone: tone || 'professional', severity: severity || 'medium' } }
    );

    res.json({
      emotion,
      empathy: empathyResult.suggestions || [],
      generated: empathyResult.generated || '',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODAL EMOTION
// ─────────────────────────────────────���───────────────────────────────────────

/**
 * POST /cross-modal - Analyze emotion from multiple modalities
 */
app.post('/cross-modal', async (req, res) => {
  try {
    const { text, voice, face, physiological } = req.body;

    const modalities = [];
    if (text) modalities.push('text');
    if (voice) modalities.push('voice');
    if (face) modalities.push('face');
    if (physiological) modalities.push('physiological');

    if (modalities.length === 0) {
      return res.status(400).json({ error: 'At least one modality required' });
    }

    // Call cross-modal service if available
    const result = await callService(
      'crossModalEmotion',
      '/fuse',
      'POST',
      { text, voice, face, physiological }
    );

    if (result.error) {
      // Fallback: use available modality
      const fallback = fuseFallback(text, voice);
      return res.json({
        ...fallback,
        modalities: modalities,
        fused: true,
        confidence: 0.6,
        fallback: true
      });
    }

    res.json({
      ...result,
      modalities,
      fused: true,
      confidence: result.confidence || 0.8
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function fuseFallback(text, voice) {
  if (voice) {
    return {
      primary: voice.primary?.emotion || 'neutral',
      confidence: voice.primary?.confidence || 0.5,
      emotions: voice.emotions || {},
      source: 'voice'
    };
  }

  return {
    primary: analyzeTextSentiment(text),
    confidence: 0.6,
    emotions: {},
    source: 'text'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION ALERTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /alerts - Set emotion-based alert
 */
app.post('/alerts', async (req, res) => {
  try {
    const { entityId, emotion, threshold, callback } = req.body;

    if (!entityId || !emotion) {
      return res.status(400).json({ error: 'entityId and emotion required' });
    }

    const alertId = uuidv4();

    res.json({
      alertId,
      entityId,
      emotion,
      threshold: threshold || 0.7,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /alerts/:entityId - Get active alerts for entity
 */
app.get('/alerts/:entityId', (req, res) => {
  const { entityId } = req.params;

  res.json({
    entityId,
    alerts: [],
    count: 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TONE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /tone - Analyze tone of text
 */
app.post('/tone', async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    // Simple tone analysis
    const tones = analyzeTone(text);

    res.json({
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      tones,
      overall: determineOverallTone(tones),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function analyzeTone(text) {
  const lowerText = text.toLowerCase();
  const tones = {};

  // Formal tone indicators
  if (/\b(therefore|however|furthermore|consequently)\b/.test(lowerText)) {
    tones.formal = 0.8;
  }

  // Casual tone indicators
  if (/\b(hey|cool|awesome|btw|omg)\b/.test(lowerText)) {
    tones.casual = 0.8;
  }

  // Confident tone indicators
  if (/\b(definitely|certainly|absolutely|clearly|obviously)\b/.test(lowerText)) {
    tones.confident = 0.9;
  }

  // Hesitant tone indicators
  if (/\b(maybe|perhaps|might|could be|possibly)\b/.test(lowerText)) {
    tones.hesitant = 0.7;
  }

  // Angry tone indicators
  if (/\b(hate|angry|frustrated|terrible|worst)\b/.test(lowerText)) {
    tones.angry = 0.8;
  }

  // Positive tone indicators
  if (/\b(thank|great|excellent|appreciate|happy)\b/.test(lowerText)) {
    tones.positive = 0.8;
  }

  return tones;
}

function determineOverallTone(tones) {
  const entries = Object.entries(tones);
  if (entries.length === 0) return 'neutral';

  const highest = entries.sort((a, b) => b[1] - a[1])[0];
  return highest[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /services - List all emotion services and their status
 */
app.get('/services', async (req, res) => {
  const serviceStatus = {};

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 1000 });
      serviceStatus[name] = {
        url,
        status: 'healthy',
        ...response.data
      };
    } catch (error) {
      serviceStatus[name] = {
        url,
        status: 'unavailable',
        error: error.message
      };
    }
  }

  res.json({
    gateway: 'EmotionOS Gateway',
    version: '1.0.0',
    port: GATEWAY_PORT,
    services: serviceStatus
  });
});

/**
 * GET /capabilities - List all gateway capabilities
 */
app.get('/capabilities', (req, res) => {
  res.json({
    name: 'EmotionOS Gateway',
    version: '1.0.0',
    capabilities: [
      {
        endpoint: 'POST /analyze',
        description: 'Unified emotion analysis from text/voice',
        modalities: ['text', 'voice']
      },
      {
        endpoint: 'POST /trust',
        description: 'Calculate trust score for relationships',
        type: 'trust'
      },
      {
        endpoint: 'GET /timeline/:entityId',
        description: 'Get emotion timeline for entity',
        type: 'memory'
      },
      {
        endpoint: 'POST /empathy',
        description: 'Generate empathetic responses',
        type: 'response'
      },
      {
        endpoint: 'POST /cross-modal',
        description: 'Fuse emotion from multiple modalities',
        type: 'fusion'
      },
      {
        endpoint: 'POST /tone',
        description: 'Analyze tone of text',
        type: 'tone'
      },
      {
        endpoint: 'POST /alerts',
        description: 'Set emotion-based alerts',
        type: 'monitoring'
      }
    ]
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH & INFO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /health - Gateway health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EmotionOS Gateway',
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime(),
    sessions: emotionSessions.size
  });
});

/**
 * GET / - Root info
 */
app.get('/', (req, res) => {
  res.json({
    service: 'EmotionOS Gateway',
    description: 'Unified entry point for all emotion intelligence services',
    version: '1.0.0',
    documentation: '/capabilities',
    health: '/health',
    services: '/services'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`EmotionOS Gateway running on port ${PORT}`);
  console.log(`Capabilities: http://localhost:${PORT}/capabilities`);
  console.log(`Services: http://localhost:${PORT}/services`);
});

export default app;
