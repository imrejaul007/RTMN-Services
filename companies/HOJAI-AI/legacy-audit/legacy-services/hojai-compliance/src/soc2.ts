/**
 * SOC 2 Compliance Module
 *
 * Implements SOC 2 Trust Service Criteria:
 * - Security (Common Criteria)
 * - Availability
 * - Processing Integrity
 * - Confidentiality
 * - Privacy
 *
 * @module hojai-compliance/soc2
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * SOC 2 Trust Service Criteria
 */
export enum TrustServiceCriteria {
  SECURITY = 'security',
  AVAILABILITY = 'availability',
  PROCESSING_INTEGRITY = 'processing_integrity',
  CONFIDENTIALITY = 'confidentiality',
  PRIVACY = 'privacy',
}

/**
 * SOC 2 Report Type
 */
export enum SOC2ReportType {
  TYPE1 = 'type1',  // Point in time
  TYPE2 = 'type2',  // Over period of time
}

/**
 * Control status
 */
export enum ControlStatus {
  OPERATING_EFFECTIVELY = 'operating_effectively',
  DEFICIENCY = 'deficiency',
  MATERIAL_WEAKNESS = 'material_weakness',
  SIGNIFICANT_DEFICIENCY = 'significant_deficiency',
}

/**
 * Audit finding
 */
export interface SOC2Finding {
  id: string;
  criteria: TrustServiceCriteria;
  controlId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  remediatedAt?: Date;
  status: ControlStatus;
  remediation?: string;
}

/**
 * Control evidence
 */
export interface ControlEvidence {
  id: string;
  controlId: string;
  type: 'screenshot' | 'log' | 'document' | 'configuration' | 'access_review' | 'incident_report';
  description: string;
  collectedAt: Date;
  expiresAt: Date;
  collectedBy: string;
  artifacts: string[];
}

/**
 * Access review record
 */
export interface AccessReview {
  id: string;
  userId: string;
  reviewedBy: string;
  reviewedAt: Date;
  accessLevel: string;
  justification: string;
  approved: boolean;
  terminationDate?: Date;
}

/**
 * Incident record
 */
export interface SOC2Incident {
  id: string;
  title: string;
  description: string;
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  affectedCriteria: TrustServiceCriteria[];
  detectedAt: Date;
  resolvedAt?: Date;
  rootCause?: string;
  remediation?: string;
  notificationRequired: boolean;
  notificationSentAt?: Date;
}

// ============================================================================
// SOC 2 Compliance Class
// ============================================================================

export class SOC2Compliance {
  private controls: Map<string, ControlStatus> = new Map();
  private findings: Map<string, SOC2Finding> = new Map();
  private evidence: Map<string, ControlEvidence> = new Map();
  private accessReviews: Map<string, AccessReview> = new Map();
  private incidents: Map<string, SOC2Incident> = new Map();

  /**
   * Register a new control
   */
  registerControl(
    controlId: string,
    criteria: TrustServiceCriteria,
    description: string
  ): void {
    this.controls.set(controlId, ControlStatus.OPERATING_EFFECTIVELY);
    console.log(`[SOC2] Control registered: ${controlId} (${criteria})`);
  }

  /**
   * Update control status
   */
  updateControlStatus(controlId: string, status: ControlStatus): void {
    if (!this.controls.has(controlId)) {
      throw new Error(`Control ${controlId} not found`);
    }
    this.controls.set(controlId, status);
    console.log(`[SOC2] Control ${controlId} status updated to ${status}`);
  }

  /**
   * Get control status
   */
  getControlStatus(controlId: string): ControlStatus | undefined {
    return this.controls.get(controlId);
  }

  /**
   * Get all controls for a criteria
   */
  getControlsByCriteria(criteria: TrustServiceCriteria): Map<string, ControlStatus> {
    // This would typically filter by criteria - simplified for demo
    return this.controls;
  }

  /**
   * Add a finding
   */
  addFinding(finding: Omit<SOC2Finding, 'id'>): SOC2Finding {
    const id = uuidv4();
    const newFinding: SOC2Finding = { id, ...finding };
    this.findings.set(id, newFinding);

    // Update control status
    if (finding.severity === 'critical' || finding.severity === 'high') {
      this.updateControlStatus(finding.controlId, ControlStatus.DEFICIENCY);
    }

    console.log(`[SOC2] Finding added: ${id} - ${finding.description}`);
    return newFinding;
  }

  /**
   * Get findings by criteria
   */
  getFindingsByCriteria(criteria: TrustServiceCriteria): SOC2Finding[] {
    return Array.from(this.findings.values()).filter(
      f => f.criteria === criteria && f.status !== ControlStatus.OPERATING_EFFECTIVELY
    );
  }

  /**
   * Get open findings
   */
  getOpenFindings(): SOC2Finding[] {
    return Array.from(this.findings.values()).filter(f => !f.remediatedAt);
  }

  /**
   * Remediate a finding
   */
  remediateFinding(findingId: string, remediation: string): void {
    const finding = this.findings.get(findingId);
    if (!finding) {
      throw new Error(`Finding ${findingId} not found`);
    }

    finding.remediatedAt = new Date();
    finding.remediation = remediation;
    finding.status = ControlStatus.OPERATING_EFFECTIVELY;

    console.log(`[SOC2] Finding ${findingId} remediated`);
  }

  /**
   * Collect control evidence
   */
  collectEvidence(evidence: Omit<ControlEvidence, 'id'>): ControlEvidence {
    const id = uuidv4();
    const newEvidence: SOC2Evidence = { id, ...evidence };
    this.evidence.set(id, newEvidence);
    console.log(`[SOC2] Evidence collected: ${id}`);
    return newEvidence;
  }

  /**
   * Get evidence for a control
   */
  getEvidenceForControl(controlId: string): ControlEvidence[] {
    return Array.from(this.evidence.values()).filter(e => e.controlId === controlId);
  }

  /**
   * Record access review
   */
  recordAccessReview(review: Omit<AccessReview, 'id'>): AccessReview {
    const id = uuidv4();
    const newReview: AccessReview = { id, ...review };
    this.accessReviews.set(id, newReview);
    console.log(`[SOC2] Access review recorded: ${id}`);
    return newReview;
  }

  /**
   * Create incident
   */
  createIncident(incident: Omit<SOC2Incident, 'id'>): SOC2Incident {
    const id = uuidv4();
    const newIncident: SOC2Incident = { id, ...incident };
    this.incidents.set(id, newIncident);
    console.log(`[SOC2] Incident created: ${id} - ${incident.title}`);
    return newIncident;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(incidentId: string, status: SOC2Incident['status']): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.status = status;
    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = new Date();
    }
    console.log(`[SOC2] Incident ${incidentId} status: ${status}`);
  }

  /**
   * Get incident report
   */
  getIncidentReport(startDate: Date, endDate: Date): {
    totalIncidents: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    meanTimeToResolve: number;
  } {
    const incidents = Array.from(this.incidents.values()).filter(
      i => i.detectedAt >= startDate && i.detectedAt <= endDate
    );

    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalMTTR = 0;
    let resolvedCount = 0;

    for (const incident of incidents) {
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;

      if (incident.resolvedAt) {
        totalMTTR += incident.resolvedAt.getTime() - incident.detectedAt.getTime();
        resolvedCount++;
      }
    }

    return {
      totalIncidents: incidents.length,
      bySeverity,
      byStatus,
      meanTimeToResolve: resolvedCount > 0 ? totalMTTR / resolvedCount / 3600000 : 0, // hours
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(criteria: TrustServiceCriteria[]): {
    criteria: TrustServiceCriteria;
    controlCount: number;
    effectiveControls: number;
    findings: number;
    complianceRate: number;
  }[] {
    return criteria.map(c => {
      const criteriaControls = this.getControlsByCriteria(c);
      const effectiveCount = Array.from(criteriaControls.values()).filter(
        s => s === ControlStatus.OPERATING_EFFECTIVELY
      ).length;
      const findings = this.getFindingsByCriteria(c);

      return {
        criteria: c,
        controlCount: criteriaControls.size,
        effectiveControls: effectiveCount,
        findings: findings.length,
        complianceRate: criteriaControls.size > 0
          ? (effectiveCount / criteriaControls.size) * 100
          : 100,
      };
    });
  }
}

// Export singleton instance
export const soc2Compliance = new SOC2Compliance();

// Type alias for evidence
type SOC2Evidence = ControlEvidence;
