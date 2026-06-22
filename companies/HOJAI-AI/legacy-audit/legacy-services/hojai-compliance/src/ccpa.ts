/**
 * CCPA Compliance Module
 *
 * Implements California Consumer Privacy Act requirements:
 * - Right to Know (Article 1)
 * - Right to Delete (Article 2)
 * - Right to Opt-Out (Article 3)
 * - Right to Non-Discrimination (Article 5)
 *
 * @module hojai-compliance/ccpa
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * CCPA Request Types
 */
export enum CCPAType {
  KNOW = 'know',           // Right to know what data is collected
  DELETE = 'delete',       // Right to delete personal information
  OPT_OUT = 'opt_out',     // Right to opt-out of sale
  OPT_IN = 'opt_in',       // Right to opt-in (for minors)
  NON_SALE = 'non_sale',   // Right to know if data is sold
}

/**
 * CCPA Request Status
 */
export enum CCPAStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  DENIED = 'denied',
  PARTIAL = 'partial',
}

/**
 * Sale of personal information
 */
export interface SaleRecord {
  id: string;
  userId: string;
  thirdPartyId: string;
  thirdPartyName: string;
  dataCategories: string[];
  purpose: string;
  saleDate: Date;
  optOut: boolean;
}

/**
 * CCPA Request
 */
export interface CCPATypeRequest {
  id: string;
  userId: string;
  requestType: CCPAType;
  status: CCPAStatus;
  submittedAt: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  deniedAt?: Date;
  denialReason?: string;
  dataProvided?: Record<string, unknown>;
  deletionConfirmed?: boolean;
  categoriesSold?: string[];
}

/**
 * Privacy notice
 */
export interface PrivacyNotice {
  version: string;
  lastUpdated: Date;
  effectiveDate: Date;
  categories: {
    personal: string[];
    sensitive: string[];
    sold: string[];
    shared: string[];
  };
  purposes: string[];
  thirdParties: string[];
  doNotSellLink: string;
}

/**
 * Opt-out preference signal
 */
export interface OptOutSignal {
  userId?: string;
  browserFingerprint?: string;
  confirmed: boolean;
  timestamp: Date;
  source: 'global_privacy_control' | 'opt_out_link' | 'email_request';
}

// ============================================================================
// CCPA Compliance Class
// ============================================================================

export class CCPATypeCompliance {
  private requests: Map<string, CCPATypeRequest> = new Map();
  private saleRecords: Map<string, SaleRecord> = new Map();
  private optOutSignals: Map<string, OptOutSignal> = new Map();
  private privacyNotices: PrivacyNotice[] = [];

  constructor() {
    // Initialize with default privacy notice
    this.privacyNotices.push({
      version: '1.0',
      lastUpdated: new Date(),
      effectiveDate: new Date('2020-01-01'),
      categories: {
        personal: ['identifiers', 'commercial info', 'internet activity'],
        sensitive: ['biometric', 'geolocation', 'health'],
        sold: ['advertising identifiers', 'purchase history'],
        shared: ['service providers', 'business partners'],
      },
      purposes: ['advertising', 'analytics', 'service provision'],
      thirdParties: ['advertising networks', 'analytics providers'],
      doNotSellLink: '/do-not-sell',
    });
  }

  /**
   * Submit CCPA request
   */
  submitRequest(userId: string, requestType: CCPAType): CCPATypeRequest {
    const request: CCPATypeRequest = {
      id: uuidv4(),
      userId,
      requestType,
      status: CCPAStatus.PENDING,
      submittedAt: new Date(),
    };

    this.requests.set(request.id, request);
    console.log(`[CCPA] Request submitted: ${request.id} (${requestType})`);
    return request;
  }

  /**
   * Verify request authenticity
   */
  verifyRequest(requestId: string, verified: boolean): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (verified) {
      request.status = CCPAStatus.VERIFYING;
      request.verifiedAt = new Date();
    } else {
      request.status = CCPAStatus.DENIED;
      request.deniedAt = new Date();
      request.denialReason = 'Identity verification failed';
    }
    console.log(`[CCPA] Request ${requestId} verification: ${verified}`);
  }

  /**
   * Process right to know request
   */
  processRightToKnow(requestId: string): Record<string, unknown> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = CCPAStatus.PROCESSING;

    // In production, this would gather actual user data
    const data = {
      requestId,
      userId: request.userId,
      collectedCategories: this.privacyNotices[0].categories.personal,
      collectionPurposes: this.privacyNotices[0].purposes,
      thirdPartySharing: this.privacyNotices[0].thirdParties,
      categoriesSold: this.getSoldCategories(request.userId),
      generatedAt: new Date().toISOString(),
    };

    request.dataProvided = data;
    request.status = CCPAStatus.COMPLETED;
    request.completedAt = new Date();

    console.log(`[CCPA] Right to know request ${requestId} completed`);
    return data;
  }

  /**
   * Process right to delete request
   */
  processRightToDelete(requestId: string): { success: boolean; deletedCategories: string[] } {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = CCPAStatus.PROCESSING;

    // In production, this would actually delete user data
    const deletedCategories = ['profile', 'preferences', 'activity_history'];

    request.deletionConfirmed = true;
    request.status = CCPAStatus.COMPLETED;
    request.completedAt = new Date();

    console.log(`[CCPA] Right to delete request ${requestId} completed`);
    return { success: true, deletedCategories };
  }

  /**
   * Process opt-out request
   */
  processOptOut(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = CCPAStatus.PROCESSING;

    // Record opt-out signal
    const signal: OptOutSignal = {
      userId: request.userId,
      confirmed: true,
      timestamp: new Date(),
      source: 'do_not_sell_link',
    };

    this.optOutSignals.set(request.userId, signal);
    request.status = CCPAStatus.COMPLETED;
    request.completedAt = new Date();

    console.log(`[CCPA] Opt-out request ${requestId} completed for user ${request.userId}`);
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(userId: string): boolean {
    return this.optOutSignals.has(userId);
  }

  /**
   * Record a sale of personal information
   */
  recordSale(sale: Omit<SaleRecord, 'id'>): SaleRecord {
    // Check opt-out first
    if (this.optOutSignals.has(sale.userId)) {
      console.warn(`[CCPA] Sale blocked: User ${sale.userId} has opted out`);
      throw new Error('User has opted out of sale of personal information');
    }

    const id = uuidv4();
    const record: SaleRecord = { id, ...sale };
    this.saleRecords.set(id, record);
    console.log(`[CCPA] Sale recorded: ${id}`);
    return record;
  }

  /**
   * Get categories sold for a user
   */
  getSoldCategories(userId: string): string[] {
    return Array.from(this.saleRecords.values())
      .filter(s => s.userId === userId)
      .flatMap(s => s.dataCategories);
  }

  /**
   * Process opt-in for minors (under 16)
   */
  processOptIn(userId: string, age: number): boolean {
    if (age < 13) {
      throw new Error('Cannot process consent for children under 13');
    }

    if (age < 16) {
      // Parental consent required for 13-15
      console.log(`[CCPA] Minor opt-in requires parental consent for user ${userId}`);
      return false;
    }

    // 16+ can consent themselves
    return true;
  }

  /**
   * Get request metrics
   */
  getMetrics(): {
    totalRequests: number;
    byType: Record<CCPAType, number>;
    byStatus: Record<CCPAStatus, number>;
    avgResponseTime: number;
    optOutRate: number;
  } {
    const requests = Array.from(this.requests.values());
    const byType: Record<CCPAType, number> = {} as any;
    const byStatus: Record<CCPAStatus, number> = {} as any;

    for (const request of requests) {
      byType[request.requestType] = (byType[request.requestType] || 0) + 1;
      byStatus[request.status] = (byStatus[request.status] || 0) + 1;
    }

    // Calculate average response time
    let totalResponseTime = 0;
    let completedCount = 0;
    for (const request of requests) {
      if (request.completedAt) {
        totalResponseTime += request.completedAt.getTime() - request.submittedAt.getTime();
        completedCount++;
      }
    }

    const optOutRate = this.optOutSignals.size / Math.max(requests.length, 1);

    return {
      totalRequests: requests.length,
      byType,
      byStatus,
      avgResponseTime: completedCount > 0 ? totalResponseTime / completedCount / 3600000 : 0,
      optOutRate,
    };
  }
}

// Export singleton instance
export const ccpaCompliance = new CCPATypeCompliance();
