/**
 * WebSocket Support
 * Real-time event subscriptions and notifications
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Client {
  id: string;
  ws: WebSocket;
  tenantId: string;
  subscriptions: Set<string>;
  createdAt: Date;
}

interface Subscription {
  id: string;
  clientId: string;
  tenantId: string;
  eventType?: string;
  severity?: string;
  patterns: string[];
}

interface EventMessage {
  type: 'event' | 'insight' | 'notification' | 'ping' | 'pong';
  data?: any;
  timestamp: string;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.setupServer();
    this.startHeartbeat();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenantId') || 'anonymous';

      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        ws,
        tenantId,
        subscriptions: new Set(),
        createdAt: new Date()
      };

      this.clients.set(clientId, client);

      console.log(`[WS] Client connected: ${clientId} (tenant: ${tenantId})`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'notification',
        data: {
          event: 'connected',
          clientId,
          message: 'Connected to HOJAI SkillNet WebSocket'
        },
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (err) {
          console.error('[WS] Invalid message:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Client error: ${clientId}`, err);
      });
    });
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.action) {
      case 'subscribe':
        this.handleSubscribe(clientId, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'subscribe_insights':
        this.handleInsightSubscribe(clientId, message);
        break;
      default:
        console.log(`[WS] Unknown action: ${message.action}`);
    }
  }

  private handleSubscribe(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { eventType, pattern } = message;
    const subscriptionId = uuidv4();

    const subscription: Subscription = {
      id: subscriptionId,
      clientId,
      tenantId: client.tenantId,
      eventType,
      patterns: pattern ? [pattern] : []
    };

    this.subscriptions.set(subscriptionId, subscription);
    client.subscriptions.add(subscriptionId);

    console.log(`[WS] Client ${clientId} subscribed to ${eventType || 'all events'}`);

    this.sendToClient(clientId, {
      type: 'notification',
      data: {
        event: 'subscribed',
        subscriptionId,
        eventType,
        message: `Subscribed to ${eventType || 'all events'}`
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleInsightSubscribe(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { severity } = message;
    const subscriptionId = uuidv4();

    const subscription: Subscription = {
      id: subscriptionId,
      clientId,
      tenantId: client.tenantId,
      severity,
      patterns: []
    };

    this.subscriptions.set(subscriptionId, subscription);
    client.subscriptions.add(subscriptionId);

    console.log(`[WS] Client ${clientId} subscribed to ${severity || 'all'} insights`);

    this.sendToClient(clientId, {
      type: 'notification',
      data: {
        event: 'subscribed_insights',
        subscriptionId,
        severity,
        message: `Subscribed to ${severity || 'all'} insights`
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleUnsubscribe(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { subscriptionId } = message;

    if (subscriptionId) {
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription && subscription.clientId === clientId) {
        this.subscriptions.delete(subscriptionId);
        client.subscriptions.delete(subscriptionId);
        console.log(`[WS] Client ${clientId} unsubscribed from ${subscriptionId}`);
      }
    } else {
      // Unsubscribe from all
      for (const subId of client.subscriptions) {
        this.subscriptions.delete(subId);
      }
      client.subscriptions.clear();
      console.log(`[WS] Client ${clientId} unsubscribed from all`);
    }

    this.sendToClient(clientId, {
      type: 'notification',
      data: { event: 'unsubscribed' },
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clean up subscriptions
    for (const subId of client.subscriptions) {
      this.subscriptions.delete(subId);
    }

    this.clients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId}`);
  }

  // Public API

  /**
   * Broadcast event to subscribed clients
   */
  broadcastEvent(tenantId: string, event: any): void {
    const message: EventMessage = {
      type: 'event',
      data: event,
      timestamp: new Date().toISOString()
    };

    for (const [subId, subscription] of this.subscriptions) {
      if (subscription.tenantId !== tenantId) continue;
      if (subscription.eventType && subscription.eventType !== event.type) continue;

      // Check pattern match
      if (subscription.patterns.length > 0) {
        const matches = subscription.patterns.some(p => {
          const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
          return regex.test(event.type);
        });
        if (!matches) continue;
      }

      this.sendToClient(subscription.clientId, message);
    }
  }

  /**
   * Broadcast insight to subscribed clients
   */
  broadcastInsight(tenantId: string, insight: any): void {
    const message: EventMessage = {
      type: 'insight',
      data: insight,
      timestamp: new Date().toISOString()
    };

    for (const [subId, subscription] of this.subscriptions) {
      if (subscription.tenantId !== tenantId) continue;
      if (subscription.severity) {
        const severityOrder = ['low', 'medium', 'high', 'critical'];
        const insightIdx = severityOrder.indexOf(insight.severity);
        const subIdx = severityOrder.indexOf(subscription.severity);
        if (insightIdx < subIdx) continue;
      }

      this.sendToClient(subscription.clientId, message);
    }
  }

  /**
   * Send to specific client
   */
  private sendToClient(clientId: string, message: EventMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[WS] Failed to send to ${clientId}:`, err);
    }
  }

  /**
   * Get connection stats
   */
  getStats(): {
    totalClients: number;
    totalSubscriptions: number;
    clientsByTenant: Record<string, number>;
  } {
    const clientsByTenant: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const client of this.clients.values()) {
      clientsByTenant[client.tenantId] = (clientsByTenant[client.tenantId] || 0) + 1;
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalClients: this.clients.size,
      totalSubscriptions,
      clientsByTenant
    };
  }

  /**
   * Heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000); // 30 seconds
  }

  /**
   * Close all connections
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

export default WebSocketManager;
