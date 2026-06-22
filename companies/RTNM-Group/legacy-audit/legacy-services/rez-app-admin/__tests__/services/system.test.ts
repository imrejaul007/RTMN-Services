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

let systemService: any;
beforeAll(async () => {
  systemService = (await import('../../services/api/system')).default;
});

describe('SystemService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getHealth returns system health', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { database: 'connected', redis: 'connected', uptime: 86400, memory: { used: 512 } },
    });
    const result = await systemService.getHealth();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('health'));
  });

  it('getReconciliation returns reconciliation data', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { totalOrders: 1000, reconciled: 990, discrepancies: 10 },
    });
    const result = await systemService.getReconciliation();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('reconciliation'));
  });

  it('triggerReconciliation starts reconciliation', async () => {
    mockPost.mockResolvedValue({ success: true, data: { status: 'started' } });
    const result = await systemService.triggerReconciliation();
    expect(mockPost).toHaveBeenCalledWith(expect.stringContaining('reconciliation'));
  });

  it('getJobs returns scheduled jobs', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [{ name: 'cashback-processing', schedule: '*/5 * * * *', lastRun: '2024-06-01' }],
    });
    const result = await systemService.getJobs();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('jobs'));
  });

  it('throws on health check failure', async () => {
    mockGet.mockResolvedValue({ success: false, message: 'Service unavailable' });
    await expect(systemService.getHealth()).rejects.toThrow();
  });
});
