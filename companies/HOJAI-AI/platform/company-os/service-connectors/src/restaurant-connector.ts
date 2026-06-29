/**
 * Restaurant Service Connector
 *
 * Connects to all REZ-Merchant restaurant services.
 * Provides unified API with tenant isolation.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from '../shared/types';

// ============================================
// Service URLs (REZ-Merchant)
// ============================================

const REZ_SERVICES = {
  menu: process.env.REZ_MENU_SERVICE_URL || 'http://localhost:3002',
  order: process.env.REZ_ORDER_SERVICE_URL || 'http://localhost:3003',
  tableBooking: process.env.REZ_TABLE_BOOKING_URL || 'http://localhost:3004',
  kds: process.env.REZ_KDS_SERVICE_URL || 'http://localhost:3005',
  pos: process.env.REZ_POS_SERVICE_URL || 'http://localhost:3006',
  inventory: process.env.REZ_INVENTORY_SERVICE_URL || 'http://localhost:3007',
  aiWaiter: process.env.REZ_AI_WAITER_URL || 'http://localhost:3008',
};

// ============================================
// Menu Types
// ============================================

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  isAvailable?: boolean;
  preparationTime?: number;
  allergens?: string[];
  tags?: string[];
}

export interface Menu {
  id: string;
  name: string;
  items: MenuItem[];
  isActive: boolean;
}

// ============================================
// Order Types
// ============================================

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: string[];
}

export interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  tableNumber?: number;
  customerId?: string;
  createdAt: string;
}

// ============================================
// Table Booking Types
// ============================================

export interface TableBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  partySize: number;
  tableId?: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
}

export interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

// ============================================
// KDS Types
// ============================================

export interface KDSOrder {
  id: string;
  orderId: string;
  tableNumber: number;
  items: {
    name: string;
    quantity: number;
    modifiers: string[];
    status: 'pending' | 'cooking' | 'done';
  }[];
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'normal' | 'rush' | 'vip';
  createdAt: string;
}

// ============================================
// POS Types
// ============================================

export interface POSOrder {
  id: string;
  tableId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'closed' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'upi';
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

// ============================================
// Restaurant Connector
// ============================================

export class RestaurantConnector {
  private menuService: BaseConnector;
  private orderService: BaseConnector;
  private tableBookingService: BaseConnector;
  private kdsService: BaseConnector;
  private posService: BaseConnector;
  private inventoryService: BaseConnector;
  private aiWaiterService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.menuService = new BaseConnector({ baseUrl: REZ_SERVICES.menu });
    this.orderService = new BaseConnector({ baseUrl: REZ_SERVICES.order });
    this.tableBookingService = new BaseConnector({ baseUrl: REZ_SERVICES.tableBooking });
    this.kdsService = new BaseConnector({ baseUrl: REZ_SERVICES.kds });
    this.posService = new BaseConnector({ baseUrl: REZ_SERVICES.pos });
    this.inventoryService = new BaseConnector({ baseUrl: REZ_SERVICES.inventory });
    this.aiWaiterService = new BaseConnector({ baseUrl: REZ_SERVICES.aiWaiter });

    if (tenant) {
      this.setTenant(tenant);
    }
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.menuService.setTenant(tenant);
    this.orderService.setTenant(tenant);
    this.tableBookingService.setTenant(tenant);
    this.kdsService.setTenant(tenant);
    this.posService.setTenant(tenant);
    this.inventoryService.setTenant(tenant);
    this.aiWaiterService.setTenant(tenant);
  }

  // ========================================
  // MENU OPERATIONS
  // ========================================

  async getMenu(): Promise<ServiceResponse<Menu[]>> {
    return this.menuService.get<Menu[]>('/api/menu');
  }

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<ServiceResponse<MenuItem>> {
    return this.menuService.post<MenuItem>('/api/menu', item);
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<ServiceResponse<MenuItem>> {
    return this.menuService.put<MenuItem>(`/api/menu/${id}`, updates);
  }

  async toggleAvailability(id: string, available: boolean): Promise<ServiceResponse<MenuItem>> {
    return this.menuService.patch<MenuItem>(`/api/menu/${id}/availability`, { isAvailable: available });
  }

  // ========================================
  // ORDER OPERATIONS
  // ========================================

  async createOrder(order: {
    items: Omit<OrderItem, 'menuItemId'>[];
    tableNumber?: number;
    customerId?: string;
  }): Promise<ServiceResponse<Order>> {
    return this.orderService.post<Order>('/api/orders', order);
  }

  async getOrder(id: string): Promise<ServiceResponse<Order>> {
    return this.orderService.get<Order>(`/api/orders/${id}`);
  }

  async listOrders(filters?: { status?: string; date?: string }): Promise<ServiceResponse<Order[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.orderService.get<Order[]>(`/api/orders${query ? `?${query}` : ''}`);
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<ServiceResponse<Order>> {
    return this.orderService.patch<Order>(`/api/orders/${id}/status`, { status });
  }

  // ========================================
  // TABLE BOOKING OPERATIONS
  // ========================================

  async createBooking(booking: {
    customerName: string;
    customerPhone: string;
    date: string;
    time: string;
    partySize: number;
  }): Promise<ServiceResponse<TableBooking>> {
    return this.tableBookingService.post<TableBooking>('/api/bookings', booking);
  }

  async getBooking(id: string): Promise<ServiceResponse<TableBooking>> {
    return this.tableBookingService.get<TableBooking>(`/api/bookings/${id}`);
  }

  async listBookings(filters?: { date?: string; status?: string }): Promise<ServiceResponse<TableBooking[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.tableBookingService.get<TableBooking[]>(`/api/bookings${query ? `?${query}` : ''}`);
  }

  async getAvailableSlots(date: string, partySize: number): Promise<ServiceResponse<TimeSlot[]>> {
    return this.tableBookingService.get<TimeSlot[]>(
      `/api/availability?date=${date}&partySize=${partySize}`
    );
  }

  async seatCustomer(bookingId: string, tableId: string): Promise<ServiceResponse<TableBooking>> {
    return this.tableBookingService.patch<TableBooking>(`/api/bookings/${bookingId}/seat`, { tableId });
  }

  async cancelBooking(id: string, reason?: string): Promise<ServiceResponse<TableBooking>> {
    return this.tableBookingService.delete<TableBooking>(`/api/bookings/${id}?reason=${reason || ''}`);
  }

  // ========================================
  // KDS OPERATIONS
  // ========================================

  async getKitchenOrders(): Promise<ServiceResponse<KDSOrder[]>> {
    return this.kdsService.get<KDSOrder[]>('/api/kitchen/active');
  }

  async updateKDSOrder(orderId: string, updates: {
    itemId?: string;
    status?: 'pending' | 'cooking' | 'done';
    orderStatus?: 'pending' | 'in_progress' | 'completed';
  }): Promise<ServiceResponse<KDSOrder>> {
    return this.kdsService.patch<KDSOrder>(`/api/kitchen/${orderId}`, updates);
  }

  async bumpOrder(orderId: string): Promise<ServiceResponse<KDSOrder>> {
    return this.kdsService.post<KDSOrder>(`/api/kitchen/${orderId}/bump`, {});
  }

  // ========================================
  // POS OPERATIONS
  // ========================================

  async getTables(): Promise<ServiceResponse<Table[]>> {
    return this.posService.get<Table[]>('/api/tables');
  }

  async createPOSOrder(order: {
    tableId?: string;
    items: Omit<OrderItem, 'menuItemId'>[];
  }): Promise<ServiceResponse<POSOrder>> {
    return this.posService.post<POSOrder>('/api/pos/orders', order);
  }

  async processPayment(orderId: string, method: 'cash' | 'card' | 'upi'): Promise<ServiceResponse<POSOrder>> {
    return this.posService.post<POSOrder>(`/api/pos/orders/${orderId}/pay`, { method });
  }

  async splitBill(orderId: string, itemIds: string[]): Promise<ServiceResponse<{ splitId: string; amount: number }>> {
    return this.posService.post<{ splitId: string; amount: number }>(`/api/pos/orders/${orderId}/split`, { itemIds });
  }

  // ========================================
  // INVENTORY OPERATIONS
  // ========================================

  async getInventory(filters?: { lowStock?: boolean; category?: string }): Promise<ServiceResponse<any>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.inventoryService.get<any>(`/api/inventory${query ? `?${query}` : ''}`);
  }

  async updateStock(itemId: string, quantity: number): Promise<ServiceResponse<any>> {
    return this.posService.patch<any>(`/api/inventory/${itemId}`, { quantity });
  }

  // ========================================
  // AI WAITER OPERATIONS
  // ========================================

  async askAIWaiter(question: string): Promise<ServiceResponse<{ answer: string; suggestions?: string[] }>> {
    return this.aiWaiterService.post<{ answer: string; suggestions?: string[] }>('/api/waiter/ask', {
      question,
    });
  }

  async getRecommendations(): Promise<ServiceResponse<string[]>> {
    return this.aiWaiterService.get<string[]>('/api/waiter/recommendations');
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<{
    menu: string;
    order: string;
    tableBooking: string;
    kds: string;
    pos: string;
    inventory: string;
    aiWaiter: string;
  }> {
    const checks = await Promise.all([
      this.menuService.healthCheck(),
      this.orderService.healthCheck(),
      this.tableBookingService.healthCheck(),
      this.kdsService.healthCheck(),
      this.posService.healthCheck(),
      this.inventoryService.healthCheck(),
      this.aiWaiterService.healthCheck(),
    ]);

    return {
      menu: checks[0].status,
      order: checks[1].status,
      tableBooking: checks[2].status,
      kds: checks[3].status,
      pos: checks[4].status,
      inventory: checks[5].status,
      aiWaiter: checks[6].status,
    };
  }
}

// ============================================
// Factory Function
// ============================================

export function createRestaurantConnector(tenant?: TenantContext): RestaurantConnector {
  return new RestaurantConnector(tenant);
}
