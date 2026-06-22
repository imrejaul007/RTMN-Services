// ============================================================================
// SUTAR Identity OS - Identity Service
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import {
  Identity,
  IdentityStatus,
  VerificationStatus,
  KYCLevel,
  BadgeLevel,
  EntityType,
  MFAType,
  Document,
  Address,
  CreateIdentitySchema,
  UpdateIdentitySchema,
  VerificationRequestSchema,
  AuditLogEntry,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

interface IdentityStore {
  identities: Map<string, Identity>;
  auditLog: AuditLogEntry[];
}

const store: IdentityStore = {
  identities: new Map(),
  auditLog: [],
};

export class IdentityService {
  // Create new identity
  async createIdentity(data: unknown): Promise<Identity> {
    const parsed = CreateIdentitySchema.parse(data);

    const now = new Date().toISOString();
    const identity: Identity = {
      id: uuidv4(),
      entityType: parsed.entityType,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      displayName: `${parsed.firstName} ${parsed.lastName}`,
      dateOfBirth: parsed.dateOfBirth,
      contact: {
        email: parsed.email,
        phone: parsed.phone,
        verified: false,
      },
      address: parsed.address,
      status: "active",
      verificationStatus: "pending",
      kycLevel: "basic",
      badge: "unverified",
      documents: [],
      credentials: [],
      mfa: {
        enabled: parsed.mfaEnabled ?? false,
        types: parsed.mfaTypes ?? [],
        verified: false,
      },
      metadata: parsed.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    store.identities.set(identity.id, identity);

    this.logAudit(identity.id, "IDENTITY_CREATED", "system", {
      entityType: identity.entityType,
      initialBadge: identity.badge,
    });

    logger.info("IdentityService", `Created identity: ${identity.id}`);
    return identity;
  }

  // Get identity by ID
  async getIdentity(id: string): Promise<Identity | null> {
    return store.identities.get(id) ?? null;
  }

  // Get identity by email
  async getIdentityByEmail(email: string): Promise<Identity | null> {
    for (const identity of store.identities.values()) {
      if (identity.contact.email === email) {
        return identity;
      }
    }
    return null;
  }

  // Get identity by phone
  async getIdentityByPhone(phone: string): Promise<Identity | null> {
    for (const identity of store.identities.values()) {
      if (identity.contact.phone === phone) {
        return identity;
      }
    }
    return null;
  }

  // Update identity
  async updateIdentity(id: string, data: unknown): Promise<Identity | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    const parsed = UpdateIdentitySchema.parse(data);
    const now = new Date().toISOString();

    const updated: Identity = {
      ...identity,
      firstName: parsed.firstName ?? identity.firstName,
      lastName: parsed.lastName ?? identity.lastName,
      displayName: `${parsed.firstName ?? identity.firstName} ${parsed.lastName ?? identity.lastName}`,
      dateOfBirth: parsed.dateOfBirth ?? identity.dateOfBirth,
      contact: {
        ...identity.contact,
        email: parsed.email ?? identity.contact.email,
        phone: parsed.phone ?? identity.contact.phone,
      },
      address: parsed.address ?? identity.address,
      status: parsed.status ?? identity.status,
      mfa: {
        ...identity.mfa,
        enabled: parsed.mfaEnabled ?? identity.mfa.enabled,
        types: parsed.mfaTypes ?? identity.mfa.types,
      },
      metadata: { ...identity.metadata, ...(parsed.metadata ?? {}) },
      updatedAt: now,
    };

    store.identities.set(id, updated);

    this.logAudit(id, "IDENTITY_UPDATED", "system", {
      updatedFields: Object.keys(parsed),
    });

    logger.info("IdentityService", `Updated identity: ${id}`);
    return updated;
  }

  // Delete identity (soft delete)
  async deleteIdentity(id: string): Promise<boolean> {
    const identity = store.identities.get(id);
    if (!identity) {
      return false;
    }

    identity.status = "deleted";
    identity.updatedAt = new Date().toISOString();
    store.identities.set(id, identity);

    this.logAudit(id, "IDENTITY_DELETED", "system", {});
    logger.info("IdentityService", `Deleted identity: ${id}`);
    return true;
  }

  // Verify identity
  async verifyIdentity(id: string, data: unknown): Promise<Identity | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    const parsed = VerificationRequestSchema.parse(data);
    const now = new Date().toISOString();

    // Update verification status based on verification type
    const newStatus: VerificationStatus = parsed.verificationType === "identity" ? "verified" : identity.verificationStatus;

    // Update badge based on KYC level
    const newBadge = this.calculateBadge(identity.entityType, identity.kycLevel, newStatus);

    const updated: Identity = {
      ...identity,
      verificationStatus: newStatus,
      badge: newBadge,
      verifiedAt: now,
      updatedAt: now,
    };

    store.identities.set(id, updated);

    this.logAudit(id, "IDENTITY_VERIFIED", "system", {
      verificationType: parsed.verificationType,
      newStatus,
      newBadge,
    });

    logger.info("IdentityService", `Verified identity: ${id}`);
    return updated;
  }

  // Update verification status
  async updateVerificationStatus(id: string, status: VerificationStatus, kycLevel?: KYCLevel): Promise<Identity | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    const now = new Date().toISOString();
    const newBadge = this.calculateBadge(identity.entityType, kycLevel ?? identity.kycLevel, status);

    const updated: Identity = {
      ...identity,
      verificationStatus: status,
      kycLevel: kycLevel ?? identity.kycLevel,
      badge: newBadge,
      verifiedAt: status === "verified" ? now : identity.verifiedAt,
      updatedAt: now,
    };

    store.identities.set(id, updated);
    return updated;
  }

  // Add document to identity
  async addDocument(id: string, document: Omit<Document, "id">): Promise<Identity | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    const newDocument: Document = {
      ...document,
      id: uuidv4(),
    };

    const updated: Identity = {
      ...identity,
      documents: [...identity.documents, newDocument],
      updatedAt: new Date().toISOString(),
    };

    store.identities.set(id, updated);

    this.logAudit(id, "DOCUMENT_ADDED", "system", {
      documentType: document.type,
      documentId: newDocument.id,
    });

    return updated;
  }

  // Add credential to identity
  async addCredential(id: string, credentialId: string): Promise<Identity | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    if (!identity.credentials.includes(credentialId)) {
      const updated: Identity = {
        ...identity,
        credentials: [...identity.credentials, credentialId],
        updatedAt: new Date().toISOString(),
      };
      store.identities.set(id, updated);
    }

    return store.identities.get(id) ?? null;
  }

  // Calculate badge based on entity type, KYC level, and verification status
  private calculateBadge(entityType: EntityType, kycLevel: KYCLevel, status: VerificationStatus): BadgeLevel {
    if (status !== "verified") {
      return "unverified";
    }

    switch (entityType) {
      case "merchant":
        return "verified_merchant";
      case "agent":
        return "verified_agent";
      case "company":
        return kycLevel === "premium" ? "trusted" : "verified_merchant";
      default:
        switch (kycLevel) {
          case "premium":
            return "trusted";
          case "enhanced":
            return "premium";
          case "standard":
            return "standard";
          case "basic":
          default:
            return "basic";
        }
    }
  }

  // Get verification status
  async getVerificationStatus(id: string): Promise<{
    identityId: string;
    status: VerificationStatus;
    kycLevel: KYCLevel;
    badge: BadgeLevel;
    documentsCount: number;
    credentialsCount: number;
    verifiedAt?: string;
    lastLoginAt?: string;
  } | null> {
    const identity = store.identities.get(id);
    if (!identity) {
      return null;
    }

    return {
      identityId: identity.id,
      status: identity.verificationStatus,
      kycLevel: identity.kycLevel,
      badge: identity.badge,
      documentsCount: identity.documents.length,
      credentialsCount: identity.credentials.length,
      verifiedAt: identity.verifiedAt,
      lastLoginAt: identity.lastLoginAt,
    };
  }

  // Update last login
  async updateLastLogin(id: string): Promise<void> {
    const identity = store.identities.get(id);
    if (identity) {
      identity.lastLoginAt = new Date().toISOString();
      store.identities.set(id, identity);
    }
  }

  // List all identities with pagination
  async listIdentities(page: number = 1, limit: number = 20): Promise<{
    items: Identity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const all = Array.from(store.identities.values());
    const total = all.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
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

  // Get audit log for identity
  async getAuditLog(identityId: string): Promise<AuditLogEntry[]> {
    return store.auditLog.filter(entry => entry.identityId === identityId);
  }
}

export const identityService = new IdentityService();
