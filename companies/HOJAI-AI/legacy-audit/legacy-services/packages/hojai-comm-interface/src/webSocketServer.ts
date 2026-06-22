import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import {
  WebSocketMessage,
  WebSocketConnection,
  Source,
  MessageDirection,
  MessageType
} from './types/index.js';
import { messageRouter } from './services/messageRouter.js';
import { conversationManager } from './services/conversationManager.js';

// ============================================================================
// CONFIG
// ============================================================================

const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
const WS_MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

interface AuthenticatedWebSocket extends WebSocket {
  id: string;
  tenantId: string;
  userId?: string;
  conversationId?: string;
  source: Source;
  isAlive: boolean;
  lastActivity: Date;
}

class WebSocketServerManager {
  private wss?: WebSocketServer;
  private connections: Map<string, AuthenticatedWebSocket> = new Map();
  private tenantConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private messageHandler?: (data: {
    tenantId: string;
    userId: string;
    conversationId: string;
    message: string;
  }) => Promise<void>;

  /**
   * Initialize WebSocket server
   */
  initialize(port = 4586): void {
    if (this.wss) {
      console.log('[WebSocketServer] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({
      port,
      maxPayload: WS_MAX_MESSAGE_SIZE
    });

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.pingAll();
    }, WS_HEARTBEAT_INTERVAL);

    console.log(`[WebSocketServer] Running on port ${port}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: { url?: string }): void {
    const url = new URL(req.url || '', `http://localhost:4586`);
    const tenantId = url.searchParams.get('tenantId');
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');
    const token = url.searchParams.get('token');

    // Validate required params
    if (!tenantId) {
      ws.close(4001, 'Missing tenantId');
      return;
    }

    // Simple token validation (in production, verify JWT)
    if (token) {
      // Token validation would happen here
      // For now, accept any token format
    }

    const authWs = ws as AuthenticatedWebSocket;
    authWs.id = uuid();
    authWs.tenantId = tenantId;
    authWs.userId = userId || undefined;
    authWs.conversationId = conversationId || undefined;
    authWs.source = Source.WEB;
    authWs.isAlive = true;
    authWs.lastActivity = new Date();

    // Store connection
    this.connections.set(authWs.id, authWs);

    // Track by tenant
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(authWs.id);

    console.log(`[WebSocketServer] New connection: ${authWs.id} (tenant: ${tenantId}, user: ${userId || 'anonymous'})`);

    // Send welcome message
    this.send(authWs.id, {
      type: 'status',
      payload: {
        action: 'connected',
        connectionId: authWs.id,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Setup message handler
    authWs.on('message', async (data) => {
      await this.handleMessage(authWs, data);
    });

    authWs.on('pong', () => {
      authWs.isAlive = true;
    });

    authWs.on('close', () => {
      this.handleDisconnect(authWs);
    });

    authWs.on('error', (error) => {
      console.error(`[WebSocketServer] Error on ${authWs.id}:`, error);
      this.handleDisconnect(authWs);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: AuthenticatedWebSocket, data: Buffer | Buffer[] | ArrayBuffer | Buffer[] | unknown): Promise<void> {
    try {
      const messageStr = data instanceof Buffer ? data.toString() : String(data);
      const message = JSON.parse(messageStr) as WebSocketMessage;
      ws.lastActivity = new Date();

      switch (message.type) {
        case 'message':
          await this.handleChatMessage(ws, message.payload);
          break;

        case 'typing':
          await this.handleTypingIndicator(ws, message.payload);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'join_conversation':
          this.handleJoinConversation(ws, message.payload);
          break;

        case 'leave_conversation':
          this.handleLeaveConversation(ws);
          break;

        default:
          console.warn(`[WebSocketServer] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WebSocketServer] Failed to handle message:', error);
      this.sendError(ws.id, 'Failed to process message');
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(ws: AuthenticatedWebSocket, payload: Record<string, unknown>): Promise<void> {
    const { message, conversationId: existingConvId, metadata } = payload as {
      message: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!message || typeof message !== 'string') {
      this.sendError(ws.id, 'Message content required');
      return;
    }

    const userId = ws.userId || 'anonymous';

    // Process through message router
    const tenantId = ws.tenantId;
    const result = await messageRouter.processMessage({
      tenantId,
      userId,
      conversationId: existingConvId,
      message,
      source: Source.WEB,
      metadata
    });

    if (result.success) {
      // Update conversation ID if new
      if (result.conversationId) {
        ws.conversationId = result.conversationId;
      }

      // Send success response
      this.send(ws.id, {
        type: 'message',
        payload: {
          conversationId: result.conversationId,
          messageId: result.messageId,
          response: result.response,
          employeeId: result.employeeId,
          employeeName: result.routedTo?.name,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      // Broadcast to same conversation
      if (result.conversationId) {
        this.broadcastToConversation(result.conversationId, {
          type: 'message',
          payload: {
            conversationId: result.conversationId,
            response: result.response,
            employeeId: result.employeeId,
            employeeName: result.routedTo?.name,
            sender: 'employee'
          },
          timestamp: new Date().toISOString()
        }, ws.id);
      }
    } else {
      this.sendError(ws.id, result.error || 'Failed to process message');
    }

    // Call registered handler
    if (this.messageHandler) {
      await this.messageHandler({
        tenantId: ws.tenantId,
        userId,
        conversationId: result.conversationId || ws.conversationId || '',
        message
      });
    }
  }

  /**
   * Handle typing indicator
   */
  private async handleTypingIndicator(ws: AuthenticatedWebSocket, payload: Record<string, unknown>): Promise<void> {
    const { isTyping } = payload as { isTyping: boolean };

    if (ws.conversationId) {
      this.broadcastToConversation(ws.conversationId, {
        type: 'typing',
        payload: {
          userId: ws.userId,
          isTyping,
          sender: 'user'
        },
        timestamp: new Date().toISOString()
      }, ws.id);
    }
  }

  /**
   * Handle join conversation
   */
  private handleJoinConversation(ws: AuthenticatedWebSocket, payload: Record<string, unknown>): void {
    const { conversationId } = payload as { conversationId: string };
    ws.conversationId = conversationId;

    this.send(ws.id, {
      type: 'status',
      payload: {
        action: 'joined_conversation',
        conversationId
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocketServer] Client ${ws.id} joined conversation ${conversationId}`);
  }

  /**
   * Handle leave conversation
   */
  private handleLeaveConversation(ws: AuthenticatedWebSocket): void {
    const conversationId = ws.conversationId;
    ws.conversationId = undefined;

    if (conversationId) {
      this.send(ws.id, {
        type: 'status',
        payload: {
          action: 'left_conversation',
          conversationId
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    console.log(`[WebSocketServer] Disconnected: ${ws.id}`);

    // Remove from tracking
    this.connections.delete(ws.id);

    const tenantConnections = this.tenantConnections.get(ws.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(ws.id);
      if (tenantConnections.size === 0) {
        this.tenantConnections.delete(ws.tenantId);
      }
    }

    // Broadcast offline status
    if (ws.conversationId) {
      this.broadcastToConversation(ws.conversationId, {
        type: 'status',
        payload: {
          action: 'user_offline',
          userId: ws.userId,
          connectionId: ws.id
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Ping all connections to check liveness
   */
  private pingAll(): void {
    for (const ws of this.connections.values()) {
      if (!ws.isAlive) {
        ws.terminate();
        this.handleDisconnect(ws);
        continue;
      }

      ws.isAlive = false;
      ws.ping();
    }
  }

  /**
   * Send message to specific client
   */
  send(connectionId: string, message: WebSocketMessage): boolean {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WebSocketServer] Failed to send to ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Send error to client
   */
  private sendError(connectionId: string, error: string): void {
    this.send(connectionId, {
      type: 'error',
      payload: { error },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all connections in a conversation
   */
  broadcastToConversation(
    conversationId: string,
    message: WebSocketMessage,
    excludeConnectionId?: string
  ): void {
    for (const ws of this.connections.values()) {
      if (ws.conversationId === conversationId && ws.id !== excludeConnectionId) {
        this.send(ws.id, message);
      }
    }
  }

  /**
   * Broadcast to all connections of a tenant
   */
  broadcastToTenant(tenantId: string, message: WebSocketMessage): void {
    const connectionIds = this.tenantConnections.get(tenantId);
    if (!connectionIds) return;

    for (const connectionId of connectionIds) {
      this.send(connectionId, message);
    }
  }

  /**
   * Send to specific user across all their connections
   */
  sendToUser(tenantId: string, userId: string, message: WebSocketMessage): void {
    for (const ws of this.connections.values()) {
      if (ws.tenantId === tenantId && ws.userId === userId) {
        this.send(ws.id, message);
      }
    }
  }

  /**
   * Register message handler for external processing
   */
  onMessage(handler: (data: {
    tenantId: string;
    userId: string;
    conversationId: string;
    message: string;
  }) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections for a tenant
   */
  getTenantConnectionCount(tenantId: string): number {
    return this.tenantConnections.get(tenantId)?.size || 0;
  }

  /**
   * Get all active connections
   */
  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values()).map(ws => ({
      id: ws.id,
      tenantId: ws.tenantId,
      userId: ws.userId || '',
      conversationId: ws.conversationId,
      source: ws.source,
      connectedAt: ws.lastActivity
    }));
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const ws of this.connections.values()) {
      ws.close(1001, 'Server shutting down');
    }

    if (this.wss) {
      this.wss.close();
    }

    this.connections.clear();
    this.tenantConnections.clear();

    console.log('[WebSocketServer] Shutdown complete');
  }
}

export const webSocketServer = new WebSocketServerManager();
