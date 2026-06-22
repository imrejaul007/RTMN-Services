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

let storesService: any;
beforeAll(async () => {
  storesService = (await import('../../services/api/stores')).default;
});

describe('StoresService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getStores returns list', async () => {
    mockGet.mockResolvedValue({ success: true, data: { stores: [{ _id: 's1', name: 'Cafe' }] } });
    const result = await storesService.getStores({});
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('admin/stores'));
  });

  it('getStore fetches by ID', async () => {
    mockGet.mockResolvedValue({ success: true, data: { store: { _id: 's1' } } });
    const result = await storesService.getStore('s1');
    expect(mockGet).toHaveBeenCalledWith('admin/stores/s1');
  });

  it('reassignCategory updates category', async () => {
    mockPut.mockResolvedValue({ success: true, data: { store: { _id: 's1', category: 'cafe' } } });
    const result = await storesService.reassignCategory('s1', 'cat1');
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('s1'),
      expect.objectContaining({ categoryId: 'cat1' })
    );
  });

  it('bulkReassignCategory updates multiple stores', async () => {
    mockPost.mockResolvedValue({ success: true, data: { count: 3 } });
    const result = await storesService.bulkReassignCategory(['s1', 's2', 's3'], 'cat2');
    expect(mockPost).toHaveBeenCalledWith(
      'admin/stores/bulk-category',
      expect.objectContaining({ storeIds: ['s1', 's2', 's3'] })
    );
  });

  it('throws on failure', async () => {
    mockGet.mockResolvedValue({ success: false, message: 'Store not found' });
    await expect(storesService.getStore('missing')).rejects.toThrow();
  });
});
