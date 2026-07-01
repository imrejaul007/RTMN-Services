/**
 * HROS - Benefits Administration Platform
 *
 * Complete benefits management
 * Inspired by: Darwinbox Benefits + Plum + Quicko
 *
 * Modules:
 * - Health Insurance
 * - Life Insurance
 * - Retirement Plans (EPF/Gratuity/NPS)
 * - Wellness Programs
 * - Perk Platform
 * - Flexible Benefits
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface BenefitPlan {
  id: string;
  name: string;
  type: 'health' | 'life' | 'retirement' | 'wellness' | 'perk' | 'flexible';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  // Coverage
  coverage: BenefitCoverage;

  // Costs
  costs: {
    employeeContribution: number;
    employerContribution: number;
    totalPremium: number;
  };

  // Eligibility
  eligibility: {
    minTenure: number;      // months
    minGrade: string[];
    employmentTypes: string[];
  };

  status: 'active' | 'archived';
  createdAt: Date;
}

export interface BenefitCoverage {
  // Health
  inpatient?: { limit: number; copay: number; };
  outpatient?: { limit: number; };
  maternity?: { limit: number; };
  dental?: { limit: number; };
  optical?: { limit: number; };
  mentalHealth?: { limit: number; };
  wellnessAllowance?: number;

  // Life
  termLife?: number;
  accidentalDeath?: number;
  disability?: number;

  // Retirement
  epfContribution?: number;
  gratuity?: number;
  npsContribution?: number;

  // Perk
  PerkAllowances?: PerkAllowance[];
}

export interface PerkAllowance {
  category: string;
  monthlyLimit: number;
  utilized: number;
}

export interface EmployeeBenefits {
  employeeId: string;
  enrollments: BenefitEnrollment[];
  totalValue: number;
  monthlyDeduction: number;
  asOf: Date;
}

export interface BenefitEnrollment {
  planId: string;
  planName: string;
  planType: string;
  tier: string;

  coverage: any;
  monthlyPremium: number;
  employerContribution: number;
  employeeContribution: number;

  dependents: Dependent[];
  claims: Claim[];

  enrolledAt: Date;
  effectiveFrom: Date;
  status: 'active' | 'pending' | 'cancelled';
}

export interface Dependent {
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling';
  dateOfBirth: Date;
  gender: string;
  aadhaar?: string;
  isDisabled?: boolean;
}

export interface Claim {
  id: string;
  type: 'cashless' | 'reimbursement';
  status: 'submitted' | 'processing' | 'approved' | 'rejected' | 'paid';

  amount: number;
  approvedAmount?: number;

  description: string;
  documents: string[];

  submittedAt: Date;
  processedAt?: Date;
  paidAt?: Date;

  provider?: string;
  claimNumber?: string;
}

export interface WellnessProgram {
  id: string;
  name: string;
  type: 'fitness' | 'mental' | 'nutrition' | 'preventive' | 'family';

  benefits: WellnessBenefit[];

  eligibility: string[];
  cost: number;

  enrolledEmployees: number;
  utilization: number;

  status: 'active' | 'completed' | 'archived';
}

export interface WellnessBenefit {
  name: string;
  description: string;
  limit: number;
  utilized: number;
  provider?: string;
}

export interface PerkRedemption {
  id: string;
  employeeId: string;
  category: string;
  item: string;
  amount: number;
  merchant?: string;
  status: 'pending' | 'approved' | 'rejected';
  redeemedAt?: Date;
}

// ============================================================
// STORAGE
// ============================================================

const plans = new Map<string, BenefitPlan>();
const employeeBenefits = new Map<string, EmployeeBenefits>();
const claims = new Map<string, Claim[]>();
const wellnessPrograms = new Map<string, WellnessProgram>();
const perkRedemptions = new Map<string, PerkRedemption[]>();

// ============================================================
// DEFAULT PLANS
// ============================================================

function initializeDefaultPlans() {
  // Health Plans
  const healthPlans: Omit<BenefitPlan, 'id' | 'createdAt'>[] = [
    {
      name: 'Health Bronze',
      type: 'health',
      tier: 'bronze',
      coverage: {
        inpatient: { limit: 300000, copay: 0.2 },
        outpatient: { limit: 15000 },
      },
      costs: { employeeContribution: 500, employerContribution: 1500, totalPremium: 2000 },
      eligibility: { minTenure: 0, minGrade: ['L1', 'L2'], employmentTypes: ['full-time'] },
      status: 'active',
    },
    {
      name: 'Health Gold',
      type: 'health',
      tier: 'gold',
      coverage: {
        inpatient: { limit: 1000000, copay: 0 },
        outpatient: { limit: 50000 },
        maternity: { limit: 100000 },
        dental: { limit: 25000 },
        optical: { limit: 10000 },
        mentalHealth: { limit: 50000 },
      },
      costs: { employeeContribution: 1500, employerContribution: 3500, totalPremium: 5000 },
      eligibility: { minTenure: 6, minGrade: ['L3', 'L4', 'L5'], employmentTypes: ['full-time'] },
      status: 'active',
    },
    {
      name: 'Health Platinum',
      type: 'health',
      tier: 'platinum',
      coverage: {
        inpatient: { limit: 2000000, copay: 0 },
        outpatient: { limit: 100000 },
        maternity: { limit: 200000 },
        dental: { limit: 50000 },
        optical: { limit: 25000 },
        mentalHealth: { limit: 100000 },
        wellnessAllowance: 2000,
      },
      costs: { employeeContribution: 2500, employerContribution: 7500, totalPremium: 10000 },
      eligibility: { minTenure: 12, minGrade: ['L6', 'L7', 'L8'], employmentTypes: ['full-time'] },
      status: 'active',
    },
  ];

  // Life Insurance
  const lifePlans: Omit<BenefitPlan, 'id' | 'createdAt'>[] = [
    {
      name: 'Term Life Basic',
      type: 'life',
      tier: 'bronze',
      coverage: {
        termLife: 500000,
        accidentalDeath: 500000,
      },
      costs: { employeeContribution: 0, employerContribution: 500, totalPremium: 500 },
      eligibility: { minTenure: 0, minGrade: ['L1', 'L2', 'L3', 'L4'], employmentTypes: ['full-time'] },
      status: 'active',
    },
    {
      name: 'Term Life Premium',
      type: 'life',
      tier: 'gold',
      coverage: {
        termLife: 2000000,
        accidentalDeath: 2000000,
        disability: 1000000,
      },
      costs: { employeeContribution: 0, employerContribution: 2000, totalPremium: 2000 },
      eligibility: { minTenure: 6, minGrade: ['L5', 'L6', 'L7', 'L8'], employmentTypes: ['full-time'] },
      status: 'active',
    },
  ];

  // Wellness
  const wellnessPlans: Omit<BenefitPlan, 'id' | 'createdAt'>[] = [
    {
      name: 'Fitness Wellness',
      type: 'wellness',
      tier: 'gold',
      coverage: {
        wellnessAllowance: 3000,
      },
      costs: { employeeContribution: 0, employerContribution: 3000, totalPremium: 3000 },
      eligibility: { minTenure: 0, minGrade: ['L1', 'L2', 'L3', 'L4', 'L5'], employmentTypes: ['full-time'] },
      status: 'active',
    },
  ];

  [...healthPlans, ...lifePlans, ...wellnessPlans].forEach(plan => {
    const id = crypto.randomUUID();
    plans.set(id, { ...plan, id, createdAt: new Date() });
  });

  console.log(`Initialized ${plans.size} benefit plans`);
}

initializeDefaultPlans();

// ============================================================
// ROUTES - PLANS
// ============================================================

router.get('/plans', async (req, res) => {
  try {
    const { type, tier, status } = req.query;
    let result = Array.from(plans.values());

    if (type) result = result.filter(p => p.type === type);
    if (tier) result = result.filter(p => p.tier === tier);
    if (status) result = result.filter(p => p.status === status);

    res.json({ success: true, plans: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/plans/:id', async (req, res) => {
  try {
    const plan = plans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const plan: BenefitPlan = {
      id: crypto.randomUUID(),
      ...req.body,
      status: req.body.status || 'active',
      createdAt: new Date(),
    };

    plans.set(plan.id, plan);
    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - ENROLLMENTS
// ============================================================

router.post('/enroll', async (req, res) => {
  try {
    const { employeeId, planId, dependents } = req.body;

    const plan = plans.get(planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    // Check eligibility
    const eligible = checkEligibility(employeeId, plan);
    if (!eligible) {
      return res.status(400).json({ success: false, error: 'Employee not eligible for this plan' });
    }

    const enrollment: BenefitEnrollment = {
      planId,
      planName: plan.name,
      planType: plan.type,
      tier: plan.tier,
      coverage: plan.coverage,
      monthlyPremium: plan.costs.totalPremium,
      employerContribution: plan.costs.employerContribution,
      employeeContribution: plan.costs.employeeContribution,
      dependents: dependents || [],
      claims: [],
      enrolledAt: new Date(),
      effectiveFrom: calculateEffectiveDate(plan.eligibility.minTenure),
      status: 'active',
    };

    // Update employee benefits
    let empBenefits = employeeBenefits.get(employeeId) || {
      employeeId,
      enrollments: [],
      totalValue: 0,
      monthlyDeduction: 0,
      asOf: new Date(),
    };

    empBenefits.enrollments.push(enrollment);
    empBenefits.totalValue = calculateTotalValue(empBenefits.enrollments);
    empBenefits.monthlyDeduction = calculateMonthlyDeduction(empBenefits.enrollments);
    empBenefits.asOf = new Date();

    employeeBenefits.set(employeeId, empBenefits);

    res.status(201).json({ success: true, enrollment, empBenefits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/employee/:employeeId', async (req, res) => {
  try {
    const benefits = employeeBenefits.get(req.params.employeeId);
    if (!benefits) {
      return res.status(404).json({ success: false, error: 'No benefits found' });
    }
    res.json({ success: true, benefits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/switch', async (req, res) => {
  try {
    const { employeeId, oldPlanId, newPlanId } = req.body;

    const empBenefits = employeeBenefits.get(employeeId);
    if (!empBenefits) {
      return res.status(404).json({ success: false, error: 'No benefits found' });
    }

    // Cancel old enrollment
    const oldIdx = empBenefits.enrollments.findIndex(e => e.planId === oldPlanId);
    if (oldIdx !== -1) {
      empBenefits.enrollments[oldIdx].status = 'cancelled';
    }

    // Enroll new plan
    const newPlan = plans.get(newPlanId);
    if (newPlan) {
      const newEnrollment: BenefitEnrollment = {
        planId: newPlanId,
        planName: newPlan.name,
        planType: newPlan.type,
        tier: newPlan.tier,
        coverage: newPlan.coverage,
        monthlyPremium: newPlan.costs.totalPremium,
        employerContribution: newPlan.costs.employerContribution,
        employeeContribution: newPlan.costs.employeeContribution,
        dependents: [],
        claims: [],
        enrolledAt: new Date(),
        effectiveFrom: calculateEffectiveDate(newPlan.eligibility.minTenure),
        status: 'active',
      };
      empBenefits.enrollments.push(newEnrollment);
    }

    empBenefits.totalValue = calculateTotalValue(empBenefits.enrollments);
    empBenefits.monthlyDeduction = calculateMonthlyDeduction(empBenefits.enrollments);

    employeeBenefits.set(employeeId, empBenefits);

    res.json({ success: true, benefits: empBenefits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - CLAIMS
// ============================================================

router.post('/claims', async (req, res) => {
  try {
    const { employeeId, planId, type, amount, description, documents, provider } = req.body;

    const claim: Claim = {
      id: crypto.randomUUID(),
      type,
      status: 'submitted',
      amount,
      description,
      documents: documents || [],
      submittedAt: new Date(),
      provider,
    };

    // Update employee claims
    let empClaims = claims.get(employeeId) || [];
    empClaims.push(claim);
    claims.set(employeeId, empClaims);

    // Update enrollment
    const empBenefits = employeeBenefits.get(employeeId);
    if (empBenefits) {
      const enrollment = empBenefits.enrollments.find(e => e.planId === planId);
      if (enrollment) {
        enrollment.claims.push(claim);
        employeeBenefits.set(employeeId, empBenefits);
      }
    }

    res.status(201).json({ success: true, claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/claims/:employeeId', async (req, res) => {
  try {
    const { status, planId } = req.query;
    let empClaims = claims.get(req.params.employeeId) || [];

    if (status) empClaims = empClaims.filter(c => c.status === status);

    res.json({ success: true, claims: empClaims, count: empClaims.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/claims/:claimId/process', async (req, res) => {
  try {
    const { employeeId, status, approvedAmount } = req.body;

    const empClaims = claims.get(employeeId);
    if (!empClaims) {
      return res.status(404).json({ success: false, error: 'Claims not found' });
    }

    const claim = empClaims.find(c => c.id === req.params.claimId);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    claim.status = status || 'approved';
    claim.approvedAmount = approvedAmount || claim.amount;
    claim.processedAt = new Date();

    if (status === 'paid') {
      claim.paidAt = new Date();
    }

    claims.set(employeeId, empClaims);

    res.json({ success: true, claim });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - WELLNESS
// ============================================================

router.get('/wellness', async (req, res) => {
  try {
    const result = Array.from(wellnessPrograms.values());
    res.json({ success: true, programs: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/wellness/:id/enroll', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const program = wellnessPrograms.get(req.params.id);

    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }

    program.enrolledEmployees++;
    wellnessPrograms.set(req.params.id, program);

    res.json({ success: true, program });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - PERKS
// ============================================================

router.get('/perks/:employeeId', async (req, res) => {
  try {
    const redemptions = perkRedemptions.get(req.params.employeeId) || [];
    res.json({ success: true, redemptions, count: redemptions.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/perks/redeem', async (req, res) => {
  try {
    const { employeeId, category, item, amount, merchant } = req.body;

    const redemption: PerkRedemption = {
      id: crypto.randomUUID(),
      employeeId,
      category,
      item,
      amount,
      merchant,
      status: 'pending',
    };

    const empRedemptions = perkRedemptions.get(employeeId) || [];
    empRedemptions.push(redemption);
    perkRedemptions.set(employeeId, empRedemptions);

    res.status(201).json({ success: true, redemption });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REPORTS
// ============================================================

router.get('/reports/enrollment-summary', async (req, res) => {
  try {
    const summary = {
      totalEmployees: employeeBenefits.size,
      byPlanType: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
      totalMonthlyCost: 0,
      totalAnnualCost: 0,
    };

    for (const [, benefits] of employeeBenefits) {
      benefits.enrollments.forEach(e => {
        summary.byPlanType[e.planType] = (summary.byPlanType[e.planType] || 0) + 1;
        summary.byTier[e.tier] = (summary.byTier[e.tier] || 0) + 1;
        summary.totalMonthlyCost += e.employerContribution;
      });
    }

    summary.totalAnnualCost = summary.totalMonthlyCost * 12;

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/claims-summary', async (req, res) => {
  try {
    let allClaims: Claim[] = [];
    for (const [, claimsList] of claims) {
      allClaims.push(...claimsList);
    }

    const summary = {
      total: allClaims.length,
      submitted: allClaims.filter(c => c.status === 'submitted').length,
      processing: allClaims.filter(c => c.status === 'processing').length,
      approved: allClaims.filter(c => c.status === 'approved').length,
      rejected: allClaims.filter(c => c.status === 'rejected').length,
      paid: allClaims.filter(c => c.status === 'paid').length,
      totalClaimed: allClaims.reduce((s, c) => s + c.amount, 0),
      totalApproved: allClaims.filter(c => c.approvedAmount)
        .reduce((s, c) => s + (c.approvedAmount || 0), 0),
    };

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function checkEligibility(employeeId: string, plan: BenefitPlan): boolean {
  // Simplified eligibility check
  // In production, would check employee tenure, grade, employment type
  return true;
}

function calculateEffectiveDate(minTenureMonths: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - minTenureMonths);
  return date;
}

function calculateTotalValue(enrollments: BenefitEnrollment[]): number {
  return enrollments
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + e.coverage.inpatient?.limit || 0, 0);
}

function calculateMonthlyDeduction(enrollments: BenefitEnrollment[]): number {
  return enrollments
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + e.employeeContribution, 0);
}

export default router;
