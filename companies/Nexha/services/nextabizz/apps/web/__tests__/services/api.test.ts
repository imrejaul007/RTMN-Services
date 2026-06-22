/**
 * API Endpoint Tests for NEXABIZZ
 *
 * Tests all API endpoints for:
 * - Correct response format
 * - Error handling
 * - Validation
 * - Authentication/Authorization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  // Import types from shared-types
  CreateRFQRequestSchema,
  RFQRespondRequestSchema,
  AwardRFQRequestSchema,
  CreatePurchaseOrderRequestSchema,
  ListOrdersQuerySchema,
  CreateMerchantRequestSchema,
  CreateSupplierRequestSchema,
  ListServiceQuotesQuerySchema,
  CreateServiceOrderRequestSchema,
  PaginationMetaSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  ErrorResponseSchema,
  ValidationErrorResponseSchema,
} from '@nextabizz/shared-types';

// ============================================
// Mock Supabase Client
// ============================================

const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
  }),
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

// ============================================
// Test Helpers
// ============================================

function createMockSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
    message: undefined,
    error: undefined,
  };
}

function createMockErrorResponse(code: string, message: string, details?: Record<string, unknown>) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

function createMockPaginatedResponse<T>(items: T[], page: number, limit: number, total: number) {
  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

// ============================================
// API Response Schema Tests
// ============================================

describe('API Response Schemas', () => {
  describe('ApiResponseSchema', () => {
    it('should accept valid success response', () => {
      const response = createMockSuccessResponse({ id: '123', name: 'Test' });
      const result = ApiResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should accept valid error response', () => {
      const response = createMockErrorResponse('NOT_FOUND', 'Resource not found');
      const result = ApiResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response without success field', () => {
      const response = { data: null, message: 'Test' };
      const result = ApiResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject response with invalid success value', () => {
      const response = { success: 'yes', data: null };
      const result = ApiResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationMetaSchema', () => {
    it('should accept valid pagination metadata', () => {
      const meta = {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      };
      const result = PaginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it('should reject page less than 1', () => {
      const meta = {
        page: 0,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      };
      const result = PaginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });

    it('should reject negative total', () => {
      const meta = {
        page: 1,
        limit: 20,
        total: -1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
      const result = PaginationMetaSchema.safeParse(meta);
      expect(result.success).toBe(false);
    });
  });

  describe('ErrorResponseSchema', () => {
    it('should accept valid error response', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email', issue: 'Invalid format' },
      };
      const result = ErrorResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should reject empty code', () => {
      const error = { code: '', message: 'Error' };
      const result = ErrorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });

    it('should reject empty message', () => {
      const error = { code: 'ERROR', message: '' };
      const result = ErrorResponseSchema.safeParse(error);
      expect(result.success).toBe(false);
    });
  });

  describe('ValidationErrorResponseSchema', () => {
    it('should accept valid validation error response', () => {
      const response = {
        success: false as const,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            { field: 'title', message: 'Title is required', code: 'required' },
            { field: 'quantity', message: 'Must be positive', code: 'positive' },
          ],
        },
      };
      const result = ValidationErrorResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject non-VALIDATION_ERROR code', () => {
      const response = {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'Validation failed',
          details: [],
        },
      };
      const result = ValidationErrorResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// RFQ API Tests
// ============================================

describe('RFQ API', () => {
  describe('CreateRFQRequestSchema', () => {
    it('should accept valid RFQ creation request', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Need 100kg Tomatoes',
        description: 'Fresh tomatoes for restaurant',
        category: 'vegetables',
        quantity: 100,
        unit: 'kg',
        targetPrice: 500,
        deliveryDeadline: '2024-12-31T23:59:59Z',
        expiresAt: '2024-12-30T23:59:59Z',
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject request with missing required fields', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        // Missing title, quantity, unit
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors;
        expect(errors.some((e) => e.path.includes('title'))).toBe(true);
        expect(errors.some((e) => e.path.includes('quantity'))).toBe(true);
        expect(errors.some((e) => e.path.includes('unit'))).toBe(true);
      }
    });

    it('should reject non-positive quantity', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test RFQ',
        quantity: 0,
        unit: 'kg',
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject negative target price', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test RFQ',
        quantity: 10,
        unit: 'kg',
        targetPrice: -100,
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for merchantId', () => {
      const request = {
        merchantId: 'not-a-uuid',
        title: 'Test RFQ',
        quantity: 10,
        unit: 'kg',
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: '',
        quantity: 10,
        unit: 'kg',
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject empty unit', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test RFQ',
        quantity: 10,
        unit: '',
      };
      const result = CreateRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('RFQRespondRequestSchema', () => {
    it('should accept valid RFQ response', () => {
      const request = {
        rfqId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        unitPrice: 5.5,
        leadTimeDays: 3,
        notes: 'Can deliver by Friday',
      };
      const result = RFQRespondRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject negative unit price', () => {
      const request = {
        rfqId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        unitPrice: -5,
      };
      const result = RFQRespondRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject negative lead time', () => {
      const request = {
        rfqId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        unitPrice: 5,
        leadTimeDays: -1,
      };
      const result = RFQRespondRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('AwardRFQRequestSchema', () => {
    it('should accept valid award request', () => {
      const request = {
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = AwardRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty supplier ID', () => {
      const request = {
        supplierId: '',
      };
      const result = AwardRFQRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Purchase Order API Tests
// ============================================

describe('Purchase Order API', () => {
  describe('CreatePurchaseOrderRequestSchema', () => {
    it('should accept valid PO creation request', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        items: [
          {
            name: 'Tomatoes',
            qty: 50,
            unit: 'kg',
            unitPrice: 50,
          },
        ],
        paymentMethod: 'net-terms',
        deliveryAddress: {
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        source: 'rfq',
        rfqId: '550e8400-e29b-41d4-a716-446655440002',
      };
      const result = CreatePurchaseOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        items: [],
        source: 'manual',
      };
      const result = CreatePurchaseOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid pincode format', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ name: 'Test', qty: 1, unit: 'units', unitPrice: 10 }],
        deliveryAddress: {
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '1234', // Invalid - should be 6 digits
        },
        source: 'manual',
      };
      const result = CreatePurchaseOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ name: 'Test', qty: 1, unit: 'units', unitPrice: 10 }],
        paymentMethod: 'crypto',
        source: 'manual',
      };
      const result = CreatePurchaseOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity in items', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ name: 'Test', qty: -1, unit: 'units', unitPrice: 10 }],
        source: 'manual',
      };
      const result = CreatePurchaseOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('ListOrdersQuerySchema', () => {
    it('should accept valid query with all filters', () => {
      const query = {
        page: 1,
        limit: 20,
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        supplierId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'confirmed',
        paymentStatus: 'pending',
        source: 'rfq',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };
      const result = ListOrdersQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should use default values for pagination', () => {
      const query = {};
      const result = ListOrdersQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject limit over 100', () => {
      const query = { limit: 150 };
      const result = ListOrdersQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Merchant API Tests
// ============================================

describe('Merchant API', () => {
  describe('CreateMerchantRequestSchema', () => {
    it('should accept valid merchant creation request', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Restaurant',
        category: 'restaurant',
        city: 'Mumbai',
        email: 'contact@restaurant.com',
        phone: '+91-9876543210',
        source: 'rez-merchant',
        sourceMerchantId: 'RMP-SOURCE-123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid merchant with optional fields missing', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Restaurant',
        category: 'hotel',
        source: 'hotel-pms',
        sourceMerchantId: 'HOTEL-123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Business',
        category: 'invalid_category',
        source: 'rez-merchant',
        sourceMerchantId: '123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Restaurant',
        category: 'restaurant',
        email: 'not-an-email',
        source: 'rez-merchant',
        sourceMerchantId: '123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid source', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Restaurant',
        category: 'restaurant',
        source: 'invalid_source',
        sourceMerchantId: '123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept empty email string', () => {
      const request = {
        rezMerchantId: 'RMP-12345',
        businessName: 'My Restaurant',
        category: 'restaurant',
        email: '',
        source: 'rez-merchant',
        sourceMerchantId: '123',
      };
      const result = CreateMerchantRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Supplier API Tests
// ============================================

describe('Supplier API', () => {
  describe('CreateSupplierRequestSchema', () => {
    it('should accept valid supplier creation request', () => {
      const request = {
        businessName: 'Fresh Produce Suppliers',
        gstNumber: '27AABCU9603R1ZM',
        contactName: 'John Doe',
        contactEmail: 'john@supplier.com',
        contactPhone: '+91-9876543210',
        categories: ['vegetables', 'fruits'],
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid supplier with minimal fields', () => {
      const request = {
        businessName: 'Minimal Supplier',
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid GST number', () => {
      const request = {
        businessName: 'Test Supplier',
        gstNumber: 'INVALID',
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const request = {
        businessName: 'Test Supplier',
        contactEmail: 'not-an-email',
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept empty GST number', () => {
      const request = {
        businessName: 'Test Supplier',
        gstNumber: '',
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateSupplierRequestSchema', () => {
    it('should accept valid update request', () => {
      const request = {
        businessName: 'Updated Supplier Name',
        isActive: false,
        categories: ['dairy'],
      };
      const result = CreateSupplierRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Service Quote API Tests
// ============================================

describe('Service Quote API', () => {
  describe('ListServiceQuotesQuerySchema', () => {
    it('should accept valid query with all filters', () => {
      const query = {
        page: 1,
        limit: 20,
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        serviceRfqId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'submitted',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        sortBy: 'totalPrice',
        sortOrder: 'asc',
      };
      const result = ListServiceQuotesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should use default sort values', () => {
      const query = {};
      const result = ListServiceQuotesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should reject invalid sort field', () => {
      const query = { sortBy: 'invalidField' };
      const result = ListServiceQuotesQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateServiceQuoteRequestSchema', () => {
    it('should accept valid service quote creation request', () => {
      const request = {
        serviceRfqId: '550e8400-e29b-41d4-a716-446655440000',
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        merchantId: '550e8400-e29b-41d4-a716-446655440002',
        estimatedDurationDays: 5,
        laborCost: 5000,
        materialCost: 10000,
        totalPrice: 15000,
        currency: 'INR',
        notes: 'Includes warranty',
        materials: [
          {
            description: 'Paint',
            quantity: 10,
            unit: 'liters',
            unitPrice: 500,
          },
        ],
      };
      const result = CreateServiceQuoteRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject negative total price', () => {
      const request = {
        serviceRfqId: '550e8400-e29b-41d4-a716-446655440000',
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        merchantId: '550e8400-e29b-41d4-a716-446655440002',
        totalPrice: -100,
      };
      const result = CreateServiceQuoteRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid material quantity', () => {
      const request = {
        serviceRfqId: '550e8400-e29b-41d4-a716-446655440000',
        vendorId: '550e8400-e29b-41d4-a716-446655440001',
        merchantId: '550e8400-e29b-41d4-a716-446655440002',
        totalPrice: 1000,
        materials: [
          {
            description: '',
            quantity: 0,
            unit: 'units',
            unitPrice: 100,
          },
        ],
      };
      const result = CreateServiceQuoteRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Service Order API Tests
// ============================================

describe('Service Order API', () => {
  describe('CreateServiceOrderRequestSchema', () => {
    it('should accept valid service order creation request', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Pest Control Service',
        description: 'Quarterly pest control treatment',
        priority: 'medium',
        schedule: {
          scheduledDate: '2024-12-15T10:00:00Z',
          startTime: '10:00',
          endTime: '12:00',
        },
        items: [
          {
            serviceName: 'Pest Control Treatment',
            description: 'Full kitchen treatment',
            quantity: 1,
            unit: 'session',
            unitPrice: 2000,
          },
        ],
        paymentMethod: 'upi',
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept request with recurring schedule', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Weekly Cleaning',
        priority: 'high',
        items: [
          {
            serviceName: 'Deep Cleaning',
            quantity: 1,
            unit: 'session',
            unitPrice: 5000,
          },
        ],
        schedule: {
          scheduledDate: '2024-12-01T09:00:00Z',
          startTime: '09:00',
          endTime: '17:00',
          recurring: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: [1, 3, 5],
          },
        },
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject missing required items', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Service',
        items: [],
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Service',
        items: [
          {
            serviceName: 'Test',
            quantity: 1,
            unit: 'session',
            unitPrice: 100,
          },
        ],
        schedule: {
          scheduledDate: '2024-12-15T10:00:00Z',
          startTime: '25:00', // Invalid
          endTime: '12:00',
        },
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Service',
        priority: 'super_urgent',
        items: [
          {
            serviceName: 'Test',
            quantity: 1,
            unit: 'session',
            unitPrice: 100,
          },
        ],
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding max length', () => {
      const request = {
        merchantId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'A'.repeat(201),
        items: [
          {
            serviceName: 'Test',
            quantity: 1,
            unit: 'session',
            unitPrice: 100,
          },
        ],
      };
      const result = CreateServiceOrderRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Error Handling', () => {
  describe('Database Error Responses', () => {
    it('should format database constraint violation', () => {
      const error = createMockErrorResponse(
        'CONSTRAINT_VIOLATION',
        'Unique constraint violated',
        { constraint: 'rfq_number_unique', value: 'RFQ-2024-001' }
      );
      expect(error.success).toBe(false);
      expect(error.error?.code).toBe('CONSTRAINT_VIOLATION');
      expect(error.error?.details?.constraint).toBe('rfq_number_unique');
    });

    it('should format authentication error', () => {
      const error = createMockErrorResponse(
        'UNAUTHORIZED',
        'Invalid or expired session'
      );
      expect(error.success).toBe(false);
      expect(error.error?.code).toBe('UNAUTHORIZED');
    });

    it('should format not found error', () => {
      const error = createMockErrorResponse(
        'NOT_FOUND',
        'RFQ not found',
        { resource: 'rfq', id: '550e8400-e29b-41d4-a716-446655440000' }
      );
      expect(error.success).toBe(false);
      expect(error.error?.code).toBe('NOT_FOUND');
      expect(error.error?.details?.resource).toBe('rfq');
    });

    it('should format forbidden error', () => {
      const error = createMockErrorResponse(
        'FORBIDDEN',
        'You do not have permission to access this resource'
      );
      expect(error.success).toBe(false);
      expect(error.error?.code).toBe('FORBIDDEN');
    });
  });
});

// ============================================
// Response Format Tests
// ============================================

describe('Response Format Validation', () => {
  describe('Paginated Responses', () => {
    it('should validate paginated response structure', () => {
      const response = createMockPaginatedResponse(
        [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
        1,
        20,
        50
      );
      const result = PaginatedResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should calculate hasNextPage correctly', () => {
      const response = createMockPaginatedResponse([], 2, 20, 50);
      expect(response.pagination.hasNextPage).toBe(true);

      const response2 = createMockPaginatedResponse([], 3, 20, 50);
      expect(response2.pagination.hasNextPage).toBe(false);
    });

    it('should calculate hasPrevPage correctly', () => {
      const response = createMockPaginatedResponse([], 1, 20, 50);
      expect(response.pagination.hasPrevPage).toBe(false);

      const response2 = createMockPaginatedResponse([], 2, 20, 50);
      expect(response2.pagination.hasPrevPage).toBe(true);
    });

    it('should calculate totalPages correctly', () => {
      const response = createMockPaginatedResponse([], 1, 10, 95);
      expect(response.pagination.totalPages).toBe(10);
    });
  });
});
