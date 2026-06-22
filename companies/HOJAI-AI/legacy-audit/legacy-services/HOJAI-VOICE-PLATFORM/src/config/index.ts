// ============================================================================
// HOJAI VOICE PLATFORM - Configuration
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Environment validation
const required = ['JWT_SECRET', 'PORT'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ============================================================================
// Server Configuration
// ============================================================================

export const serverConfig = {
  port: parseInt(process.env.PORT || '4850', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // WebSocket
  ws: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
    maxPayloadSize: parseInt(process.env.WS_MAX_PAYLOAD_SIZE || '10485760', 10), // 10MB
  },
};

// ============================================================================
// Authentication Configuration
// ============================================================================

export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
};

// ============================================================================
// Redis Configuration
// ============================================================================

export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: 'hojai:voice:',
};

// ============================================================================
// STT Configuration
// ============================================================================

export const sttConfig = {
  defaultEngine: process.env.DEFAULT_STT_ENGINE || 'whisper',

  whisper: {
    apiKey: process.env.WHISPER_API_KEY || '',
    url: process.env.WHISPER_URL || 'https://api.openai.com/v1/audio/transcriptions',
    model: process.env.WHISPER_MODEL || 'whisper-1',
    language: 'en',
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || '',
    url: process.env.SARVAM_STT_URL || 'https://api.sarvam.ai/speech-to-text',
    model: 'saarvam1.0',
  },

  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    url: process.env.GOOGLE_STT_URL || 'https://speech.googleapis.com/v1/speech:recognize',
    model: 'latest_long',
    sampleRate: 16000,
  },
};

// ============================================================================
// TTS Configuration
// ============================================================================

export const ttsConfig = {
  defaultEngine: process.env.DEFAULT_TTS_ENGINE || 'elevenlabs',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en-IN',
  defaultVoiceId: process.env.DEFAULT_VOICE_ID || '预设-indian-female-1',

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    url: process.env.ELEVENLABS_URL || 'https://api.elevenlabs.io/v1',
    model: 'eleven_multilingual_v2',
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  },

  cartesia: {
    apiKey: process.env.CARTESIA_API_KEY || '',
    url: process.env.CARTESIA_URL || 'https://api.cartesia.ai/v1',
    model: 'sonic-english',
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || '',
    url: process.env.SARVAM_TTS_URL || 'https://api.sarvam.ai/text-to-speech',
    model: 'saarvam1.0',
  },
};

// ============================================================================
// Telecom Configuration
// ============================================================================

export const telecomConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
  },

  exotel: {
    apiKey: process.env.EXOTEL_API_KEY || '',
    apiToken: process.env.EXOTEL_API_TOKEN || '',
    accountSid: process.env.EXOTEL_ACCOUNT_SID || '',
    webhookUrl: process.env.EXOTEL_WEBHOOK_URL || '',
  },

  knowlarity: {
    apiKey: process.env.KNOWLARITY_API_KEY || '',
    number: process.env.KNOWLARITY_NUMBER || '',
    webhookUrl: process.env.KNOWLARITY_WEBHOOK_URL || '',
  },
};

// ============================================================================
// OpenAI Configuration (Intent Recognition)
// ============================================================================

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  maxTokens: 500,
  temperature: 0.7,
};

// ============================================================================
// HOJAI Internal Services
// ============================================================================

export const hojaiConfig = {
  authServiceUrl: process.env.HOJAI_AUTH_SERVICE_URL || 'http://localhost:4501',
  billingServiceUrl: process.env.HOJAI_BILLING_SERVICE_URL || 'http://localhost:4603',
  analyticsServiceUrl: process.env.HOJAI_ANALYTICS_SERVICE_URL || 'http://localhost:4604',
};

// ============================================================================
// Rate Limiting
// ============================================================================

export const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Specific limits
  calls: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  },
  sessions: {
    windowMs: 60000,
    maxRequests: 50,
  },
  analytics: {
    windowMs: 60000,
    maxRequests: 30,
  },
};

// ============================================================================
// Database Configuration
// ============================================================================

export const databaseConfig = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-voice',
    user: process.env.MONGODB_USER || '',
    password: process.env.MONGODB_PASSWORD || '',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
};

// ============================================================================
// Logging Configuration
// ============================================================================

export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  timestamp: true,

  // Log levels for different environments
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
};

// ============================================================================
// Voice Agent Defaults
// ============================================================================

export const voiceAgentDefaults = {
  contextWindow: 10,
  maxSilenceDuration: 5000, // 5 seconds
  bargeInEnabled: true,
  interruptionThreshold: 0.3, // 30% volume threshold for interruption
  confidenceThreshold: 0.6, // Minimum confidence for intent recognition
};

// ============================================================================
// Supported Languages
// ============================================================================

export const supportedLanguages = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
] as const;

// ============================================================================
// Voice IDs per Language
// ============================================================================

export const voiceIds: Record<string, string[]> = {
  'en-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'hi-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'ta-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'te-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'bn-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'kn-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'ml-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'mr-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'gu-IN': ['预设-indian-female-1', '预设-indian-male-1'],
  'pa-IN': ['预设-indian-female-1', '预设-indian-male-1'],
};

// ============================================================================
// Plans Configuration
// ============================================================================

export const plansConfig = {
  starter: {
    id: 'starter' as const,
    name: 'Starter',
    price: 9999,
    currency: 'INR',
    features: {
      minutes: 1000,
      agents: 1,
      languages: 3,
      integrations: ['twilio', 'web-sdk'],
      support: 'email' as const,
    },
  },
  growth: {
    id: 'growth' as const,
    name: 'Growth',
    price: 24999,
    currency: 'INR',
    features: {
      minutes: 5000,
      agents: 5,
      languages: 10,
      integrations: ['twilio', 'exotel', 'knowlarity', 'web-sdk', 'mobile-sdk'],
      support: 'chat' as const,
    },
  },
  enterprise: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: -1, // Custom pricing
    currency: 'INR',
    features: {
      minutes: -1, // Unlimited
      agents: -1, // Unlimited
      languages: 10,
      integrations: ['twilio', 'exotel', 'knowlarity', 'sip', 'web-sdk', 'mobile-sdk'],
      support: 'dedicated' as const,
    },
  },
};

// ============================================================================
// Export all configuration
// ============================================================================

export default {
  server: serverConfig,
  auth: authConfig,
  redis: redisConfig,
  stt: sttConfig,
  tts: ttsConfig,
  telecom: telecomConfig,
  openai: openaiConfig,
  hojai: hojaiConfig,
  rateLimit: rateLimitConfig,
  database: databaseConfig,
  logging: loggingConfig,
  voiceAgent: voiceAgentDefaults,
  languages: supportedLanguages,
  voiceIds,
  plans: plansConfig,
};
