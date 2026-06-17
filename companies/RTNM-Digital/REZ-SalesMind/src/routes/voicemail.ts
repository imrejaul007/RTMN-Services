import { Router } from 'express';
import { generateId, randomDelay, generateVoicemailText } from '../utils/helpers.js';
import type { Voicemail } from '../types/index.js';

const router = Router();

// In-memory storage for voicemails
const voicemails: Map<string, Voicemail> = new Map();

// POST /api/voicemail/detect - Detect if voicemail was left
router.post('/detect', async (req, res) => {
  try {
    const { callId, leadId, duration, status, ringTime } = req.body;

    await randomDelay(100, 300);

    // Voicemail detection heuristics
    const isVoicemail =
      status === 'voicemail' ||
      (status === 'completed' && duration < 30) ||
      (duration > 5 && duration < 60 && ringTime > 20);

    if (!isVoicemail) {
      return res.json({
        success: true,
        isVoicemail: false,
        confidence: 0.95,
        reason: 'Call completed with normal duration'
      });
    }

    // Generate voicemail record
    const voicemailId = generateId('vm');
    const voicemail: Voicemail = {
      id: voicemailId,
      callId,
      leadId,
      duration: isVoicemail ? Math.min(duration, 60) : 0,
      audioUrl: `/recordings/${callId}.mp3`,
      detectedAt: new Date()
    };

    voicemails.set(voicemailId, voicemail);

    res.json({
      success: true,
      isVoicemail: true,
      confidence: 0.88,
      voicemailId,
      reason: 'Short duration with completed status indicates voicemail',
      voicemail: {
        id: voicemailId,
        duration: voicemail.duration,
        detectedAt: voicemail.detectedAt
      }
    });
  } catch (error) {
    console.error('Voicemail detection error:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// GET /api/voicemail/:callId - Get voicemail details
router.get('/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    // Find voicemail by callId
    let voicemail: Voicemail | undefined;
    for (const vm of voicemails.values()) {
      if (vm.callId === callId) {
        voicemail = vm;
        break;
      }
    }

    if (!voicemail) {
      // Return mock data for demo
      const mockVoicemail: Voicemail = {
        id: generateId('vm'),
        callId,
        leadId: 'lead-demo',
        duration: 28,
        audioUrl: `/recordings/${callId}.mp3`,
        detectedAt: new Date()
      };

      return res.json({
        success: true,
        voicemail: mockVoicemail,
        hasTranscription: true
      });
    }

    res.json({
      success: true,
      voicemail,
      hasTranscription: !!voicemail.transcription
    });
  } catch (error) {
    console.error('Get voicemail error:', error);
    res.status(500).json({ error: 'Failed to get voicemail' });
  }
});

// POST /api/voicemail/transcribe - Transcribe voicemail
router.post('/transcribe', async (req, res) => {
  try {
    const { voicemailId, callId } = req.body;

    await randomDelay(500, 1500);

    let voicemail: Voicemail | undefined;

    if (voicemailId) {
      voicemail = voicemails.get(voicemailId);
    } else if (callId) {
      for (const vm of voicemails.values()) {
        if (vm.callId === callId) {
          voicemail = vm;
          break;
        }
      }
    }

    if (!voicemail) {
      // Create mock voicemail for demo
      const newVoicemailId = voicemailId || generateId('vm');
      const mockVoicemail: Voicemail = {
        id: newVoicemailId,
        callId: callId || 'unknown',
        leadId: 'lead-demo',
        duration: 28,
        audioUrl: `/recordings/${callId || 'unknown'}.mp3`,
        transcription: generateVoicemailText(),
        detectedAt: new Date()
      };

      voicemails.set(newVoicemailId, mockVoicemail);

      return res.json({
        success: true,
        voicemail: mockVoicemail,
        transcription: {
          text: mockVoicemail.transcription,
          confidence: 0.94,
          language: 'en-US',
          duration: mockVoicemail.duration
        }
      });
    }

    // Generate transcription for existing voicemail
    const transcription = generateVoicemailText();
    voicemail.transcription = transcription;
    voicemails.set(voicemail.id, voicemail);

    res.json({
      success: true,
      voicemail,
      transcription: {
        text: transcription,
        confidence: 0.94,
        language: 'en-US',
        duration: voicemail.duration
      }
    });
  } catch (error) {
    console.error('Voicemail transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// POST /api/voicemail/:id/analyze - Analyze voicemail content
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const voicemail = voicemails.get(id);
    if (!voicemail?.transcription) {
      return res.status(404).json({ error: 'Voicemail transcription not found' });
    }

    await randomDelay(300, 800);

    const transcription = voicemail.transcription;

    // Simple keyword-based analysis
    const isInterested = transcription.toLowerCase().includes('call') ||
                         transcription.toLowerCase().includes('interested') ||
                         transcription.toLowerCase().includes('schedule');

    const isUrgent = transcription.toLowerCase().includes('urgent') ||
                      transcription.toLowerCase().includes('asap') ||
                      transcription.toLowerCase().includes('immediately');

    const wantsDemo = transcription.toLowerCase().includes('demo') ||
                      transcription.toLowerCase().includes('show') ||
                      transcription.toLowerCase().includes('review');

    res.json({
      success: true,
      analysis: {
        sentiment: isInterested ? 'positive' : 'neutral',
        intent: {
          level: isInterested ? 'high' : 'medium',
          wantsDemo,
          isUrgent,
          callbackRequested: transcription.toLowerCase().includes('call back')
        },
        keyPoints: [
          'Follow-up requested',
          'Interested in AI capabilities',
          'Prefers callback method'
        ],
        recommendedAction: isUrgent ? 'immediate_callback' :
                           wantsDemo ? 'schedule_demo' :
                           'email_followup',
        priority: isUrgent ? 'high' : isInterested ? 'medium' : 'low'
      }
    });
  } catch (error) {
    console.error('Voicemail analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// GET /api/voicemail - List all voicemails
router.get('/', async (req, res) => {
  try {
    const { leadId, status, limit = 50, offset = 0 } = req.query;

    let filtered = Array.from(voicemails.values());

    if (leadId) {
      filtered = filtered.filter(vm => vm.leadId === leadId);
    }

    const total = filtered.length;
    const paginated = filtered
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      voicemails: paginated,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + paginated.length < total
      }
    });
  } catch (error) {
    console.error('List voicemails error:', error);
    res.status(500).json({ error: 'Failed to list voicemails' });
  }
});

export default router;
