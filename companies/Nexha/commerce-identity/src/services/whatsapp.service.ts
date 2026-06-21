/**
 * WhatsApp Service
 *
 * Sends OTP and RFQ notification messages via WhatsApp Business API.
 * In development / when no API credentials are configured, messages are
 * logged to the console and the SUTAR event bus.
 *
 * Supported providers:
 *   - WhatsApp Business Cloud API (Meta)   → set WHATSAPP_PROVIDER=meta
 *   - Twilio WhatsApp                     → set WHATSAPP_PROVIDER=twilio
 *   - Development (console + event bus)    → default when WHATSAPP_PROVIDER not set
 */

import { logger } from '../config/logger';

export type WhatsAppTemplate = 'otp_verification' | 'rfq_received' | 'deal_update' | 'welcome_guest';

interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface OtpPayload {
  phone: string;
  otp: string;
  guestId: string;
}

interface TemplatePayload {
  phone: string;
  templateName: WhatsAppTemplate;
  variables: Record<string, string>;
}

/**
 * Build the URL + headers for the configured provider.
 */
function providerConfig() {
  const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase();

  if (provider === 'meta') {
    return {
      baseUrl: 'https://graph.facebook.com/v19.0',
      token: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    };
  }
  if (provider === 'twilio') {
    return {
      baseUrl: 'https://api.twilio.com/2010-04-01',
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
    };
  }

  // development / mock
  return { baseUrl: '', token: '', phoneNumberId: '', provider: 'dev' };
}

/**
 * Normalise a phone number to E.164 format.
 */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Send an OTP message to a WhatsApp number.
 */
export async function sendOtp(payload: OtpPayload): Promise<MessageResult> {
  const config = providerConfig();
  const phone = toE164(payload.phone);

  if (config.provider === 'dev') {
    logger.info(`[DEV] WhatsApp OTP → ${phone}: Your verification code is ${payload.otp}. Valid for 10 minutes.`, {
      guestId: payload.guestId,
    });
    // Also emit an event so the portal can display the OTP for demo purposes.
    try {
      const eventBusUrl = process.env.SUTAR_EVENT_BUS_URL || process.env.SUTAR_BASE_URL;
      if (eventBusUrl) {
        await fetch(`${eventBusUrl}/events/publish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            topic: 'nexha.whatsapp.otp.dev',
            payload: { phone, otp: payload.otp, guestId: payload.guestId, sentAt: new Date().toISOString() },
          }),
        });
      }
    } catch {
      // best-effort
    }
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  if (config.provider === 'meta') {
    return sendMetaMessage(phone, 'otp_verification', {
      '1': payload.otp,
      '2': '10 minutes',
    });
  }

  if (config.provider === 'twilio') {
    return sendTwilioMessage(phone, `Your NeXha verification code is: ${payload.otp}. Valid for 10 minutes.`);
  }

  return { success: false, error: 'No WhatsApp provider configured' };
}

/**
 * Send a templated WhatsApp notification.
 */
export async function sendTemplateMessage(payload: TemplatePayload): Promise<MessageResult> {
  const config = providerConfig();
  const phone = toE164(payload.phone);

  if (config.provider === 'dev') {
    logger.info(`[DEV] WhatsApp template → ${phone} [${payload.templateName}]: ${JSON.stringify(payload.variables)}`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  if (config.provider === 'meta') {
    return sendMetaMessage(phone, payload.templateName, payload.variables);
  }

  if (config.provider === 'twilio') {
    const body = Object.entries(payload.variables)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return sendTwilioMessage(phone, `[NeXha] ${payload.templateName}: ${body}`);
  }

  return { success: false, error: 'No WhatsApp provider configured' };
}

// --- Meta WhatsApp Business API ---

async function sendMetaMessage(to: string, templateName: string, variables: Record<string, string>): Promise<MessageResult> {
  const config = providerConfig();
  if (!config.token || !config.phoneNumberId) {
    return { success: false, error: 'Meta WhatsApp credentials not configured' };
  }

  const components = Object.entries(variables).map(([index, value]) => ({
    type: 'body' as const,
    parameters: [{ type: 'text' as const, text: value }],
  }));

  try {
    const res = await fetch(`${config.baseUrl}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components,
        },
      }),
    });

    const data = await res.json() as { messages?: Array<{ id: string }> };
    if (!res.ok) {
      return { success: false, error: `Meta API error: ${res.status} - ${JSON.stringify(data)}` };
    }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: `Network error: ${(err as Error).message}` };
  }
}

// --- Twilio WhatsApp ---

async function sendTwilioMessage(to: string, body: string): Promise<MessageResult> {
  const config = providerConfig();
  if (!config.accountSid || !config.authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    // Twilio requires from/to to be prepended with whatsapp: if not already.
    const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const fromWa = process.env.TWILIO_WHATSAPP_FROM
      ? (process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:') ? process.env.TWILIO_WHATSAPP_FROM : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`)
      : '';

    const params = new URLSearchParams({
      From: fromWa,
      To: toWa,
      Body: body,
    });

    const res = await fetch(`${config.baseUrl}/Accounts/${config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json() as { sid?: string; error?: string };
    if (!res.ok || data.error) {
      return { success: false, error: `Twilio error: ${data.error || res.status}` };
    }
    return { success: true, messageId: data.sid };
  } catch (err) {
    return { success: false, error: `Network error: ${(err as Error).message}` };
  }
}
