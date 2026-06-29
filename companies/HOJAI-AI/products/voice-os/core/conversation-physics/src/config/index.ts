/**
 * Conversation Physics Engine - Configuration
 */

export const config = {
  port: parseInt(process.env.PORT || '4881', 10),
  serviceName: 'conversation-physics-engine',

  // Silence thresholds (milliseconds)
  silence: {
    thinking: 500,
    processing: 3000,
    confusion: 10000,
    distracted: 30000,
    abandoned: 60000
  },

  // Timing (milliseconds)
  timing: {
    minResponseDelay: 200,
    maxResponseDelay: 2000,
    backchannelDelay: 500,
    interruptionOverlapWindow: 500
  },

  // Storage
  storage: {
    maxSessions: 10000,
    sessionTTLMs: 24 * 60 * 60 * 1000, // 24 hours
    emotionHistorySize: 100
  },

  // Metrics
  metrics: {
    updateIntervalMs: 60000,
    retentionDays: 30
  }
};

export type Config = typeof config;
