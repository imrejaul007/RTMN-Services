// Unified WebSocket Client for ReZ Chat
// Manages Socket.IO connection with reconnection, offline queue, and event handling

import { io, Socket } from 'socket.io-client';
import type { ChatEventName } from '../types';

export interface ChatSocketConfig {
  url: string;
  token?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export interface ChatSocketOptions {
  namespace?: string;
  transports?: ('websocket' | 'polling')[];
}

const DEFAULT_CONFIG: Required<ChatSocketConfig> = {
  url: '',
  token: '',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

export class ChatSocketClient {
  private socket: Socket | null = null;
  private config: Required<ChatSocketConfig>;
  private listeners: Map<ChatEventName | string, Set<(...args: unknown[]) => void>> = new Map();
  private offlineQueue: Array<{ event: string; data: unknown }> = [];
  private isConnected = false;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor(config: ChatSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get socketInstance(): Socket | null {
    return this.socket;
  }

  connect(options?: ChatSocketOptions): void {
    if (this.socket?.connected) {
      return;
    }

    const socketOptions: Record<string, unknown> = {
      autoConnect: this.config.autoConnect,
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: options?.transports ?? ['websocket', 'polling'],
    };

    // Add auth token if provided
    if (this.config.token) {
      socketOptions.auth = { token: this.config.token };
    }

    const url = options?.namespace
      ? `${this.config.url}/${options.namespace}`
      : this.config.url;

    this.socket = io(url, socketOptions);

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyConnectionListeners(true);
      this.flushOfflineQueue();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[ChatSocket] Connection error:', error);
    });

    // Re-emit all registered events
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // ── Event Handling ──────────────────────────────────────────────────────────

  on(event: ChatEventName | string, callback: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Also register with socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: ChatEventName | string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  once(event: ChatEventName | string, callback: (...args: unknown[]) => void): void {
    this.socket?.once(event, callback);
  }

  // ── Emit ──────────────────────────────────────────────────────────────────

  emit(event: string, ...args: unknown[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    } else {
      // Queue for later if configured for offline support
      this.offlineQueue.push({ event, data: args });
    }
  }

  // ── Connection State ──────────────────────────────────────────────────────

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    // Immediately notify of current state
    callback(this.isConnected);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((cb) => cb(connected));
  }

  // ── Offline Queue ─────────────────────────────────────────────────────────

  private flushOfflineQueue(): void {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (item) {
        this.emit(item.event, ...(item.data as unknown[]));
      }
    }
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  removeAllListeners(): void {
    this.listeners.clear();
    this.socket?.removeAllListeners();
  }

  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.connectionListeners.clear();
  }
}

// Singleton factory for app-wide socket management
let globalSocketClient: ChatSocketClient | null = null;

export function getChatSocket(config: ChatSocketConfig): ChatSocketClient {
  if (!globalSocketClient) {
    globalSocketClient = new ChatSocketClient(config);
  }
  return globalSocketClient;
}

export function destroyChatSocket(): void {
  if (globalSocketClient) {
    globalSocketClient.destroy();
    globalSocketClient = null;
  }
}
