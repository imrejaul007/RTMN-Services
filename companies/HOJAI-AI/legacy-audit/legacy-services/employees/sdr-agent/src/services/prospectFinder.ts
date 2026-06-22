// ============================================
// HOJAI AI - SDR Agent Prospect Finder Service
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { Contact, Company } from '../models';
import {
  IContact,
  ICompany,
  IProspect
} from '../types';
import { logger } from '../utils/logger';

export interface ProspectFinderConfig {
  idealCustomerProfile: {
    industries: string[];
    companySizes: string[];
    titles: string[];
    technologies: string[];
  };
  sources: {
    linkedin: { enabled: boolean; apiKey?: string };
    crunchbase: { enabled: boolean; apiKey?: string };
    github: { enabled: boolean };
    zoomInfo: { enabled: boolean; apiKey?: string };
  };
}

export class ProspectFinderService {
  private config: ProspectFinderConfig;

  constructor(config?: Partial<ProspectFinderConfig>) {
    this.config = {
      idealCustomerProfile: config?.idealCustomerProfile || {
        industries: ['SaaS', 'Technology', 'E-commerce', 'Fintech'],
        companySizes: ['11-50', '51-200', '201-500'],
        titles: ['CEO', 'CTO', 'VP of Engineering', 'Head of Product', 'Director of Sales'],
        technologies: ['React', 'Node.js', 'AWS', 'MongoDB']
      },
      sources: config?.sources || {
        linkedin: { enabled: false },
        crunchbase: { enabled: false },
        github: { enabled: false },
        zoomInfo: { enabled: false }
      }
    };
  }

  /**
   * Find prospects based on search criteria
   */
  async findProspects(
    tenantId: string,
    search: {
      industry?: string[];
      companySize?: string[];
      location?: {
        cities?: string[];
        states?: string[];
        countries?: string[];
      };
      title?: string[];
      keywords?: string[];
      excludeKeywords?: string[];
      technologies?: string[];
      fundingStage?: string[];
      recentlyHired?: boolean;
      jobChanges?: {
        titles?: string[];
        withinDays?: number;
      };
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ prospects: IProspect[]; total: number; hasMore: boolean }> {
    logger.info('Finding prospects', { tenantId, search, limit, offset });

    // Build MongoDB query
    const query: Record<string, unknown> = { tenantId };

    // Industry filter
    if (search.industry && search.industry.length > 0) {
      query.industry = { $in: search.industry };
    }

    // Company size filter
    if (search.companySize && search.companySize.length > 0) {
      query.companySize = { $in: search.companySize };
    }

    // Location filter
    if (search.location) {
      query['location.country'] = search.location.countries
        ? { $in: search.location.countries }
        : undefined;
      query['location.city'] = search.location.cities
        ? { $in: search.location.cities }
        : undefined;
    }

    // Title filter
    if (search.title && search.title.length > 0) {
      query.title = { $in: search.title };
    }

    // Keywords filter
    if (search.keywords && search.keywords.length > 0) {
      query.$or = search.keywords.map(kw => ({
        $or: [
          { title: { $regex: kw, $options: 'i' } },
          { company: { $regex: kw, $options: 'i' } },
          { industry: { $regex: kw, $options: 'i' } }
        ]
      }));
    }

    // Exclude keywords
    if (search.excludeKeywords && search.excludeKeywords.length > 0) {
      const excludeConditions = search.excludeKeywords.map(kw => ({
        $and: [
          { title: { $not: { $regex: kw, $options: 'i' } } },
          { company: { $not: { $regex: kw, $options: 'i' } } },
          { industry: { $not: { $regex: kw, $options: 'i' } } }
        ]
      }));
      query.$and = excludeConditions;
    }

    // Get total count
    const total = await Contact.countDocuments(query);

    // Get paginated results
    const contacts = await Contact.find(query)
      .skip(offset)
      .limit(limit)
      .lean();

    // Get associated companies
    const companyIds = [...new Set(contacts.map(c => c.companyId?.toString()).filter(Boolean))];
    const companies = await Company.find({
      _id: { $in: companyIds }
    }).lean();

    const companyMap = new Map(companies.map(c => [c._id.toString(), c]));

    // Score and enrich prospects
    const prospects: IProspect[] = contacts.map(contact => {
      const company = contact.companyId ? companyMap.get(contact.companyId.toString()) : null;
      const { matchScore, matchReasons } = this.calculateMatchScore(contact, company);

      return {
        id: uuidv4(),
        tenantId,
        contact: this.mapToIContact(contact),
        company: company ? this.mapToICompany(company) : this.createEmptyCompany(contact.company),
        matchScore,
        matchReasons,
        scrapedAt: contact.createdAt,
        createdAt: contact.createdAt
      };
    });

    // Sort by match score descending
    prospects.sort((a, b) => b.matchScore - a.matchScore);

    const hasMore = offset + prospects.length < total;

    logger.info(`Found ${prospects.length} prospects`, { tenantId, total });

    return { prospects, total, hasMore };
  }

  /**
   * Generate new prospects using configured sources
   */
  async generateProspects(
    tenantId: string,
    criteria: {
      industry?: string;
      companySize?: string;
      location?: string;
      title?: string;
    },
    limit: number = 10
  ): Promise<IProspect[]> {
    logger.info('Generating new prospects', { tenantId, criteria, limit });

    const prospects: IProspect[] = [];

    // In production, this would call actual APIs (LinkedIn, Crunchbase, etc.)
    // For now, we'll simulate with mock data based on criteria

    const mockProspects = this.generateMockProspects(tenantId, criteria, limit);
    prospects.push(...mockProspects);

    // Store generated prospects in database
    for (const prospect of prospects) {
      await this.storeProspect(prospect);
    }

    logger.info(`Generated ${prospects.length} new prospects`, { tenantId });
    return prospects;
  }

  /**
   * Calculate match score based on ICP fit
   */
  private calculateMatchScore(
    contact: Record<string, unknown>,
    company: Record<string, unknown> | null
  ): { matchScore: number; matchReasons: string[] } {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Check industry match
    const industry = (contact.industry as string) || (company?.industry as string);
    if (industry && this.config.idealCustomerProfile.industries.includes(industry)) {
      score += 15;
      reasons.push(`Industry match: ${industry}`);
    }

    // Check company size match
    const companySize = (contact.companySize as string) || (company?.size as string);
    if (companySize && this.config.idealCustomerProfile.companySizes.includes(companySize)) {
      score += 10;
      reasons.push(`Company size match: ${companySize}`);
    }

    // Check title match
    const title = contact.title as string;
    if (title) {
      const matchedTitle = this.config.idealCustomerProfile.titles.find(t =>
        title.toLowerCase().includes(t.toLowerCase())
      );
      if (matchedTitle) {
        score += 20;
        reasons.push(`Title match: ${matchedTitle}`);
      }
    }

    // Check technology match (in metadata or company description)
    const metadata = contact.metadata as Record<string, unknown> | undefined;
    if (metadata?.technologies) {
      const techs = metadata.technologies as string[];
      const matchedTechs = techs.filter(t =>
        this.config.idealCustomerProfile.technologies.some(it =>
          t.toLowerCase().includes(it.toLowerCase())
        )
      );
      if (matchedTechs.length > 0) {
        score += 5 * Math.min(matchedTechs.length, 3);
        reasons.push(`Technology match: ${matchedTechs.slice(0, 3).join(', ')}`);
      }
    }

    return { matchScore: Math.min(score, 100), matchReasons: reasons };
  }

  /**
   * Generate mock prospects for demo purposes
   */
  private generateMockProspects(
    tenantId: string,
    criteria: {
      industry?: string;
      companySize?: string;
      location?: string;
      title?: string;
    },
    limit: number
  ): IProspect[] {
    const mockCompanies = [
      { name: 'TechCorp Solutions', domain: 'techcorp.io', industry: 'SaaS', size: '51-200', location: { city: 'San Francisco', state: 'CA', country: 'USA' } },
      { name: 'DataFlow Analytics', domain: 'dataflow.ai', industry: 'Technology', size: '201-500', location: { city: 'New York', state: 'NY', country: 'USA' } },
      { name: 'CloudScale Systems', domain: 'cloudscale.com', industry: 'SaaS', size: '11-50', location: { city: 'Austin', state: 'TX', country: 'USA' } },
      { name: 'InnovateTech Labs', domain: 'innovatetech.io', industry: 'E-commerce', size: '51-200', location: { city: 'Seattle', state: 'WA', country: 'USA' } },
      { name: 'GrowthMetrics', domain: 'growthmetrics.co', industry: 'Fintech', size: '201-500', location: { city: 'Boston', state: 'MA', country: 'USA' } }
    ];

    const mockTitles = [
      'CEO',
      'CTO',
      'VP of Engineering',
      'Head of Product',
      'Director of Sales',
      'Chief Revenue Officer',
      'VP of Operations',
      'Director of Marketing'
    ];

    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Robert', 'Jennifer'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    const prospects: IProspect[] = [];
    const usedCompanies = new Set<string>();

    for (let i = 0; i < Math.min(limit, 10); i++) {
      let companyData = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];

      // Apply criteria filters
      if (criteria.industry && companyData.industry !== criteria.industry) {
        companyData = { ...companyData, industry: criteria.industry };
      }
      if (criteria.companySize) {
        companyData = { ...companyData, size: criteria.companySize };
      }
      if (criteria.location) {
        companyData = { ...companyData, location: { ...companyData.location, city: criteria.location } };
      }

      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const title = criteria.title || mockTitles[Math.floor(Math.random() * mockTitles.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyData.domain}`;

      const contact: IContact = {
        id: uuidv4(),
        tenantId,
        firstName,
        lastName,
        email,
        phone: `+1-555-${String(100 + i).padStart(3, '0')}-${String(1000 + Math.floor(Math.random() * 9000))}`,
        linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        title,
        company: companyData.name,
        companySize: companyData.size as IContact['companySize'],
        industry: companyData.industry,
        location: companyData.location,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const company: ICompany = {
        id: uuidv4(),
        tenantId,
        name: companyData.name,
        domain: `https://${companyData.domain}`,
        industry: companyData.industry,
        size: companyData.size as ICompany['size'],
        location: companyData.location,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { matchScore, matchReasons } = this.calculateMatchScore(
        { ...contact, industry: companyData.industry },
        { ...company, industry: companyData.industry }
      );

      prospects.push({
        id: uuidv4(),
        tenantId,
        contact,
        company,
        matchScore,
        matchReasons,
        scrapedAt: new Date(),
        createdAt: new Date()
      });

      usedCompanies.add(companyData.name);
    }

    return prospects;
  }

  /**
   * Store generated prospect in database
   */
  private async storeProspect(prospect: IProspect): Promise<void> {
    try {
      // Check if contact already exists
      const existingContact = await Contact.findOne({
        tenantId: prospect.tenantId,
        email: prospect.contact.email
      });

      if (!existingContact) {
        // Create company first
        const company = await Company.findOneAndUpdate(
          { tenantId: prospect.tenantId, domain: prospect.company.domain },
          {
            tenantId: prospect.tenantId,
            name: prospect.company.name,
            domain: prospect.company.domain,
            industry: prospect.company.industry,
            size: prospect.company.size,
            location: prospect.company.location
          },
          { upsert: true, new: true }
        );

        // Create contact
        await Contact.create({
          tenantId: prospect.tenantId,
          firstName: prospect.contact.firstName,
          lastName: prospect.contact.lastName,
          email: prospect.contact.email,
          phone: prospect.contact.phone,
          linkedinUrl: prospect.contact.linkedinUrl,
          title: prospect.contact.title,
          company: prospect.contact.company,
          companySize: prospect.contact.companySize,
          industry: prospect.contact.industry,
          location: prospect.contact.location,
          metadata: {
            source: 'sdr_agent',
            scrapedAt: prospect.scrapedAt,
            matchScore: prospect.matchScore,
            matchReasons: prospect.matchReasons
          }
        });
      }
    } catch (error) {
      logger.error('Failed to store prospect', { prospect: prospect.contact.email, error });
    }
  }

  /**
   * Map MongoDB document to IContact interface
   */
  private mapToIContact(doc: Record<string, unknown>): IContact {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      tenantId: doc.tenantId as string,
      firstName: doc.firstName as string,
      lastName: doc.lastName as string | undefined,
      email: doc.email as string | undefined,
      phone: doc.phone as string | undefined,
      linkedinUrl: doc.linkedinUrl as string | undefined,
      title: doc.title as string | undefined,
      company: doc.company as string | undefined,
      companySize: doc.companySize as IContact['companySize'] | undefined,
      industry: doc.industry as string | undefined,
      location: doc.location as IContact['location'] | undefined,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date
    };
  }

  /**
   * Map MongoDB document to ICompany interface
   */
  private mapToICompany(doc: Record<string, unknown>): ICompany {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      tenantId: doc.tenantId as string,
      name: doc.name as string,
      domain: doc.domain as string | undefined,
      industry: doc.industry as string | undefined,
      size: doc.size as ICompany['size'] | undefined,
      revenue: doc.revenue as string | undefined,
      location: doc.location as ICompany['location'] | undefined,
      linkedinUrl: doc.linkedinUrl as string | undefined,
      crunchbaseUrl: doc.crunchbaseUrl as string | undefined,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date
    };
  }

  /**
   * Create empty company from contact data
   */
  private createEmptyCompany(companyName?: string): ICompany {
    return {
      id: '',
      tenantId: '',
      name: companyName || 'Unknown Company',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

// Export singleton instance
import mongoose from 'mongoose';
export const prospectFinder = new ProspectFinderService();
