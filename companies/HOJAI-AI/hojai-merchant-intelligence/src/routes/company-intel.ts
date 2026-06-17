import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock company intelligence data
const companyIntelData: Record<string, any> = {
  'acme corp': {
    id: randomUUID(),
    name: 'Acme Corp',
    industry: 'Manufacturing',
    size: 'Enterprise',
    employees: 5000,
    revenue: '$2.5B',
    growth_rate: 12,
    health_score: 78,
    insights: [
      { type: 'opportunity', text: 'Expanding into Asian markets - need local POS integration' },
      { type: 'risk', text: 'High employee turnover in sales team (35% annually)' },
      { type: 'opportunity', text: 'Recently raised Series C - likely seeking operational tools' }
    ],
    technology_stack: ['Salesforce', 'SAP', 'Slack', 'Zoom'],
    pain_points: ['Inventory management', 'Multi-location coordination', 'Customer tracking'],
    buying_signals: ['Hiring spree', 'New CMO appointment', 'Office expansion']
  },
  'techstart inc': {
    id: randomUUID(),
    name: 'TechStart Inc',
    industry: 'Technology',
    size: 'SMB',
    employees: 150,
    revenue: '$15M',
    growth_rate: 45,
    health_score: 92,
    insights: [
      { type: 'opportunity', text: 'Hypergrowth phase - high demand for automation' },
      { type: 'opportunity', text: 'Recently closed Series A - building out operations' },
      { type: 'risk', text: 'Limited cash runway - 18 months' }
    ],
    technology_stack: ['HubSpot', 'AWS', 'Stripe', 'Notion'],
    pain_points: ['Scalable processes', 'Hiring and onboarding', 'Customer success'],
    buying_signals: ['Job postings spike', 'New VP of Sales', 'Conference sponsorship']
  },
  'global retail': {
    id: randomUUID(),
    name: 'Global Retail Co',
    industry: 'Retail',
    size: 'Enterprise',
    employees: 15000,
    revenue: '$8B',
    growth_rate: 5,
    health_score: 65,
    insights: [
      { type: 'opportunity', text: 'Omnichannel transformation initiative underway' },
      { type: 'risk', text: 'Declining in-store traffic (-8% YoY)' },
      { type: 'opportunity', text: 'CEO publicly committed to digital investment' }
    ],
    technology_stack: ['Oracle', 'Magento', 'Shopify POS', 'Klaviyo'],
    pain_points: ['E-commerce integration', 'Inventory sync', 'Customer experience'],
    buying_signals: ['RFP issued for CRM', 'Digital transformation head hired', 'Agency partnerships']
  },
  'healthplus': {
    id: randomUUID(),
    name: 'HealthPlus Medical',
    industry: 'Healthcare',
    size: 'Mid-Market',
    employees: 800,
    revenue: '$120M',
    growth_rate: 18,
    health_score: 85,
    insights: [
      { type: 'opportunity', text: 'Telehealth expansion driving new tool needs' },
      { type: 'opportunity', text: 'Recent acquisition - integration phase' },
      { type: 'risk', text: 'Compliance-heavy - lengthy procurement cycles' }
    ],
    technology_stack: ['Epic', 'Zoom for Healthcare', 'Microsoft 365', 'ServiceNow'],
    pain_points: ['Patient communication', 'Appointment scheduling', 'Insurance verification'],
    buying_signals: ['Partnership with telehealth vendor', 'Patient portal upgrade', 'New facilities']
  }
};

// GET /company-intel - Get company intelligence
router.get('/', (req: Request, res: Response) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    // Return all companies
    const allCompanies = Object.values(companyIntelData);
    res.json({
      success: true,
      data: {
        companies: allCompanies,
        total: allCompanies.length
      }
    });
    return;
  }

  const companyName = name.toLowerCase();
  const company = companyIntelData[companyName];

  if (!company) {
    // Generate mock data for unknown company
    const generatedCompany = {
      id: randomUUID(),
      name: name,
      industry: 'Unknown',
      size: 'Unknown',
      employees: 0,
      revenue: 'Unknown',
      growth_rate: 0,
      health_score: 50,
      insights: [
        { type: 'opportunity', text: 'Limited data available - requires manual research' }
      ],
      technology_stack: [],
      pain_points: [],
      buying_signals: []
    };

    res.json({
      success: true,
      data: generatedCompany,
      note: 'Data generated based on limited information'
    });
    return;
  }

  res.json({
    success: true,
    data: company
  });
});

export default router;
