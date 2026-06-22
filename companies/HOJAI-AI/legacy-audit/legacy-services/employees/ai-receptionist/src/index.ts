/**
 * AI Receptionist - Clinic/Hotel Front Desk
 * Handles appointments, check-ins, and guest queries
 */

import { Agent } from '../../core/agent';
import { MemoryService } from '../../services/memory-service';
import { BookingService } from '../../services/booking-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import { VoiceService } from '../../services/voice-service';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  dateTime: Date;
  type: 'consultation' | 'followup' | 'procedure';
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'cancelled' | 'completed';
  notes?: string;
}

interface GuestCheckIn {
  bookingId: string;
  guestName: string;
  phone: string;
  checkIn: Date;
  checkOut: Date;
  roomNumber?: string;
  specialRequests?: string[];
}

export class AIReceptionist extends Agent {
  private bookingService: BookingService;
  private whatsAppService: WhatsAppService;
  private voiceService: VoiceService;
  private activeBookings: Map<string, Appointment | GuestCheckIn> = new Map();

  constructor(config: any) {
    super({
      name: 'AI Receptionist',
      role: 'front_desk',
      industry: config.industry || 'clinic', // 'clinic' or 'hotel'
      channels: ['voice', 'whatsapp', 'chat'],
      languages: ['en', 'hi', 'ta', 'te', 'bn', 'kn', 'ml', 'gu', 'mr', 'pa'],
      ...config
    });

    this.bookingService = new BookingService();
    this.whatsAppService = new WhatsAppService();
    this.voiceService = new VoiceService();
  }

  /**
   * Handle incoming message/call
   */
  async handleIntent(customerId: string, message: string, context: any): Promise<string> {
    // Detect intent
    const intent = await this.detectIntent(message, context);

    switch (intent) {
      case 'book_appointment':
        return await this.handleBooking(customerId, message, context);
      case 'check_availability':
        return await this.handleAvailability(message);
      case 'reschedule':
        return await this.handleReschedule(customerId, message);
      case 'cancel':
        return await this.handleCancellation(customerId);
      case 'check_in':
        return await this.handleCheckIn(customerId, message);
      case 'check_out':
        return await this.handleCheckOut(customerId, message);
      case 'get_direction':
        return this.getDirections();
      case 'emergency':
        return this.handleEmergency();
      case 'faq':
        return await this.handleFAQ(message);
      case 'transfer':
        return await this.transferToHuman(message);
      default:
        return this.getWelcomeMessage();
    }
  }

  /**
   * Handle voice calls
   */
  async handleVoiceCall(phoneNumber: string, audioUrl: string): Promise<void> {
    // Convert speech to text
    const transcript = await this.voiceService.transcribe(audioUrl);

    // Handle intent
    const response = await this.handleIntent(phoneNumber, transcript, { channel: 'voice' });

    // Convert text to speech
    const audioResponse = await this.voiceService.synthesize(response);

    return audioResponse;
  }

  /**
   * Intent detection
   */
  private async detectIntent(message: string, context: any): Promise<string> {
    const lowerMessage = message.toLowerCase();
    const industry = this.config.industry;

    // Industry-specific intents
    if (industry === 'clinic') {
      if (lowerMessage.match(/\b(book|schedule|appointment|slot|doctor|consult)\b/)) {
        return 'book_appointment';
      }
      if (lowerMessage.match(/\b(available|free|slot|time)\b/)) {
        return 'check_availability';
      }
      if (lowerMessage.match(/\b(reschedule|change|modify)\b/)) {
        return 'reschedule';
      }
      if (lowerMessage.match(/\b(emergency|urgent|now|pain)\b/)) {
        return 'emergency';
      }
    }

    if (industry === 'hotel') {
      if (lowerMessage.match(/\b(check.?in|arriving|arrival|reaching)\b/)) {
        return 'check_in';
      }
      if (lowerMessage.match(/\b(check.?out|leaving|departure)\b/)) {
        return 'check_out';
      }
      if (lowerMessage.match(/\b(book|reserve|room)\b/)) {
        return 'book_appointment';
      }
    }

    // Common intents
    if (lowerMessage.match(/\bcancel\b/)) return 'cancel';
    if (lowerMessage.match(/\bdirection|map|location|address|where\b/)) return 'get_direction';
    if (lowerMessage.match(/\btransfer|human|agent|executive|speak)\b/)) return 'transfer';
    if (lowerMessage.match(/\bfaq|question|help|information\b/)) return 'faq';

    return 'unknown';
  }

  /**
   * Handle appointment booking (clinic)
   */
  private async handleBooking(customerId: string, message: string, context: any): Promise<string> {
    // Extract booking details
    const doctorName = this.extractDoctorName(message);
    const preferredDate = this.extractDate(message);
    const preferredTime = this.extractTime(message);
    const visitType = this.extractVisitType(message);

    // Get customer info
    const session = await MemoryService.getSession(customerId);
    const customerName = session?.customerName || context?.name;
    const phone = session?.phone || context?.phone;

    if (!customerName) {
      return "May I have your name please?";
    }

    if (!doctorName) {
      // List available doctors
      const doctors = await this.bookingService.getAvailableDoctors();
      return this.formatDoctorList(doctors);
    }

    // Check availability
    const slots = await this.bookingService.getAvailableSlots(doctorName, preferredDate);

    if (slots.length === 0) {
      return `Dr. ${doctorName} doesn't have any slots on ${preferredDate || 'this day'}. Would you like to try another date or doctor?`;
    }

    // Format slots
    return this.formatSlots(doctorName, slots);
  }

  /**
   * Handle availability check
   */
  private async handleAvailability(message: string): Promise<string> {
    const doctorName = this.extractDoctorName(message);
    const date = this.extractDate(message) || new Date();

    const slots = await this.bookingService.getAvailableSlots(doctorName, date);

    if (slots.length === 0) {
      return `No available slots ${doctorName ? `for Dr. ${doctorName} ` : ''}on ${date.toLocaleDateString('en-IN')}. Try another date?`;
    }

    return `Available slots on ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}:\n\n${this.formatSlots(doctorName, slots)}`;
  }

  /**
   * Handle check-in (hotel)
   */
  private async handleCheckIn(customerId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(customerId);
    const bookingId = session?.bookingId || this.extractBookingId(message);

    if (!bookingId) {
      return "Could you provide your booking ID or phone number?";
    }

    // Get booking details
    const booking = await this.bookingService.getBooking(bookingId);

    if (!booking) {
      return "I couldn't find a booking with that information. Could you double-check your booking ID?";
    }

    // Process check-in
    const checkIn = await this.bookingService.processCheckIn(bookingId);

    return `✅ *Check-In Successful!*\n\n` +
           `Welcome, ${booking.guestName}! 🌟\n\n` +
           `Room: ${checkIn.roomNumber}\n` +
           `Check-In: ${new Date().toLocaleString('en-IN')}\n` +
           `Check-Out: ${booking.checkOut.toLocaleDateString('en-IN')}\n\n` +
           `Your room key is ready at the front desk.\n` +
           `WiFi Password: ${checkIn.wifiPassword}\n\n` +
           `Enjoy your stay! 🏨`;
  }

  /**
   * Handle check-out (hotel)
   */
  private async handleCheckOut(customerId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(customerId);
    const bookingId = session?.bookingId;

    if (!bookingId) {
      return "Could you provide your booking ID?";
    }

    // Process check-out
    const checkout = await this.bookingService.processCheckOut(bookingId);

    // Send invoice via WhatsApp
    await this.whatsAppService.sendMessage(session.phone, {
      type: 'document',
      url: checkout.invoiceUrl,
      caption: `Invoice for your stay\n\nTotal: ₹${checkout.total}\nPaid: ₹${checkout.paid}\nBalance: ₹${checkout.balance}`
    });

    return `✅ *Check-Out Successful!*\n\n` +
           `Guest: ${checkout.guestName}\n` +
           `Room: ${checkout.roomNumber}\n` +
           `Total: ₹${checkout.total}\n` +
           `Paid: ₹${checkout.paid}\n` +
           `Balance: ₹${checkout.balance}\n\n` +
           `Invoice sent to your WhatsApp.\n\n` +
           `Thank you for staying with us! 🏨\n` +
           `We hope to see you again!`;
  }

  /**
   * Handle rescheduling
   */
  private async handleReschedule(customerId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(customerId);
    const appointmentId = session?.appointmentId;

    if (!appointmentId) {
      return "I don't see any upcoming appointments to reschedule.";
    }

    const newDate = this.extractDate(message);
    const newTime = this.extractTime(message);

    if (!newDate && !newTime) {
      return "What date and time would you like to reschedule to?";
    }

    // Reschedule
    const updated = await this.bookingService.reschedule(appointmentId, { date: newDate, time: newTime });

    return `✅ *Appointment Rescheduled!*\n\n` +
           `Date: ${updated.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
           `Time: ${updated.time}\n` +
           `Doctor: Dr. ${updated.doctorName}\n\n` +
           `A reminder has been sent to your WhatsApp.`;
  }

  /**
   * Handle cancellation
   */
  private async handleCancellation(customerId: string): Promise<string> {
    const session = await MemoryService.getSession(customerId);
    const appointmentId = session?.appointmentId;

    if (!appointmentId) {
      return "I don't see any appointments to cancel.";
    }

    await this.bookingService.cancelAppointment(appointmentId);

    return "Your appointment has been cancelled. No charges will apply.\n\nWould you like to book a new appointment?";
  }

  /**
   * Get directions
   */
  private getDirections(): string {
    const industry = this.config.industry;

    if (industry === 'clinic') {
      return `📍 *Clinic Location*\n\n` +
             `[Clinic Address]\n\n` +
             `🗺️ [Google Maps Link]\n\n` +
             `Landmark: [Nearby Landmark]\n\n` +
             `Parking: Available at [Location]\n` +
             `Metro: Near [Station Name]`;
    }

    return `📍 *Hotel Location*\n\n` +
           `[Hotel Address]\n\n` +
           `🗺️ [Google Maps Link]\n\n` +
           `From Airport: ~30 mins\n` +
           `From Railway Station: ~15 mins\n\n` +
           `Valet parking available for guests.`;
  }

  /**
   * Handle emergency
   */
  private handleEmergency(): string {
    return `🚨 *Emergency Services*\n\n` +
           `Please call our emergency line:\n` +
           `📞 +91 [Emergency Number]\n\n` +
           `For medical emergencies, please dial:\n` +
           `🚑 108 (Ambulance)\n` +
           `🏥 102 (Medical Emergency)\n\n` +
           `Our medical team has been notified and will assist you shortly.`;
  }

  /**
   * Handle FAQ
   */
  private async handleFAQ(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    const industry = this.config.industry;

    // Clinic FAQs
    if (industry === 'clinic') {
      if (lowerMessage.match(/\b(fee|charge|price|cost)\b/)) {
        return "💰 *Consultation Fees:*\n\n" +
               "General Physician: ₹300-500\n" +
               "Specialist: ₹500-1500\n" +
               "Super Specialist: ₹1000-3000\n\n" +
               "Insurance accepted: [List]";
      }
      if (lowerMessage.match(/\b(timing|hour|open|close)\b/)) {
        return "🕐 *Clinic Timings:*\n\n" +
               "Monday - Saturday: 9 AM - 8 PM\n" +
               "Sunday: 10 AM - 2 PM\n\n" +
               "Emergency: 24/7";
      }
      if (lowerMessage.match(/\b(document|paper|report)\b/)) {
        return "📋 *Documents Required:*\n\n" +
               "• Photo ID (Aadhaar/Passport)\n" +
               "• Previous medical records (if any)\n" +
               "• Insurance card (if applicable)\n" +
               "• Recent prescriptions";
      }
    }

    // Hotel FAQs
    if (industry === 'hotel') {
      if (lowerMessage.match(/\b(check.?in|time|arrive)\b/)) {
        return "🕐 *Check-In/Check-Out:*\n\n" +
               "Check-In: 2:00 PM\n" +
               "Check-Out: 11:00 AM\n\n" +
               "Early check-in available based on availability.";
      }
      if (lowerMessage.match(/\b(breakfast|food|restaurant|dine)\b/)) {
        return "🍳 *Dining Options:*\n\n" +
               "Breakfast: 7 AM - 10:30 AM\n" +
               "Lunch: 12 PM - 3 PM\n" +
               "Dinner: 7 PM - 10 PM\n\n" +
               "24/7 Room service available.";
      }
      if (lowerMessage.match(/\b(wifi|password|internet)\b/)) {
        return "📶 *WiFi Information:*\n\n" +
               "Network: [Hotel_WiFi]\n" +
               "Password: Available at front desk\n\n" +
               "High-speed internet throughout the hotel.";
      }
    }

    return "I can help you with:\n" +
           "• Booking appointments\n" +
           "• Clinic/Hotel information\n" +
           "• Directions\n" +
           "• Emergency services\n\n" +
           "What would you like to know?";
  }

  /**
   * Transfer to human
   */
  private async transferToHuman(message: string): Promise<string> {
    // Create ticket for human agent
    const ticket = await this.bookingService.createTransferTicket({
      customerId: message,
      reason: 'Customer requested human agent',
      priority: 'normal'
    });

    return `I'll connect you with our team. Please hold for a moment. 🔄\n\n` +
           `Ticket ID: ${ticket.id}\n\n` +
           `A human agent will be with you shortly. Thank you for your patience!`;
  }

  /**
   * Get welcome message
   */
  private getWelcomeMessage(): string {
    const industry = this.config.industry;
    const businessName = this.config.businessName || 'our establishment';

    if (industry === 'clinic') {
      return `👋 *Welcome to ${businessName}!*\n\n` +
             `I'm your AI receptionist. I can help you:\n\n` +
             `• Book appointments\n` +
             `• Check doctor availability\n` +
             `• Reschedule or cancel\n` +
             `• Get directions\n` +
             `• Answer FAQs\n\n` +
             `How can I assist you today?`;
    }

    return `👋 *Welcome to ${businessName}!*\n\n` +
           `I'm your AI receptionist. I can help you:\n\n` +
           `• Check-in / Check-out\n` +
           `• Book rooms\n` +
           `• Room service\n` +
           `• Directions\n` +
           `• Local information\n\n` +
           `How may I assist you?`;
  }

  // Utility methods

  private formatDoctorList(doctors: any[]): string {
    let response = `👨‍⚕️ *Available Doctors:*\n\n`;

    doctors.forEach((doc, i) => {
      response += `${i + 1}. ${doc.name} - ${doc.specialty}\n`;
      response += `   ⭐ ${doc.rating} | ${doc.experience} years exp\n`;
    });

    response += "\nWhich doctor would you like to see?";
    return response;
  }

  private formatSlots(doctorName: string, slots: string[]): string {
    let response = `📅 *Available Slots for Dr. ${doctorName}:*\n\n`;

    const morning = slots.filter(s => s.includes('AM'));
    const afternoon = slots.filter(s => !s.includes('AM') && parseInt(s) < 5);
    const evening = slots.filter(s => parseInt(s) >= 5);

    if (morning.length > 0) {
      response += `🌅 Morning: ${morning.join(', ')}\n`;
    }
    if (afternoon.length > 0) {
      response += `☀️ Afternoon: ${afternoon.map(s => s + ' PM').join(', ')}\n`;
    }
    if (evening.length > 0) {
      response += `🌙 Evening: ${evening.map(s => s + ' PM').join(', ')}\n`;
    }

    response += "\nWhich slot would you prefer?";
    return response;
  }

  private extractDoctorName(message: string): string | null {
    const match = message.match(/dr\.?\s*(\w+)/i);
    return match ? match[1] : null;
  }

  private extractDate(message: string): Date | null {
    const today = new Date();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('today')) return today;
    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Parse day name
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerMessage.includes(days[i])) {
        const targetDay = new Date();
        const currentDay = targetDay.getDay();
        const diff = (i - currentDay + 7) % 7 || 7;
        targetDay.setDate(targetDay.getDate() + diff);
        return targetDay;
      }
    }

    return null;
  }

  private extractTime(message: string): string | null {
    const match = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      return `${match[1]}${match[2] ? ':' + match[2] : ':00'}`;
    }
    return null;
  }

  private extractVisitType(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('follow')) return 'followup';
    if (lowerMessage.includes('procedure') || lowerMessage.includes('surgery')) return 'procedure';
    return 'consultation';
  }

  private extractBookingId(message: string): string | null {
    const match = message.match(/BK[0-9]{6}/i);
    return match ? match[0] : null;
  }
}

export default AIReceptionist;
