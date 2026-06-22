/**
 * Feature Store Validator Tests
 */

import {
  storeFeaturesSchema,
  batchGetSchema,
  entityIdSchema,
  featureNameSchema,
} from '../src/validators';

describe('Feature Store Validators', () => {
  describe('storeFeaturesSchema', () => {
    it('should validate valid feature with number value', () => {
      const input = {
        features: [{ name: 'age', value: 25 }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate valid feature with string value', () => {
      const input = {
        features: [{ name: 'country', value: 'India' }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate valid feature with boolean value', () => {
      const input = {
        features: [{ name: 'is_active', value: true }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate multiple features', () => {
      const input = {
        features: [
          { name: 'age', value: 25 },
          { name: 'country', value: 'India' },
          { name: 'is_active', value: true },
        ],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty features array', () => {
      const input = {
        features: [],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject feature without name', () => {
      const input = {
        features: [{ value: 25 }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject feature with empty name', () => {
      const input = {
        features: [{ name: '', value: 25 }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject feature with name too long', () => {
      const input = {
        features: [{ name: 'a'.repeat(300), value: 25 }],
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 features', () => {
      const input = {
        features: Array.from({ length: 101 }, (_, i) => ({
          name: `feature_${i}`,
          value: i,
        })),
      };
      const result = storeFeaturesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('batchGetSchema', () => {
    it('should validate valid batch request', () => {
      const input = {
        entity_ids: ['user_1', 'user_2'],
      };
      const result = batchGetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with feature names filter', () => {
      const input = {
        entity_ids: ['user_1'],
        feature_names: ['age', 'country'],
      };
      const result = batchGetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty entity_ids', () => {
      const input = {
        entity_ids: [],
      };
      const result = batchGetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 entity_ids', () => {
      const input = {
        entity_ids: Array.from({ length: 101 }, (_, i) => `user_${i}`),
      };
      const result = batchGetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('entityIdSchema', () => {
    it('should validate valid entity ID', () => {
      const result = entityIdSchema.safeParse('user_123');
      expect(result.success).toBe(true);
    });

    it('should reject empty entity ID', () => {
      const result = entityIdSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject entity ID too long', () => {
      const result = entityIdSchema.safeParse('a'.repeat(300));
      expect(result.success).toBe(false);
    });
  });

  describe('featureNameSchema', () => {
    it('should validate valid feature name', () => {
      const result = featureNameSchema.safeParse('age');
      expect(result.success).toBe(true);
    });

    it('should reject empty feature name', () => {
      const result = featureNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});
