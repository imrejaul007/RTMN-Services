import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Call, CallStatus, CallDirection } from '../models/Call';
import { transcribeAudio } from '../services/transcription';
import { analyzeSentiment } from '../services/sentiment';
import { generateSummary } from '../services/summary';
import { updateCustomerTwin } from '../services/customerTwinSync';

const router = Router();

// Validation schemas
const createCallSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  direction: z.enum(['inbound', 'outbound']),
  from: z.string().min(1),
  to: z.string().min(1),
  twilioSid: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const updateCallSchema = z.object({
  status: z.enum(['ringing', 'answered', 'completed', 'missed', 'failed']).optional(),
  duration: z.number().min(0).optional(),
  transcript: z.string().optional(),
  recordingUrl: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Helper to handle validation errors
const validate = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      next(error);
    }
  }
};

// Create a new call
router.post('/', validate(createCallSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, customerId, direction, from, to, twilioSid, metadata } = req.body;

    const callId = `VC-${uuidv4().substring(0, 8).toUpperCase()}`;

    const call = new Call({
      callId,
      tenantId,
      customerId,
      direction,
      from,
      to,
      twilioSid,
      status: CallStatus.RINGING,
      metadata,
      startedAt: new Date()
    });

    await call.save();

    // Sync with Customer Twin
    await updateCustomerTwin(tenantId, customerId, {
      lastCallId: callId,
      lastCallAt: call.startedAt,
      callDirection: direction
    });

    res.status(201).json({
      success: true,
      data: call
    });
  } catch (error) {
    next(error);
  }
});

// Get all calls with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tenantId,
      customerId,
      status,
      direction,
      startDate,
      endDate,
      page = '1',
      limit = '20'
    } = req.query;

    const filter: any = {};

    if (tenantId) filter.tenantId = tenantId;
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (direction) filter.direction = direction;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Call.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: calls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get call by ID
router.get('/:callId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await Call.findOne({ callId: req.params.callId });

    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    next(error);
  }
});

// Update call
router.patch('/:callId', validate(updateCallSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await Call.findOne({ callId: req.params.callId });

    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    const { status, duration, transcript, recordingUrl, metadata } = req.body;

    // Handle status updates
    if (status) {
      switch (status) {
        case 'answered':
          call.status = CallStatus.ANSWERED;
          call.answeredAt = new Date();
          break;
        case 'completed':
          call.status = CallStatus.COMPLETED;
          call.duration = duration || call.duration;
          call.endedAt = new Date();
          break;
        case 'missed':
          call.status = CallStatus.MISSED;
          call.endedAt = new Date();
          break;
        case 'failed':
          call.status = CallStatus.FAILED;
          call.endedAt = new Date();
          break;
      }
    }

    if (transcript) call.transcript = transcript;
    if (recordingUrl) call.recordingUrl = recordingUrl;
    if (metadata) call.metadata = { ...call.metadata, ...metadata };

    await call.save();

    // If call completed, trigger AI analysis
    if (status === 'completed' && call.transcript) {
      // Async analysis - don't wait for it
      processCallAnalysis(call).catch(console.error);
    }

    // Sync with Customer Twin on completion
    if (status === 'completed') {
      await updateCustomerTwin(call.tenantId, call.customerId, {
        lastCallId: call.callId,
        lastCallAt: call.endedAt,
        lastCallDuration: call.duration,
        lastCallSummary: call.summary
      });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    next(error);
  }
});

// Delete call
router.delete('/:callId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await Call.findOneAndDelete({ callId: req.params.callId });

    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get calls by customer
router.get('/customer/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { customerId: req.params.customerId };
    if (tenantId) filter.tenantId = tenantId;

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Call.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: calls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Process call analysis (transcription, sentiment, summary)
async function processCallAnalysis(call: any) {
  try {
    // Transcribe if recording URL exists
    if (call.recordingUrl) {
      const transcript = await transcribeAudio(call.recordingUrl);
      if (transcript) {
        call.transcript = transcript;
        await call.save();
      }
    }

    // Analyze sentiment if we have transcript
    if (call.transcript) {
      const sentimentResult = await analyzeSentiment(call.transcript);
      call.sentiment = sentimentResult.sentiment;
      call.intent = sentimentResult.intent;
      await call.save();

      // Generate summary
      const summary = await generateSummary(call.transcript, call.direction);
      call.summary = summary;
      await call.save();

      // Update Customer Twin with sentiment and summary
      await updateCustomerTwin(call.tenantId, call.customerId, {
        lastCallSentiment: call.sentiment,
        lastCallIntent: call.intent,
        lastCallSummary: call.summary
      });
    }
  } catch (error) {
    console.error('Error processing call analysis:', error);
  }
}

export default router;
