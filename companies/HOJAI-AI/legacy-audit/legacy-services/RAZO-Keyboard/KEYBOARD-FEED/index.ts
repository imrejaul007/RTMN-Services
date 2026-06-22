/**
 * RAZO KEYBOARD - KEYBOARD FEED
 *
 * "Today's Story" - Home dashboard when keyboard opens
 * Shows: Meetings, Travel, Tasks, Birthdays, Wallet, etc.
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

const PORT = parseInt(process.env.PORT || '4655', 10);

// Service URLs
const SERVICES = {
  genie: process.env.GENIE_URL || 'http://localhost:4760',
  memory: process.env.MEMORY_URL || 'http://localhost:4520',
  relationship: process.env.RELATIONSHIP_URL || 'http://localhost:4702',
  calendar: process.env.CALENDAR_URL || 'http://localhost:4760',
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  airzy: process.env.AIRZY_URL || 'http://localhost:4800',
  stayown: process.env.STAYOWN_URL || 'http://localhost:4801',
  copilot: process.env.COPILOT_URL || 'http://localhost:4760',
};

// ============================================
// FEED TYPES
// ============================================

interface FeedItem {
  id: string;
  type: 'greeting' | 'meeting' | 'travel' | 'task' | 'birthday' | 'wallet' | 'reminder' | 'weather' | 'news';
  priority: number;
  title: string;
  subtitle?: string;
  icon: string;
  time?: string;
  actions?: FeedAction[];
  data?: any;
}

interface FeedAction {
  label: string;
  type: 'deeplink' | 'genie' | 'execute';
  value: string;
  icon?: string;
}

interface KeyboardFeed {
  greeting: string;
  date: string;
  daySummary: string;
  items: FeedItem[];
  quickActions: FeedAction[];
}

// ============================================
// FEED BUILDER
// ============================================

class FeedBuilder {
  private userId: string;
  private time: Date;

  constructor(userId: string) {
    this.userId = userId;
    this.time = new Date();
  }

  /**
   * Build complete keyboard feed
   */
  async buildFeed(): Promise<KeyboardFeed> {
    const items: FeedItem[] = [];

    // Fetch all data in parallel
    const [briefing, travel, wallet] = await Promise.allSettled([
      this.getBriefing(),
      this.getTravel(),
      this.getWallet(),
    ]);

    // Collect items
    if (briefing.status === 'fulfilled') items.push(...briefing.value);
    if (travel.status === 'fulfilled') items.push(...travel.value);
    if (wallet.status === 'fulfilled') items.push(...wallet.value);

    // Sort by priority
    items.sort((a, b) => a.priority - b.priority);

    // Generate greeting
    const greeting = this.generateGreeting();

    // Generate day summary
    const daySummary = this.generateDaySummary(items);

    // Quick actions
    const quickActions = this.getQuickActions(items);

    return {
      greeting,
      date: this.time.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      daySummary,
      items: items.slice(0, 8), // Top 8 items
      quickActions,
    };
  }

  /**
   * Generate time-based greeting
   */
  private generateGreeting(): string {
    const hour = this.time.getHours();

    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Generate day summary
   */
  private generateDaySummary(items: FeedItem[]): string {
    const meetings = items.filter(i => i.type === 'meeting').length;
    const travel = items.filter(i => i.type === 'travel').length;
    const tasks = items.filter(i => i.type === 'task').length;
    const birthdays = items.filter(i => i.type === 'birthday').length;

    const parts: string[] = [];

    if (meetings > 0) parts.push(`${meetings} meeting${meetings > 1 ? 's' : ''}`);
    if (travel > 0) parts.push(`${travel} trip${travel > 1 ? 's' : ''}`);
    if (tasks > 0) parts.push(`${tasks} task${tasks > 1 ? 's' : ''}`);
    if (birthdays > 0) parts.push(`🎂 birthday`);

    if (parts.length === 0) return 'A light day ahead';

    return parts.join(' • ') + ' today';
  }

  /**
   * Get quick actions based on context
   */
  private getQuickActions(items: FeedItem[]): FeedAction[] {
    const actions: FeedAction[] = [];

    // Meeting soon
    const nextMeeting = items.find(i => i.type === 'meeting');
    if (nextMeeting) {
      actions.push({
        label: 'Join Meeting',
        type: 'deeplink',
        value: 'calendar://join',
        icon: '📹',
      });
    }

    // Travel today
    const nextTravel = items.find(i => i.type === 'travel');
    if (nextTravel) {
      actions.push({
        label: 'View Trip',
        type: 'deeplink',
        value: 'airzy://trip',
        icon: '✈️',
      });
    }

    // Task due
    const urgentTask = items.find(i => i.type === 'task');
    if (urgentTask) {
      actions.push({
        label: 'Do Task',
        type: 'execute',
        value: `task:${urgentTask.id}`,
        icon: '✅',
      });
    }

    // Birthday
    const birthday = items.find(i => i.type === 'birthday');
    if (birthday) {
      actions.push({
        label: 'Send Wish',
        type: 'genie',
        value: `birthday:${birthday.id}`,
        icon: '🎂',
      });
    }

    // Wallet action
    const walletItem = items.find(i => i.type === 'wallet');
    if (walletItem) {
      actions.push({
        label: 'Use Now',
        type: 'deeplink',
        value: 'rezwallet://pay',
        icon: '💰',
      });
    }

    // Always show Genie
    actions.push({
      label: 'Ask Genie',
      type: 'genie',
      value: 'ask',
      icon: '🤖',
    });

    return actions.slice(0, 4);
  }

  /**
   * Get briefing from Genie
   */
  private async getBriefing(): Promise<FeedItem[]> {
    const items: FeedItem[] = [];

    try {
      const response = await axios.get(`${SERVICES.genie}/api/briefing/${this.userId}`, {
        timeout: 3000,
      });

      const briefing = response.data;

      // Meetings
      if (briefing.meetings?.length > 0) {
        const next = briefing.meetings[0];
        const minutesUntil = this.getMinutesUntil(next.startTime);

        items.push({
          id: 'next-meeting',
          type: 'meeting',
          priority: minutesUntil < 30 ? 1 : 5,
          title: next.title,
          subtitle: `${minutesUntil} min away • ${next.attendees || ''}`,
          icon: '📅',
          time: next.startTime,
          actions: [
            { label: 'Join', type: 'deeplink', value: next.joinLink || 'calendar://join', icon: '📹' },
            { label: 'Prep', type: 'genie', value: `prepare:${next.id}`, icon: '📝' },
          ],
        });

        // Additional meetings
        for (let i = 1; i < Math.min(briefing.meetings.length, 3); i++) {
          const m = briefing.meetings[i];
          items.push({
            id: `meeting-${i}`,
            type: 'meeting',
            priority: 6,
            title: m.title,
            subtitle: m.startTime,
            icon: '📅',
          });
        }
      }

      // Tasks
      if (briefing.tasks?.length > 0) {
        const urgent = briefing.tasks.find((t: any) => t.urgent);
        if (urgent) {
          items.push({
            id: 'urgent-task',
            type: 'task',
            priority: 2,
            title: urgent.title,
            subtitle: 'Due today',
            icon: '⚠️',
            actions: [
              { label: 'Complete', type: 'execute', value: `complete:${urgent.id}`, icon: '✅' },
              { label: 'Snooze', type: 'execute', value: `snooze:${urgent.id}`, icon: '⏰' },
            ],
          });
        }
      }

      // Birthdays
      if (briefing.birthdays?.length > 0) {
        const birthday = briefing.birthdays[0];
        items.push({
          id: 'birthday-today',
          type: 'birthday',
          priority: 1,
          title: `${birthday.name}'s birthday today!`,
          subtitle: 'Send your wishes',
          icon: '🎂',
          actions: [
            { label: 'Wish', type: 'genie', value: `birthday:${birthday.contactId}`, icon: '🎉' },
            { label: 'Call', type: 'deeplink', value: `tel:${birthday.phone}`, icon: '📞' },
          ],
        });
      }

      // Weather (if available)
      if (briefing.weather) {
        items.push({
          id: 'weather',
          type: 'weather',
          priority: 8,
          title: briefing.weather.condition,
          subtitle: `${briefing.weather.temp}° - ${briefing.weather.suggestion || ''}`,
          icon: this.getWeatherEmoji(briefing.weather.condition),
        });
      }
    } catch {
      // Genie not available
    }

    return items;
  }

  /**
   * Get travel items
   */
  private async getTravel(): Promise<FeedItem[]> {
    const items: FeedItem[] = [];

    try {
      // Check Airzy for flights
      const airzyResponse = await axios.get(`${SERVICES.airzy}/api/upcoming/${this.userId}`, {
        timeout: 3000,
      });

      const flights = airzyResponse.data.flights || [];

      for (const flight of flights.slice(0, 2)) {
        const isToday = this.isToday(flight.date);
        const isTomorrow = this.isTomorrow(flight.date);

        items.push({
          id: `flight-${flight.id}`,
          type: 'travel',
          priority: isToday ? 1 : isTomorrow ? 3 : 7,
          title: `${flight.airline} ${flight.flightNumber}`,
          subtitle: `${flight.departure} → ${flight.arrival} • ${flight.time}`,
          icon: flight.status === 'delayed' ? '⚠️' : '✈️',
          actions: [
            { label: 'Check In', type: 'deeplink', value: `airzy://checkin:${flight.id}`, icon: '✅' },
            { label: 'Details', type: 'deeplink', value: `airzy://flight:${flight.id}`, icon: '🔍' },
          ],
          data: flight,
        });
      }

      // Check StayOwn for hotels
      const stayownResponse = await axios.get(`${SERVICES.stayown}/api/upcoming/${this.userId}`, {
        timeout: 3000,
      });

      const hotels = stayownResponse.data.bookings || [];

      for (const hotel of hotels.slice(0, 1)) {
        items.push({
          id: `hotel-${hotel.id}`,
          type: 'travel',
          priority: 4,
          title: hotel.hotelName,
          subtitle: `Check-in ${hotel.checkIn}`,
          icon: '🏨',
          actions: [
            { label: 'Directions', type: 'deeplink', value: `stayown://hotel:${hotel.id}`, icon: '📍' },
            { label: 'Room Service', type: 'deeplink', value: `stayown://roomservice:${hotel.id}`, icon: '🍽️' },
          ],
        });
      }
    } catch {
      // Travel services not available
    }

    return items;
  }

  /**
   * Get wallet items
   */
  private async getWallet(): Promise<FeedItem[]> {
    const items: FeedItem[] = [];

    try {
      const response = await axios.get(`${SERVICES.wallet}/api/alerts/${this.userId}`, {
        timeout: 3000,
      });

      const wallet = response.data;

      // Cashback expiring
      if (wallet.cashbackExpiring) {
        items.push({
          id: 'cashback',
          type: 'wallet',
          priority: 3,
          title: `₹${wallet.cashbackExpiring.amount} cashback expires`,
          subtitle: wallet.cashbackExpiring.expiresIn,
          icon: '💰',
          actions: [
            { label: 'Use Now', type: 'deeplink', value: 'rezwallet://pay', icon: '🛒' },
            { label: 'Send', type: 'deeplink', value: 'rezwallet://send', icon: '💸' },
          ],
        });
      }

      // Bill due
      if (wallet.billDue) {
        items.push({
          id: 'bill-due',
          type: 'wallet',
          priority: wallet.billDue.isUrgent ? 2 : 6,
          title: `Bill due: ₹${wallet.billDue.amount}`,
          subtitle: wallet.billDue.isUrgent ? 'Due tomorrow!' : `Due ${wallet.billDue.dueIn}`,
          icon: '📄',
          actions: [
            { label: 'Pay', type: 'deeplink', value: `rezwallet://pay:${wallet.billDue.id}`, icon: '💳' },
          ],
        });
      }

      // Low balance
      if (wallet.lowBalance) {
        items.push({
          id: 'low-balance',
          type: 'wallet',
          priority: 5,
          title: 'Low balance warning',
          subtitle: `₹${wallet.balance} remaining`,
          icon: '⚠️',
        });
      }
    } catch {
      // Wallet not available
    }

    return items;
  }

  /**
   * Get minutes until time
   */
  private getMinutesUntil(timeString: string): number {
    const diff = new Date(timeString).getTime() - this.time.getTime();
    return Math.max(0, Math.floor(diff / 60000));
  }

  /**
   * Check if date is today
   */
  private isToday(dateString: string): boolean {
    const date = new Date(dateString);
    return date.toDateString() === this.time.toDateString();
  }

  /**
   * Check if date is tomorrow
   */
  private isTomorrow(dateString: string): boolean {
    const date = new Date(dateString);
    const tomorrow = new Date(this.time);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  }

  /**
   * Get weather emoji
   */
  private getWeatherEmoji(condition: string): string {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('sun')) return '☀️';
    if (lower.includes('storm')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    return '🌤️';
  }
}

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-keyboard-feed',
    version: '1.0.0',
  });
});

// Get complete feed
app.get('/api/feed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const builder = new FeedBuilder(userId);
    const feed = await builder.buildFeed();

    res.json(feed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get feed by type
app.get('/api/feed/:userId/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;

    const builder = new FeedBuilder(userId);
    const feed = await builder.buildFeed();

    const filtered = feed.items.filter(item => item.type === type);

    res.json({ items: filtered });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute action from feed
app.post('/api/execute', async (req, res) => {
  try {
    const { actionType, actionValue, itemId } = req.body;

    switch (actionType) {
      case 'deeplink':
        res.json({
          success: true,
          action: 'open',
          deeplink: actionValue,
        });
        break;

      case 'genie':
        res.json({
          success: true,
          action: 'genie',
          task: actionValue,
        });
        break;

      case 'execute':
        res.json({
          success: true,
          action: 'execute',
          task: actionValue,
        });
        break;

      default:
        res.json({ success: false, error: 'Unknown action type' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mini feed for keyboard (compact)
app.get('/api/mini/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const builder = new FeedBuilder(userId);
    const feed = await builder.buildFeed();

    // Return mini version
    const mini = {
      greeting: feed.greeting,
      summary: feed.daySummary,
      topItem: feed.items[0] || null,
      quickActions: feed.quickActions.slice(0, 3),
    };

    res.json(mini);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Keyboard Feed (4655)                       ║
║                                                       ║
║   "Today's Story" - Home Dashboard:                 ║
║   ├── Greeting                                       ║
║   ├── Meetings                                       ║
║   ├── Travel                                         ║
║   ├── Tasks                                          ║
║   ├── Birthdays                                      ║
║   ├── Wallet alerts                                  ║
║   └── Quick actions                                  ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;