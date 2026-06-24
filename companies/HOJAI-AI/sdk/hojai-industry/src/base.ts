/**
 * IndustryBaseClient
 *
 * Shared CRUD over the 4-entity template that 22 of the 24 industry OS
 * services use: menu + orders + tables + customers. Each industry
 * sub-client extends this base and gets the 9 common methods for free.
 *
 * Industries with richer surfaces (hotel, beauty, event-banquet,
 * exhibition) don't use this base — they implement their own client.
 *
 * Endpoints exposed by every template-style industry OS:
 *   GET    /api/menu                       list menu items
 *   POST   /api/menu                       add menu item
 *   GET    /api/orders                     list orders
 *   POST   /api/orders                     create order
 *   PATCH  /api/orders/:id/status          update order status
 *   GET    /api/tables                     list tables
 *   POST   /api/tables/:id/reserve         reserve a table
 *   GET    /api/customers                  list customers
 *   POST   /api/customers                  add customer
 *   POST   /api/customers/:id/points       add loyalty points
 *
 * Each industry sub-client is constructed with its specific port, and
 * the base automatically routes to `http://localhost:<port>` via the
 * provided baseUrl. If you're using a unified gateway, override
 * `baseUrl` once on the main `Industry` client and it propagates.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { MenuItem, Order, Table, Customer } from './types.js';

export interface CreateOrderRequest {
  tableId?: string;
  customerId?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
  notes?: string;
}

export interface AddMenuItemRequest {
  name: string;
  description?: string;
  price: { amount: number; currency: string };
  category?: string;
  available?: boolean;
}

export interface AddCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
}

export class IndustryBaseClient {
  /**
   * Resolved config. If the sub-client was constructed with a per-port
   * override, we set baseUrl to `http://localhost:<port>`. Otherwise we
   * use the parent client's baseUrl.
   */
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig, port?: number) {
    if (port !== undefined) {
      this.config = { ...config, baseUrl: `http://localhost:${port}` };
    } else {
      this.config = config;
    }
  }

  // ─── Menu ───

  async listMenu(input: { category?: string; available?: boolean } = {}): Promise<MenuItem[]> {
    return request<MenuItem[]>(this.config, 'GET', `/api/menu${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async addMenuItem(input: AddMenuItemRequest): Promise<MenuItem> {
    return request<MenuItem>(this.config, 'POST', '/api/menu', input);
  }

  // ─── Orders ───

  async listOrders(input: { status?: Order['status']; customerId?: string; limit?: number } = {}): Promise<Order[]> {
    return request<Order[]>(this.config, 'GET', `/api/orders${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createOrder(input: CreateOrderRequest): Promise<Order> {
    return request<Order>(this.config, 'POST', '/api/orders', input);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    return request<Order>(this.config, 'PATCH', `/api/orders/${encodeURIComponent(orderId)}/status`, { status });
  }

  // ─── Tables ───

  async listTables(): Promise<Table[]> {
    return request<Table[]>(this.config, 'GET', '/api/tables');
  }

  async reserveTable(tableId: string, input: { customerId: string; reservedFor: string; notes?: string }): Promise<Table> {
    return request<Table>(this.config, 'POST', `/api/tables/${encodeURIComponent(tableId)}/reserve`, input);
  }

  // ─── Customers ───

  async listCustomers(input: { limit?: number } = {}): Promise<Customer[]> {
    return request<Customer[]>(this.config, 'GET', `/api/customers${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async addCustomer(input: AddCustomerRequest): Promise<Customer> {
    return request<Customer>(this.config, 'POST', '/api/customers', input);
  }

  async addPoints(customerId: string, points: number, reason?: string): Promise<Customer> {
    return request<Customer>(this.config, 'POST', `/api/customers/${encodeURIComponent(customerId)}/points`, { points, reason });
  }
}
