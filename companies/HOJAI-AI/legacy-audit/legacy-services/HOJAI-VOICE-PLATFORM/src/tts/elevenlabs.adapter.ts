// ============================================================================
// HOJAI VOICE PLATFORM - ElevenLabs TTS Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { ttsConfig } from '../config';
import { SynthesisResult, SupportedVoice, SupportedLanguage, TTSEngine } from '../types';

// Mapping of our voice IDs to ElevenLabs voice IDs
const VOICE_ID_MAP: Record<string, string> = {
  '预设-indian-female-1': 'priya_multilingual',
  '预设-indian-female-2': 'neha_multilingual',
  '预设-indian-male-1': 'arjun_multilingual',
  '预设-indian-male-2': 'raj_multilingual',
  '预设-indian-child-1': 'child_multilingual',
};

export class ElevenLabsAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;
  private voiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };

  constructor() {
    this.apiKey = ttsConfig.elevenlabs.apiKey;
    this.model = ttsConfig.elevenlabs.model;
    this.voiceSettings = ttsConfig.elevenlabs.voiceSettings;

    this.client = axios.create({
      baseURL: ttsConfig.elevenlabs.url,
      headers: {
        'xi-api-key': this.apiKey,
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(
    text: string,
    voiceId: SupportedVoice,
    language: SupportedLanguage,
    options?: {
      speed?: number;
      pitch?: number;
      stability?: number;
      similarityBoost?: number;
    }
  ): Promise<SynthesisResult> {
    try {
      // Get ElevenLabs voice ID
      const elevenLabsVoiceId = VOICE_ID_MAP[voiceId] || 'priya_multilingual';

      const requestBody: Record<string, unknown> = {
        text: this.prepareTextForTTS(text, language),
        model_id: this.model,
        voice_settings: {
          stability: options?.stability ?? this.voiceSettings.stability,
          similarity_boost: options?.similarityBoost ?? this.voiceSettings.similarity_boost,
          style: this.voiceSettings.style,
          use_speaker_boost: this.voiceSettings.use_speaker_boost,
        },
      };

      // Add voice ID to URL path
      const response = await this.client.post(
        `/text-to-speech/voices/${elevenLabsVoiceId}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
        }
      );

      // Convert to base64 for storage
      const audioBuffer = Buffer.from(response.data);
      const audioUrl = await this.saveAudio(audioBuffer, 'mp3');

      // Estimate duration (rough: ~150 words per minute)
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60;

      return {
        audioUrl,
        duration: estimatedDuration,
        format: 'mp3',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('ElevenLabs API error:', error.response?.data || error.message);
        throw new Error(
          `ElevenLabs synthesis failed: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    try {
      const response = await this.client.get('/voices');
      const voices = response.data.voices || [];

      return voices.map((voice: { voice_id: string; name: string; languages: string[] }) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.languages?.[0] || 'en',
      }));
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: TTSEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'elevenlabs',
      name: 'ElevenLabs',
      supportedLanguages: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'],
    };
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/user', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prepare text for TTS (handle SSML-like tags)
   */
  private prepareTextForTTS(text: string, language: SupportedLanguage): string {
    // ElevenLabs handles multilingual well, but we can add some preprocessing
    let processed = text;

    // Replace common patterns
    processed = processed.replace(/\b(\d+)\b/g, (match) => {
      // Convert numbers to words for better pronunciation
      return this.numberToWords(parseInt(match, 10), language);
    });

    // Remove any SSML tags that might cause issues
    processed = processed.replace(/<\/?[^>]+(>|$)/g, '');

    // Ensure text isn't too long (ElevenLabs limit is around 5000 chars)
    if (processed.length > 5000) {
      processed = processed.substring(0, 5000);
      console.warn('Text truncated to 5000 characters for ElevenLabs');
    }

    return processed;
  }

  /**
   * Convert number to words for supported languages
   */
  private numberToWords(num: number, language: SupportedLanguage): string {
    const languageMap: Record<string, () => string> = {
      'en-IN': () => this.numberToWordsEnglish(num),
      'hi-IN': () => this.numberToWordsHindi(num),
    };

    const converter = languageMap[language] || languageMap['en-IN'];
    return converter();
  }

  private numberToWordsEnglish(num: number): string {
    if (num === 0) return 'zero';

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + this.numberToWordsEnglish(num % 100) : '');
    if (num < 1000000) return this.numberToWordsEnglish(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + this.numberToWordsEnglish(num % 1000) : '');

    return num.toString();
  }

  private numberToWordsHindi(num: number): string {
    // Simplified Hindi number conversion
    const hindiOnes = ['', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ'];
    const hindiTens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नबे'];

    if (num < 10) return hindiOnes[num];
    if (num < 100) return hindiTens[Math.floor(num / 10)] + (num % 10 ? ' ' + hindiOnes[num % 10] : '');

    return num.toString(); // Fallback for larger numbers
  }

  /**
   * Save audio to storage (placeholder - implement actual storage)
   */
  private async saveAudio(audioBuffer: Buffer, format: string): Promise<string> {
    // In production, this would upload to S3/GCS/etc.
    // For now, return a data URL
    const base64 = audioBuffer.toString('base64');
    return `data:audio/${format};base64,${base64}`;
  }
}

// Singleton instance
let elevenlabsAdapterInstance: ElevenLabsAdapter | null = null;

export function getElevenLabsAdapter(): ElevenLabsAdapter {
  if (!elevenlabsAdapterInstance) {
    elevenlabsAdapterInstance = new ElevenLabsAdapter();
  }
  return elevenlabsAdapterInstance;
}

export default ElevenLabsAdapter;
