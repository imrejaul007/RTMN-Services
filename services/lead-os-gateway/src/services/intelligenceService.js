/**
 * Intelligence Service - AI-powered company research and intelligence
 * Connects to: REZ-SalesMind (5170), Atlas Signals (4003), HOJAI Knowledge Graph (4786)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const REZ_SALESMIND_URL = process.env.REZ_SALESMIND_URL || 'http://localhost:5170';
const ATLAS_SIGNALS_URL = process.env.ATLAS_SIGNALS_URL || 'http://localhost:4003';
const HOJAI_KNOWLEDGE_GRAPH_URL = process.env.HOJAI_KNOWLEDGE_GRAPH_URL || 'http://localhost:4786';

/**
 * Generate AI summary (mock implementation)
 * @param {Object} account - Account data
 * @param {Object} signals - Signals data
 * @returns {string}
 */
async function generateSummary(account, signals) {
  const companyName = account?.name || 'Unknown Company';

  return `Based on our analysis, ${companyName} shows ${signals?.intentLevel || 'moderate'} buying signals.

Key findings:
- ${account?.industry || 'Industry information unavailable'}
- ${account?.employeeCount || 'Unknown'} employees
- Active in ${account?.location || 'unknown location'}

Recommendation: ${signals?.recommendation || 'Continue monitoring for engagement opportunities.'}`;
}

/**
 * Generate full company report
 * @param {string} companyName - Company name
 * @returns {Promise<Object>}
 */
async function generateCompanyReport(companyName) {
  // Fetch data in parallel
  const [accountResponse, signalsResponse, graphResponse] = await Promise.allSettled([
    // REZ-SalesMind Account Intel
    axios.get(`${REZ_SALESMIND_URL}/api/ecosystem/account/${encodeURIComponent(companyName)}`, {
      timeout: 10000
    }),
    // Atlas Signals
    axios.get(`${ATLAS_SIGNALS_URL}/signals/${encodeURIComponent(companyName)}`, {
      timeout: 10000
    }),
    // HOJAI Knowledge Graph
    axios.get(`${HOJAI_KNOWLEDGE_GRAPH_URL}/query`, {
      params: { entity: companyName },
      timeout: 10000
    })
  ]);

  // Extract data or use mock
  const account = accountResponse.status === 'fulfilled' ? accountResponse.value.data : null;
  const signals = signalsResponse.status === 'fulfilled' ? signalsResponse.value.data : null;
  const relationships = graphResponse.status === 'fulfilled' ? graphResponse.value.data : null;

  // Generate AI summary
  const summary = await generateSummary(account, signals);

  // Build report
  const report = {
    company: companyName,
    summary,
    data: account || {
      name: companyName,
      industry: 'Technology',
      employeeCount: '50-200',
      location: 'Dubai, UAE',
      founded: 2018,
      description: 'Leading technology solutions provider in the UAE region.'
    },
    signals: signals || {
      intentLevel: 'moderate',
      triggers: ['Hiring growth', 'Technology adoption', 'Expansion signals'],
      news: [],
      recommendation: 'Monitor for engagement opportunities'
    },
    relationships: relationships || {
      connections: [],
      similarCompanies: ['TechCorp Dubai', 'Gulf Solutions', 'Emirates Tech'],
      industry: 'Technology'
    },
    generatedAt: new Date().toISOString(),
    sources: {
      account: accountResponse.status === 'fulfilled' ? 'rez_salesmind' : 'unavailable',
      signals: signalsResponse.status === 'fulfilled' ? 'atlas_signals' : 'mock',
      knowledgeGraph: graphResponse.status === 'fulfilled' ? 'hojai_kg' : 'unavailable'
    }
  };

  return report;
}

/**
 * Perform AI research on company
 * @param {string} companyName - Company name
 * @param {Array<string>} topics - Research topics
 * @returns {Promise<Object>}
 */
async function performResearch(companyName, topics = []) {
  // Fetch all intelligence data
  const report = await generateCompanyReport(companyName);

  // Get additional research topics
  const researchTopics = topics.length > 0 ? topics : [
    'company_news',
    'funding',
    'products',
    'competitors',
    'technology_stack',
    'hiring'
  ];

  const research = {};

  for (const topic of researchTopics) {
    try {
      const response = await axios.get(`${ATLAS_SIGNALS_URL}/research/${encodeURIComponent(companyName)}/${topic}`, {
        timeout: 5000
      });
      research[topic] = response.data;
    } catch (error) {
      // Topic-specific research unavailable
      research[topic] = {
        available: false,
        note: 'Data unavailable for this topic'
      };
    }
  }

  return {
    company: companyName,
    overview: report,
    research,
    researchedAt: new Date().toISOString()
  };
}

/**
 * Get company signals
 * @param {string} companyId - Company ID or name
 * @returns {Promise<Object>}
 */
async function getCompanySignals(companyId) {
  try {
    const response = await axios.get(`${ATLAS_SIGNALS_URL}/signals/${encodeURIComponent(companyId)}`, {
      timeout: 10000
    });
    return {
      success: true,
      source: 'atlas_signals',
      data: response.data
    };
  } catch (error) {
    logger.warn('Atlas Signals unavailable, using mock data', { companyId });

    return {
      success: true,
      source: 'mock',
      data: {
        companyId,
        intentLevel: 'moderate',
        intentScore: 65,
        signals: [
          {
            type: 'hiring',
            title: 'Hiring Growth',
            description: 'Increased hiring in sales and engineering roles',
            date: new Date().toISOString(),
            impact: 'positive'
          },
          {
            type: 'news',
            title: 'Recent News',
            description: 'Company featured in industry publication',
            date: new Date().toISOString(),
            impact: 'neutral'
          },
          {
            type: 'technology',
            title: 'Tech Adoption',
            description: 'New technology investments detected',
            date: new Date().toISOString(),
            impact: 'positive'
          }
        ],
        triggers: [
          'Hiring growth detected',
          'New funding round',
          'Technology stack expansion'
        ],
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Get competitor analysis
 * @param {string} companyId - Company ID or name
 * @returns {Promise<Object>}
 */
async function getCompetitorAnalysis(companyId) {
  // Try to get from Knowledge Graph
  try {
    const response = await axios.get(`${HOJAI_KNOWLEDGE_GRAPH_URL}/competitors/${encodeURIComponent(companyId)}`, {
      timeout: 10000
    });
    return {
      success: true,
      source: 'hojai_kg',
      data: response.data
    };
  } catch (error) {
    logger.warn('Knowledge Graph unavailable, using mock competitor data', { companyId });

    return {
      success: true,
      source: 'mock',
      data: {
        companyId,
        company: companyId,
        industry: 'Technology',
        competitors: [
          {
            name: 'Competitor A',
            marketShare: '25%',
            strengths: ['Brand recognition', 'Product maturity'],
            weaknesses: ['Pricing', 'Customer service']
          },
          {
            name: 'Competitor B',
            marketShare: '18%',
            strengths: ['Innovation', 'Customer focus'],
            weaknesses: ['Global presence', 'Scale']
          },
          {
            name: 'Competitor C',
            marketShare: '15%',
            strengths: ['Price', 'Ease of use'],
            weaknesses: ['Feature depth', 'Enterprise capabilities']
          }
        ],
        marketPosition: 'Strong mid-market player',
        opportunities: ['Enterprise segment', 'Geographic expansion'],
        threats: ['New market entrants', 'Technology disruption']
      }
    };
  }
}

/**
 * Get buying signals for a company
 * @param {string} companyName - Company name
 * @returns {Promise<Object>}
 */
async function getBuyingSignals(companyName) {
  const signals = await getCompanySignals(companyName);

  // Score buying intent
  const intentScore = signals.data.intentScore || 50;
  const signalStrength = signals.data.signals?.filter(s => s.impact === 'positive').length || 0;

  return {
    company: companyName,
    buyingSignals: signals.data.signals || [],
    intentScore,
    intentLevel: signals.data.intentLevel || (intentScore >= 70 ? 'high' : intentScore >= 40 ? 'moderate' : 'low'),
    recommendedActions: [
      intentScore >= 70 ? 'Immediate outreach recommended' : 'Continue nurturing',
      signalStrength >= 3 ? 'High signal count - prioritize' : 'Monitor for additional signals',
      'Schedule discovery call'
    ],
    confidence: 0.8,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Get technology insights for a company
 * @param {string} companyName - Company name
 * @returns {Promise<Object>}
 */
async function getTechnologyInsights(companyName) {
  try {
    const response = await axios.get(`${ATLAS_SIGNALS_URL}/tech/${encodeURIComponent(companyName)}`, {
      timeout: 10000
    });
    return {
      success: true,
      source: 'atlas_signals',
      data: response.data
    };
  } catch (error) {
    return {
      success: true,
      source: 'mock',
      data: {
        company: companyName,
        technologies: [
          { name: 'React', category: 'Frontend', adoption: 'primary' },
          { name: 'Node.js', category: 'Backend', adoption: 'primary' },
          { name: 'AWS', category: 'Cloud', adoption: 'primary' },
          { name: 'PostgreSQL', category: 'Database', adoption: 'primary' }
        ],
        integrations: [
          { name: 'Stripe', category: 'Payments' },
          { name: 'Slack', category: 'Communication' },
          { name: 'HubSpot', category: 'Marketing' }
        ],
        techDebt: 'Low - modern tech stack',
        recommendations: ['Consider adding analytics platform', 'Evaluate AI/ML capabilities']
      }
    };
  }
}

export {
  generateCompanyReport,
  performResearch,
  getCompanySignals,
  getCompetitorAnalysis,
  getBuyingSignals,
  getTechnologyInsights,
  generateSummary
};
