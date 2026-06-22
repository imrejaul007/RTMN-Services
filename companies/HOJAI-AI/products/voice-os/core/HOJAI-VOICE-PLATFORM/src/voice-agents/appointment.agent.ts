// ============================================================================
// HOJAI VOICE PLATFORM - Appointment Voice Agent
// ============================================================================

import { BaseVoiceAgent, AgentConfig } from './base.agent';
import { IntentDefinition, SentimentScore, VoiceAgent } from '../types';

/**
 * Default intents for Appointment Agent
 */
export const DEFAULT_APPOINTMENT_INTENTS: Omit<IntentDefinition, 'id'>[] = [
  {
    name: 'schedule',
    description: 'User wants to schedule an appointment',
    examples: [
      'book an appointment', 'schedule a visit', 'make an appointment',
      'I want to meet', 'fix an appointment'
    ],
    action: 'handleSchedule',
    parameters: {
      service: { name: 'service', type: 'string', description: 'Service type' },
      date: { name: 'date', type: 'date', description: 'Preferred date' },
      time: { name: 'time', type: 'time', description: 'Preferred time' },
    },
  },
  {
    name: 'reschedule',
    description: 'User wants to change an existing appointment',
    examples: [
      'reschedule', 'change the appointment', 'move my booking',
      'change the date', 'change the time'
    ],
    action: 'handleReschedule',
    parameters: {
      appointmentId: { name: 'appointmentId', type: 'string', description: 'Appointment ID' },
      newDate: { name: 'newDate', type: 'date', description: 'New date' },
      newTime: { name: 'newTime', type: 'time', description: 'New time' },
    },
  },
  {
    name: 'cancel',
    description: 'User wants to cancel an appointment',
    examples: [
      'cancel my appointment', 'I cannot come', 'cancel the booking',
      'I need to cancel', 'remove my appointment'
    ],
    action: 'handleCancel',
    parameters: {
      appointmentId: { name: 'appointmentId', type: 'string', description: 'Appointment ID' },
      reason: { name: 'reason', type: 'string', description: 'Cancellation reason' },
    },
  },
  {
    name: 'check_availability',
    description: 'User wants to check available slots',
    examples: [
      'what slots are available', 'available times', 'when can I come',
      'open slots', 'available appointments'
    ],
    action: 'handleCheckAvailability',
    parameters: {
      date: { name: 'date', type: 'date', description: 'Date to check' },
      service: { name: 'service', type: 'string', description: 'Service type' },
    },
  },
  {
    name: 'confirm',
    description: 'User wants to confirm their appointment',
    examples: [
      'confirm my appointment', 'yes confirm', 'that works',
      'book it', 'confirm the booking'
    ],
    action: 'handleConfirm',
    parameters: {
      appointmentId: { name: 'appointmentId', type: 'string', description: 'Appointment ID' },
    },
  },
  {
    name: 'appointment_details',
    description: 'User wants to know about their appointment',
    examples: [
      'tell me my appointment', 'appointment details', 'when is my booking',
      'what time is my appointment', 'my schedule'
    ],
    action: 'handleAppointmentDetails',
    parameters: {
      appointmentId: { name: 'appointmentId', type: 'string', description: 'Appointment ID' },
    },
  },
  {
    name: 'reminder',
    description: 'User wants to set or modify appointment reminders',
    examples: [
      'remind me', 'set a reminder', 'notify me',
      'alert me before', 'send me a reminder'
    ],
    action: 'handleReminder',
    parameters: {
      appointmentId: { name: 'appointmentId', type: 'string', description: 'Appointment ID' },
      reminderTime: { name: 'reminderTime', type: 'string', description: 'When to remind' },
    },
  },
  {
    name: 'prepare_visit',
    description: 'User wants to know what to prepare for their visit',
    examples: [
      'what should I bring', 'documents needed', 'how to prepare',
      'what to carry', 'requirements for visit'
    ],
    action: 'handlePrepareVisit',
    parameters: {
      service: { name: 'service', type: 'string', description: 'Service type' },
    },
  },
  {
    name: 'greeting',
    description: 'User is greeting',
    examples: ['hello', 'hi', 'namaste', 'good morning'],
    action: 'handleGreeting',
    followUp: 'How can I help you with your appointment today?',
  },
  {
    name: 'goodbye',
    description: 'User is ending the conversation',
    examples: ['bye', 'goodbye', 'thanks', 'that is all'],
    action: 'handleGoodbye',
  },
];

export interface Appointment {
  id: string;
  service: string;
  date: Date;
  time: string;
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  reminderSet: boolean;
  reminderTime?: Date;
}

export class AppointmentAgent extends BaseVoiceAgent {
  private pendingAppointment: Partial<Appointment> = {};
  private appointments: Map<string, Appointment> = new Map();

  constructor(config: AgentConfig) {
    super(config);

    if (this.agent.intents.length === 0) {
      this.agent.intents = DEFAULT_APPOINTMENT_INTENTS.map((intent, idx) => ({
        ...intent,
        id: `apt_intent_${idx}`,
      }));
    }
  }

  protected async handleIntent(
    intent: IntentDefinition,
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string> {
    switch (intent.action) {
      case 'handleSchedule':
        return this.handleSchedule(parameters);
      case 'handleReschedule':
        return this.handleReschedule(parameters);
      case 'handleCancel':
        return this.handleCancel(parameters);
      case 'handleCheckAvailability':
        return this.handleCheckAvailability(parameters);
      case 'handleConfirm':
        return this.handleConfirm(parameters);
      case 'handleAppointmentDetails':
        return this.handleAppointmentDetails(parameters);
      case 'handleReminder':
        return this.handleReminder(parameters);
      case 'handlePrepareVisit':
        return this.handlePrepareVisit(parameters);
      case 'handleGreeting':
        return this.handleGreeting();
      case 'handleGoodbye':
        return this.handleGoodbye();
      default:
        return this.handleUnknown();
    }
  }

  protected getAgentCapabilities(): string {
    return 'scheduling appointments, rescheduling, cancelling, checking availability, and managing reminders';
  }

  private handleGreeting(): string {
    const greetings: Record<string, string> = {
      'en-IN': 'Namaste! Welcome to our appointment scheduling service. How can I help you today?',
      'hi-IN': 'नमस्ते! अपॉइंटमेंट शेड्यूलिंग सेवा में आपका स्वागत है। आज मैं आपकी कैसे मदद कर सकता हूं?',
      'ta-IN': 'வணக்கம்! எங்கள் சந்திப்பு நேரம்பதிவு சேவைக்கு வரவேற்கிறோம். இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    };

    return greetings[this.session?.language || 'en-IN'] || greetings['en-IN'];
  }

  private handleSchedule(parameters: Record<string, unknown>): string {
    const service = parameters.service;
    const date = parameters.date;
    const time = parameters.time;

    if (!service) {
      return `What type of appointment would you like to schedule? For example, a doctor's consultation, salon visit, or business meeting.`;
    }

    // Store pending appointment details
    this.pendingAppointment = {
      service: String(service),
      date: date ? new Date(String(date)) : undefined,
      time: time ? String(time) : undefined,
      status: 'pending',
    };

    if (!date && !time) {
      return `I can help you schedule a ${service} appointment. What date would you prefer?`;
    }

    if (!time) {
      return `I have ${service} on ${this.formatDate(this.pendingAppointment.date!)}. What time would work best for you?`;
    }

    // Simulate slot availability check
    const isAvailable = this.checkSlotAvailability(this.pendingAppointment.date!, String(time));

    if (isAvailable) {
      return `Great! ${this.formatDate(this.pendingAppointment.date!)} at ${time} for ${service} is available. Would you like me to confirm this appointment?`;
    }

    return `I'm sorry, ${time} on ${this.formatDate(this.pendingAppointment.date!)} is not available. Would you like me to suggest an alternative time?`;
  }

  private handleReschedule(parameters: Record<string, unknown>): string {
    const appointmentId = parameters.appointmentId || this.pendingAppointment.id;
    const newDate = parameters.newDate ? new Date(String(parameters.newDate)) : null;
    const newTime = parameters.newTime ? String(parameters.newTime) : null;

    const appointment = this.appointments.get(String(appointmentId));

    if (!appointment) {
      return `I couldn't find that appointment. Could you please provide your appointment ID?`;
    }

    if (!newDate && !newTime) {
      return `What would you like to change - the date, time, or both?`;
    }

    const isAvailable = newDate && newTime
      ? this.checkSlotAvailability(newDate, newTime)
      : true;

    if (!isAvailable) {
      return `I'm sorry, the requested slot is not available. Would you like me to suggest alternative times?`;
    }

    // Update appointment
    if (newDate) appointment.date = newDate;
    if (newTime) appointment.time = newTime;
    appointment.status = 'pending';

    this.emit('appointment:rescheduled', appointment);

    return `Your appointment has been rescheduled to ${this.formatDate(appointment.date)} at ${appointment.time}. Your updated appointment ID is ${appointment.id}. Would you like me to confirm?`;
  }

  private handleCancel(parameters: Record<string, unknown>): string {
    const appointmentId = parameters.appointmentId || this.pendingAppointment.id;
    const reason = parameters.reason || 'Customer requested cancellation';

    const appointment = this.appointments.get(String(appointmentId));

    if (!appointment) {
      return `I couldn't find that appointment. Could you please provide your appointment ID?`;
    }

    appointment.status = 'cancelled';
    this.emit('appointment:cancelled', { appointmentId: appointment.id, reason });

    return `Your appointment (ID: ${appointment.id}) for ${appointment.service} on ${this.formatDate(appointment.date)} has been cancelled. If you need to reschedule, I'm here to help.`;
  }

  private handleCheckAvailability(parameters: Record<string, unknown>): string {
    const date = parameters.date ? new Date(String(parameters.date)) : new Date();
    const service = parameters.service || 'consultation';

    // Simulate available slots
    const slots = ['9:00 AM', '10:30 AM', '2:00 PM', '4:30 PM'];

    return `Available slots for ${service} on ${this.formatDate(date)} are: ${slots.join(', ')}. Which time would you prefer?`;
  }

  private handleConfirm(parameters: Record<string, unknown>): string {
    const appointmentId = parameters.appointmentId || this.pendingAppointment.id;

    // Create appointment if not exists
    if (!this.pendingAppointment.id || String(appointmentId) !== this.pendingAppointment.id) {
      const newId = `APT-${Date.now().toString(36).toUpperCase()}`;
      const appointment: Appointment = {
        id: newId,
        service: this.pendingAppointment.service || 'General',
        date: this.pendingAppointment.date || new Date(),
        time: this.pendingAppointment.time || '10:00 AM',
        duration: 30,
        status: 'confirmed',
        customerName: this.session?.context?.customerName,
        customerPhone: this.session?.customerPhone,
        reminderSet: false,
      };

      this.appointments.set(newId, appointment);
      this.pendingAppointment = {};

      this.emit('appointment:confirmed', appointment);

      return `Your appointment has been confirmed! Details: ${appointment.service} on ${this.formatDate(appointment.date)} at ${appointment.time}. Appointment ID: ${appointment.id}. You'll receive an SMS reminder before your appointment.`;
    }

    const appointment = this.appointments.get(String(appointmentId));
    if (appointment) {
      appointment.status = 'confirmed';
      this.emit('appointment:confirmed', appointment);

      return `Your appointment (ID: ${appointment.id}) for ${appointment.service} on ${this.formatDate(appointment.date)} at ${appointment.time} is now confirmed.`;
    }

    return `I couldn't confirm the appointment. Please try again or provide your appointment details.`;
  }

  private handleAppointmentDetails(parameters: Record<string, unknown>): string {
    const appointmentId = parameters.appointmentId;

    const appointment = appointmentId
      ? this.appointments.get(String(appointmentId))
      : this.appointments.values().next().value;

    if (!appointment) {
      return `I couldn't find your appointment. Could you please provide your appointment ID or name the service?`;
    }

    const statusText = {
      pending: 'awaiting confirmation',
      confirmed: 'confirmed',
      cancelled: 'cancelled',
      completed: 'completed',
    };

    return `Your appointment details: Service: ${appointment.service}, Date: ${this.formatDate(appointment.date)}, Time: ${appointment.time}, Status: ${statusText[appointment.status]}. ${appointment.reminderSet ? 'You have a reminder set.' : 'Would you like to set a reminder?'}`;
  }

  private handleReminder(parameters: Record<string, unknown>): string {
    const appointmentId = parameters.appointmentId || this.pendingAppointment.id;
    const reminderTime = parameters.reminderTime || '1 hour before';

    const appointment = this.appointments.get(String(appointmentId));

    if (!appointment) {
      return `I couldn't find that appointment.`;
    }

    appointment.reminderSet = true;
    appointment.reminderTime = this.calculateReminderTime(appointment.date, appointment.time, String(reminderTime));

    this.emit('reminder:set', appointment);

    return `I've set a reminder for ${reminderTime} before your appointment on ${this.formatDate(appointment.date)} at ${appointment.time}. You'll receive an SMS and push notification.`;
  }

  private handlePrepareVisit(parameters: Record<string, unknown>): string {
    const service = parameters.service || this.pendingAppointment.service || 'your appointment';

    const requirements: Record<string, string> = {
      'doctor': 'Please bring your ID, previous medical records, and insurance card if applicable.',
      'salon': 'Just come as you are! No specific documents needed, but arrive 10 minutes early.',
      'business': 'Please bring a valid ID and any relevant documents for your meeting.',
      'default': 'Please bring a valid ID and arrive 15 minutes early for your appointment.',
    };

    const requirement = requirements[String(service).toLowerCase()] || requirements['default'];

    return `For your ${service}, ${requirement}`;
  }

  private checkSlotAvailability(date: Date, time: string): boolean {
    // In production, this would check against actual calendar
    const bookedSlots = ['11:00 AM', '3:00 PM'];
    return !bookedSlots.includes(time);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private calculateReminderTime(appointmentDate: Date, appointmentTime: string, reminderType: string): Date {
    const [time, period] = appointmentTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;

    if (period.toLowerCase() === 'pm' && hours !== 12) hour24 += 12;
    if (period.toLowerCase() === 'am' && hours === 12) hour24 = 0;

    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hour24, minutes, 0, 0);

    let reminderOffset = 60 * 60 * 1000; // 1 hour default

    if (reminderType.includes('30 minutes')) {
      reminderOffset = 30 * 60 * 1000;
    } else if (reminderType.includes('2 hours')) {
      reminderOffset = 2 * 60 * 60 * 1000;
    } else if (reminderType.includes('1 day')) {
      reminderOffset = 24 * 60 * 60 * 1000;
    }

    return new Date(appointmentDateTime.getTime() - reminderOffset);
  }

  private async handleGoodbye(): Promise<string> {
    await this.endSession();

    return `Thank you for using our appointment service. Have a great day!`;
  }

  private handleUnknown(): string {
    return `I can help you schedule, reschedule, or cancel appointments. You can also check availability or set reminders. What would you like to do?`;
  }

  /**
   * Get all appointments
   */
  getAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  /**
   * Get upcoming appointments
   */
  getUpcomingAppointments(): Appointment[] {
    const now = new Date();
    return Array.from(this.appointments.values())
      .filter(apt => apt.date >= now && apt.status === 'confirmed')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

/**
 * Factory function to create an Appointment Agent
 */
export function createAppointmentAgent(agent: VoiceAgent): AppointmentAgent {
  return new AppointmentAgent({ agent });
}
