/**
 * KYC Records Model
 * Know Your Customer verification records
 */

export enum KYCStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  IN_REVIEW = 'IN_REVIEW',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED'
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  NATIONAL_ID = 'NATIONAL_ID',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  UTILITY_BILL = 'UTILITY_BILL',
  BANK_STATEMENT = 'BANK_STATEMENT',
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
  SELFIE = 'SELFIE',
  PROOF_OF_FUNDS = 'PROOF_OF_FUNDS',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION'
}

export enum VerificationLevel {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  ENHANCED = 'ENHANCED',
  PREMIUM = 'PREMIUM'
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  documentNumber?: string;
  issuingCountry: string;
  expiryDate: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  fileUrl?: string;
  uploadedAt: Date;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  email: string;
  phone?: string;
  address: Address;
}

export interface BusinessInfo {
  businessName: string;
  registrationNumber: string;
  businessType: string;
  incorporationDate: Date;
  registeredAddress: Address;
  taxId?: string;
}

export interface KYCDocument {
  id: string;
  userId: string;
  personalInfo?: PersonalInfo;
  businessInfo?: BusinessInfo;
  documents: Document[];
  verificationLevel: VerificationLevel;
  status: KYCStatus;
  riskScore: number;
  riskFactors: string[];
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface KYCRequest {
  userId: string;
  verificationLevel: VerificationLevel;
  personalInfo?: PersonalInfo;
  businessInfo?: BusinessInfo;
  documents?: Document[];
}

export interface KYCVerification {
  kycId: string;
  verifierId: string;
  verificationType: 'document' | 'address' | 'background' | 'enhanced';
  result: 'approved' | 'rejected' | 'needs_more_info';
  notes?: string;
  verifiedAt: Date;
}

// In-memory KYC store
export class KYCStore {
  private kycRecords: Map<string, KYCDocument> = new Map();
  private userKycMap: Map<string, string> = new Map(); // userId -> kycId

  createKYC(request: KYCRequest): KYCDocument {
    const id = `KYC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Calculate expiry based on verification level
    let expiresAt: Date;
    switch (request.verificationLevel) {
      case VerificationLevel.BASIC:
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      case VerificationLevel.STANDARD:
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 2));
        break;
      case VerificationLevel.ENHANCED:
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 3));
        break;
      case VerificationLevel.PREMIUM:
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 5));
        break;
      default:
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    const kycRecord: KYCDocument = {
      id,
      userId: request.userId,
      personalInfo: request.personalInfo,
      businessInfo: request.businessInfo,
      documents: request.documents || [],
      verificationLevel: request.verificationLevel,
      status: KYCStatus.PENDING_DOCUMENTS,
      riskScore: 0,
      riskFactors: [],
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.kycRecords.set(id, kycRecord);
    this.userKycMap.set(request.userId, id);

    return kycRecord;
  }

  getKYCById(id: string): KYCDocument | undefined {
    return this.kycRecords.get(id);
  }

  getKYCByUserId(userId: string): KYCDocument | undefined {
    const kycId = this.userKycMap.get(userId);
    return kycId ? this.kycRecords.get(kycId) : undefined;
  }

  getAllKYCRecords(): KYCDocument[] {
    return Array.from(this.kycRecords.values());
  }

  getKYCByStatus(status: KYCStatus): KYCDocument[] {
    return Array.from(this.kycRecords.values()).filter(k => k.status === status);
  }

  getExpiredKYC(): KYCDocument[] {
    const now = new Date();
    return Array.from(this.kycRecords.values()).filter(
      k => k.expiresAt && new Date(k.expiresAt) < now
    );
  }

  updateKYC(id: string, updates: Partial<KYCDocument>): KYCDocument | undefined {
    const kyc = this.kycRecords.get(id);
    if (!kyc) return undefined;

    const updatedKYC: KYCDocument = {
      ...kyc,
      ...updates,
      id,
      updatedAt: new Date()
    };

    this.kycRecords.set(id, updatedKYC);
    return updatedKYC;
  }

  addDocument(kycId: string, document: Document): KYCDocument | undefined {
    const kyc = this.kycRecords.get(kycId);
    if (!kyc) return undefined;

    kyc.documents.push(document);
    kyc.updatedAt = new Date();

    // Auto-update status if all required docs are uploaded
    if (kyc.status === KYCStatus.PENDING_DOCUMENTS && kyc.documents.length > 0) {
      kyc.status = KYCStatus.IN_REVIEW;
    }

    this.kycRecords.set(kycId, kyc);
    return kyc;
  }

  verifyDocument(kycId: string, documentId: string, verification: {
    status: 'verified' | 'rejected';
    verifiedBy: string;
    rejectionReason?: string;
  }): KYCDocument | undefined {
    const kyc = this.kycRecords.get(kycId);
    if (!kyc) return undefined;

    const document = kyc.documents.find(d => d.id === documentId);
    if (!document) return undefined;

    document.verificationStatus = verification.status;
    document.verifiedAt = new Date();
    document.verifiedBy = verification.verifiedBy;
    document.rejectionReason = verification.rejectionReason;
    kyc.updatedAt = new Date();

    this.kycRecords.set(kycId, kyc);
    return kyc;
  }

  approveKYC(kycId: string, verifiedBy: string): KYCDocument | undefined {
    const kyc = this.kycRecords.get(kycId);
    if (!kyc) return undefined;

    kyc.status = KYCStatus.VERIFIED;
    kyc.verifiedAt = new Date();
    kyc.verifiedBy = verifiedBy;
    kyc.updatedAt = new Date();

    this.kycRecords.set(kycId, kyc);
    return kyc;
  }

  rejectKYC(kycId: string, verifiedBy: string, reason: string): KYCDocument | undefined {
    const kyc = this.kycRecords.get(kycId);
    if (!kyc) return undefined;

    kyc.status = KYCStatus.REJECTED;
    kyc.rejectionReason = reason;
    kyc.verifiedAt = new Date();
    kyc.verifiedBy = verifiedBy;
    kyc.updatedAt = new Date();

    this.kycRecords.set(kycId, kyc);
    return kyc;
  }

  deleteKYC(id: string): boolean {
    const kyc = this.kycRecords.get(id);
    if (kyc) {
      this.userKycMap.delete(kyc.userId);
    }
    return this.kycRecords.delete(id);
  }

  // Risk assessment
  calculateRiskScore(kycId: string): number {
    const kyc = this.kycRecords.get(kycId);
    if (!kyc) return 0;

    let score = 0;
    const factors: string[] = [];

    // Age factor
    if (kyc.personalInfo?.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(kyc.personalInfo.dateOfBirth).getFullYear();
      if (age < 25) {
        score += 10;
        factors.push('Young account holder');
      }
    }

    // Document verification
    const verifiedDocs = kyc.documents.filter(d => d.verificationStatus === 'verified').length;
    if (verifiedDocs < kyc.documents.length) {
      score += 20;
      factors.push('Incomplete document verification');
    }

    // Business accounts are higher risk
    if (kyc.businessInfo) {
      score += 15;
      factors.push('Business account');
    }

    // High-risk countries (simplified check)
    if (kyc.personalInfo?.address.country) {
      const highRiskCountries = ['XX', 'YY']; // Placeholder
      if (highRiskCountries.includes(kyc.personalInfo.address.country)) {
        score += 30;
        factors.push('High-risk jurisdiction');
      }
    }

    kyc.riskScore = Math.min(score, 100);
    kyc.riskFactors = factors;
    this.kycRecords.set(kycId, kyc);

    return score;
  }
}

export const kycStore = new KYCStore();
