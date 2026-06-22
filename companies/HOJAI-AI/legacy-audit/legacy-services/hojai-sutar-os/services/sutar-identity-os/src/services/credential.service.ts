// ============================================================================
// SUTAR Identity OS - Credential Service
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import {
  Credential,
  CredentialType,
  CreateCredentialSchema,
  AuditLogEntry,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

interface CredentialStore {
  credentials: Map<string, Credential>;
  auditLog: AuditLogEntry[];
}

const store: CredentialStore = {
  credentials: new Map(),
  auditLog: [],
};

export class CredentialService {
  // Create new credential
  async createCredential(data: unknown): Promise<Credential> {
    const parsed = CreateCredentialSchema.parse(data);

    const now = new Date().toISOString();
    const credential: Credential = {
      id: uuidv4(),
      identityId: parsed.identityId,
      type: parsed.type,
      title: parsed.title,
      description: parsed.description,
      issuer: parsed.issuer,
      status: "active",
      validFrom: parsed.validFrom,
      validUntil: parsed.validUntil,
      claims: parsed.claims ?? {},
      metadata: parsed.metadata ?? {},
      issuedAt: now,
      updatedAt: now,
    };

    store.credentials.set(credential.id, credential);

    this.logAudit(credential.identityId, "CREDENTIAL_CREATED", "system", {
      credentialId: credential.id,
      credentialType: credential.type,
      issuer: credential.issuer,
    });

    logger.info("CredentialService", `Created credential: ${credential.id} for identity: ${credential.identityId}`);
    return credential;
  }

  // Get credential by ID
  async getCredential(id: string): Promise<Credential | null> {
    return store.credentials.get(id) ?? null;
  }

  // Get credentials by identity ID
  async getCredentialsByIdentity(identityId: string): Promise<Credential[]> {
    const credentials: Credential[] = [];
    for (const credential of store.credentials.values()) {
      if (credential.identityId === identityId) {
        credentials.push(credential);
      }
    }
    return credentials;
  }

  // Get active credentials by identity
  async getActiveCredentials(identityId: string): Promise<Credential[]> {
    const credentials = await this.getCredentialsByIdentity(identityId);
    return credentials.filter(c => c.status === "active");
  }

  // Verify credential is still valid
  async isCredentialValid(id: string): Promise<boolean> {
    const credential = store.credentials.get(id);
    if (!credential) {
      return false;
    }

    if (credential.status !== "active") {
      return false;
    }

    const now = new Date();
    if (credential.validUntil) {
      const expiry = new Date(credential.validUntil);
      if (now > expiry) {
        return false;
      }
    }

    if (credential.validFrom) {
      const start = new Date(credential.validFrom);
      if (now < start) {
        return false;
      }
    }

    return true;
  }

  // Revoke credential
  async revokeCredential(id: string, reason?: string, revokedBy?: string): Promise<Credential | null> {
    const credential = store.credentials.get(id);
    if (!credential) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: Credential = {
      ...credential,
      status: "revoked",
      revokedAt: now,
      revokedBy,
      revocationReason: reason,
      updatedAt: now,
    };

    store.credentials.set(id, updated);

    this.logAudit(credential.identityId, "CREDENTIAL_REVOKED", revokedBy ?? "system", {
      credentialId: id,
      reason,
    });

    logger.info("CredentialService", `Revoked credential: ${id}`);
    return updated;
  }

  // Update credential
  async updateCredential(id: string, updates: Partial<Credential>): Promise<Credential | null> {
    const credential = store.credentials.get(id);
    if (!credential) {
      return null;
    }

    const updated: Credential = {
      ...credential,
      ...updates,
      id: credential.id, // Prevent ID change
      identityId: credential.identityId, // Prevent identity change
      issuedAt: credential.issuedAt, // Prevent issue date change
      updatedAt: new Date().toISOString(),
    };

    store.credentials.set(id, updated);

    this.logAudit(credential.identityId, "CREDENTIAL_UPDATED", "system", {
      credentialId: id,
      updatedFields: Object.keys(updates),
    });

    logger.info("CredentialService", `Updated credential: ${id}`);
    return updated;
  }

  // Suspend credential
  async suspendCredential(id: string, reason?: string): Promise<Credential | null> {
    return this.updateCredential(id, {
      status: "suspended",
      metadata: { ...store.credentials.get(id)?.metadata, suspensionReason: reason },
    });
  }

  // List all credentials with pagination
  async listCredentials(
    page: number = 1,
    limit: number = 20,
    filters?: {
      identityId?: string;
      type?: CredentialType;
      status?: string;
    }
  ): Promise<{
    items: Credential[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let filtered = Array.from(store.credentials.values());

    if (filters?.identityId) {
      filtered = filtered.filter(c => c.identityId === filters.identityId);
    }
    if (filters?.type) {
      filtered = filtered.filter(c => c.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  // Validate credential claims
  async validateCredentialClaims(id: string, requiredClaims: string[]): Promise<{
    valid: boolean;
    missingClaims: string[];
  }> {
    const credential = store.credentials.get(id);
    if (!credential) {
      return { valid: false, missingClaims: requiredClaims };
    }

    const missingClaims = requiredClaims.filter(
      claim => credential.claims[claim] === undefined
    );

    return {
      valid: missingClaims.length === 0,
      missingClaims,
    };
  }

  // Audit logging
  private logAudit(identityId: string, action: string, actor: string, details: Record<string, unknown>): void {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      identityId,
      action,
      actor,
      actorType: "system",
      details,
      timestamp: new Date().toISOString(),
    };
    store.auditLog.push(entry);
  }
}

export const credentialService = new CredentialService();
