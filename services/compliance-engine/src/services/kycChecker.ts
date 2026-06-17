/**
 * KYC Checker Service
 * Performs KYC verification checks
 */

import { KYCDocument, KYCStatus, VerificationLevel } from '../models/KYC';

export interface KYCCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  required: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export class KYCChecker {
  private minimumAge: number;

  constructor() {
    this.minimumAge = parseInt(process.env.MIN_AGE || '18', 10);
  }

  /**
   * Perform all KYC checks on a document
   */
  async performAllChecks(kyc: KYCDocument): Promise<KYCCheck[]> {
    const checks: KYCCheck[] = [];

    checks.push(this.checkVerificationLevel(kyc));
    checks.push(this.checkDocumentCompleteness(kyc));
    checks.push(this.checkDocumentValidity(kyc));
    checks.push(this.checkPersonalInfo(kyc));
    checks.push(this.checkAgeRequirement(kyc));
    checks.push(this.checkAddressVerification(kyc));
    checks.push(this.checkHighRiskIndicators(kyc));

    if (kyc.verificationLevel === VerificationLevel.ENHANCED ||
        kyc.verificationLevel === VerificationLevel.PREMIUM) {
      checks.push(this.checkBusinessVerification(kyc));
      checks.push(this.checkSourceOfFunds(kyc));
    }

    return checks;
  }

  /**
   * Check if verification level is appropriate
   */
  checkVerificationLevel(kyc: KYCDocument): KYCCheck {
    if (kyc.status === KYCStatus.VERIFIED) {
      return {
        name: 'Verification Level',
        status: 'pass',
        required: true,
        message: 'KYC verification completed',
        details: { level: kyc.verificationLevel }
      };
    }

    if (kyc.status === KYCStatus.REJECTED) {
      return {
        name: 'Verification Level',
        status: 'fail',
        required: true,
        message: 'KYC has been rejected'
      };
    }

    return {
      name: 'Verification Level',
      status: 'warning',
      required: true,
      message: 'KYC verification is in progress',
      details: { level: kyc.verificationLevel, status: kyc.status }
    };
  }

  /**
   * Check if all required documents are uploaded
   */
  checkDocumentCompleteness(kyc: KYCDocument): KYCCheck {
    const requiredDocs = this.getRequiredDocumentTypes(kyc.verificationLevel);
    const uploadedTypes = kyc.documents.map(d => d.type);

    const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));

    if (missingDocs.length === 0) {
      return {
        name: 'Document Completeness',
        status: 'pass',
        required: true,
        message: 'All required documents uploaded',
        details: { uploadedCount: kyc.documents.length, requiredCount: requiredDocs.length }
      };
    }

    return {
      name: 'Document Completeness',
      status: 'fail',
      required: true,
      message: `Missing required documents: ${missingDocs.join(', ')}`,
      details: { missingDocs, uploadedTypes }
    };
  }

  /**
   * Check if documents are valid and not expired
   */
  checkDocumentValidity(kyc: KYCDocument): KYCCheck {
    const now = new Date();
    const expiredDocs = kyc.documents.filter(doc => new Date(doc.expiryDate) < now);

    if (expiredDocs.length > 0) {
      return {
        name: 'Document Validity',
        status: 'fail',
        required: true,
        message: 'Some documents have expired',
        details: { expiredDocs: expiredDocs.map(d => d.type) }
      };
    }

    const pendingDocs = kyc.documents.filter(doc => doc.verificationStatus === 'pending');

    if (pendingDocs.length > 0) {
      return {
        name: 'Document Validity',
        status: 'warning',
        required: false,
        message: 'Some documents are pending verification',
        details: { pendingDocs: pendingDocs.map(d => d.type) }
      };
    }

    const rejectedDocs = kyc.documents.filter(doc => doc.verificationStatus === 'rejected');

    if (rejectedDocs.length > 0) {
      return {
        name: 'Document Validity',
        status: 'fail',
        required: true,
        message: 'Some documents have been rejected',
        details: { rejectedDocs: rejectedDocs.map(d => ({ type: d.type, reason: d.rejectionReason })) }
      };
    }

    return {
      name: 'Document Validity',
      status: 'pass',
      required: true,
      message: 'All documents are valid',
      details: { verifiedCount: kyc.documents.filter(d => d.verificationStatus === 'verified').length }
    };
  }

  /**
   * Check if personal information is complete
   */
  checkPersonalInfo(kyc: KYCDocument): KYCCheck {
    if (!kyc.personalInfo) {
      return {
        name: 'Personal Information',
        status: 'fail',
        required: true,
        message: 'Personal information is missing'
      };
    }

    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'email', 'address'];
    const missingFields = requiredFields.filter(field => !kyc.personalInfo![field as keyof typeof kyc.personalInfo]);

    if (missingFields.length > 0) {
      return {
        name: 'Personal Information',
        status: 'fail',
        required: true,
        message: `Missing personal information fields: ${missingFields.join(', ')}`,
        details: { missingFields }
      };
    }

    return {
      name: 'Personal Information',
      status: 'pass',
      required: true,
      message: 'Personal information is complete',
      details: {
        firstName: kyc.personalInfo.firstName,
        lastName: kyc.personalInfo.lastName,
        nationality: kyc.personalInfo.nationality
      }
    };
  }

  /**
   * Check if user meets minimum age requirement
   */
  checkAgeRequirement(kyc: KYCDocument): KYCCheck {
    if (!kyc.personalInfo?.dateOfBirth) {
      return {
        name: 'Age Requirement',
        status: 'fail',
        required: true,
        message: 'Date of birth not provided'
      };
    }

    const age = this.calculateAge(new Date(kyc.personalInfo.dateOfBirth));

    if (age < this.minimumAge) {
      return {
        name: 'Age Requirement',
        status: 'fail',
        required: true,
        message: `User must be at least ${this.minimumAge} years old`,
        details: { age, minimumRequired: this.minimumAge }
      };
    }

    if (age > 120) {
      return {
        name: 'Age Requirement',
        status: 'fail',
        required: true,
        message: 'Invalid date of birth',
        details: { age }
      };
    }

    return {
      name: 'Age Requirement',
      status: 'pass',
      required: true,
      message: 'Age requirement met',
      details: { age }
    };
  }

  /**
   * Check address verification status
   */
  checkAddressVerification(kyc: KYCDocument): KYCCheck {
    if (!kyc.personalInfo?.address) {
      return {
        name: 'Address Verification',
        status: 'fail',
        required: true,
        message: 'Address not provided'
      };
    }

    const address = kyc.personalInfo.address;
    const addressFields = [address.street, address.city, address.postalCode, address.country];
    const missingFields = addressFields.filter(f => !f || f.trim().length === 0);

    if (missingFields.length > 0) {
      return {
        name: 'Address Verification',
        status: 'fail',
        required: true,
        message: 'Incomplete address information'
      };
    }

    // Check if proof of address document exists
    const addressDoc = kyc.documents.find(d =>
      d.type === 'PROOF_OF_ADDRESS' || d.type === 'UTILITY_BILL' || d.type === 'BANK_STATEMENT'
    );

    if (!addressDoc) {
      return {
        name: 'Address Verification',
        status: 'warning',
        required: false,
        message: 'Proof of address document recommended',
        details: { hasAddressDoc: false }
      };
    }

    if (addressDoc.verificationStatus !== 'verified') {
      return {
        name: 'Address Verification',
        status: 'warning',
        required: false,
        message: 'Address document pending verification',
        details: { addressDocStatus: addressDoc.verificationStatus }
      };
    }

    return {
      name: 'Address Verification',
      status: 'pass',
      required: false,
      message: 'Address verified',
      details: { hasAddressDoc: true, verified: true }
    };
  }

  /**
   * Check for high-risk indicators
   */
  checkHighRiskIndicators(kyc: KYCDocument): KYCCheck {
    const riskFactors: string[] = [];

    // Check nationality
    if (kyc.personalInfo?.nationality) {
      const highRiskNationalities = ['XX', 'YY']; // Placeholder - would be configurable
      if (highRiskNationalities.includes(kyc.personalInfo.nationality)) {
        riskFactors.push('High-risk nationality');
      }
    }

    // Check address country
    if (kyc.personalInfo?.address?.country) {
      const highRiskCountries = ['XX', 'YY']; // Placeholder
      if (highRiskCountries.includes(kyc.personalInfo.address.country)) {
        riskFactors.push('High-risk country');
      }
    }

    // Check for business accounts
    if (kyc.businessInfo) {
      riskFactors.push('Business account');
    }

    // Check risk score
    if (kyc.riskScore >= 50) {
      riskFactors.push('High risk score');
    }

    if (kyc.riskScore >= 70) {
      return {
        name: 'High Risk Indicators',
        status: 'fail',
        required: true,
        message: 'High-risk profile detected',
        details: { riskFactors, riskScore: kyc.riskScore }
      };
    }

    if (riskFactors.length > 0) {
      return {
        name: 'High Risk Indicators',
        status: 'warning',
        required: false,
        message: 'Some risk factors identified',
        details: { riskFactors, riskScore: kyc.riskScore }
      };
    }

    return {
      name: 'High Risk Indicators',
      status: 'pass',
      required: false,
      message: 'No high-risk indicators detected',
      details: { riskScore: kyc.riskScore }
    };
  }

  /**
   * Check business verification (enhanced/premium only)
   */
  checkBusinessVerification(kyc: KYCDocument): KYCCheck {
    if (!kyc.businessInfo) {
      return {
        name: 'Business Verification',
        status: 'fail',
        required: true,
        message: 'Business information required for enhanced verification',
        details: { level: kyc.verificationLevel }
      };
    }

    const requiredFields = ['businessName', 'registrationNumber', 'businessType', 'incorporationDate', 'registeredAddress'];
    const missingFields = requiredFields.filter(field => !kyc.businessInfo![field as keyof typeof kyc.businessInfo]);

    if (missingFields.length > 0) {
      return {
        name: 'Business Verification',
        status: 'fail',
        required: true,
        message: `Missing business information: ${missingFields.join(', ')}`
      };
    }

    const businessDoc = kyc.documents.find(d => d.type === 'BUSINESS_REGISTRATION');

    if (!businessDoc) {
      return {
        name: 'Business Verification',
        status: 'fail',
        required: true,
        message: 'Business registration document required'
      };
    }

    if (businessDoc.verificationStatus !== 'verified') {
      return {
        name: 'Business Verification',
        status: 'warning',
        required: true,
        message: 'Business document pending verification'
      };
    }

    return {
      name: 'Business Verification',
      status: 'pass',
      required: true,
      message: 'Business verified',
      details: { businessName: kyc.businessInfo.businessName }
    };
  }

  /**
   * Check source of funds documentation
   */
  checkSourceOfFunds(kyc: KYCDocument): KYCCheck {
    const fundsDoc = kyc.documents.find(d => d.type === 'PROOF_OF_FUNDS');

    if (!fundsDoc) {
      return {
        name: 'Source of Funds',
        status: 'warning',
        required: false,
        message: 'Proof of funds documentation recommended',
        details: { hasDocument: false }
      };
    }

    if (fundsDoc.verificationStatus !== 'verified') {
      return {
        name: 'Source of Funds',
        status: 'warning',
        required: false,
        message: 'Source of funds document pending verification'
      };
    }

    return {
      name: 'Source of Funds',
      status: 'pass',
      required: false,
      message: 'Source of funds verified',
      details: { hasDocument: true, verified: true }
    };
  }

  /**
   * Get required document types for verification level
   */
  private getRequiredDocumentTypes(level: VerificationLevel): string[] {
    switch (level) {
      case VerificationLevel.BASIC:
        return ['PASSPORT'];
      case VerificationLevel.STANDARD:
        return ['PASSPORT', 'PROOF_OF_ADDRESS'];
      case VerificationLevel.ENHANCED:
        return ['PASSPORT', 'PROOF_OF_ADDRESS', 'PROOF_OF_FUNDS'];
      case VerificationLevel.PREMIUM:
        return ['PASSPORT', 'PROOF_OF_ADDRESS', 'PROOF_OF_FUNDS', 'BUSINESS_REGISTRATION'];
      default:
        return ['PASSPORT'];
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

export const kycChecker = new KYCChecker();
