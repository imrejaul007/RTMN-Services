/**
 * Order Service Client
 * Connects AI Waiter to REZ POS Service (Port 4081)
 */

import axios, { AxiosInstance } from 'axios';

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  customizations?: string[];
  price: number;
  modifiers?: any[];
}

export interface CreateOrderRequest {
  customerId: string;
  tableId?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  guestName?: string;
  guestPhone?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId: string;
  tableId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface KDSOrder {
  orderId: string;
  tableId?: string;
  items: {
    name: string;
    quantity: number;
    station: string;
    modifiers?: string[];
    notes?: string;
  }[];
  priority: 'normal' | 'rush';
  notes?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  data?: Order;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class OrderService {
  private client: AxiosInstance;
  private kdsClient: AxiosInstance;

  constructor(
    posUrl: string = process.env.POS_SERVICE_URL || 'http://localhost:4081',
    kdsUrl: string = process.env.KDS_SERVICE_URL || 'http://localhost:4080'
  ) {
    this.client = axios.create({
      baseURL: `${posUrl}/api/pos`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
      },
    });

    this.kdsClient = axios.create({
      baseURL: `${kdsUrl}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
      },
    });
  }

  /**
   * Create order in POS system
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      const response = await this.client.post<ApiResponse<Order>>('/orders', {
        customerId: request.customerId,
        tableId: request.tableId,
        items: request.items.map(item => ({
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations,
          modifiers: item.modifiers,
        })),
        guestName: request.guestName,
        guestPhone: request.guestPhone,
        notes: request.notes,
      });

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('OrderService.createOrder error:', this.getErrorMessage(error));
    }

    // Return demo order if service unavailable
    return this.createDemoOrder(request);
  }

  /**
   * Generate payment link for order
   */
  async generatePaymentLink(orderId: string): Promise<string> {
    try {
      const response = await this.client.get<ApiResponse<{ paymentLink: string }>>(
        `/orders/${orderId}/payment-link`
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data.paymentLink;
      }
    } catch (error) {
      console.error('OrderService.generatePaymentLink error:', this.getErrorMessage(error));
    }

    // Return demo payment link
    return `https://pay.example.com/order/${orderId}`;
  }

  /**
   * Send order to Kitchen Display System
   */
  async sendToKDS(kdsOrder: KDSOrder): Promise<boolean> {
    try {
      // Transform items for KDS
      const stationItems = this.assignStations(kdsOrder.items);

      const response = await this.kdsClient.post('/api/v1/kds/orders', {
        items: stationItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          station: item.station,
          modifiers: item.modifiers || [],
          notes: item.notes || '',
        })),
        tableNumber: kdsOrder.tableId,
        orderType: 'dine_in',
        priority: kdsOrder.priority,
      });

      return response.status === 201 || response.status === 200;
    } catch (error) {
      console.error('OrderService.sendToKDS error:', this.getErrorMessage(error));

      // Try alternate KDS endpoint
      try {
        await this.kdsClient.post('/api/orders', {
          orderId: kdsOrder.orderId,
          items: kdsOrder.items,
          tableId: kdsOrder.tableId,
          priority: kdsOrder.priority,
        });
        return true;
      } catch (altError) {
        console.error('OrderService.sendToKDS alternate endpoint error:', this.getErrorMessage(altError));
        return false;
      }
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.client.post<ApiResponse<Order>>(`/orders/${orderId}/void`, {
        reason: 'Cancelled by customer',
      });
      return response.data?.success || false;
    } catch (error) {
      console.error('OrderService.cancelOrder error:', this.getErrorMessage(error));
      return false;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: string): Promise<Order | null> {
    try {
      const response = await this.client.put<ApiResponse<Order>>(
        `/orders/${orderId}/status`,
        { status }
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('OrderService.updateStatus error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.client.get<ApiResponse<Order>>(`/orders/${orderId}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('OrderService.getOrder error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get active orders
   */
  async getActiveOrders(): Promise<Order[]> {
    try {
      const response = await this.client.get<ApiResponse<Order[]>>('/orders');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('OrderService.getActiveOrders error:', this.getErrorMessage(error));
    }
    return [];
  }

  /**
   * Assign stations to items based on category
   */
  private assignStations(
    items: KDSOrder['items']
  ): { name: string; quantity: number; station: string; modifiers?: string[] }[] {
    const stationMap: Record<string, string> = {
      coffee: 'beverage',
      cappuccino: 'beverage',
      'cold coffee': 'beverage',
      tea: 'beverage',
      'fresh lime': 'beverage',
      lassi: 'beverage',
      juice: 'beverage',
      dosa: 'grill',
      idli: 'saute',
      pongal: 'saute',
      uttapam: 'saute',
      biryani: 'grill',
      rice: 'saute',
      naan: 'grill',
      roti: 'grill',
      butter: 'grill',
      chicken: 'grill',
      paneer: 'saute',
      dal: 'saute',
      curry: 'saute',
      dessert: 'dessert',
      ice: 'dessert',
      gulab: 'dessert',
      rasmali: 'dessert',
    };

    return items.map(item => {
      const lowerName = item.name.toLowerCase();
      let station = 'grill'; // default station

      for (const [keyword, assignedStation] of Object.entries(stationMap)) {
        if (lowerName.includes(keyword)) {
          station = assignedStation;
          break;
        }
      }

      return {
        name: item.name,
        quantity: item.quantity,
        station,
        modifiers: item.modifiers,
      };
    });
  }

  /**
   * Create demo order for fallback
   */
  private createDemoOrder(request: CreateOrderRequest): Order {
    return {
      id: `demo-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
      customerId: request.customerId,
      tableId: request.tableId,
      items: request.items,
      subtotal: request.total,
      tax: Math.round(request.total * 0.05),
      total: request.total + Math.round(request.total * 0.05),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get error message from axios error
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error.message || 'Unknown error';
  }
}

export default OrderService;
