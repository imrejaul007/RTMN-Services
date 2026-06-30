/**
 * Prospect Discovery Module
 * Searches directories, social, and web for potential vendors
 */

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  industry: string;
  city?: string;
  source: 'directory' | 'social' | 'web';
  aciScore: number;
  verified: boolean;
  url?: string;
}

export class Prospector {
  /**
   * Discover prospects based on industry and criteria
   */
  async discover(params: { industry: string; criteria?: any; limit?: number }): Promise<Prospect[]> {
    const { industry, criteria = {}, limit = 50 } = params;

    const results: Prospect[] = [];

    // Search directories
    const directoryResults = await this.searchDirectories(industry, criteria, limit);
    results.push(...directoryResults);

    // Search social (LinkedIn, etc.)
    const socialResults = await this.searchSocial(industry, criteria, Math.floor(limit * 0.3));
    results.push(...socialResults);

    // Search web
    const webResults = await this.searchWeb(industry, criteria, Math.floor(limit * 0.2));
    results.push(...webResults);

    // Deduplicate by email or name
    const unique = this.deduplicate(results);

    return unique.slice(0, limit);
  }

  /**
   * Search vendor directories
   */
  private async searchDirectories(industry: string, criteria: any, limit: number): Promise<Prospect[]> {
    // In production, connect to actual directories
    // For now, generate realistic mock data based on industry

    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
    const results: Prospect[] = [];

    for (let i = 0; i < limit; i++) {
      results.push({
        id: `PROSPECT-DIR-${i + 1}`,
        name: `${industry} Vendor ${i + 1}`,
        email: `vendor${i + 1}@${industry.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        industry,
        city: cities[Math.floor(Math.random() * cities.length)],
        source: 'directory',
        aciScore: Math.floor(Math.random() * 200) + 600, // 600-800
        verified: Math.random() > 0.3,
        url: `https://vendor${i + 1}.example.com`,
      });
    }

    return results;
  }

  /**
   * Search social platforms
   */
  private async searchSocial(industry: string, criteria: any, limit: number): Promise<Prospect[]> {
    const results: Prospect[] = [];

    for (let i = 0; i < limit; i++) {
      results.push({
        id: `PROSPECT-SOC-${i + 1}`,
        name: `${industry} Pro ${i + 1}`,
        email: `pro${i + 1}@${industry.toLowerCase()}.pro`,
        industry,
        source: 'social',
        aciScore: Math.floor(Math.random() * 200) + 500,
        verified: Math.random() > 0.5,
      });
    }

    return results;
  }

  /**
   * Search the web
   */
  private async searchWeb(industry: string, criteria: any, limit: number): Promise<Prospect[]> {
    const results: Prospect[] = [];

    for (let i = 0; i < limit; i++) {
      results.push({
        id: `PROSPECT-WEB-${i + 1}`,
        name: `${industry} Company ${i + 1}`,
        email: `contact${i + 1}@${industry.toLowerCase()}co.com`,
        industry,
        source: 'web',
        aciScore: Math.floor(Math.random() * 300) + 400,
        verified: Math.random() > 0.6,
      });
    }

    return results;
  }

  /**
   * Deduplicate by email and name
   */
  private deduplicate(prospects: Prospect[]): Prospect[] {
    const seen = new Set<string>();
    const unique: Prospect[] = [];

    for (const p of prospects) {
      const key = p.email || p.name;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }

    return unique;
  }

  /**
   * Score prospects
   */
  scoreProspects(prospects: Prospect[]): Prospect[] {
    return prospects.map(p => ({
      ...p,
      score: this.calculateScore(p),
    })).sort((a, b) => b.score - a.score);
  }

  private calculateScore(prospect: Prospect): number {
    // Trust score (40%)
    const trustWeight = 0.4;
    const trust = prospect.aciScore / 1000;

    // Verification (20%)
    const verificationWeight = 0.2;
    const verification = prospect.verified ? 1 : 0;

    // Source quality (20%)
    const sourceWeight = 0.2;
    const sourceMap = { directory: 0.8, social: 0.6, web: 0.4 };
    const source = sourceMap[prospect.source] || 0.5;

    // Contact completeness (20%)
    const contactWeight = 0.2;
    const contact = (prospect.email && prospect.phone) ? 1 : prospect.email ? 0.5 : 0;

    return (trust * trustWeight + verification * verificationWeight +
            source * sourceWeight + contact * contactWeight) * 100;
  }
}

export default new Prospector();
