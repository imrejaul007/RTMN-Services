/**
 * Voice Streaming Service - Real-time STT/TTS integration
 *
 * Connects to REZ Voice Service (4033) for streaming
 * - Speech-to-text (OpenAI Whisper)
 * - Text-to-speech (ElevenLabs)
 */

import { Audio } from 'expo-av';
import axios from 'axios';

const VOICE_SERVICE = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';

export interface Transcript {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface VoiceConfig {
  sttModel: 'whisper' | 'google' | 'assemblyai';
  ttsVoice: string;
  language: 'en-IN' | 'en-US' | 'hi';
}

class VoiceStreaming {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  /**
   * STT - Speech to Text
   */
  async speechToText(audioUri: string): Promise<string> {
    const formData = new FormData();

    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);

    const { data } = await axios.post(`${VOICE_SERVICE}/api/stt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15000,
    });

    return data.text || '';
  }

  /**
   * TTS - Text to Speech
   */
  async textToSpeech(text: string, voiceId?: string): Promise<string> {
    const { data } = await axios.post(`${VOICE_SERVICE}/api/tts`, {
      text,
      voice_id: voiceId || 'default',
    }, { timeout: 15000 });

    return data.audioUrl || '';
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await this.recording.startAsync();
    this.isRecording = true;
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<string> {
    if (!this.recording) return '';

    await this.recording.stopAndUnloadAsync();
    this.isRecording = false;
    return this.recording.getURI() || '';
  }

  /**
   * Stream voice with organization persona
   * Routes to Founder/Sales/Support based on org context
   */
  async streamAsPersona(
    personaType: 'founder' | 'sales' | 'support',
    text: string
  ): Promise<string> {
    // Get persona voice config
    const voiceMap = {
      founder: 'founder-voice-id',
      sales: 'sales-voice-id',
      support: 'support-voice-id',
    };

    return this.textToSpeech(text, voiceMap[personaType]);
  }

  get status() {
    return { recording: this.isRecording };
  }
}

export const voiceStreaming = new VoiceStreaming();
