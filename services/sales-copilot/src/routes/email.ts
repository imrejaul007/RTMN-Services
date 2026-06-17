import { Router, Request, Response } from 'express';
import { generateEmail } from '../services/emailGenerator';
import { ApiResponse, GeneratedEmail, EmailRequest } from '../types';

const router = Router();

/**
 * POST /api/sales/email/generate
 * Generate AI-powered sales email
 */
router.post('/email/generate', async (req: Request, res: Response) => {
  try {
    const { leadId, templateType, context, tone, goal } = req.body as EmailRequest;

    if (!leadId || !templateType) {
      const response: ApiResponse = {
        success: false,
        error: 'Lead ID and template type are required'
      };
      return res.status(400).json(response);
    }

    const email = await generateEmail({
      leadId,
      templateType,
      context,
      tone,
      goal
    });

    const response: ApiResponse<GeneratedEmail> = {
      success: true,
      data: email,
      message: 'Email generated successfully'
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate email'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/sales/email/personalize
 * Personalize an existing email template
 */
router.post('/email/personalize', async (req: Request, res: Response) => {
  try {
    const { template, leadData, personalizations } = req.body;

    if (!template || !leadData) {
      const response: ApiResponse = {
        success: false,
        error: 'Template and lead data are required'
      };
      return res.status(400).json(response);
    }

    // Simple personalization placeholder
    let personalizedEmail = template;

    if (personalizations) {
      Object.entries(personalizations).forEach(([key, value]) => {
        personalizedEmail = personalizedEmail.replace(
          new RegExp(`{{${key}}}`, 'g'),
          String(value)
        );
      });
    }

    // Add basic personalization
    personalizedEmail = personalizedEmail
      .replace(/{{firstName}}/g, leadData.name?.split(' ')[0] || 'there')
      .replace(/{{company}}/g, leadData.company || '')
      .replace(/{{title}}/g, leadData.title || '');

    const response: ApiResponse = {
      success: true,
      data: {
        original: template,
        personalized: personalizedEmail
      },
      message: 'Email personalized successfully'
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to personalize email'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/email/templates
 * Get available email templates
 */
router.get('/email/templates', async (req: Request, res: Response) => {
  const templates = [
    {
      id: 'introductory',
      name: 'Introductory Email',
      description: 'First contact with a potential customer',
      bestFor: 'Cold outreach, new leads',
      tone: ['formal', 'friendly']
    },
    {
      id: 'follow_up',
      name: 'Follow Up Email',
      description: 'Re-engage after initial contact',
      bestFor: 'No response, keeping warm',
      tone: ['casual', 'friendly']
    },
    {
      id: 'discovery',
      name: 'Discovery Email',
      description: 'Ask qualifying questions',
      bestFor: 'Qualified leads, understand needs',
      tone: ['formal', 'friendly']
    },
    {
      id: 'proposal',
      name: 'Proposal Email',
      description: 'Send a proposal or quote',
      bestFor: 'Negotiation stage, closing',
      tone: ['formal']
    },
    {
      id: 're_engagement',
      name: 'Re-engagement Email',
      description: 'Win back lost or dormant leads',
      bestFor: 'Closed lost, old leads',
      tone: ['casual', 'friendly']
    }
  ];

  const response: ApiResponse = {
    success: true,
    data: templates
  };

  res.json(response);
});

/**
 * POST /api/sales/email/analyze
 * Analyze email content for effectiveness
 */
router.post('/email/analyze', async (req: Request, res: Response) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body) {
      const response: ApiResponse = {
        success: false,
        error: 'Subject and body are required'
      };
      return res.status(400).json(response);
    }

    // Simple email analysis
    const wordCount = body.split(/\s+/).length;
    const hasCallToAction = /click|link|schedule|call|reply|contact/i.test(body);
    const hasPersonalization = /I|we|your|you/i.test(body);
    const subjectLength = subject.length;

    const analysis = {
      wordCount,
      hasCallToAction,
      hasPersonalization,
      subjectLength,
      subjectScore: subjectLength <= 50 ? 'good' : subjectLength <= 70 ? 'acceptable' : 'too_long',
      readabilityScore: wordCount <= 100 ? 'concise' : wordCount <= 200 ? 'optimal' : 'verbose',
      suggestions: [
        wordCount > 200 ? 'Consider shortening your email' : null,
        !hasCallToAction ? 'Add a clear call to action' : null,
        !hasPersonalization ? 'Add more personalization' : null
      ].filter(Boolean)
    };

    const response: ApiResponse = {
      success: true,
      data: analysis,
      message: 'Email analyzed successfully'
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze email'
    };
    res.status(500).json(response);
  }
});

export default router;
