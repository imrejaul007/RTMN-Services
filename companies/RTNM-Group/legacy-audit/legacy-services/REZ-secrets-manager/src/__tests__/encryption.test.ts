import {
  encrypt,
  decrypt,
  hashSecret,
  verifySecret,
  generateSecureToken,
  generateApiKey,
  sha256Hash,
  maskSecret,
  generateDatabaseCredentials,
  encryptWithKey,
  decryptWithKey
} from '../utils/encryption';

describe('Encryption Utils', () => {
  const testMasterKey = 'test-master-key-for-encryption-1234567890';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-api-key-12345';

      const encrypted = encrypt(plaintext, testMasterKey);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(4);

      const decrypted = decrypt(encrypted, testMasterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same-secret';

      const encrypted1 = encrypt(plaintext, testMasterKey);
      const encrypted2 = encrypt(plaintext, testMasterKey);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to the same value
      expect(decrypt(encrypted1, testMasterKey)).toBe(plaintext);
      expect(decrypt(encrypted2, testMasterKey)).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => decrypt('invalid-ciphertext', testMasterKey)).toThrow('Invalid ciphertext format');
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt('secret', testMasterKey);
      const parts = encrypted.split(':');
      parts[3] = 'tampered' + parts[3];
      const tampered = parts.join(':');

      expect(() => decrypt(tampered, testMasterKey)).toThrow();
    });
  });

  describe('hashSecret/verifySecret', () => {
    it('should hash and verify a secret correctly', async () => {
      const secret = 'my-secret-password';

      const hash = await hashSecret(secret);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(secret);

      const isValid = await verifySecret(secret, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect secrets', async () => {
      const secret = 'my-secret-password';
      const wrongSecret = 'wrong-password';

      const hash = await hashSecret(secret);
      const isValid = await verifySecret(wrongSecret, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toBeDefined();
      expect(token.length).toBe(32); // hex encoding doubles the length
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate an API key with prefix and full key', () => {
      const { key, prefix } = generateApiKey();

      expect(key).toBeDefined();
      expect(prefix).toBeDefined();
      expect(prefix.length).toBe(8);
      expect(key.length).toBe(64);
      expect(key.startsWith(prefix)).toBe(true);
    });

    it('should generate unique API keys', () => {
      const { key: key1 } = generateApiKey();
      const { key: key2 } = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('sha256Hash', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test-data';

      const hash1 = sha256Hash(data);
      const hash2 = sha256Hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = sha256Hash('data1');
      const hash2 = sha256Hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string', () => {
      const hash = sha256Hash('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('maskSecret', () => {
    it('should mask the middle of the secret', () => {
      const secret = 'start-middle-end';
      const masked = maskSecret(secret, 5);

      expect(masked.startsWith('start')).toBe(true);
      expect(masked.endsWith('-end')).toBe(true);
      expect(masked).not.toContain('middle');
    });

    it('should fully mask short secrets', () => {
      const secret = 'short';
      const masked = maskSecret(secret, 4);

      expect(masked).toBe('*****');
    });
  });

  describe('generateDatabaseCredentials', () => {
    it('should generate username and password', () => {
      const { username, password } = generateDatabaseCredentials();

      expect(username).toBeDefined();
      expect(password).toBeDefined();
      expect(username).toMatch(/^rez_[a-f0-9]{16}$/);
    });

    it('should use provided username', () => {
      const { username } = generateDatabaseCredentials('my-user');
      expect(username).toBe('my-user');
    });
  });

  describe('encryptWithKey/decryptWithKey', () => {
    it('should encrypt and decrypt with custom key', () => {
      const plaintext = 'secret-with-custom-key';
      const customKey = 'custom-encryption-key-1234567890123456';

      const encrypted = encryptWithKey(plaintext, customKey);
      const decrypted = decryptWithKey(encrypted, customKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext than default encryption', () => {
      const plaintext = 'compare-encryption';
      const customKey = 'different-key-12345678901234567890';

      const encryptedDefault = encrypt(plaintext, testMasterKey);
      const encryptedCustom = encryptWithKey(plaintext, customKey);

      expect(encryptedDefault).not.toBe(encryptedCustom);
    });
  });
});
