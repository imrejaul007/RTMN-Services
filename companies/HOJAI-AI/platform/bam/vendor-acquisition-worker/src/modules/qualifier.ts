/**
 * Qualification Module
 * Qualifies prospects based on trust, capability, capacity
 */

import axios from 'axios';

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  industry: string;
  city?: string;
  source?: string;
  aciScore?: number;
  verified?: boolean;
  url?: string;
}

interface QualifiedVendor extends Prospect {
  qualityScore: number;
  trustScore: number;
  capabilityMatch: number;
  capacity: number;
  status: 'qualified' | 'marginal' | 'rejected';
  reasons: string[];
}

export class Qualifier {
  /**
   * Qualify a list of prospects
   */
  async qualify(prospects: Prospect[]): Promise<QualifiedVendor[]> {
    const qualified: QualifiedVendor[] = [];

    for (const prospect of prospects) {
      const vendor = await this.qualifySingle(prospect);
      qualified.push(vendor);
    }

    // Sort by score descending
    return qualified.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Qualify a single prospect
   */
  async qualifySingle(prospect: Prospect): Promise<QualifiedVendor> {
    const trustScore = await this.getTrustScore(prospect);
    const capabilityMatch = await this.getCapabilityMatch(prospect);
    const capacity = await this.getCapacity(prospect);

    const qualityScore = (trustScore * 0.4 + capabilityMatch * 0.3 + capacity * 0.3) * 100;

    let status: 'qualified' | 'marginal' | 'rejected' = 'marginal';
    const reasons: string[] = [];

    if (qualityScore >= 70) {
      status = 'qualified';
      reasons.push('High quality score');
    } else if (qualityScore >= 40) {
      status = 'marginal';
      reasons.push('Mid quality score, needs review');
    } else {
      status = 'rejected';
      reasons.push('Low quality score');
    }

    if (trustScore < 0.5) {
      status = 'rejected';
      reasons.push('Low trust score');
    }
    if (capabilityMatch < 0.4) {
      status = 'rejected';
      reasons.push('Capability mismatch');
    }

    return {
      ...prospect,
      qualityScore,
      trustScore: trustScore * 100,
      capabilityMatch: capabilityMatch * 100,
      capacity: capacity * 100,
      status,
      reasons,
    };
  }

  /**
   * Get trust score (call trust engine via Hub)
   */
  private async getTrustScore(prospect: Prospect): Promise<number> {
    try {
      const response = await axios.get(
        `http://localhost:4399/api/trust/score/${prospect.id}`,
        { timeout: 3000 }
      );
      return (response.data?.score || 0.5);
    } catch {
      // Fallback to local calculation
      return (prospect.aciScore || 500) / 1000;
    }
  }

  /**
   * Get capability match score
   */
  private async getCapabilityMatch(prospect: Prospect): Promise<number> {
    // In production, connect to capability OS
    const baseScore = 0.5;
    let match = baseScore;

    // Verified vendors get higher match
    if (prospect.verified) match += 0.3;

    // Directory sources are more trustworthy
    if (prospect.source === 'directory') match += 0.2;

    // Has a website
    if (prospect.url) match += 0.1;

    return Math.min(match, 1.0);
  }

  /**
   * Get capacity score (estimated)
   */
  private async getCapacity(prospect: Prospect): Promise<number> {
    // Estimate based on available info
    let capacity = 0.5;

    if (prospect.verified) capacity += 0.2;
    if (prospect.phone) capacity += 0.1;
    if (prospect.url) capacity += 0.1;
    if ((prospect.aciScore || 0) > 700) capacity += 0.1;

    return Math.min(capacity, 1.0);
  }
}

export default new Qualifier();
