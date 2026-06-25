// ============================================================================
// HOJAI VOICE GATEWAY - Configuration
// ============================================================================
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4880'),

  stt: {
    defaultEngine: (process.env.STT_ENGINE || 'auto') as string,
    hojaiAccuracyThreshold: parseFloat(process.env.STHOJAI_ACCURACY_THRESHOLD || '0.92'),
    minSamplesBeforeBenchmark: parseInt(process.env.TRAIN_MIN_SAMPLES || '500'),
    trainingEnabled: process.env.TRAINING_ENABLED !== 'false',
    datasetPath: process.env.TRAINING_DATASET_PATH || '../voice-training/dataset',
    outputPath: process.env.TRAINING_OUTPUT_PATH || '../voice-training/intent_train.json',
    engines: {
      whisper: {
        url: process.env.WHISPER_API_URL || 'https://api.openai.com/v1',
        apiKey: process.env.WHISPER_API_KEY || '',
        model: process.env.WHISPER_MODEL || 'whisper-1',
      },
      deepgram: {
        url: process.env.DEEPGRAM_API_URL || 'https://api.deepgram.com/v1',
        apiKey: process.env.DEEPGRAM_API_KEY || '',
      },
      google: {
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        model: process.env.GOOGLE_STT_MODEL || 'latest_long',
      },
      sarvam: {
        url: process.env.SARVAM_API_URL || 'https://api.sarvam.ai',
        apiKey: process.env.SARVAM_API_KEY || '',
      },
      hojai: {
        url: process.env.HOJAI_STT_MODEL_URL || 'http://localhost:4881',
        apiKey: process.env.HOJAI_API_KEY || 'hojai-internal-key',
      },
    },
  },

  tts: {
    defaultEngine: (process.env.TTS_ENGINE || 'auto') as string,
    hojaiAccuracyThreshold: parseFloat(process.env.TTS_HOJAI_ACCURACY_THRESHOLD || '0.88'),
    engines: {
      elevenlabs: {
        url: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1',
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      },
      cartesia: {
        url: process.env.CARTESIA_API_URL || 'https://api.cartesia.ai',
        apiKey: process.env.CARTESIA_API_KEY || '',
        voiceId: process.env.CARTESIA_VOICE_ID || 'a8b11c3e-5057-4d25-8f0e-8d8c7b3a2f1e',
      },
      hojai: {
        url: process.env.HOJAI_TTS_MODEL_URL || 'http://localhost:4882',
        apiKey: process.env.HOJAI_API_KEY || 'hojai-internal-key',
      },
    },
  },

  training: {
    datasetPath: process.env.TRAINING_DATASET_PATH || '../voice-training/dataset',
    outputPath: process.env.TRAINING_OUTPUT_PATH || '../voice-training/intent_train.json',
    benchmarkIntervalHours: parseInt(process.env.BENCHMARK_INTERVAL_HOURS || '24'),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:6379',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export type Config = typeof config;
