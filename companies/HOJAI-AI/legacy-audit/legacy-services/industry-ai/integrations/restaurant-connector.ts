/**
 * HOJAI Restaurant AI - REZ-Merchant Connector
 *
 * This connector allows HOJAI Restaurant AI to use either:
 * 1. Built-in services (for non-REZ clients)
 * 2. REZ-Merchant services (for REZ ecosystem clients)
 */

export interface RestaurantConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface Order {
  id: string;
  items: { itemId: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  customerId?: string;
  createdAt: string;
}

export class RestaurantConnector {
  private config: RestaurantConnectorConfig;

  constructor(config: RestaurantConnectorConfig) {
    this.config = config;
  }

  /**
   * Get menu items
   * REZ: Calls rez-restaurant-service
   * Non-REZ: Uses built-in menu service
   */
  async getMenu(branchId: string): Promise<MenuItem[]> {
    if (this.config.useREZServices) {
      // Call REZ-Merchant API
      const response = await fetch(`${this.config.rezBaseUrl}/restaurants/${branchId}/menu`, {
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`REZ API error: ${response.status}`);
      }

      return response.json();
    } else {
      // Use built-in service (from hojai-ai industry-ai)
      // This would call the local menu service
      return this.getLocalMenu(branchId);
    }
  }

  /**
   * Create order
   * REZ: Calls rez-restaurant-service
   * Non-REZ: Uses built-in order service
   */
  async createOrder(branchId: string, items: { itemId: string; quantity: number }[]): Promise<Order> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/restaurants/${branchId}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      return response.json();
    } else {
      return this.createLocalOrder(branchId, items);
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<Order> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
        },
      });

      return response.json();
    } else {
      return this.getLocalOrderStatus(orderId);
    }
  }

  /**
   * Get reservations
   */
  async getReservations(branchId: string, date: string): Promise<any[]> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/restaurants/${branchId}/reservations?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
        },
      });

      return response.json();
    } else {
      return this.getLocalReservations(branchId, date);
    }
  }

  /**
   * Create reservation
   */
  async createReservation(branchId: string, data: {
    customerName: string;
    customerPhone: string;
    date: string;
    time: string;
    guests: number;
  }): Promise<any> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/restaurants/${branchId}/reservations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return response.json();
    } else {
      return this.createLocalReservation(branchId, data);
    }
  }

  // ========== Local/Built-in Service Methods ==========
  // These call the services built in hojai-ai/industry-ai/
  // For non-REZ clients, these use the local implementations

  private async getLocalMenu(branchId: string): Promise<MenuItem[]> {
    // TODO: Integrate with local restaurant-menu-service
    // Currently returns empty - needs service endpoint
    console.log(`[Local] Getting menu for branch: ${branchId}`);
    return this.mockMenuItems;
  }

  private async createLocalOrder(branchId: string, items: { itemId: string; quantity: number }[]): Promise<Order> {
    // TODO: Integrate with local restaurant-order-service
    const orderItems = items.map(i => ({
      itemId: i.itemId,
      quantity: i.quantity,
      price: this.mockMenuItems.find(m => m.id === i.itemId)?.price || 0,
    }));
    const total = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    console.log(`[Local] Creating order for branch: ${branchId}`);
    return {
      id: `local-${Date.now()}`,
      items: orderItems,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  private async getLocalOrderStatus(orderId: string): Promise<Order> {
    // TODO: Integrate with local order tracking
    console.log(`[Local] Getting order status: ${orderId}`);
    return {
      id: orderId,
      items: [],
      total: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  private async getLocalReservations(branchId: string, date: string): Promise<any[]> {
    // TODO: Integrate with local restaurant-reservation-service
    console.log(`[Local] Getting reservations for branch: ${branchId} on ${date}`);
    return [];
  }

  private async createLocalReservation(branchId: string, data: {
    customerName: string;
    customerPhone: string;
    date: string;
    time: string;
    guests: number;
  }): Promise<any> {
    // TODO: Integrate with local restaurant-reservation-service
    console.log(`[Local] Creating reservation for branch: ${branchId}`);
    return {
      id: `local-res-${Date.now()}`,
      branchId,
      ...data,
      status: 'confirmed',
    };
  }

  // Mock data for development
  private mockMenuItems: MenuItem[] = [
    { id: 'item-1', name: 'Butter Chicken', description: 'Creamy tomato curry', price: 299, category: 'Main Course', available: true },
    { id: 'item-2', name: 'Naan', description: 'Tandoori bread', price: 49, category: 'Bread', available: true },
    { id: 'item-3', name: 'Dal Makhani', description: 'Black lentils', price: 199, category: 'Main Course', available: true },
  ];
}
