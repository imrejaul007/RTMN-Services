import { Router, Request, Response } from 'express';
import { prioritizeLeads } from '../services/prioritization';
import { ApiResponse, PrioritizedLead } from '../types';

const router = Router();

/**
 * GET /api/sales/prioritize
 * Prioritize leads based on AI analysis
 */
router.get('/prioritize', async (req: Request, res: Response) => {
  try {
    const { leads, limit, factors } = req.query;

    let leadsData: any[];

    if (leads) {
      // Use provided leads data
      leadsData = JSON.parse(leads as string);
    } else {
      // Fetch leads from demo data or mock
      leadsData = getMockLeads();
    }

    if (!leadsData || leadsData.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No leads provided for prioritization'
      };
      return res.status(400).json(response);
    }

    const prioritizedLeads = await prioritizeLeads({
      leads: leadsData,
      limit: limit ? Number(limit) : undefined,
      factors: factors ? (factors as string).split(',') : undefined
    });

    const response: ApiResponse<PrioritizedLead[]> = {
      success: true,
      data: prioritizedLeads,
      message: `Prioritized ${prioritizedLeads.length} leads`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prioritize leads'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/prioritize/factors
 * Get the factors used in lead prioritization
 */
router.get('/prioritize/factors', async (req: Request, res: Response) => {
  const factors = [
    {
      name: 'Recency',
      weight: 0.25,
      description: 'How recently the lead was contacted'
    },
    {
      name: 'Engagement Score',
      weight: 0.25,
      description: 'Level of interaction with emails, calls, demos'
    },
    {
      name: 'Deal Size',
      weight: 0.20,
      description: 'Potential revenue from the deal'
    },
    {
      name: 'Stage Progress',
      weight: 0.15,
      description: 'How far along in the pipeline'
    },
    {
      name: 'Fit Score',
      weight: 0.15,
      description: 'Alignment with ideal customer profile'
    }
  ];

  const response: ApiResponse = {
    success: true,
    data: factors
  };

  res.json(response);
});

// Mock data for demo purposes
function getMockLeads() {
  return [
    {
      id: 'lead-001',
      name: 'John Smith',
      company: 'Acme Corp',
      email: 'john@acme.com',
      score: 85,
      stage: 'qualified',
      revenue: 150000,
      lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      industry: 'Technology'
    },
    {
      id: 'lead-002',
      name: 'Sarah Johnson',
      company: 'TechStart Inc',
      email: 'sarah@techstart.com',
      score: 72,
      stage: 'proposal',
      revenue: 75000,
      lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      industry: 'SaaS'
    },
    {
      id: 'lead-003',
      name: 'Mike Williams',
      company: 'Global Enterprise',
      email: 'mike@global.com',
      score: 90,
      stage: 'negotiation',
      revenue: 500000,
      lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      industry: 'Finance'
    },
    {
      id: 'lead-004',
      name: 'Emily Brown',
      company: 'StartupXYZ',
      email: 'emily@startupxyz.com',
      score: 45,
      stage: 'new',
      revenue: 25000,
      lastContactedAt: undefined,
      industry: 'E-commerce'
    },
    {
      id: 'lead-005',
      name: 'David Lee',
      company: 'MegaCorp',
      email: 'david@megacorp.com',
      score: 78,
      stage: 'contacted',
      revenue: 200000,
      lastContactedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      industry: 'Healthcare'
    }
  ];
}

export default router;
