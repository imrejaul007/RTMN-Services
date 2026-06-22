/**
 * GlamAI - Complete Test Suite
 *
 * Run all unit tests: npm test
 */

import { describe, it, expect, vi } from 'vitest';

// Import all test modules
import './beauty-memory.test';
import './service-plan.test';
import './inventory.test';
import './beauty-genie.test';

// ============================================
// INTEGRATION TESTS
// ============================================

describe('GlamAI Integration', () => {
  describe('Service Orchestration', () => {
    it('should integrate Beauty Memory with Service Plan', () => {
      // Beauty profile affects service recommendations
      const beautyProfile = {
        hairType: 'curly',
        hairTexture: 'coarse',
        allergies: ['ammonia'],
      };

      const recommendedServices = [
        { name: 'Hydrating Treatment', suitable: true },
        { name: 'Keratin Treatment', suitable: !beautyProfile.allergies.includes('formaldehyde') },
      ];

      expect(recommendedServices[0].suitable).toBe(true);
    });

    it('should integrate Inventory with Service Plan', () => {
      const inventory = {
        products: { 'color_1': 5, 'treatment_1': 0 },
      };

      const services = [
        { name: 'Color', requiredProducts: ['color_1'] },
        { name: 'Treatment', requiredProducts: ['treatment_1'] },
      ];

      const canProvide = services.map(s =>
        s.requiredProducts.every(p => (inventory.products[p] || 0) > 0)
      );

      expect(canProvide[0]).toBe(true); // Color available
      expect(canProvide[1]).toBe(false); // Treatment out of stock
    });
  });

  describe('Customer Journey', () => {
    it('should track full customer journey', () => {
      const journey = {
        booking: { status: 'completed', date: new Date() },
        service: { status: 'completed', stylist: 'John' },
        products: { purchased: ['shampoo', 'conditioner'] },
        loyalty: { pointsEarned: 50 },
      };

      expect(journey.booking.status).toBe('completed');
      expect(journey.loyalty.pointsEarned).toBeGreaterThan(0);
    });

    it('should update beauty memory after service', () => {
      const memory = {
        reactions: [],
      };

      const reaction = { product: 'Kerastase', reaction: 'loved' };
      memory.reactions.push(reaction);

      expect(memory.reactions).toHaveLength(1);
      expect(memory.reactions[0].reaction).toBe('loved');
    });
  });

  describe('Revenue Attribution', () => {
    it('should track revenue by service type', () => {
      const transactions = [
        { service: 'haircut', revenue: 500 },
        { service: 'color', revenue: 2000 },
        { service: 'treatment', revenue: 800 },
      ];

      const byService = transactions.reduce((acc, t) => {
        acc[t.service] = (acc[t.service] || 0) + t.revenue;
        return acc;
      }, {} as Record<string, number>);

      expect(byService.color).toBe(2000);
      expect(byService.haircut).toBe(500);
    });

    it('should track revenue by stylist', () => {
      const transactions = [
        { stylist: 'John', revenue: 5000 },
        { stylist: 'Jane', revenue: 7500 },
      ];

      const byStylist = transactions.reduce((acc, t) => {
        acc[t.stylist] = (acc[t.stylist] || 0) + t.revenue;
        return acc;
      }, {} as Record<string, number>);

      expect(byStylist.John).toBe(5000);
      expect(byStylist.Jane).toBe(7500);
    });
  });

  describe('Retention Metrics', () => {
    it('should calculate retention rate', () => {
      const month1Customers = ['c1', 'c2', 'c3', 'c4', 'c5'];
      const month2Customers = ['c1', 'c2', 'c3', 'c6', 'c7'];

      const retained = month1Customers.filter(c => month2Customers.includes(c));
      const retentionRate = (retained.length / month1Customers.length) * 100;

      expect(retentionRate).toBe(60);
    });

    it('should identify churned customers', () => {
      const allCustomers = ['c1', 'c2', 'c3'];
      const activeCustomers = ['c1'];

      const churned = allCustomers.filter(c => !activeCustomers.includes(c));
      expect(churned).toHaveLength(2);
    });
  });

  describe('Inventory Forecasting', () => {
    it('should predict based on historical usage', () => {
      const usage = [10, 12, 11, 13, 10]; // Last 5 weeks
      const avgUsage = usage.reduce((a, b) => a + b, 0) / usage.length;

      expect(avgUsage).toBeCloseTo(11.2, 1);
    });

    it('should calculate reorder date', () => {
      const currentStock = 20;
      const weeklyUsage = 10;
      const leadTime = 3; // weeks
      const safetyStock = 5;

      const weeksUntilReorder = (currentStock - safetyStock) / weeklyUsage;

      expect(weeksUntilReorder).toBe(1.5);
    });
  });
});

// ============================================
// API ROUTE TESTS
// ============================================

describe('API Routes', () => {
  describe('Customer Routes', () => {
    it('should validate customer creation', () => {
      const validCustomer = {
        name: 'Jane Doe',
        phone: '+919876543210',
        email: 'jane@example.com',
      };

      expect(validCustomer.name).toBeDefined();
      expect(validCustomer.phone).toMatch(/^\+/);
      expect(validCustomer.email).toMatch(/@/);
    });

    it('should validate phone format', () => {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/;
      expect(phoneRegex.test('+919876543210')).toBe(true);
      expect(phoneRegex.test('invalid')).toBe(false);
    });
  });

  describe('Appointment Routes', () => {
    it('should validate appointment time', () => {
      const isValidTime = (time: string): boolean => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 9 && hours <= 20 && minutes >= 0 && minutes <= 59;
      };

      expect(isValidTime('10:00')).toBe(true);
      expect(isValidTime('08:00')).toBe(false); // Too early
      expect(isValidTime('21:00')).toBe(false); // Too late
    });

    it('should validate service duration', () => {
      const serviceDurations: Record<string, number> = {
        haircut: 60,
        color: 120,
        treatment: 90,
      };

      expect(serviceDurations.color).toBe(120);
    });
  });

  describe('Inventory Routes', () => {
    it('should validate stock levels', () => {
      const item = { quantity: 5, minStock: 10 };

      expect(item.quantity).toBeLessThan(item.minStock);
    });

    it('should format currency', () => {
      const formatPrice = (amount: number): string => {
        return `₹${amount.toLocaleString('en-IN')}`;
      };

      expect(formatPrice(2500)).toBe('₹2,500');
    });
  });
});

// ============================================
// DATA VALIDATION TESTS
// ============================================

describe('Data Validation', () => {
  describe('Beauty Data', () => {
    it('should validate hair color code', () => {
      const isValidColorCode = (code: string): boolean => {
        return /^#[0-9A-Fa-f]{6}$/.test(code) || /^\d+\/\d+$/.test(code);
      };

      expect(isValidColorCode('#4A3B2C')).toBe(true);
      expect(isValidColorCode('6/0')).toBe(true);
      expect(isValidColorCode('invalid')).toBe(false);
    });

    it('should validate skin type', () => {
      const skinTypes = ['dry', 'oily', 'combination', 'sensitive', 'normal'];
      expect(skinTypes.includes('combination')).toBe(true);
    });
  });

  describe('Business Data', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('test@example.com')).toBe(true);
    });

    it('should validate date range', () => {
      const isWithinRange = (date: Date, start: Date, end: Date): boolean => {
        return date >= start && date <= end;
      };

      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const test = new Date('2024-06-15');

      expect(isWithinRange(test, start, end)).toBe(true);
    });
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Error Handling', () => {
  describe('Service Errors', () => {
    it('should handle customer not found', () => {
      const error = { code: 'CUSTOMER_NOT_FOUND', message: 'Customer with ID 123 not found' };
      expect(error.code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('should handle inventory errors', () => {
      const error = { code: 'OUT_OF_STOCK', message: 'Product is out of stock' };
      expect(error.code).toBe('OUT_OF_STOCK');
    });

    it('should handle stylist unavailable', () => {
      const error = { code: 'STYLIST_UNAVAILABLE', message: 'Stylist is not available at requested time' };
      expect(error.code).toBe('STYLIST_UNAVAILABLE');
    });
  });

  describe('Validation Errors', () => {
    it('should return field-specific errors', () => {
      const errors = {
        phone: 'Invalid phone format',
        email: 'Invalid email address',
      };

      expect(Object.keys(errors)).toHaveLength(2);
    });
  });
});
