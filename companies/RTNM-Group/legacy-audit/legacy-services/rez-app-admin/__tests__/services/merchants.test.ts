/**
 * Admin Merchants Service — Smoke Tests
 *
 * Validates: merchant listing, approval/rejection, status changes,
 * and error handling.
 */

jest.mock('../../services/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '../../services/api/apiClient';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

let merchantsService: any;
beforeAll(async () => {
  merchantsService = await import('../../services/api/merchants');
});

const MOCK_MERCHANT = {
  _id: 'm1',
  userId: 'u1',
  businessName: 'Test Cafe',
  businessType: 'restaurant',
  email: 'cafe@test.com',
  phoneNumber: '+919876543210',
  status: 'pending',
  verificationStatus: 'pending',
  stores: [{ _id: 's1', name: 'Main Branch', status: 'active' }],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('MerchantsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMerchants', () => {
    it('fetches merchant list with pagination', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          merchants: [MOCK_MERCHANT],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      });

      const result = await merchantsService.default.getMerchants();
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('admin/merchants'));
      expect(result.merchants).toBeDefined();
    });
  });

  describe('getMerchant', () => {
    it('fetches single merchant', async () => {
      mockGet.mockResolvedValue({ success: true, data: MOCK_MERCHANT });

      const result = await merchantsService.default.getMerchant('m1');
      expect(mockGet).toHaveBeenCalledWith('admin/merchants/m1');
      expect(result._id).toBe('m1');
    });

    it('throws on not found', async () => {
      mockGet.mockResolvedValue({ success: false, message: 'Merchant not found' });
      await expect(merchantsService.default.getMerchant('missing')).rejects.toThrow(
        'Merchant not found'
      );
    });
  });

  describe('approveMerchant', () => {
    it('approves a pending merchant', async () => {
      mockPost.mockResolvedValue({ success: true, message: 'Merchant approved' });

      const result = await merchantsService.default.approveMerchant('m1');
      expect(mockPost).toHaveBeenCalledWith('admin/merchants/m1/approve');
      expect(result.success).toBe(true);
    });
  });

  describe('rejectMerchant', () => {
    it('rejects with reason', async () => {
      mockPost.mockResolvedValue({ success: true, message: 'Merchant rejected' });

      const result = await merchantsService.default.rejectMerchant('m1', 'Incomplete documents');
      expect(mockPost).toHaveBeenCalledWith('admin/merchants/m1/reject', {
        reason: 'Incomplete documents',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('suspendMerchant', () => {
    it('suspends an active merchant', async () => {
      mockPost.mockResolvedValue({ success: true, message: 'Merchant suspended' });

      const result = await merchantsService.default.suspendMerchant('m1', 'Policy violation');
      expect(mockPost).toHaveBeenCalledWith('admin/merchants/m1/suspend', {
        reason: 'Policy violation',
      });
      expect(result.success).toBe(true);
    });
  });
});
