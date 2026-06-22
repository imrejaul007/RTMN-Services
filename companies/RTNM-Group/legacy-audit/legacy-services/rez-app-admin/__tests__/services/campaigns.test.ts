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
const mockPut = apiClient.put as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

let campaignsService: any;
beforeAll(async () => {
  campaignsService = (await import('../../services/api/campaigns')).default;
});

describe('CampaignsService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getCampaigns returns paginated list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { campaigns: [{ _id: 'c1', name: 'Summer Sale' }], pagination: {} },
    });
    const result = await campaignsService.getCampaigns({});
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('admin/campaigns'));
  });

  it('getStats returns campaign KPIs', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { total: 20, active: 5, totalRedemptions: 1500 },
    });
    const result = await campaignsService.getStats();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('stats'));
  });

  it('getCampaignById fetches single campaign', async () => {
    mockGet.mockResolvedValue({ success: true, data: { _id: 'c1', name: 'Summer Sale' } });
    await campaignsService.getCampaignById('c1');
    expect(mockGet).toHaveBeenCalledWith('admin/campaigns/c1');
  });

  it('createCampaign sends campaign data', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 'c2', name: 'New Campaign' } });
    await campaignsService.createCampaign({ name: 'New Campaign', type: 'discount' });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('campaigns'),
      expect.objectContaining({ name: 'New Campaign' })
    );
  });

  it('updateCampaign sends partial update', async () => {
    mockPut.mockResolvedValue({ success: true, data: { _id: 'c1', name: 'Updated' } });
    await campaignsService.updateCampaign('c1', { name: 'Updated' });
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('c1'),
      expect.objectContaining({ name: 'Updated' })
    );
  });

  it('deleteCampaign removes campaign', async () => {
    mockDelete.mockResolvedValue({ success: true });
    await campaignsService.deleteCampaign('c1');
    expect(mockDelete).toHaveBeenCalledWith('admin/campaigns/c1');
  });

  it('toggleCampaign switches active state', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { isActive: false } });
    const result = await campaignsService.toggleCampaign('c1');
    expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining('c1'));
  });

  it('duplicateCampaign copies campaign', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 'c3', name: 'Summer Sale (Copy)' } });
    await campaignsService.duplicateCampaign('c1');
    expect(mockPost).toHaveBeenCalledWith(expect.stringContaining('c1'));
  });
});
