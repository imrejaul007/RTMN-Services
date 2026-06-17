import { Router } from 'express';
import { generateId, randomDelay, generateSalesConversation, estimateSpeakerCount } from '../utils/helpers.js';
import type { Transcription, TranscriptionSegment } from '../types/index.js';

const router = Router();

// In-memory storage for transcriptions
const transcriptions: Map<string, Transcription> = new Map();
const calls: Map<string, any> = new Map();

// Initialize mock calls
function initMockCalls() {
  const mockCalls = [
    { id: 'call-001', leadId: 'lead-001', direction: 'outbound', duration: 180, status: 'completed' },
    { id: 'call-002', leadId: 'lead-002', direction: 'outbound', duration: 45, status: 'voicemail' },
    { id: 'call-003', leadId: 'lead-003', direction: 'inbound', duration: 420, status: 'completed' },
    { id: 'call-004', leadId: 'lead-004', direction: 'outbound', duration: 95, status: 'completed' },
    { id: 'call-005', leadId: 'lead-005', direction: 'outbound', duration: 25, status: 'voicemail' }
  ];
  mockCalls.forEach(call => calls.set(call.id, { ...call, createdAt: new Date() }));
}

initMockCalls();

// POST /api/communication/call/:id/transcribe - Transcribe a call
router.post('/call/:id/transcribe', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en-US', model = 'enhanced' } = req.body;

    await randomDelay(500, 2000);

    const call = calls.get(id);
    if (!call) {
      return res.status(404).json({ error: 'Call not found', callId: id });
    }

    const transcriptionId = generateId('trn');
    const speakerCount = estimateSpeakerCount(call.duration);

    const segments: TranscriptionSegment[] = [];
    const conversation = generateSalesConversation();
    const lines = conversation.split('\n').filter(l => l.trim());

    lines.forEach((line, index) => {
      const start = (index * call.duration / lines.length);
      const end = ((index + 1) * call.duration / lines.length);
      segments.push({
        start: Math.floor(start),
        end: Math.floor(end),
        speaker: line.includes('Sales Rep') ? 'sales_rep' : 'prospect',
        text: line.trim(),
        confidence: 0.92 + Math.random() * 0.07
      });
    });

    const transcription: Transcription = {
      id: transcriptionId,
      callId: id,
      text: conversation,
      duration: call.duration,
      speakerCount,
      segments,
      createdAt: new Date()
    };

    transcriptions.set(transcriptionId, transcription);

    // Update call with transcription reference
    calls.set(id, { ...call, transcriptionId });

    res.json({
      success: true,
      transcription,
      metadata: {
        language,
        model,
        processedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// GET /api/communication/call/:id/transcription - Get transcription
router.get('/call/:id/transcription', async (req, res) => {
  try {
    const { id } = req.params;

    const call = calls.get(id);
    if (!call) {
      return res.status(404).json({ error: 'Call not found', callId: id });
    }

    if (!call.transcriptionId) {
      return res.status(404).json({ error: 'Transcription not found for this call', callId: id });
    }

    const transcription = transcriptions.get(call.transcriptionId);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json({
      success: true,
      transcription,
      call: {
        id: call.id,
        leadId: call.leadId,
        direction: call.direction,
        duration: call.duration,
        status: call.status
      }
    });
  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// POST /api/transcription/batch - Batch transcribe multiple calls
router.post('/batch', async (req, res) => {
  try {
    const { callIds, options = {} } = req.body;
    const { language = 'en-US', parallel = true } = options;

    if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
      return res.status(400).json({ error: 'callIds array is required' });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const callId of callIds) {
      const call = calls.get(callId);
      if (!call) {
        errors.push({ callId, error: 'Call not found' });
        continue;
      }

      if (call.transcriptionId && transcriptions.has(call.transcriptionId)) {
        results.push({
          callId,
          status: 'already_transcribed',
          transcriptionId: call.transcriptionId
        });
        continue;
      }

      await randomDelay(200, 800);

      const transcriptionId = generateId('trn');
      const speakerCount = estimateSpeakerCount(call.duration);
      const conversation = generateSalesConversation();

      const segments: TranscriptionSegment[] = [];
      const lines = conversation.split('\n').filter(l => l.trim());
      lines.forEach((line, index) => {
        const start = (index * call.duration / lines.length);
        const end = ((index + 1) * call.duration / lines.length);
        segments.push({
          start: Math.floor(start),
          end: Math.floor(end),
          speaker: line.includes('Sales Rep') ? 'sales_rep' : 'prospect',
          text: line.trim(),
          confidence: 0.92 + Math.random() * 0.07
        });
      });

      const transcription: Transcription = {
        id: transcriptionId,
        callId,
        text: conversation,
        duration: call.duration,
        speakerCount,
        segments,
        createdAt: new Date()
      };

      transcriptions.set(transcriptionId, transcription);
      calls.set(callId, { ...call, transcriptionId });

      results.push({
        callId,
        status: 'transcribed',
        transcriptionId,
        duration: call.duration,
        speakers: speakerCount
      });
    }

    res.json({
      success: true,
      summary: {
        total: callIds.length,
        transcribed: results.length,
        errors: errors.length
      },
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Batch transcription error:', error);
    res.status(500).json({ error: 'Batch transcription failed' });
  }
});

// GET /api/transcription/:id - Get transcription by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transcription = transcriptions.get(id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json({
      success: true,
      transcription
    });
  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// POST /api/transcription/:id/analyze - Analyze transcription
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const transcription = transcriptions.get(id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    await randomDelay(300, 1000);

    res.json({
      success: true,
      analysis: {
        sentiment: {
          overall: 'positive',
          score: 0.75,
          salesRepSentiment: 0.82,
          prospectSentiment: 0.68
        },
        keyTopics: [
          'AI sales automation',
          'Autonomous SDR',
          'CRM integration',
          'HubSpot write-back',
          'Multi-channel outreach',
          'Pricing discussion',
          'Implementation timeline'
        ],
        objections: [
          'Needs team approval',
          'Wants detailed proposal',
          'Price sensitivity mentioned'
        ],
        buyingSignals: [
          'Requested follow-up call',
          'Asked about detailed proposal',
          'Expressed interest in capabilities'
        ],
        nextSteps: [
          'Send comprehensive proposal',
          'Schedule follow-up call tomorrow 3PM',
          'Include pricing tiers and implementation plan'
        ],
        talkRatio: {
          salesRep: 45,
          prospect: 55
        },
        engagement: {
          questionsAsked: 5,
          objectionsRaised: 2,
          buyingSignals: 3
        }
      }
    });
  } catch (error) {
    console.error('Analyze transcription error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
