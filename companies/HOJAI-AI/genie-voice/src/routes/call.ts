import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface CallRequest {
  to: string;
  from?: string;
  direction: 'outbound' | 'inbound';
  type: 'voice' | 'video';
  metadata?: Record<string, any>;
  record?: boolean;
  webhook_url?: string;
}

interface CallResponse {
  id: string;
  call_sid: string;
  direction: string;
  type: string;
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  to: string;
  from: string;
  duration?: number;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  transcription?: string;
  metadata?: Record<string, any>;
}

// In-memory call log
const callLog: CallResponse[] = [];

// POST /api/communication/call - Initiate call
router.post('/call', (req: Request, res: Response) => {
  const call = req.body as CallRequest;

  if (!call.to) {
    res.status(400).json({
      success: false,
      error: 'Recipient (to) is required.'
    });
    return;
  }

  if (!call.direction || !['outbound', 'inbound'].includes(call.direction)) {
    res.status(400).json({
      success: false,
      error: 'Direction must be outbound or inbound.'
    });
    return;
  }

  const callSid = 'CA' + randomUUID().replace(/-/g, '').slice(0, 32);

  const response: CallResponse = {
    id: randomUUID(),
    call_sid: callSid,
    direction: call.direction,
    type: call.type || 'voice',
    status: 'initiated',
    to: call.to,
    from: call.from || '+1234567890',
    metadata: call.metadata
  };

  // Simulate call initiation
  if (call.direction === 'outbound') {
    response.status = 'ringing';
    response.started_at = new Date().toISOString();
  }

  // Log call
  callLog.push(response);

  // Simulate recording if requested
  if (call.record) {
    response.recording_url = `https://recordings.rtmn.io/${callSid}.mp3`;
    response.metadata = {
      ...response.metadata,
      recording_enabled: true
    };
  }

  res.status(201).json({
    success: true,
    data: response,
    message: `Call ${call.direction === 'outbound' ? 'initiated' : 'received'} successfully`
  });
});

// GET /api/communication/call/:id - Get call details
router.get('/call/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const call = callLog.find(c => c.id === id || c.call_sid === id);

  if (!call) {
    res.status(404).json({
      success: false,
      error: 'Call not found'
    });
    return;
  }

  // Simulate completed status
  const updatedCall = {
    ...call,
    status: 'completed' as const,
    duration: Math.floor(Math.random() * 600) + 30, // 30 seconds to 10 minutes
    ended_at: new Date().toISOString()
  };

  res.json({
    success: true,
    data: updatedCall
  });
});

// POST /api/communication/call/:id/transcribe - Transcribe call
router.post('/call/:id/transcribe', (req: Request, res: Response) => {
  const { id } = req.params;

  const call = callLog.find(c => c.id === id || c.call_sid === id);

  if (!call) {
    res.status(404).json({
      success: false,
      error: 'Call not found'
    });
    return;
  }

  // Mock transcription
  const transcription = {
    call_id: call.call_sid,
    duration: call.duration || 120,
    text: `This is a mock transcription of the call between ${call.from} and ${call.to}. The conversation covered key points including product features, pricing discussion, and next steps for the demo. Customer expressed interest in enterprise plan and requested follow-up by end of week.`,
    confidence: 0.92,
    language: 'en-US',
    segments: [
      { start: 0, end: 45, speaker: 'agent', text: 'Thank you for calling, how can I assist you today?' },
      { start: 45, end: 120, speaker: 'customer', text: 'I would like to learn more about your enterprise solution.' },
      { start: 120, end: 240, speaker: 'agent', text: 'Of course, let me walk you through the key features...' }
    ]
  };

  call.transcription = transcription.text;
  call.metadata = { ...call.metadata, transcription_generated: true };

  res.json({
    success: true,
    data: transcription
  });
});

// GET /api/communication/calls - Get call history
router.get('/calls', (req: Request, res: Response) => {
  const { limit = '50', direction, status } = req.query;

  let filtered = [...callLog];

  if (direction) {
    filtered = filtered.filter(c => c.direction === direction);
  }

  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }

  // Sort by started_at descending
  filtered.sort((a, b) => {
    const aTime = a.started_at ? new Date(a.started_at).getTime() : 0;
    const bTime = b.started_at ? new Date(b.started_at).getTime() : 0;
    return bTime - aTime;
  });

  const limitNum = Math.min(parseInt(limit as string) || 50, 500);
  filtered = filtered.slice(0, limitNum);

  res.json({
    success: true,
    data: {
      calls: filtered,
      total: filtered.length,
      stats: {
        total: callLog.length,
        by_direction: {
          outbound: callLog.filter(c => c.direction === 'outbound').length,
          inbound: callLog.filter(c => c.direction === 'inbound').length
        },
        by_status: {
          completed: callLog.filter(c => c.status === 'completed').length,
          failed: callLog.filter(c => c.status === 'failed').length,
          missed: callLog.filter(c => c.status === 'no-answer').length
        },
        total_duration: callLog.reduce((sum, c) => sum + (c.duration || 0), 0)
      }
    }
  });
});

export default router;
