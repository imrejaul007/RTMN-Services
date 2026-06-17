/**
 * Enrichment Service - Data enrichment from multiple sources
 * Connects to: Atlas GTM (4004), HOJAI Lead (4752)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const ATLAS_GTM_URL = process.env.ATLAS_GTM_URL || 'http://localhost:4004';
const HOJAI_LEAD_URL = process.env.HOJAI_LEAD_URL || 'http://localhost:4752';

// In-memory job tracking
const enrichmentJobs = new Map();

/**
 * Mock company enrichment data
 */
const mockCompanyData = {
  'techcorp.ae': {
    domain: 'techcorp.ae',
    name: 'TechCorp Dubai',
    description: 'Leading technology solutions provider specializing in cloud infrastructure and digital transformation.',
    industry: 'Technology',
    subIndustry: 'Cloud Services',
    employeeCount: 150,
    employeeRange: '50-200',
    annualRevenue: '$10M-$50M',
    revenueRange: '$10M-$50M',
    founded: 2018,
    location: 'Dubai, UAE',
    address: 'Dubai Silicon Oasis, Dubai, UAE',
    phone: '+971 4 123 4567',
    linkedinUrl: 'https://linkedin.com/company/techcorp-dubai',
    twitterUrl: 'https://twitter.com/techcorpuae',
    facebookUrl: null,
    logo: 'https://logo.clearbit.com/techcorp.ae',
    Crunchbase: null,
    funding: null,
    technologies: ['AWS', 'Azure', 'React', 'Node.js', 'Kubernetes'],
    news: []
  },
  'gulfgroup.ae': {
    domain: 'gulfgroup.ae',
    name: 'Gulf Restaurant Group',
    description: 'Premium restaurant chain operating 12 locations across the UAE with focus on Middle Eastern cuisine.',
    industry: 'Food & Beverage',
    subIndustry: 'Restaurants',
    employeeCount: 350,
    employeeRange: '200-500',
    annualRevenue: '$5M-$20M',
    revenueRange: '$5M-$20M',
    founded: 2015,
    location: 'Dubai, UAE',
    address: 'Marina Walk, Dubai Marina, Dubai, UAE',
    phone: '+971 4 456 7890',
    linkedinUrl: 'https://linkedin.com/company/gulf-restaurant-group',
    technologies: ['Square POS', 'Toast POS', 'DoorDash Integration'],
    news: []
  }
};

/**
 * Mock contact enrichment data
 */
const mockContactData = {
  'sarah.chen@techcorp.ae': {
    email: 'sarah.chen@techcorp.ae',
    fullName: 'Sarah Chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    title: 'CEO',
    seniority: 'C-Level',
    department: 'Executive',
    company: 'TechCorp Dubai',
    companyDomain: 'techcorp.ae',
    phone: '+971 4 123 4567',
    mobilePhone: '+971 50 123 4567',
    linkedinUrl: 'https://linkedin.com/in/sarahchen-ceo',
    linkedinUsername: 'sarahchen',
    twitterUrl: null,
    facebookUrl: null,
    location: 'Dubai, UAE',
    photo: 'https://randomuser.me/api/portraits/women/1.jpg'
  },
  'ahmed@gulfgroup.ae': {
    email: 'ahmed@gulfgroup.ae',
    fullName: 'Ahmed Al Maktoum',
    firstName: 'Ahmed',
    lastName: 'Al Maktoum',
    title: 'Director of Operations',
    seniority: 'Director',
    department: 'Operations',
    company: 'Gulf Restaurant Group',
    companyDomain: 'gulfgroup.ae',
    phone: '+971 4 456 7890',
    linkedinUrl: 'https://linkedin.com/in/ahmedalmaktoum',
    location: 'Dubai, UAE'
  }
};

/**
 * Enrich company data
 * @param {string} domain - Company domain
 * @returns {Promise<Object>}
 */
async function enrichCompany(domain) {
  // Normalize domain
  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');

  try {
    const response = await axios.post(`${ATLAS_GTM_URL}/enrich/company`,
      { domain: normalizedDomain },
      { timeout: 10000 }
    );
    return {
      success: true,
      source: 'atlas_gtm',
      data: response.data
    };
  } catch (error) {
    logger.warn('Atlas GTM company enrichment unavailable, using mock data', { domain: normalizedDomain });

    // Check mock data
    const mockData = mockCompanyData[normalizedDomain] || mockCompanyData[Object.keys(mockCompanyData).find(k => normalizedDomain.includes(k))];

    return {
      success: true,
      source: 'mock',
      data: mockData || {
        domain: normalizedDomain,
        name: `${normalizedDomain.split('.')[0].charAt(0).toUpperCase() + normalizedDomain.split('.')[0].slice(1)}`,
        industry: 'Unknown',
        employeeRange: 'Unknown',
        revenueRange: 'Unknown',
        location: 'UAE',
        note: 'Mock data - enrichment service unavailable'
      }
    };
  }
}

/**
 * Enrich contact data
 * @param {string} email - Contact email
 * @param {string} name - Contact name (optional)
 * @param {string} company - Company name (optional)
 * @returns {Promise<Object>}
 */
async function enrichContact(email, name, company) {
  // Normalize email
  const normalizedEmail = email?.toLowerCase();

  try {
    const response = await axios.post(`${HOJAI_LEAD_URL}/enrich`,
      { email: normalizedEmail, company_name: company },
      { timeout: 10000 }
    );
    return {
      success: true,
      source: 'hojai_lead',
      data: response.data
    };
  } catch (error) {
    logger.warn('HOJAI Lead enrichment unavailable, using mock data', { email: normalizedEmail });

    // Check mock data
    const mockData = mockContactData[normalizedEmail];

    return {
      success: true,
      source: 'mock',
      data: mockData || {
        email: normalizedEmail,
        fullName: name || 'Unknown Contact',
        firstName: name?.split(' ')[0] || 'Unknown',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        title: 'Unknown Title',
        seniority: 'Unknown',
        company: company || 'Unknown Company',
        companyDomain: company?.toLowerCase().replace(/\s+/g, '') + '.com',
        phone: null,
        linkedinUrl: null,
        location: 'UAE',
        note: 'Mock data - enrichment service unavailable'
      }
    };
  }
}

/**
 * Bulk enrichment - process multiple records
 * @param {Array} records - Array of { type: 'company'|'contact', data: Object }
 * @returns {Promise<Object>}
 */
async function bulkEnrich(records) {
  const jobId = `job_${Date.now()}`;
  const results = [];
  let completed = 0;

  enrichmentJobs.set(jobId, {
    status: 'processing',
    total: records.length,
    completed: 0,
    results: []
  });

  for (const record of records) {
    try {
      let result;
      if (record.type === 'company') {
        result = await enrichCompany(record.data.domain);
      } else {
        result = await enrichContact(record.data.email, record.data.name, record.data.company);
      }

      results.push({
        id: record.id || record.data.email || record.data.domain,
        type: record.type,
        data: result.data,
        success: true
      });
    } catch (error) {
      results.push({
        id: record.id || record.data.email || record.data.domain,
        type: record.type,
        error: error.message,
        success: false
      });
    }

    completed++;
    enrichmentJobs.get(jobId).completed = completed;
  }

  enrichmentJobs.get(jobId).status = 'completed';
  enrichmentJobs.get(jobId).results = results;

  return {
    jobId,
    status: 'completed',
    total: records.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

/**
 * Get enrichment job status
 * @param {string} jobId - Job ID
 * @returns {Object}
 */
function getJobStatus(jobId) {
  const job = enrichmentJobs.get(jobId);

  if (!job) {
    return {
      found: false,
      error: 'Job not found'
    };
  }

  return {
    found: true,
    ...job
  };
}

/**
 * Enrich lead with both company and contact data
 * @param {Object} lead - Lead data
 * @returns {Promise<Object>}
 */
async function enrichLead(lead) {
  const [companyResult, contactResult] = await Promise.allSettled([
    enrichCompany(lead.companyDomain || lead.company?.domain || lead.email?.split('@')[1]),
    enrichContact(lead.email, lead.name, lead.company?.name)
  ]);

  return {
    success: true,
    company: companyResult.status === 'fulfilled' ? companyResult.value.data : null,
    contact: contactResult.status === 'fulfilled' ? contactResult.value.data : null,
    enriched: {
      at: new Date().toISOString(),
      companySource: companyResult.status === 'fulfilled' ? companyResult.value.source : 'unavailable',
      contactSource: contactResult.status === 'fulfilled' ? contactResult.value.source : 'unavailable'
    }
  };
}

export {
  enrichCompany,
  enrichContact,
  bulkEnrich,
  getJobStatus,
  enrichLead,
  enrichmentJobs
};
