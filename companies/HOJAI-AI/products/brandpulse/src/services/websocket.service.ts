import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// ============================================================================
// WEBSOCKET SERVICE - Real-time Updates
// ============================================================================

export interface WSClient {
  id: string;
  ws: WebSocket;
  brandIds: Set<string>;
  subscribedAt: Date;
}

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'review' | 'alert' | 'sentiment_update' | 'heartbeat';
  payload: any;
  timestamp: string;
}

export interface ReviewEvent {
  type: 'new_review' | 'review_updated' | 'review_deleted';
  brandId: string;
  review: any;
}

export interface AlertEvent {
  type: 'new_alert' | 'alert_updated' | 'alert_resolved';
  brandId: string;
  alert: any;
}

export interface SentimentEvent {
  type: 'sentiment_changed';
  brandId: string;
  score: number;
  previousScore: number;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client: WSClient = {
        id: clientId,
        ws,
        brandIds: new Set(),
        subscribedAt: new Date()
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(client, {
        type: 'heartbeat',
        payload: { clientId, message: 'Connected to BrandPulse WebSocket' },
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`[WS] Client error ${clientId}:`, error);
      });
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log('[WS] WebSocket server initialized on /ws');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(client: WSClient, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.payload?.brandIds && Array.isArray(message.payload.brandIds)) {
          message.payload.brandIds.forEach((id: string) => {
            client.brandIds.add(id);
          });
          this.sendToClient(client, {
            type: 'heartbeat',
            payload: { subscribed: Array.from(client.brandIds) },
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'unsubscribe':
        if (message.payload?.brandIds && Array.isArray(message.payload.brandIds)) {
          message.payload.brandIds.forEach((id: string) => {
            client.brandIds.delete(id);
          });
        } else {
          // Unsubscribe from all
          client.brandIds.clear();
        }
        break;

      case 'heartbeat':
        this.sendToClient(client, {
          type: 'heartbeat',
          payload: { received: true },
          timestamp: new Date().toISOString()
        });
        break;
    }
  }

  /**
   * Broadcast new review to subscribed clients
   */
  broadcastReview(event: ReviewEvent): void {
    const message: WSMessage = {
      type: 'review',
      payload: event,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client) => {
      if (client.brandIds.has(event.brandId)) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Broadcast alert to subscribed clients
   */
  broadcastAlert(event: AlertEvent): void {
    const message: WSMessage = {
      type: 'alert',
      payload: event,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client) => {
      if (client.brandIds.has(event.brandId)) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Broadcast sentiment update
   */
  broadcastSentimentUpdate(event: SentimentEvent): void {
    const message: WSMessage = {
      type: 'sentiment_update',
      payload: event,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client) => {
      if (client.brandIds.has(event.brandId)) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Broadcast to all clients
   */
  broadcast(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(client, {
            type: 'heartbeat',
            payload: { timestamp: Date.now() },
            timestamp: new Date().toISOString()
          });
        } else {
          // Remove dead connections
          this.clients.delete(client.id);
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients subscribed to a brand
   */
  getBrandSubscribers(brandId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.brandIds.has(brandId)) {
        count++;
      }
    });
    return count;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.wss?.close();
    console.log('[WS] WebSocket server shut down');
  }
}

export const wsService = new WebSocketService();
