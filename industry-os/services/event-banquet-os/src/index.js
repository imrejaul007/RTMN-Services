/**
 * Event & Banquet OS v1.0.0
 * Port: 4751
 * Weddings, Corporate Events, Conferences, Banquets
 *
 * RTMN Industry OS - Vertical Layer
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4751;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// ============================================
// SERVICE CONNECTIONS
// ============================================

const SERVICES = {
  marketing: 'http://localhost:5500',
  analytics: 'http://localhost:4750',
  finance: 'http://localhost:4801',
  hotel: 'http://localhost:5025',
  restaurant: 'http://localhost:5010',
  exhibition: 'http://localhost:5040',
};

// ============================================
// DATA STORES
// ============================================

const stores = {
  events: new Map(),
  venues: new Map(),
  bookings: new Map(),
  guests: new Map(),
  vendors: new Map(),
  menus: new Map(),
  catering: new Map(),
  banquetRooms: new Map(),
  decorations: new Map(),
  entertainment: new Map(),
  transport: new Map(),
  invoices: new Map(),
  tasks: new Map(),
  timeline: new Map(),
};

// ============================================
// MODULES
// ============================================

const MODULES = {
  event: { name: 'Event Management', features: ['Create', 'Schedule', 'Track'] },
  venue: { name: 'Venue Management', features: ['Booking', 'Capacity', 'Equipment'] },
  booking: { name: 'Booking System', features: ['Availability', 'Quotes', 'Confirm'] },
  guest: { name: 'Guest Management', features: ['RSVP', 'Seating', 'Check-in'] },
  vendor: { name: 'Vendor Management', features: ['Directory', 'Ratings', 'Contracts'] },
  catering: { name: 'Catering', features: ['Menus', 'Dietary', 'Service Style'] },
  banquet: { name: 'Banquet', features: ['Rooms', 'Setup', 'Flow'] },
  decoration: { name: 'Decorations', features: ['Themes', 'Flowers', 'Lighting'] },
  entertainment: { name: 'Entertainment', features: ['Music', 'DJ', 'Performers'] },
  transport: { name: 'Transport', features: ['Shuttle', 'Valet', 'Parking'] },
  invoice: { name: 'Invoicing', features: ['Quotes', 'Billing', 'Payments'] },
  task: { name: 'Task Management', features: ['Checklist', 'Assign', 'Track'] },
  timeline: { name: 'Event Timeline', features: ['Schedule', 'Countdown', 'Alerts'] },
  analytics: { name: 'Analytics', features: ['ROI', 'Metrics', 'Reports'] },
};

// ============================================
// AI AGENTS (10)
// ============================================

const AI_AGENTS = [
  {
    id: 'event-planner',
    name: 'Event Planner',
    purpose: 'Suggest event types, themes, and formats',
    run: (data) => {
      const suggestions = [
        { type: 'corporate', theme: 'Professional Gala', budget: '₹2-5L', guests: '100-300' },
        { type: 'wedding', theme: 'Traditional Elegance', budget: '₹5-15L', guests: '200-500' },
        { type: 'social', theme: 'Cocktail Party', budget: '₹50K-1L', guests: '50-150' },
      ];
      return { suggestions, recommended: suggestions[0] };
    }
  },
  {
    id: 'venue-matcher',
    name: 'Venue Matcher',
    purpose: 'Match event to best venue',
    run: (data) => {
      const venues = Array.from(stores.venues.values());
      const matched = venues.filter(v =>
        v.capacity >= (data.expectedGuests || 100) &&
        v.type === (data.eventType || 'general')
      );
      return { venues: matched.slice(0, 5), recommended: matched[0] || null };
    }
  },
  {
    id: 'catering-advisor',
    name: 'Catering Advisor',
    purpose: 'Menu planning, portions, dietary options',
    run: (data) => {
      const guests = data.expectedGuests || 100;
      const portions = {
        starters: Math.ceil(guests * 1.2),
        mainCourse: guests,
        desserts: Math.ceil(guests * 0.8),
        beverages: guests * 2,
      };
      const dietary = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Halal', 'Gluten-Free'];
      return { portions, dietary, budget: guests * 800 };
    }
  },
  {
    id: 'budget-optimizer',
    name: 'Budget Optimizer',
    purpose: 'Cost optimization across event elements',
    run: (event) => {
      const budget = event.budget || 500000;
      const allocation = {
        venue: Math.round(budget * 0.25),
        catering: Math.round(budget * 0.35),
        decoration: Math.round(budget * 0.15),
        entertainment: Math.round(budget * 0.10),
        photography: Math.round(budget * 0.08),
        misc: Math.round(budget * 0.07),
      };
      return { total: budget, allocation, savings: Math.round(budget * 0.1) };
    }
  },
  {
    id: 'guest-recommender',
    name: 'Guest Recommender',
    purpose: 'Guest list optimization',
    run: (event) => {
      const guests = Array.from(stores.guests.values()).filter(g => g.eventId === event.id);
      return {
        total: guests.length,
        confirmed: guests.filter(g => g.status === 'confirmed').length,
        pending: guests.filter(g => g.status === 'pending').length,
        declined: guests.filter(g => g.status === 'declined').length,
        suggestions: ['Send reminders to pending guests', 'Consider backup list'],
      };
    }
  },
  {
    id: 'schedule-optimizer',
    name: 'Schedule Optimizer',
    purpose: 'Event timing optimization',
    run: (event) => {
      const schedule = [
        { time: '16:00', activity: 'Guest Arrival', duration: 30 },
        { time: '16:30', activity: 'Welcome Drinks', duration: 30 },
        { time: '17:00', activity: 'Ceremony', duration: 60 },
        { time: '18:00', activity: 'Cocktail Hour', duration: 60 },
        { time: '19:00', activity: 'Dinner', duration: 90 },
        { time: '20:30', activity: 'Entertainment', duration: 60 },
        { time: '21:30', activity: 'Cake Cutting', duration: 15 },
        { time: '21:45', activity: 'Closing', duration: 15 },
      ];
      return { schedule, totalDuration: '5h 45m', suggestions: ['Buffer time between activities'] };
    }
  },
  {
    id: 'vendor-matcher',
    name: 'Vendor Matcher',
    purpose: 'Best vendors for event',
    run: (data) => {
      const vendors = Array.from(stores.vendors.values())
        .filter(v => v.category === data.category || v.categories?.includes(data.category));
      return {
        vendors: vendors.slice(0, 5),
        recommended: vendors.find(v => v.rating >= 4.5) || vendors[0],
        averageCost: vendors.reduce((sum, v) => sum + (v.avgCost || 50000), 0) / vendors.length,
      };
    }
  },
  {
    id: 'seating-optimizer',
    name: 'Seating Optimizer',
    purpose: 'Optimal seating arrangements',
    run: (data) => {
      const guests = data.guests || [];
      const tables = Math.ceil(guests.length / 10);
      const layout = data.layout || 'round';
      return {
        tables,
        guestsPerTable: Math.ceil(guests.length / tables),
        layout,
        suggestions: ['VIP table near stage', 'Family groups together'],
      };
    }
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    purpose: 'Post-event feedback analysis',
    run: (feedback) => {
      const positive = feedback.filter(f => f.rating >= 4).length;
      const negative = feedback.filter(f => f.rating <= 2).length;
      const score = (positive * 100 + negative * -50) / feedback.length;
      return {
        score: Math.max(0, Math.min(100, score + 50)),
        positive: Math.round((positive / feedback.length) * 100),
        negative: Math.round((negative / feedback.length) * 100),
        sentiment: score > 60 ? 'Positive' : score > 40 ? 'Neutral' : 'Negative',
      };
    }
  },
  {
    id: 'roi-calculator',
    name: 'ROI Calculator',
    purpose: 'Event ROI analysis',
    run: (event) => {
      const revenue = event.budget * 1.5;
      const cost = event.spent || event.budget;
      return {
        revenue,
        cost,
        profit: revenue - cost,
        roi: Math.round(((revenue - cost) / cost) * 100),
        roiGrade: ((revenue - cost) / cost) > 0.5 ? 'A+' : ((revenue - cost) / cost) > 0.3 ? 'A' : 'B',
      };
    }
  },
];

// ============================================
// ENUMS
// ============================================

const EventType = {
  WEDDING: 'wedding',
  CORPORATE: 'corporate',
  SOCIAL: 'social',
  CONFERENCE: 'conference',
  BIRTHDAY: 'birthday',
  ANNIVERSARY: 'anniversary',
  GALA: 'gala',
  PRODUCT_LAUNCH: 'product_launch',
};

const EventStatus = {
  PLANNING: 'planning',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const BookingStatus = {
  ENQUIRY: 'enquiry',
  QUOTED: 'quoted',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

// ============================================
// EVENT MANAGEMENT
// ============================================

const Events = {
  create(data) {
    const id = `EVT-${Date.now().toString(36).toUpperCase()}`;
    const event = {
      id,
      name: data.name,
      type: data.type || EventType.CORPORATE,
      description: data.description || '',
      clientName: data.clientName || '',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      venueId: data.venueId || '',
      venueName: data.venueName || '',
      startDate: data.startDate,
      endDate: data.endDate || data.startDate,
      startTime: data.startTime || '18:00',
      endTime: data.endTime || '23:00',
      expectedGuests: data.expectedGuests || 50,
      confirmedGuests: 0,
      budget: data.budget || 0,
      spent: 0,
      status: EventStatus.PLANNING,
      theme: data.theme || '',
      colorScheme: data.colorScheme || '',
      tags: data.tags || [],
      vendorIds: [],
      menuId: data.menuId || '',
      decorationId: data.decorationId || '',
      entertainmentId: data.entertainmentId || '',
      notes: data.notes || '',
      checklist: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    stores.events.set(id, event);
    return event;
  },

  get(id) { return stores.events.get(id); },

  getAll(filters = {}) {
    let list = Array.from(stores.events.values());
    if (filters.type) list = list.filter(e => e.type === filters.type);
    if (filters.status) list = list.filter(e => e.status === filters.status);
    if (filters.date) list = list.filter(e => e.startDate === filters.date);
    return list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  },

  update(id, data) {
    const event = stores.events.get(id);
    if (event) {
      Object.assign(event, data, { updatedAt: new Date() });
      stores.events.set(id, event);
      return event;
    }
    return null;
  },

  confirm(id) { return this.update(id, { status: EventStatus.CONFIRMED }); },
  start(id) { return this.update(id, { status: EventStatus.IN_PROGRESS }); },
  complete(id) { return this.update(id, { status: EventStatus.COMPLETED }); },
  cancel(id) { return this.update(id, { status: EventStatus.CANCELLED }); },

  addExpense(id, expense) {
    const event = stores.events.get(id);
    if (event) {
      event.spent += expense.amount;
      stores.events.set(id, event);
      return event;
    }
    return null;
  },

  getTimeline(id) {
    return Array.from(stores.timeline.values()).filter(t => t.eventId === id);
  },

  addTask(eventId, task) {
    const id = `TASK-${Date.now().toString(36).toUpperCase()}`;
    const newTask = {
      id,
      eventId,
      ...task,
      status: 'pending',
      createdAt: new Date(),
    };
    stores.tasks.set(id, newTask);
    return newTask;
  },

  completeTask(taskId) {
    const task = stores.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date();
      stores.tasks.set(taskId, task);
      return task;
    }
    return null;
  },
};

// ============================================
// VENUE MANAGEMENT
// ============================================

const Venues = {
  create(data) {
    const id = `VEN-${Date.now().toString(36).toUpperCase()}`;
    const venue = {
      id,
      name: data.name,
      type: data.type || 'banquet_hall',
      address: data.address || '',
      city: data.city || '',
      capacity: data.capacity || 100,
      minGuests: data.minGuests || 20,
      maxGuests: data.maxGuests || 500,
      pricePerPlate: data.pricePerPlate || 1500,
      hallCharge: data.hallCharge || 50000,
      rooms: data.rooms || 0,
      parking: data.parking || 50,
      facilities: data.facilities || [],
      images: data.images || [],
      rating: data.rating || 4.0,
      contactName: data.contactName || '',
      contactPhone: data.contactPhone || '',
      contactEmail: data.contactEmail || '',
      available: true,
      createdAt: new Date(),
    };
    stores.venues.set(id, venue);
    return venue;
  },

  get(id) { return stores.venues.get(id); },

  getAll(filters = {}) {
    let list = Array.from(stores.venues.values());
    if (filters.type) list = list.filter(v => v.type === filters.type);
    if (filters.city) list = list.filter(v => v.city === filters.city);
    if (filters.capacity) list = list.filter(v => v.capacity >= filters.capacity);
    if (filters.available !== undefined) list = list.filter(v => v.available === filters.available);
    return list;
  },

  update(id, data) {
    const venue = stores.venues.get(id);
    if (venue) {
      Object.assign(venue, data);
      stores.venues.set(id, venue);
      return venue;
    }
    return null;
  },

  checkAvailability(venueId, date) {
    const bookings = Array.from(stores.bookings.values())
      .filter(b => b.venueId === venueId && b.date === date && b.status === BookingStatus.CONFIRMED);
    return { available: bookings.length === 0, conflictingBookings: bookings };
  },
};

// ============================================
// BOOKING MANAGEMENT
// ============================================

const Bookings = {
  create(data) {
    const id = `BOOK-${Date.now().toString(36).toUpperCase()}`;
    const booking = {
      id,
      eventId: data.eventId || '',
      venueId: data.venueId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      guestCount: data.guestCount,
      status: BookingStatus.ENQUIRY,
      quoteAmount: 0,
      advanceAmount: 0,
      services: [],
      notes: '',
      createdAt: new Date(),
    };
    stores.bookings.set(id, booking);
    return booking;
  },

  get(id) { return stores.bookings.get(id); },

  getByVenue(venueId) {
    return Array.from(stores.bookings.values()).filter(b => b.venueId === venueId);
  },

  getByEvent(eventId) {
    return Array.from(stores.bookings.values()).filter(b => b.eventId === eventId);
  },

  quote(id, amount) {
    const booking = stores.bookings.get(id);
    if (booking) {
      booking.status = BookingStatus.QUOTED;
      booking.quoteAmount = amount;
      stores.bookings.set(id, booking);
      return booking;
    }
    return null;
  },

  confirm(id, advance) {
    const booking = stores.bookings.get(id);
    if (booking) {
      booking.status = BookingStatus.CONFIRMED;
      booking.advanceAmount = advance;
      stores.bookings.set(id, booking);
      if (booking.venueId) {
        const venue = Venues.get(booking.venueId);
        if (venue) {
          venue.available = false;
          stores.venues.set(venue.id, venue);
        }
      }
      return booking;
    }
    return null;
  },

  cancel(id) {
    const booking = stores.bookings.get(id);
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
      stores.bookings.set(id, booking);
      return booking;
    }
    return null;
  },
};

// ============================================
// GUEST MANAGEMENT
// ============================================

const Guests = {
  create(data) {
    const id = `GUEST-${Date.now().toString(36).toUpperCase()}`;
    const guest = {
      id,
      eventId: data.eventId,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      company: data.company || '',
      designation: data.designation || '',
      dietary: data.dietary || 'none',
      tableNumber: null,
      seatNumber: null,
      status: 'pending',
      plusOne: data.plusOne || false,
      plusOneName: '',
      plusOneDietary: 'none',
      rsvpDate: null,
      checkIn: false,
      checkInTime: null,
      mealPreference: data.mealPreference || 'both',
      gift: null,
      notes: '',
      createdAt: new Date(),
    };
    stores.guests.set(id, guest);
    return guest;
  },

  get(id) { return stores.guests.get(id); },

  getByEvent(eventId) {
    return Array.from(stores.guests.values()).filter(g => g.eventId === eventId);
  },

  rsvp(id, status, plusOneName, plusOneDietary) {
    const guest = stores.guests.get(id);
    if (guest) {
      guest.status = status;
      guest.rsvpDate = new Date();
      if (status === 'confirmed' && plusOne) {
        guest.plusOneName = plusOneName || '';
        guest.plusOneDietary = plusOneDietary || 'none';
      }
      stores.guests.set(id, guest);

      if (status === 'confirmed') {
        const event = Events.get(guest.eventId);
        if (event) {
          event.confirmedGuests++;
          stores.events.set(event.id, event);
        }
      }
      return guest;
    }
    return null;
  },

  checkIn(id) {
    const guest = stores.guests.get(id);
    if (guest && !guest.checkIn) {
      guest.checkIn = true;
      guest.checkInTime = new Date();
      stores.guests.set(id, guest);
      return guest;
    }
    return null;
  },

  assignSeating(guestId, tableNumber, seatNumber) {
    const guest = stores.guests.get(guestId);
    if (guest) {
      guest.tableNumber = tableNumber;
      guest.seatNumber = seatNumber;
      stores.guests.set(guestId, guest);
      return guest;
    }
    return null;
  },

  getStats(eventId) {
    const guests = this.getByEvent(eventId);
    return {
      total: guests.length,
      confirmed: guests.filter(g => g.status === 'confirmed').length,
      pending: guests.filter(g => g.status === 'pending').length,
      declined: guests.filter(g => g.status === 'declined').length,
      checkedIn: guests.filter(g => g.checkIn).length,
    };
  },
};

// ============================================
// VENDOR MANAGEMENT
// ============================================

const Vendors = {
  create(data) {
    const id = `VND-${Date.now().toString(36).toUpperCase()}`;
    const vendor = {
      id,
      name: data.name,
      company: data.company || data.name,
      category: data.category,
      categories: data.categories || [data.category],
      contactName: data.contactName || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      rating: data.rating || 4.0,
      reviewCount: 0,
      priceRange: data.priceRange || 'medium',
      avgCost: data.avgCost || 50000,
      experience: data.experience || 2,
      portfolio: data.portfolio || [],
      images: data.images || [],
      services: data.services || [],
      terms: data.terms || '',
      status: 'active',
      verified: false,
      createdAt: new Date(),
    };
    stores.vendors.set(id, vendor);
    return vendor;
  },

  get(id) { return stores.vendors.get(id); },

  getAll(filters = {}) {
    let list = Array.from(stores.vendors.values());
    if (filters.category) list = list.filter(v => v.category === filters.category);
    if (filters.rating) list = list.filter(v => v.rating >= filters.rating);
    return list.sort((a, b) => b.rating - a.rating);
  },

  getByCategory(category) {
    return Array.from(stores.vendors.values())
      .filter(v => v.category === category || v.categories?.includes(category));
  },

  update(id, data) {
    const vendor = stores.vendors.get(id);
    if (vendor) {
      Object.assign(vendor, data);
      stores.vendors.set(id, vendor);
      return vendor;
    }
    return null;
  },

  rate(id, rating) {
    const vendor = stores.vendors.get(id);
    if (vendor) {
      vendor.reviewCount++;
      vendor.rating = ((vendor.rating * (vendor.reviewCount - 1)) + rating) / vendor.reviewCount;
      stores.vendors.set(id, vendor);
      return vendor;
    }
    return null;
  },
};

// ============================================
// CATERING MANAGEMENT
// ============================================

const Catering = {
  createMenu(data) {
    const id = `MENU-${Date.now().toString(36).toUpperCase()}`;
    const menu = {
      id,
      name: data.name,
      eventId: data.eventId || '',
      type: data.type || 'buffet',
      cuisine: data.cuisine || 'indian',
      pricePerPlate: data.pricePerPlate || 1500,
      sections: data.sections || [],
      dietary: data.dietary || ['vegetarian', 'non-vegetarian'],
      customization: data.customization || true,
      tastings: data.tastings || false,
      notes: '',
      createdAt: new Date(),
    };
    stores.menus.set(id, menu);
    return menu;
  },

  getMenu(id) { return stores.menus.get(id); },

  addSection(menuId, section) {
    const menu = stores.menus.get(menuId);
    if (menu) {
      const sectionId = `SEC-${Date.now().toString(36).toUpperCase()}`;
      menu.sections.push({ id: sectionId, ...section });
      stores.menus.set(menuId, menu);
      return menu;
    }
    return null;
  },

  calculateCost(menuId, guestCount) {
    const menu = stores.menus.get(menuId);
    if (menu) {
      return guestCount * menu.pricePerPlate;
    }
    return 0;
  },
};

// ============================================
// BANQUET MANAGEMENT
// ============================================

const Banquet = {
  createRoom(data) {
    const id = `BANQ-${Date.now().toString(36).toUpperCase()}`;
    const room = {
      id,
      name: data.name,
      venueId: data.venueId,
      capacity: data.capacity || 100,
      size: data.size || { length: 30, width: 20 },
      setup: data.setup || 'round',
      features: data.features || [],
      images: data.images || [],
      price: data.price || 50000,
      createdAt: new Date(),
    };
    stores.banquetRooms.set(id, room);
    return room;
  },

  getRoom(id) { return stores.banquetRooms.get(id); },

  getByVenue(venueId) {
    return Array.from(stores.banquetRooms.values()).filter(r => r.venueId === venueId);
  },

  updateSetup(id, setup) {
    const room = stores.banquetRooms.get(id);
    if (room) {
      room.setup = setup;
      stores.banquetRooms.set(id, room);
      return room;
    }
    return null;
  },
};

// ============================================
// ENTERTAINMENT MANAGEMENT
// ============================================

const Entertainment = {
  book(data) {
    const id = `ENT-${Date.now().toString(36).toUpperCase()}`;
    const entertainment = {
      id,
      eventId: data.eventId,
      type: data.type,
      name: data.name,
      artist: data.artist || '',
      duration: data.duration || 60,
      startTime: data.startTime,
      price: data.price || 0,
      equipment: data.equipment || [],
      notes: '',
      status: 'booked',
      createdAt: new Date(),
    };
    stores.entertainment.set(id, entertainment);
    return entertainment;
  },

  get(id) { return stores.entertainment.get(id); },

  getByEvent(eventId) {
    return Array.from(stores.entertainment.values()).filter(e => e.eventId === eventId);
  },

  getTypes() {
    return ['dj', 'live_band', 'singer', 'dancer', 'magician', 'comedian', 'anchor', 'photographer', 'videographer', 'decorator', 'florist'];
  },
};

// ============================================
// DECORATION MANAGEMENT
// ============================================

const Decorations = {
  create(data) {
    const id = `DEC-${Date.now().toString(36).toUpperCase()}`;
    const decoration = {
      id,
      eventId: data.eventId,
      theme: data.theme || '',
      colorScheme: data.colorScheme || '',
      stage: data.stage || true,
      entrance: data.entrance || true,
      tables: data.tables || true,
      flowers: data.flowers || [],
      lighting: data.lighting || [],
      mandap: data.mandap || false,
      backdrop: data.backdrop || true,
      price: data.price || 0,
      notes: '',
      status: 'planned',
      createdAt: new Date(),
    };
    stores.decorations.set(id, decoration);
    return decoration;
  },

  get(id) { return stores.decorations.get(id); },

  getByEvent(eventId) {
    return Array.from(stores.decorations.values()).filter(d => d.eventId === eventId);
  },

  getThemes() {
    return ['traditional', 'modern', 'floral', 'royal', 'minimalist', 'bohemian', 'rustic', 'glamorous', 'vintage', 'tropical'];
  },
};

// ============================================
// INVOICE MANAGEMENT
// ============================================

const Invoices = {
  create(data) {
    const id = `INV-${Date.now().toString(36).toUpperCase()}`;
    const invoice = {
      id,
      eventId: data.eventId,
      clientName: data.clientName || '',
      clientEmail: data.clientEmail || '',
      items: data.items || [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      paid: 0,
      due: 0,
      status: 'pending',
      dueDate: data.dueDate,
      paidDate: null,
      notes: '',
      createdAt: new Date(),
    };
    invoice.subtotal = invoice.items.reduce((sum, i) => sum + (i.amount || 0), 0);
    invoice.tax = invoice.subtotal * 0.18;
    invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
    invoice.due = invoice.total;
    stores.invoices.set(id, invoice);
    return invoice;
  },

  get(id) { return stores.invoices.get(id); },

  getByEvent(eventId) {
    return Array.from(stores.invoices.values()).filter(i => i.eventId === eventId);
  },

  addItem(invoiceId, item) {
    const invoice = stores.invoices.get(invoiceId);
    if (invoice) {
      invoice.items.push(item);
      invoice.subtotal = invoice.items.reduce((sum, i) => sum + (i.amount || 0), 0);
      invoice.tax = invoice.subtotal * 0.18;
      invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
      invoice.due = invoice.total - invoice.paid;
      stores.invoices.set(invoiceId, invoice);
      return invoice;
    }
    return null;
  },

  payment(invoiceId, amount) {
    const invoice = stores.invoices.get(invoiceId);
    if (invoice) {
      invoice.paid += amount;
      invoice.due = invoice.total - invoice.paid;
      if (invoice.due <= 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
      } else {
        invoice.status = 'partial';
      }
      stores.invoices.set(invoiceId, invoice);
      return invoice;
    }
    return null;
  },

  applyDiscount(invoiceId, discount) {
    const invoice = stores.invoices.get(invoiceId);
    if (invoice) {
      invoice.discount = discount;
      invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
      invoice.due = invoice.total - invoice.paid;
      stores.invoices.set(invoiceId, invoice);
      return invoice;
    }
    return null;
  },
};

// ============================================
// ANALYTICS
// ============================================

const Analytics = {
  getEventStats(eventId) {
    const event = Events.get(eventId);
    if (!event) return null;

    const guests = Guests.getByEvent(eventId);
    const bookings = Bookings.getByEvent(eventId);
    const invoices = Invoices.getByEvent(eventId);
    const vendors = event.vendorIds.map(id => Vendors.get(id)).filter(Boolean);

    return {
      event,
      guests: Guests.getStats(eventId),
      budget: { planned: event.budget, spent: event.spent, remaining: event.budget - event.spent },
      bookings: bookings.length,
      invoices: { total: invoices.length, paid: invoices.filter(i => i.status === 'paid').length },
      vendors: { total: vendors.length },
    };
  },

  getPlatformStats() {
    return {
      totalEvents: stores.events.size,
      upcoming: Array.from(stores.events.values()).filter(e => e.status !== EventStatus.COMPLETED).length,
      completed: Array.from(stores.events.values()).filter(e => e.status === EventStatus.COMPLETED).length,
      totalVenues: stores.venues.size,
      totalVendors: stores.vendors.size,
      totalGuests: stores.guests.size,
      revenue: Array.from(stores.invoices.values()).reduce((sum, i) => sum + i.paid, 0),
    };
  },

  getRevenue(dateRange = 'month') {
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (dateRange === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const invoices = Array.from(stores.invoices.values())
      .filter(i => new Date(i.createdAt) >= startDate);

    return {
      total: invoices.reduce((sum, i) => sum + i.total, 0),
      paid: invoices.reduce((sum, i) => sum + i.paid, 0),
      pending: invoices.reduce((sum, i) => sum + i.due, 0),
      count: invoices.length,
    };
  },
};

// ============================================
// API ROUTES
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'event-banquet-os',
    version: '1.0.0',
    port: PORT,
    modules: Object.keys(MODULES).length,
    aiAgents: AI_AGENTS.length,
    stats: Analytics.getPlatformStats(),
    timestamp: new Date().toISOString(),
  });
});

// Modules & Agents
app.get('/api/modules', (req, res) => res.json({ success: true, modules: MODULES }));
app.get('/api/agents', (req, res) => res.json({ success: true, agents: AI_AGENTS.map(a => ({ id: a.id, name: a.name, purpose: a.purpose })) }));
app.post('/api/agents/:id/run', (req, res) => {
  const agent = AI_AGENTS.find(a => a.id === req.params.id);
  if (agent) {
    res.json({ success: true, result: agent.run(req.body.data) });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// Events
app.get('/api/events', (req, res) => res.json({ success: true, events: Events.getAll(req.query) }));
app.post('/api/events', (req, res) => res.json({ success: true, event: Events.create(req.body) }));
app.get('/api/events/:id', (req, res) => {
  const event = Events.get(req.params.id);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/events/:id', (req, res) => {
  const event = Events.update(req.params.id, req.body);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/events/:id/confirm', (req, res) => {
  const event = Events.confirm(req.params.id);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/events/:id/start', (req, res) => {
  const event = Events.start(req.params.id);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/events/:id/complete', (req, res) => {
  const event = Events.complete(req.params.id);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/events/:id/cancel', (req, res) => {
  const event = Events.cancel(req.params.id);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/events/:id/expense', (req, res) => {
  const event = Events.addExpense(req.params.id, req.body);
  event ? res.json({ success: true, event }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/events/:id/analytics', (req, res) => {
  const stats = Analytics.getEventStats(req.params.id);
  stats ? res.json({ success: true, analytics: stats }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/events/:id/tasks', (req, res) => {
  const tasks = Array.from(stores.tasks.values()).filter(t => t.eventId === req.params.id);
  res.json({ success: true, tasks });
});
app.post('/api/events/:id/tasks', (req, res) => {
  const task = Events.addTask(req.params.id, req.body);
  res.json({ success: true, task });
});
app.post('/api/tasks/:id/complete', (req, res) => {
  const task = Events.completeTask(req.params.id);
  task ? res.json({ success: true, task }) : res.status(404).json({ error: 'Not found' });
});

// Venues
app.get('/api/venues', (req, res) => res.json({ success: true, venues: Venues.getAll(req.query) }));
app.post('/api/venues', (req, res) => res.json({ success: true, venue: Venues.create(req.body) }));
app.get('/api/venues/:id', (req, res) => {
  const venue = Venues.get(req.params.id);
  venue ? res.json({ success: true, venue }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/venues/:id', (req, res) => {
  const venue = Venues.update(req.params.id, req.body);
  venue ? res.json({ success: true, venue }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/venues/:id/availability', (req, res) => {
  const availability = Venues.checkAvailability(req.params.id, req.query.date);
  res.json({ success: true, ...availability });
});

// Bookings
app.get('/api/bookings', (req, res) => res.json({ success: true, bookings: Array.from(stores.bookings.values()) }));
app.post('/api/bookings', (req, res) => res.json({ success: true, booking: Bookings.create(req.body) }));
app.post('/api/bookings/:id/quote', (req, res) => {
  const booking = Bookings.quote(req.params.id, req.body.amount);
  booking ? res.json({ success: true, booking }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/bookings/:id/confirm', (req, res) => {
  const booking = Bookings.confirm(req.params.id, req.body.advance);
  booking ? res.json({ success: true, booking }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/bookings/:id/cancel', (req, res) => {
  const booking = Bookings.cancel(req.params.id);
  booking ? res.json({ success: true, booking }) : res.status(404).json({ error: 'Not found' });
});

// Guests
app.get('/api/events/:id/guests', (req, res) => res.json({ success: true, guests: Guests.getByEvent(req.params.id) }));
app.post('/api/events/:id/guests', (req, res) => {
  const guest = Guests.create({ ...req.body, eventId: req.params.id });
  res.json({ success: true, guest });
});
app.get('/api/guests/:id', (req, res) => {
  const guest = Guests.get(req.params.id);
  guest ? res.json({ success: true, guest }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/guests/:id/rsvp', (req, res) => {
  const guest = Guests.rsvp(req.params.id, req.body.status, req.body.plusOneName, req.body.plusOneDietary);
  guest ? res.json({ success: true, guest }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/guests/:id/checkin', (req, res) => {
  const guest = Guests.checkIn(req.params.id);
  guest ? res.json({ success: true, guest }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/guests/:id/seating', (req, res) => {
  const guest = Guests.assignSeating(req.params.id, req.body.tableNumber, req.body.seatNumber);
  guest ? res.json({ success: true, guest }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/events/:id/guests/stats', (req, res) => {
  res.json({ success: true, stats: Guests.getStats(req.params.id) });
});

// Vendors
app.get('/api/vendors', (req, res) => res.json({ success: true, vendors: Vendors.getAll(req.query) }));
app.post('/api/vendors', (req, res) => res.json({ success: true, vendor: Vendors.create(req.body) }));
app.get('/api/vendors/:id', (req, res) => {
  const vendor = Vendors.get(req.params.id);
  vendor ? res.json({ success: true, vendor }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/vendors/category/:category', (req, res) => {
  res.json({ success: true, vendors: Vendors.getByCategory(req.params.category) });
});
app.post('/api/vendors/:id/rate', (req, res) => {
  const vendor = Vendors.rate(req.params.id, req.body.rating);
  vendor ? res.json({ success: true, vendor }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/vendor-categories', (req, res) => {
  res.json({ success: true, categories: ['caterer', 'decorator', 'photographer', 'dj', 'florist', 'makeup', 'transport', 'invitation', 'venue', 'other'] });
});

// Catering
app.get('/api/menus', (req, res) => res.json({ success: true, menus: Array.from(stores.menus.values()) }));
app.post('/api/menus', (req, res) => res.json({ success: true, menu: Catering.createMenu(req.body) }));
app.get('/api/menus/:id', (req, res) => {
  const menu = Catering.getMenu(req.params.id);
  menu ? res.json({ success: true, menu }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/menus/:id/sections', (req, res) => {
  const menu = Catering.addSection(req.params.id, req.body);
  menu ? res.json({ success: true, menu }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/menus/:id/cost', (req, res) => {
  const cost = Catering.calculateCost(req.params.id, parseInt(req.query.guests) || 100);
  res.json({ success: true, cost });
});

// Banquet Rooms
app.get('/api/banquet-rooms', (req, res) => res.json({ success: true, rooms: Array.from(stores.banquetRooms.values()) }));
app.post('/api/banquet-rooms', (req, res) => res.json({ success: true, room: Banquet.createRoom(req.body) }));
app.get('/api/banquet-rooms/:id', (req, res) => {
  const room = Banquet.getRoom(req.params.id);
  room ? res.json({ success: true, room }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/venues/:id/banquet-rooms', (req, res) => {
  res.json({ success: true, rooms: Banquet.getByVenue(req.params.id) });
});

// Entertainment
app.get('/api/entertainment', (req, res) => res.json({ success: true, entertainment: Array.from(stores.entertainment.values()) }));
app.post('/api/entertainment', (req, res) => res.json({ success: true, entertainment: Entertainment.book(req.body) }));
app.get('/api/entertainment/types', (req, res) => res.json({ success: true, types: Entertainment.getTypes() }));
app.get('/api/events/:id/entertainment', (req, res) => {
  res.json({ success: true, entertainment: Entertainment.getByEvent(req.params.id) });
});

// Decorations
app.get('/api/decorations', (req, res) => res.json({ success: true, decorations: Array.from(stores.decorations.values()) }));
app.post('/api/decorations', (req, res) => res.json({ success: true, decoration: Decorations.create(req.body) }));
app.get('/api/decorations/themes', (req, res) => res.json({ success: true, themes: Decorations.getThemes() }));
app.get('/api/events/:id/decorations', (req, res) => {
  res.json({ success: true, decoration: Decorations.getByEvent(req.params.id)[0] || null });
});

// Invoices
app.get('/api/invoices', (req, res) => res.json({ success: true, invoices: Array.from(stores.invoices.values()) }));
app.post('/api/invoices', (req, res) => res.json({ success: true, invoice: Invoices.create(req.body) }));
app.get('/api/invoices/:id', (req, res) => {
  const invoice = Invoices.get(req.params.id);
  invoice ? res.json({ success: true, invoice }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/invoices/:id/items', (req, res) => {
  const invoice = Invoices.addItem(req.params.id, req.body);
  invoice ? res.json({ success: true, invoice }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/invoices/:id/payment', (req, res) => {
  const invoice = Invoices.payment(req.params.id, req.body.amount);
  invoice ? res.json({ success: true, invoice }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/invoices/:id/discount', (req, res) => {
  const invoice = Invoices.applyDiscount(req.params.id, req.body.amount);
  invoice ? res.json({ success: true, invoice }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/events/:id/invoices', (req, res) => {
  res.json({ success: true, invoices: Invoices.getByEvent(req.params.id) });
});

// Analytics
app.get('/api/analytics/platform', (req, res) => res.json({ success: true, stats: Analytics.getPlatformStats() }));
app.get('/api/analytics/revenue', (req, res) => res.json({ success: true, ...Analytics.getRevenue(req.query.range || 'month') }));

// Start
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                   Event & Banquet OS v1.0.0                    ║
║                       Port: ${PORT}                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                              ║
║  Modules: ${Object.keys(MODULES).length}                                              ║
║  AI Agents: ${AI_AGENTS.length}                                             ║
║                                                              ║
║  Features:                                               ║
║  ✅ Event Management                                    ║
║  ✅ Venue Booking & Management                          ║
║  ✅ Guest RSVP & Check-in                              ║
║  ✅ Vendor Directory                                   ║
║  ✅ Catering & Menu Planning                           ║
║  ✅ Banquet Room Setup                                  ║
║  ✅ Entertainment Booking                               ║
║  ✅ Decoration & Themes                                 ║
║  ✅ Invoice & Payment                                   ║
║  ✅ Task Management                                    ║
║  ✅ AI Planning & Recommendations                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});
