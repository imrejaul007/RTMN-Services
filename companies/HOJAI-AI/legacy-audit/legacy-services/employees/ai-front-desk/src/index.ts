/**
 * AI Front Desk - Hotel Front Desk
 * Handles guest check-in, check-out, and services
 */

import { Agent } from '../../core/agent';
import { MemoryService } from '../../services/memory-service';
import { HotelService } from '../../services/hotel-service';
import { HousekeepingService } from '../../services/housekeeping-service';
import { WhatsAppService } from '../../services/whatsapp-service';

interface GuestRequest {
  id: string;
  roomNumber: string;
  type: 'room_service' | 'housekeeping' | 'concierge' | 'taxi' | 'restaurant' | 'spa';
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  timestamp: Date;
}

export class AIFrontDesk extends Agent {
  private hotelService: HotelService;
  private housekeepingService: HousekeepingService;
  private whatsAppService: WhatsAppService;
  private activeRequests: Map<string, GuestRequest[]> = new Map();

  constructor(config: any) {
    super({
      name: 'AI Front Desk',
      role: 'front_desk',
      industry: 'hotel',
      channels: ['whatsapp', 'voice', 'chat'],
      languages: ['en', 'hi', 'ar', 'zh', 'fr', 'de', 'ja', 'ru'],
      ...config
    });

    this.hotelService = new HotelService();
    this.housekeepingService = new HousekeepingService();
    this.whatsAppService = new WhatsAppService();
  }

  /**
   * Handle guest request
   */
  async handleIntent(guestId: string, message: string, context: any): Promise<string> {
    const intent = await this.detectIntent(message);

    switch (intent) {
      case 'check_in':
        return await this.handleCheckIn(guestId, context);
      case 'check_out':
        return await this.handleCheckOut(guestId);
      case 'room_service':
        return await this.handleRoomService(guestId, message);
      case 'housekeeping':
        return await this.handleHousekeeping(guestId, message);
      case 'taxi':
        return await this.handleTaxiRequest(guestId, message);
      case 'restaurant':
        return await this.handleRestaurantBooking(guestId, message);
      case 'spa':
        return await this.handleSpaBooking(guestId, message);
      case 'concierge':
        return await this.handleConcierge(guestId, message);
      case 'wifi':
        return this.getWiFiInfo();
      case 'complaint':
        return await this.handleComplaint(guestId, message);
      case 'checkout_time':
        return this.getCheckoutInfo();
      default:
        return this.getWelcomeMessage();
    }
  }

  /**
   * Detect guest intent
   */
  private async detectIntent(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/\b(check.?in|arriv|welcom|reach)\b/)) return 'check_in';
    if (lowerMessage.match(/\b(check.?out|leav|depart|go)\b/)) return 'check_out';
    if (lowerMessage.match(/\b(room.?service|food|eat|dinner|lunch|breakfast|minibar)\b/)) return 'room_service';
    if (lowerMessage.match(/\b(housekeep|clean|towel|extra|bed|sheet|pillow)\b/)) return 'housekeeping';
    if (lowerMessage.match(/\b(taxi|cab|car|transport|airport|pickup)\b/)) return 'taxi';
    if (lowerMessage.match(/\b(restaurant|dine|table|book)\b/)) return 'restaurant';
    if (lowerMessage.match(/\b(spa|mas|salon|wellness|massage)\b/)) return 'spa';
    if (lowerMessage.match(/\b(concierge|help|recommend|suggest|tour|activity)\b/)) return 'concierge';
    if (lowerMessage.match(/\b(wifi|password|internet)\b/)) return 'wifi';
    if (lowerMessage.match(/\b(complaint|issue|problem|wrong|broken)\b/)) return 'complaint';
    if (lowerMessage.match(/\b(checkout|time|late|extend)\b/)) return 'checkout_time';

    return 'unknown';
  }

  /**
   * Handle check-in
   */
  private async handleCheckIn(guestId: string, context: any): Promise<string> {
    // Get booking
    const booking = await this.hotelService.getActiveBooking(guestId);

    if (!booking) {
      return "I couldn't find an active booking for you. Could you provide your booking ID or phone number?";
    }

    // Generate room key
    const roomKey = await this.hotelService.generateRoomKey(booking.roomNumber);

    // Get welcome package
    const welcomePackage = this.getWelcomePackage();

    // Update guest memory
    await MemoryService.saveSession(guestId, {
      bookingId: booking.id,
      roomNumber: booking.roomNumber,
      checkIn: new Date(),
      checkOut: booking.checkOut
    });

    // Send WhatsApp welcome
    await this.whatsAppService.sendMessage(booking.phone, {
      type: 'text',
      text: `Welcome to ${this.config.hotelName}! 🎉\n\nYour room ${booking.roomNumber} is ready.\n\nQuick actions:\n• Room Service - "I want to order food"\n• Housekeeping - "I need housekeeping"\n• Taxi - "Book a taxi"\n\nEnjoy your stay! 🏨`
    });

    return `✅ *Check-In Complete!*\n\n` +
           `Welcome, ${booking.guestName}! 🎉\n\n` +
           `🛏️ Room: ${booking.roomNumber}\n` +
           `📅 Check-In: Now\n` +
           `📅 Check-Out: ${booking.checkOut.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n` +
           `🔑 Your room key is ready at the front desk.\n\n` +
           `📶 WiFi: ${this.config.wifiName}\n` +
           `🔐 Password: ${roomKey.tempPassword}\n\n` +
           `How may I assist you during your stay?`;
  }

  /**
   * Handle check-out
   */
  private async handleCheckOut(guestId: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    if (!session?.bookingId) {
      return "I couldn't find your booking information. Could you provide your booking ID?";
    }

    // Get billing
    const billing = await this.hotelService.getBilling(session.bookingId);

    // Send invoice
    await this.whatsAppService.sendMessage(session.phone, {
      type: 'document',
      url: billing.invoiceUrl,
      caption: `Thank you for staying with us! 🏨\n\nTotal Bill: ₹${billing.total}\nPaid: ₹${billing.paid}\nBalance: ₹${billing.balance}\n\nWe hope to see you again!`
    });

    // Update room status
    await this.hotelService.markRoomVacant(session.roomNumber);

    return `✅ *Check-Out Process Started!*\n\n` +
           `🧾 Invoice sent to your WhatsApp\n\n` +
           `Total: ₹${billing.total}\n` +
           `Paid: ₹${billing.paid}\n` +
           `Balance: ₹${billing.balance}\n\n` +
           `Please return your room key at the front desk.\n\n` +
           `🚗 Taxi booking? Just say "Book a taxi to airport"\n\n` +
           `Thank you for staying with us! 🌟\n` +
           `We hope to see you again!`;
  }

  /**
   * Handle room service
   */
  private async handleRoomService(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    if (!session?.roomNumber) {
      return "I couldn't find your room information. Could you provide your room number?";
    }

    // Parse food order
    const order = await this.parseFoodOrder(message, session.roomNumber);

    if (!order.items.length) {
      return this.getRoomServiceMenu();
    }

    // Calculate total
    const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Send to kitchen
    await this.hotelService.sendToKitchen(order);

    return `✅ *Room Service Order #${order.id}*\n\n` +
           `${order.items.map((i: any, idx: number) => `${idx + 1}. ${i.name} x${i.quantity} - ₹${i.price * i.quantity}`).join('\n')}\n\n` +
           `Total: ₹${total}\n` +
           `Room: ${session.roomNumber}\n\n` +
           `⏱️ Estimated delivery: 30-45 minutes\n\n` +
           `Your order will be charged to your room.`;
  }

  /**
   * Handle housekeeping request
   */
  private async handleHousekeeping(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    if (!session?.roomNumber) {
      return "I couldn't find your room information.";
    }

    const requestType = this.detectHousekeepingType(message);

    // Create housekeeping ticket
    const ticket = await this.housekeepingService.createTicket({
      roomNumber: session.roomNumber,
      type: requestType,
      priority: message.toLowerCase().includes('urgent') || message.toLowerCase().includes('asap') ? 'high' : 'normal',
      notes: message
    });

    // Update active requests
    if (!this.activeRequests.has(guestId)) {
      this.activeRequests.set(guestId, []);
    }
    this.activeRequests.get(guestId)!.push(ticket);

    const responseTime = ticket.priority === 'high' ? '15-20 minutes' : '45-60 minutes';

    return `✅ *Housekeeping Request #${ticket.id}*\n\n` +
           `📋 Type: ${requestType}\n` +
           `🛏️ Room: ${session.roomNumber}\n` +
           `⏱️ Estimated arrival: ${responseTime}\n\n` +
           `Our housekeeping team will be with you shortly.\n\n` +
           `Need anything else?`;
  }

  /**
   * Handle taxi request
   */
  private async handleTaxiRequest(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);
    const roomNumber = session?.roomNumber || 'Unknown';

    // Parse destination
    const destination = this.extractDestination(message);
    const pickupTime = this.extractTime(message) || new Date(Date.now() + 30 * 60000);

    // Book taxi
    const booking = await this.hotelService.bookTaxi({
      roomNumber,
      destination,
      pickupTime,
      guestPhone: session?.phone
    });

    return `🚕 *Taxi Booked!*\n\n` +
           `📍 To: ${destination}\n` +
           `🕐 Pickup: ${pickupTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n` +
           `🛏️ Room: ${roomNumber}\n\n` +
           `Vehicle: ${booking.vehicleType}\n` +
           `Driver: ${booking.driverName}\n` +
           `Contact: ${booking.driverPhone}\n\n` +
           `OTP: ${booking.otp}\n\n` +
           `The driver will arrive at the main entrance.`;
  }

  /**
   * Handle restaurant booking
   */
  private async handleRestaurantBooking(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    const guestCount = this.extractGuestCount(message);
    const time = this.extractTime(message) || new Date();
    const date = this.extractDate(message) || new Date();

    if (!guestCount) {
      return "How many guests will be dining?";
    }

    // Book table
    const reservation = await this.hotelService.bookRestaurantTable({
      guestName: session?.guestName || 'Hotel Guest',
      guestCount,
      dateTime: new Date(date.setHours(time.getHours(), time.getMinutes())),
      roomNumber: session?.roomNumber,
      phone: session?.phone
    });

    return `🍽️ *Restaurant Reservation Confirmed!*\n\n` +
           `📅 ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
           `🕐 ${time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n` +
           `👥 ${guestCount} guests\n\n` +
           `Restaurant: ${reservation.restaurant}\n` +
           `Table: ${reservation.tableNumber}\n\n` +
           `Confirmation sent to your WhatsApp.\n\n` +
           `Enjoy your meal! 🍽️`;
  }

  /**
   * Handle spa booking
   */
  private async handleSpaBooking(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    // Parse spa service
    const service = this.detectSpaService(message);
    const time = this.extractTime(message);
    const date = this.extractDate(message) || new Date();

    // Check availability
    const slots = await this.hotelService.getSpaSlots(service, date);

    if (!slots.length) {
      return `Sorry, no slots available for ${service} on ${date.toLocaleDateString('en-IN')}. Would you like to try another day?`;
    }

    // Book slot
    const booking = await this.hotelService.bookSpaSlot({
      guestName: session?.guestName || 'Hotel Guest',
      service,
      dateTime: time || new Date(slots[0]),
      roomNumber: session?.roomNumber,
      phone: session?.phone
    });

    return `💆 *Spa Booking Confirmed!*\n\n` +
           `Service: ${service}\n` +
           `📅 ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
           `🕐 ${(time || new Date(slots[0])).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n\n` +
           `Location: Spa & Wellness Center, Floor ${booking.location}\n\n` +
           `Please arrive 10 minutes early.\n\n` +
           `We look forward to seeing you! 💆`;
  }

  /**
   * Handle concierge request
   */
  private async handleConcierge(guestId: string, message: string): Promise<string> {
    const suggestions = await this.getConciergeSuggestions(message);

    return `🎯 *Concierge Recommendations*\n\n` +
           suggestions +
           `\n\nWould you like me to help with any of these? Just say the number or describe what you need.`;
  }

  /**
   * Handle complaint
   */
  private async handleComplaint(guestId: string, message: string): Promise<string> {
    const session = await MemoryService.getSession(guestId);

    // Create complaint ticket
    const ticket = await this.hotelService.createComplaintTicket({
      roomNumber: session?.roomNumber || 'Unknown',
      description: message,
      guestPhone: session?.phone,
      priority: 'high'
    });

    // Notify relevant department
    await this.notifyRelevantDepartment(message);

    return `🙏 *Thank you for your feedback*\n\n` +
           `We've received your complaint (#${ticket.id}) and our team is working on it.\n\n` +
           `Expected response time: 30 minutes\n\n` +
           `If you need immediate assistance, please call:\n` +
           `📞 Front Desk: ${this.config.frontDeskPhone}\n\n` +
           `We apologize for any inconvenience.`;
  }

  /**
   * Get WiFi info
   */
  private getWiFiInfo(): string {
    return `📶 *WiFi Information*\n\n` +
           `Network: ${this.config.wifiName}\n` +
           `Password: ${this.config.wifiPassword}\n\n` +
           `High-speed internet available throughout the hotel.\n\n` +
           `Having trouble connecting? Just say "WiFi not working".`;
  }

  /**
   * Get checkout info
   */
  private getCheckoutInfo(): string {
    return `🕛 *Check-Out Information*\n\n` +
           `Standard Check-Out: 11:00 AM\n` +
           `Late Check-Out (subject to availability):\n` +
           `  • Until 2 PM: ₹${this.config.lateCheckoutFee?.short || '500'}\n` +
           `  • Until 6 PM: ₹${this.config.lateCheckoutFee?.long || '1000'}\n\n` +
           `To check out, just say "Check out" and I'll handle everything!`;
  }

  /**
   * Get welcome message
   */
  private getWelcomeMessage(): string {
    return `👋 *Welcome to Front Desk!*\n\n` +
           `I'm here to help with anything during your stay:\n\n` +
           `🏠 Room Service - Order food to your room\n` +
           `🧹 Housekeeping - Extra towels, cleaning\n` +
           `🚕 Taxi - Book a cab\n` +
           `🍽️ Restaurant - Reserve a table\n` +
           `💆 Spa - Book a treatment\n` +
           `📶 WiFi - Get connected\n` +
           `🕛 Check-Out - Leave with ease\n\n` +
           `What can I help you with?`;
  }

  // Helper methods

  private getWelcomePackage(): string {
    return `🎁 *Welcome Package*\n\n` +
           `Your room includes:\n` +
           `• Complimentary breakfast (7-10:30 AM)\n` +
           `• WiFi access\n` +
           `• Gym access\n` +
           `• Pool access\n\n` +
           `Enjoy your stay!`;
  }

  private getRoomServiceMenu(): string {
    return `🍽️ *Room Service Menu*\n\n` +
           `*Breakfast (7-11 AM)*\n` +
           `• Masala Omelette - ₹180\n` +
           `• South Indian Breakfast - ₹220\n` +
           `• Continental Breakfast - ₹350\n\n` +
           `*All Day (11 AM - 10 PM)*\n` +
           `• Butter Chicken + Naan - ₹450\n` +
           `• Pasta Arrabiata - ₹320\n` +
           `• Biryani - ₹380\n\n` +
           `What would you like to order?`;
  }

  private async getConciergeSuggestions(query: string): Promise<string> {
    const suggestions = [
      `*Local Attractions:*\n• City Tour - ₹1500/person\n• Temple Visit - Free\n• Market Visit - Free\n\n`,
      `*Activities:*\n• Yoga Session - 7 AM at Poolside\n• Cooking Class - ₹2000\n• City Walk - ₹800\n\n`,
      `*Transport:*\n• Airport Drop - ₹800\n• Station Drop - ₹400\n• Day Trip to [Place] - ₹2500\n`
    ];

    return suggestions.join('');
  }

  private async parseFoodOrder(message: string, roomNumber: string): Promise<any> {
    // Simple order parsing
    const menu = {
      'omelette': { name: 'Masala Omelette', price: 180 },
      'breakfast': { name: 'Continental Breakfast', price: 350 },
      'butter chicken': { name: 'Butter Chicken + Naan', price: 450 },
      'pasta': { name: 'Pasta Arrabiata', price: 320 },
      'biryani': { name: 'Biryani', price: 380 },
      'chai': { name: 'Masala Chai', price: 50 },
      'coffee': { name: 'Coffee', price: 100 }
    };

    const items: any[] = [];
    const lowerMessage = message.toLowerCase();

    for (const [key, item] of Object.entries(menu)) {
      if (lowerMessage.includes(key)) {
        const quantity = (lowerMessage.match(new RegExp(`(\\d+)\\s*${key}`)) || ['', '1'])[1];
        items.push({ ...item, quantity: parseInt(quantity) });
      }
    }

    return {
      id: `RS${Date.now()}`,
      roomNumber,
      items,
      status: 'pending'
    };
  }

  private detectHousekeepingType(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('towel')) return 'extra_towels';
    if (lower.includes('bed') || lower.includes('sheet')) return 'change_bedding';
    if (lower.includes('pillow')) return 'extra_pillow';
    if (lower.includes('toilet') || lower.includes('bathroom')) return 'bathroom_cleaning';
    if (lower.includes('minibar')) return 'minibar_refill';
    return 'general_cleaning';
  }

  private extractDestination(message: string): string {
    if (message.toLowerCase().includes('airport')) return 'Airport';
    if (message.toLowerCase().includes('station')) return 'Railway Station';
    if (message.toLowerCase().includes('mall')) return 'City Mall';
    if (message.toLowerCase().includes('temple')) return 'Local Temple';
    return 'City Center';
  }

  private extractGuestCount(message: string): number {
    const match = message.match(/(\d+)\s*(?:people|person|guest|table)/i);
    return match ? parseInt(match[1]) : 0;
  }

  private extractTime(message: string): Date | null {
    const match = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      const time = new Date();
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const period = match[3]?.toLowerCase();

      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      time.setHours(hours, minutes, 0, 0);
      return time;
    }
    return null;
  }

  private extractDate(message: string): Date | null {
    const date = new Date();
    if (message.toLowerCase().includes('tomorrow')) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  private detectSpaService(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('massage')) return 'Swedish Massage (60 min)';
    if (lower.includes('facial')) return 'Facial Treatment';
    if (lower.includes('manicure') || lower.includes('pedicure')) return 'Manicure/Pedicure';
    if (lower.includes('steam') || lower.includes('sauna')) return 'Steam & Sauna';
    return 'Full Body Massage (90 min)';
  }

  private async notifyRelevantDepartment(message: string): Promise<void> {
    // Would notify maintenance, housekeeping, etc.
    console.log('Notifying relevant department for:', message);
  }
}

export default AIFrontDesk;
