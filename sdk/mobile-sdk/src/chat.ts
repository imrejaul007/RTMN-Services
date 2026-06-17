/**
 * RTMN Mobile SDK - Chat API
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatSession,
  ChatMessage,
  ChatChannel,
  MessageType,
  ConnectionState,
} from './types';

export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class ChatAPI extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private reconnectAttempts: number = 0;
  private messageQueue: ChatMessage[] = [];
  private connectionState: ConnectionState = {
    connected: false,
    reconnecting: false,
  };

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  /**
   * Connect to chat service
   */
  connect(userId: string, sessionId?: string): void {
    this.userId = userId;
    this.sessionId = sessionId || null;

    const url = this.config.url.includes('?')
      ? `${this.config.url}&userId=${userId}`
      : `${this.config.url}?userId=${userId}`;

    if (this.sessionId) {
      const separator = url.includes('?') ? '&' : '?';
      this.ws = new WebSocket(`${url}${separator}sessionId=${this.sessionId}`);
    } else {
      this.ws = new WebSocket(url);
    }

    this.setupEventHandlers();
  }

  /**
   * Disconnect from chat service
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.connectionState = { connected: false, reconnecting: false };
    this.emit('disconnected');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionState = {
        connected: true,
        reconnecting: false,
        lastConnected: new Date().toISOString(),
      };
      this.emit('connected');
      this.flushMessageQueue();
    };

    this.ws.onclose = (event) => {
      this.connectionState = { connected: false, reconnecting: false };
      this.emit('disconnected', { code: event.code, reason: event.reason });

      if (this.config.reconnect && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'message':
          this.emit('message', this.parseMessage(message.data));
          break;

        case 'typing':
          this.emit('typing', { userId: message.userId, isTyping: message.isTyping });
          break;

        case 'session_started':
          this.sessionId = message.sessionId;
          this.emit('sessionStarted', message);
          break;

        case 'session_ended':
          this.emit('sessionEnded', message);
          break;

        case 'agent_joined':
          this.emit('agentJoined', message);
          break;

        case 'agent_left':
          this.emit('agentLeft', message);
          break;

        case 'read_receipt':
          this.emit('read', { messageId: message.messageId, userId: message.userId });
          break;

        case 'presence':
          this.emit('presence', message);
          break;

        default:
          this.emit('raw', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Parse message data
   */
  private parseMessage(data: Record<string, unknown>): ChatMessage {
    return {
      id: data.id as string,
      sessionId: data.sessionId as string,
      senderId: data.senderId as string,
      senderType: data.senderType as 'customer' | 'agent' | 'system',
      content: data.content as string,
      messageType: (data.messageType as MessageType) || 'text',
      metadata: data.metadata as Record<string, unknown> | undefined,
      attachments: data.attachments as ChatMessage['attachments'],
      readAt: data.readAt as string | undefined,
      createdAt: data.createdAt as string,
    };
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string, metadata?: Record<string, unknown>): void {
    const message: Partial<ChatMessage> = {
      content,
      messageType: 'text',
      metadata,
      createdAt: new Date().toISOString(),
    };

    if (this.connectionState.connected) {
      this.ws?.send(
        JSON.stringify({
          type: 'message',
          sessionId: this.sessionId,
          data: message,
        })
      );
    } else {
      // Queue message for later
      this.messageQueue.push(message as ChatMessage);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping: boolean): void {
    if (this.connectionState.connected) {
      this.ws?.send(
        JSON.stringify({
          type: 'typing',
          sessionId: this.sessionId,
          isTyping,
        })
      );
    }
  }

  /**
   * Send read receipt
   */
  markAsRead(messageId: string): void {
    if (this.connectionState.connected) {
      this.ws?.send(
        JSON.stringify({
          type: 'read',
          sessionId: this.sessionId,
          messageId,
        })
      );
    }
  }

  /**
   * Request agent transfer
   */
  requestTransfer(reason?: string): void {
    if (this.connectionState.connected) {
      this.ws?.send(
        JSON.stringify({
          type: 'transfer',
          sessionId: this.sessionId,
          reason,
        })
      );
    }
  }

  /**
   * End chat session
   */
  endSession(rating?: number, feedback?: string): void {
    if (this.connectionState.connected) {
      this.ws?.send(
        JSON.stringify({
          type: 'end_session',
          sessionId: this.sessionId,
          rating,
          feedback,
        })
      );
    }
    this.disconnect();
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message.content, message.metadata);
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.emit('reconnectFailed');
      return;
    }

    this.connectionState.reconnecting = true;
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId, this.sessionId || undefined);
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    const handler = (message: ChatMessage) => callback(message);
    this.on('message', handler);
    return () => this.off('message', handler);
  }

  /**
   * Subscribe to typing events
   */
  onTyping(callback: (data: { userId: string; isTyping: boolean }) => void): () => void {
    const handler = (data: { userId: string; isTyping: boolean }) => callback(data);
    this.on('typing', handler);
    return () => this.off('typing', handler);
  }

  /**
   * Subscribe to agent events
   */
  onAgentJoined(callback: (data: { agentId: string; agentName: string }) => void): () => void {
    const handler = (data: { agentId: string; agentName: string }) => callback(data);
    this.on('agentJoined', handler);
    return () => this.off('agentJoined', handler);
  }
}
