// ============================================================================
// SUTAR Identity OS - KYC Service
// ============================================================================

import { v4 as uuidv4 } from "uuid";
import {
  KYCRecord,
  KYCLevel,
  VerificationStatus,
  KYCSumbitSchema,
  Document,
  DocumentType,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { identityService } from "./identity.service.js";

interface KYCStore {
  records: Map<string, KYCRecord>;
}

const store: KYCStore = {
  records: new Map(),
};

export class KYCService {
  // Submit KYC application
  async submitKYC(identityId: string, data: unknown): Promise<KYCRecord> {
    // Verify identity exists
    const identity = await identityService.getIdentity(identityId);
    if (!identity) {
      throw new Error(`Identity not found: ${identityId}`);
    }

    const parsed = KYCSumbitSchema.parse(data);

    const now = new Date().toISOString();
    const kycRecord: KYCRecord = {
      id: uuidv4(),
      identityId,
      level: parsed.level,
      status: "in_progress",
      documents: parsed.documents.map((doc: { type: DocumentType; documentNumber: string; issuedDate?: string; expiryDate?: string; fileUrl?: string; fileHash?: string; verified?: boolean }) => ({
        id: uuidv4(),
        type: doc.type,
        documentNumber: doc.documentNumber,
        issuedDate: doc.issuedDate,
        expiryDate: doc.expiryDate,
        fileUrl: doc.fileUrl,
        fileHash: doc.fileHash,
        verified: doc.verified ?? false,
      })),
      faceMatchVerified: false,
      biometricVerified: false,
      verificationMethod: parsed.verificationMethod ?? "hybrid",
      submittedAt: now,
    };

    store.records.set(kycRecord.id, kycRecord);

    // Update identity verification status
    await identityService.updateVerificationStatus(identityId, "in_progress", parsed.level);

    logger.info("KYCService", `Submitted KYC: ${kycRecord.id} for identity: ${identityId}`);
    return kycRecord;
  }

  // Get KYC record by ID
  async getKYCCRecord(id: string): Promise<KYCRecord | null> {
    return store.records.get(id) ?? null;
  }

  // Get KYC record by identity ID
  async getKYCByIdentity(identityId: string): Promise<KYCRecord | null> {
    for (const record of store.records.values()) {
      if (record.identityId === identityId) {
        return record;
      }
    }
    return null;
  }

  // Approve KYC
  async approveKYC(id: string, approvedBy: string, notes?: string): Promise<KYCRecord | null> {
    const record = store.records.get(id);
    if (!record) {
      return null;
    }

    const now = new Date().toISOString();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const updated: KYCRecord = {
      ...record,
      status: "verified",
      processedAt: now,
      expiresAt: expiryDate.toISOString().split("T")[0],
      reviewNotes: notes,
      approvedBy,
    };

    store.records.set(id, updated);

    // Update identity status
    await identityService.updateVerificationStatus(record.identityId, "verified", record.level);

    // Update identity documents as verified
    for (const doc of record.documents) {
      await identityService.addDocument(record.identityId, {
        ...doc,
        verified: true,
        verifiedAt: now,
        verifiedBy: approvedBy,
      });
    }

    logger.info("KYCService", `Approved KYC: ${id} by ${approvedBy}`);
    return updated;
  }

  // Reject KYC
  async rejectKYC(id: string, rejectedBy: string, reason: string): Promise<KYCRecord | null> {
    const record = store.records.get(id);
    if (!record) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: KYCRecord = {
      ...record,
      status: "rejected",
      processedAt: now,
      rejectedBy,
      rejectionReason: reason,
    };

    store.records.set(id, updated);

    // Update identity verification status
    await identityService.updateVerificationStatus(record.identityId, "rejected");

    logger.info("KYCService", `Rejected KYC: ${id} by ${rejectedBy}: ${reason}`);
    return updated;
  }

  // Update KYC record
  async updateKYC(id: string, updates: Partial<KYCRecord>): Promise<KYCRecord | null> {
    const record = store.records.get(id);
    if (!record) {
      return null;
    }

    const updated: KYCRecord = {
      ...record,
      ...updates,
      id: record.id,
      identityId: record.identityId,
      submittedAt: record.submittedAt,
    };

    store.records.set(id, updated);
    return updated;
  }

  // Verify document
  async verifyDocument(kycId: string, documentId: string, verifiedBy: string): Promise<KYCRecord | null> {
    const record = store.records.get(kycId);
    if (!record) {
      return null;
    }

    const documentIndex = record.documents.findIndex(d => d.id === documentId);
    if (documentIndex === -1) {
      return null;
    }

    const now = new Date().toISOString();
    record.documents[documentIndex] = {
      ...record.documents[documentIndex],
      verified: true,
      verifiedAt: now,
      verifiedBy,
    };

    store.records.set(kycId, record);
    logger.info("KYCService", `Verified document: ${documentId} in KYC: ${kycId}`);
    return record;
  }

  // Set face match verification
  async setFaceMatchVerified(kycId: string, verified: boolean): Promise<KYCRecord | null> {
    const record = store.records.get(kycId);
    if (!record) {
      return null;
    }

    record.faceMatchVerified = verified;
    store.records.set(kycId, record);
    return record;
  }

  // Set biometric verification
  async setBiometricVerified(kycId: string, verified: boolean): Promise<KYCRecord | null> {
    const record = store.records.get(kycId);
    if (!record) {
      return null;
    }

    record.biometricVerified = verified;
    store.records.set(kycId, record);
    return record;
  }

  // Check if KYC is complete
  async isKYCComplete(id: string): Promise<boolean> {
    const record = store.records.get(id);
    if (!record) {
      return false;
    }

    // All documents must be verified
    const allDocsVerified = record.documents.every(d => d.verified);

    // For enhanced/premium KYC, face match and biometric may be required
    const additionalChecks =
      record.level === "basic" || record.level === "standard"
        ? true
        : (record.faceMatchVerified && record.biometricVerified);

    return allDocsVerified && additionalChecks;
  }

  // List KYC records with pagination
  async listKYCRecords(
    page: number = 1,
    limit: number = 20,
    filters?: {
      identityId?: string;
      level?: KYCLevel;
      status?: VerificationStatus;
    }
  ): Promise<{
    items: KYCRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let filtered = Array.from(store.records.values());

    if (filters?.identityId) {
      filtered = filtered.filter(r => r.identityId === filters.identityId);
    }
    if (filters?.level) {
      filtered = filtered.filter(r => r.level === filters.level);
    }
    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, totalPages };
  }

  // Get KYC expiry status
  async getKYCExpiryStatus(identityId: string): Promise<{
    isExpired: boolean;
    daysUntilExpiry?: number;
    expiredAt?: string;
  }> {
    const record = await this.getKYCByIdentity(identityId);
    if (!record || record.status !== "verified" || !record.expiresAt) {
      return { isExpired: false };
    }

    const now = new Date();
    const expiry = new Date(record.expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { isExpired: true, expiredAt: record.expiresAt };
    }

    return { isExpired: false, daysUntilExpiry };
  }
}

export const kycService = new KYCService();
