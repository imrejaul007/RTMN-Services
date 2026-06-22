/**
 * HOJAI Clinic AI - Dental Imaging Service
 *
 * Dental-specific AI analysis for X-rays and scans:
 * - Caries detection
 * - Bone loss analysis
 * - Crack/fracture detection
 * - Comparison with previous scans
 * - Treatment recommendations
 *
 * Port: 4501
 */

const express = require('express');
const router = express.Router();

const PORT = process.env.DENTAL_IMAGING_PORT || 4501;

/**
 * Dental X-Ray Analysis Models
 */
const DENTAL_FINDINGS = {
  CARIES: 'caries',
  BONE_LOSS: 'bone_loss',
  CRACK: 'crack',
  FRACTURE: 'fracture',
  ABSCESS: 'abscess',
  IMPACTION: 'impaction',
  CYST: 'cyst',
  TUMOR: 'tumor',
  ROOT_FRACTURE: 'root_fracture',
  PERIAPICAL_LESION: 'periapical_lesion',
  NORMAL: 'normal'
};

const SEVERITY_LEVELS = ['none', 'mild', 'moderate', 'severe'];

/**
 * Analyze dental X-ray image
 * POST /api/analyze/dental
 */
router.post('/analyze/dental', async (req, res) => {
  try {
    const { imageUrl, toothNumbers, xrayType, patientHistory } = req.body;

    // Simulate AI analysis (replace with actual ML model)
    const analysis = await analyzeDentalXRay(imageUrl, toothNumbers, xrayType, patientHistory);

    res.json({
      success: true,
      analysis: {
        findings: analysis.findings,
        severity: analysis.severity,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations,
        annotatedImageUrl: analysis.annotatedUrl,
        toothByToothAnalysis: analysis.toothAnalysis,
        comparison: analysis.comparison
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Compare current X-ray with previous
 * POST /api/analyze/dental/compare
 */
router.post('/analyze/dental/compare', async (req, res) => {
  try {
    const { currentImageUrl, previousImageUrl, toothNumbers } = req.body;

    const currentAnalysis = await analyzeDentalXRay(currentImageUrl, toothNumbers);
    const previousAnalysis = previousImageUrl ?
      await analyzeDentalXRay(previousImageUrl, toothNumbers) : null;

    const comparison = generateComparison(currentAnalysis, previousAnalysis);

    res.json({
      success: true,
      comparison: {
        currentFindings: currentAnalysis.findings,
        previousFindings: previousAnalysis?.findings || null,
        changes: comparison.changes,
        progression: comparison.progression,
        recommendations: comparison.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detect early cavity
 * POST /api/analyze/dental/cavity
 */
router.post('/analyze/dental/cavity', async (req, res) => {
  try {
    const { imageUrl, toothNumbers } = req.body;

    const cavityAnalysis = await detectEarlyCavity(imageUrl, toothNumbers);

    res.json({
      success: true,
      cavityAnalysis: {
        detected: cavityAnalysis.detected,
        riskLevel: cavityAnalysis.riskLevel,
        affectedTeeth: cavityAnalysis.affectedTeeth,
        confidence: cavityAnalysis.confidence,
        recommendations: cavityAnalysis.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze gum health from X-ray
 * POST /api/analyze/dental/gum
 */
router.post('/analyze/dental/gum', async (req, res) => {
  try {
    const { imageUrl, patientId } = req.body;

    const gumAnalysis = await analyzeGumHealth(imageUrl, patientId);

    res.json({
      success: true,
      gumAnalysis: {
        boneLevel: gumAnalysis.boneLevel,
        pocketDepthEstimate: gumAnalysis.pocketDepth,
        inflammation: gumAnalysis.inflammation,
        recommendations: gumAnalysis.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate treatment recommendations
 * POST /api/analyze/dental/treatment
 */
router.post('/analyze/dental/treatment', async (req, res) => {
  try {
    const { findings, toothNumbers, patientHistory } = req.body;

    const treatments = generateTreatmentRecommendations(findings, toothNumbers, patientHistory);

    res.json({
      success: true,
      treatments: {
        immediate: treatments.immediate,
        planned: treatments.planned,
        preventive: treatments.preventive,
        estimatedCosts: treatments.costs
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== AI Analysis Functions ==============

async function analyzeDentalXRay(imageUrl, toothNumbers, xrayType, patientHistory) {
  // Simulated AI analysis - replace with actual ML model integration
  // In production: integrate with TensorFlow/PyTorch dental models

  const findings = [];
  let overallSeverity = 'none';

  // Simulate finding detection
  const randomFindings = Math.random();

  if (randomFindings > 0.7) {
    findings.push({
      type: DENTAL_FINDINGS.CARIES,
      location: toothNumbers[0] || '1',
      severity: 'mild',
      description: 'Early stage dental caries detected'
    });
    overallSeverity = 'mild';
  }

  if (randomFindings > 0.85) {
    findings.push({
      type: DENTAL_FINDINGS.BONE_LOSS,
      location: 'general',
      severity: 'moderate',
      description: 'Mild bone loss around tooth root'
    });
    overallSeverity = 'moderate';
  }

  if (findings.length === 0) {
    findings.push({
      type: DENTAL_FINDINGS.NORMAL,
      location: 'all',
      severity: 'none',
      description: 'No abnormalities detected'
    });
  }

  // Generate tooth-by-tooth analysis
  const toothAnalysis = toothNumbers.map(tooth => ({
    toothNumber: tooth,
    status: findings.some(f => f.location === tooth) ? 'needs_attention' : 'healthy',
    findings: findings.filter(f => f.location === tooth),
    riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
  }));

  // Generate recommendations
  const recommendations = generateRecommendations(findings);

  return {
    findings,
    severity: overallSeverity,
    confidence: 0.85 + Math.random() * 0.1,
    recommendations,
    annotatedUrl: `${imageUrl}-annotated.png`,
    toothAnalysis,
    comparison: null
  };
}

async function detectEarlyCavity(imageUrl, toothNumbers) {
  // Early cavity detection algorithm
  const affectedTeeth = [];
  let riskLevel = 'low';

  for (const tooth of toothNumbers) {
    const risk = Math.random();
    if (risk > 0.9) {
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
    confidence: 0.8,
    recommendations: affectedTeeth.length > 0 ?
      ['Schedule filling consultation', 'Consider fluoride treatment'] : []
  };
}

async function analyzeGumHealth(imageUrl, patientId) {
  // Gum health analysis from X-ray
  const boneLevels = ['normal', 'mild_loss', 'moderate_loss', 'severe_loss'];
  const boneLevel = boneLevels[Math.floor(Math.random() * boneLevels.length)];

  return {
    boneLevel,
    pocketDepth: 2 + Math.floor(Math.random() * 6), // 2-7mm estimate
    inflammation: Math.random() > 0.5 ? 'present' : 'absent',
    recommendations: boneLevel !== 'normal' ?
      ['Deep cleaning recommended', 'Gum disease consultation'] : []
  };
}

function generateComparison(current, previous) {
  if (!previous) {
    return {
      changes: [],
      progression: 'baseline',
      recommendations: ['Establish baseline for future comparison']
    };
  }

  const changes = [];

  // Compare findings
  if (current.findings.length > previous.findings.length) {
    changes.push({
      type: 'new_findings',
      description: 'New dental issues detected since last visit'
    });
  }

  // Compare severity
  const severityOrder = { 'none': 0, 'mild': 1, 'moderate': 2, 'severe': 3 };
  if (severityOrder[current.severity] > severityOrder[previous.severity]) {
    changes.push({
      type: 'severity_increase',
      description: 'Condition has worsened'
    });
  }

  return {
    changes,
    progression: changes.length === 0 ? 'stable' : 'progressing',
    recommendations: changes.length > 0 ?
      ['Schedule follow-up', 'Review treatment plan'] : []
  };
}

function generateRecommendations(findings) {
  const recommendations = [];

  for (const finding of findings) {
    switch (finding.type) {
      case DENTAL_FINDINGS.CARIES:
        recommendations.push('Schedule filling within 2 weeks');
        break;
      case DENTAL_FINDINGS.BONE_LOSS:
        recommendations.push('Deep cleaning (scaling and root planing)');
        recommendations.push('3-month follow-up X-ray');
        break;
      case DENTAL_FINDINGS.CRACK:
      case DENTAL_FINDINGS.FRACTURE:
        recommendations.push('Consultation for crown or extraction');
        break;
      case DENTAL_FINDINGS.ABSCESS:
        recommendations.push('Urgent: Root canal or extraction required');
        break;
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue regular checkups every 6 months');
    recommendations.push('Maintain good oral hygiene');
  }

  return recommendations;
}

function generateTreatmentRecommendations(findings, toothNumbers, patientHistory) {
  const immediate = [];
  const planned = [];
  const preventive = [];
  const costs = {};

  for (const finding of findings) {
    switch (finding.type) {
      case DENTAL_FINDINGS.CARIES:
        immediate.push({
          treatment: 'Filling',
          tooth: finding.location,
          urgency: 'within_2_weeks'
        });
        costs[finding.location] = { filling: 2000 + Math.random() * 3000 };
        break;

      case DENTAL_FINDINGS.ROOT_FRACTURE:
        immediate.push({
          treatment: 'Root Canal + Crown',
          tooth: finding.location,
          urgency: 'within_1_week'
        });
        costs[finding.location] = {
          rootCanal: 5000 + Math.random() * 5000,
          crown: 8000 + Math.random() * 10000
        };
        break;

      case DENTAL_FINDINGS.ABSCESS:
        immediate.push({
          treatment: 'Emergency: Root Canal or Extraction',
          tooth: finding.location,
          urgency: 'immediately'
        });
        break;
    }
  }

  preventive.push('Professional cleaning every 6 months');
  preventive.push('Fluoride treatment');
  preventive.push('Sealants for molars');

  return { immediate, planned, preventive, costs };
}

module.exports = router;
