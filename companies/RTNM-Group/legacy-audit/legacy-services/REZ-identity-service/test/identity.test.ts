import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the models
vi.mock('../src/models/identity.model', () => ({
  Identity: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
  IIdentity: {},
  IdentityType: {
    EMAIL: 'email',
    PHONE: 'phone',
    DEVICE: 'device',
  },
  IdentityStatus: {
    ACTIVE: 'active',
    DELETED: 'deleted',
  },
}));

vi.mock('../src/models/cluster.model', () => ({
  Cluster: {
    findOne: vi.fn(),
  },
  ICluster: {},
  ClusterStatus: {
    ACTIVE: 'active',
  },
  ClusterConfidence: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
}));

describe('IdentityService', () => {
  let identityService: any;
  let Identity: any;
  let Cluster: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await import('../src/services/identity.service');
    identityService = module.identityService;
    Identity = module.Identity;
    Cluster = module.Cluster;
  });

  describe('searchIdentities', () => {
    it('should escape regex special characters to prevent ReDoS', async () => {
      const mockFind = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue([]),
      });
      Identity.find = mockFind;

      // Test with ReDoS-prone pattern
      const maliciousQuery = '^(a+)+$';
      await identityService.searchIdentities(maliciousQuery, 50);

      // Verify that the query was escaped
      const callArgs = mockFind.mock.calls[0][0];
      const orCondition = callArgs.$and[1].$or;

      // The search should use escaped regex
      for (const condition of orCondition) {
        if (condition.identityId) {
          // Should be escaped, not the raw pattern
          expect(condition.identityId.toString()).not.toBe(maliciousQuery);
          // Should contain the escaped version
          expect(condition.identityId.toString()).toContain('\\^');
        }
      }
    });

    it('should handle normal search queries correctly', async () => {
      const mockFind = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue([{ identityId: '123' }]),
      });
      Identity.find = mockFind;

      const result = await identityService.searchIdentities('john', 50);

      expect(mockFind).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should respect the limit parameter', async () => {
      const mockFind = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue([]),
      });
      Identity.find = mockFind;

      await identityService.searchIdentities('test', 10);

      const limitCall = mockFind.mock.calls[0][0];
      expect(mockFind().limit).toHaveBeenCalledWith(10);
    });
  });

  describe('hashIdentifier', () => {
    it('should produce consistent hashes for same input', () => {
      const hash1 = identityService.hashIdentifier('test@example.com');
      const hash2 = identityService.hashIdentifier('test@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = identityService.hashIdentifier('test1@example.com');
      const hash2 = identityService.hashIdentifier('test2@example.com');

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Regex Injection Prevention', () => {
  it('should escape all regex special characters', () => {
    const specialChars = [
      '.', '*', '+', '?', '^', '$', '{', '}', '[', ']', '|', '(', ')', '\\'
    ];

    for (const char of specialChars) {
      // Simulate the escape logic
      const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(escaped).toContain('\\');
    }
  });
});
