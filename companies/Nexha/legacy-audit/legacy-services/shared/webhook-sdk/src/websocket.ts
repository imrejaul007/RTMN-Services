import { logger } from '../../shared/logger';
/**
 * WebSocket Server - Real-time Communication
 *
 * Features:
 * - Room-based broadcasting
 * - Event-driven messaging
 * - Authentication middleware
 * - Auto-reconnection handling
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  role?: string;
  rooms: Set<string>;
  connectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface WSMessage {
  type: string;
  room?: string;
  data?: unknown;
  clientId?: string;
  timestamp?: string;
}

export interface RoomEvent {
  room: string;
  event: string;
  data: unknown;
  excludeClient?: string;
}

export type WSHandler = (client: WSClient, message: WSMessage) => void | Promise<void>;

// ============================================================================
// WebSocket Server
// ============================================================================

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private handlers: Map<string, WSHandler> = new Map();
  private authMiddleware?: (req: IncomingMessage) => Promise<WSClient['metadata'] | null>;

  constructor(private port?: number) {}

  /**
   * Initialize WebSocket server
   */
  initialize(server?: Server): WebSocketServer {
    const options = server
      ? { server }
      : { port: this.port || 8080 };

    this.wss = new WebSocketServer(options);

    this.wss.on('connection', this.handleConnection.bind(this));

    logger.info(`[WebSocket] Server initialized`);
    return this.wss;
  }

  /**
   * Set authentication middleware
   */
  setAuthMiddleware(
    middleware: (req: IncomingMessage) => Promise<WSClient['metadata'] | null>
  ): void {
    this.authMiddleware = middleware;
  }

  /**
   * Register event handler
   */
  on(event: string, handler: WSHandler): void {
    this.handlers.set(event, handler);
  }

  /**
   * Handle new connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const clientId = randomUUID();
    const client: WSClient = {
      id: clientId,
      ws,
      rooms: new Set(),
      connectedAt: new Date(),
    };

    // Authenticate if middleware is set
    if (this.authMiddleware) {
      try {
        const metadata = await this.authMiddleware(req);
        if (!metadata) {
          ws.close(4001, 'Unauthorized');
          return;
        }
        client.metadata = metadata;
        client.userId = metadata.userId as string;
        client.role = metadata.role as string;
      } catch (error) {
        logger.error('[WebSocket] Auth error:', error);
        ws.close(4001, 'Authentication failed');
        return;
      }
    }

    // Store client
    this.clients.set(clientId, client);
    logger.info(`[WebSocket] Client connected: ${clientId} (user: ${client.userId || 'anonymous'})`);

    // Handle messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        message.clientId = clientId;
        await this.handleMessage(client, message);
      } catch (error) {
        logger.error('[WebSocket] Message error:', error);
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Invalid message format' },
        });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`[WebSocket] Client error ${clientId}:`, error);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: { clientId, timestamp: new Date().toISOString() },
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(client: WSClient, message: WSMessage): Promise<void> {
    const { type, room, data } = message;

    switch (type) {
      case 'join':
        if (room) this.joinRoom(client.id, room);
        break;

      case 'leave':
        if (room) this.leaveRoom(client.id, room);
        break;

      case 'broadcast':
        if (room) this.broadcast({ room, event: 'message', data });
        break;

      default:
        // Call registered handler
        const handler = this.handlers.get(type);
        if (handler) {
          await handler(client, message);
        }
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Leave all rooms
      for (const room of client.rooms) {
        this.leaveRoom(clientId, room);
      }
      this.clients.delete(clientId);
      logger.info(`[WebSocket] Client disconnected: ${clientId}`);
    }
  }

  // ==========================================================================
  // Room Management
  // ==========================================================================

  /**
   * Join a room
   */
  joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Create room if doesn't exist
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room)!.add(clientId);
    client.rooms.add(room);

    // Notify client
    this.sendToClient(clientId, {
      type: 'joined',
      room,
      data: { success: true },
    });

    logger.info(`[WebSocket] Client ${clientId} joined room ${room}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
    client.rooms.delete(room);

    this.sendToClient(clientId, {
      type: 'left',
      room,
      data: { success: true },
    });

    logger.info(`[WebSocket] Client ${clientId} left room ${room}`);
  }

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  /**
   * Broadcast event to room
   */
  broadcast(event: RoomEvent): void {
    const { room, event: eventName, data, excludeClient } = event;
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    const message = JSON.stringify({
      type: eventName,
      room,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const clientId of roomClients) {
      if (clientId === excludeClient) continue;

      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Send to specific client
   */
  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Send to all clients
   */
  broadcastAll(event: string, data: unknown): void {
    const message = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get rooms count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get room client count
   */
  getRoomSize(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    // Close all connections
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }

    this.wss?.close();
    this.clients.clear();
    this.rooms.clear();
    logger.info('[WebSocket] Server shutdown complete');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export function initializeWebSocket(port?: number): WebSocketManager {
  wsManager = new WebSocketManager(port);
  wsManager.initialize();
  return wsManager;
}
