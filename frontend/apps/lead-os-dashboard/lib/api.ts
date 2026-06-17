import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_LEADOS_API || 'http://localhost:5175/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

async function get(endpoint: string, params?: any) {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error: any) {
    console.error(`GET ${endpoint} error:`, error.message);
    return { error: error.message, data: getMockData(endpoint) };
  }
}

async function post(endpoint: string, data: any) {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`POST ${endpoint} error:`, error.message);
    return { error: error.message, data: getMockData(endpoint, data) };
  }
}

async function patch(endpoint: string, data: any) {
  try {
    const response = await api.patch(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`PATCH ${endpoint} error:`, error.message);
    return { error: error.message, data: { ...data, updated: true } };
  }
}

async function del(endpoint: string) {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error: any) {
    console.error(`DELETE ${endpoint} error:`, error.message);
    return { deleted: true };
  }
}

function getMockData(endpoint: string, data?: any) {
  const mocks: Record<string, any> = {
    '/leads': getMockLeads(),
    '/analytics/overview': getMockOverview(),
    '/analytics/pipeline': getMockPipeline(),
    '/outreach/campaigns': getMockCampaigns(),
    '/discover/google': { results: getMockDiscovery() },
    '/intelligence/company': getMockCompanyReport(),
  };

  for (const key of Object.keys(mocks)) {
    if (endpoint.includes(key)) return mocks[key];
  }
  return {};
}

function getMockLeads() {
  return [
    { id: '1', name: 'Sarah Chen', email: 'sarah.chen@techcorp.io', company: 'TechCorp Solutions', role: 'CTO', score: 92, status: 'hot', source: 'linkedin', createdAt: '2026-06-15' },
    { id: '2', name: 'Marcus Johnson', email: 'mjohnson@globalretail.com', company: 'Global Retail Inc', role: 'VP Operations', score: 87, status: 'hot', source: 'google', createdAt: '2026-06-14' },
    { id: '3', name: 'Priya Patel', email: 'priya@startupventures.co', company: 'Startup Ventures', role: 'Founder', score: 85, status: 'warm', source: 'referral', createdAt: '2026-06-13' },
    { id: '4', name: 'David Kim', email: 'dkim@medtech.health', company: 'MedTech Health', role: 'CEO', score: 78, status: 'warm', source: 'apollo', createdAt: '2026-06-12' },
    { id: '5', name: 'Emma Williams', email: 'emma.w@financeplus.com', company: 'FinancePlus', role: 'Director', score: 72, status: 'warm', source: 'linkedin', createdAt: '2026-06-11' },
    { id: '6', name: 'James Brown', email: 'jbrown@logistics.net', company: 'Swift Logistics', role: 'Manager', score: 45, status: 'cold', source: 'google', createdAt: '2026-06-10' },
    { id: '7', name: 'Lisa Zhang', email: 'lisa@ecommerceasia.com', company: 'Ecommerce Asia', role: 'Head of Growth', score: 88, status: 'hot', source: 'zoominfo', createdAt: '2026-06-09' },
    { id: '8', name: 'Michael O\'Brien', email: 'mobrien@realestatepros.com', company: 'RealEstate Pros', role: 'Partner', score: 65, status: 'warm', source: 'referral', createdAt: '2026-06-08' },
  ];
}

function getMockOverview() {
  return {
    totalLeads: 1247,
    qualified: 342,
    hotLeads: 89,
    activeOutreach: 156,
    changes: { leads: 12, qualified: 8, hot: 23, outreach: 5 }
  };
}

function getMockPipeline() {
  return [
    { stage: 'New', count: 245, value: 1250000 },
    { stage: 'Contacted', count: 189, value: 2100000 },
    { stage: 'Qualified', count: 156, value: 3400000 },
    { stage: 'Proposal', count: 98, value: 4500000 },
    { stage: 'Negotiation', count: 45, value: 3200000 },
    { stage: 'Closed', count: 32, value: 2800000 },
  ];
}

function getMockCampaigns() {
  return [
    { id: '1', name: 'Tech Industry Q2 Push', status: 'active', channels: ['Email', 'LinkedIn'], sent: 1245, opened: 567, replied: 134, converted: 28 },
    { id: '2', name: 'Healthcare Decision Makers', status: 'active', channels: ['Email'], sent: 890, opened: 423, replied: 89, converted: 15 },
    { id: '3', name: 'Enterprise Outreach', status: 'paused', channels: ['Email', 'LinkedIn', 'Twitter'], sent: 2341, opened: 1102, replied: 234, converted: 45 },
    { id: '4', name: 'Startup Founders Series', status: 'draft', channels: ['Email'], sent: 0, opened: 0, replied: 0, converted: 0 },
  ];
}

function getMockDiscovery() {
  return [
    { id: '1', name: 'Al Bahrain Restaurant', category: 'Restaurant', location: 'Manama, Bahrain', phone: '+973 1723 4567', rating: 4.5, website: 'albahrain-restaurant.com' },
    { id: '2', name: 'Gulf Hotels Group', category: 'Hotel', location: 'Dubai, UAE', phone: '+971 4 555 1234', rating: 4.7, website: 'gulfhotels.ae' },
    { id: '3', name: 'Abu Dhabi Tech Hub', category: 'Technology', location: 'Abu Dhabi, UAE', phone: '+971 2 888 9999', rating: 4.3, website: 'abudhabitechhub.ae' },
    { id: '4', name: 'Riyadh Healthcare Center', category: 'Healthcare', location: 'Riyadh, Saudi Arabia', phone: '+966 11 456 7890', rating: 4.6, website: 'riyadhhealthcare.sa' },
    { id: '5', name: 'Doha Retail Mall', category: 'Retail', location: 'Doha, Qatar', phone: '+974 4455 6677', rating: 4.4, website: 'doharetail.qa' },
    { id: '6', name: 'Kuwait Finance Corp', category: 'Finance', location: 'Kuwait City', phone: '+965 2222 3333', rating: 4.8, website: 'kuwaitfinance.kw' },
  ];
}

function getMockCompanyReport() {
  return {
    company: 'TechCorp Solutions',
    employees: '500-1000',
    revenue: '$50M-$100M',
    score: 85,
    industry: 'Technology',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    description: 'Leading provider of enterprise cloud solutions.',
    technologies: ['AWS', 'React', 'Node.js', 'PostgreSQL'],
    funding: 'Series C',
    linkedin: 'techcorp-solutions',
    twitter: '@techcorp',
    recentNews: [
      'Raised $50M in Series C funding',
      'Expanded to European markets',
      'Launched new AI-powered analytics platform',
    ],
  };
}

export const leadOS = {
  discoverGoogle: (query: string) => get(`/discover/google?query=${query}`),
  search: (query: string) => get(`/discover/search?q=${query}`),
  enrichCompany: (domain: string) => post('/enrich/company', { domain }),
  enrichContact: (data: any) => post('/enrich/contact', data),
  scoreLead: (data: any) => post('/score/lead', data),
  qualifyLead: (data: any) => post('/qualify/lead', data),
  getLeads: (params?: any) => get('/leads', params),
  getLead: (id: string) => get(`/leads/${id}`),
  createLead: (data: any) => post('/leads', data),
  updateLead: (id: string, data: any) => patch(`/leads/${id}`, data),
  deleteLead: (id: string) => del(`/leads/${id}`),
  createSequence: (data: any) => post('/outreach/sequence', data),
  getCampaigns: () => get('/outreach/campaigns'),
  companyReport: (name: string) => get(`/intelligence/company/${encodeURI(name)}`),
  overview: () => get('/analytics/overview'),
  pipeline: () => get('/analytics/pipeline'),
};

export default leadOS;
