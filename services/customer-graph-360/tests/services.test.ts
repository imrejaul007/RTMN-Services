import { CustomerService } from '../src/services/customer.service';
import { Customer360Model } from '../src/models/customer360.model';

// Mock the dependencies
jest.mock('../src/models/customer360.model');
jest.mock('../src/config/index', () => ({
  config: {
    port: 4808,
    nodeEnv: 'test',
    mongodbUri: 'mongodb://localhost:27017/test',
    redisUrl: 'redis://localhost:6379',
    jwtSecret: 'test-secret',
    logLevel: 'error',
    services: {
      rabtul: 'http://localhost:4002',
      buzzlocal: 'http://localhost:4500',
      airzy: 'http://localhost:4505',
      rezMenuQr: 'http://localhost:3014',
      rezNow: 'http://localhost:3000',
      risaCare: 'http://localhost:4600',
    },
    features: {
      enableCache: false,
      enableMetrics: false,
      enableSync: true,
    },
    cache: {
      ttl: 3600,
      keyPrefix: 'cg360:',
    },
    sync: {
      interval: 60,
      batchSize: 100,
    },
  },
}));

jest.mock('axios');
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CustomerService', () => {
  let customerService: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    customerService = new CustomerService();
  });

  describe('getOrCreateCustomer', () => {
    it('should return existing customer if found', async () => {
      const mockCustomer = {
        userId: 'user123',
        identity: {
          userId: 'user123',
          email: 'test@example.com',
          alternateIds: [],
          linkedAccounts: [],
        },
        profile: {
          demographics: {
            location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
          },
        },
        toObject: () => ({
          userId: 'user123',
          identity: {
            userId: 'user123',
            email: 'test@example.com',
            alternateIds: [],
            linkedAccounts: [],
          },
          profile: {
            demographics: {
              location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            },
          },
        }),
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.getOrCreateCustomer('user123');

      expect(Customer360Model.findByUserId).toHaveBeenCalledWith('user123');
      expect(result.userId).toBe('user123');
      expect(result.identity.email).toBe('test@example.com');
    });

    it('should create new customer if not found', async () => {
      const mockNewCustomer = {
        userId: 'newuser',
        identity: {
          userId: 'newuser',
          alternateIds: [],
          linkedAccounts: [],
        },
        profile: {
          demographics: {
            location: { city: 'Unknown', state: 'Unknown', country: 'India' },
          },
        },
        toObject: () => ({
          userId: 'newuser',
          identity: {
            userId: 'newuser',
            alternateIds: [],
            linkedAccounts: [],
          },
          profile: {
            demographics: {
              location: { city: 'Unknown', state: 'Unknown', country: 'India' },
            },
          },
        }),
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(null);
      (Customer360Model.create as jest.Mock).mockResolvedValue(mockNewCustomer);

      const result = await customerService.getOrCreateCustomer('newuser');

      expect(Customer360Model.create).toHaveBeenCalled();
      expect(result.userId).toBe('newuser');
    });
  });

  describe('getCustomer360', () => {
    it('should return customer if found', async () => {
      const mockCustomer = {
        userId: 'user123',
        toObject: () => ({
          userId: 'user123',
          identity: {
            userId: 'user123',
            alternateIds: [],
            linkedAccounts: [],
          },
          profile: {
            demographics: {
              location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            },
          },
        }),
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.getCustomer360('user123');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
    });

    it('should return null if customer not found', async () => {
      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await customerService.getCustomer360('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getInteractions', () => {
    it('should return touchpoints', async () => {
      const mockCustomer = {
        interactions: {
          touchpoints: [
            { app: 'buzzlocal', firstSeen: new Date(), lastSeen: new Date(), sessionCount: 10 },
            { app: 'airzy', firstSeen: new Date(), lastSeen: new Date(), sessionCount: 5 },
          ],
        },
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.getInteractions('user123');

      expect(result).toHaveLength(2);
      expect(result[0].app).toBe('buzzlocal');
      expect(result[1].app).toBe('airzy');
    });

    it('should return empty array if no customer', async () => {
      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await customerService.getInteractions('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getPreferences', () => {
    it('should return preferences', async () => {
      const mockCustomer = {
        preferences: {
          channels: ['push', 'email'],
          language: 'en',
          notificationSettings: { marketing: true },
          priceRange: { min: 100, max: 5000 },
          brands: ['Nike'],
        },
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.getPreferences('user123');

      expect(result).not.toBeNull();
      expect(result?.channels).toEqual(['push', 'email']);
    });
  });

  describe('getSegments', () => {
    it('should return segments', async () => {
      const mockCustomer = {
        segments: {
          current: ['high-value', 'premium'],
          historical: [
            { segment: 'new-user', from: new Date('2024-01-01'), to: new Date('2024-06-01') },
          ],
        },
      };

      (Customer360Model.findByUserId as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.getSegments('user123');

      expect(result).not.toBeNull();
      expect(result?.current).toContain('high-value');
      expect(result?.historical).toHaveLength(1);
    });
  });
});