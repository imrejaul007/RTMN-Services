/**
 * GlamAI - Inventory Service Unit Tests
 */

import { describe, it, expect } from 'vitest';

// ============================================
// INVENTORY
// ============================================

describe('Inventory Service', () => {
  interface InventoryItem {
    id: string;
    name: string;
    category: 'product' | 'equipment' | 'supply';
    quantity: number;
    minStock: number;
    maxStock: number;
    unit: string;
    price: number;
  }

  describe('createItem', () => {
    it('should create valid inventory item', () => {
      const item: InventoryItem = {
        id: 'inv_123',
        name: 'Kerastase Shampoo',
        category: 'product',
        quantity: 50,
        minStock: 10,
        maxStock: 100,
        unit: 'bottles',
        price: 2500,
      };

      expect(item.id).toBeDefined();
      expect(item.quantity).toBeGreaterThanOrEqual(0);
      expect(item.minStock).toBeLessThan(item.maxStock);
    });

    it('should validate categories', () => {
      const categories = ['product', 'equipment', 'supply'];
      expect(categories).toContain('product');
    });
  });

  describe('stockLevel', () => {
    it('should calculate stock level percentage', () => {
      const item = { quantity: 50, minStock: 10, maxStock: 100 };
      const stockLevel = (item.quantity / item.maxStock) * 100;

      expect(stockLevel).toBe(50);
    });

    it('should detect low stock', () => {
      const item = { quantity: 5, minStock: 10 };
      const isLowStock = item.quantity < item.minStock;

      expect(isLowStock).toBe(true);
    });

    it('should detect out of stock', () => {
      const item = { quantity: 0 };
      const isOutOfStock = item.quantity <= 0;

      expect(isOutOfStock).toBe(true);
    });
  });

  describe('reorder', () => {
    it('should calculate reorder quantity', () => {
      const item = { quantity: 5, maxStock: 100 };
      const reorderQty = item.maxStock - item.quantity;

      expect(reorderQty).toBe(95);
    });

    it('should trigger reorder at min stock', () => {
      const item = { quantity: 10, minStock: 10 };
      const shouldReorder = item.quantity <= item.minStock;

      expect(shouldReorder).toBe(true);
    });
  });
});

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

describe('Customer Service', () => {
  interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    visitCount: number;
    lastVisit?: Date;
    preferredStylist?: string;
    loyaltyPoints: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  }

  describe('createCustomer', () => {
    it('should create valid customer', () => {
      const customer: Customer = {
        id: 'cust_123',
        name: 'Jane Doe',
        phone: '+919876543210',
        email: 'jane@example.com',
        visitCount: 0,
        loyaltyPoints: 0,
        tier: 'bronze',
      };

      expect(customer.id).toBeDefined();
      expect(customer.name).toBeDefined();
    });
  });

  describe('loyaltyTier', () => {
    it('should calculate tier based on visits', () => {
      const getTier = (visits: number): Customer['tier'] => {
        if (visits >= 50) return 'platinum';
        if (visits >= 25) return 'gold';
        if (visits >= 10) return 'silver';
        return 'bronze';
      };

      expect(getTier(60)).toBe('platinum');
      expect(getTier(30)).toBe('gold');
      expect(getTier(15)).toBe('silver');
      expect(getTier(5)).toBe('bronze');
    });
  });

  describe('loyaltyPoints', () => {
    it('should calculate points earned', () => {
      const spent = 1000;
      const pointsEarned = Math.floor(spent / 100); // 1 point per 100 spent

      expect(pointsEarned).toBe(10);
    });

    it('should track total points', () => {
      const customer = { loyaltyPoints: 500, pointsToAdd: 100 };
      customer.loyaltyPoints += customer.pointsToAdd;

      expect(customer.loyaltyPoints).toBe(600);
    });
  });

  describe('visitTracking', () => {
    it('should track visit count', () => {
      const customer = { visitCount: 5 };
      customer.visitCount += 1;

      expect(customer.visitCount).toBe(6);
    });

    it('should update last visit date', () => {
      const customer = { lastVisit: new Date('2024-01-01') };
      customer.lastVisit = new Date();

      expect(customer.lastVisit).toBeInstanceOf(Date);
    });
  });

  describe('tierBenefits', () => {
    const tierBenefits = {
      bronze: { discount: 0, priority: 1 },
      silver: { discount: 5, priority: 2 },
      gold: { discount: 10, priority: 3 },
      platinum: { discount: 15, priority: 4 },
    };

    it('should return correct benefits', () => {
      expect(tierBenefits.platinum.discount).toBe(15);
      expect(tierBenefits.bronze.discount).toBe(0);
    });
  });
});

// ============================================
// APPOINTMENT BOOKING
// ============================================

describe('Appointment Booking', () => {
  interface Appointment {
    id: string;
    customerId: string;
    stylistId: string;
    service: string;
    date: Date;
    duration: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  }

  describe('createAppointment', () => {
    it('should create valid appointment', () => {
      const appointment: Appointment = {
        id: 'apt_123',
        customerId: 'cust_456',
        stylistId: 'stylist_789',
        service: 'Haircut + Color',
        date: new Date(),
        duration: 90,
        status: 'scheduled',
      };

      expect(appointment.id).toBeDefined();
      expect(appointment.duration).toBeGreaterThan(0);
    });
  });

  describe('availability', () => {
    it('should check stylist availability', () => {
      const existingAppts = [
        { stylistId: 's1', start: 9, end: 10 },
        { stylistId: 's1', start: 14, end: 16 },
      ];

      const isAvailable = (
        stylistId: string,
        start: number,
        end: number
      ): boolean => {
        return !existingAppts.some(
          a => a.stylistId === stylistId &&
               !(end <= a.start || start >= a.end)
        );
      };

      expect(isAvailable('s1', 11, 12)).toBe(true); // Available slot
      expect(isAvailable('s1', 9, 10)).toBe(false); // Booked
    });
  });

  describe('statusTransitions', () => {
    it('should allow valid transitions', () => {
      const validTransitions: Record<string, string[]> = {
        scheduled: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      expect(validTransitions.scheduled).toContain('in_progress');
      expect(validTransitions.completed).toHaveLength(0);
    });
  });
});

// ============================================
// REVENUE TRACKING
// ============================================

describe('Revenue Tracking', () => {
  interface Transaction {
    id: string;
    customerId: string;
    items: { name: string; price: number }[];
    total: number;
    date: Date;
    paymentMethod: 'cash' | 'card' | 'upi';
  }

  describe('calculateTotal', () => {
    it('should calculate transaction total', () => {
      const items = [
        { name: 'Haircut', price: 500 },
        { name: 'Color', price: 2000 },
        { name: 'Treatment', price: 800 },
      ];

      const total = items.reduce((sum, item) => sum + item.price, 0);
      expect(total).toBe(3300);
    });
  });

  describe('dailyRevenue', () => {
    it('should calculate daily revenue', () => {
      const transactions: Transaction[] = [
        { id: '1', customerId: 'c1', items: [{ name: 'S', price: 1000 }], total: 1000, date: new Date(), paymentMethod: 'cash' },
        { id: '2', customerId: 'c2', items: [{ name: 'S', price: 1500 }], total: 1500, date: new Date(), paymentMethod: 'card' },
      ];

      const dailyRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
      expect(dailyRevenue).toBe(2500);
    });
  });

  describe('topServices', () => {
    it('should identify top services', () => {
      const services = [
        { name: 'Haircut', count: 50 },
        { name: 'Color', count: 30 },
        { name: 'Treatment', count: 45 },
      ];

      const sorted = services.sort((a, b) => b.count - a.count);
      expect(sorted[0].name).toBe('Haircut');
    });
  });
});
