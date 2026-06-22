import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    phoneNumber: string;
    email?: string;
  };
  store: {
    _id: string;
    name: string;
    merchantId: string;
  };
  items: Array<{
    product: {
      _id: string;
      name: string;
    };
    variant?: {
      name: string;
    };
    quantity: number;
    price: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    // Backend field is 'delivery' (IOrderTotals), not 'deliveryFee'
    delivery: number;
    discount: number;
    lockFeeDiscount?: number;
    cashback: number;
    total: number;
    paidAmount?: number;
    refundAmount?: number;
    platformFee: number;
    merchantPayout: number;
    snapshotCashbackRate?: number;
  };
  payment?: {
    method: string;
    status: string;
    coinsUsed?: {
      rezCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  };
  // Canonical types: @rez/shared-types — migrate imports when package is published
  // 11 canonical order statuses (Phase 3)
  status:
    | 'placed'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'dispatched'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'cancelling'
    | 'returned'
    | 'refunded';
  // 11 canonical payment statuses (Phase 3) — aligns with
  // SOURCE-OF-TRUTH/DATA-TYPES.md. Legacy values ('paid', 'awaiting_payment',
  // 'authorized', 'unknown') have been removed; backend no longer emits them.
  paymentStatus:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | 'refund_initiated'
    | 'refund_processing'
    | 'refund_failed'
    | 'partially_refunded'
    | 'refunded';
  paymentMethod: string;
  fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
  // Legacy fallback field retained for backwards compatibility with older payloads.
  deliveryType?: string;
  fulfillmentDetails?: {
    storeAddress?: string;
    tableNumber?: string;
    vehicleInfo?: string;
    estimatedReadyTime?: string;
    pickupInstructions?: string;
  };
  stateVersion?: number;
  // W03: Order flags for internal/admin annotations
  flags?: string[];
  // W04: Webhook deduplication guard — set true once post-payment processing completes.
  // This field is read-only from the admin perspective; do not edit it here.
  // It is included for audit purposes only.
  postPaymentProcessed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalPlatformFees: number;
  };
}

export interface OrdersListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class OrdersService {
  /**
   * Get list of orders
   */
  async getOrders(
    page: number = 1,
    limit: number = 20,
    status?: string,
    merchantId?: string,
    search?: string,
    fulfillmentType?: string
  ): Promise<OrdersListResponse> {
    try {
      let url = `admin/orders?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (merchantId) url += `&merchantId=${merchantId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (fulfillmentType) url += `&fulfillmentType=${fulfillmentType}`;

      logger.info('[Orders] Fetching orders list...');
      const response = await apiClient.get<Order[]>(url);

      if (response.success) {
        logger.info('[Orders] Orders fetched successfully');
        // Backend returns { data: { orders: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          orders: nested?.orders || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination ||
            response.pagination || { page, limit, total: 0, totalPages: 0 },
        };
      }

      throw new Error(response.message || 'Failed to get orders');
    } catch (error: any) {
      logger.error('[Orders] Get orders error:', error.message);
      throw new Error(error.message || 'Failed to get orders');
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      logger.info('[Orders] Fetching order:', orderId);
      const response = await apiClient.get<Order>(`admin/orders/${orderId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get order');
    } catch (error: any) {
      logger.error('[Orders] Get order error:', error.message);
      throw new Error(error.message || 'Failed to get order');
    }
  }

  /**
   * Get order statistics
   */
  async getStats(): Promise<OrderStats> {
    try {
      logger.info('[Orders] Fetching order stats...');
      const response = await apiClient.get<OrderStats>('admin/orders/stats');

      if (response.success && response.data) {
        logger.info('[Orders] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get order stats');
    } catch (error: any) {
      logger.error('[Orders] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get order stats');
    }
  }

  /**
   * Refund an order
   * AA-ORD-001: Added idempotency key for safe retries
   * AA-ORD-020: Includes coin reversal handling
   *
   * NOTE: `idempotencyKey` is REQUIRED. The previous implementation generated a fresh
   * UUID on every call when the caller omitted the key, which defeated the purpose of
   * the idempotency check — a double-click became two distinct refunds with distinct
   * keys, so the backend saw two separate operations instead of deduplicating them.
   * Callers must generate a stable key (e.g. via useRef) once per refund modal session
   * and pass the SAME key on any retry.
   */
  async refundOrder(
    orderId: string,
    amount: number, // AA-ORD-002: Amount validation
    reason: string,
    idempotencyKey: string // AA-ORD-001: Required for retry safety — must be stable per refund session
  ): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    if (!idempotencyKey) {
      // Fail fast rather than silently generating a throwaway key that would defeat dedup.
      throw new Error('idempotencyKey is required for refundOrder');
    }
    try {
      // AA-ORD-001 FIX: crypto.randomUUID() for collision-safe idempotency — no Date.now() arithmetic.
      const key = idempotencyKey || `${orderId}-${crypto.randomUUID()}`;

      if (__DEV__) logger.info('[Orders] Refunding order: ' + orderId + ' amount: ' + amount);

      // AA-ORD-020: Request must include coins reversal handling
      const response = await apiClient.post<any>(`admin/orders/${orderId}/refund`, {
        amount,
        reason,
        idempotencyKey,
        includeCoins: true, // Ensure coins are reversed
      });

      return {
        success: response.success,
        message: response.message || 'Order refunded',
        refundAmount: response.data?.refundAmount || amount,
      };
    } catch (error: any) {
      logger.error('[Orders] Refund order error:', error.message);
      throw new Error(error.message || 'Failed to refund order');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Orders] Updating order status:', { orderId, status });
      const response = await apiClient.put<any>(`admin/orders/${orderId}/status`, {
        status,
        notes,
      });

      return {
        success: response.success,
        message: response.message || 'Status updated',
      };
    } catch (error: any) {
      logger.error('[Orders] Update status error:', error.message);
      throw new Error(error.message || 'Failed to update order status');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Orders] Cancelling order:', orderId);
      const response = await apiClient.post<any>(`admin/orders/${orderId}/cancel`, { reason });

      return {
        success: response.success,
        message: response.message || 'Order cancelled',
      };
    } catch (error: any) {
      logger.error('[Orders] Cancel order error:', error.message);
      throw new Error(error.message || 'Failed to cancel order');
    }
  }
}

export const ordersService = new OrdersService();
export default ordersService;
