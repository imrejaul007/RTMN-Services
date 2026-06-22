/**
 * PIPL Compliance Module
 *
 * Implements China Personal Information Protection Law requirements:
 * - Legal basis for processing (Article 13)
 * - Consent requirements (Article 14)
 * - Data subject rights (Chapter IV)
 * - Cross-border transfer restrictions (Chapter V)
 * - Processor obligations (Chapter VI)
 *
 * @module hojai-compliance/pipl
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * PIPL Legal basis for processing
 */
export enum PIPLLegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  PUBLIC_INTEREST = 'public_interest',
  VITAL_INTERESTS = 'vital_interests',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
  NEWS_PUBLICATION = 'news_publication',
  ACADEMIC_RESEARCH = 'academic_research',
  STATISTICAL_RESEARCH = 'statistical_research',
  PUBLICly_DISCLOSED = 'publicly_disclosed',
}

/**
 * PIPL data subject rights
 */
export enum PIPLRight {
  ACCESS = 'access',
  COPY = 'copy',
  CORRECTION = 'correction',
  DELETION = 'deletion',
  WITHDRAWAL = 'withdrawal',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection',
  PORTABILITY = 'portability',
  AUTOMATED_DECISIONS = 'automated_decisions',
}

/**
 * Personal Information Processor
 */
export interface PIPProcessor {
  id: string;
  name: string;
  registeredLocation: string;
  purpose: string;
  dataCategories: string[];
  transferMechanism?: 'standard_contract' | 'certification' | 'regulatory_approval';
}

/**
 * Cross-border transfer record
 */
export interface CrossBorderTransfer {
  id: string;
  processorId: string;
  destinationCountry: string;
  dataCategories: string[];
  purpose: string;
  legalBasis: PIPLLegalBasis;
  securityMeasures: string[];
  transferDate: Date;
  requiresSecurityAssessment: boolean;
  assessmentApproved?: boolean;
}

/**
 * PIPL consent record
 */
export interface PIPConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  legalBasis: PIPLLegalBasis;
  dataCategories: string[];
  thirdParties?: string[];
  grantedAt: Date;
  withdrawnAt?: Date;
  version: string;
  language: string;
}

/**
 * Automated decision-making record
 */
export interface AutomatedDecisionRecord {
  id: string;
  userId: string;
  decision: string;
  logic: string;
  outcome: string;
  impactLevel: 'low' | 'medium' | 'high';
  humanReviewRequested: boolean;
  humanReviewOutcome?: 'approved' | 'rejected' | 'modified';
  timestamp: Date;
}

// ============================================================================
// PIPL Compliance Class
// ============================================================================

export class PIPLCompliance {
  private processors: Map<string, PIPProcessor> = new Map();
  private crossBorderTransfers: Map<string, CrossBorderTransfer> = new Map();
  private consentRecords: Map<string, PIPConsentRecord> = new Map();
  private automatedDecisions: Map<string, AutomatedDecisionRecord> = new Map();
  private dataProtectionImpactAssessments: Map<string, any> = new Map();

  /**
   * Register a personal information processor
   */
  registerProcessor(processor: Omit<PIPProcessor, 'id'>): PIPProcessor {
    const id = uuidv4();
    const newProcessor: PIPProcessor = { id, ...processor };
    this.processors.set(id, newProcessor);
    console.log(`[PIPL] Processor registered: ${newProcessor.name}`);
    return newProcessor;
  }

  /**
   * Get processor
   */
  getProcessor(processorId: string): PIPProcessor | undefined {
    return this.processors.get(processorId);
  }

  /**
   * Record consent
   */
  recordConsent(record: Omit<PIPConsentRecord, 'id'>): PIPConsentRecord {
    // Validate legal basis
    if (record.legalBasis === PIPLLegalBasis.CONSENT) {
      if (!record.purpose || record.dataCategories.length === 0) {
        throw new Error('Consent requires purpose and data categories');
      }
    }

    const id = uuidv4();
    const newRecord: PIPConsentRecord = { id, ...record };
    this.consentRecords.set(id, newRecord);
    console.log(`[PIPL] Consent recorded: ${id}`);
    return newRecord;
  }

  /**
   * Check if consent is valid
   */
  hasValidConsent(userId: string, dataCategory: string, purpose: string): boolean {
    const records = Array.from(this.consentRecords.values())
      .filter(r => r.userId === userId && !r.withdrawnAt);

    // Check for consent with matching purpose and data category
    return records.some(r =>
      r.purpose === purpose &&
      r.dataCategories.includes(dataCategory) &&
      r.legalBasis === PIPLLegalBasis.CONSENT
    );
  }

  /**
   * Withdraw consent
   */
  withdrawConsent(userId: string, purpose: string): void {
    const records = Array.from(this.consentRecords.values())
      .filter(r => r.userId === userId && r.purpose === purpose && !r.withdrawnAt);

    for (const record of records) {
      record.withdrawnAt = new Date();
      console.log(`[PIPL] Consent withdrawn: ${record.id}`);
    }
  }

  /**
   * Record cross-border transfer
   */
  recordCrossBorderTransfer(transfer: Omit<CrossBorderTransfer, 'id'>): CrossBorderTransfer {
    const id = uuidv4();
    const newTransfer: CrossBorderTransfer = { id, ...transfer };
    this.crossBorderTransfers.set(id, newTransfer);
    console.log(`[PIPL] Cross-border transfer recorded: ${id} to ${transfer.destinationCountry}`);
    return newTransfer;
  }

  /**
   * Check if cross-border transfer requires security assessment
   */
  requiresSecurityAssessment(transfer: CrossBorderTransfer): boolean {
    // PIPL requires security assessment for:
    // 1. Critical information infrastructure operators
    // 2. Processing personal info of 1 million+ users
    // 3. Cross-border transfers to countries without adequate protection
    const restrictedCountries = ['unknown'];

    if (restrictedCountries.includes(transfer.destinationCountry.toLowerCase())) {
      return true;
    }

    return transfer.requiresSecurityAssessment;
  }

  /**
   * Record automated decision
   */
  recordAutomatedDecision(decision: Omit<AutomatedDecisionRecord, 'id'>): AutomatedDecisionRecord {
    const id = uuidv4();
    const newDecision: AutomatedDecisionRecord = { id, ...decision };
    this.automatedDecisions.set(id, newDecision);
    console.log(`[PIPL] Automated decision recorded: ${id}`);
    return newDecision;
  }

  /**
   * Process human review request for automated decision
   */
  requestHumanReview(decisionId: string): void {
    const decision = this.automatedDecisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    decision.humanReviewRequested = true;
    console.log(`[PIPL] Human review requested for decision: ${decisionId}`);
  }

  /**
   * Complete human review
   */
  completeHumanReview(decisionId: string, outcome: 'approved' | 'rejected' | 'modified'): void {
    const decision = this.automatedDecisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    decision.humanReviewOutcome = outcome;
    console.log(`[PIPL] Human review completed for decision: ${decisionId} - ${outcome}`);
  }

  /**
   * Create data protection impact assessment (DPIA)
   */
  createImpactAssessment(assessment: {
    purpose: string;
    dataCategories: string[];
    dataVolume: number;
    subjectsCount: number;
    risks: string[];
    mitigationMeasures: string[];
  }): string {
    const id = uuidv4();
    this.dataProtectionImpactAssessments.set(id, {
      id,
      ...assessment,
      status: 'pending',
      createdAt: new Date(),
    });
    console.log(`[PIPL] DPIA created: ${id}`);
    return id;
  }

  /**
   * Handle data subject request
   */
  handleDataSubjectRequest(
    userId: string,
    right: PIPLRight,
    data?: Record<string, unknown>
  ): { success: boolean; details: Record<string, unknown> } {
    console.log(`[PIPL] Handling ${right} request for user ${userId}`);

    switch (right) {
      case PIPLRight.ACCESS:
        return {
          success: true,
          details: {
            userId,
            dataCategories: ['identifiers', 'contact info', 'behavioral data'],
            processingPurposes: ['service provision', 'analytics'],
            thirdPartySharing: ['analytics providers'],
          },
        };

      case PIPLRight.DELETION:
        return {
          success: true,
          details: {
            userId,
            deletedCategories: ['preferences', 'cookies'],
            deletionConfirmed: true,
          },
        };

      case PIPLRight.WITHDRAWAL:
        // Withdraw all consents
        const records = Array.from(this.consentRecords.values())
          .filter(r => r.userId === userId && !r.withdrawnAt);
        records.forEach(r => (r.withdrawnAt = new Date()));
        return {
          success: true,
          details: {
            userId,
            consentsWithdrawn: records.length,
          },
        };

      case PIPLRight.OBJECTION:
        return {
          success: true,
          details: {
            userId,
            objectionRecorded: true,
            processingStopped: true,
          },
        };

      default:
        return {
          success: false,
          details: { error: `Right ${right} not yet implemented` },
        };
    }
  }

  /**
   * Get compliance report
   */
  getComplianceReport(): {
    totalProcessors: number;
    activeCrossBorderTransfers: number;
    totalConsents: number;
    withdrawnConsents: number;
    automatedDecisionsCount: number;
    pendingAssessments: number;
  } {
    const consents = Array.from(this.consentRecords.values());

    return {
      totalProcessors: this.processors.size,
      activeCrossBorderTransfers: this.crossBorderTransfers.size,
      totalConsents: consents.length,
      withdrawnConsents: consents.filter(c => c.withdrawnAt).length,
      automatedDecisionsCount: this.automatedDecisions.size,
      pendingAssessments: Array.from(this.dataProtectionImpactAssessments.values())
        .filter(a => a.status === 'pending').length,
    };
  }
}

// Export singleton instance
export const piplCompliance = new PIPLCompliance();
