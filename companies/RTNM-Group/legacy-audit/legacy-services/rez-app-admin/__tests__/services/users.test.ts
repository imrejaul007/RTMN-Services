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

let usersService: any;
beforeAll(async () => {
  usersService = (await import('../../services/api/users')).default;
});

describe('UsersService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getUsers returns paginated list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { users: [{ _id: 'u1' }], pagination: { total: 1 } },
    });
    const result = await usersService.getUsers({ page: 1, limit: 20 });
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('admin/users'));
  });

  it('getUsers passes search filter', async () => {
    mockGet.mockResolvedValue({ success: true, data: { users: [], pagination: { total: 0 } } });
    await usersService.getUsers({ search: 'john' });
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=john'));
  });

  it('getUser fetches single user', async () => {
    mockGet.mockResolvedValue({ success: true, data: { _id: 'u1', email: 'john@test.com' } });
    const result = await usersService.getUser('u1');
    expect(mockGet).toHaveBeenCalledWith('admin/users/u1');
  });

  it('getUserWallet returns wallet data', async () => {
    mockGet.mockResolvedValue({ success: true, data: { balance: 1000, coins: 500 } });
    const result = await usersService.getUserWallet('u1');
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('u1'));
  });

  it('suspendUser sends reason', async () => {
    mockPost.mockResolvedValue({ success: true, message: 'User suspended' });
    const result = await usersService.suspendUser('u1', 'Fraud detected');
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('suspend'),
      expect.objectContaining({ reason: 'Fraud detected' })
    );
  });

  it('unsuspendUser reactivates user', async () => {
    mockPost.mockResolvedValue({ success: true, message: 'User unsuspended' });
    const result = await usersService.unsuspendUser('u1');
    expect(mockPost).toHaveBeenCalledWith(expect.stringContaining('unsuspend'));
  });

  it('throws on not found', async () => {
    mockGet.mockResolvedValue({ success: false, message: 'User not found' });
    await expect(usersService.getUser('missing')).rejects.toThrow('User not found');
  });
});
