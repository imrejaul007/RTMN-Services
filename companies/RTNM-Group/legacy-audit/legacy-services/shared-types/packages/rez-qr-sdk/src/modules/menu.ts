/**
 * Menu QR Module - Restaurant menu, ordering, and split bill
 */

import { QRClient } from './client';
import type {
  Menu,
  MenuItem,
  DietaryFilters,
  Priority,
  Split,
  SplitBill,
  PaymentRequest,
  Receipt,
} from '../types';

export class MenuModule {
  private client: QRClient;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Get full menu for a store
   */
  async getMenu(storeId: string): Promise<Menu> {
    return this.client.get(`/stores/${storeId}/menu`);
  }

  /**
   * Get menu categories
   */
  async getCategories(storeId: string): Promise<Menu['categories']> {
    return this.client.get(`/stores/${storeId}/menu/categories`);
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(storeId: string, categoryId: string): Promise<MenuItem[]> {
    return this.client.get(`/stores/${storeId}/menu/categories/${categoryId}/items`);
  }

  /**
   * Get item details
   */
  async getItem(storeId: string, itemId: string): Promise<MenuItem> {
    return this.client.get(`/stores/${storeId}/menu/items/${itemId}`);
  }

  /**
   * Filter menu items by dietary preferences
   */
  filterByDietary(items: MenuItem[], filters: DietaryFilters): MenuItem[] {
    return items.filter((item) => {
      // Check vegetarian
      if (filters.vegetarian && !item.dietary.some((d) => d.code === 'vegetarian')) {
        return false;
      }
      // Check vegan
      if (filters.vegan && !item.dietary.some((d) => d.code === 'vegan')) {
        return false;
      }
      // Check gluten-free
      if (filters.glutenFree && !item.dietary.some((d) => d.code === 'gluten_free')) {
        return false;
      }
      // Check dairy-free
      if (filters.dairyFree && !item.dietary.some((d) => d.code === 'dairy_free')) {
        return false;
      }
      // Check nut-free
      if (filters.nutFree && item.allergens.some((a) => a.toLowerCase().includes('nut'))) {
        return false;
      }
      // Check halal
      if (filters.halal && !item.dietary.some((d) => d.code === 'halal')) {
        return false;
      }
      // Check kosher
      if (filters.kosher && !item.dietary.some((d) => d.code === 'kosher')) {
        return false;
      }
      // Check custom filters
      if (filters.custom && filters.custom.length > 0) {
        const itemDietaryCodes = item.dietary.map((d) => d.code);
        if (!filters.custom.every((code) => itemDietaryCodes.includes(code))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Search menu items
   */
  async searchItems(storeId: string, query: string): Promise<MenuItem[]> {
    return this.client.get(`/stores/${storeId}/menu/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Add item to cart
   */
  async addToCart(storeId: string, itemId: string, quantity: number, modifiers?: { id: string; options: string[] }[]): Promise<{ cartId: string; itemCount: number }> {
    return this.client.post(`/stores/${storeId}/cart`, { itemId, quantity, modifiers });
  }

  /**
   * Get current cart
   */
  async getCart(cartId: string): Promise<{ items: CartItem[]; subtotal: number; taxes: number; total: number }> {
    return this.client.get(`/carts/${cartId}`);
  }

  /**
   * Update cart item
   */
  async updateCartItem(cartId: string, itemId: string, quantity: number): Promise<void> {
    return this.client.put(`/carts/${cartId}/items/${itemId}`, { quantity });
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartId: string, itemId: string): Promise<void> {
    return this.client.delete(`/carts/${cartId}/items/${itemId}`);
  }

  /**
   * Place order
   */
  async placeOrder(storeId: string, cartId: string, options?: { tableNumber?: string; notes?: string; priority?: Priority }): Promise<{ orderId: string; status: string; estimatedReadyTime?: string }> {
    return this.client.post(`/stores/${storeId}/orders`, { cartId, ...options });
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<OrderDetails> {
    return this.client.get(`/orders/${orderId}`);
  }

  /**
   * Call waiter
   */
  async callWaiter(storeId: string, priority: Priority = { level: 'normal' }): Promise<void> {
    return this.client.post(`/stores/${storeId}/call-waiter`, priority);
  }

  /**
   * Request check/bill
   */
  async requestBill(storeId: string, orderId: string): Promise<{ billId: string; total: number }> {
    return this.client.post(`/stores/${storeId}/orders/${orderId}/bill`);
  }

  /**
   * Split bill
   */
  async splitBill(orderId: string, splits: Split[]): Promise<SplitBill> {
    return this.client.post(`/orders/${orderId}/split`, { splits });
  }

  /**
   * Get split options
   */
  async getSplitOptions(orderId: string): Promise<{ equal: number; byPerson: { userId: string; amount: number }[] }> {
    return this.client.get(`/orders/${orderId}/split/options`);
  }

  /**
   * Pay order
   */
  async checkout(orderId: string, payment: PaymentRequest): Promise<Receipt> {
    return this.client.post(`/orders/${orderId}/checkout`, payment);
  }

  /**
   * Apply promo code
   */
  async applyPromoCode(cartId: string, code: string): Promise<{ discount: number; newTotal: number }> {
    return this.client.post(`/carts/${cartId}/promo`, { code });
  }

  /**
   * Get recommended items
   */
  async getRecommendations(storeId: string, orderId?: string): Promise<MenuItem[]> {
    const url = orderId
      ? `/stores/${storeId}/recommendations?orderId=${orderId}`
      : `/stores/${storeId}/recommendations`;
    return this.client.get(url);
  }

  /**
   * Get popular items
   */
  async getPopularItems(storeId: string): Promise<MenuItem[]> {
    return this.client.get(`/stores/${storeId}/menu/popular`);
  }

  /**
   * Get available time slots for reservation
   */
  async getReservationSlots(storeId: string, date: string, partySize: number): Promise<{ time: string; available: boolean }[]> {
    return this.client.get(`/stores/${storeId}/reservations/slots?date=${date}&partySize=${partySize}`);
  }

  /**
   * Make reservation
   */
  async makeReservation(storeId: string, data: { date: string; time: string; partySize: number; name: string; phone: string; notes?: string }): Promise<{ reservationId: string; confirmationCode: string }> {
    return this.client.post(`/stores/${storeId}/reservations`, data);
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId: string): Promise<void> {
    return this.client.delete(`/reservations/${reservationId}`);
  }
}

export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  modifiers?: { name: string; price: number }[];
}

export interface OrderDetails {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  items: CartItem[];
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  tableNumber?: string;
  estimatedReadyTime?: string;
  createdAt: string;
  updatedAt: string;
}
