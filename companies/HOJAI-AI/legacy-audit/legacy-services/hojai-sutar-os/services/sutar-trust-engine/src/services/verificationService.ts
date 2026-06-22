import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import trustService from './trustService';
import {
  IVerificationRequest,
  IVerificationResult,
  IKYCRequest,
  VerificationStatus,
  KYCStatus,
  VerificationBadge,
  VerifyEntityRequest,
  VerificationResponse,
  KYCResponse,
  KYCMergeRequest,
} from '../types';

// In-memory stores
const verificationStore = new Map<string, IVerificationRequest>();
const kycStore = new Map<string, IKYCRequest>();

export class VerificationService {
  /**
   * Initiate entity verification
   */
  async verifyEntity(request: VerifyEntityRequest): Promise<VerificationResponse> {
    const { entityId, verificationType, documents } = request;

    const requestId = uuidv4();

    const verificationRequest: IVerificationRequest = {
      requestId,
      entityId,
      entityType: 'user',
      verificationType,
      status: 'pending',
      documents: (documents || []).map(doc => ({
        documentId: uuidv4(),
        type: doc.type,
        url: doc.url,
        status: 'pending',
        uploadedAt: new Date(),
        verifiedAt: null,
      })),
      submittedAt: new Date(),
      completedAt: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    verificationStore.set(requestId, verificationRequest);

    logger.info(`Verification request created: ${requestId} for entity ${entityId}`);

    // Simulate async verification process
    const result = await this.processVerification(verificationRequest);

    return {
      requestId,
      entityId,
      verificationType,
      status: result.isVerified ? 'verified' : 'rejected',
      result,
      completedAt: result.isVerified ? new Date() : null,
    };
  }

  /**
   * Process verification (simulated)
   */
  private async processVerification(request: IVerificationRequest): Promise<IVerificationResult> {
    // In production, this would call external verification services
    // For now, simulate based on document presence
    const hasDocuments = request.documents.length > 0;

    const result: IVerificationResult = {
      isVerified: hasDocuments,
      confidence: hasDocuments ? 85 : 50,
      verifiedFields: hasDocuments ? ['identity', 'documents'] : [],
      failedFields: hasDocuments ? [] : ['identity'],
      riskIndicators: hasDocuments ? [] : ['missing_documents'],
      notes: hasDocuments ? 'Verification completed successfully' : 'Verification requires documents',
    };

    // Update verification request
    request.status = result.isVerified ? 'verified' : 'rejected';
    request.completedAt = new Date();
    request.verificationResult = result;

    request.documents.forEach(doc => {
      if (result.isVerified) {
        doc.status = 'verified';
        doc.verifiedAt = new Date();
      }
    });

    verificationStore.set(request.requestId, request);

    // Update trust score badges if verified
    if (result.isVerified) {
      const badge = this.getBadgeForVerificationType(request.verificationType);
      if (badge) {
        trustService.updateTrustScore(request.entityId, { badges: [badge] }, `Verification completed: ${request.verificationType}`);
      }
    }

    return result;
  }

  /**
   * Get badge for verification type
   */
  private getBadgeForVerificationType(type: string): VerificationBadge | null {
    const badgeMap: Record<string, VerificationBadge> = {
      'kyc': 'kyc_verified',
      'kyb': 'business_verified',
      'document': 'document_verified',
      'address': 'address_verified',
      'bank': 'bank_verified',
      'biometric': 'biometric_verified',
      'video': 'video_verified',
    };
    return badgeMap[type] || null;
  }

  /**
   * Get verification request by ID
   */
  getVerificationRequest(requestId: string): IVerificationRequest | null {
    return verificationStore.get(requestId) || null;
  }

  /**
   * Get all verification requests for an entity
   */
  getEntityVerifications(entityId: string): IVerificationRequest[] {
    const verifications: IVerificationRequest[] = [];
    verificationStore.forEach(request => {
      if (request.entityId === entityId) {
        verifications.push(request);
      }
    });
    return verifications;
  }

  /**
   * Process KYC verification
   */
  async processKYC(request: KYCMergeRequest): Promise<KYCResponse> {
    const { entityId, personalInfo, documents } = request;

    const requestId = uuidv4();

    const kycRequest: IKYCRequest = {
      requestId,
      entityId,
      personalInfo,
      documents: documents.map(doc => ({
        documentId: uuidv4(),
        type: doc.type,
        url: doc.url,
        status: 'pending',
        uploadedAt: new Date(),
        verifiedAt: null,
      })),
      status: 'submitted',
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
    };

    kycStore.set(requestId, kycRequest);

    logger.info(`KYC request submitted: ${requestId} for entity ${entityId}`);

    // Simulate KYC verification
    const isVerified = await this.simulateKYCVerification(kycRequest);

    if (isVerified) {
      trustService.updateTrustScore(entityId, {
        verificationScore: {
          score: 100,
          kycStatus: 'verified',
          kybStatus: 'not_started',
          documentsVerified: documents.length,
          verificationBadges: ['kyc_verified', 'document_verified'],
          lastVerificationDate: new Date(),
        },
        badges: ['kyc_verified', 'document_verified'],
      }, 'KYC verification completed');
    }

    return {
      requestId,
      entityId,
      status: isVerified ? 'verified' : 'rejected',
      verificationBadges: isVerified ? ['kyc_verified', 'document_verified'] : [],
      verifiedAt: isVerified ? new Date() : null,
      expiresAt: isVerified ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
    };
  }

  /**
   * Simulate KYC verification
   */
  private async simulateKYCVerification(kycRequest: IKYCRequest): Promise<boolean> {
    // In production, this would call external KYC services
    // For now, verify if documents are provided
    return kycRequest.documents.length >= 2;
  }

  /**
   * Get KYC request by ID
   */
  getKYCRequest(requestId: string): IKYCRequest | null {
    return kycStore.get(requestId) || null;
  }

  /**
   * Get KYC status for an entity
   */
  getEntityKYCStatus(entityId: string): KYCStatus | null {
    for (const kyc of kycStore.values()) {
      if (kyc.entityId === entityId && kyc.status === 'verified') {
        return 'verified';
      }
    }
    return null;
  }

  /**
   * Check verification status
   */
  getVerificationStatus(entityId: string): {
    kyc: KYCStatus;
    badges: VerificationBadge[];
    verificationCount: number;
  } {
    const badges: VerificationBadge[] = [];
    let verificationCount = 0;

    // Collect badges from trust score
    const trustScore = trustService.getTrustScore(entityId);
    if (trustScore) {
      badges.push(...trustScore.badges);
      verificationCount = trustScore.verificationScore.documentsVerified;
    }

    // Check KYC status
    let kyc: KYCStatus = 'not_started';
    for (const kycRequest of kycStore.values()) {
      if (kycRequest.entityId === entityId) {
        kyc = kycRequest.status;
        break;
      }
    }

    return {
      kyc,
      badges: [...new Set(badges)],
      verificationCount,
    };
  }

  /**
   * Expire old verification requests
   */
  async expireOldVerifications(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    verificationStore.forEach((request, requestId) => {
      if (request.expiresAt && request.expiresAt < now && request.status === 'verified') {
        request.status = 'expired';
        verificationStore.set(requestId, request);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} verification requests`);
    }

    return expiredCount;
  }
}

export default new VerificationService();
