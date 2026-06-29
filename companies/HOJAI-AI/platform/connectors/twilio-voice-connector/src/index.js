/**
 * Twilio Voice Connector
 * Handle calls + AI integration
 */

const twilio = require('twilio');
const express = require('express');

class TwilioVoiceClient {
  constructor(config) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    this.aiCallbackUrl = config.aiCallbackUrl;
    this.twimlAppSid = config.twimlAppSid;
    this.client = twilio(config.accountSid, config.authToken);

    this.app = express();
    this.setupRoutes();
  }

  setupRoutes() {
    // Inbound call webhook
    this.app.post('/voice/inbound', (req, res) => {
      const twiml = this.handleInboundCall(req.body);
      res.type('text/xml');
      res.send(twiml.toString());
    });

    // Call status callbacks
    this.app.post('/voice/status', (req, res) => {
      console.log('[Voice] Call status:', req.body.CallStatus);
      res.sendStatus(200);
    });

    // Recording download webhook
    this.app.post('/voice/recording', (req, res) => {
      console.log('[Voice] Recording ready:', req.body.RecordingUrl);
      res.sendStatus(200);
    });

    // AI responds
    this.app.post('/voice/ai-respond', (req, res) => {
      const twiml = this.generateAIResponse(req.body);
      res.type('text/xml');
      res.send(twiml.toString());
    });
  }

  // Handle inbound call
  handleInboundCall({ From, To, CallSid }) {
    const { VoiceResponse } = twilio.twiml;

    const response = new VoiceResponse();

    // Connect to AI
    const connect = response.connect({
      url: `${this.aiCallbackUrl}/answer?callSid=${CallSid}`,
    });

    return response;
  }

  // Generate AI response (Twilio AI Assistant)
  generateAIResponse({ speechResult, callSid }) {
    const { VoiceResponse } = twilio.twiml;

    const response = new VoiceResponse();

    // Process speech via AI
    const aiResponse = this.processWithAI(speechResult);

    response.say({ voice: 'Polly.Joanna' }, aiResponse);

    const gather = response.gather({
      input: ['speech'],
      action: '/voice/ai-respond',
      timeout: 3,
    });

    gather.say('Please tell me more.');

    return response;
  }

  // Process with AI agent (callbacks)
  async processWithAI(speech) {
    // This should integrate with Agent Runtime
    if (this.aiCallbackUrl) {
      try {
        const axios = require('axios');
        const response = await axios.post(this.aiCallbackUrl, {
          speech,
          callSid: this.callSid,
        });
        return response.data.reply;
      } catch {
        return "I'm sorry, I didn't understand.";
      }
    }
    return "I'm sorry, I didn't catch that.";
  }

  // Make outbound call
  async makeCall({ to, twiml, record = true, timeout = 30 }) {
    try {
      const call = await this.client.calls.create({
        to,
        from: this.fromNumber,
        twiml,
        record,
        timeout,
      });

      return { success: true, sid: call.sid, status: call.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // AI callback (inbound → AI answers)
  async aiAnswer({ to, aiAgentId, context }) {
    const { VoiceResponse } = twilio.twiml;

    const response = new VoiceResponse();
    response.say({ voice: 'Polly.Joanna' }, 'Connecting you to our AI assistant.');

    const connect = response.connect({
      ai: {
        vendor: 'google',
        agent: `HOJAI-${aiAgentId}`,
        agentLanguage: 'en-US',
        context,
      },
    });

    return response.toString();
  }

  // Get call recordings
  async getRecordings(callSid) {
    try {
      const recordings = await this.client.recordings.list({ callSid });
      return recordings.map(r => ({
        sid: r.sid,
        duration: r.duration,
        url: `https://api.twilio.com${r.uri.replace('.json', '.mp3')}`,
        dateCreated: r.dateCreated,
        channels: r.channels,
      }));
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get call details
  async getCall(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TwilioVoiceClient;
