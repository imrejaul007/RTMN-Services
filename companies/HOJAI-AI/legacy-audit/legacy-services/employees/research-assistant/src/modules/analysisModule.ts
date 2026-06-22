/**
 * HOJAI Research Assistant - Analysis Module
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Competitor analysis and market analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompetitorAnalysisInput,
  CompetitorInfo,
  ProductOffering,
  CompetitorAnalysis,
  SWOTAnalysis,
  PricingComparison,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('analysis-module');

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_COMPETITORS: Record<string, CompetitorInfo[]> = {
  'apple': [
    {
      name: 'Samsung',
      website: 'https://www.samsung.com',
      description: 'Global leader in consumer electronics, smartphones, and home appliances',
      founded: '1969',
      headquarters: 'Seoul, South Korea',
      employees: '270,000+',
      funding: 'Public (KRX: 005930)',
      socialLinks: { twitter: '@Samsung', linkedin: 'samsung' },
    },
    {
      name: 'Google',
      website: 'https://www.google.com',
      description: 'Technology giant specializing in internet services, software, and hardware',
      founded: '1998',
      headquarters: 'Mountain View, California',
      employees: '180,000+',
      funding: 'Public (NASDAQ: GOOGL)',
      socialLinks: { twitter: '@Google', linkedin: 'google' },
    },
    {
      name: 'Microsoft',
      website: 'https://www.microsoft.com',
      description: 'Software corporation developing operating systems, productivity software, and cloud services',
      founded: '1975',
      headquarters: 'Redmond, Washington',
      employees: '220,000+',
      funding: 'Public (NASDAQ: MSFT)',
      socialLinks: { twitter: '@Microsoft', linkedin: 'microsoft' },
    },
  ],
  'amazon': [
    {
      name: 'Walmart',
      website: 'https://www.walmart.com',
      description: 'Multinational retail corporation operating hypermarkets and e-commerce',
      founded: '1962',
      headquarters: 'Bentonville, Arkansas',
      employees: '2,300,000+',
      funding: 'Public (NYSE: WMT)',
      socialLinks: { twitter: '@Walmart', linkedin: 'walmart' },
    },
    {
      name: 'Target',
      website: 'https://www.target.com',
      description: 'General merchandise retailer offering discounted products',
      founded: '1902',
      headquarters: 'Minneapolis, Minnesota',
      employees: '440,000+',
      funding: 'Public (NYSE: TGT)',
      socialLinks: { twitter: '@Target', linkedin: 'target' },
    },
  ],
  'default': [
    {
      name: 'Competitor A',
      website: 'https://competitor-a.com',
      description: 'Leading competitor in the market with strong brand presence',
      founded: '2000',
      headquarters: 'New York, USA',
      employees: '500+',
      socialLinks: { twitter: '@CompetitorA' },
    },
    {
      name: 'Competitor B',
      website: 'https://competitor-b.com',
      description: 'Innovative startup disrupting the industry',
      founded: '2015',
      headquarters: 'San Francisco, USA',
      employees: '100+',
      funding: 'Series C',
      socialLinks: { twitter: '@CompetitorB', linkedin: 'competitor-b' },
    },
    {
      name: 'Competitor C',
      website: 'https://competitor-c.com',
      description: 'Established player with wide distribution network',
      founded: '1990',
      headquarters: 'Chicago, USA',
      employees: '1000+',
      socialLinks: { twitter: '@CompetitorC' },
    },
  ],
};

const MOCK_PRODUCTS: Record<string, ProductOffering[]> = {
  'apple': [
    { name: 'iPhone 16 Pro', description: 'Premium smartphone with advanced AI features', price: '$999+', category: 'Smartphones', features: ['A18 Chip', '48MP Camera', 'Titanium Design'] },
    { name: 'MacBook Pro M4', description: 'Professional laptop with M4 chip', price: '$1999+', category: 'Computers', features: ['M4 Pro/Max', '18hr Battery', 'Liquid Retina XDR'] },
    { name: 'Apple Watch Ultra 3', description: 'Advanced smartwatch for athletes', price: '$799', category: 'Wearables', features: ['Precision GPS', '36hr Battery', 'Titanium Case'] },
  ],
  'samsung': [
    { name: 'Galaxy S26 Ultra', description: 'Flagship smartphone with S Pen', price: '$1199+', category: 'Smartphones', features: ['Snapdragon 8 Gen 4', '200MP Camera', 'AI Features'] },
    { name: 'Galaxy Book 4', description: 'Premium laptop with Galaxy integration', price: '$1299+', category: 'Computers', features: ['Intel Core Ultra', 'Touch Display', 'Galaxy Ecosystem'] },
  ],
  'default': [
    { name: 'Product A', description: 'Main product offering', price: '$99', category: 'General', features: ['Feature 1', 'Feature 2'] },
    { name: 'Product B', description: 'Premium tier product', price: '$199', category: 'Premium', features: ['Advanced Feature 1', 'Advanced Feature 2', 'Priority Support'] },
  ],
};

const MOCK_SWOT: Record<string, SWOTAnalysis> = {
  'apple': {
    strengths: ['Strong brand loyalty', 'Integrated ecosystem', 'Premium positioning', 'High customer satisfaction'],
    weaknesses: ['Premium pricing', 'Closed ecosystem', 'Dependence on iPhone sales'],
    opportunities: ['AI expansion', 'Healthcare market', 'AR/VR growth', 'Services revenue growth'],
    threats: ['Competition from Android', 'Regulatory challenges', 'Economic sensitivity', 'Supply chain risks'],
  },
  'samsung': {
    strengths: ['Diversified product portfolio', 'Strong R&D', 'Global presence', 'Vertical integration'],
    weaknesses: ['Brand perception vs Apple', 'Lower margins on some products', 'Complex organizational structure'],
    opportunities: ['5G infrastructure', 'IoT expansion', 'Foldable market growth', 'Semiconductor demand'],
    threats: ['Chinese competition', 'Memory chip cycle', 'Trade tensions', 'Component costs'],
  },
  'default': {
    strengths: ['Innovative products', 'Strong team', 'Market understanding'],
    weaknesses: ['Limited market presence', 'Resource constraints', 'Brand awareness'],
    opportunities: ['Market expansion', 'Technology adoption', 'Partnership opportunities'],
    threats: ['Established competitors', 'Market volatility', 'Regulatory changes'],
  },
};

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Perform competitor analysis for a company
 */
export async function analyzeCompetitors(input: CompetitorAnalysisInput): Promise<CompetitorAnalysis> {
  const startTime = Date.now();
  const { company, competitors: customCompetitors, includeProducts, includePricing, includeMarketShare } = input;

  logger.info('competitor_analysis_start', {
    company,
    customCompetitors,
    includeProducts,
    includePricing,
  });

  // Simulate analysis delay
  await simulateDelay(200, 500);

  const companyKey = company.toLowerCase().replace(/\s+/g, '');
  const competitors = getCompetitorList(company, customCompetitors);
  const swot = getSWOTAnalysis(companyKey);
  const products = includeProducts ? getProductOfferings(companyKey) : undefined;
  const pricingComparison = includePricing ? generatePricingComparison(company) : undefined;

  const analysis: CompetitorAnalysis = {
    id: uuidv4(),
    targetCompany: company,
    competitors,
    marketPosition: generateMarketPosition(company),
    swot,
    products,
    pricingComparison,
    marketShare: includeMarketShare ? generateMarketShare(company) : undefined,
    generatedAt: new Date().toISOString(),
  };

  logger.info('competitor_analysis_complete', {
    company,
    competitorCount: competitors.length,
    tookMs: Date.now() - startTime,
  });

  return analysis;
}

/**
 * Get competitor list for a company
 */
function getCompetitorList(company: string, customCompetitors?: string[]): CompetitorInfo[] {
  // If custom competitors provided, use them
  if (customCompetitors && customCompetitors.length > 0) {
    return customCompetitors.map(name => ({
      name,
      website: `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
      description: `${name} - Competitor analysis in progress`,
    }));
  }

  // Use mock data based on company
  const companyKey = company.toLowerCase().replace(/\s+/g, '');

  if (MOCK_COMPETITORS[companyKey]) {
    return MOCK_COMPETITORS[companyKey];
  }

  return MOCK_COMPETITORS['default'];
}

/**
 * Get SWOT analysis for a company
 */
function getSWOTAnalysis(companyKey: string): SWOTAnalysis {
  if (MOCK_SWOT[companyKey]) {
    return MOCK_SWOT[companyKey];
  }
  return MOCK_SWOT['default'];
}

/**
 * Get product offerings for a company
 */
function getProductOfferings(companyKey: string): ProductOffering[] {
  if (MOCK_PRODUCTS[companyKey]) {
    return MOCK_PRODUCTS[companyKey];
  }
  return MOCK_PRODUCTS['default'];
}

/**
 * Generate market position description
 */
function generateMarketPosition(company: string): string {
  return `${company} is positioned as a major player in its market segment. ` +
    `The company competes on product innovation, brand strength, and customer experience. ` +
    `Key competitive advantages include technology leadership, ecosystem lock-in, and premium pricing power.`;
}

/**
 * Generate pricing comparison
 */
function generatePricingComparison(company: string): PricingComparison[] {
  return [
    {
      productType: 'Entry Level',
      yourPrice: '$99',
      competitorPrices: {
        'Competitor A': '$89',
        'Competitor B': '$95',
        'Competitor C': '$109',
      },
    },
    {
      productType: 'Mid Tier',
      yourPrice: '$299',
      competitorPrices: {
        'Competitor A': '$279',
        'Competitor B': '$319',
        'Competitor C': '$289',
      },
    },
    {
      productType: 'Premium',
      yourPrice: '$999',
      competitorPrices: {
        'Competitor A': '$949',
        'Competitor B': '$1099',
        'Competitor C': '$979',
      },
    },
  ];
}

/**
 * Generate market share estimate
 */
function generateMarketShare(company: string): number {
  // Return a mock market share based on company
  const shares: Record<string, number> = {
    'apple': 25,
    'amazon': 40,
    'google': 30,
    'microsoft': 20,
  };

  const companyKey = company.toLowerCase().replace(/\s+/g, '');
  return shares[companyKey] || Math.random() * 15 + 10;
}

/**
 * Get detailed competitor info
 */
export async function getCompetitorDetails(competitorName: string): Promise<CompetitorInfo | null> {
  logger.info('get_competitor_details', { competitorName });

  // Search through all mock competitors
  for (const competitors of Object.values(MOCK_COMPETITORS)) {
    const competitor = competitors.find(
      c => c.name.toLowerCase() === competitorName.toLowerCase()
    );
    if (competitor) {
      return competitor;
    }
  }

  return null;
}

/**
 * Get product comparison for a specific competitor
 */
export async function getProductComparison(
  company: string,
  competitor: string
): Promise<ProductOffering[]> {
  logger.info('get_product_comparison', { company, competitor });

  const companyKey = company.toLowerCase().replace(/\s+/g, '');
  const competitorKey = competitor.toLowerCase().replace(/\s+/g, '');

  const companyProducts = MOCK_PRODUCTS[companyKey] || MOCK_PRODUCTS['default'];
  const competitorProducts = MOCK_PRODUCTS[competitorKey] || MOCK_PRODUCTS['default'];

  return [...companyProducts.slice(0, 2), ...competitorProducts.slice(0, 2)];
}

/**
 * Generate competitive insights
 */
export async function generateCompetitiveInsights(company: string): Promise<string[]> {
  logger.info('generate_competitive_insights', { company });

  await simulateDelay(100, 200);

  return [
    `${company} maintains strong market position through continuous innovation.`,
    'Customer loyalty remains high due to ecosystem lock-in and brand perception.',
    'Pricing strategy focuses on premium positioning with selective entry-level offerings.',
    'Digital transformation initiatives are accelerating across operations.',
    'Sustainability and ESG commitments are becoming key differentiators.',
    'Strategic partnerships and acquisitions continue to expand capabilities.',
  ];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simulate network delay for realistic mock behavior
 */
function simulateDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}
