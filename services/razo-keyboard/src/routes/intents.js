/**
 * RAZO Intent Routes
 */

const express = require('express');
const router = express.Router();

module.exports = function(intentRouter, contextEngine) {
  /**
   * POST /api/intent/detect
   * Detect intent from user input
   */
  router.post('/detect', async (req, res) => {
    try {
      const { text, userId, sessionId } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Text is required' }
        });
      }

      // Get session context if available
      let context = {};
      if (sessionId) {
        context = contextEngine.getContextSummary(sessionId) || {};
      }

      // Detect intent
      const intent = await intentRouter.detect(text, { userId, ...context });

      // Update session if available
      if (sessionId && intent.intent) {
        try {
          contextEngine.setCurrentIntent(sessionId, intent.intent, intent.entities, intent.confidence);
          contextEngine.addToHistory(sessionId, text, 'user');
        } catch (e) {
          // Session might not exist, that's ok
        }
      }

      res.json({
        success: true,
        data: {
          intent: intent.intent,
          confidence: intent.confidence,
          entities: intent.entities,
          action: intent.action,
          endpoint: intent.endpoint,
          suggestion: intent.confidence < 0.7 ? 'LOW_CONFIDENCE' : null
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'DETECTION_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/intent/execute
   * Detect and execute intent in one call
   */
  router.post('/execute', async (req, res) => {
    try {
      const { text, userId, sessionId, userContext = {} } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Text is required' }
        });
      }

      // Detect intent
      const intent = await intentRouter.detect(text, { userId });

      if (!intent.intent) {
        return res.json({
          success: true,
          data: {
            requiresClarification: true,
            message: "I didn't understand that. Could you rephrase?"
          }
        });
      }

      // Get session context
      let context = { userId, conversationText: text };
      if (sessionId) {
        const sessionContext = contextEngine.getContextSummary(sessionId);
        if (sessionContext) {
          context = { ...context, ...sessionContext };
        }
      }

      // Merge external context if provided
      if (userContext.preferences || userContext.location) {
        if (sessionId) {
          await contextEngine.mergeExternalContext(sessionId, userContext);
        }
      }

      // Execute action
      const ActionEngine = require('../actions/engine');
      const actionEngine = new ActionEngine(console, {
        genieGateway: process.env.GENIE_GATEWAY_URL,
        doApp: process.env.DO_APP_URL,
        suttar: process.env.SUTAR_GATEWAY_URL,
        copilot: process.env.COPILOT_URL,
        calendar: process.env.CALENDAR_URL
      });

      const result = await actionEngine.execute(intent, intent.entities, context);

      // Update session with result
      if (sessionId) {
        try {
          contextEngine.addToHistory(sessionId, JSON.stringify(result), 'system');
        } catch (e) {}
      }

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'EXECUTION_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/intent/parse
   * Parse structured intent
   */
  router.post('/parse', async (req, res) => {
    try {
      const { intent, entities, sessionId } = req.body;

      if (!intent) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Intent is required' }
        });
      }

      // Get intent definition
      const intentDef = intentRouter.intents?.[intent];
      if (!intentDef) {
        return res.status(400).json({
          success: false,
          error: { code: 'UNKNOWN_INTENT', message: `Unknown intent: ${intent}` }
        });
      }

      // Validate entities
      const missingEntities = intentDef.entities?.filter(e => !entities?.[e]) || [];

      res.json({
        success: true,
        data: {
          intent,
          entities,
          missingEntities: missingEntities.length > 0 ? missingEntities : undefined,
          complete: missingEntities.length === 0,
          action: intentDef.action,
          endpoint: intentDef.endpoint
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'PARSE_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/intent/validate
   * Validate intent parameters
   */
  router.post('/validate', async (req, res) => {
    try {
      const { intent, entities } = req.body;

      if (!intent || !entities) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Intent and entities required' }
        });
      }

      const intentDef = intentRouter.intents?.[intent];
      const validations = [];

      // Check required entities
      if (intentDef?.entities) {
        for (const entity of intentDef.entities) {
          const value = entities[entity];
          if (!value) {
            validations.push({ entity, valid: false, message: 'Required field missing' });
          } else {
            validations.push({ entity, valid: true, value });
          }
        }
      }

      // Type validations
      if (entities.amount) {
        const isValidAmount = !isNaN(parseFloat(entities.amount)) && parseFloat(entities.amount) > 0;
        validations.push({
          entity: 'amount',
          valid: isValidAmount,
          message: isValidAmount ? undefined : 'Invalid amount'
        });
      }

      if (entities.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(entities.email);
        validations.push({
          entity: 'email',
          valid: isValidEmail,
          message: isValidEmail ? undefined : 'Invalid email format'
        });
      }

      if (entities.phone) {
        const phoneRegex = /^[\d\s\-\+]{10,}$/;
        const isValidPhone = phoneRegex.test(entities.phone.replace(/\D/g, ''));
        validations.push({
          entity: 'phone',
          valid: isValidPhone,
          message: isValidPhone ? undefined : 'Invalid phone number'
        });
      }

      const allValid = validations.every(v => v.valid);

      res.json({
        success: true,
        data: {
          intent,
          valid: allValid,
          validations,
          errors: validations.filter(v => !v.valid)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/intent/list
   * List all supported intents
   */
  router.get('/list', (req, res) => {
    res.json({
      success: true,
      data: {
        intents: intentRouter.getIntents(),
        stats: intentRouter.getStats()
      }
    });
  });

  return router;
};
