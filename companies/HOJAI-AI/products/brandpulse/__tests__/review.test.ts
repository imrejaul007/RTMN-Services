/**
 * BrandPulse Review Service Tests
 */

import { describe, it, expect } from 'vitest';

// Mock review validation
interface ReviewInput {
  brandId: string;
  tenantId: string;
  source: string;
  content: string;
  rating: number;
  author: { name: string };
}

const validateReview = (input: ReviewInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!input.brandId) errors.push('brandId is required');
  if (!input.tenantId) errors.push('tenantId is required');
  if (!input.source) errors.push('source is required');
  if (!input.content || input.content.length < 1) errors.push('content is required');
  if (input.content && input.content.length > 5000) errors.push('content exceeds 5000 characters');
  if (!input.rating || input.rating < 1 || input.rating > 5) errors.push('rating must be between 1 and 5');
  if (!input.author?.name) errors.push('author.name is required');

  return { valid: errors.length === 0, errors };
};

const SOURCES = ['google', 'yelp', 'tripadvisor', 'facebook', 'direct', 'internal'];

describe('Review Validation', () => {
  describe('validateReview()', () => {
    it('should validate a complete review', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'Great hotel with excellent service!',
        rating: 5,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject review without brandId', () => {
      const result = validateReview({
        brandId: '',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'Great hotel!',
        rating: 5,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('brandId is required');
    });

    it('should reject review without tenantId', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: '',
        source: 'google',
        content: 'Great hotel!',
        rating: 5,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tenantId is required');
    });

    it('should reject review with rating < 1', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'Bad hotel!',
        rating: 0,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rating must be between 1 and 5');
    });

    it('should reject review with rating > 5', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'Perfect hotel!',
        rating: 6,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rating must be between 1 and 5');
    });

    it('should reject review without author name', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'Great hotel!',
        rating: 5,
        author: { name: '' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('author.name is required');
    });

    it('should reject review with content > 5000 chars', () => {
      const result = validateReview({
        brandId: 'hotel-123',
        tenantId: 'tenant-456',
        source: 'google',
        content: 'x'.repeat(5001),
        rating: 5,
        author: { name: 'John D.' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content exceeds 5000 characters');
    });

    it('should accept review with valid source', () => {
      for (const source of SOURCES) {
        const result = validateReview({
          brandId: 'hotel-123',
          tenantId: 'tenant-456',
          source,
          content: 'Great hotel!',
          rating: 5,
          author: { name: 'John D.' }
        });

        expect(result.valid).toBe(true);
      }
    });

    it('should collect multiple errors', () => {
      const result = validateReview({
        brandId: '',
        tenantId: '',
        source: '',
        content: '',
        rating: 10,
        author: { name: '' }
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('Review Rating', () => {
  it('should accept rating 1', () => {
    const result = validateReview({
      brandId: 'hotel-123',
      tenantId: 'tenant-456',
      source: 'google',
      content: 'Terrible!',
      rating: 1,
      author: { name: 'John D.' }
    });
    expect(result.valid).toBe(true);
  });

  it('should accept rating 5', () => {
    const result = validateReview({
      brandId: 'hotel-123',
      tenantId: 'tenant-456',
      source: 'google',
      content: 'Perfect!',
      rating: 5,
      author: { name: 'John D.' }
    });
    expect(result.valid).toBe(true);
  });
});
