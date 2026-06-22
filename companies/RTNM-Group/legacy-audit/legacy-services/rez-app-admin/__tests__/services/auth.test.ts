jest.mock('../../services/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../services/storage', () => ({
  storageService: {
    getAuthToken: jest.fn().mockResolvedValue('test-token'),
    setAuthToken: jest.fn().mockResolvedValue(undefined),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    setUserData: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    getUserData: jest
      .fn()
      .mockResolvedValue({ id: 'a1', email: 'admin@rez.money', role: 'superadmin' }),
  },
  COOKIE_AUTH_ENABLED: false,
}));

import { apiClient } from '../../services/api/apiClient';
import { storageService } from '../../services/storage';
const mockPost = apiClient.post as jest.Mock;
const mockGet = apiClient.get as jest.Mock;

let authService: any;
beforeAll(async () => {
  authService = (await import('../../services/api/auth')).authService;
});

describe('AuthService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login stores token on success', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        token: 'admin-token',
        refreshToken: 'refresh',
        user: { id: 'a1', role: 'superadmin' },
      },
    });
    const result = await authService.login('admin@rez.money', 'password123');
    expect(mockPost).toHaveBeenCalledWith(
      'admin/auth/login',
      expect.objectContaining({ email: 'admin@rez.money' })
    );
    expect(storageService.setAuthToken).toHaveBeenCalledWith('admin-token');
    expect(result.success).toBe(true);
  });

  it('login with TOTP passes code', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { token: 'admin-token', user: { id: 'a1' } },
    });
    await authService.login('admin@rez.money', 'password123', '123456');
    expect(mockPost).toHaveBeenCalledWith(
      'admin/auth/login',
      expect.objectContaining({ totpCode: '123456' })
    );
  });

  it('login returns failure on invalid credentials', async () => {
    mockPost.mockResolvedValue({ success: false, message: 'Invalid credentials' });
    const result = await authService.login('bad@email.com', 'wrong');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid credentials');
  });

  it('logout clears storage', async () => {
    mockPost.mockResolvedValue({ success: true });
    await authService.logout();
    expect(storageService.logout).toHaveBeenCalled();
  });

  it('getCurrentUser returns user from storage', async () => {
    const user = await authService.getCurrentUser();
    expect(user).toEqual(expect.objectContaining({ email: 'admin@rez.money' }));
  });

  it('getToken returns token from storage', async () => {
    const token = await authService.getToken();
    expect(token).toBe('test-token');
  });
});
