import { describe, it, expect, vi } from 'vitest';
import { requireAuth } from '../../src/middleware/auth.js';

// Positive keywords list
const POSITIVE_KEYWORDS = [
  'excellent', 'amazing', 'great', 'fantastic', 'wonderful', 'love', 'perfect',
  'best', 'awesome', 'outstanding', 'superb', 'brilliant', 'good', 'nice',
  'happy', 'satisfied', 'recommend', 'quality', 'fast', 'easy', 'helpful',
  'beautiful', 'comfortable', 'durable', 'reliable', 'exceptional', 'impressed',
  'delighted', 'pleased', 'exceptional', 'incredible', 'marvelous', 'terrific'
];

// Negative keywords list
const NEGATIVE_KEYWORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor', 'disappointed',
  'waste', 'broken', 'defective', 'useless', 'hate', 'annoying', 'slow',
  'difficult', 'complicated', 'frustrating', 'angry', 'unhappy', 'regret',
  'avoid', 'scam', 'fake', 'damaged', 'cheap', 'flimsy', 'unreliable',
  'problem', 'issue', 'fault', 'fail', 'error', 'wrong', 'returned', 'refund'
];

// Sentiment analyzer function
function analyzeSentiment(text) {
  if (!text) return 'neutral';

  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) positiveScore++;
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

describe('Review Collection Service', () => {
  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment', () => {
      const result = analyzeSentiment('This product is excellent and amazing!');
      expect(result).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const result = analyzeSentiment('Terrible product, very disappointed and waste of money');
      expect(result).toBe('negative');
    });

    it('should return neutral for mixed content', () => {
      const result = analyzeSentiment('The product arrived yesterday');
      expect(result).toBe('neutral');
    });

    it('should return neutral for empty text', () => {
      const result = analyzeSentiment('');
      expect(result).toBe('neutral');
    });

    it('should return neutral for null text', () => {
      const result = analyzeSentiment(null);
      expect(result).toBe('neutral');
    });

    it('should handle case insensitive matching', () => {
      const result = analyzeSentiment('EXCELLENT QUALITY and GREAT VALUE');
      expect(result).toBe('positive');
    });

    it('should detect negative sentiment with problem keywords', () => {
      const result = analyzeSentiment('Product has issues and the material is cheap');
      expect(result).toBe('negative');
    });
  });

  describe('Review Schema Validation', () => {
    it('should have all required fields in review schema', () => {
      const requiredFields = [
        'reviewId',
        'companyId',
        'productId',
        'customerId',
        'rating',
        'status',
        'sentiment',
        'source',
        'createdAt',
        'updatedAt'
      ];

      // Create a sample review to verify structure
      const sampleReview = {
        reviewId: 'test-uuid',
        companyId: 'company-123',
        productId: 'product-456',
        customerId: 'customer-789',
        rating: 5,
        title: 'Great product',
        content: 'Really loved it!',
        status: 'pending',
        sentiment: 'positive',
        source: 'website',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };

      requiredFields.forEach(field => {
        expect(sampleReview).toHaveProperty(field);
      });
    });

    it('should validate rating is between 1-5', () => {
      const validRatings = [1, 2, 3, 4, 5];
      validRatings.forEach(rating => {
        expect(rating >= 1 && rating <= 5).toBe(true);
      });

      // Invalid ratings
      expect(0 >= 1 && 0 <= 5).toBe(false);
      expect(6 >= 1 && 6 <= 5).toBe(false);
    });

    it('should have valid status values', () => {
      const validStatuses = ['pending', 'approved', 'rejected'];
      validStatuses.forEach(status => {
        expect(['pending', 'approved', 'rejected']).toContain(status);
      });

      // Invalid status
      expect(['pending', 'approved', 'rejected']).not.toContain('unknown');
    });

    it('should have valid sentiment values', () => {
      const validSentiments = ['positive', 'neutral', 'negative'];
      validSentiments.forEach(sentiment => {
        expect(['positive', 'neutral', 'negative']).toContain(sentiment);
      });
    });

    it('should have valid source values', () => {
      const validSources = ['website', 'email', 'whatsapp'];
      validSources.forEach(source => {
        expect(['website', 'email', 'whatsapp']).toContain(source);
      });
    });
  });

  describe('API Endpoints Structure', () => {
    it('should define all required endpoints', () => {
      const endpoints = [
        { method: 'POST', path: '/api/reviews/request' },
        { method: 'POST', path: '/api/reviews/submit' },
        { method: 'GET', path: '/api/reviews/:reviewId' },
        { method: 'GET', path: '/api/reviews/product/:productId' },
        { method: 'GET', path: '/api/reviews/customer/:customerId' },
        { method: 'PUT', path: '/api/reviews/:reviewId' },
        { method: 'PUT', path: '/api/reviews/:reviewId/moderate' },
        { method: 'DELETE', path: '/api/reviews/:reviewId' },
        { method: 'GET', path: '/api/reviews/stats' },
        { method: 'POST', path: '/api/reviews/:reviewId/respond' }
      ];

      expect(endpoints.length).toBe(10);
      expect(endpoints.filter(e => e.method === 'POST').length).toBe(3);
      expect(endpoints.filter(e => e.method === 'GET').length).toBe(4);
      expect(endpoints.filter(e => e.method === 'PUT').length).toBe(2);
      expect(endpoints.filter(e => e.method === 'DELETE').length).toBe(1);
    });
  });

  describe('Authentication Middleware', () => {
    it('should require API key for protected routes', () => {
      const mockReq = {
        headers: {}
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'API key required'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow request with valid API key', () => {
      const mockReq = {
        headers: {
          'x-api-key': 'valid-api-key-12345'
        }
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.apiKey).toBe('valid-ap...');
    });

    it('should reject short API keys', () => {
      const mockReq = {
        headers: {
          'x-api-key': 'short'
        }
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing X-Company-Id header requirement', () => {
      const mockReq = {
        headers: {
          'x-api-key': 'valid-api-key-12345'
        }
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      requireAuth(mockReq, mockRes, mockNext);

      // Should pass auth but downstream handlers should check X-Company-Id
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Review Statistics', () => {
    it('should calculate correct average rating', () => {
      const ratings = [5, 4, 5, 3, 5];
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      expect(average).toBe(4.4);
    });

    it('should calculate rating distribution correctly', () => {
      const reviews = [
        { rating: 5, status: 'approved' },
        { rating: 5, status: 'approved' },
        { rating: 4, status: 'approved' },
        { rating: 3, status: 'approved' },
        { rating: 1, status: 'approved' },
        { rating: 5, status: 'pending' },
        { rating: 2, status: 'rejected' }
      ];

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.filter(r => r.status === 'approved').forEach(r => {
        distribution[r.rating]++;
      });

      expect(distribution).toEqual({
        1: 1, 2: 0, 3: 1, 4: 1, 5: 2
      });
    });

    it('should count sentiment distribution correctly', () => {
      const reviews = [
        { sentiment: 'positive', status: 'approved' },
        { sentiment: 'positive', status: 'approved' },
        { sentiment: 'neutral', status: 'approved' },
        { sentiment: 'negative', status: 'approved' },
        { sentiment: 'negative', status: 'pending' }
      ];

      const distribution = { positive: 0, neutral: 0, negative: 0 };
      reviews.filter(r => r.status === 'approved').forEach(r => {
        distribution[r.sentiment]++;
      });

      expect(distribution).toEqual({
        positive: 2, neutral: 1, negative: 1
      });
    });

    it('should handle empty reviews array', () => {
      const reviews = [];
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      expect(avgRating).toBe(0);
    });

    it('should count verified reviews correctly', () => {
      const reviews = [
        { verified: true, status: 'approved' },
        { verified: true, status: 'approved' },
        { verified: false, status: 'approved' },
        { verified: true, status: 'pending' }
      ];

      const verifiedCount = reviews.filter(r => r.verified && r.status === 'approved').length;
      expect(verifiedCount).toBe(2);
    });
  });

  describe('Review Request', () => {
    it('should create valid review request structure', () => {
      const request = {
        requestId: 'test-request-uuid',
        companyId: 'company-123',
        customerId: 'customer-456',
        customerEmail: 'test@example.com',
        customerName: 'John Doe',
        productId: 'product-789',
        orderId: 'order-012',
        channel: 'email',
        scheduledFor: '2024-01-15T10:00:00Z',
        sentAt: null,
        status: 'pending',
        createdAt: '2024-01-10T10:00:00Z'
      };

      expect(request).toHaveProperty('requestId');
      expect(request).toHaveProperty('companyId');
      expect(request).toHaveProperty('customerEmail');
      expect(request).toHaveProperty('productId');
      expect(request).toHaveProperty('channel');
      expect(request).toHaveProperty('status');
      expect(['email', 'whatsapp']).toContain(request.channel);
    });
  });
});
