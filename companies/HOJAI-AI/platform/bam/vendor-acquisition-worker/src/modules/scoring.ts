/**
 * Vendor Scoring Module
 * Calculate comprehensive vendor quality score
 */

interface Vendor {
  id: string;
  name: string;
  industry: string;
  aciScore?: number;
  verified?: boolean;
  source?: string;
  qualityScore?: number;
}

export class Scoring {
  /**
   * Calculate comprehensive vendor score
   */
  async score(vendor: Vendor): Promise<number> {
    const factors = {
      // Trust score (40%)
      trust: this.calculateTrustScore(vendor),

      // Verification (15%)
      verification: vendor.verified ? 1 : 0,

      // Source quality (15%)
      source: this.getSourceScore(vendor.source),

      // Industry alignment (15%)
      industry: this.calculateIndustryScore(vendor.industry),

      // Quality score (15%)
      quality: (vendor.qualityScore || 70) / 100,
    };

    const score =
      factors.trust * 0.4 +
      factors.verification * 0.15 +
      factors.source * 0.15 +
      factors.industry * 0.15 +
      factors.quality * 0.15;

    return Math.round(score * 100);
  }

  /**
   * Calculate trust score
   */
  private calculateTrustScore(vendor: Vendor): number {
    const aci = vendor.aciScore || 500;
    return Math.min(aci / 1000, 1);
  }

  /**
   * Get source quality score
   */
  private getSourceScore(source?: string): number {
    const map: Record<string, number> = {
      directory: 0.9,
      social: 0.6,
      web: 0.4,
      referral: 0.8,
    };
    return map[source || ''] || 0.5;
  }

  /**
   * Industry alignment score
   */
  private calculateIndustryScore(industry: string): number {
    // High priority industries
    const priority = ['restaurant', 'retail', 'healthcare', 'hotel', 'manufacturing'];
    if (priority.includes(industry.toLowerCase())) return 1.0;

    // Medium priority
    const medium = ['education', 'agriculture', 'beauty', 'fashion', 'automotive'];
    if (medium.includes(industry.toLowerCase())) return 0.7;

    return 0.5;
  }
}

export default new Scoring();
