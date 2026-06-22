// ============================================================================
// HOJAI VOICE PLATFORM - Twilio Telecom Adapter
// ============================================================================

import twilio, { Twilio } from 'twilio';
import { telecomConfig } from '../config';
import {
  TelecomProvider,
  OutboundCallRequest,
  InboundCallEvent,
  WebhookPayload,
  CallStatus,
} from '../types';

export class TwilioAdapter {
  private client: Twilio | null = null;
  private accountSid: string;
  private phoneNumber: string;
  private webhookUrl: string;

  constructor() {
    this.accountSid = telecomConfig.twilio.accountSid;
    const authToken = telecomConfig.twilio.authToken;
    this.phoneNumber = telecomConfig.twilio.phoneNumber;
    this.webhookUrl = telecomConfig.twilio.webhookUrl;
  }

  private getClient(): Twilio {
    if (!this.client) {
      if (!this.accountSid || !this.accountSid.startsWith('AC')) {
        throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID environment variable.');
      }
      this.client = twilio(this.accountSid, telecomConfig.twilio.authToken);
    }
    return this.client;
  }

  /**
   * Make an outbound call
   */
  async makeCall(request: OutboundCallRequest): Promise<{ callSid: string; status: string }> {
    try {
      const call = await this.getClient().calls.create({
        to: request.to,
        from: request.from || this.phoneNumber,
        url: `${this.webhookUrl}/twilio/voice`,
        statusCallback: `${this.webhookUrl}/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      return {
        callSid: call.sid,
        status: call.status,
      };
    } catch (error) {
      console.error('Twilio makeCall error:', error);
      throw new Error(`Failed to make call: ${(error as Error).message}`);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<{
    callSid: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  }> {
    try {
      const call = await this.getClient().calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: this.mapCallStatus(call.status),
        duration: call.duration ? parseInt(call.duration, 10) : undefined,
        recordingUrl: call.subresourceUris?.recordings
          ? undefined // Recordings need separate fetch
          : undefined,
      };
    } catch (error) {
      console.error('Twilio getCallStatus error:', error);
      throw new Error(`Failed to get call status: ${(error as Error).message}`);
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<boolean> {
    try {
      await this.getClient().calls(callSid).update({ status: 'completed' });
      return true;
    } catch (error) {
      console.error('Twilio endCall error:', error);
      return false;
    }
  }

  /**
   * Transfer a call to another number
   */
  async transferCall(callSid: string, toNumber: string): Promise<boolean> {
    try {
      // Twilio doesn't support direct transfer via REST API
      // Instead, we need to use a conference or redirect
      await this.getClient().calls(callSid).update({
        url: `${this.webhookUrl}/twilio/transfer?to=${encodeURIComponent(toNumber)}`,
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Twilio transferCall error:', error);
      return false;
    }
  }

  /**
   * Generate TwiML for voice response
   */
  generateTwiML(options: {
    voice?: 'alice' | 'man' | 'woman' | 'Polly.Salli' | 'Polly.Aditi';
    language?: string;
    loops?: number;
  }): string {
    const {
      voice = 'alice',
      language = 'en-IN',
      loops = 1,
    } = options;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}" loop="${loops}"></Say>
</Response>`;
  }

  /**
   * Generate TwiML for playing audio
   */
  generateAudioTwiML(audioUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
</Response>`;
  }

  /**
   * Generate TwiML for gathering speech input
   */
  generateGatherTwiML(prompt: string, actionUrl: string, options?: {
    voice?: string;
    language?: string;
    timeout?: number;
    numSpeeches?: number;
  }): string {
    const {
      voice = 'alice',
      language = 'en-IN',
      timeout = 5,
      numSpeeches = 1,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${actionUrl}" method="POST" timeout="${timeout}" numSpeeches="${numSpeeches}">
    <Say voice="${voice}" language="${language}">${prompt}</Say>
  </Gather>
</Response>`;
  }

  /**
   * Generate TwiML for conference call (transfer)
   */
  generateConferenceTwiML(conferenceName: string, options?: {
    muted?: boolean;
    beep?: boolean;
    startConferenceOnEnter?: boolean;
    endConferenceOnExit?: boolean;
  }): string {
    const {
      muted = false,
      beep = true,
      startConferenceOnEnter = true,
      endConferenceOnExit = false,
    } = options || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      muted="${muted}"
      beep="${beep}"
      startConferenceOnEnter="${startConferenceOnEnter}"
      endConferenceOnExit="${endConferenceOnExit}"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;
  }

  /**
   * Parse incoming call webhook
   */
  parseWebhook(payload: WebhookPayload): InboundCallEvent {
    return {
      callId: payload.CallSid || '',
      from: payload.From || '',
      to: payload.To || '',
      direction: 'inbound',
      timestamp: new Date(),
      metadata: {
        ...payload,
        provider: 'twilio' as TelecomProvider,
      },
    };
  }

  /**
   * Parse call status webhook
   */
  parseStatusWebhook(payload: WebhookPayload): {
    callSid: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  } {
    return {
      callSid: payload.CallSid || '',
      status: this.mapCallStatus(payload.CallStatus || ''),
      duration: payload.CallDuration ? parseInt(payload.CallDuration, 10) : undefined,
      recordingUrl: payload.RecordingUrl,
    };
  }

  /**
   * Get available phone numbers
   */
  async getAvailableNumbers(filters?: {
    areaCode?: string;
    country?: string;
    capabilities?: ('sms' | 'voice' | 'mms')[];
  }): Promise<Array<{ number: string; friendlyName: string }>> {
    try {
      const numbers = await this.getClient().availablePhoneNumbers(
        filters?.country || 'IN'
      ).local.list({
        areaCode: filters?.areaCode,
        capabilities: filters?.capabilities,
        limit: 10,
      });

      return numbers.map(num => ({
        number: num.phoneNumber,
        friendlyName: num.friendlyName,
      }));
    } catch (error) {
      console.error('Twilio getAvailableNumbers error:', error);
      return [];
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(phoneNumber: string): Promise<boolean> {
    try {
      await this.getClient().incomingPhoneNumbers.create({
        phoneNumber,
      });
      return true;
    } catch (error) {
      console.error('Twilio purchaseNumber error:', error);
      return false;
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: TelecomProvider; name: string; supported: boolean } {
    return {
      provider: 'twilio',
      name: 'Twilio',
      supported: !!(this.accountSid && telecomConfig.twilio.authToken),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getClient().api.accounts(this.accountSid).fetch();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Map Twilio status to our CallStatus
   */
  private mapCallStatus(twilioStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'initiated': 'initiated',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'failed',
    };

    return statusMap[twilioStatus.toLowerCase()] || 'failed';
  }
}

// Singleton instance
let twilioAdapterInstance: TwilioAdapter | null = null;

export function getTwilioAdapter(): TwilioAdapter {
  if (!twilioAdapterInstance) {
    twilioAdapterInstance = new TwilioAdapter();
  }
  return twilioAdapterInstance;
}

export default TwilioAdapter;
