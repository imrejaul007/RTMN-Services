import Twilio from 'twilio';

interface SMSOptions {
  to: string;
  body: string;
  from?: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSChannel {
  private client: Twilio.Twilio | null = null;
  private isConfigured: boolean = false;
  private fromNumber: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;

      if (accountSid && authToken && accountSid !== 'your-twilio-account-sid') {
        this.client = Twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('SMS channel initialized with Twilio');
      } else {
        console.log('SMS channel: Twilio not configured, using mock mode');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
      this.isConfigured = false;
    }
  }

  async send(options: SMSOptions): Promise<SMSResult> {
    const { to, body } = options;

    // Validate phone number
    if (!to || !this.isValidPhoneNumber(to)) {
      return { success: false, error: 'Invalid phone number' };
    }

    // If not configured, return mock success
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK SMS] To: ${to}, Body: ${body.substring(0, 50)}...`);
      return {
        success: true,
        messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }

    try {
      const message = await this.client.messages.create({
        body,
        to,
        from: this.fromNumber || undefined
      });

      console.log(`SMS sent successfully: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`SMS send failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async sendBulk(recipients: string[], body: string): Promise<{ successful: string[]; failed: { phone: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { phone: string; error: string }[] = [];

    for (const phone of recipients) {
      const result = await this.send({ to: phone, body });
      if (result.success) {
        successful.push(phone);
      } else {
        failed.push({ phone, error: result.error || 'Unknown error' });
      }
    }

    return { successful, failed };
  }

  async verifyPhoneNumber(phoneNumber: string): Promise<{ valid: boolean; format: string }> {
    if (!this.client) {
      return { valid: this.isValidPhoneNumber(phoneNumber), format: 'mock' };
    }

    try {
      const validation = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return {
        valid: true,
        format: validation.nationalFormat || validation.phoneNumber || 'unknown'
      };
    } catch {
      return { valid: false, format: 'invalid' };
    }
  }

  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    if (!this.client || messageId.startsWith('mock-')) {
      return { status: 'delivered' };
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return { status: message.status };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

export const smsChannel = new SMSChannel();
