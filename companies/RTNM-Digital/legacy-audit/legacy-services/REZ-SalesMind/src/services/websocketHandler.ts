/**
 * WebSocket Handler - Real-time signal broadcasting
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface ClientInfo {
  id: string;
  subscriptions: Set<string>;
  connectedAt: Date;
}

export class WebSocketHandler {
  private clients: Map<WebSocket, ClientInfo> = new Map();

  handleConnection(ws: WebSocket): void {
    const clientId = uuidv4();
    this.clients.set(ws, {
      id: clientId,
      subscriptions: new Set(['signals', 'leads']),
      connectedAt: new Date()
    });

    console.log('SalesMind WebSocket client connected:', clientId);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log('SalesMind WebSocket client disconnected:', clientId);
    });
  }

  handleMessage(ws: WebSocket, message: any): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(client, message.channel);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(client, message.channel);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  }

  broadcast(signal: any, channel: string = 'signals'): void {
    const message = JSON.stringify({
      type: 'signal',
      channel,
      data: signal,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((clientInfo, ws) => {
      // Only send to clients subscribed to this channel
      if (clientInfo.subscriptions.has(channel) && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
        }
      }
    });
  }

  private handleSubscribe(client: ClientInfo, channel: string): void {
    client.subscriptions.add(channel);
    console.log('Client', client.id, 'subscribed to:', channel);
  }

  private handleUnsubscribe(client: ClientInfo, channel: string): void {
    client.subscriptions.delete(channel);
    console.log('Client', client.id, 'unsubscribed from:', channel);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}