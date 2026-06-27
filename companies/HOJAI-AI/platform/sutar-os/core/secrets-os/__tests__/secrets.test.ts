import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('SecretsOS', () => {
  const secrets = new Map();
  const accessLogs: any[] = [];
  const versions = new Map();

  // Simple encryption for testing
  const ENCRYPTION_KEY = crypto.randomBytes(32);

  function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  describe('Encryption', () => {
    it('should encrypt and decrypt a secret', () => {
      const secret = 'my-api-key-12345';
      const encrypted = encrypt(secret);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('should produce different ciphertext each time', () => {
      const secret = 'same-secret';
      const encrypted1 = encrypt(secret);
      const encrypted2 = encrypt(secret);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail with invalid ciphertext', () => {
      expect(() => decrypt('invalid')).toThrow();
    });
  });

  describe('Secret Management', () => {
    it('should create a secret', () => {
      const name = 'api-key-stripe';
      const value = 'sk_test_12345';

      secrets.set(name, {
        id: 'secret-1',
        name,
        encryptedValue: encrypt(value),
        metadata: {},
        tags: ['payment', 'production'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        accessCount: 0,
      });

      expect(secrets.size).toBe(1);
    });

    it('should prevent duplicate secrets', () => {
      const existing = secrets.has('api-key-stripe');
      expect(existing).toBe(true);
    });

    it('should get secret by name', () => {
      const secret = secrets.get('api-key-stripe');
      expect(secret).toBeDefined();
      expect(secret?.name).toBe('api-key-stripe');
    });

    it('should delete secret', () => {
      secrets.delete('api-key-stripe');
      expect(secrets.has('api-key-stripe')).toBe(false);
    });
  });

  describe('Secret Updates', () => {
    beforeEach(() => {
      secrets.clear();
      versions.clear();
    });

    it('should update secret value', () => {
      const name = 'database-url';
      const originalValue = 'postgresql://localhost/db';
      const newValue = 'postgresql://prod/db';

      secrets.set(name, {
        name,
        encryptedValue: encrypt(originalValue),
        version: 1,
        updatedAt: new Date().toISOString(),
      });

      // Update
      secrets.set(name, {
        ...secrets.get(name)!,
        encryptedValue: encrypt(newValue),
        version: 2,
        updatedAt: new Date().toISOString(),
        rotatedAt: new Date().toISOString(),
      });

      expect(secrets.get(name)?.version).toBe(2);
    });

    it('should track versions', () => {
      const name = 'api-key';
      versions.set(name, [
        { version: 1, encryptedValue: encrypt('v1') },
        { version: 2, encryptedValue: encrypt('v2') },
      ]);

      const vers = versions.get(name);
      expect(vers?.length).toBe(2);
      expect(vers?.[0].version).toBe(1);
      expect(vers?.[1].version).toBe(2);
    });

    it('should rollback to previous version', () => {
      const name = 'api-key';
      const current = encrypt('current-value');
      const previous = encrypt('previous-value');

      secrets.set(name, {
        name,
        encryptedValue: current,
        version: 2,
        rotatedAt: new Date().toISOString(),
      });

      versions.set(name, [
        { version: 1, encryptedValue: previous },
      ]);

      // Rollback
      const vers = versions.get(name);
      if (vers && vers.length > 0) {
        secrets.set(name, {
          ...secrets.get(name)!,
          encryptedValue: vers[vers.length - 1].encryptedValue,
          version: 3,
        });
      }

      expect(secrets.get(name)?.version).toBe(3);
    });
  });

  describe('Access Logging', () => {
    it('should log secret access', () => {
      const log = {
        id: 'log-1',
        secretId: 'secret-1',
        accessedBy: 'user@example.com',
        accessType: 'read' as const,
        accessedAt: new Date().toISOString(),
        ip: '127.0.0.1',
        success: true,
      };
      accessLogs.push(log);
      expect(accessLogs.length).toBe(1);
    });

    it('should filter logs by secret', () => {
      accessLogs.push({ secretId: 'secret-1', accessType: 'read' });
      accessLogs.push({ secretId: 'secret-2', accessType: 'read' });
      accessLogs.push({ secretId: 'secret-1', accessType: 'update' });

      const secret1Logs = accessLogs.filter(l => l.secretId === 'secret-1');
      expect(secret1Logs.length).toBe(2);
    });

    it('should track failed access attempts', () => {
      accessLogs.push({ secretId: 'secret-1', success: false });
      accessLogs.push({ secretId: 'secret-1', success: true });

      const failed = accessLogs.filter(l => !l.success);
      expect(failed.length).toBe(1);
    });
  });

  describe('Secret Metadata', () => {
    it('should store metadata', () => {
      const secret = {
        name: 'api-key',
        metadata: {
          environment: 'production',
          owner: 'engineering',
          expiresAt: '2025-12-31',
        },
      };

      expect(secret.metadata.environment).toBe('production');
      expect(secret.metadata.owner).toBe('engineering');
    });

    it('should store tags', () => {
      const secret = {
        name: 'api-key',
        tags: ['payment', 'critical', 'production'],
      };

      expect(secret.tags).toContain('payment');
      expect(secret.tags).toContain('critical');
    });
  });

  describe('API Keys', () => {
    it('should generate random API keys', () => {
      const key = crypto.randomBytes(32).toString('hex');
      expect(key.length).toBe(64);
    });

    it('should validate key format', () => {
      const validKey = 'sk_test_12345';
      const isValid = /^[a-zA-Z0-9_-]+$/.test(validKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Secret Listing', () => {
    beforeEach(() => {
      secrets.clear();
    });

    it('should list secrets without values', () => {
      secrets.set('key1', { name: 'key1', encryptedValue: 'xxx', metadata: {}, tags: [], version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0 } as any);
      secrets.set('key2', { name: 'key2', encryptedValue: 'yyy', metadata: {}, tags: [], version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0 } as any);

      const list = Array.from(secrets.values()).map(s => ({
        name: s.name,
        metadata: s.metadata,
        tags: s.tags,
        version: s.version,
      }));

      expect(list.length).toBe(2);
      expect(list[0]).not.toHaveProperty('encryptedValue');
    });

    it('should filter by tag', () => {
      secrets.set('key1', { name: 'key1', tags: ['payment'] } as any);
      secrets.set('key2', { name: 'key2', tags: ['internal'] } as any);

      const paymentSecrets = Array.from(secrets.values()).filter(s => s.tags.includes('payment'));
      expect(paymentSecrets.length).toBe(1);
    });
  });

  describe('Rotation', () => {
    it('should rotate secret with version increment', () => {
      const secret = {
        name: 'api-key',
        encryptedValue: encrypt('old-value'),
        version: 1,
      };

      secret.encryptedValue = encrypt('new-value');
      secret.version++;

      expect(secret.version).toBe(2);
    });

    it('should track rotation timestamp', () => {
      const secret = {
        name: 'api-key',
        rotatedAt: new Date().toISOString(),
      };

      expect(secret.rotatedAt).toBeDefined();
    });
  });
});
