// ============================================================================
// HOJAI VOICE SDK - VoiceAgent Class
// ============================================================================

import { VoiceSession } from './VoiceSession';
import {
  VoiceAgentOptions,
  VoiceSessionEvents,
  SessionInfo,
  IntentResult,
  SentimentScore,
  VoiceConfig,
  SupportedLanguage,
  SupportedVoice,
  SynthesisOptions,
  TranscriptionOptions,
} from './types';

export class VoiceAgent {
  private session: VoiceSession;
  private agentId: string;
  private language: SupportedLanguage;
  private voiceConfig: VoiceConfig;
  private baseUrl: string;

  constructor(options: VoiceAgentOptions) {
    this.agentId = options.agentId;
    this.language = options.language || 'en-IN';
    this.baseUrl = options.baseUrl || 'http://localhost:4850';

    this.voiceConfig = {
      language: this.language,
      voiceId: options.voiceConfig?.voiceId || '预设-indian-female-1',
      ttsEngine: options.voiceConfig?.ttsEngine || 'elevenlabs',
      sttEngine: options.voiceConfig?.sttEngine || 'whisper',
      speed: options.voiceConfig?.speed,
      pitch: options.voiceConfig?.pitch,
      volume: options.voiceConfig?.volume,
    };

    this.session = new VoiceSession({
      apiKey: options.apiKey,
      baseUrl: this.baseUrl,
      agentId: this.agentId,
      language: this.language,
      autoConnect: options.autoConnect !== false,
    });
  }

  /**
   * Start a new voice session
   */
  async start(): Promise<SessionInfo> {
    return this.session.connect();
  }

  /**
   * End the current session
   */
  async stop(): Promise<void> {
    await this.session.endSession();
  }

  /**
   * Speak text (TTS)
   */
  async speak(text: string, options?: Partial<SynthesisOptions>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.session.getConnectionState().sessionId}`,
      },
      body: JSON.stringify({
        text,
        language: options?.language || this.language,
        voiceId: options?.voiceId || this.voiceConfig.voiceId,
        engine: options?.engine || this.voiceConfig.ttsEngine,
        speed: options?.speed || this.voiceConfig.speed,
        pitch: options?.pitch || this.voiceConfig.pitch,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to synthesize speech');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Transcribe audio
   */
  async transcribe(audio: Blob | ArrayBuffer, options?: Partial<TranscriptionOptions>): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audio as Blob);
    formData.append('language', options?.language || this.language);
    formData.append('engine', options?.engine || this.voiceConfig.sttEngine);

    const response = await fetch(`${this.baseUrl}/api/transcription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.session.getConnectionState().sessionId}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const result = await response.json();
    return result.data.text;
  }

  /**
   * Send audio and get response
   */
  async processAudio(audio: Blob | ArrayBuffer): Promise<{
    transcript: string;
    intent: IntentResult;
    sentiment: SentimentScore;
    response: string;
    responseAudio?: string;
  }> {
    // First transcribe
    const text = await this.transcribe(audio);

    // Send to session
    await this.session.sendText(text);

    // The session will emit response events
    return new Promise((resolve) => {
      const result: {
        transcript: string;
        intent?: IntentResult;
        sentiment?: SentimentScore;
        response?: string;
        responseAudio?: string;
      } = { transcript: text };

      this.session.on('response', (response, audio) => {
        result.response = response;
        result.responseAudio = audio;
      });

      this.session.on('intent', (_, intent) => {
        result.intent = intent;
      });

      this.session.on('sentiment', (sentiment) => {
        result.sentiment = sentiment;
      });

      // Resolve after a short delay (in production, use proper state management)
      setTimeout(() => resolve(result as typeof result), 2000);
    });
  }

  /**
   * Send text message
   */
  async sendMessage(text: string): Promise<{
    response: string;
    intent: IntentResult;
    sentiment: SentimentScore;
  }> {
    await this.session.sendText(text);

    return new Promise((resolve) => {
      const result: {
        response?: string;
        intent?: IntentResult;
        sentiment?: SentimentScore;
      } = {};

      this.session.on('response', (response) => {
        result.response = response;
      });

      this.session.on('intent', (_, intent) => {
        result.intent = intent;
      });

      this.session.on('sentiment', (sentiment) => {
        result.sentiment = sentiment;
      });

      setTimeout(() => resolve(result as typeof result), 2000);
    });
  }

  /**
   * Get microphone stream for real-time audio
   */
  async getMicrophoneStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });
  }

  /**
   * Start voice conversation with microphone
   */
  async startVoiceConversation(
    onTranscript: (text: string) => void,
    onResponse: (text: string, audio?: string) => void,
    onError: (error: Error) => void
  ): Promise<{ stop: () => void }> {
    const stream = await this.getMicrophoneStream();

    // Set up event listeners
    this.session.on('speech', onTranscript);
    this.session.on('response', onResponse);
    this.session.on('error', onError);

    // Start sending audio
    const { stop } = await this.session.sendMicrophoneStream(stream);

    return {
      stop: () => {
        stop();
        this.session.off('speech', onTranscript);
        this.session.off('response', onResponse);
        this.session.off('error', onError);
      },
    };
  }

  /**
   * Event listeners
   */
  on(event: 'connected', listener: (session: SessionInfo) => void): void;
  on(event: 'disconnected', listener: () => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'speech', listener: (text: string, intent?: IntentResult) => void): void;
  on(event: 'response', listener: (text: string, audio?: string) => void): void;
  on(event: 'sentiment', listener: (sentiment: SentimentScore) => void): void;
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.session.on(event as keyof VoiceSessionEvents, listener as (...args: unknown[]) => void);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.session.off(event, listener);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.session.getConnectionState().connected;
  }
}

export default VoiceAgent;
