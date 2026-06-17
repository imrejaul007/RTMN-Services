import { ILead, IEnrichmentData } from '../models/Lead';

// Mock enrichment service - in production, integrate with real APIs
// like Clearbit, FullContact, LinkedIn, etc.

interface EnrichmentOptions {
  enrichLinkedin?: boolean;
  enrichCompany?: boolean;
  enrichSocial?: boolean;
}

interface EnrichmentResult {
  linkedin?: IEnrichmentData['linkedin'];
  companyData?: IEnrichmentData['companyData'];
  socialData?: IEnrichmentData['socialData'];
}

class EnrichmentService {
  /**
   * Enrich lead data from external sources
   * This is a mock implementation - integrate with real APIs in production
   */
  async enrichLead(lead: ILead, options: EnrichmentOptions = {}): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {};

    // Enrich LinkedIn data
    if (options.enrichLinkedin !== false && lead.email) {
      result.linkedin = await this.enrichLinkedin(lead);
    }

    // Enrich company data
    if (options.enrichCompany !== false && (lead.email || lead.company)) {
      result.companyData = await this.enrichCompanyData(lead);
    }

    // Enrich social data
    if (options.enrichSocial !== false && (lead.email || lead.company)) {
      result.socialData = await this.enrichSocialData(lead);
    }

    return result;
  }

  /**
   * Mock LinkedIn enrichment
   * In production: Use LinkedIn API, Clearbit, or FullContact
   */
  private async enrichLinkedin(lead: ILead): Promise<IEnrichmentData['linkedin']> {
    // Simulate API call delay
    await this.delay(100);

    // Mock data - in production, fetch from real API
    const mockLinkedinData: IEnrichmentData['linkedin'] = {
      url: lead.email ? `https://linkedin.com/in/${this.extractUsername(lead.email)}` : undefined,
      headline: lead.jobTitle ? `${lead.jobTitle} at ${lead.company}` : undefined,
      connections: Math.floor(Math.random() * 500) + 50,
      industry: this.inferIndustry(lead.company || ''),
    };

    return mockLinkedinData;
  }

  /**
   * Mock company data enrichment
   * In production: Use Clearbit Company API, Crunchbase, or similar
   */
  private async enrichCompanyData(lead: ILead): Promise<IEnrichmentData['companyData']> {
    // Simulate API call delay
    await this.delay(150);

    // Mock data - in production, fetch from real API
    const companyName = lead.company || this.extractCompanyFromEmail(lead.email || '');

    if (!companyName) {
      return {};
    }

    const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
    const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education'];
    const revenues = ['$0-1M', '$1-10M', '$10-50M', '$50-100M', '$100M+'];

    const mockCompanyData: IEnrichmentData['companyData'] = {
      name: companyName,
      domain: this.extractDomain(companyName),
      industry: industries[Math.floor(Math.random() * industries.length)],
      size: companySizes[Math.floor(Math.random() * companySizes.length)],
      revenue: revenues[Math.floor(Math.random() * revenues.length)],
      founded: Math.floor(Math.random() * (2023 - 1980)) + 1980,
      description: `Leading company in ${industries[0]} sector.`,
      logo: `https://logo.clearbit.com/${this.extractDomain(companyName)}`,
    };

    return mockCompanyData;
  }

  /**
   * Mock social media data enrichment
   * In production: Use FullContact, SocialLinks, or similar
   */
  private async enrichSocialData(lead: ILead): Promise<IEnrichmentData['socialData']> {
    // Simulate API call delay
    await this.delay(100);

    const companyDomain = lead.company ? this.extractDomain(lead.company) : '';

    const mockSocialData: IEnrichmentData['socialData'] = {
      twitter: companyDomain ? `https://twitter.com/${companyDomain.split('.')[0]}` : undefined,
      facebook: companyDomain ? `https://facebook.com/${companyDomain.split('.')[0]}` : undefined,
      instagram: companyDomain ? `https://instagram.com/${companyDomain.split('.')[0]}` : undefined,
      website: companyDomain ? `https://${companyDomain}` : undefined,
    };

    return mockSocialData;
  }

  /**
   * Verify email using email verification service
   * In production: Use ZeroBounce, NeverBounce, or similar
   */
  async verifyEmail(email: string): Promise<{
    valid: boolean;
    deliverable: boolean;
    risk: 'low' | 'medium' | 'high';
  }> {
    await this.delay(50);

    // Mock verification - always return valid in demo
    return {
      valid: true,
      deliverable: Math.random() > 0.1, // 90% deliverable
      risk: 'low',
    };
  }

  /**
   * Find similar/duplicate leads
   */
  async findSimilarLeads(lead: ILead): Promise<string[]> {
    // Simulate API call
    await this.delay(100);

    // In production: Use fuzzy matching on name, email, company
    // This would search for leads with similar characteristics
    return [];
  }

  /**
   * Batch enrich multiple leads
   */
  async batchEnrich(leads: ILead[], options: EnrichmentOptions = {}): Promise<Map<string, EnrichmentResult>> {
    const results = new Map<string, EnrichmentResult>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (lead) => ({
          leadId: lead.leadId,
          enrichment: await this.enrichLead(lead, options),
        }))
      );

      batchResults.forEach(({ leadId, enrichment }) => {
        results.set(leadId, enrichment);
      });
    }

    return results;
  }

  // Helper methods
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUsername(email: string): string {
    const username = email.split('@')[0];
    return username.replace(/[._]/g, '-');
  }

  private extractCompanyFromEmail(email: string): string {
    if (!email.includes('@')) return '';
    const domain = email.split('@')[1];
    const company = domain.split('.')[0];
    return company.charAt(0).toUpperCase() + company.slice(1);
  }

  private extractDomain(companyName: string): string {
    // Simple domain extraction - in production use proper domain data
    const cleaned = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleaned}.com`;
  }

  private inferIndustry(companyName: string): string {
    const company = companyName.toLowerCase();

    if (company.includes('tech') || company.includes('software') || company.includes('ai')) {
      return 'Technology';
    }
    if (company.includes('health') || company.includes('med') || company.includes('clinic')) {
      return 'Healthcare';
    }
    if (company.includes('finance') || company.includes('bank') || company.includes('invest')) {
      return 'Finance';
    }
    if (company.includes('retail') || company.includes('store') || company.includes('shop')) {
      return 'Retail';
    }
    if (company.includes('manufac')) {
      return 'Manufacturing';
    }
    if (company.includes('edu') || company.includes('school') || company.includes('university')) {
      return 'Education';
    }

    return 'General';
  }
}

const enrichmentService = new EnrichmentService();
export default enrichmentService;
