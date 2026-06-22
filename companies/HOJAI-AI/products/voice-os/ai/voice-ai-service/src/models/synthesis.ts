// Synthesis (TTS) Types

export interface SynthesisRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  provider?: 'elevenlabs' | 'google' | 'cartesia';
}

export interface SynthesisResponse {
  id: string;
  audioUrl?: string;
  audioBase64?: string;
  duration: number;
  format: string;
  metadata: {
    provider: string;
    voiceId: string;
    processedAt: string;
    processingTimeMs: number;
  };
}

// Voice templates
export interface VoiceTemplate {
  id: string;
  name: string;
  description: string;
  provider: string;
  voiceId: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  characteristics: {
    tone: 'professional' | 'warm' | 'energetic' | 'calm';
    speed: 'slow' | 'normal' | 'fast';
    accent?: string;
  };
  useCases: string[];
  previewUrl?: string;
}

export const DEFAULT_VOICES: VoiceTemplate[] = [
  {
    id: 'voice-en-female-professional',
    name: 'English - Female Professional',
    description: 'Professional female voice for healthcare and business',
    provider: 'elevenlabs',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    language: 'en',
    gender: 'female',
    characteristics: {
      tone: 'professional',
      speed: 'normal',
    },
    useCases: ['healthcare', 'business', 'support'],
  },
  {
    id: 'voice-en-male-professional',
    name: 'English - Male Professional',
    description: 'Professional male voice for healthcare and business',
    provider: 'elevenlabs',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    language: 'en',
    gender: 'male',
    characteristics: {
      tone: 'professional',
      speed: 'normal',
    },
    useCases: ['healthcare', 'business', 'support'],
  },
  {
    id: 'voice-hi-female-warm',
    name: 'Hindi - Female Warm',
    description: 'Warm female voice for Hindi speakers',
    provider: 'elevenlabs',
    voiceId: 'pqHfZ1aV3L2H2a5dTmUq',
    language: 'hi',
    gender: 'female',
    characteristics: {
      tone: 'warm',
      speed: 'normal',
      accent: 'Indian',
    },
    useCases: ['healthcare', 'reminders', 'care'],
  },
  {
    id: 'voice-hi-male-professional',
    name: 'Hindi - Male Professional',
    description: 'Professional male voice for Hindi speakers',
    provider: 'elevenlabs',
    voiceId: 'nPcsW5m5V2eG1rB6xZJd',
    language: 'hi',
    gender: 'male',
    characteristics: {
      tone: 'professional',
      speed: 'normal',
      accent: 'Indian',
    },
    useCases: ['healthcare', 'business', 'support'],
  },
];
