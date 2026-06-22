/**
 * RAZO KEYBOARD - SMART SUGGESTION LAYER
 *
 * Genie Briefs - Proactive cards when keyboard opens
 * Powered by Genie, MemoryOS, Calendar, Wallet, Travel
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const PORT = parseInt(process.env.PORT || '4651', 10);

// Service URLs
const SERVICES = {
  genie: process.env.GENIE_URL || 'http://localhost:4760',
  memory: process.env.MEMORY_URL || 'http://localhost:4520',
  relationship: process.env.RELATIONSHIP_URL || 'http://localhost:4702',
  calendar: process.env.CALENDAR_URL || 'http://localhost:4760',
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  airzy: process.env.AIRZY_URL || 'http://localhost:4800',
  copilot: process.env.COPILOT_URL || 'http://localhost:4760',
};

// ============================================
// SUGGESTION TYPES
// ============================================

interface SuggestionCard {
  id: string;
  type: 'genie' | 'calendar' | 'relationship' | 'wallet' | 'travel' | 'business' | 'health';
  priority: number;
  title: string;
  subtitle?: string;
  icon: string;
  actions: Action[];
  expiresAt?: Date;
  data?: any;
}

interface Action {
  label: string;
  type: 'execute' | 'deeplink' | 'genie' | 'dismiss';
  value: string;
  icon?: string;
}

// ============================================
// SUGGESTION ENGINES
// ============================================

class SuggestionEngine {
  private userId: string;
  private context: SuggestionContext;

  constructor(userId: string, context: SuggestionContext) {
    this.userId = userId;
    this.context = context;
  }

  /**
   * Get all suggestions for keyboard open
   */
  async getSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    // Fetch from all sources in parallel
    const [
      genieSuggestions,
      calendarSuggestions,
      relationshipSuggestions,
      walletSuggestions,
      travelSuggestions,
      businessSuggestions,
    ] = await Promise.allSettled([
      this.getGenieSuggestions(),
      this.getCalendarSuggestions(),
      this.getRelationshipSuggestions(),
      this.getWalletSuggestions(),
      this.getTravelSuggestions(),
      this.getBusinessSuggestions(),
    ]);

    // Collect successful results
    if (genieSuggestions.status === 'fulfilled') suggestions.push(...genieSuggestions.value);
    if (calendarSuggestions.status === 'fulfilled') suggestions.push(...calendarSuggestions.value);
    if (relationshipSuggestions.status === 'fulfilled') suggestions.push(...relationshipSuggestions.value);
    if (walletSuggestions.status === 'fulfilled') suggestions.push(...walletSuggestions.value);
    if (travelSuggestions.status === 'fulfilled') suggestions.push(...travelSuggestions.value);
    if (businessSuggestions.status === 'fulfilled') suggestions.push(...businessSuggestions.value);

    // Sort by priority
    suggestions.sort((a, b) => a.priority - b.priority);

    // Return top 5
    return suggestions.slice(0, 5);
  }

  /**
   * Genie Suggestions (Tasks, Reminders)
   */
  private async getGenieSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      // Get tasks and reminders from Genie
      const response = await axios.get(`${SERVICES.genie}/api/briefing/${this.userId}`, {
        timeout: 2000,
      });

      const briefing = response.data;

      // Task due today
      if (briefing.tasks?.length > 0) {
        const urgentTask = briefing.tasks[0];
        suggestions.push({
          id: 'genie-task',
          type: 'genie',
          priority: 1,
          title: urgentTask.title,
          subtitle: `Due ${urgentTask.dueIn || 'today'}`,
          icon: '📋',
          actions: [
            { label: 'Complete', type: 'execute', value: `complete:${urgentTask.id}`, icon: '✅' },
            { label: 'Snooze', type: 'execute', value: `snooze:${urgentTask.id}`, icon: '⏰' },
          ],
        });
      }

      // Reminders
      if (briefing.reminders?.length > 0) {
        const reminder = briefing.reminders[0];
        suggestions.push({
          id: 'genie-reminder',
          type: 'genie',
          priority: 2,
          title: reminder.title,
          subtitle: reminder.time,
          icon: '🔔',
          actions: [
            { label: 'Open', type: 'genie', value: `reminder:${reminder.id}` },
          ],
        });
      }
    } catch {
      // Genie not available
    }

    return suggestions;
  }

  /**
   * Calendar Suggestions
   */
  private async getCalendarSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      const response = await axios.get(`${SERVICES.calendar}/api/events/today`, {
        timeout: 2000,
      });

      const events = response.data.events || [];

      // Next meeting
      if (events.length > 0) {
        const nextEvent = events[0];
        const minutesUntil = this.getMinutesUntil(nextEvent.startTime);

        suggestions.push({
          id: 'calendar-meeting',
          type: 'calendar',
          priority: minutesUntil < 30 ? 1 : 3,
          title: nextEvent.title,
          subtitle: minutesUntil < 60 ? `In ${minutesUntil} minutes` : nextEvent.startTime,
          icon: '📅',
          actions: [
            { label: 'Join', type: 'deeplink', value: nextEvent.joinLink || 'calendar://join' },
            { label: 'Prepare', type: 'genie', value: `prepare:${nextEvent.id}` },
          ],
          expiresAt: new Date(nextEvent.startTime),
        });

        // Birthday check
        if (nextEvent.isBirthday) {
          suggestions.push({
            id: 'calendar-birthday',
            type: 'relationship',
            priority: 1,
            title: `${nextEvent.contactName}'s birthday today!`,
            subtitle: 'Send your wishes',
            icon: '🎂',
            actions: [
              { label: 'Wish Now', type: 'genie', value: `birthday:${nextEvent.contactId}`, icon: '🎉' },
              { label: 'Call', type: 'deeplink', value: `tel:${nextEvent.contactPhone}`, icon: '📞' },
              { label: 'Message', type: 'deeplink', value: `whatsapp:${nextEvent.contactPhone}`, icon: '💬' },
            ],
            expiresAt: new Date(nextEvent.startTime),
          });
        }
      }
    } catch {
      // Calendar not available
    }

    return suggestions;
  }

  /**
   * Relationship Suggestions
   */
  private async getRelationshipSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      const response = await axios.get(`${SERVICES.relationship}/api/suggestions/${this.userId}`, {
        timeout: 2000,
      });

      const suggestions_data = response.data.suggestions || [];

      // Follow-up needed
      const followUps = suggestions_data.filter((s: any) => s.type === 'follow_up');
      if (followUps.length > 0) {
        const followUp = followUps[0];
        suggestions.push({
          id: 'relationship-followup',
          type: 'relationship',
          priority: 2,
          title: `Follow up with ${followUp.contactName}`,
          subtitle: `Last contact ${followUp.daysSince} days ago`,
          icon: '📧',
          actions: [
            { label: 'Send Email', type: 'genie', value: `followup:email:${followUp.contactId}`, icon: '📧' },
            { label: 'WhatsApp', type: 'deeplink', value: `whatsapp:${followUp.contactPhone}`, icon: '💬' },
            { label: 'Call', type: 'deeplink', value: `tel:${followUp.contactPhone}`, icon: '📞' },
          ],
        });
      }

      // Birthday soon
      const birthdays = suggestions_data.filter((s: any) => s.type === 'birthday');
      if (birthdays.length > 0) {
        const birthday = birthdays[0];
        suggestions.push({
          id: 'relationship-birthday',
          type: 'relationship',
          priority: 1,
          title: `${birthday.contactName}'s birthday ${birthday.isToday ? 'today' : 'tomorrow'}`,
          subtitle: birthday.isToday ? 'Send your wishes!' : 'Plan ahead',
          icon: '🎂',
          actions: [
            { label: 'Generate Message', type: 'genie', value: `birthday:${birthday.contactId}`, icon: '✨' },
            { label: 'Buy Gift', type: 'deeplink', value: 'nexha://gifts', icon: '🎁' },
          ],
          expiresAt: birthday.expiresAt,
        });
      }
    } catch {
      // Relationship service not available
    }

    return suggestions;
  }

  /**
   * Wallet Suggestions
   */
  private async getWalletSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      const response = await axios.get(`${SERVICES.wallet}/api/suggestions/${this.userId}`, {
        timeout: 2000,
      });

      const walletData = response.data;

      // Cashback expiring
      if (walletData.cashbackExpiring?.amount > 0) {
        suggestions.push({
          id: 'wallet-cashback',
          type: 'wallet',
          priority: 2,
          title: `₹${walletData.cashbackExpiring.amount} cashback expires ${walletData.cashbackExpiring.expiresIn}`,
          subtitle: 'Use it before it expires!',
          icon: '💰',
          actions: [
            { label: 'Use Now', type: 'deeplink', value: 'rezwallet://pay', icon: '🛒' },
            { label: 'Send', type: 'deeplink', value: 'rezwallet://send', icon: '💸' },
          ],
          expiresAt: walletData.cashbackExpiring.expiresAt,
        });
      }

      // Bill due
      if (walletData.billDue) {
        suggestions.push({
          id: 'wallet-bill',
          type: 'wallet',
          priority: walletData.billDue.isUrgent ? 1 : 3,
          title: `Bill due: ₹${walletData.billDue.amount}`,
          subtitle: walletData.billDue.isUrgent ? 'Due tomorrow!' : `Due ${walletData.billDue.dueIn}`,
          icon: '📄',
          actions: [
            { label: 'Pay Now', type: 'deeplink', value: `rezwallet://pay:${walletData.billDue.billId}`, icon: '💳' },
          ],
          expiresAt: walletData.billDue.dueAt,
        });
      }

      // Reward unlocked
      if (walletData.rewardUnlocked) {
        suggestions.push({
          id: 'wallet-reward',
          type: 'wallet',
          priority: 3,
          title: '🎉 Reward Unlocked!',
          subtitle: walletData.rewardUnlocked.title,
          icon: '🎁',
          actions: [
            { label: 'Claim', type: 'deeplink', value: `rezwallet://reward:${walletData.rewardUnlocked.id}`, icon: '🎉' },
          ],
        });
      }
    } catch {
      // Wallet not available
    }

    return suggestions;
  }

  /**
   * Travel Suggestions
   */
  private async getTravelSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      const response = await axios.get(`${SERVICES.airzy}/api/suggestions/${this.userId}`, {
        timeout: 2000,
      });

      const travel = response.data;

      // Flight check-in
      if (travel.flightCheckIn) {
        suggestions.push({
          id: 'travel-checkin',
          type: 'travel',
          priority: 1,
          title: `${travel.flightCheckIn.airline} check-in open`,
          subtitle: `Flight ${travel.flightCheckIn.flightNumber} - ${travel.flightCheckIn.departure}`,
          icon: '✈️',
          actions: [
            { label: 'Check In', type: 'deeplink', value: `airzy://checkin:${travel.flightCheckIn.bookingId}`, icon: '✅' },
            { label: 'View Details', type: 'deeplink', value: `airzy://flight:${travel.flightCheckIn.bookingId}`, icon: '🔍' },
          ],
          expiresAt: travel.flightCheckIn.checkInClosesAt,
        });
      }

      // Flight status
      if (travel.flightStatus) {
        const status = travel.flightStatus;
        const isDelayed = status.delay > 0;

        suggestions.push({
          id: 'travel-status',
          type: 'travel',
          priority: isDelayed ? 1 : 3,
          title: `Flight ${status.flightNumber} ${isDelayed ? `Delayed ${status.delay} mins` : 'On Time'}`,
          subtitle: `${status.departure} → ${status.arrival}`,
          icon: isDelayed ? '⚠️' : '✈️',
          actions: [
            { label: 'Details', type: 'deeplink', value: `airzy://flight:${status.bookingId}`, icon: '🔍' },
            { label: 'Share', type: 'genie', value: `shareflight:${status.bookingId}`, icon: '📤' },
          ],
        });
      }

      // Hotel booking
      if (travel.hotelBooking) {
        suggestions.push({
          id: 'travel-hotel',
          type: 'travel',
          priority: 2,
          title: `${travel.hotelBooking.hotelName} check-in ${travel.hotelBooking.checkInTime}`,
          subtitle: travel.hotelBooking.address,
          icon: '🏨',
          actions: [
            { label: 'Directions', type: 'deeplink', value: `stayown://hotel:${travel.hotelBooking.bookingId}`, icon: '📍' },
            { label: 'Room Service', type: 'deeplink', value: `stayown://roomservice:${travel.hotelBooking.bookingId}`, icon: '🍽️' },
          ],
        });
      }
    } catch {
      // Airzy not available
    }

    return suggestions;
  }

  /**
   * Business Suggestions (CoPilot)
   */
  private async getBusinessSuggestions(): Promise<SuggestionCard[]> {
    const suggestions: SuggestionCard[] = [];

    try {
      const response = await axios.get(`${SERVICES.copilot}/api/suggestions/${this.userId}`, {
        timeout: 2000,
      });

      const business = response.data;

      // Hot leads
      if (business.hotLeads?.length > 0) {
        suggestions.push({
          id: 'business-leads',
          type: 'business',
          priority: 2,
          title: `${business.hotLeads.length} hot leads need follow-up`,
          subtitle: 'High priority leads',
          icon: '🔥',
          actions: [
            { label: 'Follow Up', type: 'copilot', value: 'followup:leads', icon: '📧' },
            { label: 'Generate Report', type: 'copilot', value: 'report:leads', icon: '📊' },
          ],
        });
      }

      // Revenue alert
      if (business.revenueAlert) {
        suggestions.push({
          id: 'business-revenue',
          type: 'business',
          priority: business.revenueAlert.isNegative ? 1 : 3,
          title: business.revenueAlert.isNegative
            ? `Sales down ${business.revenueAlert.change}%`
            : `Sales up ${business.revenueAlert.change}%`,
          subtitle: business.revenueAlert.period,
          icon: business.revenueAlert.isNegative ? '📉' : '📈',
          actions: [
            { label: 'Analyze', type: 'copilot', value: 'analyze:revenue', icon: '🔍' },
            { label: 'Report', type: 'copilot', value: 'report:revenue', icon: '📊' },
          ],
        });
      }

      // Inventory alert
      if (business.inventoryAlert) {
        suggestions.push({
          id: 'business-inventory',
          type: 'business',
          priority: 2,
          title: 'Low inventory alert',
          subtitle: `${business.inventoryAlert.items} items running low`,
          icon: '⚠️',
          actions: [
            { label: 'Reorder', type: 'deeplink', value: 'nexha://reorder', icon: '📦' },
            { label: 'View List', type: 'copilot', value: 'inventory:list', icon: '📋' },
          ],
        });
      }
    } catch {
      // CoPilot not available
    }

    return suggestions;
  }

  /**
   * Calculate minutes until time
   */
  private getMinutesUntil(time: string): number {
    const diff = new Date(time).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 60000));
  }
}

interface SuggestionContext {
  currentApp?: string;
  currentChat?: string;
  language?: string;
}

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-smart-suggestions',
    version: '1.0.0',
    cardTypes: ['genie', 'calendar', 'relationship', 'wallet', 'travel', 'business'],
  });
});

// Get suggestions for keyboard open
app.get('/api/suggestions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const context: SuggestionContext = {
      currentApp: req.query.app as string,
      currentChat: req.query.chat as string,
      language: req.query.lang as string,
    };

    const engine = new SuggestionEngine(userId, context);
    const suggestions = await engine.getSuggestions();

    res.json({
      suggestions,
      count: suggestions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get suggestions by type
app.get('/api/suggestions/:userId/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;
    const engine = new SuggestionEngine(userId, {});
    const allSuggestions = await engine.getSuggestions();
    const filtered = allSuggestions.filter(s => s.type === type);

    res.json({
      suggestions: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute action
app.post('/api/execute', async (req, res) => {
  try {
    const { action, cardId, data } = req.body;

    // Route action based on type
    switch (action.type) {
      case 'execute':
        // Execute Genie task
        res.json({ executed: true, action: 'genie_task', taskId: data });
        break;
      case 'deeplink':
        // Return deep link to open app
        res.json({ executed: true, deeplink: action.value });
        break;
      case 'genie':
        // Ask Genie to generate content
        res.json({ executed: true, genieAction: action.value });
        break;
      case 'copilot':
        // Ask CoPilot to perform task
        res.json({ executed: true, copilotAction: action.value });
        break;
      default:
        res.json({ executed: false, error: 'Unknown action type' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Contextual suggestions while typing
app.post('/api/contextual', async (req, res) => {
  try {
    const { userId, text, app } = req.body;

    const suggestions: SuggestionCard[] = [];
    const lower = text.toLowerCase();

    // Context-aware suggestions based on typing
    if (lower.includes('flight') || lower.includes('fly')) {
      suggestions.push({
        id: 'contextual-flight',
        type: 'travel',
        priority: 1,
        title: 'Search flights',
        subtitle: 'Book your next trip',
        icon: '✈️',
        actions: [
          { label: 'Search', type: 'deeplink', value: 'airzy://flight-search', icon: '🔍' },
        ],
      });
    }

    if (lower.includes('hotel') || lower.includes('stay')) {
      suggestions.push({
        id: 'contextual-hotel',
        type: 'travel',
        priority: 1,
        title: 'Book hotel',
        subtitle: 'Find the perfect stay',
        icon: '🏨',
        actions: [
          { label: 'Search', type: 'deeplink', value: 'stayown://search', icon: '🔍' },
        ],
      });
    }

    if (lower.includes('cab') || lower.includes('taxi') || lower.includes('ride')) {
      suggestions.push({
        id: 'contextual-cab',
        type: 'travel',
        priority: 1,
        title: 'Book a cab',
        subtitle: 'Get a ride now',
        icon: '🚗',
        actions: [
          { label: 'Book', type: 'deeplink', value: 'khaimove://book', icon: '📍' },
        ],
      });
    }

    if (lower.includes('report') || lower.includes('sales') || lower.includes('business')) {
      suggestions.push({
        id: 'contextual-report',
        type: 'business',
        priority: 1,
        title: 'Generate report',
        subtitle: 'Ask CoPilot',
        icon: '📊',
        actions: [
          { label: 'Generate', type: 'copilot', value: 'report:business', icon: '✨' },
        ],
      });
    }

    if (lower.includes('email') || lower.includes('mail')) {
      suggestions.push({
        id: 'contextual-email',
        type: 'genie',
        priority: 2,
        title: 'Draft email',
        subtitle: 'Genie can help',
        icon: '📧',
        actions: [
          { label: 'Draft', type: 'genie', value: 'draft:email', icon: '✨' },
        ],
      });
    }

    if (lower.includes('birthday') || lower.includes('wish')) {
      suggestions.push({
        id: 'contextual-birthday',
        type: 'relationship',
        priority: 1,
        title: 'Generate birthday message',
        subtitle: 'Personalized wish',
        icon: '🎂',
        actions: [
          { label: 'Generate', type: 'genie', value: 'birthday:message', icon: '✨' },
        ],
      });
    }

    res.json({
      suggestions,
      count: suggestions.length,
      context: { text, app },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Smart Suggestions (4651)                 ║
║                                                       ║
║   Genie Briefs - Proactive Cards:                   ║
║   ├── Genie (Tasks, Reminders)                      ║
║   ├── Calendar (Meetings, Birthdays)                 ║
║   ├── Relationship (Follow-ups)                     ║
║   ├── Wallet (Cashback, Bills)                      ║
║   ├── Travel (Flights, Hotels)                     ║
║   └── Business (Leads, Revenue)                     ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;