/**
 * RestoPapa Integration Tests
 *
 * Tests for:
 * - RestoPapa webhook payload validation
 * - Inventory signal processing
 * - Webhook signature verification
 * - Database operations
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  // Webhook SDK functions
  verifyWebhookSignature,
  verifyWebhookSignatureDetailed,
  createWebhookSignature,
  RestoPapaInventoryPayloadSchema,
  validateRestoPapaPayload,
  validateRestoPapaPayloadSafe,
  dispatchRestoPapaWebhook,
  // Types
  type WebhookVerificationOptions,
  type HeadersRecord,
  type VerificationResult,
  type RestoPapaInventoryPayload,
} from '@nextabizz/webhook-sdk';

// ============================================
// Test Data Factories
// ============================================

function createValidRestoPapaPayload(): RestoPapaInventoryPayload {
  return {
    event: 'inventory.signal.received',
    merchantId: 'restopapa-merchant-123',
    productId: 'product-tomato-001',
    productName: 'Fresh Tomatoes',
    sku: 'TOM-001',
    currentStock: 15,
    threshold: 50,
    unit: 'kg',
    category: 'vegetables',
    severity: 'critical',
    signalType: 'threshold_breach',
    metadata: {
      supplier: 'Fresh Farms Inc',
      lastOrderDate: '2024-01-15',
    },
    timestamp: new Date().toISOString(),
  };
}

function createMockHeaders(
  signature: string,
  timestamp: string
): HeadersRecord {
  return {
    'x-webhook-signature': signature,
    'x-webhook-timestamp': timestamp,
  };
}

function createMockContext() {
  return {
    supabaseUrl: 'https://test-project.supabase.co',
    supabaseServiceKey: 'test-service-key',
  };
}

// ============================================
// Webhook Signature Verification Tests
// ============================================

describe('RestoPapa Webhook Signature Verification', () => {
  const secret = 'test-webhook-secret';
  const payload = JSON.stringify({
    event: 'inventory.signal.received',
    merchantId: 'test-merchant',
    productId: 'test-product',
    currentStock: 10,
    timestamp: '2024-01-15T10:00:00Z',
  });

  describe('createWebhookSignature', () => {
    it('should create a valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, secret, timestamp);

      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should create different signatures for different payloads', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const sig1 = createWebhookSignature('payload1', secret, timestamp);
      const sig2 = createWebhookSignature('payload2', secret, timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different secrets', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const sig1 = createWebhookSignature(payload, 'secret1', timestamp);
      const sig2 = createWebhookSignature(payload, 'secret2', timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different timestamps', () => {
      const sig1 = createWebhookSignature(payload, secret, 1000000);
      const sig2 = createWebhookSignature(payload, secret, 1000001);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, secret, timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      const result = verifyWebhookSignature(payload, headers, {
        secret,
        toleranceSeconds: 300,
      });

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = createMockHeaders('sha256=invalid_signature_here', String(timestamp));

      expect(() => {
        verifyWebhookSignature(payload, headers, { secret });
      }).toThrow();
    });

    it('should reject missing signature header', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const headers: HeadersRecord = {
        'x-webhook-timestamp': String(timestamp),
      };

      expect(() => {
        verifyWebhookSignature(payload, headers, { secret });
      }).toThrow("Missing signature header 'x-webhook-signature'");
    });

    it('should reject missing timestamp header', () => {
      const headers: HeadersRecord = {
        'x-webhook-signature': 'sha256=somesignature',
      };

      expect(() => {
        verifyWebhookSignature(payload, headers, { secret });
      }).toThrow("Missing timestamp header 'x-webhook-timestamp'");
    });

    it('should reject expired timestamp', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = createWebhookSignature(payload, secret, oldTimestamp);
      const headers = createMockHeaders(signature, String(oldTimestamp));

      expect(() => {
        verifyWebhookSignature(payload, headers, {
          secret,
          toleranceSeconds: 300,
        });
      }).toThrow(/timestamp expired/i);
    });

    it('should reject future timestamp beyond tolerance', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future
      const signature = createWebhookSignature(payload, secret, futureTimestamp);
      const headers = createMockHeaders(signature, String(futureTimestamp));

      expect(() => {
        verifyWebhookSignature(payload, headers, {
          secret,
          toleranceSeconds: 300,
        });
      }).toThrow(/timestamp expired/i);
    });

    it('should accept timestamp within tolerance window', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signature = createWebhookSignature(payload, secret, timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      const result = verifyWebhookSignature(payload, headers, {
        secret,
        toleranceSeconds: 300,
      });

      expect(result).toBe(true);
    });

    it('should use custom header names when specified', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, secret, timestamp);
      const headers: HeadersRecord = {
        'x-custom-signature': signature,
        'x-custom-timestamp': String(timestamp),
      };

      const result = verifyWebhookSignature(payload, headers, {
        secret,
        signatureHeader: 'x-custom-signature',
        timestampHeader: 'x-custom-timestamp',
      });

      expect(result).toBe(true);
    });
  });

  describe('verifyWebhookSignatureDetailed', () => {
    it('should return valid result for correct signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, secret, timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      const result: VerificationResult = verifyWebhookSignatureDetailed(payload, headers, {
        secret,
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error details for invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = createMockHeaders('sha256=wrong_signature', String(timestamp));

      const result: VerificationResult = verifyWebhookSignatureDetailed(payload, headers, {
        secret,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should not throw, only return error result', () => {
      const headers: HeadersRecord = {};

      const result: VerificationResult = verifyWebhookSignatureDetailed(payload, headers, {
        secret,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================
// RestoPapa Payload Validation Tests
// ============================================

describe('RestoPapa Payload Validation', () => {
  describe('RestoPapaInventoryPayloadSchema', () => {
    describe('Valid Payloads', () => {
      it('should accept valid RestoPapa inventory payload', () => {
        const payload = createValidRestoPapaPayload();
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event).toBe('inventory.signal.received');
          expect(result.data.merchantId).toBeTruthy();
          expect(result.data.productId).toBeTruthy();
          expect(result.data.productName).toBeTruthy();
        }
      });

      it('should accept payload without optional SKU', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          sku: undefined,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should accept payload without optional category', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          category: undefined,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should accept payload without optional metadata', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          metadata: undefined,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should accept payload with all severity values', () => {
        const severities: Array<'low' | 'critical' | 'out_of_stock'> = ['low', 'critical', 'out_of_stock'];
        for (const severity of severities) {
          const payload = { ...createValidRestoPapaPayload(), severity };
          const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });

      it('should accept payload with all signal type values', () => {
        const signalTypes: Array<'threshold_breach' | 'manual_request' | 'forecast_deficit'> = [
          'threshold_breach',
          'manual_request',
          'forecast_deficit',
        ];
        for (const signalType of signalTypes) {
          const payload = { ...createValidRestoPapaPayload(), signalType };
          const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });

      it('should accept payload with all unit values', () => {
        const units: Array<'kg' | 'units' | 'liters' | 'packs'> = ['kg', 'units', 'liters', 'packs'];
        for (const unit of units) {
          const payload = { ...createValidRestoPapaPayload(), unit };
          const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('Invalid Payloads', () => {
      it('should reject missing event field', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          event: undefined,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject wrong event type', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          event: 'order.created',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject missing merchantId', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          merchantId: '',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('merchantId is required');
        }
      });

      it('should reject missing productId', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          productId: '',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('productId is required');
        }
      });

      it('should reject missing productName', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          productName: '',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject negative currentStock', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          currentStock: -10,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('currentStock must be non-negative');
        }
      });

      it('should reject negative threshold', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          threshold: -5,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('threshold must be non-negative');
        }
      });

      it('should reject invalid unit', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          unit: 'tonnes',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject invalid severity', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          severity: 'high',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject invalid signalType', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          signalType: 'low_stock',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject invalid timestamp format', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          timestamp: 'not-a-date',
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid ISO timestamp format');
        }
      });

      it('should reject metadata with non-object value', () => {
        const payload = {
          ...createValidRestoPapaPayload(),
          metadata: 'invalid' as unknown as Record<string, unknown>,
        };
        const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateRestoPapaPayload', () => {
    it('should return parsed payload on valid input', () => {
      const payload = createValidRestoPapaPayload();
      const result = validateRestoPapaPayload(payload);

      expect(result).toEqual(payload);
    });

    it('should throw ZodError on invalid input', () => {
      const payload = { event: 'invalid' };

      expect(() => {
        validateRestoPapaPayload(payload);
      }).toThrow(z.ZodError);
    });
  });

  describe('validateRestoPapaPayloadSafe', () => {
    it('should return success result for valid payload', () => {
      const payload = createValidRestoPapaPayload();
      const result = validateRestoPapaPayloadSafe(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(payload);
      }
    });

    it('should return error result for invalid payload', () => {
      const payload = { event: 'invalid' };
      const result = validateRestoPapaPayloadSafe(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('should provide detailed error information', () => {
      const payload = {
        event: 'inventory.signal.received',
        merchantId: '',
        productId: '',
        productName: '',
        currentStock: -1,
        threshold: -1,
        unit: 'invalid',
        severity: 'invalid',
        signalType: 'invalid',
        timestamp: 'invalid',
      };

      const result = validateRestoPapaPayloadSafe(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================
// RestoPapa Webhook Dispatch Tests
// ============================================

describe('RestoPapa Webhook Dispatch', () => {
  describe('dispatchRestoPapaWebhook', () => {
    it('should process valid webhook payload', async () => {
      const payload = createValidRestoPapaPayload();
      const context = createMockContext();

      // Mock the supabase client
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'signal-123' },
        error: null,
      });

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockInsert,
              }),
            }),
          }),
        }),
      }));

      const result = await dispatchRestoPapaWebhook(payload, context);

      // Note: In a real test, we would mock the database
      // This test validates the function accepts valid input
      expect(result.source).toBe('restopapa');
      expect(result.eventType).toBe('inventory.signal.received');
    });

    it('should reject invalid payload', async () => {
      const payload = { event: 'invalid' };
      const context = createMockContext();

      const result = await dispatchRestoPapaWebhook(payload, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payload validation failed');
      expect(result.validationError).toBeInstanceOf(z.ZodError);
    });

    it('should return validation errors for malformed payload', async () => {
      const payload = {
        event: 'inventory.signal.received',
        merchantId: '',
        productId: '',
        productName: '',
        currentStock: -10,
        threshold: -10,
        unit: 'invalid',
        severity: 'invalid',
        signalType: 'invalid',
        timestamp: 'invalid',
      };
      const context = createMockContext();

      const result = await dispatchRestoPapaWebhook(payload, context);

      expect(result.success).toBe(false);
      expect(result.validationError).toBeInstanceOf(z.ZodError);
    });
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('RestoPapa Error Handling', () => {
  describe('Invalid Payload Scenarios', () => {
    it('should handle empty payload', () => {
      const result = validateRestoPapaPayloadSafe({});
      expect(result.success).toBe(false);
    });

    it('should handle null payload', () => {
      const result = validateRestoPapaPayloadSafe(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined payload', () => {
      const result = validateRestoPapaPayloadSafe(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle array payload', () => {
      const result = validateRestoPapaPayloadSafe([]);
      expect(result.success).toBe(false);
    });

    it('should handle string payload', () => {
      const result = validateRestoPapaPayloadSafe('invalid');
      expect(result.success).toBe(false);
    });

    it('should handle numeric payload', () => {
      const result = validateRestoPapaPayloadSafe(123);
      expect(result.success).toBe(false);
    });
  });

  describe('Partial Payload Validation', () => {
    it('should report all missing required fields', () => {
      const payload = {
        event: 'inventory.signal.received',
      };

      const result = validateRestoPapaPayloadSafe(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = result.error.errors.map((e) => e.path[0]);
        expect(missingFields).toContain('merchantId');
        expect(missingFields).toContain('productId');
        expect(missingFields).toContain('productName');
        expect(missingFields).toContain('currentStock');
        expect(missingFields).toContain('threshold');
        expect(missingFields).toContain('unit');
        expect(missingFields).toContain('severity');
        expect(missingFields).toContain('signalType');
        expect(missingFields).toContain('timestamp');
      }
    });
  });
});

// ============================================
// Edge Cases
// ============================================

describe('RestoPapa Edge Cases', () => {
  describe('Boundary Values', () => {
    it('should accept zero currentStock', () => {
      const payload = { ...createValidRestoPapaPayload(), currentStock: 0 };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept zero threshold', () => {
      const payload = { ...createValidRestoPapaPayload(), threshold: 0 };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept very large currentStock', () => {
      const payload = { ...createValidRestoPapaPayload(), currentStock: 999999999 };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept very large threshold', () => {
      const payload = { ...createValidRestoPapaPayload(), threshold: 999999999 };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept very long productName', () => {
      const payload = { ...createValidRestoPapaPayload(), productName: 'A'.repeat(500) };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept valid ISO timestamp', () => {
      const payload = { ...createValidRestoPapaPayload(), timestamp: '2024-01-15T10:30:00.000Z' };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept metadata with nested objects', () => {
      const payload = {
        ...createValidRestoPapaPayload(),
        metadata: {
          supplier: { name: 'Test', id: '123' },
          pricing: { cost: 50, margin: 0.2 },
          tags: ['organic', 'fresh'],
        },
      };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should accept unicode productName', () => {
      const payload = { ...createValidRestoPapaPayload(), productName: 'Tomates Fraîches' };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept special characters in category', () => {
      const payload = { ...createValidRestoPapaPayload(), category: 'Fruits & Vegetables!' };
      const result = RestoPapaInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Integration Test Scenarios
// ============================================

describe('RestoPapa Integration Scenarios', () => {
  describe('Complete Webhook Processing Flow', () => {
    it('should process stock update webhook end-to-end', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = createValidRestoPapaPayload();
      const payloadString = JSON.stringify(payload);
      const secret = 'test-secret';
      const signature = createWebhookSignature(payloadString, secret, timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      // Step 1: Verify signature
      const isValid = verifyWebhookSignature(payloadString, headers, {
        secret,
        toleranceSeconds: 300,
      });
      expect(isValid).toBe(true);

      // Step 2: Validate payload
      const validationResult = validateRestoPapaPayloadSafe(JSON.parse(payloadString));
      expect(validationResult.success).toBe(true);

      // Step 3: Process the signal (mocked)
      if (validationResult.success) {
        expect(validationResult.data.productName).toBe('Fresh Tomatoes');
        expect(validationResult.data.currentStock).toBe(15);
        expect(validationResult.data.threshold).toBe(50);
      }
    });

    it('should detect critical stock level', async () => {
      const payload = {
        ...createValidRestoPapaPayload(),
        currentStock: 5,
        threshold: 50,
        severity: 'critical',
        signalType: 'threshold_breach',
      };

      const result = validateRestoPapaPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        // Business logic: trigger reorder when stock < threshold
        expect(result.data.currentStock).toBeLessThan(result.data.threshold);
        expect(result.data.severity).toBe('critical');
      }
    });

    it('should detect out of stock situation', async () => {
      const payload = {
        ...createValidRestoPapaPayload(),
        currentStock: 0,
        severity: 'out_of_stock',
        signalType: 'threshold_breach',
      };

      const result = validateRestoPapaPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.currentStock).toBe(0);
        expect(result.data.severity).toBe('out_of_stock');
      }
    });

    it('should handle low stock warning', async () => {
      const payload = {
        ...createValidRestoPapaPayload(),
        currentStock: 30,
        threshold: 50,
        severity: 'low',
        signalType: 'forecast_deficit',
      };

      const result = validateRestoPapaPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.severity).toBe('low');
      }
    });
  });

  describe('Manual Reorder Signal', () => {
    it('should validate manual request signal', () => {
      const payload = {
        ...createValidRestoPapaPayload(),
        severity: 'critical',
        signalType: 'manual_request',
        metadata: {
          requestedBy: 'inventory-manager',
          reason: 'Special event preparation',
          urgency: 'high',
        },
      };

      const result = validateRestoPapaPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.signalType).toBe('manual_request');
        expect(result.data.metadata?.requestedBy).toBe('inventory-manager');
      }
    });
  });
});
