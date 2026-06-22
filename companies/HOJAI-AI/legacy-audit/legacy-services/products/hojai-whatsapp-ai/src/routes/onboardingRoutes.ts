import express from 'express';
import { onboardingService } from '../services/onboardingService.js';

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES (no auth required)
// =============================================================================

// Start onboarding
router.post('/onboarding/start', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email and phone are required'
      });
    }

    const result = await onboardingService.startOnboarding({ email, phone });

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        nextStep: result.nextStep,
        message: 'OTP sent to your email'
      }
    });
  } catch (error: any) {
    console.error('[Onboarding] Start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify email OTP
router.post('/onboarding/verify-email', async (req, res) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and OTP are required'
      });
    }

    const result = await onboardingService.verifyEmailOtp(sessionId, otp);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] Verify error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Resend OTP
router.post('/onboarding/resend-otp', async (req, res) => {
  try {
    const { sessionId } = req.body;

    await onboardingService.resendEmailOtp(sessionId);

    res.json({
      success: true,
      message: 'OTP sent'
    });
  } catch (error: any) {
    console.error('[Onboarding] Resend error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Save business info
router.post('/onboarding/business-info', async (req, res) => {
  try {
    const { sessionId, businessName, businessType, city } = req.body;

    if (!sessionId || !businessName || !businessType) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, business name, and type are required'
      });
    }

    const result = await onboardingService.saveBusinessInfo(sessionId, {
      businessName,
      businessType,
      city: city || ''
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] Business info error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Connect WhatsApp
router.post('/onboarding/whatsapp', async (req, res) => {
  try {
    const { sessionId, whatsappNumber } = req.body;

    if (!sessionId || !whatsappNumber) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and WhatsApp number are required'
      });
    }

    const result = await onboardingService.connectWhatsApp(sessionId, {
      whatsappNumber
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] WhatsApp error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add knowledge base
router.post('/onboarding/knowledge', async (req, res) => {
  try {
    const { sessionId, items } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await onboardingService.addInitialKnowledge(
      sessionId,
      items || []
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] Knowledge error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get knowledge templates
router.get('/onboarding/templates/:businessType', async (req, res) => {
  try {
    const { businessType } = req.params;
    const templates = onboardingService.getKnowledgeTemplates(businessType);

    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('[Onboarding] Templates error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create subscription
router.post('/onboarding/subscription', async (req, res) => {
  try {
    const { sessionId, plan } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await onboardingService.createSubscription(
      sessionId,
      plan || 'trial'
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] Subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Complete onboarding
router.post('/onboarding/complete', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await onboardingService.completeOnboarding(sessionId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Onboarding] Complete error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get onboarding status
router.get('/onboarding/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await onboardingService.getStatus(sessionId);

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('[Onboarding] Status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
