import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { InsurancePolicy, Claim, createInsurancePolicy } from '../models/FinanceProfile';
import winston from 'winston';

// In-memory storage for demo (replace with database in production)
const policies: Map<string, InsurancePolicy> = new Map();
const claims: Map<string, Claim> = new Map();

/**
 * Insurance Routes
 * Handles insurance quotes, policies, and claims
 */
export default function insuranceRoutes(
  customerOpsBridge: CustomerOpsBridge,
  logger: winston.Logger
): Router {
  const router = Router();

  /**
   * POST /api/insurance/quote
   * Get insurance quote
   */
  router.post('/quote', async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        policyType,
        coverageAmount,
        duration = 12, // months
        riskFactors
      } = req.body;

      if (!customerId || !policyType || !coverageAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, policyType, coverageAmount'
        });
      }

      // Calculate premium based on policy type and coverage
      const basePremium = calculateBasePremium(policyType, coverageAmount);
      const riskAdjustment = calculateRiskAdjustment(riskFactors);
      const monthlyPremium = basePremium * riskAdjustment;

      const quote = {
        id: `QT-${uuidv4().substring(0, 8).toUpperCase()}`,
        customerId,
        policyType,
        coverageAmount,
        duration,
        monthlyPremium,
        totalPremium: monthlyPremium * duration,
        riskFactors: riskFactors || {},
        riskAdjustment: riskAdjustment,
        coverageDetails: getCoverageDetails(policyType, coverageAmount),
        exclusions: getExclusions(policyType),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdAt: new Date().toISOString()
      };

      // Check customer risk profile
      const trustCheck = await customerOpsBridge.checkTrustScore(customerId);

      res.json({
        success: true,
        quote,
        riskAssessment: {
          trustScore: trustCheck.score,
          eligible: trustCheck.score >= 60,
          premiumAdjustment: trustCheck.score < 70 ? 1.1 : 1.0
        }
      });
    } catch (error: any) {
      logger.error({
        action: 'quote_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/insurance/policy
   * Purchase an insurance policy
   */
  router.post('/policy', async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        policyType,
        coverageAmount,
        duration = 12,
        riskFactors,
        beneficiary,
        paymentMethodId
      } = req.body;

      if (!customerId || !policyType || !coverageAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, policyType, coverageAmount'
        });
      }

      // Validate customer
      const trustCheck = await customerOpsBridge.checkTrustScore(customerId);

      if (trustCheck.score < 60) {
        return res.status(400).json({
          success: false,
          error: 'Customer does not meet eligibility requirements',
          trustScore: trustCheck.score
        });
      }

      // Calculate premium
      const riskAdjustment = calculateRiskAdjustment(riskFactors);
      const monthlyPremium = calculateBasePremium(policyType, coverageAmount) * riskAdjustment;

      // Create policy
      const policy = createInsurancePolicy(customerId, policyType, coverageAmount, monthlyPremium);

      if (beneficiary) {
        policy.beneficiary = beneficiary;
      }

      policy.premiumFrequency = 'monthly';
      policy.endDate = new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000);
      policy.coverageDetails = getCoverageDetails(policyType, coverageAmount);
      policy.linkedFinanceProfileId = customerId;

      // Store policy
      policies.set(policy.id, policy);

      // Publish event
      await customerOpsBridge.publishPolicyEvent(policy, 'created');

      logger.info({
        action: 'policy_created',
        policyId: policy.id,
        customerId,
        policyType,
        coverageAmount,
        monthlyPremium
      });

      res.status(201).json({
        success: true,
        policy,
        message: 'Policy created successfully'
      });
    } catch (error: any) {
      logger.error({
        action: 'create_policy_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/insurance/policies
   * List insurance policies
   */
  router.get('/policies', async (req: Request, res: Response) => {
    try {
      const { customerId, status, policyType, limit = 50, offset = 0 } = req.query;

      let filteredPolicies = Array.from(policies.values());

      if (customerId) {
        filteredPolicies = filteredPolicies.filter(p => p.customerId === customerId);
      }

      if (status) {
        filteredPolicies = filteredPolicies.filter(p => p.status === status);
      }

      if (policyType) {
        filteredPolicies = filteredPolicies.filter(p => p.policyType === policyType);
      }

      // Sort by date descending
      filteredPolicies.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const total = filteredPolicies.length;
      const paginatedPolicies = filteredPolicies.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        policies: paginatedPolicies,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + paginatedPolicies.length < total
        }
      });
    } catch (error: any) {
      logger.error({
        action: 'list_policies_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/insurance/policies/:id
   * Get policy details
   */
  router.get('/policies/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const policy = policies.get(id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found'
        });
      }

      res.json({
        success: true,
        policy
      });
    } catch (error: any) {
      logger.error({
        action: 'get_policy_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/insurance/claims
   * List claims
   */
  router.get('/claims', async (req: Request, res: Response) => {
    try {
      const { customerId, policyId, status, limit = 50, offset = 0 } = req.query;

      let filteredClaims = Array.from(claims.values());

      if (customerId) {
        const customerPolicies = Array.from(policies.values())
          .filter(p => p.customerId === customerId)
          .map(p => p.id);
        filteredClaims = filteredClaims.filter(c => customerPolicies.includes(c.policyId));
      }

      if (policyId) {
        filteredClaims = filteredClaims.filter(c => c.policyId === policyId);
      }

      if (status) {
        filteredClaims = filteredClaims.filter(c => c.status === status);
      }

      filteredClaims.sort((a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const total = filteredClaims.length;
      const paginatedClaims = filteredClaims.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        claims: paginatedClaims,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + paginatedClaims.length < total
        }
      });
    } catch (error: any) {
      logger.error({
        action: 'list_claims_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/insurance/claims
   * File a new claim
   */
  router.post('/claims', async (req: Request, res: Response) => {
    try {
      const {
        policyId,
        claimType,
        description,
        claimedAmount,
        documents = []
      } = req.body;

      if (!policyId || !claimType || !description || !claimedAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: policyId, claimType, description, claimedAmount'
        });
      }

      const policy = policies.get(policyId);

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found'
        });
      }

      if (policy.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Policy is not active'
        });
      }

      if (claimedAmount > policy.coverageAmount) {
        return res.status(400).json({
          success: false,
          error: 'Claimed amount exceeds coverage amount'
        });
      }

      const claim: Claim = {
        id: `CLM-${uuidv4().substring(0, 8).toUpperCase()}`,
        policyId,
        claimNumber: `RZD-CLM-${Date.now().toString(36).toUpperCase()}`,
        claimType,
        description,
        claimedAmount,
        status: 'submitted',
        documents,
        submittedAt: new Date()
      };

      claims.set(claim.id, claim);

      // Update policy status
      policy.status = 'pending_claim';
      policy.claims.push(claim);
      policies.set(policyId, policy);

      // Publish event
      await customerOpsBridge.publishClaimEvent(claim, policy);

      logger.info({
        action: 'claim_filed',
        claimId: claim.id,
        policyId,
        claimedAmount
      });

      res.status(201).json({
        success: true,
        claim,
        message: 'Claim submitted successfully'
      });
    } catch (error: any) {
      logger.error({
        action: 'file_claim_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/insurance/claims/:id
   * Get claim details
   */
  router.get('/claims/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const claim = claims.get(id);

      if (!claim) {
        return res.status(404).json({
          success: false,
          error: 'Claim not found'
        });
      }

      const policy = policies.get(claim.policyId);

      res.json({
        success: true,
        claim,
        policy
      });
    } catch (error: any) {
      logger.error({
        action: 'get_claim_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

/**
 * Calculate base premium based on policy type and coverage
 */
function calculateBasePremium(policyType: string, coverageAmount: number): number {
  const baseRates: { [key: string]: number } = {
    life: 0.002,
    health: 0.003,
    property: 0.001,
    vehicle: 0.004,
    business: 0.003,
    travel: 0.005
  };

  const rate = baseRates[policyType] || 0.002;
  return coverageAmount * rate / 12; // Monthly premium
}

/**
 * Calculate risk adjustment factor
 */
function calculateRiskAdjustment(riskFactors?: any): number {
  if (!riskFactors) return 1.0;

  let adjustment = 1.0;

  if (riskFactors.smoker) adjustment *= 1.5;
  if (riskFactors.dangerousHobby) adjustment *= 1.25;
  if (riskFactors.poorHealthHistory) adjustment *= 1.3;
  if (riskFactors.highRiskLocation) adjustment *= 1.2;
  if (riskFactors.youngDriver) adjustment *= 1.4;
  if (riskFactors.luxuryVehicle) adjustment *= 1.3;

  // Good factors
  if (riskFactors.goodHealth) adjustment *= 0.9;
  if (riskFactors.securitySystem) adjustment *= 0.85;
  if (riskFactors.safeDriver) adjustment *= 0.9;

  return Math.min(Math.max(adjustment, 0.5), 3.0); // Clamp between 0.5 and 3.0
}

/**
 * Get coverage details based on policy type
 */
function getCoverageDetails(policyType: string, coverageAmount: number): any {
  const baseDetails: { [key: string]: any } = {
    life: {
      deathBenefit: coverageAmount,
      accidentalDeath: coverageAmount * 1.5,
      terminalIllness: coverageAmount * 0.5
    },
    health: {
      inpatient: coverageAmount * 0.4,
      outpatient: coverageAmount * 0.2,
      dental: coverageAmount * 0.1,
      optical: coverageAmount * 0.05
    },
    property: {
      building: coverageAmount * 0.7,
      contents: coverageAmount * 0.3,
      liability: coverageAmount * 0.1
    },
    vehicle: {
      comprehensive: coverageAmount,
      thirdParty: coverageAmount * 0.1,
      personalInjury: coverageAmount * 0.2
    },
    business: {
      interruption: coverageAmount * 0.3,
      liability: coverageAmount * 0.2,
      equipment: coverageAmount * 0.4
    },
    travel: {
      medical: coverageAmount * 0.5,
      cancellation: coverageAmount * 0.3,
      baggage: coverageAmount * 0.1
    }
  };

  return baseDetails[policyType] || { standard: coverageAmount };
}

/**
 * Get exclusions based on policy type
 */
function getExclusions(policyType: string): string[] {
  const baseExclusions: { [key: string]: string[] } = {
    life: [
      'Suicide within 2 years',
      'Pre-existing conditions not disclosed',
      'Death during illegal activities',
      'War or terrorism (in some regions)'
    ],
    health: [
      'Pre-existing conditions (12 month waiting period)',
      'Cosmetic procedures',
      'Self-inflicted injuries',
      'Substance abuse treatment'
    ],
    property: [
      'Wear and tear',
      'Neglect',
      'War or nuclear hazards',
      'Flooding in high-risk areas (without rider)'
    ],
    vehicle: [
      'Driving under influence',
      'Unauthorized drivers',
      'Racing',
      'Commercial use (without commercial coverage)'
    ],
    business: [
      'Intentional acts',
      'War or terrorism',
      'Nuclear hazards',
      'Known defects'
    ],
    travel: [
      'Pre-existing medical conditions',
      'High-risk activities',
      'Travel to embargoed countries',
      'Self-inflicted actions'
    ]
  };

  return baseExclusions[policyType] || ['Standard exclusions apply'];
}
