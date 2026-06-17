import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock company profiles
const companyProfiles: Record<string, any> = {
  'mcdonalds': {
    id: randomUUID(),
    name: 'McDonald\'s Corporation',
    legal_name: 'McDonald\'s Corp',
    ticker: 'MCD',
    exchange: 'NYSE',
    industry: 'Fast Food',
    sector: 'Consumer Cyclical',
    headquarters: { city: 'Chicago', state: 'Illinois', country: 'USA' },
    founded: 1940,
    employees: 200000,
    website: 'mcdonalds.com',
    description: 'Largest fast food chain globally with 40,000+ locations',
    leadership: [
      { name: 'Chris Kempczinski', title: 'CEO', since: 2020 },
      { name: 'Ian Borden', title: 'CFO', since: 2021 }
    ],
    financials: {
      revenue: '$23.2B',
      market_cap: '$200B',
      pe_ratio: 25.4,
      dividend_yield: 2.1
    },
    segments: ['Company-owned restaurants', 'Franchised restaurants', 'International developmental licensed restaurants'],
    brands: ['McDonald\'s', 'McCafe', 'McPlant'],
    markets: '120+ countries'
  },
  'shopify': {
    id: randomUUID(),
    name: 'Shopify Inc',
    legal_name: 'Shopify Inc',
    ticker: 'SHOP',
    exchange: 'NYSE',
    industry: 'E-commerce Platform',
    sector: 'Technology',
    headquarters: { city: 'Ottawa', state: 'Ontario', country: 'Canada' },
    founded: 2006,
    employees: 10000,
    website: 'shopify.com',
    description: 'Leading e-commerce platform for businesses of all sizes',
    leadership: [
      { name: 'Tobi Lutke', title: 'CEO', since: 2008 },
      { name: 'Amy Shapero', title: 'CFO', since: 2019 }
    ],
    financials: {
      revenue: '$7.1B',
      market_cap: '$180B',
      pe_ratio: 95.2,
      dividend_yield: 0
    },
    segments: ['Subscription solutions', 'Merchant solutions', 'Shopify Plus'],
    brands: ['Shopify', 'Shopify Plus', 'Shopify Payments', 'Shopify Capital'],
    markets: '175+ countries'
  },
  ' Marriott': {
    id: randomUUID(),
    name: 'Marriott International',
    legal_name: 'Marriott International Inc',
    ticker: 'MAR',
    exchange: 'NASDAQ',
    industry: 'Hotels & Hospitality',
    sector: 'Consumer Cyclical',
    headquarters: { city: 'Bethesda', state: 'Maryland', country: 'USA' },
    founded: 1927,
    employees: 120000,
    website: 'marriott.com',
    description: 'Global hotel operator with 30+ brands and 8,000+ properties',
    leadership: [
      { name: 'Tony Capuano', title: 'CEO', since: 2021 },
      { name: 'Kathleen Oberg', title: 'CFO', since: 2016 }
    ],
    financials: {
      revenue: '$20.9B',
      market_cap: '$65B',
      pe_ratio: 22.1,
      dividend_yield: 1.8
    },
    segments: ['North American', 'International', 'Luxury', 'Premium'],
    brands: ['The Ritz-Carlton', 'St. Regis', 'Marriott', 'Sheraton', 'Westin', 'Courtyard'],
    markets: '139+ countries'
  }
};

// GET /company-profile - Get company profile
router.get('/', (req: Request, res: Response) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Name parameter is required'
    });
    return;
  }

  const companyName = name.toLowerCase();
  const company = companyProfiles[companyName];

  if (!company) {
    // Generate a generic profile
    const generatedProfile = {
      id: randomUUID(),
      name: name,
      legal_name: name + ' Inc',
      ticker: 'N/A',
      exchange: 'Private',
      industry: 'Unknown',
      sector: 'Unknown',
      headquarters: { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
      founded: null,
      employees: null,
      website: null,
      description: 'Company profile data not available',
      leadership: [],
      financials: null,
      segments: [],
      brands: [],
      markets: 'Unknown'
    };

    res.json({
      success: true,
      data: generatedProfile,
      note: 'Profile data generated with limited information'
    });
    return;
  }

  res.json({
    success: true,
    data: company
  });
});

export default router;
