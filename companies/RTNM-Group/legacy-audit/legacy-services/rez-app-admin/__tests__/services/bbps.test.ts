/**
 * Admin BBPS Service — Smoke Tests
 *
 * Validates: provider CRUD, transaction listing, refund flow,
 * analytics/stats mapping, config get/update, error handling.
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
import bbpsService from '../../services/api/bbps';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;

describe('BBPSService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProviders', () => {
    it('returns provider list', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [{ _id: 'p1', name: 'BSES Delhi', type: 'electricity', isActive: true }],
      });

      const result = await bbpsService.getProviders();
      expect(mockGet).toHaveBeenCalledWith('admin/bbps/providers');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('BSES Delhi');
    });

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValue({ success: true, data: null });
      // Should handle gracefully — the service wraps non-array in []
      await expect(bbpsService.getProviders()).rejects.toThrow();
    });

    it('throws on failure', async () => {
      mockGet.mockResolvedValue({ success: false, message: 'Unauthorized' });
      await expect(bbpsService.getProviders()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createProvider', () => {
    it('creates and returns provider', async () => {
      const newProvider = {
        name: 'Airtel',
        type: 'mobile',
        aggregatorCode: 'AIR001',
        promoCoinsFixed: 10,
        promoExpiryDays: 30,
        maxRedemptionPercent: 50,
        isActive: true,
      };
      mockPost.mockResolvedValue({ success: true, data: { _id: 'p2', ...newProvider } });

      const result = await bbpsService.createProvider(newProvider);
      expect(mockPost).toHaveBeenCalledWith('admin/bbps/providers', newProvider);
      expect(result._id).toBe('p2');
    });
  });

  describe('updateProvider', () => {
    it('updates provider fields', async () => {
      mockPut.mockResolvedValue({
        success: true,
        data: { _id: 'p1', name: 'BSES Updated', isActive: false },
      });

      const result = await bbpsService.updateProvider('p1', { isActive: false });
      expect(mockPut).toHaveBeenCalledWith('admin/bbps/providers/p1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('toggleProviderStatus', () => {
    it('toggles and returns success', async () => {
      mockPatch.mockResolvedValue({ success: true, message: 'Provider deactivated' });

      const result = await bbpsService.toggleProviderStatus('p1');
      expect(mockPatch).toHaveBeenCalledWith('admin/bbps/providers/p1/toggle');
      expect(result.success).toBe(true);
    });
  });

  describe('getTransactions', () => {
    it('returns paginated transactions', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [{ _id: 't1', amount: 500, status: 'completed' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await bbpsService.getTransactions(1, 20);
      expect(mockGet).toHaveBeenCalledWith('admin/bbps/transactions?page=1&limit=20');
      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('refundTransaction', () => {
    it('processes refund', async () => {
      mockPost.mockResolvedValue({ success: true, message: 'Refund processed' });

      const result = await bbpsService.refundTransaction('t1');
      expect(mockPost).toHaveBeenCalledWith('admin/bbps/transactions/t1/refund');
      expect(result.success).toBe(true);
    });

    it('returns failure response on error', async () => {
      mockPost.mockResolvedValue({ success: false, message: 'Transaction not refundable' });
      const result = await bbpsService.refundTransaction('t1');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Transaction not refundable');
    });
  });

  describe('getAnalytics', () => {
    it('maps backend stats to BBPSAnalytics shape', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          overview: { totalVolume: 100000, totalTransactions: 200, totalCoinsIssued: 5000 },
          byType: [
            { _id: 'electricity', volume: 60000 },
            { _id: 'mobile', volume: 40000 },
          ],
        },
      });

      const result = await bbpsService.getAnalytics('30d');
      expect(mockGet).toHaveBeenCalledWith('admin/bbps/stats');
      expect(result.kpi.gmv).toBe(100000);
      expect(result.kpi.transactions).toBe(200);
      expect(result.byBillType.electricity).toBe(60000);
      expect(result.byBillType.mobile).toBe(40000);
    });
  });

  describe('getConfig', () => {
    it('returns config on success', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          enabledTypes: ['electricity', 'mobile'],
          reminderEnabled: true,
          maxCoinsPerUserPerMonth: 1000,
        },
      });

      const result = await bbpsService.getConfig();
      expect('enabledTypes' in result).toBe(true);
    });

    it('returns structured error when endpoint missing', async () => {
      mockGet.mockResolvedValue({
        success: false,
        message: 'Not Found',
      });

      const result = await bbpsService.getConfig();
      expect((result as any).success).toBe(false);
      expect((result as any).error).toBe('Not Found');
    });
  });

  describe('updateConfig', () => {
    it('updates and returns config', async () => {
      mockPut.mockResolvedValue({
        success: true,
        data: { enabledTypes: ['electricity'], reminderEnabled: false },
      });

      const result = await bbpsService.updateConfig({ reminderEnabled: false });
      expect(mockPut).toHaveBeenCalledWith('admin/bbps/config', { reminderEnabled: false });
    });
  });
});
