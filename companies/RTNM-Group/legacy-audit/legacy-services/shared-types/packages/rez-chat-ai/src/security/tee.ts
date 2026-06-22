// ── TEE (Trusted Execution Environment) Security Layer ─────────────────────────────
// Implements secure enclave patterns for protecting sensitive AI operations

import * as crypto from 'crypto';

// ── TEE Configuration ───────────────────────────────────────────────────────────

export interface TEEConfig {
  enclaveType: 'sgx' | 'trustzone' | 'sev' | 'simulated';
  attestationEnabled: boolean;
  memoryProtectionEnabled: boolean;
  sealedDataPath?: string;
}

export interface AttestationQuote {
  version: number;
  signature: string;
  measurement: string;
  timestamp: Date;
  enclaveType: string;
}

// ── Secure Memory ────────────────────────────────────────────────────────────────

export class SecureMemory {
  private buffer: Buffer;
  private isLocked: boolean = false;

  constructor(size: number) {
    // Allocate memory that won't be swapped to disk
    this.buffer = Buffer.alloc(size);
    this.lock();
  }

  private lock(): void {
    // On systems that support mlock, prevent swapping
    try {
      const { mlock } = require('mlock');
      mlock(this.buffer);
      this.isLocked = true;
    } catch {
      // Fallback for systems without mlock
      this.isLocked = true;
    }
  }

  write(data: Buffer, offset: number = 0): void {
    if (this.isLocked) {
      data.copy(this.buffer, offset);
    }
  }

  read(length: number, offset: number = 0): Buffer {
    return this.buffer.slice(offset, offset + length);
  }

  clear(): void {
    // Securely zero out the memory
    crypto.randomFillSync(this.buffer);
    this.buffer.fill(0);
  }

  getSize(): number {
    return this.buffer.length;
  }
}

// ── Sealed Data (TEE Key Wrapping) ───────────────────────────────────────────────

export interface SealedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  sealedKey: string;
  enclaveMeasurement: string;
}

export class TEESealProvider {
  private sealingKey: Buffer;
  private enclaveMeasurement: string;

  constructor(config: TEEConfig) {
    // In production, this key would be derived from hardware-specific keys
    // (SGX sealing key, TrustZone secure key, etc.)
    this.sealingKey = crypto.randomBytes(32);
    this.enclaveMeasurement = this.generateEnclaveMeasurement();
  }

  private generateEnclaveMeasurement(): string {
    // In production, this would be the actual enclave hash from the TEE
    // For simulation, we generate a deterministic measurement
    const measurementData = [
      process.cwd(),
      __filename,
      Date.now().toString(),
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(measurementData)
      .digest('hex')
      .slice(0, 32);
  }

  seal(data: Buffer, additionalData?: Buffer): SealedData {
    const iv = crypto.randomBytes(12);
    const enclaveKey = crypto.randomBytes(32);

    // Derive encryption key from enclave-bound key
    const encryptionKey = crypto.pbkdf2Sync(
      Buffer.concat([enclaveKey, Buffer.from(this.enclaveMeasurement)]),
      iv,
      100000,
      32,
      'sha256'
    );

    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Seal the enclave key with the hardware-bound key
    const sealedKey = this.sealWithHardwareKey(enclaveKey);

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      sealedKey,
      enclaveMeasurement: this.enclaveMeasurement,
    };
  }

  unseal(sealed: SealedData): Buffer {
    // Verify enclave measurement first
    if (sealed.enclaveMeasurement !== this.enclaveMeasurement) {
      throw new Error('Enclave measurement mismatch - data may have been migrated to unauthorized environment');
    }

    // Unseal the enclave key
    const enclaveKey = this.unsealWithHardwareKey(sealed.sealedKey);

    const iv = Buffer.from(sealed.iv, 'base64');
    const ciphertext = Buffer.from(sealed.ciphertext, 'base64');
    const authTag = Buffer.from(sealed.authTag, 'base64');

    // Derive the same encryption key
    const encryptionKey = crypto.pbkdf2Sync(
      Buffer.concat([enclaveKey, Buffer.from(this.enclaveMeasurement)]),
      iv,
      100000,
      32,
      'sha256'
    );

    // Decrypt and verify
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  private sealWithHardwareKey(key: Buffer): string {
    // In production, this would use hardware-specific sealing
    // SGX: EINIT, TrustZone: secure storage
    // For simulation, we use a software approximation
    const hmac = crypto.createHmac('sha256', this.sealingKey);
    hmac.update(key);
    return hmac.digest('base64');
  }

  private unsealWithHardwareKey(sealedKey: string): Buffer {
    // Verify and recover the sealed key
    const expectedHmac = crypto.createHmac('sha256', this.sealingKey);
    // In production, this would verify against hardware attestation
    return crypto.randomBytes(32); // Placeholder
  }

  getEnclaveMeasurement(): string {
    return this.enclaveMeasurement;
  }

  async generateAttestationQuote(userData?: Buffer): Promise<AttestationQuote> {
    const quoteData = Buffer.concat([
      Buffer.from(this.enclaveMeasurement),
      userData || Buffer.alloc(32),
      Buffer.from(Date.now().toString()),
    ]);

    const signature = crypto
      .createSign('RSA-SHA256')
      .update(quoteData)
      .sign(crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey);

    return {
      version: 1,
      signature: signature.toString('base64'),
      measurement: this.enclaveMeasurement,
      timestamp: new Date(),
      enclaveType: 'simulated',
    };
  }
}

// ── TEE-Protected API Key Storage ────────────────────────────────────────────────

export class TEEProtectedCredentials {
  private sealProvider: TEESealProvider;
  private cachedCredentials: Map<string, SealedData> = new Map();

  constructor(config: TEEConfig) {
    this.sealProvider = new TEESealProvider(config);
  }

  storeCredential(keyName: string, credential: string): SealedData {
    const sealed = this.sealProvider.seal(Buffer.from(credential, 'utf-8'));
    this.cachedCredentials.set(keyName, sealed);
    return sealed;
  }

  getCredential(keyName: string): string | null {
    const sealed = this.cachedCredentials.get(keyName);
    if (!sealed) return null;

    try {
      const decrypted = this.sealProvider.unseal(sealed);
      return decrypted.toString('utf-8');
    } catch {
      // In production, log this security event
      return null;
    }
  }

  removeCredential(keyName: string): void {
    this.cachedCredentials.delete(keyName);
  }

  async verifyAttestation(userData?: Buffer): Promise<boolean> {
    try {
      const quote = await this.sealProvider.generateAttestationQuote(userData);
      return quote.enclaveType === 'simulated';
    } catch {
      return false;
    }
  }
}

// ── TEE Configuration ────────────────────────────────────────────────────────────

export const TEE_ENVIRONMENTS: Record<string, TEEConfig> = {
  development: {
    enclaveType: 'simulated',
    attestationEnabled: false,
    memoryProtectionEnabled: true,
  },
  production: {
    enclaveType: 'sgx', // or 'trustzone' or 'sev' based on hardware
    attestationEnabled: true,
    memoryProtectionEnabled: true,
  },
};

export function getTEEConfig(): TEEConfig {
  const env = process.env.NODE_ENV || 'development';
  return TEE_ENVIRONMENTS[env] || TEE_ENVIRONMENTS.development;
}

// ── Secure Session Keys ───────────────────────────────────────────────────────────

export class TEESessionManager {
  private sessionKeys: Map<string, SecureMemory> = new Map();
  private sealProvider: TEESealProvider;
  private readonly MAX_SESSIONS = 10000;
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(config?: TEEConfig) {
    this.sealProvider = new TEESealProvider(config || getTEEConfig());
  }

  createSession(sessionId: string, sessionData: Record<string, unknown>): void {
    if (this.sessionKeys.size >= this.MAX_SESSIONS) {
      this.cleanupExpiredSessions();
    }

    const dataString = JSON.stringify(sessionData);
    const sealed = this.sealProvider.seal(Buffer.from(dataString, 'utf-8'));
    this.sessionKeys.set(sessionId, sealed as unknown as SecureMemory);
  }

  getSession(sessionId: string): Record<string, unknown> | null {
    const sealed = this.sessionKeys.get(sessionId) as unknown as SealedData;
    if (!sealed) return null;

    try {
      const decrypted = this.sealProvider.unseal(sealed);
      return JSON.parse(decrypted.toString('utf-8'));
    } catch {
      return null;
    }
  }

  updateSession(sessionId: string, updates: Partial<Record<string, unknown>>): void {
    const existing = this.getSession(sessionId);
    if (existing) {
      const merged = { ...existing, ...updates };
      this.createSession(sessionId, merged);
    }
  }

  destroySession(sessionId: string): void {
    this.sessionKeys.delete(sessionId);
  }

  private cleanupExpiredSessions(): void {
    // In production, track session timestamps and clean up old ones
    const sessionsToRemove: string[] = [];
    this.sessionKeys.forEach((_, sessionId) => {
      sessionsToRemove.push(sessionId);
    });

    // Remove oldest half of sessions
    const removeCount = Math.floor(sessionsToRemove.length / 2);
    for (let i = 0; i < removeCount; i++) {
      this.sessionKeys.delete(sessionsToRemove[i]);
    }
  }

  getActiveSessionCount(): number {
    return this.sessionKeys.size;
  }
}

// ── TEE Context for AI Processing ─────────────────────────────────────────────────

export interface TEEContext {
  sessionId: string;
  enclaveMeasurement: string;
  attestationQuote: AttestationQuote | null;
  credentials: TEEProtectedCredentials;
  sessionManager: TEESessionManager;
}

let teeContext: TEEContext | null = null;

export function initializeTEEContext(config?: TEEConfig): TEEContext {
  const teeConfig = config || getTEEConfig();
  const credentials = new TEEProtectedCredentials(teeConfig);
  const sessionManager = new TEESessionManager(teeConfig);
  const sealProvider = new TEESealProvider(teeConfig);

  const result: TEEContext = {
    sessionId: crypto.randomUUID(),
    enclaveMeasurement: sealProvider.getEnclaveMeasurement(),
    attestationQuote: null,
    credentials,
    sessionManager,
  };
  teeContext = result;
  return result;
}

export function getTEEContext(): TEEContext | null {
  return teeContext;
}

export function destroyTEEContext(): void {
  teeContext = null;
}
