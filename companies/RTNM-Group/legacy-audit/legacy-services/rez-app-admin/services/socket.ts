import io, { Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';
import { storageService } from './storage';
import { logger } from '../utils/logger';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private connectionUrl: string;
  // BUG-026: Callback to notify the UI when reconnection attempts are exhausted.
  private onConnectionLostCallback: (() => void) | null = null;

  constructor() {
    this.connectionUrl = API_CONFIG.SOCKET_URL;
  }

  async connect(): Promise<void> {
    if ((this.socket && this.socket.connected) || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = await storageService.getAuthToken();

      // A10-H11 FIX: Guard against null/undefined auth token on web.
      // If no token is available, throw an error rather than connecting with undefined auth,
      // which would cause the server to reject the connection or treat it as anonymous.
      if (!token) {
        logger.warn('[Admin Socket] No auth token available — refusing to connect without credentials');
        throw new Error('Authentication required. Please log in.');
      }

      // PERF-1 + PERF-8:
      //   - Drop the 'polling' transport on native. RN has a real WebSocket
      //     implementation; long-polling fallback wastes bandwidth (~25KB per
      //     request every 25s) and hides socket failures behind slower
      //     pseudo-realtime. Web still needs polling as a graceful fallback.
      //   - Stretch reconnect backoff from 1s→5s / 5 tries to 2s→30s / 3 tries.
      //     On a Render autoscale event every replica's admin socket used to
      //     reconnect within 9 seconds; the new window spreads the storm
      //     across 90 seconds with fewer total attempts.
      const isWeb = typeof window !== 'undefined' && typeof (window as unknown as { document: unknown }).document !== 'undefined';
      this.socket = io(this.connectionUrl, {
        path: '/socket.io',
        transports: isWeb ? ['websocket', 'polling'] : ['websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: 3,
        auth: token ? { token } : undefined,
        timeout: API_CONFIG.SOCKET_TIMEOUT,
      });

      this.setupEventListeners();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, API_CONFIG.SOCKET_TIMEOUT);

        if (this.socket && this.socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        this.socket?.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket?.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isConnected = true;
      logger.info('[Admin Socket] Connected successfully');
    } catch (error) {
      this.isConnected = false;

      logger.error('[Admin Socket] Connection failed:', error);

      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      logger.info('[Admin Socket] Disconnected');
    }
  }

  // BUG-026: Allow callers to register a handler for connection exhaustion.
  onConnectionLost(callback: () => void): () => void {
    this.onConnectionLostCallback = callback;
    return () => { this.onConnectionLostCallback = null; };
  }

  // A10-M6 FIX: Counterpart to onConnectionLost — fires when the socket successfully
  // reconnects after a connection loss. Callers use this to reset the "connection lost"
  // UI banner without needing direct socket instance access.
  private onConnectionRestoredCallback: (() => void) | null = null;
  onConnectionRestored(callback: () => void): () => void {
    this.onConnectionRestoredCallback = callback;
    return () => { this.onConnectionRestoredCallback = null; };
  }

  isSocketConnected(): boolean {
    return this.isConnected && (this.socket ? this.socket.connected : false);
  }

  /** Returns the raw Socket.IO instance (or null before connect is called). */
  getSocket(): Socket | null {
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      logger.info('[Admin Socket] Connected');
      // A10-M6 FIX: If we were previously disconnected (callback was set), fire it
      // so the UI knows to reset "connection lost" banners and re-enable real-time features.
      if (this.onConnectionRestoredCallback) {
        this.onConnectionRestoredCallback();
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      logger.info('[Admin Socket] Disconnected');
    });

    this.socket.on('connect_error', (error: any) => {
      logger.error('[Admin Socket] Connection error:', error);
    });

    // BUG-026: Fire the "connection lost" callback when socket.io exhausts all
    // reconnection attempts so the UI can show a persistent "Connection lost" banner.
    this.socket.io.on('reconnect_failed', () => {
      logger.warn('[Admin Socket] All reconnection attempts exhausted — connection lost');
      this.isConnected = false;
      if (this.onConnectionLostCallback) {
        this.onConnectionLostCallback();
      }
    });

    this.socket.on('error', (error: any) => {
      logger.error('[Admin Socket] Error:', error);
    });
  }

  // ── Backend-emitted events ─────────────────────────────────
  // The backend emits 'job:failure' to the 'admin' room (via jobTracker.ts).
  // It also emits 'sla:breach' (slaMonitorJob.ts), 'anomaly:alert'
  // (anomalyDetectionJob.ts), and various ORDER_* alerts via
  // orderSocketService.emitToAdmin().
  //
  // Order status events emitted by orderSocketService.ts to order-specific
  // rooms are also forwarded so the admin dashboard can refresh its order list.
  //
  // Merchant lifecycle events emitted by admin/merchants.ts to 'admin-room'
  // are wired up to refresh the admin merchant list.
  //
  // NOTE: The following events are NOT currently emitted by the backend and
  // need backend implementation before they will deliver data:
  //   - gmv:update          (no backend emitter exists)
  //   - merchant:alert      (no backend emitter exists)
  //   - fraud:alert         (no backend emitter exists — anomaly:alert is
  //                          the closest equivalent, emitted to 'admin-room')
  //   - queue:backlog       (no backend emitter exists)

  onNewOrder(
    callback: (data: { orderId: string; merchantName: string; amount: number }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Backend emits 'order:created' (OrderSocketService) to order-specific rooms
    // and 'web-order:new' (webOrderingRoutes) to merchant rooms when a new web
    // order is placed.  The admin dashboard listens on 'order:created' which is
    // the canonical order-creation event emitted by the backend.
    this.socket.on('order:created', callback);

    return () => {
      this.socket?.off('order:created', callback);
    };
  }

  // CRITICAL-2 FIX: Listen for order status mutations triggered by merchants so
  // the admin dashboard refreshes its order list without manual polling.
  onOrderStatusUpdated(
    callback: (data: {
      orderId: string;
      orderNumber: string;
      status: string;
      previousStatus?: string;
      message?: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // orderSocketService.emitOrderStatusUpdate() emits to order-specific rooms
    // (via SocketRoom.order) when the merchant-service FSM updates an order.
    this.socket.on('order:status_updated', callback);

    return () => {
      this.socket?.off('order:status_updated', callback);
    };
  }

  onOrderCancelled(
    callback: (data: {
      orderId: string;
      orderNumber: string;
      status: string;
      previousStatus?: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by orderSocketService.emitOrderStatusUpdate() when status is
    // 'cancelled' (switch case line 363 of orderSocketService.ts).
    this.socket.on('order:cancelled', callback);

    return () => {
      this.socket?.off('order:cancelled', callback);
    };
  }

  // HIGH-5 FIX: Listen for merchant lifecycle events emitted by admin/merchants.ts
  // to 'admin-room' so the admin merchant list updates in real-time.
  onMerchantLive(
    callback: (data: {
      merchantId: string;
      status: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by admin/merchants.ts at approve/suspend/reactivate handlers
    // (lines 508, 810, 1013) alongside the specific event.
    this.socket.on('merchant:live', callback);

    return () => {
      this.socket?.off('merchant:live', callback);
    };
  }

  onMerchantApproved(
    callback: (data: {
      merchantId: string;
      status: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by admin/merchants.ts line 509 when a merchant is approved.
    this.socket.on('merchant:approved', callback);

    return () => {
      this.socket?.off('merchant:approved', callback);
    };
  }

  onMerchantSuspended(
    callback: (data: {
      merchantId: string;
      status: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by admin/merchants.ts line 811 when a merchant is suspended.
    this.socket.on('merchant:suspended', callback);

    return () => {
      this.socket?.off('merchant:suspended', callback);
    };
  }

  onMerchantReactivated(
    callback: (data: {
      merchantId: string;
      status: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by admin/merchants.ts line 1014 when a merchant is reactivated.
    this.socket.on('merchant:reactivated', callback);

    return () => {
      this.socket?.off('merchant:reactivated', callback);
    };
  }

  onJobFailure(
    callback: (data: {
      name: string;
      error: string;
      consecutiveFailures: number;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    this.socket.on('job:failure', callback);

    return () => {
      this.socket?.off('job:failure', callback);
    };
  }

  onSLABreach(
    callback: (data: {
      orderId: string;
      type: string;
      elapsed: number;
      threshold: number;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by slaMonitorJob.ts to the 'admin' room
    this.socket.on('sla:breach', callback);

    return () => {
      this.socket?.off('sla:breach', callback);
    };
  }

  onAnomalyAlert(
    callback: (data: { type: string; severity: string; message: string; timestamp: string }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by anomalyDetectionJob.ts to the 'admin-room' room
    this.socket.on('anomaly:alert', callback);

    return () => {
      this.socket?.off('anomaly:alert', callback);
    };
  }

  onOrderAlert(
    callback: (data: {
      type: string;
      orderId?: string;
      message: string;
      severity?: string;
      timestamp: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return () => {};
    }

    // Emitted by orderAlerts.ts / orderLifecycleJobs.ts to the 'admin' room
    this.socket.on('ORDER_ALERT', callback);
    this.socket.on('ORDER_STUCK_ALERT', callback);
    this.socket.on('ORDER_RECONCILIATION_ALERT', callback);
    this.socket.on('MERCHANT_CREDIT_FAILED', callback);
    this.socket.on('PAYMENT_AMOUNT_MISMATCH', callback);

    return () => {
      this.socket?.off('ORDER_ALERT', callback);
      this.socket?.off('ORDER_STUCK_ALERT', callback);
      this.socket?.off('ORDER_RECONCILIATION_ALERT', callback);
      this.socket?.off('MERCHANT_CREDIT_FAILED', callback);
      this.socket?.off('PAYMENT_AMOUNT_MISMATCH', callback);
    };
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      logger.warn('[Admin Socket] Socket not initialized');
      return;
    }

    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
export default socketService;
