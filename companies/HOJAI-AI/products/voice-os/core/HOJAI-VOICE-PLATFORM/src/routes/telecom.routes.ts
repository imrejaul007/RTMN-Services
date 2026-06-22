// ============================================================================
// HOJAI VOICE PLATFORM - Telecom Webhook Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { getTelecomFactory } from '../telecom';
import { getCallService } from '../services/call.service';
import { getSessionService } from '../services/session.service';
import { WebhookPayload } from '../types';

const router = Router();
const telecomFactory = getTelecomFactory();
const callService = getCallService();
const sessionService = getSessionService();

// ============================================================================
// Twilio Webhooks
// ============================================================================

/**
 * Twilio voice webhook
 * POST /api/webhooks/twilio
 */
router.post('/twilio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;

    if (!payload.CallSid) {
      return res.status(400).send('Missing CallSid');
    }

    const event = telecomFactory.parseWebhook(payload);

    // Create inbound call record
    const call = await callService.createInboundCall({
      callId: event.callId,
      from: event.from,
      to: event.to,
      agentId: payload.agentId || '',
      provider: 'twilio',
      metadata: payload,
    });

    // Generate TwiML response
    const twiML = telecomFactory.generateGatherXML(
      'Namaste! Welcome. How can I help you today?',
      '/api/webhooks/twilio/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiML);
  } catch (error) {
    next(error);
  }
});

/**
 * Twilio voice input webhook
 * POST /api/webhooks/twilio/voice
 */
router.post('/twilio/voice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;
    const speechResult = payload.SpeechResult;
    const callSid = payload.CallSid;

    if (!callSid) {
      return res.status(400).send('Missing CallSid');
    }

    if (speechResult) {
      // Process the speech input
      console.log(`Twilio speech from ${callSid}: ${speechResult}`);

      // Here you would:
      // 1. Find the session for this call
      // 2. Process the speech
      // 3. Generate response
      // 4. Return TwiML with the response
    }

    // Continue gathering
    const twiML = telecomFactory.generateGatherXML(
      'I didn\'t quite catch that. How can I help you?',
      '/api/webhooks/twilio/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiML);
  } catch (error) {
    next(error);
  }
});

/**
 * Twilio status callback
 * POST /api/webhooks/twilio/status
 */
router.post('/twilio/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;
    const statusUpdate = telecomFactory.parseStatusWebhook(payload);

    // Update call status
    if (statusUpdate.status === 'completed') {
      await callService.complete(payload.CallSid || '', '');
    } else {
      await callService.updateStatus(payload.CallSid || '', '', statusUpdate.status);
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Exotel Webhooks
// ============================================================================

/**
 * Exotel webhook
 * POST /api/webhooks/exotel
 */
router.post('/exotel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;

    if (!payload.CallSid) {
      return res.status(400).send('Missing CallSid');
    }

    const event = telecomFactory.parseWebhook(payload);

    // Create inbound call record
    const call = await callService.createInboundCall({
      callId: event.callId,
      from: event.from,
      to: event.to,
      agentId: payload.agentId || '',
      provider: 'exotel',
      metadata: payload,
    });

    // Generate Exotel XML response
    const xml = telecomFactory.generateGatherXML(
      'Namaste! Welcome. How can I help you today?',
      '/api/webhooks/exotel/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

/**
 * Exotel voice input webhook
 * POST /api/webhooks/exotel/voice
 */
router.post('/exotel/voice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;
    const speechResult = payload.TranscriptionText;

    if (speechResult) {
      console.log(`Exotel speech: ${speechResult}`);
      // Process speech similar to Twilio
    }

    const xml = telecomFactory.generateGatherXML(
      'I didn\'t catch that. How can I help you?',
      '/api/webhooks/exotel/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

/**
 * Exotel status callback
 * POST /api/webhooks/exotel/status
 */
router.post('/exotel/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;
    const statusUpdate = telecomFactory.parseStatusWebhook(payload);

    if (statusUpdate.status === 'completed') {
      await callService.complete(payload.CallSid || '', '');
    } else {
      await callService.updateStatus(payload.CallSid || '', '', statusUpdate.status);
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Knowlarity Webhooks
// ============================================================================

/**
 * Knowlarity webhook
 * POST /api/webhooks/knowlarity
 */
router.post('/knowlarity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;

    if (!payload.call_id) {
      return res.status(400).send('Missing call_id');
    }

    const event = telecomFactory.parseWebhook(payload);

    // Create inbound call record
    const call = await callService.createInboundCall({
      callId: event.callId,
      from: event.from,
      to: event.to,
      agentId: payload.agentId || '',
      provider: 'knowlarity',
      metadata: payload,
    });

    // Generate Knowlarity XML response
    const xml = telecomFactory.generateGatherXML(
      'Namaste! Welcome. How can I help you today?',
      '/api/webhooks/knowlarity/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

/**
 * Knowlarity voice input webhook
 * POST /api/webhooks/knowlarity/voice
 */
router.post('/knowlarity/voice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as WebhookPayload;

    // Process speech input
    const xml = telecomFactory.generateGatherXML(
      'How can I help you?',
      '/api/webhooks/knowlarity/voice',
      { language: 'en-IN' }
    );

    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Provider Health & Info
// ============================================================================

/**
 * Get telecom provider info
 * GET /api/webhooks/providers
 */
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = telecomFactory.getAvailableProviders();
    const health = await telecomFactory.healthCheck();

    res.json({
      success: true,
      data: providers.map(p => ({
        ...p,
        healthy: health[p.provider],
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
