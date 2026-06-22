import axios from 'axios';
import { AgentConversation, Clinic, Patient } from '../models';
import { IWhatsAppMessage, IWhatsAppWebhookPayload, AgentType } from '../types';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { aiReceptionistService } from './ai-receptionist.service';
import { Types } from 'mongoose';

// WhatsApp API Base URL
const WHATSAPP_API_URL = `https://graph.facebook.com/${config.whatsapp.apiVersion}`;

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.accessToken = config.whatsapp.accessToken;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Send a text message
   */
  async sendMessage(to: string, message: string): Promise<{ messageId: string }> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp is not configured');
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { messageId: response.data.messages[0].id };
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[]
  ): Promise<{ messageId: string }> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp is not configured');
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (components) {
      payload.template.components = components;
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { messageId: response.data.messages[0].id };
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    patientPhone: string,
    patientName: string,
    appointmentDate: Date,
    appointmentTime: string,
    doctorName: string,
    clinicName: string
  ): Promise<void> {
    const dateStr = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const message = `Namaste ${patientName}!

This is a reminder for your appointment at ${clinicName}.

📅 Date: ${dateStr}
⏰ Time: ${appointmentTime}
👨‍⚕️ Doctor: Dr. ${doctorName}

Please arrive 10 minutes early. Reply CONFIRM to confirm or RESCHEDULE to reschedule.

- ${clinicName}`;

    await this.sendMessage(patientPhone, message);
  }

  /**
   * Send prescription ready notification
   */
  async sendPrescriptionReady(
    patientPhone: string,
    patientName: string,
    clinicName: string
  ): Promise<void> {
    const message = `Namaste ${patientName}!

Your prescription is ready at ${clinicName}. You can collect it from the clinic or request it to be sent digitally.

Reply VIEW to see your prescription details.

- ${clinicName}`;

    await this.sendMessage(patientPhone, message);
  }

  /**
   * Send follow-up reminder
   */
  async sendFollowUpReminder(
    patientPhone: string,
    patientName: string,
    followUpDate: Date,
    clinicName: string
  ): Promise<void> {
    const dateStr = followUpDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const message = `Namaste ${patientName}!

This is a reminder that your follow-up visit at ${clinicName} is due on ${dateStr}.

Regular follow-ups are important for your health. Please book an appointment if you haven't already.

Reply BOOK to schedule an appointment.

- ${clinicName}`;

    await this.sendMessage(patientPhone, message);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: IWhatsAppWebhookPayload): Promise<{
    messages: Array<{
      from: string;
      body: string;
      messageId: string;
      timestamp: string;
    }>;
  }> {
    const incomingMessages: Array<{
      from: string;
      body: string;
      messageId: string;
      timestamp: string;
    }> = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            incomingMessages.push({
              from: message.from,
              body: message.body,
              messageId: message.id,
              timestamp: message.timestamp,
            });
          }
        }
      }
    }

    return { messages: incomingMessages };
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(
    clinicId: string,
    message: IWhatsAppMessage
  ): Promise<string> {
    const phone = message.from;
    const text = message.body.trim();

    // Try to find patient by phone
    let patient = await Patient.findOne({
      phone,
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    });

    // Get or create conversation session
    const sessionId = `whatsapp_${phone}_${Date.now().toString(36)}`;

    const conversation = await AgentConversation.getOrCreateSession(
      new Types.ObjectId(clinicId),
      'receptionist',
      sessionId
    );

    if (patient) {
      conversation.patientId = patient._id as Types.ObjectId;
      await conversation.save();
    }

    // Process message with AI receptionist
    const result = await aiReceptionistService.handleQuery(
      clinicId,
      text,
      sessionId,
      {
        patientId: patient?._id.toString(),
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
      }
    );

    // Check for specific actions
    const action = await this.handleActions(clinicId, text, patient, result);

    return action || result.response;
  }

  /**
   * Handle specific actions from messages
   */
  private async handleActions(
    clinicId: string,
    text: string,
    patient: any,
    aiResult: { response: string; intent?: string; entities?: Record<string, unknown> }
  ): Promise<string | null> {
    const upperText = text.toUpperCase();

    // Handle quick replies
    if (upperText === 'CONFIRM') {
      return 'Thank you for confirming your appointment. We look forward to seeing you!';
    }

    if (upperText === 'RESCHEDULE') {
      return 'To reschedule your appointment, please tell me your preferred date and time.';
    }

    if (upperText === 'BOOK') {
      return 'I would be happy to help you book an appointment. Please tell me:\n1. Your name\n2. Preferred date\n3. Preferred time\n4. Reason for visit';
    }

    if (upperText === 'VIEW') {
      if (patient) {
        return 'To view your prescription, please visit our patient portal or ask our staff at the clinic.';
      }
      return 'I could not find your records. Please visit the clinic with your phone number.';
    }

    if (upperText === 'HELP') {
      return `I can help you with:
1. Booking appointments - Type BOOK
2. Checking timings - Ask about our working hours
3. Doctor information - Ask about our doctors
4. Your prescriptions - Type VIEW

How can I help you today?`;
    }

    // Handle appointment booking intent from AI
    if (aiResult.intent === 'book_appointment' && aiResult.entities) {
      const { date, time, doctor } = aiResult.entities;
      if (date && time) {
        return `I am ready to book your appointment:
📅 Date: ${date}
⏰ Time: ${time}
${doctor ? `👨‍⚕️ Doctor: ${doctor}` : ''}

Shall I proceed with the booking? Reply YES to confirm or provide different details.`;
      }
    }

    return null;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    await axios.post(
      `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: messageId,
        status: 'read',
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp is not configured');
    }

    const response = await axios.get(
      `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data.messages[0].status;
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === config.whatsapp.webhookSecret) {
      return challenge;
    }
    return null;
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
