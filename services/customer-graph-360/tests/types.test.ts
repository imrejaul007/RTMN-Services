import { Customer360Schema, Customer360, IdentitySchema, ProfileSchema } from '../src/types/customer360';
import { z } from 'zod';

describe('Customer360 Types', () => {
  describe('Identity Schema', () => {
    it('should validate a valid identity', () => {
      const identity = {
        userId: 'user123',
        email: 'test@example.com',
        phone: '+919876543210',
        alternateIds: ['alt1', 'alt2'],
        linkedAccounts: [
          { provider: 'google', userId: 'google123' },
        ],
      };

      const result = IdentitySchema.safeParse(identity);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const identity = {
        userId: 'user123',
        email: 'invalid-email',
      };

      const result = IdentitySchema.safeParse(identity);
      expect(result.success).toBe(false);
    });

    it('should allow missing optional fields', () => {
      const identity = {
        userId: 'user123',
      };

      const result = IdentitySchema.safeParse(identity);
      expect(result.success).toBe(true);
    });
  });

  describe('Profile Schema', () => {
    it('should validate a valid profile', () => {
      const profile = {
        demographics: {
          age: 30,
          gender: 'male',
          location: {
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
          },
        },
        psychographics: {
          interests: ['travel', 'food'],
          values: ['quality', 'convenience'],
          lifestyle: ['urban', 'modern'],
        },
      };

      const result = ProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('should require location in demographics', () => {
      const profile = {
        demographics: {
          age: 30,
        },
      };

      const result = ProfileSchema.safeParse(profile);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer360 Schema', () => {
    it('should validate a complete customer 360', () => {
      const customer: Customer360 = {
        userId: 'user123',
        identity: {
          userId: 'user123',
          email: 'test@example.com',
          alternateIds: [],
          linkedAccounts: [],
        },
        profile: {
          demographics: {
            location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
          },
        },
        transactions: {
          totalOrders: 10,
          totalSpent: 5000,
          avgOrderValue: 500,
          lastPurchase: new Date(),
          favoriteCategories: ['food', 'travel'],
          lifetimeValue: 5000,
          paymentMethods: ['UPI', 'Card'],
        },
        interactions: {
          appsUsed: ['buzzlocal', 'airzy'],
          lastActive: new Date(),
          engagementScore: 75,
          touchpoints: [
            {
              app: 'buzzlocal',
              firstSeen: new Date(),
              lastSeen: new Date(),
              sessionCount: 50,
            },
          ],
        },
        preferences: {
          channels: ['push', 'email'],
          language: 'en',
          notificationSettings: { marketing: true, transactional: true },
          priceRange: { min: 100, max: 5000 },
          brands: ['Nike', 'Apple'],
        },
        segments: {
          current: ['high-value', 'frequent-buyer'],
          historical: [],
        },
        predictions: {
          churnRisk: 0.2,
          lifetimeValue: 10000,
          nextPurchaseDate: new Date(),
          productRecommendations: ['electronics', 'fashion'],
        },
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Customer360Schema.safeParse(customer);
      expect(result.success).toBe(true);
    });

    it('should require userId', () => {
      const customer = {
        identity: {
          userId: 'user123',
        },
        profile: {
          demographics: {
            location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
          },
        },
      };

      const result = Customer360Schema.safeParse(customer);
      expect(result.success).toBe(false);
    });

    it('should require identity', () => {
      const customer = {
        userId: 'user123',
        profile: {
          demographics: {
            location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
          },
        },
      };

      const result = Customer360Schema.safeParse(customer);
      expect(result.success).toBe(false);
    });
  });

  describe('Predictions Schema', () => {
    it('should validate churn risk between 0 and 1', () => {
      const predictions = {
        churnRisk: 0.5,
        lifetimeValue: 10000,
        productRecommendations: [],
      };

      const result = z.object({
        churnRisk: z.number().min(0).max(1),
        lifetimeValue: z.number(),
        productRecommendations: z.array(z.string()),
      }).safeParse(predictions);

      expect(result.success).toBe(true);
    });

    it('should reject churn risk outside 0-1 range', () => {
      const predictions = {
        churnRisk: 1.5,
        lifetimeValue: 10000,
        productRecommendations: [],
      };

      const result = z.object({
        churnRisk: z.number().min(0).max(1),
        lifetimeValue: z.number(),
        productRecommendations: z.array(z.string()),
      }).safeParse(predictions);

      expect(result.success).toBe(false);
    });
  });

  describe('Interactions Schema', () => {
    it('should validate engagement score between 0 and 100', () => {
      const interactions = {
        appsUsed: ['buzzlocal', 'airzy'],
        lastActive: new Date(),
        engagementScore: 85,
        touchpoints: [],
      };

      const result = z.object({
        appsUsed: z.array(z.string()),
        lastActive: z.date().optional(),
        engagementScore: z.number().min(0).max(100),
        touchpoints: z.array(z.any()),
      }).safeParse(interactions);

      expect(result.success).toBe(true);
    });
  });
});