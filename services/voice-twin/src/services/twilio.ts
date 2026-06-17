import twilio, { Twilio } from 'twilio';
import { Request, Response, Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Call, CallStatus, CallDirection } from '../models/Call';
import { Recording, RecordingStatus } from '../models/Recording';
import { updateCustomerTwin } from './customerTwinSync';

let twilioClient: Twilio | null = null;

// Initialize Twilio client
export function initializeTwilio(): Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

// Get Twilio client
export function getTwilioClient(): Twilio | null {
  if (!twilioClient) {
    return initializeTwilio();
  }
  return twilioClient;
}

// Initialize Twilio webhook routes
export function initializeTwilioWebhook(app: Express): void {
  // Twilio webhook for incoming calls
  app.post('/webhooks/twilio/call', async (req: Request, res: Response) => {
    try {
      const {
        CallSid,
        From,
        To,
        CallStatus,
        Direction,
        CallerName,
        FromCity,
        FromState,
        FromCountry,
        ToCity,
        ToState,
        ToCountry
      } = req.body;

      console.log('Incoming Twilio call:', CallSid);

      // Generate call ID
      const callId = `VC-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Map Twilio status to our status
      let status = CallStatus.RINGING;
      switch (CallStatus) {
        case 'completed':
          status = CallStatus.COMPLETED;
          break;
        case 'answered':
          status = CallStatus.ANSWERED;
          break;
        case 'busy':
        case 'failed':
        case 'canceled':
          status = CallStatus.FAILED;
          break;
      }

      // Extract tenant ID from caller or use default
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Create call record
      const call = new Call({
        callId,
        tenantId,
        customerId: From, // Customer phone as customer ID for inbound
        direction: Direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
        from: From,
        to: To,
        twilioSid: CallSid,
        status,
        startedAt: new Date(),
        metadata: {
          callerName: CallerName,
          fromCity: FromCity,
          fromState: FromState,
          fromCountry: FromCountry,
          toCity: ToCity,
          toState: ToState,
          toCountry: ToCountry
        }
      });

      await call.save();

      // Update Customer Twin
      await updateCustomerTwin(tenantId, From, {
        lastCallId: callId,
        lastCallAt: call.startedAt,
        incomingCall: true
      });

      // Return TwiML response
      res.set('Content-Type', 'text/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you for calling. Please wait while we connect your call.</Say>
          <Dial record="true" recordingStatusCallback="/webhooks/twilio/recording">
            <Number>${process.env.TWILIO_PHONE_NUMBER || '+1234567890'}</Number>
          </Dial>
        </Response>
      `);
    } catch (error) {
      console.error('Error handling Twilio webhook:', error);
      res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
    }
  });

  // Twilio webhook for call status updates
  app.post('/webhooks/twilio/status', async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, Duration } = req.body;

      console.log('Twilio status update:', CallSid, CallStatus);

      // Find call by Twilio SID
      const call = await Call.findOne({ twilioSid: CallSid });

      if (call) {
        switch (CallStatus) {
          case 'completed':
            call.status = CallStatus.COMPLETED;
            call.duration = parseInt(Duration) || 0;
            call.endedAt = new Date();
            break;
          case 'answered':
            call.status = CallStatus.ANSWERED;
            call.answeredAt = new Date();
            break;
          case 'busy':
          case 'failed':
          case 'no-answer':
            call.status = CallStatus.MISSED;
            call.endedAt = new Date();
            break;
        }
        await call.save();
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling Twilio status webhook:', error);
      res.status(500).send('Error');
    }
  });

  // Twilio webhook for recordings
  app.post('/webhooks/twilio/recording', async (req: Request, res: Response) => {
    try {
      const {
        CallSid,
        RecordingSid,
        RecordingUrl,
        RecordingDuration
      } = req.body;

      console.log('Twilio recording webhook:', RecordingSid);

      // Find call
      const call = await Call.findOne({ twilioSid: CallSid });

      if (call) {
        // Update call with recording URL
        call.recordingUrl = RecordingUrl;
        await call.save();

        // Create recording record
        const recording = new Recording({
          recordingId: `REC-${uuidv4().substring(0, 8).toUpperCase()}`,
          callId: call.callId,
          tenantId: call.tenantId,
          twilioRecordingSid: RecordingSid,
          twilioRecordingUrl: RecordingUrl,
          duration: parseInt(RecordingDuration) || 0,
          status: RecordingStatus.PENDING,
          mimeType: 'audio/wav'
        });
        await recording.save();

        console.log(`Recording created for call ${call.callId}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling recording webhook:', error);
      res.status(500).send('Error');
    }
  });

  // Make outbound call
  export async function makeOutboundCall(
    tenantId: string,
    customerId: string,
    from: string,
    to: string,
    url?: string
  ): Promise<{ success: boolean; callId?: string; twilioSid?: string; error?: string }> {
    const client = getTwilioClient();

    if (!client) {
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      // Generate call ID
      const callId = `VC-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Use default webhook URL if not provided
      const webhookUrl = url || `${process.env.PUBLIC_URL || 'http://localhost:4876'}/webhooks/twilio/status`;

      // Make the call
      const twilioCall = await client.calls.create({
        to,
        from,
        url: webhookUrl,
        statusCallback: `${process.env.PUBLIC_URL || 'http://localhost:4876'}/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      // Create call record
      const call = new Call({
        callId,
        tenantId,
        customerId,
        direction: CallDirection.OUTBOUND,
        from,
        to,
        twilioSid: twilioCall.sid,
        status: CallStatus.RINGING,
        startedAt: new Date()
      });
      await call.save();

      // Update Customer Twin
      await updateCustomerTwin(tenantId, customerId, {
        lastCallId: callId,
        lastCallAt: call.startedAt,
        outgoingCall: true
      });

      return {
        success: true,
        callId,
        twilioSid: twilioCall.sid
      };
    } catch (error) {
      console.error('Error making outbound call:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Get call recordings from Twilio
  export async function getCallRecordings(twilioSid: string): Promise<any[]> {
    const client = getTwilioClient();

    if (!client) {
      console.warn('Twilio not configured');
      return [];
    }

    try {
      const recordings = await client.calls(twilioSid).recordings.list();
      return recordings.map(r => ({
        sid: r.sid,
        url: r.uri,
        duration: r.duration,
        dateCreated: r.dateCreated
      }));
    } catch (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }
  }

  // Get call details from Twilio
  export async function getCallDetails(twilioSid: string): Promise<any | null> {
    const client = getTwilioClient();

    if (!client) {
      return null;
    }

    try {
      const call = await client.calls(twilioSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        duration: call.duration,
        dateCreated: call.dateCreated,
        dateUpdated: call.dateUpdated
      };
    } catch (error) {
      console.error('Error fetching call details:', error);
      return null;
    }
  }

  console.log('Twilio webhook routes initialized');
}

// Export default
export default {
  initializeTwilio,
  getTwilioClient,
  initializeTwilioWebhook,
  makeOutboundCall,
  getCallRecordings,
  getCallDetails
};
