/**
 * WebSocket Handler - Real-time signal broadcasting
 * FIXED: message structure validation, heartbeat ping/pong
 */
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface ClientInfo {
    id: string;
    subscriptions: Set<string>;
    connectedAt: Date;
    lastPing: Date;
}

interface WSMessage {
    type: string;
    channel?: string;
    [key: string]: unknown;
}

export class WebSocketHandler {
    private clients = new Map<WebSocket, ClientInfo>();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Start heartbeat interval to detect stale connections
        this.heartbeatInterval = setInterval(() => {
            this.checkHeartbeats();
        }, 30000); // Every 30 seconds
    }

    handleConnection(ws: WebSocket): void {
        const clientId = uuidv4();
        this.clients.set(ws, {
            id: clientId,
            subscriptions: new Set(['signals', 'leads']),
            connectedAt: new Date(),
            lastPing: new Date()
        });
        console.log('SalesMind WebSocket client connected:', clientId);

        ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString()
        }));

        ws.on('close', () => {
            this.clients.delete(ws);
            console.log('SalesMind WebSocket client disconnected:', clientId);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(ws);
        });
    }

    // FIXED: validate message structure before processing
    handleMessage(ws: WebSocket, message: unknown): void {
        // Validate message is an object
        if (!message || typeof message !== 'object' || Array.isArray(message)) {
            console.warn('Invalid WebSocket message: not an object');
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            return;
        }

        const msg = message as WSMessage;

        // Validate message has a type
        if (!msg.type || typeof msg.type !== 'string') {
            ws.send(JSON.stringify({ type: 'error', message: 'Message must have a type field' }));
            return;
        }

        const client = this.clients.get(ws);
        if (!client) return;

        switch (msg.type) {
            case 'subscribe':
                // FIXED: validate channel is a non-empty string
                if (typeof msg.channel !== 'string' || msg.channel.trim().length === 0) {
                    ws.send(JSON.stringify({ type: 'error', message: 'channel must be a non-empty string' }));
                    return;
                }
                this.handleSubscribe(client, msg.channel.trim());
                break;
            case 'unsubscribe':
                if (typeof msg.channel !== 'string') {
                    ws.send(JSON.stringify({ type: 'error', message: 'channel must be a string' }));
                    return;
                }
                this.handleUnsubscribe(client, msg.channel);
                break;
            case 'ping':
                // Update last ping time and respond with pong
                client.lastPing = new Date();
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
            default:
                ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
        }
    }

    broadcast(signal: unknown, channel = 'signals'): void {
        const message = JSON.stringify({
            type: 'signal',
            channel,
            data: signal,
            timestamp: new Date().toISOString()
        });
        this.clients.forEach((clientInfo, ws) => {
            if (clientInfo.subscriptions.has(channel) && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (error) {
                    console.error('Failed to send WebSocket message:', error);
                    this.clients.delete(ws);
                }
            }
        });
    }

    private handleSubscribe(client: ClientInfo, channel: string): void {
        client.subscriptions.add(channel);
        client.lastPing = new Date();
        console.log('Client', client.id, 'subscribed to:', channel);
        client.subscriptions.forEach(() => {}); // Access subscriptions for linter
    }

    private handleUnsubscribe(client: ClientInfo, channel: string): void {
        client.subscriptions.delete(channel);
        console.log('Client', client.id, 'unsubscribed from:', channel);
    }

    private checkHeartbeats(): void {
        const now = new Date();
        this.clients.forEach((clientInfo, ws) => {
            // Disconnect clients that haven't responded to ping in 2 minutes
            if (now.getTime() - clientInfo.lastPing.getTime() > 120000) {
                console.log('Closing stale WebSocket connection:', clientInfo.id);
                ws.close(4000, 'Connection timeout');
                this.clients.delete(ws);
            }
        });
    }

    getClientCount(): number {
        return this.clients.size;
    }

    // FIXED: cleanup on shutdown
    shutdown(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Close all connections
        this.clients.forEach((clientInfo, ws) => {
            try {
                ws.close(1001, 'Server shutting down');
            } catch {
                // ignore
            }
        });
        this.clients.clear();
        console.log('WebSocket handler shut down');
    }
}
