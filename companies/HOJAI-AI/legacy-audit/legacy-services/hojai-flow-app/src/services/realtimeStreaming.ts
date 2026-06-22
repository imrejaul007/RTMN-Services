/**
 * Realtime Voice - WebSocket streaming STT
 *
 * Uses WebSocket for real-time transcription
 * - Connects to voice service
 * - Streams audio chunks
 * - Returns partial + final transcripts
 */

import { Audio } from 'expo-av';

const WS_URL = process.env.VOICE_WS_URL || 'ws://localhost:8080/stream';
const STT_URL = process.env.STT_API_URL || 'http://localhost:4033';

export interface TranscriptEvent {
  type: 'partial' | 'final';
  text: string;
  confidence: number;
}

type TranscriptCallback = (event: TranscriptEvent) => void;

class RealtimeStreaming {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private isRecording = false;
  private recording: Audio.Recording | null = null;
  private callbacks: Set<TranscriptCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnects = 3;

  /**
   * Connect to WebSocket server
   */
  connect(onTranscript: TranscriptCallback): void {
    this.callbacks.add(onTranscript);

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.socket = new WebSocket(WS_URL);

      this.socket.onopen = () => {
        console.log('[Realtime] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const transcriptEvent: TranscriptEvent = {
            type: data.isFinal ? 'final' : 'partial',
            text: data.text,
            confidence: data.confidence || 1,
          };
          this.callbacks.forEach(cb => cb(transcriptEvent));
        } catch (e) {
          console.error('[Realtime] Parse error:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('[Realtime] Error:', error);
        this.handleReconnect();
      };

      this.socket.onclose = () => {
        console.log('[Realtime] Disconnected');
        this.isConnected = false;
      };
    } catch (error) {
      console.error('[Realtime] Connection failed:', error);
    }
  }

  /**
   * Start recording and streaming
   */
  async startStreaming(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await this.recording.startAsync();

      this.isRecording = true;
      console.log('[Realtime] Recording started');

      // Start streaming audio chunks
      this.streamChunks();
    } catch (error) {
      console.error('[Realtime] Start failed:', error);
      throw error;
    }
  }

  /**
   * Stream audio chunks to server
   */
  private async streamChunks(): Promise<void> {
    if (!this.recording || !this.isConnected) return;

    // In production, this would use getProgressUpdatesAsync for real chunks
    // For now, simulate streaming
    const interval = setInterval(async () => {
      if (!this.isRecording || !this.socket) {
        clearInterval(interval);
        return;
      }

      // Get current recording status
      try {
        const status = await this.recording?.getStatusAsync();
        if (status?.isRecording) {
          // In production: send audio chunk via WebSocket
          // this.socket.send(audioChunk);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
  }

  /**
   * Stop recording and streaming
   */
  async stopStreaming(): Promise<string> {
    if (!this.recording) return '';

    try {
      const uri = await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isRecording = false;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      // Send final audio for transcription
      if (uri) {
        const text = await this.transcribe(uri);
        return text;
      }

      return '';
    } catch (error) {
      console.error('[Realtime] Stop failed:', error);
      this.isRecording = false;
      return '';
    }
  }

  /**
   * Transcribe audio file
   */
  private async transcribe(uri: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await fetch(`${STT_URL}/api/stt`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('[Realtime] STT failed:', error);
      return '';
    }
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.log('[Realtime] Max reconnects reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;

    setTimeout(() => {
      console.log(`[Realtime] Reconnect attempt ${this.reconnectAttempts}`);
      const callback = Array.from(this.callbacks)[0];
      if (callback) {
        this.connect(callback);
      }
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.isConnected = false;
    this.callbacks.clear();
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      recording: this.isRecording,
    };
  }
}

export const realtimeStreaming = new RealtimeStreaming();
export default realtimeStreaming;
