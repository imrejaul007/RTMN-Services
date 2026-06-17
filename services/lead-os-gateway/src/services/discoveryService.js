/**
 * Discovery Service - Lead discovery from multiple sources
 * Connects to: Atlas Discover (4001), HOJAI Knowledge Graph (4786), Lead Twin (4894)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const ATLAS_DISCOVER_URL = process.env.ATLAS_DISCOVER_URL || 'http://localhost:4001';
const HOJAI_KNOWLEDGE_GRAPH_URL = process.env.HOJAI_KNOWLEDGE_GRAPH_URL || 'http://localhost:4786';
const LEAD_TWIN_URL = process.env.LEAD_TWIN_URL || 'http://localhost:4894';

// Mock data for fallback
const mockGooglePlacesResults = [
  {
    placeId: 'mock_place_1',
    name: 'TechCorp Dubai',
    address: 'Dubai Silicon Oasis, Dubai, UAE',
    phone: '+971 4 123 4567',
    website: 'https://techcorp.ae',
    category: 'Technology',
    rating: 4.5,
    reviews: 127,
    location: { lat: 25.2127, lng: 55.3816 }
  },
  {
    placeId: 'mock_place_2',
    name: 'Gulf Restaurant Group',
    address: 'Marina Walk, Dubai Marina, Dubai, UAE',
    phone: '+971 4 456 7890',
    website: 'https://gulfgroup.ae',
    category: 'Restaurant',
    rating: 4.2,
    reviews: 89,
    location: { lat: 25.0766, lng: 55.1402 }
  },
  {
    placeId: 'mock_place_3',
    name: 'Emirates Healthcare Solutions',
    address: 'Dubai Healthcare City, Dubai, UAE',
    phone: '+971 4 789 0123',
    website: 'https://emirateshealth.ae',
    category: 'Healthcare',
    rating: 4.8,
    reviews: 234,
    location: { lat: 25.1897, lng: 55.2774 }
  }
];

const mockSearchResults = [
  {
    id: 'lead_001',
    name: 'Sarah Chen',
    title: 'CEO',
    company: 'TechCorp Dubai',
    email: 'sarah.chen@techcorp.ae',
    phone: '+971 4 123 4567',
    linkedin: 'https://linkedin.com/in/sarahchen',
    source: 'google_places',
    score: 85
  },
  {
    id: 'lead_002',
    name: 'Ahmed Al Maktoum',
    title: 'Director of Operations',
    company: 'Gulf Restaurant Group',
    email: 'ahmed@gulfgroup.ae',
    phone: '+971 4 456 7890',
    linkedin: 'https://linkedin.com/in/ahmedalmaktoum',
    source: 'google_places',
    score: 72
  },
  {
    id: 'lead_003',
    name: 'Dr. Fatima Hassan',
    title: 'Chief Medical Officer',
    company: 'Emirates Healthcare Solutions',
    email: 'fatima.hassan@emirateshealth.ae',
    phone: '+971 4 789 0123',
    linkedin: 'https://linkedin.com/in/fatimahassan',
    source: 'google_places',
    score: 91
  }
];

/**
 * Discover companies from Google Places
 * @param {string} query - Search query
 * @param {string} location - Location filter
 * @returns {Promise<Object>}
 */
async function discoverGooglePlaces(query, location) {
  try {
    const response = await axios.get(`${ATLAS_DISCOVER_URL}/discover/google`, {
      params: { query, location },
      timeout: 5000
    });
    return {
      success: true,
      source: 'atlas_discover',
      data: response.data,
      count: response.data.results?.length || 0
    };
  } catch (error) {
    logger.warn('Atlas Discover unavailable, using mock data', { query, location });
    return {
      success: true,
      source: 'mock',
      data: mockGooglePlacesResults.filter(r =>
        r.name.toLowerCase().includes(query?.toLowerCase()) ||
        r.category.toLowerCase().includes(query?.toLowerCase())
      ),
      count: mockGooglePlacesResults.length,
      note: 'Mock data - services unavailable'
    };
  }
}

/**
 * Search for leads across multiple sources
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>}
 */
async function searchLeads(query, filters = {}) {
  try {
    const [twinsResponse, graphResponse] = await Promise.allSettled([
      axios.get(`${LEAD_TWIN_URL}/leads`, {
        params: { q: query, ...filters },
        timeout: 5000
      }),
      axios.get(`${HOJAI_KNOWLEDGE_GRAPH_URL}/search`, {
        params: { q: query },
        timeout: 5000
      })
    ]);

    let results = [];

    if (twinsResponse.status === 'fulfilled') {
      results = [...results, ...(twinsResponse.value.data.leads || twinsResponse.value.data || [])];
    }

    if (graphResponse.status === 'fulfilled') {
      results = [...results, ...(graphResponse.value.data.entities || [])];
    }

    return {
      success: true,
      source: twinsResponse.status === 'fulfilled' ? 'lead_twin' : 'mock',
      query,
      filters,
      results: results.length > 0 ? results : mockSearchResults,
      count: results.length > 0 ? results.length : mockSearchResults.length,
      note: results.length === 0 ? 'Mock data - services unavailable' : null
    };
  } catch (error) {
    logger.warn('Lead search services unavailable, using mock data', { query });
    return {
      success: true,
      source: 'mock',
      query,
      filters,
      results: mockSearchResults,
      count: mockSearchResults.length,
      note: 'Mock data - services unavailable'
    };
  }
}

/**
 * Batch discover companies
 * @param {Array} queries - Array of search queries
 * @returns {Promise<Object>}
 */
async function batchDiscover(queries) {
  const results = [];

  for (const q of queries) {
    const result = await searchLeads(q.query || q, q.filters);
    results.push({
      query: q.query || q,
      ...result
    });
  }

  return {
    success: true,
    totalResults: results.reduce((sum, r) => sum + r.count, 0),
    results
  };
}

/**
 * Get company details from knowledge graph
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
async function getCompanyDetails(companyId) {
  try {
    const response = await axios.get(`${HOJAI_KNOWLEDGE_GRAPH_URL}/entity/${companyId}`, {
      timeout: 5000
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.warn('Knowledge graph unavailable, using mock data', { companyId });
    return {
      success: true,
      source: 'mock',
      data: {
        id: companyId,
        name: 'TechCorp Dubai',
        industry: 'Technology',
        employees: '50-200',
        revenue: '$10M-$50M',
        founded: 2018,
        description: 'Leading technology solutions provider in the UAE'
      }
    };
  }
}

export {
  discoverGooglePlaces,
  searchLeads,
  batchDiscover,
  getCompanyDetails,
  mockGooglePlacesResults,
  mockSearchResults
};
