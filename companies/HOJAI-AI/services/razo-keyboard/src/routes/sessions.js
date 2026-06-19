/**
 * RAZO Session Routes
 */

const express = require('express');
const router = express.Router();

module.exports = function(contextEngine) {
  /**
   * POST /api/session/create
   * Create new session
   */
  router.post('/create', (req, res) => {
    try {
      const { userId, metadata = {} } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'userId is required' }
        });
      }

      const session = contextEngine.createSession(userId, { metadata });

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          createdAt: session.createdAt
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/session/:id
   * Get session details
   */
  router.get('/:id', (req, res) => {
    try {
      const session = contextEngine.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' }
        });
      }

      res.json({
        success: true,
        data: contextEngine.getContextSummary(req.params.id),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'GET_FAILED', message: error.message }
      });
    }
  });

  /**
   * PUT /api/session/:id/context
   * Update session context
   */
  router.put('/:id/context', (req, res) => {
    try {
      const { updates } = req.body;

      if (!updates) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'updates object is required' }
        });
      }

      const session = contextEngine.updateContext(req.params.id, updates);

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          contextUpdated: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/session/:id/message
   * Add message to history
   */
  router.post('/:id/message', (req, res) => {
    try {
      const { text, sender = 'user' } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'text is required' }
        });
      }

      const session = contextEngine.addToHistory(req.params.id, text, sender);

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          messageAdded: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'ADD_MESSAGE_FAILED', message: error.message }
      });
    }
  });

  /**
   * DELETE /api/session/:id/end
   * End session
   */
  router.delete('/:id/end', (req, res) => {
    try {
      const result = contextEngine.endSession(req.params.id);

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
        error: { code: 'END_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/session/user/:userId
   * Get active sessions for user
   */
  router.get('/user/:userId', (req, res) => {
    try {
      const sessions = contextEngine.getUserSessions(req.params.userId);

      res.json({
        success: true,
        data: { sessions },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'GET_USER_SESSIONS_FAILED', message: error.message }
      });
    }
  });

  return router;
};
