import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VoiceCall, CallStatus, CallDisposition } from '../models/VoiceCall';
import { Worker, ServiceType } from '../models/Worker';
import { initiateOutboundCall, getCallRecording, getCallTranscript } from '../services/voiceService';

const router = Router();

// Validation schemas
const initiateCallSchema = z.object({
  workerId: z.string().min(1),
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
  jobId: z.string().optional(),
  script: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateCallNotesSchema = z.object({
  notes: z.string(),
});

const updateDispositionSchema = z.object({
  disposition: z.nativeEnum(CallDisposition),
  notes: z.string().optional(),
});

// Middleware to extract tenant ID
const extractTenant = (req: Request, _res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return next(new Error('X-Tenant-ID header is required'));
  }
  req.body.tenantId = tenantId;
  next();
};

// Initiate outbound call
router.post('/call', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = initiateCallSchema.parse(req.body);

    // Verify worker exists and has VOICE skill
    const worker = await Worker.findOne({ _id: validatedData.workerId, tenantId });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    if (!worker.skills.includes(ServiceType.VOICE)) {
      return res.status(400).json({
        success: false,
        error: 'Worker does not have VOICE skill',
      });
    }

    if (worker.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        error: 'Worker is not available',
      });
    }

    // Initiate Twilio call
    const callResult = await initiateOutboundCall({
      to: validatedData.customerPhone,
      script: validatedData.script,
    });

    if (!callResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate call',
        details: callResult.error,
      });
    }

    // Create voice call record
    const voiceCall = new VoiceCall({
      tenantId,
      workerId: worker._id,
      workerName: worker.name,
      jobId: validatedData.jobId,
      customerPhone: validatedData.customerPhone,
      customerName: validatedData.customerName,
      twilioCallSid: callResult.callSid,
      status: CallStatus.INITIATED,
      metadata: validatedData.metadata,
    });

    await voiceCall.save();

    res.status(201).json({
      success: true,
      data: voiceCall,
      twilioCallSid: callResult.callSid,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// List voice calls
router.get('/calls', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { workerId, status, disposition, limit = 50, offset = 0 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (workerId) {
      query.workerId = workerId;
    }

    if (status) {
      query.status = status;
    }

    if (disposition) {
      query.disposition = disposition;
    }

    const calls = await VoiceCall.find(query)
      .populate('workerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .select('-__v');

    const total = await VoiceCall.countDocuments(query);

    res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get call by ID
router.get('/calls/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const call = await VoiceCall.findOne({ _id: id, tenantId })
      .populate('workerId', 'name email skills')
      .select('-__v');

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
});

// Get call recording
router.get('/calls/:id/recording', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const call = await VoiceCall.findOne({ _id: id, tenantId });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    if (!call.twilioRecordingSid) {
      return res.status(404).json({
        success: false,
        error: 'No recording available for this call',
      });
    }

    const recording = await getCallRecording(call.twilioRecordingSid);

    res.json({
      success: true,
      data: {
        recordingUrl: recording.url,
        recordingSid: recording.sid,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get call transcript
router.get('/calls/:id/transcript', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const call = await VoiceCall.findOne({ _id: id, tenantId });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    if (call.transcript) {
      return res.json({
        success: true,
        data: {
          transcript: call.transcript,
        },
      });
    }

    if (!call.twilioCallSid) {
      return res.status(404).json({
        success: false,
        error: 'No transcript available for this call',
      });
    }

    const transcript = await getCallTranscript(call.twilioCallSid);

    if (transcript) {
      call.transcript = transcript;
      await call.save();
    }

    res.json({
      success: true,
      data: {
        transcript: transcript || 'Transcript not available',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update call notes
router.put('/calls/:id/notes', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const { notes } = updateCallNotesSchema.parse(req.body);

    const call = await VoiceCall.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { notes } },
      { new: true, runValidators: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Update call disposition
router.put('/calls/:id/disposition', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const { disposition, notes } = updateDispositionSchema.parse(req.body);

    const call = await VoiceCall.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $set: {
          disposition,
          ...(notes && { notes }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Get voice call statistics
router.get('/stats', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { workerId } = req.query;

    const match: Record<string, unknown> = { tenantId };
    if (workerId) {
      match.workerId = workerId;
    }

    const stats = await VoiceCall.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          answeredCalls: {
            $sum: { $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0] },
          },
          totalDuration: { $sum: '$duration' },
          averageDuration: { $avg: '$duration' },
          completedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
          failedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalCalls: 0,
      answeredCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      completedCalls: 0,
      failedCalls: 0,
    };

    res.json({
      success: true,
      data: {
        ...result,
        answerRate: result.totalCalls > 0
          ? ((result.answeredCalls / result.totalCalls) * 100).toFixed(2) + '%'
          : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get calls by worker
router.get('/worker/:workerId', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { workerId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const calls = await VoiceCall.findWorkerCalls(tenantId, workerId, Number(limit));

    res.json({
      success: true,
      data: calls,
      count: calls.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;