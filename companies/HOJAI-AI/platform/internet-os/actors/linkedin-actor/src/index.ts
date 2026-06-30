/**
 * LinkedIn Actor - Proxycurl API Version
 * Uses the official Proxycurl API for compliant LinkedIn data extraction
 *
 * Setup:
 * 1. Sign up at https://nubela.co/proxycurl/
 * 2. Get API key from dashboard
 * 3. Set LINKEDIN_API_KEY environment variable
 *
 * Pricing (as of 2024):
 * - Free: 100 credits
 * - Starter ($29/mo): 1000 credits
 * - Growth ($99/mo): 5000 credits
 * - Pro ($499/mo): 25K credits
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

export interface LinkedInPerson {
  linkedinId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  headline?: string;
  summary?: string;
  location?: string;
  country?: string;
  industry?: string;
  profilePicture?: string;
  publicIdentifier?: string;
  profileUrl: string;
  experiences?: LinkedInExperience[];
  educations?: LinkedInEducation[];
  skills?: string[];
  followers?: number;
  connections?: number;
}

export interface LinkedInExperience {
  companyName: string;
  companyLinkedinId?: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  duration?: string;
}

export interface LinkedInEducation {
  schoolName: string;
  schoolLinkedinId?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface LinkedInCompany {
  linkedinId: string;
  name: string;
  universalName: string;
  tagline?: string;
  description?: string;
  website?: string;
  industry?: string;
  headquarters?: string;
  companySize?: string;
  foundedYear?: number;
  specialties?: string[];
  followerCount?: number;
  employeeCount?: number;
  logoUrl?: string;
  companyUrl: string;
  locations?: string[];
  similarCompanies?: string[];
}

export class LinkedInActor extends Actor {
  private apiKey?: string;
  private readonly API_URL = 'https://nubela.co/proxycurl/api';

  constructor(apiKey?: string) {
    super({
      id: 'linkedin',
      name: 'LinkedIn Scraper (Proxycurl)',
      description: 'Extract LinkedIn profiles, companies, and jobs via Proxycurl API',
      version: '2.0.0',
      capabilities: ['person_profile', 'company_profile', 'company_employees', 'job_search', 'api-based'],
      rateLimit: { requests: 10, window: 60000 },
    });
    this.apiKey = apiKey || process.env.LINKEDIN_API_KEY || process.env.PROXYCURL_API_KEY;
  }

  /**
   * Make Proxycurl API request
   */
  private async apiRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    if (!this.apiKey) {
      throw new Error(
        'Proxycurl API key required. Set LINKEDIN_API_KEY or PROXYCURL_API_KEY env var. ' +
        'Get one at https://nubela.co/proxycurl/'
      );
    }

    const url = new URL(`${this.API_URL}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetchUrl(url.toString(), {
      timeout: 30000,
      retries: 2,
    });

    return JSON.parse(response);
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'get_person';

      switch (action) {
        case 'get_person':
          return await this.getPerson(input.params);
        case 'get_company':
          return await this.getCompany(input.params);
        case 'get_company_employees':
          return await this.getCompanyEmployees(input.params);
        case 'search_jobs':
          return await this.searchJobs(input.params);
        case 'reverse_email_lookup':
          return await this.reverseEmailLookup(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Get LinkedIn person profile by URL
   */
  private async getPerson(params: { linkedinUrl: string }): Promise<ActorOutput> {
    if (!params.linkedinUrl) {
      return { success: false, error: 'linkedinUrl is required' };
    }

    const data = await this.apiRequest('/v2/linkedin', {
      url: params.linkedinUrl,
      'fallback_to_cache': 'on-error',
      'use_cache': 'if-present',
      'skills': 'include',
      'inferred_salary': 'include',
      'personal_email': 'include',
      'personal_contact_number': 'include',
      'twitter_profile_id': 'include',
      'facebook_profile_id': 'include',
      'instagram_profile_id': 'include',
      'experience': 'include',
      'education': 'include',
    });

    const person: LinkedInPerson = {
      linkedinId: data.linkedin_num_id?.toString() || data.profile_pic_url || '',
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fullName: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      headline: data.headline,
      summary: data.summary,
      location: data.location,
      country: data.country_full_name,
      industry: data.industry,
      profilePicture: data.profile_pic_url || data.profile_pic_url_high_res,
      publicIdentifier: data.public_identifier,
      profileUrl: data.linkedin_profile_url || params.linkedinUrl,
      experiences: (data.experiences || []).map((e: any) => ({
        companyName: e.company || '',
        companyLinkedinId: e.company_linkedin_profile_id,
        title: e.title || '',
        description: e.description,
        location: e.location,
        startDate: e.starts_at ? `${e.starts_at.year}-${String(e.starts_at.month || 1).padStart(2, '0')}` : undefined,
        endDate: e.ends_at ? `${e.ends_at.year}-${String(e.ends_at.month || 1).padStart(2, '0')}` : undefined,
        isCurrent: !e.ends_at,
        duration: e.duration,
      })),
      educations: (data.educations || []).map((e: any) => ({
        schoolName: e.school || '',
        schoolLinkedinId: e.school_linkedin_profile_id,
        degree: e.degree_name,
        fieldOfStudy: e.field_of_study,
        startDate: e.starts_at ? `${e.starts_at.year}` : undefined,
        endDate: e.ends_at ? `${e.ends_at.year}` : undefined,
      })),
      skills: data.skills || [],
      followers: data.follower_count,
      connections: data.connection_count,
    };

    return {
      success: true,
      data: person,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'linkedin-proxycurl',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get LinkedIn company profile
   */
  private async getCompany(params: { linkedinUrl?: string; companyName?: string }): Promise<ActorOutput> {
    if (!params.linkedinUrl && !params.companyName) {
      return { success: false, error: 'linkedinUrl or companyName is required' };
    }

    const data = await this.apiRequest('/v2/linkedin/company', {
      url: params.linkedinUrl,
      name: params.companyName,
      'fallback_to_cache': 'on-error',
      'use_cache': 'if-present',
      'categories': 'include',
      'locations': 'include',
      'specialties': 'include',
      'funding_data': 'include',
      'extra': 'include',
    });

    const company: LinkedInCompany = {
      linkedinId: data.linkedin_num_id?.toString() || data.id || '',
      name: data.name || '',
      universalName: data.universal_name || '',
      tagline: data.tagline,
      description: data.description,
      website: data.website,
      industry: data.industry,
      headquarters: data.location,
      companySize: data.company_size,
      foundedYear: data.founded_year,
      specialties: data.specialities || data.specialties,
      followerCount: data.follower_count,
      employeeCount: data.employee_count,
      logoUrl: data.logo_url,
      companyUrl: data.linkedin_profile_url || data.url,
      locations: (data.locations || []).map((l: any) => `${l.city || ''}, ${l.country || ''}`.replace(/^, /, '').trim()),
    };

    return {
      success: true,
      data: company,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'linkedin-proxycurl',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get employees of a company
   */
  private async getCompanyEmployees(params: {
    linkedinUrl?: string;
    companyName?: string;
    role?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.linkedinUrl && !params.companyName) {
      return { success: false, error: 'linkedinUrl or companyName is required' };
    }

    const data = await this.apiRequest('/v2/linkedin/company/employees', {
      url: params.linkedinUrl,
      name: params.companyName,
      role: params.role,
      'page_size': String(Math.min(params.limit || 10, 100)),
      'employment_status': 'current',
    });

    const employees = (data.employees || []).map((e: any) => ({
      linkedinId: e.linkedin_num_id,
      fullName: e.full_name || `${e.first_name} ${e.last_name}`.trim(),
      firstName: e.first_name,
      lastName: e.last_name,
      headline: e.title || e.headline,
      profileUrl: e.linkedin_profile_url || `https://linkedin.com/in/${e.public_identifier}`,
      profilePicture: e.profile_pic_url,
      lastUpdated: e.last_updated,
    }));

    return {
      success: true,
      data: employees,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'linkedin-proxycurl',
        itemsFound: employees.length,
        duration: 0,
      },
    };
  }

  /**
   * Search LinkedIn jobs
   */
  private async searchJobs(params: {
    keywords: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.keywords) {
      return { success: false, error: 'keywords is required' };
    }

    const data = await this.apiRequest('/v2/linkedin/search/jobs', {
      keywords: params.keywords,
      location: params.location,
      'page_size': String(Math.min(params.limit || 10, 100)),
    });

    const jobs = (data.results || data.job || []).map((j: any) => ({
      jobId: j.linkedin_job_id || j.id,
      title: j.title || j.job_title,
      companyName: j.company_name || j.company,
      companyLinkedinId: j.company_id,
      location: j.location,
      postedAt: j.posted_at,
      applyUrl: j.apply_url || j.linkedin_job_url,
      description: j.description,
      salaryRange: j.salary,
      employmentType: j.employment_type,
      seniority: j.seniority_level,
    }));

    return {
      success: true,
      data: jobs,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'linkedin-proxycurl',
        itemsFound: jobs.length,
        duration: 0,
      },
    };
  }

  /**
   * Reverse email lookup — find LinkedIn profile by email
   */
  private async reverseEmailLookup(params: { email: string }): Promise<ActorOutput> {
    if (!params.email) {
      return { success: false, error: 'email is required' };
    }

    const data = await this.apiRequest('/v2/linkedin/profile/resolve/email', {
      email: params.email,
    });

    return {
      success: true,
      data: {
        email: params.email,
        linkedinProfileUrl: data.linkedin_profile_url,
        publicIdentifier: data.public_identifier,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'linkedin-proxycurl',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input?.params) return false;
    const p = input.params;
    return !!(p.linkedinUrl || p.companyName || p.keywords || p.email);
  }
}

export default LinkedInActor;