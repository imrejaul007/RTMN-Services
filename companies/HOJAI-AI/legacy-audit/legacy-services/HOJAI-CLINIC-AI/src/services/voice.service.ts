import OpenAI from 'openai';
import { VoiceCall } from '../models';
import { IVoiceCall, IApiResponse } from '../types';
import { config } from '../config';
import { aiReceptionistService } from './ai-receptionist.service';
import { Types } from 'mongoose';

// Twilio client initialization
let twilioClient: any = null;
if (config.twilio.accountSid && config.twilio.authToken) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  } catch (e) {
    console.warn('Twilio SDK not available:', e);
  }
}

export class VoiceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(
    clinicId: string,
    to: string,
    patientId?: string,
    appointmentId?: string,
    agent: 'receptionist' | 'nurse' | 'care_manager' = 'receptionist'
  ): Promise<IApiResponse<IVoiceCall>> {
    if (!twilioClient) {
      throw new Error('Twilio is not configured');
    }

    // Create voice call record
    const call = new VoiceCall({
      clinicId: new Types.ObjectId(clinicId),
      direction: 'outbound',
      from: config.twilio.phoneNumber,
      to,
      patientId: patientId ? new Types.ObjectId(patientId) : undefined,
      appointmentId: appointmentId ? new Types.ObjectId(appointmentId) : undefined,
      agent,
      status: 'initiated',
    });

    await call.save();

    try {
      // Make the call using Twilio
      const twiml = `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${process.env.HOSTNAME || 'localhost'}/voice/${call._id}">
      <Parameter name="clinicId" value="${clinicId}" />
      <Parameter name="agent" value="${agent}" />
    </Stream>
  </Connect>
</Response>
`;

      const twilioCall = await twilioClient.calls.create({
        twiml,
        to,
        from: config.twilio.phoneNumber,
        statusCallback: `${process.env.API_URL}/api/v1/ai/voice/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      call.callSid = twilioCall.sid;
      call.status = 'ringing';
      await call.save();

      return {
        success: true,
        data: call.toJSON() as IVoiceCall,
        message: 'Call initiated',
      };
    } catch (error: any) {
      call.status = 'failed';
      call.metadata = { error: error.message };
      await call.save();

      return {
        success: false,
        error: `Failed to initiate call: ${error.message}`,
      };
    }
  }

  /**
   * Handle inbound call webhook
   */
  async handleInboundCall(
    clinicId: string,
    from: string,
    callSid: string
  ): Promise<string> {
    // Create or find patient
    let patientId: Types.ObjectId | undefined;

    // Generate TwiML for the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">
    Namaste! Welcome to our clinic. Please wait while I connect you.
  </Say>
  <Connect>
    <Stream url="wss://${process.env.HOSTNAME || 'localhost'}/voice/inbound/${clinicId}">
      <Parameter name="from" value="${from}" />
      <Parameter name="callSid" value="${callSid}" />
    </Stream>
  </Connect>
</Response>
`;

    return twiml;
  }

  /**
   * Handle voice stream data (process audio chunks)
   */
  async processStreamData(
    callId: string,
    audioData: Buffer
  ): Promise<{ response: string; shouldSpeak: boolean }> {
    const call = await VoiceCall.findById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    // For now, use the receptionist AI to process
    const response = await this.generateVoiceResponse(
      call.clinicId.toString(),
      'New call received',
      call.agent
    );

    return {
      response,
      shouldSpeak: true,
    };
  }

  /**
   * Generate text-to-speech response
   */
  async generateVoiceResponse(
    clinicId: string,
    userMessage: string,
    agent: 'receptionist' | 'nurse' | 'care_manager' = 'receptionist'
  ): Promise<string> {
    // Get agent-specific response
    if (agent === 'receptionist') {
      const result = await aiReceptionistService.handleQuery(clinicId, userMessage);
      return result.response;
    }

    // For other agents, use generic response generation
    const prompt = `You are an AI assistant for a medical clinic. Respond to the following message in a natural, conversational way suitable for a phone call. Keep responses concise (1-2 sentences).

Message: ${userMessage}

Respond in plain text only:`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'I am sorry, could you please repeat that?';
  }

  /**
   * Update call status
   */
  async updateCallStatus(
    callSid: string,
    status: string,
    duration?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { status };

    if (duration) {
      update.duration = duration;
    }

    if (['completed', 'failed', 'missed', 'busy', 'no_answer'].includes(status)) {
      update.endedAt = new Date();
    }

    await VoiceCall.findOneAndUpdate({ callSid }, update);
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<IApiResponse<IVoiceCall>> {
    const call = await VoiceCall.findById(callId)
      .populate('patientId', 'firstName lastName phone')
      .populate('appointmentId', 'date startTime');

    if (!call) {
      return {
        success: false,
        error: 'Call not found',
      };
    }

    return {
      success: true,
      data: call.toJSON() as IVoiceCall,
    };
  }

  /**
   * Get call history
   */
  async getCallHistory(
    clinicId: string,
    options: {
      patientId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<IApiResponse<IVoiceCall[]>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      clinicId: new Types.ObjectId(clinicId),
    };

    if (options.patientId) {
      query.patientId = new Types.ObjectId(options.patientId);
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        (query.createdAt as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.createdAt as Record<string, Date>).$lte = options.endDate;
      }
    }

    const [calls, total] = await Promise.all([
      VoiceCall.find(query)
        .populate('patientId', 'firstName lastName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VoiceCall.countDocuments(query),
    ]);

    return {
      success: true,
      data: calls as IVoiceCall[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get call statistics
   */
  async getCallStats(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    answered: number;
    missed: number;
    averageDuration: number;
    byAgent: Record<string, number>;
  }> {
    const stats = await VoiceCall.getCallStats(new Types.ObjectId(clinicId), startDate, endDate);

    return {
      total: stats.total,
      answered: (stats.byStatus['completed']?.count || 0) + (stats.byStatus['in_progress']?.count || 0),
      missed: (stats.byStatus['missed']?.count || 0) + (stats.byStatus['no_answer']?.count || 0),
      averageDuration: stats.averageDuration,
      byAgent: {},
    };
  }

  /**
   * Save call recording
   */
  async saveRecording(
    callId: string,
    recordingUrl: string
  ): Promise<void> {
    await VoiceCall.findByIdAndUpdate(callId, {
      recordingUrl,
    });
  }

  /**
   * Transcribe recording
   */
  async transcribeRecording(recordingUrl: string): Promise<string> {
    // Placeholder for actual transcription
    // In production, use a service like AssemblyAI, Deepgram, or OpenAI's Whisper
    return 'Transcription not implemented yet.';
  }

  /**
   * Send voice reminder to patient
   */
  async sendReminder(
    clinicId: string,
    patientId: string,
    appointmentId: string,
    message: string
  ): Promise<IApiResponse<IVoiceCall>> {
    // Get patient phone number
    const { Patient } = await import('../models');
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return {
        success: false,
        error: 'Patient not found',
      };
    }

    return this.initiateCall(clinicId, patient.phone, patientId, appointmentId, 'care_manager');
  }
}

export const voiceService = new VoiceService();
export default voiceService;
