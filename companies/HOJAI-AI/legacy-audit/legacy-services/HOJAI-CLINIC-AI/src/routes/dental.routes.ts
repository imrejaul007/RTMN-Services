/**
 * Dental AI Routes
 *
 * Dental-specific AI analysis endpoints:
 * - X-ray analysis
 * - Scan comparison
 * - Treatment recommendations
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';

const router = Router();

/**
 * POST /api/v1/ai/dental/analyze
 * Analyze dental X-ray
 */
router.post(
  '/analyze',
  asyncHandler(async (req: Request, res: Response) => {
    const { imageUrl, toothNumbers, xrayType, patientHistory } = req.body;

    const analysis = await analyzeDentalXRay(imageUrl, toothNumbers, xrayType, patientHistory);

    res.json({
      success: true,
      analysis
    });
  })
);

/**
 * POST /api/v1/ai/dental/compare
 * Compare current X-ray with previous
 */
router.post(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { currentImageUrl, previousImageUrl, toothNumbers } = req.body;

    const comparison = await compareDentalXRays(currentImageUrl, previousImageUrl, toothNumbers);

    res.json({
      success: true,
      comparison
    });
  })
);

/**
 * POST /api/v1/ai/dental/cavity-detect
 * Detect early cavity
 */
router.post(
  '/cavity-detect',
  asyncHandler(async (req: Request, res: Response) => {
    const { imageUrl, toothNumbers } = req.body;

    const detection = await detectEarlyCavity(imageUrl, toothNumbers);

    res.json({
      success: true,
      detection
    });
  })
);

/**
 * POST /api/v1/ai/dental/treatment-plan
 * Generate treatment plan from findings
 */
router.post(
  '/treatment-plan',
  asyncHandler(async (req: Request, res: Response) => {
    const { findings, toothNumbers, patientHistory } = req.body;

    const plan = await generateTreatmentPlan(findings, toothNumbers, patientHistory);

    res.json({
      success: true,
      plan
    });
  })
);

/**
 * POST /api/v1/ai/dental/gum-health
 * Analyze gum health from X-ray
 */
router.post(
  '/gum-health',
  asyncHandler(async (req: Request, res: Response) => {
    const { imageUrl, patientId } = req.body;

    const analysis = await analyzeGumHealth(imageUrl, patientId);

    res.json({
      success: true,
      analysis
    });
  })
);

// ============== AI Analysis Functions ==============

interface DentalFinding {
  type: string;
  location: string;
  severity: string;
  description: string;
}

interface DentalAnalysis {
  findings: DentalFinding[];
  severity: string;
  confidence: number;
  recommendations: string[];
  toothAnalysis: any[];
}

interface TreatmentPlan {
  immediate: any[];
  planned: any[];
  preventive: string[];
  costs: Record<string, any>;
}

async function analyzeDentalXRay(
  imageUrl: string,
  toothNumbers: string[],
  xrayType: string,
  patientHistory: any
): Promise<DentalAnalysis> {
  // Simulated AI analysis - integrate with actual ML model
  const findings: DentalFinding[] = [];
  let severity = 'none';

  // Simulate detection
  const rand = Math.random();
  if (rand > 0.8) {
    findings.push({
      type: 'caries',
      location: toothNumbers[0] || '1',
      severity: 'mild',
      description: 'Early stage dental caries detected'
    });
    severity = 'mild';
  }

  if (rand > 0.9) {
    findings.push({
      type: 'bone_loss',
      location: 'general',
      severity: 'moderate',
      description: 'Mild bone loss detected'
    });
    severity = 'moderate';
  }

  if (findings.length === 0) {
    findings.push({
      type: 'normal',
      location: 'all',
      severity: 'none',
      description: 'No abnormalities detected'
    });
  }

  const toothAnalysis = toothNumbers.map(tooth => ({
    toothNumber: tooth,
    status: findings.some(f => f.location === tooth) ? 'needs_attention' : 'healthy',
    riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
  }));

  const recommendations = generateRecommendations(findings);

  return {
    findings,
    severity,
    confidence: 0.85 + Math.random() * 0.1,
    recommendations,
    toothAnalysis
  };
}

async function compareDentalXRays(
  currentImageUrl: string,
  previousImageUrl: string | null,
  toothNumbers: string[]
): Promise<any> {
  const current = await analyzeDentalXRay(currentImageUrl, toothNumbers, '', null);

  if (!previousImageUrl) {
    return {
      currentFindings: current.findings,
      previousFindings: null,
      changes: [],
      progression: 'baseline'
    };
  }

  // Simulate previous analysis
  const previous = await analyzeDentalXRay(previousImageUrl, toothNumbers, '', null);

  const changes = [];
  if (current.findings.length > previous.findings.length) {
    changes.push({
      type: 'new_findings',
      description: 'New dental issues detected'
    });
  }

  return {
    currentFindings: current.findings,
    previousFindings: previous.findings,
    changes,
    progression: changes.length === 0 ? 'stable' : 'progressing'
  };
}

async function detectEarlyCavity(
  imageUrl: string,
  toothNumbers: string[]
): Promise<any> {
  const affectedTeeth = [];
  let riskLevel = 'low';

  for (const tooth of toothNumbers) {
    if (Math.random() > 0.9) {
      affectedTeeth.push({
        toothNumber: tooth,
        stage: 'early',
        confidence: 0.7 + Math.random() * 0.2
      });
    }
  }

  if (affectedTeeth.length > 2) riskLevel = 'high';
  else if (affectedTeeth.length > 0) riskLevel = 'medium';

  return {
    detected: affectedTeeth.length > 0,
    riskLevel,
    affectedTeeth,
    recommendations: affectedTeeth.length > 0 ?
      ['Schedule filling consultation', 'Consider fluoride treatment'] : []
  };
}

async function generateTreatmentPlan(
  findings: DentalFinding[],
  toothNumbers: string[],
  patientHistory: any
): Promise<TreatmentPlan> {
  const immediate: any[] = [];
  const planned: any[] = [];
  const preventive: string[] = [];
  const costs: Record<string, any> = {};

  for (const finding of findings) {
    switch (finding.type) {
      case 'caries':
        immediate.push({
          treatment: 'Filling',
          tooth: finding.location,
          urgency: 'within_2_weeks'
        });
        costs[finding.location] = { filling: 2000 + Math.random() * 3000 };
        break;

      case 'root_fracture':
      case 'abscess':
        immediate.push({
          treatment: 'Root Canal + Crown',
          tooth: finding.location,
          urgency: 'within_1_week'
        });
        break;
    }
  }

  preventive.push('Professional cleaning every 6 months');
  preventive.push('Fluoride treatment');

  return { immediate, planned, preventive, costs };
}

async function analyzeGumHealth(
  imageUrl: string,
  patientId: string
): Promise<any> {
  const boneLevels = ['normal', 'mild_loss', 'moderate_loss', 'severe_loss'];
  const boneLevel = boneLevels[Math.floor(Math.random() * boneLevels.length)];

  return {
    boneLevel,
    pocketDepth: 2 + Math.floor(Math.random() * 6),
    inflammation: Math.random() > 0.5 ? 'present' : 'absent',
    recommendations: boneLevel !== 'normal' ?
      ['Deep cleaning recommended', 'Gum disease consultation'] : []
  };
}

function generateRecommendations(findings: DentalFinding[]): string[] {
  const recommendations: string[] = [];

  for (const finding of findings) {
    switch (finding.type) {
      case 'caries':
        recommendations.push('Schedule filling within 2 weeks');
        break;
      case 'bone_loss':
        recommendations.push('Deep cleaning (scaling and root planing)');
        break;
      case 'abscess':
        recommendations.push('Urgent: Root canal or extraction required');
        break;
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue regular checkups every 6 months');
  }

  return recommendations;
}

export default router;
