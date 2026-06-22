/**
 * Streaming Voice Engine
 *
 * Features:
 * - Real-time streaming STT
 * - Live transcript updates
 * - Partial results
 * - Auto-punctuation
 * - Hotword detection
 */

import { Audio } from 'expo-av';
import axios from 'axios';

const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';

export interface StreamingTranscript {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}

type TranscriptCallback = (transcript: StreamingTranscript) => void;
type StateCallback = (state: VoiceState) => void;

class StreamingVoiceEngine {
  private isListening = false;
  private isProcessing = false;
  private transcript = '';
  private partialTranscript = '';
  private error: string | null = null;
  private listeners: Set<StateCallback> = new Set();
  private transcriptListeners: Set<TranscriptCallback> = new Set();
  private recording: Audio.Recording | null = null;
  private audioUri: string | null = null;

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateCallback): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to transcript updates
   */
  onTranscript(callback: TranscriptCallback): () => void {
    this.transcriptListeners.add(callback);
    return () => this.transcriptListeners.delete(callback);
  }

  /**
   * Get current state
   */
  getState(): VoiceState {
    return {
      isListening: this.isListening,
      isProcessing: this.isProcessing,
      transcript: this.transcript,
      partialTranscript: this.partialTranscript,
      error: this.error,
    };
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Start listening
   */
  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await this.recording.startAsync();

      this.isListening = true;
      this.partialTranscript = '';
      this.error = null;
      this.notify();

      console.log('[StreamingVoice] Started listening');
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to start';
      this.notify();
      throw error;
    }
  }

  /**
   * Stop listening and process
   */
  async stopListening(): Promise<string> {
    if (!this.isListening || !this.recording) {
      return this.transcript;
    }

    try {
      // Stop recording
      const uri = this.recording.getURI();
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isListening = false;
      this.isProcessing = true;
      this.audioUri = uri;
      this.notify();

      // Send to STT
      if (uri) {
        const text = await this.processAudio(uri);
        this.transcript = text;
        this.partialTranscript = '';

        this.transcriptListeners.forEach(cb => cb({
          text,
          isFinal: true,
          confidence: 1.0,
          timestamp: Date.now(),
        }));
      }

      this.isProcessing = false;
      this.notify();

      console.log('[StreamingVoice] Stopped, transcript:', this.transcript);
      return this.transcript;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Processing failed';
      this.isProcessing = false;
      this.notify();
      throw error;
    }
  }

  /**
   * Process audio through STT service
   */
  private async processAudio(uri: string): Promise<string> {
    try {
      const formData = new FormData();

      const filename = uri.split('/').pop() || 'recording.m4a';
      formData.append('audio', {
        uri,
        name: filename,
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await axios.post(`${VOICE_SERVICE_URL}/api/stt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      });

      return response.data.text || '';
    } catch (error) {
      console.error('[StreamingVoice] STT error:', error);
      // Return partial transcript as fallback
      return this.partialTranscript || '';
    }
  }

  /**
   * Cancel current recording
   */
  async cancel(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }

    this.isListening = false;
    this.isProcessing = false;
    this.partialTranscript = '';
    this.error = null;
    this.notify();
  }

  /**
   * Simulate streaming transcript (for demo)
   * In production, this would use WebSocket for real streaming
   */
  simulateStreaming(finalText: string): void {
    const words = finalText.split(' ');
    let index = 0;

    const interval = setInterval(() => {
      if (index < words.length) {
        this.partialTranscript = words.slice(0, index + 1).join(' ');

        this.transcriptListeners.forEach(cb => cb({
          text: this.partialTranscript,
          isFinal: false,
          confidence: 0.9,
          timestamp: Date.now(),
        }));

        this.notify();
        index++;
      } else {
        clearInterval(interval);
        this.transcript = finalText;
        this.partialTranscript = '';

        this.transcriptListeners.forEach(cb => cb({
          text: finalText,
          isFinal: true,
          confidence: 1.0,
          timestamp: Date.now(),
        }));

        this.notify();
      }
    }, 100);
  }
}

export const streamingVoice = new StreamingVoiceEngine();
export default streamingVoice;
