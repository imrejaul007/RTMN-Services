/**
 * Hojai Flow - Vault Service
 *
 * Personal encrypted storage for user data:
 * - AES-256 encryption
 * - Biometric unlock
 * - Per-user keys
 * - Client-side encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, CipherGCM, DecipherGCM } from 'crypto';

export interface VaultItem {
  id: string;
  type: string;
  encryptedData: string;
  iv: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessed?: Date;
}

export interface VaultConfig {
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  biometricEnabled: boolean;
  passphraseEnabled: boolean;
}

const DEFAULT_CONFIG: VaultConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'sha256',
  iterations: 100000,
  biometricEnabled: true,
  passphraseEnabled: true,
};

export interface UserVault {
  userId: string;
  masterKeyHash: string;
  encryptedMasterKey?: string;
  publicKey?: string;
  items: Map<string, VaultItem>;
  createdAt: Date;
  lastAccessed: Date;
}

export class VaultService {
  private config: VaultConfig;
  private vaults: Map<string, UserVault>;
  private keys: Map<string, Buffer>;

  constructor(config?: Partial<VaultConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.vaults = new Map();
    this.keys = new Map();
  }

  /**
   * Create a new vault for a user
   */
  async createVault(userId: string, passphrase: string): Promise<{ vaultId: string; salt: string }> {
    const salt = randomBytes(32);
    const masterKey = this.deriveKey(passphrase, salt);

    const vault: UserVault = {
      userId,
      masterKeyHash: this.hashKey(masterKey),
      encryptedMasterKey: undefined,
      items: new Map(),
      createdAt: new Date(),
      lastAccessed: new Date(),
    };

    this.vaults.set(userId, vault);
    this.keys.set(userId, masterKey);

    return { vaultId: userId, salt: salt.toString('hex') };
  }

  /**
   * Unlock vault with passphrase
   */
  async unlockVault(userId: string, passphrase: string): Promise<boolean> {
    const vault = this.vaults.get(userId);
    if (!vault) return false;

    const salt = randomBytes(32); // In production, retrieve stored salt
    const masterKey = this.deriveKey(passphrase, salt);
    const keyHash = this.hashKey(masterKey);

    if (keyHash === vault.masterKeyHash) {
      this.keys.set(userId, masterKey);
      vault.lastAccessed = new Date();
      return true;
    }

    return false;
  }

  /**
   * Unlock vault with biometric
   */
  async unlockWithBiometric(userId: string, biometricData: Buffer): Promise<boolean> {
    const vault = this.vaults.get(userId);
    if (!vault) return false;

    // In production, verify biometric against stored template
    // Simplified: just check if vault exists
    if (vault) {
      // Retrieve stored master key encrypted with biometric
      const masterKey = randomBytes(32); // Would be decrypted
      this.keys.set(userId, masterKey);
      vault.lastAccessed = new Date();
      return true;
    }

    return false;
  }

  /**
   * Lock vault (clear keys from memory)
   */
  lockVault(userId: string): void {
    this.keys.delete(userId);
    const vault = this.vaults.get(userId);
    if (vault) {
      vault.lastAccessed = new Date();
    }
  }

  /**
   * Store encrypted data
   */
  async store(
    userId: string,
    type: string,
    data: unknown,
    options: { tags?: string[]; id?: string } = {}
  ): Promise<VaultItem> {
    const vault = this.vaults.get(userId);
    if (!vault) throw new Error('Vault not found');

    const key = this.keys.get(userId);
    if (!key) throw new Error('Vault is locked');

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.config.algorithm, key, iv) as CipherGCM;

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const item: VaultItem = {
      id: options.id || randomBytes(16).toString('hex'),
      type,
      encryptedData: Buffer.concat([encrypted, authTag]).toString('base64'),
      iv: iv.toString('hex'),
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
    };

    vault.items.set(item.id, item);
    return item;
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieve<T = unknown>(userId: string, itemId: string): Promise<T | null> {
    const vault = this.vaults.get(userId);
    if (!vault) throw new Error('Vault not found');

    const key = this.keys.get(userId);
    if (!key) throw new Error('Vault is locked');

    const item = vault.items.get(itemId);
    if (!item) return null;

    const iv = Buffer.from(item.iv, 'hex');
    const encryptedBuffer = Buffer.from(item.encryptedData, 'base64');

    // Split auth tag from encrypted data
    const authTag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);

    const decipher = createDecipheriv(this.config.algorithm, key, iv) as DecipherGCM;
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');

    // Update access stats
    item.accessCount++;
    item.lastAccessed = new Date();

    return JSON.parse(decrypted) as T;
  }

  /**
   * List vault items (metadata only, not encrypted data)
   */
  listItems(userId: string, filter?: { type?: string; tags?: string[] }): VaultItem[] {
    const vault = this.vaults.get(userId);
    if (!vault) return [];

    let items = Array.from(vault.items.values());

    if (filter?.type) {
      items = items.filter((item) => item.type === filter.type);
    }

    if (filter?.tags) {
      items = items.filter((item) =>
        filter.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    return items;
  }

  /**
   * Delete item from vault
   */
  async delete(userId: string, itemId: string): Promise<boolean> {
    const vault = this.vaults.get(userId);
    if (!vault) return false;

    return vault.items.delete(itemId);
  }

  /**
   * Update item in vault
   */
  async update(
    userId: string,
    itemId: string,
    data: unknown,
    options?: { tags?: string[] }
  ): Promise<VaultItem | null> {
    await this.delete(userId, itemId);
    return this.store(userId, this.vaults.get(userId)?.items.get(itemId)?.type || 'unknown', data, {
      id: itemId,
      tags: options?.tags,
    });
  }

  /**
   * Search vault items by tags
   */
  search(userId: string, query: string): VaultItem[] {
    const vault = this.vaults.get(userId);
    if (!vault) return [];

    const lowerQuery = query.toLowerCase();
    return Array.from(vault.items.values()).filter(
      (item) =>
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        item.type.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export vault (encrypted backup)
   */
  async export(userId: string): Promise<string> {
    const vault = this.vaults.get(userId);
    if (!vault) throw new Error('Vault not found');

    const key = this.keys.get(userId);
    if (!key) throw new Error('Vault is locked');

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.config.algorithm, key, iv) as CipherGCM;

    const vaultData = {
      userId: vault.userId,
      items: Array.from(vault.items.entries()),
      createdAt: vault.createdAt,
    };

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(vaultData), 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      version: 1,
      iv: iv.toString('hex'),
      data: Buffer.concat([encrypted, authTag]).toString('base64'),
    });
  }

  /**
   * Import vault from backup
   */
  async import(userId: string, backup: string, passphrase: string): Promise<void> {
    const backupData = JSON.parse(backup);
    const salt = randomBytes(32); // In production, derive from passphrase
    const key = this.deriveKey(passphrase, salt);

    const iv = Buffer.from(backupData.iv, 'hex');
    const encryptedBuffer = Buffer.from(backupData.data, 'base64');

    const authTag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);

    const decipher = createDecipheriv(this.config.algorithm, key, iv) as DecipherGCM;
    decipher.setAuthTag(authTag);

    const decrypted = JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    );

    const vault: UserVault = {
      userId: decrypted.userId,
      masterKeyHash: this.hashKey(key),
      items: new Map(decrypted.items),
      createdAt: new Date(decrypted.createdAt),
      lastAccessed: new Date(),
    };

    this.vaults.set(userId, vault);
    this.keys.set(userId, key);
  }

  /**
   * Derive encryption key from passphrase
   */
  private deriveKey(passphrase: string, salt: Buffer): Buffer {
    const hash = createHash(this.config.keyDerivation);
    for (let i = 0; i < this.config.iterations; i++) {
      hash.update(i === 0 ? passphrase : '');
      hash.update(salt);
    }
    return hash.digest();
  }

  /**
   * Hash key for verification
   */
  private hashKey(key: Buffer): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get vault statistics
   */
  getStats(userId: string): {
    itemCount: number;
    totalAccesses: number;
    lastAccessed: Date | null;
    types: Record<string, number>;
  } | null {
    const vault = this.vaults.get(userId);
    if (!vault) return null;

    const types: Record<string, number> = {};
    let totalAccesses = 0;

    for (const item of vault.items.values()) {
      types[item.type] = (types[item.type] || 0) + 1;
      totalAccesses += item.accessCount;
    }

    return {
      itemCount: vault.items.size,
      totalAccesses,
      lastAccessed: vault.lastAccessed,
      types,
    };
  }
}

// Singleton export
export const vaultService = new VaultService();

export default vaultService;
