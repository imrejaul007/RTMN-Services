/**
 * Benefits Routes
 * Government benefits and subsidies endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const benefits: Map<string, any> = new Map();

// Government benefit schemes
const benefitSchemes = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    category: 'healthcare',
    description: 'Health insurance coverage of ₹5 lakh per family per year',
    eligibility: { maxIncome: 250000, categories: ['SECC families'] },
    benefits: ['Cashless treatment', 'Pre and post hospitalization', 'Newborn coverage']
  },
  {
    id: 'pmkisan',
    name: 'PM-KISAN',
    category: 'agriculture',
    description: '₹6000 per year to farmer families',
    eligibility: { maxLandSize: '2.5 hectares', categories: ['Small farmers', 'Marginal farmers'] },
    benefits: ['₹6000/year', '3 installments', 'Direct bank transfer']
  },
  {
    id: 'pmay',
    name: 'Pradhan Mantri Awas Yojana',
    category: 'housing',
    description: 'Subsidy on home loan interest',
    eligibility: { maxIncome: 300000, categories: ['Economically weaker', 'Lower income', 'Middle income'] },
    benefits: ['4% interest subsidy', 'Up to ₹2.3 lakh', 'Credit linked']
  },
  {
    id: 'jjm',
    name: 'Jal Jeevan Mission',
    category: 'water',
    description: 'Tap water connection to every household',
    eligibility: { categories: ['All rural households'] },
    benefits: ['Tap water', '55 LPCD', 'FHTC']
  },
  {
    id: 'sag',
    name: 'Stand Up India',
    category: 'business',
    description: 'Bank loans for SC/ST and women entrepreneurs',
    eligibility: { categories: ['SC/ST', 'Women'], minAge: 18, maxAge: 45 },
    benefits: ['₹10 lakh to ₹1 crore', '4% lower than market rate', 'Composite loan']
  }
];

// GET /api/benefits/schemes - List benefit schemes
router.get('/schemes', (req: Request, res: Response) => {
  const { category } = req.query;

  let filtered = benefitSchemes;
  if (category) {
    filtered = benefitSchemes.filter(s => s.category === category);
  }

  res.json({ success: true, schemes: filtered });
});

// GET /api/benefits/schemes/:id - Get scheme details
router.get('/schemes/:id', (req: Request, res: Response) => {
  const scheme = benefitSchemes.find(s => s.id === req.params.id);

  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  res.json({ success: true, scheme });
});

// POST /api/benefits/check-eligibility - Check eligibility for scheme
router.post('/check-eligibility', (req: Request, res: Response) => {
  const { schemeId, income, landSize, category, age, gender } = req.body;

  const scheme = benefitSchemes.find(s => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  const eligible = checkEligibility(scheme.eligibility, { income, landSize, category, age, gender });

  res.json({
    success: true,
    scheme: scheme.name,
    eligible,
    matchedCriteria: getMatchedCriteria(scheme.eligibility, { income, landSize, category, age, gender }),
    unmatchedCriteria: getUnmatchedCriteria(scheme.eligibility, { income, landSize, category, age, gender })
  });
});

// POST /api/benefits/apply - Apply for benefit
router.post('/apply', (req: Request, res: Response) => {
  const { schemeId, beneficiaryId, details } = req.body;

  if (!schemeId || !beneficiaryId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const scheme = benefitSchemes.find(s => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  const applicationId = uuidv4();
  const now = new Date();

  const application = {
    applicationId,
    schemeId,
    schemeName: scheme.name,
    beneficiaryId,
    status: 'submitted',
    submittedAt: now.toISOString(),
    documents: details?.documents || [],
    verificationStatus: 'pending',
    approvalStatus: 'pending',
    disbursementStatus: 'pending',
    estimatedDisbursement: scheme.category === 'agriculture' ? 6000 : null
  };

  benefits.set(applicationId, application);

  res.status(201).json({ success: true, application });
});

// GET /api/benefits/applications - List applications
router.get('/applications', (req: Request, res: Response) => {
  const { beneficiaryId, status } = req.query;

  let filtered = Array.from(benefits.values());

  if (beneficiaryId) filtered = filtered.filter(b => b.beneficiaryId === beneficiaryId);
  if (status) filtered = filtered.filter(b => b.status === status);

  res.json({ success: true, applications: filtered });
});

// GET /api/benefits/applications/:id - Get application details
router.get('/applications/:id', (req: Request, res: Response) => {
  const application = benefits.get(req.params.id);

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  res.json({ success: true, application });
});

// Helper functions
function checkEligibility(eligibility: any, applicant: any): boolean {
  if (eligibility.maxIncome && applicant.income > eligibility.maxIncome) return false;
  if (eligibility.maxLandSize && applicant.landSize > eligibility.maxLandSize) return false;
  if (eligibility.minAge && applicant.age < eligibility.minAge) return false;
  if (eligibility.maxAge && applicant.age > eligibility.maxAge) return false;
  if (eligibility.categories && !eligibility.categories.some((c: string) => applicant.category?.includes(c))) return false;
  return true;
}

function getMatchedCriteria(eligibility: any, applicant: any): string[] {
  const matched: string[] = [];
  if (eligibility.categories?.some((c: string) => applicant.category?.includes(c))) matched.push('Category');
  if (applicant.income <= eligibility.maxIncome) matched.push('Income level');
  return matched;
}

function getUnmatchedCriteria(eligibility: any, applicant: any): string[] {
  const unmatched: string[] = [];
  if (eligibility.maxIncome && applicant.income > eligibility.maxIncome) unmatched.push('Income exceeds limit');
  if (eligibility.maxLandSize && applicant.landSize > eligibility.maxLandSize) unmatched.push('Land size exceeds limit');
  return unmatched;
}

export default router;
