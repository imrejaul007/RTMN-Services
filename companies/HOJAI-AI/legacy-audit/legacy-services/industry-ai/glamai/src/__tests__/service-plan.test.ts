/**
 * GlamAI - Service Plan Unit Tests
 */

import { describe, it, expect } from 'vitest';

// ============================================
// SERVICE PLAN
// ============================================

describe('Service Plan', () => {
  interface ServicePlan {
    planId: string;
    customerId: string;
    services: PlannedService[];
    frequency: Record<string, number>; // days
    startDate: Date;
    status: 'active' | 'paused' | 'completed';
  }

  interface PlannedService {
    serviceId: string;
    serviceName: string;
    category: 'haircut' | 'color' | 'treatment' | 'styling';
    lastDate?: Date;
    nextDue?: Date;
    priority: 'high' | 'medium' | 'low';
  }

  describe('createPlan', () => {
    it('should create valid service plan', () => {
      const plan: ServicePlan = {
        planId: 'plan_123',
        customerId: 'cust_456',
        services: [
          { serviceId: 'svc_1', serviceName: 'Haircut', category: 'haircut', priority: 'high' },
          { serviceId: 'svc_2', serviceName: 'Color', category: 'color', priority: 'high' },
        ],
        frequency: { haircut: 28, color: 21 },
        startDate: new Date(),
        status: 'active',
      };

      expect(plan.planId).toBeDefined();
      expect(plan.services).toHaveLength(2);
      expect(plan.status).toBe('active');
    });

    it('should validate service categories', () => {
      const categories = ['haircut', 'color', 'treatment', 'styling'];
      const validCategory = (cat: string) => categories.includes(cat);

      expect(validCategory('color')).toBe(true);
      expect(validCategory('invalid')).toBe(false);
    });

    it('should set correct priorities', () => {
      const priorities = ['high', 'medium', 'low'];
      const validPriority = (p: string) => priorities.includes(p);

      expect(validPriority('high')).toBe(true);
      expect(validPriority('low')).toBe(true);
    });
  });

  describe('calculateNextDue', () => {
    it('should calculate next due date based on frequency', () => {
      const lastDate = new Date('2024-01-15');
      const frequency = 28; // days
      const nextDue = new Date(lastDate);
      nextDue.setDate(nextDue.getDate() + frequency);

      expect(nextDue.getDate()).toBe(12); // Feb 12
    });

    it('should handle color service timing', () => {
      const lastColor = new Date('2024-01-01');
      const colorFrequency = 21;
      const nextColor = new Date(lastColor);
      nextColor.setDate(nextColor.getDate() + colorFrequency);

      expect(nextColor.getDate()).toBe(22);
    });
  });

  describe('overdueServices', () => {
    it('should detect overdue haircut', () => {
      const lastDate = new Date();
      lastDate.setDate(lastDate.getDate() - 35); // 35 days ago
      const frequency = 28;

      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysSince > frequency;

      expect(isOverdue).toBe(true);
    });

    it('should not flag recent services as overdue', () => {
      const lastDate = new Date();
      lastDate.setDate(lastDate.getDate() - 10);
      const frequency = 28;

      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysSince > frequency;

      expect(isOverdue).toBe(false);
    });
  });

  describe('planStatus', () => {
    it('should have valid statuses', () => {
      const statuses = ['active', 'paused', 'completed'];
      expect(statuses).toContain('active');
    });
  });
});

// ============================================
// RECOMMENDATIONS
// ============================================

describe('Recommendations', () => {
  interface Recommendation {
    type: 'service' | 'product' | 'treatment';
    itemId: string;
    reason: string;
    urgency: 'immediate' | 'this_week' | 'this_month';
  }

  describe('generateRecommendations', () => {
    it('should recommend overdue services', () => {
      const overdue = [
        { service: 'Haircut', daysOverdue: 7 },
        { service: 'Color', daysOverdue: 14 },
      ];

      const recommendations: Recommendation[] = overdue.map(o => ({
        type: 'service' as const,
        itemId: o.service.toLowerCase(),
        reason: `${o.service} is ${o.daysOverdue} days overdue`,
        urgency: 'immediate' as const,
      }));

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].urgency).toBe('immediate');
    });

    it('should suggest based on season', () => {
      const season = 'winter';
      const seasonalRecs = season === 'winter'
        ? [{ type: 'treatment', item: 'Deep Conditioning' }]
        : [];

      expect(seasonalRecs).toHaveLength(1);
    });
  });
});

// ============================================
// STYLIST SCHEDULING
// ============================================

describe('Stylist Scheduling', () => {
  interface Stylist {
    id: string;
    name: string;
    specialties: string[];
    availability: DaySchedule[];
  }

  interface DaySchedule {
    day: string;
    slots: TimeSlot[];
  }

  interface TimeSlot {
    time: string;
    available: boolean;
    duration: number;
  }

  describe('availability', () => {
    it('should find available slots', () => {
      const slots: TimeSlot[] = [
        { time: '09:00', available: true, duration: 60 },
        { time: '10:00', available: false, duration: 60 },
        { time: '11:00', available: true, duration: 60 },
      ];

      const available = slots.filter(s => s.available);
      expect(available).toHaveLength(2);
    });

    it('should match stylist to service', () => {
      const stylists = [
        { name: 'John', specialties: ['color', 'cutting'] },
        { name: 'Jane', specialties: ['color', 'treatments'] },
      ];

      const colorSpecialists = stylists.filter(s =>
        s.specialties.includes('color')
      );

      expect(colorSpecialists).toHaveLength(2);
    });
  });
});
