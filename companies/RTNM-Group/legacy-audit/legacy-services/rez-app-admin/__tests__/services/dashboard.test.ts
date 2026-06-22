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

let dashboardService: any;
beforeAll(async () => {
  dashboardService = (await import('../../services/api/dashboard')).default;
});

describe('DashboardService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getStats returns dashboard KPIs', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { totalUsers: 5000, totalOrders: 1200, revenue: 500000 },
    });
    const result = await dashboardService.getStats();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('admin/dashboard'));
  });

  it('getRecentActivity returns activity list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { recentOrders: [{ orderNumber: '001', status: 'placed' }], recentCoinAwards: [] },
    });
    const result = await dashboardService.getRecentActivity(10);
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('activity'));
    expect(result.recentOrders).toHaveLength(1);
  });

  it('throws on failure', async () => {
    mockGet.mockResolvedValue({ success: false, message: 'Server error' });
    await expect(dashboardService.getStats()).rejects.toThrow();
  });
});
