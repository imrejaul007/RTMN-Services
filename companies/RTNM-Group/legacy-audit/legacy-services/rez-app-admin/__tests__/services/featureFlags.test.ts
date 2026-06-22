const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../services/api/apiClient', () => ({
  __esModule: true,
  default: mockClient,
  apiClient: mockClient,
}));

let featureFlagsService: any;
beforeAll(async () => {
  featureFlagsService = (await import('../../services/api/featureFlags')).featureFlagsService;
});

describe('FeatureFlagsService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listFlags returns all flags', async () => {
    mockClient.get.mockResolvedValue({
      success: true,
      data: { flags: [{ key: 'dark_mode', enabled: true }] },
    });
    const result = await featureFlagsService.listFlags();
    expect(mockClient.get).toHaveBeenCalledWith('/admin/feature-flags');
  });

  it('listFlags with group filter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { flags: [] } });
    await featureFlagsService.listFlags('ui');
    expect(mockClient.get).toHaveBeenCalledWith('/admin/feature-flags?group=ui');
  });

  it('getFlag fetches flags list', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { flags: [{ key: 'dark_mode' }] } });
    await featureFlagsService.getFlag('dark_mode');
    expect(mockClient.get).toHaveBeenCalledWith('/admin/feature-flags');
  });

  it('createFlag creates new flag', async () => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { key: 'new_feature', enabled: false },
    });
    await featureFlagsService.createFlag({ key: 'new_feature', enabled: false });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/admin/feature-flags',
      expect.objectContaining({ key: 'new_feature' })
    );
  });

  it('toggleFlag patches enabled state', async () => {
    mockClient.patch.mockResolvedValue({
      success: true,
      data: { key: 'dark_mode', enabled: false },
    });
    await featureFlagsService.toggleFlag('dark_mode', false);
    expect(mockClient.patch).toHaveBeenCalledWith('/admin/feature-flags/dark_mode', {
      enabled: false,
    });
  });

  it('deleteFlag disables flag via patch', async () => {
    mockClient.patch.mockResolvedValue({ success: true });
    await featureFlagsService.deleteFlag('old_feature');
    expect(mockClient.patch).toHaveBeenCalledWith('/admin/feature-flags/old_feature', {
      enabled: false,
    });
  });
});
