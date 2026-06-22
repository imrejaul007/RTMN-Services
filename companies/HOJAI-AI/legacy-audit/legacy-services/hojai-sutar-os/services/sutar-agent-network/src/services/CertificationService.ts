// ============================================================================
// SUTAR Agent Network - Certification Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Certification,
  AgentCertification,
  CertificationStatus,
  CertificationLevel,
} from '../types/index.js';

export class CertificationService {
  private certifications: Map<string, Certification> = new Map();
  private agentCertifications: Map<string, Map<string, AgentCertification>> = new Map();

  constructor() {
    this.initializeDefaultCertifications();
  }

  /**
   * Initialize default certifications
   */
  private initializeDefaultCertifications(): void {
    const defaultCertifications: Omit<Certification, 'id'>[] = [
      {
        name: 'SUTAR Agent Professional',
        issuer: 'SUTAR Network',
        description: 'Professional certification for SUTAR agents demonstrating core competencies',
        category: 'professional',
        level: 'intermediate',
        validityPeriod: 365,
        requirements: ['Complete 10 tasks', 'Maintain 4.5+ rating', 'Pass assessment'],
      },
      {
        name: 'SUTAR Security Specialist',
        issuer: 'SUTAR Network',
        description: 'Advanced certification for security-focused agents',
        category: 'security',
        level: 'advanced',
        validityPeriod: 180,
        requirements: ['Security capability verified', 'Pass security assessment', 'Background check'],
      },
      {
        name: 'SUTAR Data Analyst',
        issuer: 'SUTAR Network',
        description: 'Certification for data analysis and processing agents',
        category: 'data',
        level: 'intermediate',
        validityPeriod: 365,
        requirements: ['Analysis capability verified', 'Complete data projects', 'Pass exam'],
      },
      {
        name: 'SUTAR Code Expert',
        issuer: 'SUTAR Network',
        description: 'Expert certification for coding agents',
        category: 'development',
        level: 'expert',
        validityPeriod: 365,
        requirements: ['Coding capability verified', 'Code review passed', 'Portfolio review'],
      },
      {
        name: 'SUTAR Team Lead',
        issuer: 'SUTAR Network',
        description: 'Certification for agents leading multi-agent teams',
        category: 'management',
        level: 'advanced',
        validityPeriod: 365,
        requirements: ['Coordination capability', 'Lead 3+ teams', 'Performance evaluation'],
      },
      {
        name: 'SUTAR Communication Expert',
        issuer: 'SUTAR Network',
        description: 'Certification for communication and customer service agents',
        category: 'communication',
        level: 'intermediate',
        validityPeriod: 365,
        requirements: ['Communication capability', 'Pass communication test', 'Client feedback'],
      },
      {
        name: 'SUTAR Research Analyst',
        issuer: 'SUTAR Network',
        description: 'Certification for research and analysis agents',
        category: 'research',
        level: 'advanced',
        validityPeriod: 365,
        requirements: ['Research capability', 'Complete research projects', 'Quality review'],
      },
      {
        name: 'SUTAR Vision Specialist',
        issuer: 'SUTAR Network',
        description: 'Certification for computer vision agents',
        category: 'vision',
        level: 'expert',
        validityPeriod: 365,
        requirements: ['Vision capability verified', 'Pass vision assessment', 'Accuracy test'],
      },
    ];

    defaultCertifications.forEach(cert => {
      const certification: Certification = {
        id: `cert-${uuidv4()}`,
        ...cert,
      };
      this.certifications.set(certification.id, certification);
    });
  }

  /**
   * Register a new certification type
   */
  registerCertification(data: Omit<Certification, 'id'>): Certification {
    const certification: Certification = {
      id: `cert-${uuidv4()}`,
      ...data,
    };
    this.certifications.set(certification.id, certification);
    return certification;
  }

  /**
   * Get certification by ID
   */
  getCertification(certificationId: string): Certification | undefined {
    return this.certifications.get(certificationId);
  }

  /**
   * Get certification by name
   */
  getCertificationByName(name: string): Certification | undefined {
    return Array.from(this.certifications.values()).find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get all certifications
   */
  getAllCertifications(): Certification[] {
    return Array.from(this.certifications.values());
  }

  /**
   * Get certifications by category
   */
  getCertificationsByCategory(category: string): Certification[] {
    return Array.from(this.certifications.values()).filter(
      c => c.category === category
    );
  }

  /**
   * Get certifications by level
   */
  getCertificationsByLevel(level: CertificationLevel): Certification[] {
    return Array.from(this.certifications.values()).filter(
      c => c.level === level
    );
  }

  /**
   * Certify an agent
   */
  certifyAgent(
    agentId: string,
    certificationId: string,
    data: {
      level?: CertificationLevel;
      verifiedBy?: string;
      score?: number;
    }
  ): AgentCertification | undefined {
    const certification = this.certifications.get(certificationId);
    if (!certification) {
      return undefined;
    }

    if (!this.agentCertifications.has(agentId)) {
      this.agentCertifications.set(agentId, new Map());
    }

    const now = new Date();
    const expiresAt = certification.validityPeriod
      ? new Date(now.getTime() + certification.validityPeriod * 24 * 60 * 60 * 1000)
      : undefined;

    const agentCert: AgentCertification = {
      id: `agent-cert-${uuidv4()}`,
      agentId,
      certificationId,
      certificationName: certification.name,
      issuer: certification.issuer,
      level: data.level || certification.level,
      status: 'certified',
      issuedAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      verifiedBy: data.verifiedBy,
      verifiedAt: data.verifiedBy ? now.toISOString() : undefined,
      score: data.score,
    };

    this.agentCertifications.get(agentId)!.set(certificationId, agentCert);
    return agentCert;
  }

  /**
   * Get agent certifications
   */
  getAgentCertifications(agentId: string): AgentCertification[] {
    return Array.from(this.agentCertifications.get(agentId)?.values() || []);
  }

  /**
   * Get agent certification by ID
   */
  getAgentCertification(agentId: string, certificationId: string): AgentCertification | undefined {
    return this.agentCertifications.get(agentId)?.get(certificationId);
  }

  /**
   * Verify agent certification
   */
  verifyCertification(
    agentId: string,
    certificationId: string,
    verifiedBy: string
  ): AgentCertification | undefined {
    const cert = this.agentCertifications.get(agentId)?.get(certificationId);
    if (!cert) {
      return undefined;
    }

    cert.verifiedBy = verifiedBy;
    cert.verifiedAt = new Date().toISOString();
    this.agentCertifications.get(agentId)!.set(certificationId, cert);

    return cert;
  }

  /**
   * Revoke certification
   */
  revokeCertification(
    agentId: string,
    certificationId: string,
    reason?: string
  ): AgentCertification | undefined {
    const cert = this.agentCertifications.get(agentId)?.get(certificationId);
    if (!cert) {
      return undefined;
    }

    cert.status = 'revoked';
    this.agentCertifications.get(agentId)!.set(certificationId, cert);

    return cert;
  }

  /**
   * Renew certification
   */
  renewCertification(agentId: string, certificationId: string): AgentCertification | undefined {
    const cert = this.agentCertifications.get(agentId)?.get(certificationId);
    if (!cert) {
      return undefined;
    }

    const certification = this.certifications.get(certificationId);
    if (!certification) {
      return undefined;
    }

    const now = new Date();
    cert.issuedAt = now.toISOString();
    cert.status = 'certified';
    cert.expiresAt = certification.validityPeriod
      ? new Date(now.getTime() + certification.validityPeriod * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    this.agentCertifications.get(agentId)!.set(certificationId, cert);
    return cert;
  }

  /**
   * Check and update expired certifications
   */
  checkExpiredCertifications(): string[] {
    const expiredIds: string[] = [];
    const now = new Date();

    this.agentCertifications.forEach((certMap, agentId) => {
      certMap.forEach((cert, certId) => {
        if (cert.expiresAt && new Date(cert.expiresAt) < now && cert.status === 'certified') {
          cert.status = 'expired';
          expiredIds.push(`${agentId}:${certId}`);
        }
      });
    });

    return expiredIds;
  }

  /**
   * Get certification statistics
   */
  getCertificationStats(): {
    totalCertifications: number;
    totalAgentsCertified: number;
    byLevel: Record<CertificationLevel, number>;
    byCategory: Record<string, number>;
    averageScore: number;
  } {
    let totalAgents = new Set<string>();
    const byLevel: Record<CertificationLevel, number> = {
      basic: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0,
    };
    const byCategory: Record<string, number> = {};
    let totalScore = 0;
    let scoreCount = 0;

    this.agentCertifications.forEach((certMap, agentId) => {
      totalAgents.add(agentId);
      certMap.forEach(cert => {
        if (cert.status === 'certified') {
          byLevel[cert.level]++;
          const certification = this.certifications.get(cert.certificationId);
          if (certification) {
            byCategory[certification.category] =
              (byCategory[certification.category] || 0) + 1;
          }
          if (cert.score !== undefined) {
            totalScore += cert.score;
            scoreCount++;
          }
        }
      });
    });

    return {
      totalCertifications: Array.from(this.agentCertifications.values()).reduce(
        (sum, certs) => sum + certs.size,
        0
      ),
      totalAgentsCertified: totalAgents.size,
      byLevel,
      byCategory,
      averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
    };
  }

  /**
   * Find agents with certification
   */
  findAgentsWithCertification(certificationId: string): string[] {
    const agents: string[] = [];
    this.agentCertifications.forEach((certMap, agentId) => {
      if (certMap.has(certificationId)) {
        const cert = certMap.get(certificationId)!;
        if (cert.status === 'certified') {
          agents.push(agentId);
        }
      }
    });
    return agents;
  }

  /**
   * Find agents with certifications by level
   */
  findAgentsWithLevel(level: CertificationLevel): string[] {
    const agents: string[] = [];
    this.agentCertifications.forEach((certMap, agentId) => {
      certMap.forEach(cert => {
        if (cert.status === 'certified' && cert.level === level) {
          if (!agents.includes(agentId)) {
            agents.push(agentId);
          }
        }
      });
    });
    return agents;
  }

  /**
   * Get certification requirements
   */
  getRequirements(certificationId: string): string[] | undefined {
    const certification = this.certifications.get(certificationId);
    return certification?.requirements;
  }

  /**
   * Delete certification type
   */
  deleteCertification(certificationId: string): boolean {
    return this.certifications.delete(certificationId);
  }

  /**
   * Remove agent certification
   */
  removeAgentCertification(agentId: string, certificationId: string): boolean {
    return this.agentCertifications.get(agentId)?.delete(certificationId) || false;
  }

  /**
   * Search certifications
   */
  searchCertifications(query: string): Certification[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.certifications.values()).filter(
      cert =>
        cert.name.toLowerCase().includes(lowerQuery) ||
        cert.description.toLowerCase().includes(lowerQuery) ||
        cert.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export certification data
   */
  exportCertification(certificationId: string): Record<string, unknown> | undefined {
    const certification = this.certifications.get(certificationId);
    if (!certification) {
      return undefined;
    }

    const agents = this.findAgentsWithCertification(certificationId);

    return {
      ...certification,
      agentsCertified: agents.length,
      exportDate: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const certificationService = new CertificationService();
