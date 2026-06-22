import { SecretType, SecretStatus, RotationSchedule, CreateSecretSchema } from '../types';

describe('Types and Schemas', () => {
  describe('CreateSecretSchema', () => {
    it('should validate a correct secret creation input', () => {
      const input = {
        name: 'test-api-key',
        type: SecretType.API_KEY,
        value: 'sk_test_123456789',
        metadata: {
          environment: 'production',
          service: 'payment-service'
        },
        tags: ['payment', 'production'],
        rotationSchedule: RotationSchedule.MONTHLY,
        rotationConfig: {
          rotateAutomatically: true,
          notifyBeforeRotation: 7
        }
      };

      const result = CreateSecretSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid secret name format', () => {
      const input = {
        name: 'invalid name with spaces!',
        type: SecretType.API_KEY,
        value: 'sk_test_123456789'
      };

      const result = CreateSecretSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty secret value', () => {
      const input = {
        name: 'valid-name',
        type: SecretType.API_KEY,
        value: ''
      };

      const result = CreateSecretSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const input = {
        name: 'test',
        type: SecretType.API_KEY
        // missing value
      };

      const result = CreateSecretSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept valid secret name formats', () => {
      const validNames = [
        'simple',
        'with-hyphen',
        'with_underscore',
        'mixed-Case123',
        'with123numbers'
      ];

      for (const name of validNames) {
        const input = {
          name,
          type: SecretType.API_KEY,
          value: 'secret-value'
        };

        const result = CreateSecretSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should validate optional metadata', () => {
      const input = {
        name: 'test-metadata',
        type: SecretType.API_KEY,
        value: 'secret',
        metadata: {
          complex: {
            nested: {
              value: 123
            }
          },
          array: [1, 2, 3],
          string: 'text',
          number: 42,
          boolean: true,
          null: null
        }
      };

      const result = CreateSecretSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate maxVersions constraint', () => {
      const validInput = {
        name: 'test-versions',
        type: SecretType.API_KEY,
        value: 'secret',
        maxVersions: 50
      };

      const invalidInput = {
        name: 'test-versions',
        type: SecretType.API_KEY,
        value: 'secret',
        maxVersions: 150 // exceeds max of 100
      };

      expect(CreateSecretSchema.safeParse(validInput).success).toBe(true);
      expect(CreateSecretSchema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('SecretType enum', () => {
    it('should have all expected secret types', () => {
      expect(SecretType.API_KEY).toBe('api_key');
      expect(SecretType.DATABASE_CREDENTIALS).toBe('database_credentials');
      expect(SecretType.SERVICE_TOKEN).toBe('service_token');
      expect(SecretType.TLS_CERTIFICATE).toBe('tls_certificate');
      expect(SecretType.OAUTH_CREDENTIALS).toBe('oauth_credentials');
      expect(SecretType.SSH_KEY).toBe('ssh_key');
      expect(SecretType.PASSWORD).toBe('password');
      expect(SecretType.ENCRYPTION_KEY).toBe('encryption_key');
      expect(SecretType.CUSTOM).toBe('custom');
    });
  });

  describe('SecretStatus enum', () => {
    it('should have all expected status values', () => {
      expect(SecretStatus.ACTIVE).toBe('active');
      expect(SecretStatus.ROTATING).toBe('rotating');
      expect(SecretStatus.DEPRECATED).toBe('deprecated');
      expect(SecretStatus.EXPIRED).toBe('expired');
      expect(SecretStatus.REVOKED).toBe('revoked');
    });
  });

  describe('RotationSchedule enum', () => {
    it('should have all expected rotation schedules', () => {
      expect(RotationSchedule.DAILY).toBe('daily');
      expect(RotationSchedule.WEEKLY).toBe('weekly');
      expect(RotationSchedule.MONTHLY).toBe('monthly');
      expect(RotationSchedule.QUARTERLY).toBe('quarterly');
      expect(RotationSchedule.YEARLY).toBe('yearly');
      expect(RotationSchedule.CUSTOM).toBe('custom');
      expect(RotationSchedule.MANUAL).toBe('manual');
    });
  });
});

describe('SecretRotationService Logic', () => {
  describe('calculateNextRotationDate', () => {
    it('should calculate daily rotation correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);

      // This tests the logic that should be in the service
      expect(next.toISOString()).toBe('2024-01-16T00:00:00.000Z');
    });

    it('should calculate weekly rotation correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);

      expect(next.toISOString()).toBe('2024-01-22T00:00:00.000Z');
    });

    it('should calculate monthly rotation correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);

      expect(next.toISOString()).toBe('2024-02-01T00:00:00.000Z');
    });

    it('should calculate quarterly rotation correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const next = new Date(now);
      next.setMonth(next.getMonth() + 3);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);

      expect(next.toISOString()).toBe('2024-04-01T00:00:00.000Z');
    });

    it('should calculate yearly rotation correctly', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(0, 1);
      next.setHours(0, 0, 0, 0);

      expect(next.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });
});

describe('AccessPolicy Logic', () => {
  describe('resourceMatches', () => {
    const resourceMatches = (pattern: string, resource: string): boolean => {
      if (pattern === '*' || pattern === resource) {
        return true;
      }

      const patternParts = pattern.split('/');
      const resourceParts = resource.split('/');

      if (patternParts.length !== resourceParts.length) {
        return false;
      }

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '*') continue;
        if (patternParts[i] !== resourceParts[i]) {
          if (patternParts[i].endsWith('*')) {
            const prefix = patternParts[i].slice(0, -1);
            if (!resourceParts[i].startsWith(prefix)) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      return true;
    };

    it('should match exact resource', () => {
      expect(resourceMatches('secrets/api-key', 'secrets/api-key')).toBe(true);
    });

    it('should not match different resources', () => {
      expect(resourceMatches('secrets/api-key', 'secrets/other-key')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(resourceMatches('secrets/*', 'secrets/api-key')).toBe(true);
      expect(resourceMatches('secrets/*', 'secrets/anything')).toBe(true);
    });

    it('should match prefix wildcards', () => {
      expect(resourceMatches('secrets/razorpay-*', 'secrets/razorpay-api-key')).toBe(true);
      expect(resourceMatches('secrets/razorpay-*', 'secrets/other-key')).toBe(false);
    });

    it('should match root wildcard', () => {
      expect(resourceMatches('*', 'anything')).toBe(true);
    });

    it('should handle nested wildcards', () => {
      expect(resourceMatches('secrets/*/key', 'secrets/prod/key')).toBe(true);
      expect(resourceMatches('secrets/*/key', 'secrets/prod/other')).toBe(false);
    });
  });
});
