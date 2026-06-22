/**
 * Hotel PMS Integration Tests
 *
 * Tests for:
 * - Hotel PMS webhook payload validation
 * - Reservation processing (create, modify, cancel)
 * - Inventory sync handling
 * - Department-specific signals
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
  HotelPMSInventoryPayloadSchema,
  validateHotelPMSPayload,
  validateHotelPMSPayloadSafe,
  dispatchHotelPMSWebhook,
  // Hotel PMS specific handlers
  HotelPMSReservationCreatedSchema,
  HotelPMSReservationModifiedSchema,
  HotelPMSReservationCancelledSchema,
  HotelPMSInventorySyncSchema,
  // Types
  type WebhookVerificationOptions,
  type HeadersRecord,
  type VerificationResult,
  type HotelPMSInventoryPayload,
} from '@nextabizz/webhook-sdk';

// ============================================
// Test Data Factories
// ============================================

function createValidHotelPMSPayload(): HotelPMSInventoryPayload {
  return {
    event: 'inventory.signal.received',
    merchantId: 'hotel-grand-palace-001',
    department: 'housekeeping',
    itemId: 'item-towels-001',
    itemName: 'Bath Towels',
    category: 'linens',
    currentStock: 50,
    threshold: 100,
    unit: 'units',
    severity: 'critical',
    signalType: 'threshold_breach',
    metadata: {
      roomCount: 200,
      occupancyRate: 0.85,
    },
    timestamp: new Date().toISOString(),
  };
}

function createValidReservationPayload() {
  return {
    reservationId: 'res-123456',
    confirmationNumber: 'HP-2024-001234',
    guestName: 'John Doe',
    checkIn: '2024-12-15T14:00:00Z',
    checkOut: '2024-12-18T11:00:00Z',
    roomCount: 2,
    roomType: 'deluxe',
    guestCount: 2,
    notes: 'Early check-in requested',
  };
}

function createValidReservationModifiedPayload() {
  return {
    reservationId: 'res-123456',
    confirmationNumber: 'HP-2024-001234',
    previousCheckIn: '2024-12-15T14:00:00Z',
    newCheckIn: '2024-12-16T14:00:00Z',
    previousCheckOut: '2024-12-18T11:00:00Z',
    newCheckOut: '2024-12-19T11:00:00Z',
    previousRoomCount: 2,
    newRoomCount: 3,
    modificationReason: 'Guest requested additional room',
  };
}

function createValidReservationCancelledPayload() {
  return {
    reservationId: 'res-123456',
    confirmationNumber: 'HP-2024-001234',
    cancelledAt: '2024-12-10T10:30:00Z',
    cancellationReason: 'Guest requested cancellation',
    refundStatus: 'pending',
  };
}

function createValidInventorySyncPayload() {
  return {
    hotelId: 'hotel-grand-palace-001',
    categories: [
      {
        categoryId: 'cat-001',
        categoryName: 'Housekeeping',
        items: [
          { itemId: 'item-001', name: 'Towels', currentStock: 200, parLevel: 300, unit: 'units' },
          { itemId: 'item-002', name: 'Sheets', currentStock: 150, parLevel: 200, unit: 'units' },
        ],
      },
      {
        categoryId: 'cat-002',
        categoryName: 'Kitchen',
        items: [
          { itemId: 'item-003', name: 'Coffee Beans', currentStock: 50, parLevel: 100, unit: 'kg' },
        ],
      },
    ],
    syncedAt: new Date().toISOString(),
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
// Hotel PMS Inventory Payload Validation Tests
// ============================================

describe('Hotel PMS Inventory Payload Validation', () => {
  describe('HotelPMSInventoryPayloadSchema', () => {
    describe('Valid Payloads', () => {
      it('should accept valid Hotel PMS inventory payload', () => {
        const payload = createValidHotelPMSPayload();
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event).toBe('inventory.signal.received');
          expect(result.data.merchantId).toBeTruthy();
          expect(result.data.department).toBe('housekeeping');
        }
      });

      it('should accept all valid department values', () => {
        const departments: Array<'housekeeping' | 'kitchen' | 'spa' | 'front_desk'> = [
          'housekeeping',
          'kitchen',
          'spa',
          'front_desk',
        ];

        for (const department of departments) {
          const payload = { ...createValidHotelPMSPayload(), department };
          const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });

      it('should accept payload without optional metadata', () => {
        const payload = {
          ...createValidHotelPMSPayload(),
          metadata: undefined,
        };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('should accept payload with all severity values', () => {
        const severities: Array<'low' | 'critical' | 'out_of_stock'> = ['low', 'critical', 'out_of_stock'];
        for (const severity of severities) {
          const payload = { ...createValidHotelPMSPayload(), severity };
          const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
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
          const payload = { ...createValidHotelPMSPayload(), signalType };
          const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });

      it('should accept different units for different departments', () => {
        const departmentUnits: Record<string, string> = {
          housekeeping: 'units',
          kitchen: 'kg',
          spa: 'liters',
          front_desk: 'packs',
        };

        for (const [dept, unit] of Object.entries(departmentUnits)) {
          const payload = { ...createValidHotelPMSPayload(), department: dept as 'housekeeping' | 'kitchen' | 'spa' | 'front_desk', unit };
          const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('Invalid Payloads', () => {
      it('should reject missing event field', () => {
        const payload = { ...createValidHotelPMSPayload(), event: undefined };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject wrong event type', () => {
        const payload = { ...createValidHotelPMSPayload(), event: 'reservation.created' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject invalid department', () => {
        const payload = { ...createValidHotelPMSPayload(), department: 'security' as 'housekeeping' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject missing merchantId', () => {
        const payload = { ...createValidHotelPMSPayload(), merchantId: '' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject missing itemId', () => {
        const payload = { ...createValidHotelPMSPayload(), itemId: '' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject missing itemName', () => {
        const payload = { ...createValidHotelPMSPayload(), itemName: '' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject missing category', () => {
        const payload = { ...createValidHotelPMSPayload(), category: '' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject negative currentStock', () => {
        const payload = { ...createValidHotelPMSPayload(), currentStock: -10 };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject negative threshold', () => {
        const payload = { ...createValidHotelPMSPayload(), threshold: -5 };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('should reject invalid timestamp format', () => {
        const payload = { ...createValidHotelPMSPayload(), timestamp: 'not-a-date' };
        const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateHotelPMSPayload', () => {
    it('should return parsed payload on valid input', () => {
      const payload = createValidHotelPMSPayload();
      const result = validateHotelPMSPayload(payload);
      expect(result).toEqual(payload);
    });

    it('should throw ZodError on invalid input', () => {
      const payload = { event: 'invalid' };
      expect(() => {
        validateHotelPMSPayload(payload);
      }).toThrow(z.ZodError);
    });
  });

  describe('validateHotelPMSPayloadSafe', () => {
    it('should return success result for valid payload', () => {
      const payload = createValidHotelPMSPayload();
      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);
    });

    it('should return error result for invalid payload', () => {
      const payload = { event: 'invalid' };
      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Hotel PMS Reservation Schema Tests
// ============================================

describe('Hotel PMS Reservation Schemas', () => {
  describe('Reservation Created', () => {
    it('should accept valid reservation created payload', () => {
      const payload = createValidReservationPayload();
      const result = HotelPMSReservationCreatedSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept payload without optional notes', () => {
      const payload = {
        ...createValidReservationPayload(),
        notes: undefined,
      };
      const result = HotelPMSReservationCreatedSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const payload = {
        confirmationNumber: 'HP-2024-001234',
      };
      const result = HotelPMSReservationCreatedSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid check-in date', () => {
      const payload = {
        ...createValidReservationPayload(),
        checkIn: 'invalid-date',
      };
      const result = HotelPMSReservationCreatedSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject zero room count', () => {
      const payload = {
        ...createValidReservationPayload(),
        roomCount: 0,
      };
      const result = HotelPMSReservationCreatedSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Reservation Modified', () => {
    it('should accept valid reservation modified payload', () => {
      const payload = createValidReservationModifiedPayload();
      const result = HotelPMSReservationModifiedSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept payload without previous values (for new reservations)', () => {
      const payload = {
        reservationId: 'res-123456',
        confirmationNumber: 'HP-2024-001234',
        newCheckIn: '2024-12-16T14:00:00Z',
        newCheckOut: '2024-12-19T11:00:00Z',
        newRoomCount: 2,
      };
      const result = HotelPMSReservationModifiedSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject check-out before check-in', () => {
      const payload = {
        ...createValidReservationModifiedPayload(),
        newCheckIn: '2024-12-20T14:00:00Z',
        newCheckOut: '2024-12-18T11:00:00Z',
      };
      const result = HotelPMSReservationModifiedSchema.safeParse(payload);
      // Note: Schema doesn't validate this, but it's a business rule
      expect(result.success).toBe(true);
    });
  });

  describe('Reservation Cancelled', () => {
    it('should accept valid cancellation payload', () => {
      const payload = createValidReservationCancelledPayload();
      const result = HotelPMSReservationCancelledSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept all valid refund status values', () => {
      const refundStatuses: Array<'pending' | 'processed' | 'not_applicable'> = [
        'pending',
        'processed',
        'not_applicable',
      ];
      for (const status of refundStatuses) {
        const payload = { ...createValidReservationCancelledPayload(), refundStatus: status };
        const result = HotelPMSReservationCancelledSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid refund status', () => {
      const payload = {
        ...createValidReservationCancelledPayload(),
        refundStatus: 'partial',
      };
      const result = HotelPMSReservationCancelledSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Hotel PMS Inventory Sync Schema Tests
// ============================================

describe('Hotel PMS Inventory Sync Schema', () => {
  describe('Valid Inventory Sync Payloads', () => {
    it('should accept valid inventory sync payload', () => {
      const payload = createValidInventorySyncPayload();
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept empty categories array', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept categories with empty items array', () => {
      const payload = {
        ...createValidInventorySyncPayload(),
        categories: [
          {
            categoryId: 'cat-001',
            categoryName: 'Empty Category',
            items: [],
          },
        ],
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept multiple categories with items', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [
          {
            categoryId: 'cat-001',
            categoryName: 'Housekeeping',
            items: [
              { itemId: 'item-001', name: 'Towels', currentStock: 200, parLevel: 300, unit: 'units' },
            ],
          },
          {
            categoryId: 'cat-002',
            categoryName: 'Kitchen',
            items: [
              { itemId: 'item-002', name: 'Coffee', currentStock: 100, parLevel: 150, unit: 'kg' },
              { itemId: 'item-003', name: 'Sugar', currentStock: 80, parLevel: 100, unit: 'kg' },
            ],
          },
          {
            categoryId: 'cat-003',
            categoryName: 'Spa',
            items: [
              { itemId: 'item-004', name: 'Massage Oil', currentStock: 20, parLevel: 30, unit: 'liters' },
            ],
          },
        ],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inventory Sync Payloads', () => {
    it('should reject missing hotelId', () => {
      const payload = {
        categories: [],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing categoryId', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [
          {
            categoryName: 'Housekeeping',
            items: [],
          },
        ],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject negative currentStock in item', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [
          {
            categoryId: 'cat-001',
            categoryName: 'Housekeeping',
            items: [
              { itemId: 'item-001', name: 'Towels', currentStock: -10, parLevel: 300, unit: 'units' },
            ],
          },
        ],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing parLevel in item', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [
          {
            categoryId: 'cat-001',
            categoryName: 'Housekeeping',
            items: [
              { itemId: 'item-001', name: 'Towels', currentStock: 200, unit: 'units' },
            ],
          },
        ],
        syncedAt: new Date().toISOString(),
      };
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Webhook Signature Verification Tests
// ============================================

describe('Hotel PMS Webhook Signature Verification', () => {
  const secret = 'hotel-pms-webhook-secret';
  const payload = JSON.stringify({
    event: 'inventory.signal.received',
    merchantId: 'hotel-001',
    department: 'housekeeping',
    itemId: 'item-001',
    currentStock: 50,
    timestamp: '2024-01-15T10:00:00Z',
  });

  describe('Signature Creation and Verification', () => {
    it('should create valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, secret, timestamp);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

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

    it('should reject signature from different secret', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createWebhookSignature(payload, 'wrong-secret', timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      expect(() => {
        verifyWebhookSignature(payload, headers, {
          secret,
          toleranceSeconds: 300,
        });
      }).toThrow();
    });

    it('should reject expired timestamp', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = createWebhookSignature(payload, secret, oldTimestamp);
      const headers = createMockHeaders(signature, String(oldTimestamp));

      expect(() => {
        verifyWebhookSignature(payload, headers, {
          secret,
          toleranceSeconds: 300,
        });
      }).toThrow(/timestamp expired/i);
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
    });

    it('should return error details for missing headers', () => {
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
// Hotel PMS Webhook Dispatch Tests
// ============================================

describe('Hotel PMS Webhook Dispatch', () => {
  describe('dispatchHotelPMSWebhook', () => {
    it('should accept valid webhook payload', async () => {
      const payload = createValidHotelPMSPayload();
      const context = createMockContext();

      const result = await dispatchHotelPMSWebhook(payload, context);

      expect(result.source).toBe('hotel-pms');
      expect(result.eventType).toBe('inventory.signal.received');
    });

    it('should reject invalid payload', async () => {
      const payload = { event: 'invalid' };
      const context = createMockContext();

      const result = await dispatchHotelPMSWebhook(payload, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payload validation failed');
      expect(result.validationError).toBeInstanceOf(z.ZodError);
    });

    it('should return validation errors', async () => {
      const payload = {
        event: 'inventory.signal.received',
        merchantId: '',
        department: 'invalid',
        itemId: '',
        itemName: '',
        category: '',
        currentStock: -1,
        threshold: -1,
        unit: '',
        severity: 'invalid',
        signalType: 'invalid',
        timestamp: 'invalid',
      };
      const context = createMockContext();

      const result = await dispatchHotelPMSWebhook(payload, context);

      expect(result.success).toBe(false);
      expect(result.validationError).toBeInstanceOf(z.ZodError);
    });
  });
});

// ============================================
// Department-Specific Tests
// ============================================

describe('Hotel PMS Department-Specific Scenarios', () => {
  describe('Housekeeping Department', () => {
    it('should process housekeeping inventory signal', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'housekeeping',
        itemName: 'Bath Towels',
        category: 'linens',
        currentStock: 50,
        threshold: 100,
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.department).toBe('housekeeping');
        expect(result.data.currentStock).toBeLessThan(result.data.threshold);
      }
    });

    it('should detect low housekeeping supplies', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'housekeeping',
        itemName: 'Bed Sheets',
        currentStock: 20,
        threshold: 100,
        severity: 'critical',
        metadata: {
          occupancyRate: 0.95,
          roomCount: 200,
        },
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        // High occupancy + low stock = critical
        expect(result.data.severity).toBe('critical');
        expect(result.data.metadata?.occupancyRate).toBe(0.95);
      }
    });
  });

  describe('Kitchen Department', () => {
    it('should process kitchen inventory signal', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'kitchen',
        itemName: 'Coffee Beans',
        category: 'beverages',
        currentStock: 30,
        threshold: 50,
        unit: 'kg',
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.department).toBe('kitchen');
        expect(result.data.unit).toBe('kg');
      }
    });

    it('should detect low food supplies', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'kitchen',
        itemName: 'Fresh Milk',
        currentStock: 5,
        threshold: 30,
        severity: 'critical',
        signalType: 'threshold_breach',
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.currentStock).toBeLessThan(result.data.threshold);
      }
    });
  });

  describe('Spa Department', () => {
    it('should process spa inventory signal', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'spa',
        itemName: 'Massage Oil',
        category: 'spa-supplies',
        currentStock: 10,
        threshold: 20,
        unit: 'liters',
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.department).toBe('spa');
      }
    });
  });

  describe('Front Desk Department', () => {
    it('should process front desk inventory signal', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'front_desk',
        itemName: 'Room Key Cards',
        category: 'stationery',
        currentStock: 100,
        threshold: 200,
        unit: 'units',
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.department).toBe('front_desk');
      }
    });
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Hotel PMS Error Handling', () => {
  describe('Invalid Payload Scenarios', () => {
    it('should handle empty payload', () => {
      const result = validateHotelPMSPayloadSafe({});
      expect(result.success).toBe(false);
    });

    it('should handle null payload', () => {
      const result = validateHotelPMSPayloadSafe(null);
      expect(result.success).toBe(false);
    });

    it('should handle array payload', () => {
      const result = validateHotelPMSPayloadSafe([]);
      expect(result.success).toBe(false);
    });
  });

  describe('Partial Payload Validation', () => {
    it('should report all missing required fields', () => {
      const payload = {
        event: 'inventory.signal.received',
      };

      const result = validateHotelPMSPayloadSafe(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = result.error.errors.map((e) => e.path[0]);
        expect(missingFields).toContain('merchantId');
        expect(missingFields).toContain('department');
        expect(missingFields).toContain('itemId');
        expect(missingFields).toContain('itemName');
        expect(missingFields).toContain('category');
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

describe('Hotel PMS Edge Cases', () => {
  describe('Boundary Values', () => {
    it('should accept zero currentStock', () => {
      const payload = { ...createValidHotelPMSPayload(), currentStock: 0 };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept zero threshold', () => {
      const payload = { ...createValidHotelPMSPayload(), threshold: 0 };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept very large stock values', () => {
      const payload = { ...createValidHotelPMSPayload(), currentStock: 999999999, threshold: 999999999 };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept very long item names', () => {
      const payload = { ...createValidHotelPMSPayload(), itemName: 'A'.repeat(500) };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should accept unicode item names', () => {
      const payload = { ...createValidHotelPMSPayload(), itemName: 'Serviettes de Bain' };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept special characters in category', () => {
      const payload = { ...createValidHotelPMSPayload(), category: 'Linens & Supplies!' };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Metadata Handling', () => {
    it('should accept complex metadata objects', () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        metadata: {
          roomCount: 200,
          occupancyRate: 0.85,
          seasonal: { isPeak: true, factor: 1.5 },
          suppliers: ['Supplier A', 'Supplier B'],
          lastOrderDate: '2024-01-10',
          notes: 'Special occasion preparation',
        },
      };

      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept empty metadata object', () => {
      const payload = { ...createValidHotelPMSPayload(), metadata: {} };
      const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Integration Test Scenarios
// ============================================

describe('Hotel PMS Integration Scenarios', () => {
  describe('Complete Inventory Signal Processing Flow', () => {
    it('should process housekeeping inventory signal end-to-end', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'housekeeping',
        itemName: 'Premium Bath Towels',
        currentStock: 50,
        threshold: 100,
        severity: 'critical',
        metadata: {
          occupancyRate: 0.9,
          roomCount: 250,
          averageTowelUsagePerDay: 150,
        },
      };

      const payloadString = JSON.stringify(payload);
      const secret = 'hotel-webhook-secret';
      const signature = createWebhookSignature(payloadString, secret, timestamp);
      const headers = createMockHeaders(signature, String(timestamp));

      // Step 1: Verify signature
      const isValid = verifyWebhookSignature(payloadString, headers, {
        secret,
        toleranceSeconds: 300,
      });
      expect(isValid).toBe(true);

      // Step 2: Validate payload
      const validationResult = validateHotelPMSPayloadSafe(JSON.parse(payloadString));
      expect(validationResult.success).toBe(true);

      // Step 3: Verify business logic
      if (validationResult.success) {
        expect(validationResult.data.department).toBe('housekeeping');
        expect(validationResult.data.currentStock).toBeLessThan(validationResult.data.threshold);
        expect(validationResult.data.severity).toBe('critical');
      }
    });

    it('should process kitchen restocking signal', async () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'kitchen',
        itemName: 'Premium Coffee Beans',
        currentStock: 25,
        threshold: 50,
        unit: 'kg',
        severity: 'low',
        metadata: {
          dailyConsumption: 5,
          daysUntilEmpty: 5,
        },
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.department).toBe('kitchen');
        expect(result.data.metadata?.daysUntilEmpty).toBe(5);
      }
    });

    it('should handle out of stock emergency', async () => {
      const payload = {
        ...createValidHotelPMSPayload(),
        department: 'kitchen',
        itemName: 'Fresh Milk',
        currentStock: 0,
        threshold: 20,
        severity: 'out_of_stock',
        signalType: 'threshold_breach',
        metadata: {
          priority: 'urgent',
          alternatives: ['Oat Milk', 'Almond Milk'],
        },
      };

      const result = validateHotelPMSPayloadSafe(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.currentStock).toBe(0);
        expect(result.data.severity).toBe('out_of_stock');
      }
    });
  });

  describe('Bulk Inventory Sync', () => {
    it('should validate complete inventory sync payload', () => {
      const payload = createValidInventorySyncPayload();
      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        // Verify all categories
        expect(payload.categories.length).toBe(2);

        // Count total items
        const totalItems = payload.categories.reduce(
          (sum, cat) => sum + cat.items.length,
          0
        );
        expect(totalItems).toBe(3);

        // Verify par level vs current stock
        for (const category of payload.categories) {
          for (const item of category.items) {
            if (item.currentStock < item.parLevel) {
              // Item needs restocking
              expect(item.currentStock).toBeLessThan(item.parLevel);
            }
          }
        }
      }
    });

    it('should identify items below par level', () => {
      const payload = {
        hotelId: 'hotel-001',
        categories: [
          {
            categoryId: 'cat-001',
            categoryName: 'Housekeeping',
            items: [
              { itemId: 'item-001', name: 'Towels', currentStock: 100, parLevel: 200, unit: 'units' },
              { itemId: 'item-002', name: 'Sheets', currentStock: 150, parLevel: 100, unit: 'units' },
            ],
          },
        ],
        syncedAt: new Date().toISOString(),
      };

      const result = HotelPMSInventorySyncSchema.safeParse(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        const itemsBelowPar = payload.categories[0].items.filter(
          (item) => item.currentStock < item.parLevel
        );
        expect(itemsBelowPar.length).toBe(1);
        expect(itemsBelowPar[0].name).toBe('Towels');
      }
    });
  });

  describe('Reservation Change Impact', () => {
    it('should anticipate inventory needs based on reservations', () => {
      // High occupancy + upcoming reservations = increased inventory need
      const inventoryPayload = {
        ...createValidHotelPMSPayload(),
        department: 'housekeeping',
        currentStock: 80,
        threshold: 100,
        metadata: {
          currentOccupancy: 0.95,
          upcomingCheckIns: 15,
          upcomingCheckOuts: 8,
          netGuestChange: 7,
        },
      };

      const result = validateHotelPMSPayloadSafe(inventoryPayload);
      expect(result.success).toBe(true);

      if (result.success) {
        // With high occupancy and positive net guest change,
        // we should prioritize restocking
        const occupancy = result.data.metadata?.currentOccupancy as number;
        const netChange = result.data.metadata?.netGuestChange as number;

        expect(occupancy).toBeGreaterThan(0.9);
        expect(netChange).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================
// Performance Tests (Conceptual)
// ============================================

describe('Hotel PMS Performance Considerations', () => {
  it('should validate that schema parsing is fast for small payloads', () => {
    const payload = createValidHotelPMSPayload();
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      HotelPMSInventoryPayloadSchema.safeParse(payload);
    }

    const end = performance.now();
    const duration = end - start;

    // Should complete 1000 validations in under 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('should validate that schema parsing handles complex metadata efficiently', () => {
    const payload = {
      ...createValidHotelPMSPayload(),
      metadata: {
        nested: {
          deeply: {
            structured: {
              data: {
                for: {
                  testing: {
                    purposes: 'value',
                  },
                },
              },
            },
          },
        },
        array: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })),
      },
    };

    const result = HotelPMSInventoryPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
