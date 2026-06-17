import twilio from 'twilio';
import { VoiceCall, CallStatus, CallDisposition } from '../models/VoiceCall';
import { Worker, WorkerStatus } from '../models/Worker';

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  return twilio(accountSid, authToken);
};

// Interface for initiating outbound call
interface InitiateCallOptions {
  to: string;
  script?: string;
  metadata?: Record<string, unknown>;
}

// Interface for call result
interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

// Interface for recording result
interface RecordingResult {
  success: boolean;
  url?: string;
  sid?: string;
  error?: string;
}

// Initiate outbound call
export const initiateOutboundCall = async (options: InitiateCallOptions): Promise<CallResult> => {
  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_PHONE_NUMBER;
    const webhookUrl = process.env.VOICE_WEBHOOK_URL || `${process.env.BASE_URL}/api/voice/webhook`;

    if (!from) {
      throw new Error('Twilio phone number not configured');
    }

    // Create TwiML response for the call
    const twiml = new twilio.twiml.VoiceResponse();

    if (options.script) {
      twiml.say({ voice: 'alice' }, options.script);
    } else {
      twiml.say(
        { voice: 'alice' },
        'Hello, this is an automated call from the BPO service. Please hold while we connect you with an agent.'
      );
    }

    // If there's a recording webhook, enable recording
    twiml.record({
      recordingStatusCallback: webhookUrl,
      recordingStatusCallbackEvent: ['completed', 'failed'],
    });

    // Dial with the TwiML
    const call = await client.calls.create({
      to: options.to,
      from: from,
      twiml: twiml.toString(),
      statusCallback: webhookUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    return {
      success: true,
      callSid: call.sid,
    };
  } catch (error) {
    console.error('Twilio call initiation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Get call recording
export const getCallRecording = async (recordingSid: string): Promise<RecordingResult> => {
  try {
    const client = getTwilioClient();

    const recording = await client.recordings(recordingSid).fetch();

    return {
      success: true,
      url: recording.uri.replace('.json', '.mp3'), // Convert to accessible URL
      sid: recording.sid,
    };
  } catch (error) {
    console.error('Error fetching recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Get call transcript
export const getCallTranscript = async (callSid: string): Promise<string | null> => {
  try {
    const client = getTwilioClient();

    const recordings = await client.recordings.list({
      callSid: callSid,
    });

    if (recordings.length === 0) {
      return null;
    }

    const recording = recordings[0];

    // Get transcription if available
    // Note: Twilio does not automatically transcribe recordings
    // You would need to use Twilio's Transcription service separately
    // This is a placeholder for when transcription is implemented
    return `Recording available at: ${recording.uri}`;

    // Alternatively, if using a transcription service:
    // const transcript = await client.transcriptions.create({
    //   recordingSid: recording.sid,
    // });
    // return transcript.transcriptionText;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
};

// Voice webhook handler (exports for Express)
export const voiceWebhookHandler = async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      CallStatus: status,
      RecordingUrl,
      RecordingSid,
      CallDuration,
      Digits,
    } = req.body;

    console.log('Voice webhook received:', { CallSid, status, RecordingUrl });

    // Find the voice call record
    const voiceCall = await VoiceCall.findOne({ twilioCallSid: CallSid });

    if (!voiceCall) {
      console.log('Voice call not found for sid:', CallSid);
      return res.status(200).send('OK'); // Acknowledge Twilio
    }

    // Update call status based on Twilio status
    const statusMap: Record<string, CallStatus> = {
      initiatied: CallStatus.INITIATED,
      ringing: CallStatus.RINGING,
      in-progress: CallStatus.IN_PROGRESS,
      completed: CallStatus.COMPLETED,
      failed: CallStatus.FAILED,
      busy: CallStatus.BUSY,
      canceled: CallStatus.CANCELLED,
      'no-answer': CallStatus.NO_ANSWER,
    };

    const newStatus = statusMap[status.toLowerCase()] || CallStatus.INITIATED;

    // Update voice call
    voiceCall.status = newStatus;

    if (status === 'completed') {
      voiceCall.endedAt = new Date();
      voiceCall.duration = parseInt(CallDuration) || 0;
      voiceCall.disposition = CallDisposition.ANSWERED;

      // Free up the worker
      await Worker.findByIdAndUpdate(voiceCall.workerId, {
        status: WorkerStatus.AVAILABLE,
      });
    }

    if (RecordingUrl) {
      voiceCall.recordingUrl = RecordingUrl;
      voiceCall.twilioRecordingSid = RecordingSid;
    }

    await voiceCall.save();

    // Return empty TwiML response
    res.type('text/xml').send('<Response></Response>');
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(200).send('OK'); // Always acknowledge to prevent retries
  }
};

// Update call from webhook
export const updateCallFromWebhook = async (
  callSid: string,
  updates: {
    status?: CallStatus;
    duration?: number;
    disposition?: CallDisposition;
    recordingUrl?: string;
    recordingSid?: string;
  }
) => {
  try {
    const voiceCall = await VoiceCall.findOneAndUpdate(
      { twilioCallSid: callSid },
      { $set: updates },
      { new: true }
    );

    return voiceCall;
  } catch (error) {
    console.error('Error updating call from webhook:', error);
    return null;
  }
};

// Get call status
export const getCallStatus = async (callSid: string) => {
  try {
    const client = getTwilioClient();
    const call = await client.calls(callSid).fetch();

    return {
      success: true,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
    };
  } catch (error) {
    console.error('Error fetching call status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Make conference call
export const createConferenceCall = async (
  participantPhone: string,
  workerPhone: string,
  conferenceName: string
) => {
  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_PHONE_NUMBER;
    const webhookUrl = process.env.VOICE_WEBHOOK_URL;

    if (!from) {
      throw new Error('Twilio phone number not configured');
    }

    // Create conference with both participants
    const conference = await client.conferences.create({
      record: 'record-from-start',
      recordingStatusCallback: webhookUrl,
      beep: 'true',
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
    });

    // Add first participant (worker)
    await client.conferences(conference.sid).participants.create({
      to: workerPhone,
      from: from,
      earlyMedia: true,
    });

    // Add second participant (customer)
    await client.conferences(conference.sid).participants.create({
      to: participantPhone,
      from: from,
      earlyMedia: true,
    });

    return {
      success: true,
      conferenceSid: conference.sid,
      conferenceName: conference.friendlyName,
    };
  } catch (error) {
    console.error('Conference call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Hang up a call
export const hangupCall = async (callSid: string) => {
  try {
    const client = getTwilioClient();
    await client.calls(callSid).update({ status: 'completed' });

    return { success: true };
  } catch (error) {
    console.error('Hangup call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
