import { v4 as uuidv4 } from 'uuid';
import { VerificationModel, IVerification } from '../models/Verification';
import { TrustScoreModel } from '../models/TrustScore';
import {
  EntityType,
  VerificationMethod,
  VerificationRequest,
  VerificationResponse,
  VerificationStatus,
  VerificationLevel,
} from '../types';
import logger from '../utils/logger';

export class VerificationService {
  // Verification method scores
  private methodScores: Record<VerificationMethod, number> = {
    email: 20,
    phone: 25,
    document: 40,
    bank: 45,
    social: 30,
    kyc: 70,
    biometric: 80,
  };

  // Level thresholds
  private levelThresholds: Record<VerificationLevel, number> = {
    none: 0,
    basic: 20,
    standard: 50,
    enhanced: 70,
    full: 90,
  };

  /**
   * Initiate a new verification request
   */
  async initiateVerification(request: VerificationRequest): Promise<IVerification> {
    const { entityId, entityType, method, data, tenantId = 'default' } = request;

    // Check for existing pending verification
    const existing = await VerificationModel.findOne({
      entityId,
      entityType,
      tenantId,
      method,
      status: { $in: ['pending', 'in_progress'] },
    });

    if (existing) {
      logger.warn(`Verification already in progress for ${entityType}:${entityId}`, {
        method,
        verificationId: existing._id,
      });
      return existing;
    }

    const verification = new VerificationModel({
      entityId,
      entityType,
      tenantId,
      method,
      status: 'pending',
      level: 'basic',
      provider: this.getProviderForMethod(method),
      data: this.sanitizeData(data),
      score: 0,
      attempts: [],
      documents: [],
    });

    await verification.save();

    logger.info(`Verification initiated for ${entityType}:${entityId}`, {
      method,
      verificationId: verification._id,
    });

    // Trigger async verification process
    this.processVerification(verification._id!.toString(), data);

    return verification;
  }

  /**
   * Process verification (async - would integrate with external providers)
   */
  private async processVerification(
    verificationId: string,
    data: Record<string, any>
  ): Promise<void> {
    const verification = await VerificationModel.findById(verificationId);
    if (!verification) return;

    try {
      verification.status = 'in_progress';
      await verification.save();

      // Simulate external verification (would call actual providers)
      const result = await this.verifyWithProvider(verification.method, data);

      if (result.success) {
        verification.verify('system', result.score || this.methodScores[verification.method]);
        verification.referenceId = result.referenceId;

        if (result.documents) {
          verification.documents = result.documents;
        }

        await verification.save();

        // Update trust score
        await this.updateTrustScoreFromVerification(verification);

        logger.info(`Verification completed successfully for ${verification.entityType}:${verification.entityId}`, {
          method: verification.method,
          score: verification.score,
        });
      } else {
        verification.reject(result.reason || 'Verification failed');
        await verification.save();

        logger.warn(`Verification rejected for ${verification.entityType}:${verification.entityId}`, {
          method: verification.method,
          reason: result.reason,
        });
      }
    } catch (error) {
      logger.error(`Verification process error`, {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      verification.status = 'pending';
      await verification.save();
    }
  }

  /**
   * Verify with external provider (simulated)
   */
  private async verifyWithProvider(
    method: VerificationMethod,
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    score?: number;
    referenceId?: string;
    reason?: string;
    documents?: any[];
  }> {
    // In production, this would call actual verification providers
    // Simulating verification logic based on data quality

    switch (method) {
      case 'email':
        return this.verifyEmail(data);
      case 'phone':
        return this.verifyPhone(data);
      case 'document':
        return this.verifyDocument(data);
      case 'bank':
        return this.verifyBank(data);
      case 'kyc':
        return this.verifyKYC(data);
      case 'biometric':
        return this.verifyBiometric(data);
      case 'social':
        return this.verifySocial(data);
      default:
        return { success: false, reason: 'Unknown verification method' };
    }
  }

  private verifyEmail(data: { email?: string }): any {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(data.email || '');

    return {
      success: isValid,
      score: isValid ? 20 : 0,
      referenceId: isValid ? `EMAIL-${Date.now()}` : undefined,
      reason: isValid ? undefined : 'Invalid email format',
    };
  }

  private verifyPhone(data: { phone?: string }): any {
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    const isValid = phoneRegex.test((data.phone || '').replace(/[\s-]/g, ''));

    return {
      success: isValid,
      score: isValid ? 25 : 0,
      referenceId: isValid ? `PHONE-${Date.now()}` : undefined,
      reason: isValid ? undefined : 'Invalid phone number',
    };
  }

  private verifyDocument(data: {
    documentType?: string;
    documentNumber?: string;
    documentUrl?: string;
  }): any {
    const hasRequired = data.documentType && data.documentNumber && data.documentUrl;

    return {
      success: hasRequired,
      score: hasRequired ? 40 : 0,
      referenceId: hasRequired ? `DOC-${Date.now()}` : undefined,
      reason: hasRequired ? undefined : 'Missing required document information',
      documents: hasRequired
        ? [{ type: data.documentType, url: data.documentUrl, verified: true }]
        : undefined,
    };
  }

  private verifyBank(data: { bankAccount?: string; routingNumber?: string }): any {
    const hasRequired = data.bankAccount && data.routingNumber;
    const isValidLength = data.bankAccount?.length === 10 && data.routingNumber?.length === 9;

    return {
      success: hasRequired && isValidLength,
      score: hasRequired && isValidLength ? 45 : 0,
      referenceId: hasRequired ? `BANK-${Date.now()}` : undefined,
      reason: hasRequired && !isValidLength ? 'Invalid account or routing number' : undefined,
    };
  }

  private verifyKYC(data: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    address?: string;
    ssn?: string;
  }): any {
    const hasRequired =
      data.firstName && data.lastName && data.dob && data.address && data.ssn;

    if (!hasRequired) {
      return { success: false, reason: 'Missing required KYC fields', score: 0 };
    }

    // Simulate KYC verification score based on data completeness
    let score = 50;
    if (data.firstName && data.lastName) score += 10;
    if (data.dob) score += 10;
    if (data.address && data.address.length > 10) score += 10;
    if (data.ssn && data.ssn.length === 9) score += 10;

    return {
      success: true,
      score: Math.min(70, score),
      referenceId: `KYC-${Date.now()}`,
    };
  }

  private verifyBiometric(data: { biometricData?: string; captureQuality?: number }): any {
    const hasData = data.biometricData;
    const quality = data.captureQuality || 0;
    const isHighQuality = quality >= 80;

    return {
      success: hasData && isHighQuality,
      score: hasData ? (isHighQuality ? 80 : 60) : 0,
      referenceId: hasData ? `BIO-${Date.now()}` : undefined,
      reason: !isHighQuality ? 'Biometric capture quality too low' : undefined,
    };
  }

  private verifySocial(data: { socialId?: string; provider?: string }): any {
    const hasRequired = data.socialId && data.provider;

    return {
      success: hasRequired,
      score: hasRequired ? 30 : 0,
      referenceId: hasRequired ? `${data.provider?.toUpperCase()}-${Date.now()}` : undefined,
      reason: hasRequired ? undefined : 'Missing social authentication data',
    };
  }

  /**
   * Get verification status
   */
  async getVerification(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<VerificationResponse[]> {
    const verifications = await VerificationModel.find({
      entityId,
      entityType,
      tenantId,
    }).sort({ createdAt: -1 });

    return verifications.map((v) => ({
      id: v._id!.toString(),
      entityId: v.entityId,
      method: v.method,
      status: v.status,
      level: v.level,
      score: v.score,
      verifiedAt: v.verifiedAt,
      expiresAt: v.expiresAt,
    }));
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(verificationId: string): Promise<IVerification | null> {
    return VerificationModel.findById(verificationId);
  }

  /**
   * Get aggregated verification level for an entity
   */
  async getEntityVerificationLevel(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<VerificationLevel> {
    const verifications = await VerificationModel.find({
      entityId,
      entityType,
      tenantId,
      status: 'verified',
    });

    if (verifications.length === 0) {
      return 'none';
    }

    // Calculate weighted verification level
    let totalScore = 0;
    let maxLevel: VerificationLevel = 'none';

    for (const v of verifications) {
      totalScore += v.score;

      if (v.score >= this.levelThresholds.full) {
        maxLevel = 'full';
      } else if (v.score >= this.levelThresholds.enhanced && maxLevel !== 'full') {
        maxLevel = 'enhanced';
      } else if (v.score >= this.levelThresholds.standard && maxLevel === 'none') {
        maxLevel = 'standard';
      } else if (v.score >= this.levelThresholds.basic && maxLevel === 'none') {
        maxLevel = 'basic';
      }
    }

    // Return the highest achieved level
    return maxLevel;
  }

  /**
   * Check and expire old verifications
   */
  async expireVerifications(): Promise<number> {
    const expired = await VerificationModel.findExpiredVerifications();

    for (const verification of expired) {
      verification.expire();
      await verification.save();
    }

    if (expired.length > 0) {
      logger.info(`Expired ${expired.length} verifications`);
    }

    return expired.length;
  }

  /**
   * Revoke a verification
   */
  async revokeVerification(
    verificationId: string,
    reason: string
  ): Promise<IVerification | null> {
    const verification = await VerificationModel.findById(verificationId);
    if (!verification) return null;

    verification.status = 'rejected';
    verification.rejectionReason = reason;
    await verification.save();

    // Update trust score
    await this.updateTrustScoreFromVerification(verification);

    return verification;
  }

  /**
   * Update trust score based on verification result
   */
  private async updateTrustScoreFromVerification(verification: IVerification): Promise<void> {
    const trustScore = await TrustScoreModel.findOne({
      entityId: verification.entityId,
      entityType: verification.entityType,
      tenantId: verification.tenantId,
    });

    if (!trustScore) return;

    // Get all active verifications
    const allVerifications = await VerificationModel.findActiveForEntity(
      verification.entityId,
      verification.entityType,
      verification.tenantId
    );

    const verifiedOnes = allVerifications.filter((v) => v.status === 'verified');
    if (verifiedOnes.length === 0) {
      trustScore.verified = false;
      trustScore.verificationLevel = 'none';
    } else {
      trustScore.verified = true;

      // Set verification status factor based on average score
      const avgScore = verifiedOnes.reduce((sum, v) => sum + v.score, 0) / verifiedOnes.length;
      trustScore.factors.verificationStatus = avgScore;

      // Update verification level
      trustScore.verificationLevel = this.getLevelFromScore(
        verifiedOnes.reduce((max, v) => (v.score > max ? v.score : max), 0)
      );
    }

    await trustScore.save();
  }

  private getLevelFromScore(score: number): VerificationLevel {
    if (score >= 90) return 'full';
    if (score >= 70) return 'enhanced';
    if (score >= 50) return 'standard';
    if (score >= 20) return 'basic';
    return 'none';
  }

  private getProviderForMethod(method: VerificationMethod): string {
    const providers: Record<VerificationMethod, string> = {
      email: 'internal',
      phone: 'internal',
      document: 'docverifier',
      bank: 'plaid',
      kyc: ' Jumio',
      biometric: 'bioauth',
      social: 'internal',
    };
    return providers[method] || 'internal';
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    // Remove sensitive data before storing
    const sanitized = { ...data };
    const sensitiveFields = ['ssn', 'password', 'pin', 'secret', 'token'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

export const verificationService = new VerificationService();
export default verificationService;
