/**
 * RAZO Message Routes
 */

const express = require('express');
const router = express.Router();

module.exports = function(channelBridge) {
  /**
   * POST /api/message/send
   * Send message via channel
   */
  router.post('/send', async (req, res) => {
    try {
      const { channel, to, message, options = {} } = req.body;

      if (!channel || !to || !message) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'channel, to, and message are required' }
        });
      }

      const result = await channelBridge.sendMessage({
        channel,
        to,
        message,
        options
      });

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
        error: { code: 'SEND_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/message/schedule
   * Schedule message for later
   */
  router.post('/schedule', async (req, res) => {
    try {
      const { channel, to, message, scheduledAt, options = {} } = req.body;

      if (!channel || !to || !message || !scheduledAt) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'channel, to, message, and scheduledAt are required' }
        });
      }

      const scheduledTime = new Date(scheduledAt);
      if (isNaN(scheduledTime.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Invalid scheduledAt date' }
        });
      }

      // Store in queue (in production, use a proper job queue)
      const jobId = `msg_${Date.now()}`;
      const scheduledJob = {
        id: jobId,
        channel,
        to,
        message,
        scheduledAt: scheduledTime,
        options,
        status: 'scheduled'
      };

      // Log for now (implement actual scheduling in production)
      console.log('Scheduled message:', scheduledJob);

      res.json({
        success: true,
        data: {
          jobId,
          scheduledAt: scheduledTime.toISOString(),
          status: 'scheduled'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'SCHEDULE_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/message/broadcast
   * Broadcast to multiple recipients
   */
  router.post('/broadcast', async (req, res) => {
    try {
      const { channel, recipients, message, options = {} } = req.body;

      if (!channel || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'channel and recipients array are required' }
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'message is required' }
        });
      }

      const result = await channelBridge.broadcast({
        channel,
        recipients,
        message,
        options
      });

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
        error: { code: 'BROADCAST_FAILED', message: error.message }
      });
    }
  });

  /**
   * POST /api/message/template
   * Send templated message
   */
  router.post('/template', async (req, res) => {
    try {
      const { channel, to, template, variables = {} } = req.body;

      if (!channel || !to || !template) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'channel, to, and template are required' }
        });
      }

      // Process template variables
      let message = template;
      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      const result = await channelBridge.sendMessage({
        channel,
        to,
        message,
        options: { template: { name: template, variables } }
      });

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
        error: { code: 'TEMPLATE_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/message/channels
   * Get channel status
   */
  router.get('/channels', (req, res) => {
    res.json({
      success: true,
      data: channelBridge.getChannelStatus(),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  });

  return router;
};
