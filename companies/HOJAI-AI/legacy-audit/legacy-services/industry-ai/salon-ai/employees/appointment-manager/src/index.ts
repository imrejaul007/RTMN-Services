/**
 * HOJAI Appointment Manager AI Employee
 * WhatsApp booking, reminders, confirmations
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface AppointmentRequest {
  id: string;
  customerId?: string;
  customerName: string;
  phone: string;
  service: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredStaff?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmedAppointmentId?: string;
  createdAt: string;
}

interface Reminder {
  id: string;
  appointmentId: string;
  customerId: string;
  phone: string;
  type: 'confirmation' | 'reminder' | 'followup';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
}

const requests = new Map<string, AppointmentRequest>();
const reminders = new Map<string, Reminder>();

// Handle incoming WhatsApp message
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const { from, message } = req.body;
    const intent = parseIntent(message);

    switch (intent) {
      case 'book':
        const request = await handleBookingRequest(from, message);
        return res.json({ response: generateBookingResponse(request) });

      case 'reschedule':
        const rescheduleResponse = await handleReschedule(from, message);
        return res.json({ response: rescheduleResponse });

      case 'cancel':
        const cancelResponse = await handleCancellation(from, message);
        return res.json({ response: cancelResponse });

      case 'check':
        const statusResponse = await handleStatusCheck(from);
        return res.json({ response: statusResponse });

      default:
        return res.json({
          response: getHelpMessage(),
        });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Handle booking request
async function handleBookingRequest(phone: string, message: string): Promise<AppointmentRequest> {
  // Parse the message for booking details
  const serviceMatch = message.match(/haircut|facial|manicure|massage|coloring|treatment|bridal/i);
  const service = serviceMatch ? serviceMatch[0] : '';

  const request: AppointmentRequest = {
    id: uuidv4(),
    customerName: 'Customer',
    phone,
    service,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  requests.set(request.id, request);

  // This would normally call the booking service
  // For now, simulate confirmation
  request.status = 'confirmed';
  request.confirmedAppointmentId = uuidv4();
  requests.set(request.id, request);

  return request;
}

// Handle reschedule
async function handleReschedule(phone: string, message: string): Promise<string> {
  const dateMatch = message.match(/\d{1,2}[\/\-]\d{1,2}/);

  if (dateMatch) {
    return `Understood! I'll reschedule your appointment. Please confirm the new date: ${dateMatch[0]} and time.`;
  }

  return 'I can help you reschedule. What date and time works for you?';
}

// Handle cancellation
async function handleCancellation(phone: string, message: string): Promise<string> {
  return 'I\'m sorry you need to cancel. Your appointment has been cancelled. We hope to see you again soon! Reply YES to confirm.';
}

// Handle status check
async function handleStatusCheck(phone: string): Promise<string> {
  const customerRequests = Array.from(requests.values())
    .filter(r => r.phone === phone && r.status === 'confirmed');

  if (customerRequests.length === 0) {
    return 'You don\'t have any upcoming appointments. Would you like to book one?';
  }

  const next = customerRequests[0];
  return `Your next appointment:\nService: ${next.service}\nDate: ${next.preferredDate || 'TBD'}\nTime: ${next.preferredTime || 'TBD'}\n\nNeed to reschedule? Just let me know!`;
}

// Schedule reminder
router.post('/reminders', async (req, res) => {
  try {
    const { appointmentId, customerId, phone, type, hoursBefore } = req.body;

    const reminder: Reminder = {
      id: uuidv4(),
      appointmentId,
      customerId,
      phone,
      type,
      scheduledFor: new Date(Date.now() + hoursBefore * 60 * 60 * 1000).toISOString(),
      sent: false,
    };

    reminders.set(reminder.id, reminder);

    res.status(201).json({ success: true, reminder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

// Get requests
router.get('/requests', async (req, res) => {
  try {
    const { status, phone } = req.query;
    let result = Array.from(requests.values());

    if (status) result = result.filter(r => r.status === status);
    if (phone) result = result.filter(r => r.phone === phone);

    res.json({ requests: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Helper functions
function parseIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
    return 'book';
  }
  if (lower.includes('reschedule') || lower.includes('change') || lower.includes('different')) {
    return 'reschedule';
  }
  if (lower.includes('cancel') || lower.includes('not coming')) {
    return 'cancel';
  }
  if (lower.includes('my appointment') || lower.includes('when')) {
    return 'check';
  }

  return 'unknown';
}

function generateBookingResponse(request: AppointmentRequest): string {
  if (request.status === 'confirmed') {
    return `Great! Your appointment for ${request.service} has been confirmed! 🎉\n\nWe'll send you a reminder before your appointment. See you soon!`;
  }

  return `I'd love to help you book! Please tell me:\n1. Which service would you like?\n2. Preferred date and time\n3. Any specific stylist preference?`;
}

function getHelpMessage(): string {
  return `Welcome to our salon! 👋\n\nI can help you with:\n• Book appointments\n• Reschedule\n• Cancel appointments\n• Check your booking\n\nWhat would you like to do?`;
}

export { router, requests, reminders };
export type { AppointmentRequest, Reminder };
