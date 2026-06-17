import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Call } from '../models/Call';
import { Recording, RecordingStatus } from '../models/Recording';
import { transcribeAudio } from '../services/transcription';
import { analyzeSentiment } from '../services/sentiment';
import { generateSummary } from '../services/summary';
import { updateCustomerTwin } from '../services/customerTwinSync';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const createTranscriptionSchema = z.object({
  callId: z.string().min(1),
  tenantId: z.string().min(1),
  audioUrl: z.string().url().optional()
});

const updateTranscriptionSchema = z.object({
  transcript: z.string().min(1),
  analyzeSentiment: z.boolean().optional()
});

// Transcribe a call
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callId, tenantId, audioUrl } = req.body;

    // Find the call
    const call = await Call.findOne({ callId, tenantId });
    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    // Get audio URL from recording or request body
    const sourceUrl = audioUrl || call.recordingUrl;
    if (!sourceUrl) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No audio URL provided'
      });
      return;
    }

    // Create recording entry if not exists
    let recording = await Recording.findOne({ callId });
    if (!recording) {
      recording = new Recording({
        recordingId: `REC-${uuidv4().substring(0, 8).toUpperCase()}`,
        callId,
        tenantId,
        twilioRecordingUrl: sourceUrl,
        status: RecordingStatus.PROCESSING
      });
      await recording.save();
    } else {
      await recording.markProcessing();
    }

    // Transcribe audio
    const transcript = await transcribeAudio(sourceUrl);

    if (!transcript) {
      await recording.markFailed();
      res.status(500).json({
        error: 'Transcription Failed',
        message: 'Could not transcribe audio'
      });
      return;
    }

    // Update recording
    recording.setTranscription(transcript);
    recording.status = RecordingStatus.COMPLETED;
    recording.processedAt = new Date();
    await recording.save();

    // Update call with transcript
    call.transcript = transcript;
    await call.save();

    // Perform analysis
    const sentimentResult = await analyzeSentiment(transcript);
    call.sentiment = sentimentResult.sentiment;
    call.intent = sentimentResult.intent;
    await call.save();

    const summary = await generateSummary(transcript, call.direction);
    call.summary = summary;
    await call.save();

    // Update Customer Twin
    await updateCustomerTwin(tenantId, call.customerId, {
      lastCallId: callId,
      lastCallTranscription: transcript,
      lastCallSentiment: sentimentResult.sentiment,
      lastCallIntent: sentimentResult.intent,
      lastCallSummary: summary
    });

    res.json({
      success: true,
      data: {
        callId,
        transcript,
        sentiment: sentimentResult,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get transcription for a call
router.get('/:callId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;

    const filter: any = { callId: req.params.callId };
    if (tenantId) filter.tenantId = tenantId;

    const call = await Call.findOne(filter);
    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        callId: call.callId,
        transcript: call.transcript,
        sentiment: call.sentiment,
        intent: call.intent,
        summary: call.summary,
        hasTranscript: !!call.transcript
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update transcription manually
router.patch('/:callId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transcript, analyzeSentiment: shouldAnalyze } = req.body;
    const { tenantId } = req.query;

    const filter: any = { callId: req.params.callId };
    if (tenantId) filter.tenantId = tenantId;

    const call = await Call.findOne(filter);
    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }

    if (transcript) {
      call.transcript = transcript;
    }

    if (shouldAnalyze && transcript) {
      const sentimentResult = await analyzeSentiment(transcript);
      call.sentiment = sentimentResult.sentiment;
      call.intent = sentimentResult.intent;

      const summary = await generateSummary(transcript, call.direction);
      call.summary = summary;

      // Update Customer Twin
      await updateCustomerTwin(call.tenantId, call.customerId, {
        lastCallSentiment: sentimentResult.sentiment,
        lastCallIntent: sentimentResult.intent,
        lastCallSummary: summary
      });
    }

    await call.save();

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    next(error);
  }
});

// Batch transcribe multiple calls
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { calls } = req.body;

    if (!Array.isArray(calls) || calls.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'calls array is required'
      });
      return;
    }

    const results = [];
    const errors = [];

    for (const { callId, tenantId, audioUrl } of calls) {
      try {
        const call = await Call.findOne({ callId, tenantId });
        if (!call) {
          errors.push({ callId, error: 'Call not found' });
          continue;
        }

        const sourceUrl = audioUrl || call.recordingUrl;
        if (!sourceUrl) {
          errors.push({ callId, error: 'No audio URL' });
          continue;
        }

        const transcript = await transcribeAudio(sourceUrl);
        if (transcript) {
          call.transcript = transcript;
          await call.save();

          const sentimentResult = await analyzeSentiment(transcript);
          call.sentiment = sentimentResult.sentiment;
          call.intent = sentimentResult.intent;

          const summary = await generateSummary(transcript, call.direction);
          call.summary = summary;
          await call.save();

          await updateCustomerTwin(tenantId, call.customerId, {
            lastCallSentiment: sentimentResult.sentiment,
            lastCallSummary: summary
          });

          results.push({ callId, success: true });
        }
      } catch (err) {
        errors.push({ callId, error: (err as Error).message });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get transcription history for a customer
router.get('/customer/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      customerId: req.params.customerId,
      transcript: { $exists: true, $ne: '' }
    };
    if (tenantId) filter.tenantId = tenantId;

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .select('callId transcript sentiment intent summary createdAt')
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

export default router;
