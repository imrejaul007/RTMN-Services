// Medical NLP Routes

import { Router, Request, Response, NextFunction } from 'express';
import { medicalNlpService } from '../services/medicalNlpService.js';
import { logger } from '../utils/logger.js';

export const medicalRoutes = Router();

/**
 * POST /api/medical/extract - Extract medical entities from text
 */
medicalRoutes.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, profileId, extractAll, categories } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'text is required' },
      });
      return;
    }

    logger.info(`Medical entity extraction request`, {
      textLength: text.length,
      profileId,
      extractAll,
    });

    const result = await medicalNlpService.extractMedicalEntities({
      text,
      profileId,
      extractAll: extractAll !== false,
      categories,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/medical/visit-summary - Generate visit summary from transcript
 */
medicalRoutes.post('/visit-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      transcript,
      profileId,
      visitType,
      doctorName,
      hospitalName,
      specialty,
      visitDate,
      context,
    } = req.body;

    if (!transcript || !profileId || !visitType || !visitDate) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'transcript, profileId, visitType, and visitDate are required',
        },
      });
      return;
    }

    const validVisitTypes = ['consultation', 'follow_up', 'emergency', 'teleconsult'];
    if (!validVisitTypes.includes(visitType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `visitType must be one of: ${validVisitTypes.join(', ')}`,
        },
      });
      return;
    }

    logger.info(`Visit summary generation request`, {
      profileId,
      visitType,
      transcriptLength: transcript.length,
    });

    const summary = await medicalNlpService.generateVisitSummary({
      transcript,
      profileId,
      visitType,
      doctorName,
      hospitalName,
      specialty,
      visitDate,
      context,
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/medical/compare-visits - Compare two visit summaries
 */
medicalRoutes.post('/compare-visits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visit1, visit2 } = req.body;

    if (!visit1 || !visit2) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'visit1 and visit2 are required' },
      });
      return;
    }

    // Compare the two visits
    const comparison = {
      visits: [
        { id: visit1.id || 'unknown', date: visit1.date, type: visit1.type },
        { id: visit2.id || 'unknown', date: visit2.date, type: visit2.type },
      ],
      changes: {
        diagnoses: {
          added: visit2.diagnoses?.filter(
            (d: any) => !visit1.diagnoses?.some((v1: any) => v1.condition === d.condition)
          ),
          resolved: visit1.diagnoses?.filter(
            (d: any) => !visit2.diagnoses?.some((v2: any) => v2.condition === d.condition)
          ),
          continued: visit1.diagnoses?.filter((d: any) =>
            visit2.diagnoses?.some((v2: any) => v2.condition === d.condition)
          ),
        },
        medications: {
          added: visit2.medications?.filter(
            (m: any) => !visit1.medications?.some((v1: any) => v1.name === m.name)
          ),
          removed: visit1.medications?.filter(
            (m: any) => !visit2.medications?.some((v2: any) => v2.name === m.name)
          ),
          changed: visit2.medications?.filter((m: any) => {
            const prev = visit1.medications?.find((v1: any) => v1.name === m.name);
            return prev && (prev.dosage !== m.dosage || prev.frequency !== m.frequency);
          }),
          continued: visit2.medications?.filter((m: any) =>
            visit1.medications?.some((v1: any) => v1.name === m.name)
          ),
        },
        symptoms: {
          new: visit2.symptoms?.filter(
            (s: any) => !visit1.symptoms?.some((v1: any) => v1.symptom === s.symptom)
          ),
          resolved: visit1.symptoms?.filter(
            (s: any) => !visit2.symptoms?.some((v2: any) => v2.symptom === s.symptom)
          ),
        },
      },
      summary: generateComparisonSummary(),
    };

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/medical/symptoms/check - Check symptom severity
 */
medicalRoutes.post('/symptoms/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'symptoms array is required' },
      });
      return;
    }

    // Emergency symptoms that need immediate attention
    const emergencySymptoms = [
      'chest pain',
      'difficulty breathing',
      'severe bleeding',
      'loss of consciousness',
      'stroke',
      'severe allergic reaction',
    ];

    const symptomStrings = symptoms.map((s: any) => s.symptom.toLowerCase());
    const hasEmergency = emergencySymptoms.some((es) =>
      symptomStrings.some((s) => s.includes(es) || es.includes(s))
    );

    if (hasEmergency) {
      res.json({
        success: true,
        data: {
          urgency: 'emergency',
          recommendation:
            'Please seek immediate medical attention or call emergency services.',
          shouldCallAmbulance: true,
        },
      });
      return;
    }

    // Check for urgent symptoms
    const urgentSymptoms = ['high fever', 'persistent vomiting', 'severe pain', 'confusion'];
    const hasUrgent = urgentSymptoms.some((us) =>
      symptomStrings.some((s) => s.includes(us))
    );

    if (hasUrgent) {
      res.json({
        success: true,
        data: {
          urgency: 'urgent',
          recommendation:
            'Please visit an urgent care center or see a doctor today.',
          shouldCallAmbulance: false,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        urgency: 'routine',
        recommendation:
          'If symptoms persist or worsen, please schedule an appointment with your healthcare provider.',
        shouldCallAmbulance: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

function generateComparisonSummary(): string {
  // This would use AI in production
  return 'Comparison analysis complete. Review the changes in diagnoses, medications, and symptoms between visits.';
}
