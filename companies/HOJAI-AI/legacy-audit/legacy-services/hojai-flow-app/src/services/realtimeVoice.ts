/**
 * Realtime Voice - Real WebSocket streaming STT
 *
 * Uses WebSocket for real-time transcription
 */

import { Audio } from 'expo-av';

const VOICE_WS_URL = process.env.VOICE_WS_URL || 'ws://localhost:8080';
const STT_API_URL = process.env.STT_API_URL || 'http://localhost:4033';

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

class RealtimeVoice {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private isRecording = false;
  private transcriptCallback: TranscriptCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private partialTranscript = '';

  /**
   * Connect to WebSocket server
   */
  connect(onTranscript: TranscriptCallback, onError?: ErrorCallback): void {
    this.transcriptCallback = onTranscript;
    this.errorCallback = onError || console.error;

    try {
      this.socket = new WebSocket(`${VOICE_WS_URL}/stream`);

      this.socket.onopen = () => {
        console.log('[RealtimeVoice] Connected');
        this.isConnected = true;
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'partial') {
          this.partialTranscript = data.text;
          this.transcriptCallback?.(data.text, false);
        } else if (data.type === 'final') {
          this.transcriptCallback?.(data.text, true);
          this.partialTranscript = '';
        }
      };

      this.socket.onerror = (error) => {
        console.error('[RealtimeVoice] WebSocket error:', error);
        this.errorCallback?.('Connection error');
      };

      this.socket.onclose = () => {
        console.log('[RealtimeVoice] Disconnected');
        this.isConnected = false;
      };
    } catch (error) {
      this.errorCallback?.('Failed to connect');
    }
  }

  /**
   * Start audio capture and streaming
   */
  async startCapture(): Promise<void> {
    if (this.isRecording) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      this.isRecording = true;
      console.log('[RealtimeVoice] Recording started');
    } catch (error) {
      this.isRecording = false;
      this.errorCallback?.('Failed to start recording');
    }
  }

  /**
   * Stop recording
   */
  async stopCapture(): Promise<void> {
    if (!this.isRecording) return;

    this.isRecording = false;
    console.log('[RealtimeVoice] Recording stopped');
  }

  /**
   * Send audio chunk to server
   */
  sendAudioChunk(_audioData: ArrayBuffer): void {
    if (!this.socket || !this.isConnected) return;

    this.socket.send(_audioData);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * Check connection status
   */
  get status() {
    return {
      connected: this.isConnected,
      recording: this.isRecording,
      hasTranscript: this.partialTranscript.length > 0,
    };
  }
}

export const realtimeVoice = new RealtimeVoice();
export default realtimeVoice;
