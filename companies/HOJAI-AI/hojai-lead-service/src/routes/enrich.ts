import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface EnrichInput {
  email?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
}

// Enrichment data sources (mock)
const enrichmentProviders = {
  clearbit: { credits_used: 1, fields: ['name', 'email', 'title', 'company', 'location', 'avatar'] },
  zoominfo: { credits_used: 2, fields: ['phone', 'company_size', 'revenue', 'technologies', 'social'] },
  hunter: { credits_used: 0.5, fields: ['email_pattern', 'confidence', 'sources'] }
};

// Mock enrichment function
function enrichLead(input: EnrichInput): any {
  const enrichedData: any = {
    id: randomUUID(),
    original: input,
    enriched: true,
    timestamp: new Date().toISOString()
  };

  // Basic enrichment (always available)
  enrichedData.person = {
    full_name: input.first_name && input.last_name ? `${input.first_name} ${input.last_name}` : 'Unknown',
    first_name: input.first_name || 'Unknown',
    last_name: input.last_name || 'Unknown',
    email: input.email || generateEmail(input),
    title: randomChoice(['VP of Sales', 'Director of Marketing', 'CEO', 'CTO', 'Head of Operations', 'Sales Manager']),
    seniority: randomChoice(['C-Level', 'VP', 'Director', 'Manager', 'Individual Contributor']),
    department: randomChoice(['Sales', 'Marketing', 'Engineering', 'Operations', 'Executive']),
    years_experience: Math.floor(Math.random() * 20) + 5,
    education: randomChoice(['MBA', 'BS Computer Science', 'BA Business', 'MS Data Science', 'BS Engineering'])
  };

  // Company enrichment
  enrichedData.company = {
    name: input.company_name || 'Unknown Company',
    domain: input.company_name ? input.company_name.toLowerCase().replace(/\s+/g, '') + '.com' : 'unknown.com',
    industry: randomChoice(['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education']),
    size: randomChoice(['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']),
    revenue: randomChoice(['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M-$500M', '$500M+']),
    founded: Math.floor(Math.random() * 50) + 1970,
    location: randomChoice(['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA']),
    description: `Leading provider in ${enrichedData.company.industry} sector`,
    linkedin_url: input.linkedin_url || null,
    twitter_handle: '@' + (input.company_name || 'company').toLowerCase().replace(/\s+/g, ''),
    facebook_url: null,
    crunchbase_url: null
  };

  // Tech stack (random)
  const allTech = ['Salesforce', 'HubSpot', 'Slack', 'Zoom', 'AWS', 'GCP', 'Stripe', 'Shopify', 'SAP', 'Oracle'];
  enrichedData.company.technologies = randomSample(allTech, Math.floor(Math.random() * 4) + 2);

  // Contact info
  enrichedData.contact = {
    email: enrichedData.person.email,
    phone: '+1 (555) ' + Math.floor(Math.random() * 900 + 100) + '-' + Math.floor(Math.random() * 9000 + 1000),
    mobile: null,
    linkedin_url: input.linkedin_url || `https://linkedin.com/in/${enrichedData.person.first_name.toLowerCase()}-${enrichedData.person.last_name.toLowerCase()}-${randomUUID().slice(0, 4)}`,
    twitter_handle: null
  };

  // Social proof
  enrichedData.social_proof = {
    linkedin_followers: Math.floor(Math.random() * 10000) + 100,
    twitter_followers: Math.floor(Math.random() * 5000),
    company_linkedin_followers: Math.floor(Math.random() * 50000) + 1000,
    funding_total: randomChoice(['Seed', 'Series A', 'Series B', 'Series C', 'Public', 'Profitable']),
    funding_amount: randomChoice(['$1M', '$5M', '$15M', '$50M', '$100M', '$500M'])
  };

  // Engagement data
  enrichedData.engagement = {
    website_visits_30d: Math.floor(Math.random() * 50),
    email_opens_30d: Math.floor(Math.random() * 20),
    email_clicks_30d: Math.floor(Math.random() * 10),
    page_views: randomSample(['Home', 'Pricing', 'Demo', 'Case Studies', 'Blog'], Math.floor(Math.random() * 3) + 1),
    last_visit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Data quality
  enrichedData.data_quality = {
    overall_score: Math.floor(Math.random() * 30) + 70,
    email_verified: Math.random() > 0.2,
    phone_verified: Math.random() > 0.5,
    linkedin_verified: Math.random() > 0.3,
    source_confidence: randomChoice(['high', 'medium', 'low'])
  };

  // Credits used
  enrichedData.api_usage = {
    providers_used: Object.keys(enrichmentProviders),
    estimated_credits: Object.values(enrichmentProviders).reduce((sum, p) => sum + p.credits_used, 0)
  };

  return enrichedData;
}

function generateEmail(input: EnrichInput): string {
  if (input.company_name && input.first_name && input.last_name) {
    const domain = input.company_name.toLowerCase().replace(/\s+/g, '') + '.com';
    return `${input.first_name.toLowerCase()}.${input.last_name.toLowerCase()}@${domain}`;
  }
  return 'enriched_' + randomUUID().slice(0, 8) + '@enriched.io';
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// POST /enrich - Enrich lead data
router.post('/', (req: Request, res: Response) => {
  const input = req.body as EnrichInput;

  if (!input || (!input.email && !input.company_name && !input.first_name)) {
    res.status(400).json({
      success: false,
      error: 'At least one of email, company_name, or first_name is required'
    });
    return;
  }

  const enriched = enrichLead(input);

  res.json({
    success: true,
    data: enriched
  });
});

export default router;
