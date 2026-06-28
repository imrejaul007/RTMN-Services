const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.VOICE_WIDGET_PORT || 5463;

const VOICE_GATEWAY = process.env.VOICE_GATEWAY_URL || 'http://localhost:4880';
const MEMORY_OS = process.env.MEMORY_OS_URL || 'http://localhost:4703';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ivrSessions = new Map();
const voiceConfigs = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-widget', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'voice-widget', version: '1.0.0' });
});

// POST /api/voice/synthesize - Convert text to speech
app.post('/api/voice/synthesize', async (req, res) => {
  try {
    const { text, voice, language, speed, format } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });

    const options = {
      text,
      voice: voice || 'female-premium',
      language: language || 'en-IN',
      speed: speed || 1.0,
      format: format || 'mp3'
    };

    try {
      const vr = await axios.post(`${VOICE_GATEWAY}/api/tts/synthesize`, options, { timeout: 8000 });
      res.json({ success: true, data: vr.data, method: 'voice-gateway' });
    } catch (gatewayError) {
      const webSpeechResponse = {
        text,
        audioUrl: null,
        method: 'web-speech-api',
        webSpeechOptions: {
          voice: options.voice,
          lang: options.language,
          rate: options.speed,
          pitch: 1.0,
          volume: 1.0
        },
        fallback: true
      };
      res.json({ success: true, data: webSpeechResponse, method: 'fallback' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voice/transcribe - Convert speech to text
app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const { audioUrl, language, format } = req.body;
    if (!audioUrl) return res.status(400).json({ success: false, error: 'audioUrl is required' });

    const options = {
      audioUrl,
      language: language || 'en-IN',
      format: format || 'webm'
    };

    try {
      const vr = await axios.post(`${VOICE_GATEWAY}/api/stt/transcribe`, options, { timeout: 15000 });
      res.json({ success: true, data: vr.data, method: 'voice-gateway' });
    } catch (gatewayError) {
      res.json({
        success: true,
        data: {
          text: null,
          method: 'browser-recognition',
          instruction: 'Use browser Web Speech API for client-side transcription'
        },
        method: 'fallback'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voice/ivr/start - Start IVR session
app.post('/api/voice/ivr/start', async (req, res) => {
  try {
    const { companyId, phone, context, flowId } = req.body;
    if (!companyId || !phone) {
      return res.status(400).json({ success: false, error: 'companyId and phone are required' });
    }

    const sessionId = `ivr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const flow = ivrFlows.get(flowId) || generateDefaultIVRFlow(context);

    const session = {
      sessionId,
      companyId,
      phone,
      context,
      flowId: flowId || 'default',
      status: 'initiated',
      currentNode: 'root',
      startTime: new Date().toISOString(),
      inputs: [],
      transfers: []
    };

    ivrSessions.set(sessionId, session);

    try {
      await axios.post(`${MEMORY_OS}/api/memory/store`, {
        type: 'ivr_session',
        entityId: sessionId,
        data: session
      });
    } catch (memoryError) {
      console.log('[IVR] Memory store failed, continuing without persistence');
    }

    res.json({
      success: true,
      data: {
        sessionId,
        status: 'initiated',
        phone,
        flow,
        greeting: flow.greeting,
        message: 'IVR session started successfully'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voice/ivr/:sessionId - Get IVR session status
app.get('/api/voice/ivr/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = ivrSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      status: session.status,
      currentNode: session.currentNode,
      phone: session.phone,
      startTime: session.startTime,
      duration: Date.now() - new Date(session.startTime).getTime()
    }
  });
});

// POST /api/voice/ivr/:sessionId/input - Process IVR input
app.post('/api/voice/ivr/:sessionId/input', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { dtmf, transcription, intent } = req.body;

    const session = ivrSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const inputRecord = {
      dtmf,
      transcription,
      intent,
      timestamp: new Date().toISOString()
    };
    session.inputs.push(inputRecord);

    const response = routeIVRInput(session, dtmf, transcription, intent);
    session.currentNode = response.nextNode || session.currentNode;

    if (response.action === 'transfer') {
      session.transfers.push({
        type: response.transferType,
        timestamp: new Date().toISOString()
      });
      session.status = 'transferred';
    } else if (response.action === 'complete') {
      session.status = 'completed';
    }

    const speakResult = await synthesizeSpeech(response.message);

    res.json({
      success: true,
      data: {
        sessionId,
        action: response.action,
        message: response.message,
        nextNode: response.nextNode,
        audioUrl: speakResult.audioUrl,
        transferType: response.transferType
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/voice/ivr/:sessionId - End IVR session
app.delete('/api/voice/ivr/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = ivrSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  session.status = 'ended';
  session.endTime = new Date().toISOString();

  res.json({
    success: true,
    data: {
      sessionId,
      status: 'ended',
      duration: session.endTime ? Date.now() - new Date(session.startTime).getTime() : null,
      inputs: session.inputs.length,
      transfers: session.transfers.length
    }
  });
});

// GET /api/voice/config/:companyId - Get voice config
app.get('/api/voice/config/:companyId', (req, res) => {
  const { companyId } = req.params;
  const config = voiceConfigs.get(companyId) || getDefaultConfig(companyId);

  res.json({
    success: true,
    data: config
  });
});

// PUT /api/voice/config/:companyId - Update voice config
app.put('/api/voice/config/:companyId', (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;

  const existing = voiceConfigs.get(companyId) || getDefaultConfig(companyId);
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  voiceConfigs.set(companyId, updated);

  res.json({
    success: true,
    data: updated
  });
});

// POST /api/voice/config/:companyId/flows - Create IVR flow
app.post('/api/voice/config/:companyId/flows', (req, res) => {
  const { companyId } = req.params;
  const { flowId, name, greeting, menu, timeout, maxRetries, nodes } = req.body;

  if (!flowId || !name) {
    return res.status(400).json({ success: false, error: 'flowId and name are required' });
  }

  const flow = {
    flowId,
    companyId,
    name,
    greeting: greeting || 'Welcome. How can I help you today?',
    menu: menu || {
      '1': { label: 'Sales', action: 'transfer_sales' },
      '2': { label: 'Support', action: 'transfer_support' },
      '3': { label: 'General Inquiry', action: 'transfer_info' },
      '0': { label: 'Operator', action: 'transfer_operator' }
    },
    timeout: timeout || 10,
    maxRetries: maxRetries || 3,
    nodes: nodes || [],
    createdAt: new Date().toISOString()
  };

  ivrFlows.set(`${companyId}:${flowId}`, flow);

  res.json({
    success: true,
    data: flow
  });
});

// GET /api/voice/config/:companyId/flows - List IVR flows
app.get('/api/voice/config/:companyId/flows', (req, res) => {
  const { companyId } = req.params;
  const flows = [];

  ivrFlows.forEach((flow, key) => {
    if (key.startsWith(`${companyId}:`)) {
      flows.push(flow);
    }
  });

  res.json({
    success: true,
    data: flows
  });
});

// POST /api/voice/recordings - Save recording
app.post('/api/voice/recordings', (req, res) => {
  const { sessionId, duration, format } = req.body;

  const recording = {
    recordingId: `rec_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    sessionId,
    duration: duration || 0,
    format: format || 'webm',
    createdAt: new Date().toISOString()
  };

  recordings.set(recording.recordingId, recording);

  res.json({
    success: true,
    data: recording
  });
});

// GET /api/voice/recordings/:recordingId - Get recording
app.get('/api/voice/recordings/:recordingId', (req, res) => {
  const { recordingId } = req.params;
  const recording = recordings.get(recordingId);

  if (!recording) {
    return res.status(404).json({ success: false, error: 'Recording not found' });
  }

  res.json({
    success: true,
    data: recording
  });
});

// GET /api/voice/analytics - Get voice analytics
app.get('/api/voice/analytics', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  let sessions = Array.from(ivrSessions.values());

  if (companyId) {
    sessions = sessions.filter(s => s.companyId === companyId);
  }

  if (startDate) {
    const start = new Date(startDate);
    sessions = sessions.filter(s => new Date(s.startTime) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    sessions = sessions.filter(s => new Date(s.startTime) <= end);
  }

  const completed = sessions.filter(s => s.status === 'completed').length;
  const transferred = sessions.filter(s => s.status === 'transferred').length;
  const abandoned = sessions.filter(s => s.status === 'ended' || s.status === 'abandoned').length;

  res.json({
    success: true,
    data: {
      totalSessions: sessions.length,
      completed,
      transferred,
      abandoned,
      completionRate: sessions.length > 0 ? (completed / sessions.length * 100).toFixed(2) : 0,
      transferRate: sessions.length > 0 ? (transferred / sessions.length * 100).toFixed(2) : 0,
      avgDuration: sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => {
            const duration = s.endTime
              ? Date.now() - new Date(s.startTime).getTime()
              : 0;
            return acc + duration;
          }, 0) / sessions.length / 1000)
        : 0
    }
  });
});

// ─── Helpers ───────────────────────────────────────────

const ivrFlows = new Map();
const recordings = new Map();

function getDefaultConfig(companyId) {
  return {
    companyId,
    ttsEngine: 'voice-gateway',
    sttEngine: 'voice-gateway',
    defaultLanguage: 'en-IN',
    availableLanguages: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'ml-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'mr-IN', 'pa-IN'],
    defaultVoice: 'female-premium',
    availableVoices: [
      { id: 'female-premium', name: 'Female Premium', gender: 'female' },
      { id: 'male-premium', name: 'Male Premium', gender: 'male' },
      { id: 'female-standard', name: 'Female Standard', gender: 'female' },
      { id: 'male-standard', name: 'Male Standard', gender: 'male' },
      { id: 'female-hindi', name: 'Female Hindi', language: 'hi-IN', gender: 'female' },
      { id: 'male-hindi', name: 'Male Hindi', language: 'hi-IN', gender: 'male' },
      { id: 'female-tamil', name: 'Female Tamil', language: 'ta-IN', gender: 'female' },
      { id: 'female-telugu', name: 'Female Telugu', language: 'te-IN', gender: 'female' }
    ],
    ivrSettings: {
      defaultTimeout: 10,
      maxRetries: 3,
      interDigitTimeout: 3000
    },
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

function generateDefaultIVRFlow(context) {
  const contextFlows = {
    sales: {
      name: 'Sales IVR',
      greeting: 'Welcome to our sales line. How can we help you today?',
      menu: {
        '1': { label: 'Product Information', action: 'info_products' },
        '2': { label: 'Pricing', action: 'info_pricing' },
        '3': { label: 'Place Order', action: 'transfer_sales' },
        '4': { label: 'Speak to Sales Rep', action: 'transfer_sales' }
      }
    },
    support: {
      name: 'Support IVR',
      greeting: 'Thank you for calling support. How can we assist you?',
      menu: {
        '1': { label: 'Technical Support', action: 'transfer_support_tech' },
        '2': { label: 'Billing', action: 'transfer_support_billing' },
        '3': { label: 'Track Service Request', action: 'track_ticket' },
        '4': { label: 'Speak to Agent', action: 'transfer_agent' }
      }
    },
    order: {
      name: 'Order Tracking IVR',
      greeting: 'Welcome. Enter your order number to track your delivery.',
      menu: {
        '1': { label: 'Track Order', action: 'track_order' },
        '2': { label: 'Cancel Order', action: 'cancel_order' },
        '3': { label: 'Modify Order', action: 'modify_order' },
        '4': { label: 'Speak to Agent', action: 'transfer_agent' }
      }
    }
  };

  return contextFlows[context] || {
    name: 'HOJAI Voice Assistant',
    greeting: 'Welcome to our automated assistant. How can I help you today?',
    menu: {
      '1': { label: 'Sales', action: 'transfer_sales' },
      '2': { label: 'Support', action: 'transfer_support' },
      '3': { label: 'Track Order', action: 'track_order' },
      '4': { label: 'Speak to Agent', action: 'transfer_agent' }
    },
    timeout: 10,
    maxRetries: 3
  };
}

function routeIVRInput(session, dtmf, transcription, intent) {
  const retryCount = session.inputs.filter(i => i.dtmf === dtmf).length;

  if (dtmf === '1') {
    return {
      action: 'speak',
      message: 'Transferring you to our sales team. Please hold.',
      nextNode: 'transfer_sales',
      transferType: 'sales'
    };
  }
  if (dtmf === '2') {
    return {
      action: 'speak',
      message: 'Transferring you to customer support. Please hold.',
      nextNode: 'transfer_support',
      transferType: 'support'
    };
  }
  if (dtmf === '3') {
    return {
      action: 'speak',
      message: 'Please enter your order number followed by the pound key.',
      nextNode: 'track_order'
    };
  }
  if (dtmf === '4') {
    return {
      action: 'speak',
      message: 'Connecting you to an available agent.',
      nextNode: 'transfer_agent',
      transferType: 'agent'
    };
  }
  if (dtmf === '0') {
    return {
      action: 'transfer',
      message: 'Transferring you to the operator.',
      nextNode: 'transfer_operator',
      transferType: 'operator'
    };
  }
  if (dtmf === '#') {
    return {
      action: 'complete',
      message: 'Thank you for calling. Goodbye.',
      nextNode: 'end'
    };
  }

  if (retryCount >= 2) {
    return {
      action: 'transfer',
      message: 'I am having trouble understanding. Transferring you to an agent.',
      nextNode: 'transfer_agent',
      transferType: 'agent'
    };
  }

  return {
    action: 'speak',
    message: 'I did not understand your selection. Please try again.',
    nextNode: 'root'
  };
}

async function synthesizeSpeech(text) {
  try {
    const response = await axios.post(`${VOICE_GATEWAY}/api/tts/synthesize`, {
      text,
      format: 'mp3'
    }, { timeout: 8000 });

    return {
      success: true,
      audioUrl: response.data.audioUrl || null
    };
  } catch (error) {
    return {
      success: true,
      audioUrl: null,
      method: 'fallback',
      webSpeechOptions: { text }
    };
  }
}

app.listen(PORT, () => {
  console.log(`Voice Widget service running on port ${PORT}`);
  console.log(`Voice Gateway: ${VOICE_GATEWAY}`);
  console.log(`Memory OS: ${MEMORY_OS}`);
});

module.exports = app;
