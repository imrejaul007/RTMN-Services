// ============================================================================
// HOJAI VOICE SDK - VoiceSession Class
// ============================================================================

import EventEmitter from 'eventemitter3';
import {
  VoiceSessionOptions,
  VoiceSessionEvents,
  SessionInfo,
  IntentResult,
  SentimentScore,
  SessionStatus,
  SupportedLanguage,
  VoiceConfig,
  WebSocketMessage,
  ConnectionState,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:4850';

export class VoiceSession extends EventEmitter<VoiceSessionEvents> {
  private apiKey: string;
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private sessionInfo: SessionInfo | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: VoiceSessionOptions) {
    super();
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to the voice service WebSocket
   */
  connect(): Promise<SessionInfo> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.emit('connected', { sessionId: '', agentId: '', status: 'active', language: 'en-IN', startTime: new Date() } as SessionInfo);
          resolve(this.sessionInfo!);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          this.emit('error', new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = () => {
          this.stopPingInterval();
          this.emit('disconnected');

          // Attempt reconnection if not intentional close
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect().catch(() => {});
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the voice service
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.stopPingInterval();
    this.sessionInfo = null;
  }

  /**
   * Send audio data for processing
   */
  async sendAudio(audio: Blob | ArrayBuffer, mimeType: string = 'audio/webm'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];

        this.ws!.send(JSON.stringify({
          type: 'audio',
          audio: base64,
          mimeType,
        }));

        resolve();
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(audio);
    });
  }

  /**
   * Send audio from microphone stream
   */
  async sendMicrophoneStream(
    stream: MediaStream,
    mimeType: string = 'audio/webm'
  ): Promise<{ stop: () => void }> {
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audio = new Blob(chunks, { type: mimeType });
      await this.sendAudio(audio, mimeType);
    };

    mediaRecorder.start(100); // Collect data every 100ms

    return {
      stop: () => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      },
    };
  }

  /**
   * Send text message
   */
  async sendText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.ws.send(JSON.stringify({
        type: 'text',
        content: text,
      }));

      resolve();
    });
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({ type: 'session:end' }));
    this.disconnect();
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      sessionId: this.sessionInfo?.sessionId,
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connected':
        // Initial connection confirmed
        break;

      case 'authenticated':
        // Authentication successful
        break;

      case 'session:started':
        this.sessionInfo = {
          sessionId: message.sessionId as string,
          agentId: (message as { agentId?: string }).agentId || '',
          status: 'active',
          language: 'en-IN',
          startTime: new Date(),
        };
        break;

      case 'session:ended':
        this.sessionInfo = null;
        this.emit('status', 'completed');
        break;

      case 'transcript':
        this.emit('speech', message.text as string);
        break;

      case 'response':
      case 'synthesis':
        this.emit('response', message.text as string, message.audio as string | undefined);
        break;

      case 'intent':
        const intent: IntentResult = {
          intent: (message.data as { intent: string })?.intent || '',
          confidence: (message.data as { confidence: number })?.confidence || 0,
          parameters: (message.data as { parameters: Record<string, unknown> })?.parameters || {},
          entities: (message.data as { entities: IntentResult['entities'] })?.entities || [],
        };
        this.emit('speech', (message as { text?: string }).text || '', intent);
        break;

      case 'sentiment':
        const sentiment: SentimentScore = message.data as SentimentScore;
        this.emit('sentiment', sentiment);
        break;

      case 'heartbeat':
        // Heartbeat acknowledged
        break;

      case 'error':
        this.emit('error', new Error(message.message as string));
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Start ping interval for connection health
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export default VoiceSession;
