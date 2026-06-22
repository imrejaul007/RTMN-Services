import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';

interface TwinSubscription {
  socketId: string;
  twinId: string;
  userId?: string;
}

interface SyncMessage {
  type: 'state_update' | 'relationship_update' | 'event_recorded' | 'snapshot_created' | 'twin_deleted';
  twinId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  version?: number;
}

class SyncService {
  private io: Server | null = null;
  private subscriptions: Map<string, TwinSubscription[]> = new Map();
  private socketToUser: Map<string, { userId?: string; tenantId?: string }> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000'),
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    logger.info(`Client connected: ${socket.id}`);

    // Extract user info from handshake
    const userId = socket.handshake.auth.userId;
    const tenantId = socket.handshake.auth.tenantId;

    this.socketToUser.set(socket.id, { userId, tenantId });

    // Handle twin subscription
    socket.on('subscribe', (data: { twinId: string }) => {
      this.subscribeToTwin(socket.id, data.twinId, userId);
    });

    // Handle twin unsubscription
    socket.on('unsubscribe', (data: { twinId: string }) => {
      this.unsubscribeFromTwin(socket.id, data.twinId);
    });

    // Handle batch subscription
    socket.on('subscribe_batch', (data: { twinIds: string[] }) => {
      for (const twinId of data.twinIds) {
        this.subscribeToTwin(socket.id, twinId, userId);
      }
      socket.emit('subscribed_batch', { twinIds: data.twinIds });
    });

    // Handle ping/pong for keepalive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket.id);
    });
  }

  /**
   * Subscribe a socket to twin updates
   */
  subscribeToTwin(socketId: string, twinId: string, userId?: string): void {
    const key = twinId;
    const subscriptions = this.subscriptions.get(key) || [];

    // Check if already subscribed
    if (!subscriptions.some(s => s.socketId === socketId)) {
      subscriptions.push({ socketId, twinId, userId });
      this.subscriptions.set(key, subscriptions);

      // Join the room
      const room = `twin:${twinId}`;
      const socketInstance = this.getSocket(socketId);
      if (socketInstance) {
        socketInstance.join(room);
      }

      logger.debug(`Socket ${socketId} subscribed to twin ${twinId}`);
    }

    // Confirm subscription
    const socketInstance = this.getSocket(socketId);
    if (socketInstance) {
      socketInstance.emit('subscribed', { twinId });
    }
  }

  /**
   * Unsubscribe a socket from twin updates
   */
  unsubscribeFromTwin(socketId: string, twinId: string): void {
    const key = twinId;
    const subscriptions = this.subscriptions.get(key) || [];
    const filtered = subscriptions.filter(s => s.socketId !== socketId);

    if (filtered.length > 0) {
      this.subscriptions.set(key, filtered);
    } else {
      this.subscriptions.delete(key);
    }

    const socketInstance = this.getSocket(socketId);
    if (socketInstance) {
      socketInstance.leave(`twin:${twinId}`);
    }
    logger.debug(`Socket ${socketId} unsubscribed from twin ${twinId}`);
  }

  /**
   * Get socket instance by ID
   */
  private getSocket(socketId: string): Socket | null {
    if (!this.io) return null;
    const sockets = this.io.sockets.sockets;
    for (const [, socket] of sockets) {
      if (socket.id === socketId) {
        return socket;
      }
    }
    return null;
  }

  /**
   * Handle socket disconnect - clean up all subscriptions
   */
  private handleDisconnect(socketId: string): void {
    logger.info(`Client disconnected: ${socketId}`);

    // Remove from all subscriptions
    for (const [twinId, subs] of this.subscriptions.entries()) {
      const filtered = subs.filter(s => s.socketId !== socketId);
      if (filtered.length > 0) {
        this.subscriptions.set(twinId, filtered);
      } else {
        this.subscriptions.delete(twinId);
      }
    }

    this.socketToUser.delete(socketId);
  }

  /**
   * Broadcast state update to all subscribers
   */
  async broadcastStateUpdate(
    twinId: string,
    newState: Record<string, unknown>,
    version: number
  ): Promise<void> {
    const message: SyncMessage = {
      type: 'state_update',
      twinId,
      data: { state: newState, version },
      timestamp: new Date(),
      version,
    };

    await this.emit(`twin:${twinId}`, 'update', message);
    logger.debug(`Broadcast state update for twin ${twinId}`, { version });
  }

  /**
   * Broadcast relationship update
   */
  async broadcastRelationshipUpdate(
    twinId: string,
    relationship: Record<string, unknown>,
    action: 'added' | 'removed'
  ): Promise<void> {
    const message: SyncMessage = {
      type: 'relationship_update',
      twinId,
      data: { relationship, action },
      timestamp: new Date(),
    };

    // Emit to both source and target twin rooms
    await Promise.all([
      this.emit(`twin:${twinId}`, 'relationship_update', message),
      this.emit(`twin:${relationship.targetId}`, 'relationship_update', message),
    ]);
  }

  /**
   * Broadcast event recording
   */
  async broadcastEventRecorded(
    twinId: string,
    event: Record<string, unknown>
  ): Promise<void> {
    const message: SyncMessage = {
      type: 'event_recorded',
      twinId,
      data: { event },
      timestamp: new Date(),
    };

    await this.emit(`twin:${twinId}`, 'event', message);
  }

  /**
   * Broadcast snapshot creation
   */
  async broadcastSnapshotCreated(
    twinId: string,
    snapshot: Record<string, unknown>
  ): Promise<void> {
    const message: SyncMessage = {
      type: 'snapshot_created',
      twinId,
      data: { snapshot },
      timestamp: new Date(),
    };

    await this.emit(`twin:${twinId}`, 'snapshot', message);
  }

  /**
   * Broadcast twin deletion
   */
  async broadcastTwinDeleted(twinId: string): Promise<void> {
    const message: SyncMessage = {
      type: 'twin_deleted',
      twinId,
      data: {},
      timestamp: new Date(),
    };

    // Notify all subscribers before cleanup
    await this.emit(`twin:${twinId}`, 'deleted', message);

    // Remove all subscriptions for this twin
    this.subscriptions.delete(twinId);
  }

  /**
   * Send update to a specific room
   */
  private async emit(room: string, event: string, data: SyncMessage): Promise<void> {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  /**
   * Get subscribers for a twin
   */
  getSubscribers(twinId: string): TwinSubscription[] {
    return this.subscriptions.get(twinId) || [];
  }

  /**
   * Get total number of connected clients
   */
  getConnectedClients(): number {
    return this.io?.sockets.sockets.size || 0;
  }

  /**
   * Get connection stats
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    twinsWithSubscribers: number;
  } {
    let totalSubscriptions = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.length;
    }

    return {
      connectedClients: this.getConnectedClients(),
      totalSubscriptions,
      twinsWithSubscribers: this.subscriptions.size,
    };
  }

  /**
   * Send a direct message to a specific socket
   */
  sendToSocket(socketId: string, event: string, data: unknown): void {
    this.io?.to(socketId).emit(event, data);
  }

  /**
   * Emit a room-based event
   */
  emitToRoom(room: string, event: string, data: unknown): void {
    this.io?.to(room).emit(event, data);
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): Server | null {
    return this.io;
  }
}

export const syncService = new SyncService();
