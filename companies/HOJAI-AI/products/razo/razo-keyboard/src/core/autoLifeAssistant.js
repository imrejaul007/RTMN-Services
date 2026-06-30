/**
 * Auto Life Assistant - Proactive Intelligence
 *
 * RAZO doesn't wait for users to ask. It understands context
 * and surfaces helpful actions before users think to ask.
 *
 * Trigger Categories:
 * - Travel (flight tomorrow, train in 2h)
 * - Weather (rain + outdoor plan)
 * - Family (birthday, anniversary, sick)
 * - Wallet (low balance, due payments)
 * - Calendar (free slot, important meeting)
 * - Subscription (renewal in 7 days)
 * - Health (medication refill, checkup due)
 *
 * Frequency capping: Max 3 proactive suggestions per day.
 */

class AutoLifeAssistant {
  constructor({ logger, i18n } = {}) {
    this.logger = logger || console;
    this.i18n = i18n;

    // Track proactive suggestions per user (for frequency capping)
    this.dailyCounters = new Map();

    // User preferences (which categories to enable)
    this.userPreferences = new Map();

    this.stats = {
      checks: 0,
      triggersActivated: 0,
      suggestionsShown: 0,
      suggestionsActed: 0,
      snoozed: 0,
      disabled: 0,
      byCategory: {}
    };

    // Trigger definitions
    this.triggers = {
      flight_tomorrow: {
        category: 'travel',
        importance: 0.9,
        check: this._checkFlightTomorrow.bind(this)
      },
      rain_outdoor_plan: {
        category: 'weather',
        importance: 0.7,
        check: this._checkRainOutdoorPlan.bind(this)
      },
      family_birthday: {
        category: 'family',
        importance: 0.95,
        check: this._checkFamilyBirthday.bind(this)
      },
      family_anniversary: {
        category: 'family',
        importance: 0.85,
        check: this._checkFamilyAnniversary.bind(this)
      },
      family_sick: {
        category: 'family',
        importance: 0.95,
        check: this._checkFamilySick.bind(this)
      },
      low_wallet_balance: {
        category: 'wallet',
        importance: 0.85,
        check: this._checkLowWalletBalance.bind(this)
      },
      subscription_renewal: {
        category: 'subscription',
        importance: 0.5,
        check: this._checkSubscriptionRenewal.bind(this)
      },
      free_slot: {
        category: 'calendar',
        importance: 0.4,
        check: this._checkFreeSlot.bind(this)
      },
      medication_refill: {
        category: 'health',
        importance: 0.8,
        check: this._checkMedicationRefill.bind(this)
      },
      festival_today: {
        category: 'festival',
        importance: 0.9,
        check: this._checkFestivalToday.bind(this)
      }
    };
  }

  /**
   * Main entry: Check all triggers for a user
   * Returns top 3 suggestions (frequency capped)
   */
  async checkProactive(userId) {
    this.stats.checks++;

    // Reset daily counter if new day
    this._resetDailyCounterIfNeeded(userId);

    // Check if user already has 3 suggestions today
    const dailyCount = this.dailyCounters.get(userId) || 0;
    if (dailyCount >= 3) {
      return {
        suggestions: [],
        reason: 'Daily limit reached',
        remainingToday: 0
      };
    }

    // Get user preferences
    const prefs = this.userPreferences.get(userId) || this._defaultPreferences();

    // Check all enabled triggers
    const triggered = [];

    for (const [triggerId, trigger] of Object.entries(this.triggers)) {
      // Skip if category disabled
      if (!prefs.enabledCategories.includes(trigger.category)) continue;

      try {
        const result = await trigger.check(userId, prefs);
        if (result && result.activated) {
          triggered.push({
            triggerId,
            category: trigger.category,
            importance: trigger.importance,
            ...result
          });
          this.stats.triggersActivated++;
        }
      } catch (error) {
        this.logger.error(`Trigger ${triggerId} failed`, { error: error.message });
      }
    }

    // Sort by importance
    triggered.sort((a, b) => b.importance - a.importance);

    // Take top N (where N = remaining daily limit)
    const remaining = 3 - dailyCount;
    const suggestions = triggered.slice(0, remaining);

    // Update counter
    if (suggestions.length > 0) {
      this.dailyCounters.set(userId, dailyCount + suggestions.length);
      this.stats.suggestionsShown += suggestions.length;
    }

    return {
      suggestions,
      remainingToday: 3 - (dailyCount + suggestions.length),
      totalChecked: Object.keys(this.triggers).length
    };
  }

  /**
   * Snooze a suggestion for 24 hours
   */
  snoozeSuggestion(userId, triggerId, hours = 24) {
    this.stats.snoozed++;
    const key = `${userId}:${triggerId}`;
    this.snoozedUntil = this.snoozedUntil || new Map();
    this.snoozedUntil.set(key, Date.now() + hours * 60 * 60 * 1000);
    return { success: true, snoozedUntil: new Date(this.snoozedUntil.get(key)).toISOString() };
  }

  /**
   * Disable a category permanently
   */
  disableCategory(userId, category) {
    this.stats.disabled++;
    const prefs = this.userPreferences.get(userId) || this._defaultPreferences();
    prefs.enabledCategories = prefs.enabledCategories.filter(c => c !== category);
    this.userPreferences.set(userId, prefs);
    return { success: true, enabledCategories: prefs.enabledCategories };
  }

  /**
   * Track user action on a suggestion (for learning)
   */
  async trackAction(userId, triggerId, action) {
    if (action === 'acted' || action === 'confirmed') {
      this.stats.suggestionsActed++;
    }
    // In production, this would update MemoryOS for learning
    return { success: true };
  }

  // ─── Trigger Implementations ──────────────────────────────────────────

  async _checkFlightTomorrow(userId, prefs) {
    // Mock: would call Calendar service
    const mockFlight = {
      flightNumber: 'AI-101',
      departure: '2026-07-02T06:30:00',
      from: 'Bangalore',
      to: 'Delhi',
      status: 'on_time'
    };

    const flightTime = new Date(mockFlight.departure);
    const now = new Date();
    const hoursUntil = (flightTime - now) / (1000 * 60 * 60);

    if (hoursUntil > 12 && hoursUntil <= 30) {
      return {
        activated: true,
        title: `Flight tomorrow at ${flightTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        suggestion: `Need airport cab? Leave 3 hours before (${this._calcLeaveTime(flightTime)}).`,
        actions: [
          { id: 'book_cab', label: 'Book Cab', action: 'book_cab', primary: true },
          { id: 'set_alarm', label: 'Set Alarm', action: 'set_alarm' },
          { id: 'check_in', label: 'Check-in Online', action: 'check_in' },
          { id: 'snooze', label: 'Skip', action: 'snooze' }
        ],
        data: mockFlight
      };
    }

    return { activated: false };
  }

  async _checkRainOutdoorPlan(userId, prefs) {
    // Mock: would call Weather service + Calendar
    const mockWeather = { rain: true, intensity: 'moderate', time: '19:00' };
    const mockPlan = { type: 'dinner', venue: 'Olive Beach', hasCovered: true, time: '20:00' };

    if (mockWeather.rain && mockPlan.type === 'dinner' && !mockPlan.hasCovered) {
      return {
        activated: true,
        title: 'Rain expected at 7 PM',
        suggestion: `Your dinner at ${mockPlan.venue} is outdoor. Move inside or reschedule?`,
        actions: [
          { id: 'move_inside', label: 'Move Inside', action: 'move_inside', primary: true },
          { id: 'confirm', label: 'Confirm Anyway', action: 'confirm' },
          { id: 'reschedule', label: 'Reschedule', action: 'reschedule' }
        ]
      };
    }

    if (mockWeather.rain && mockPlan.hasCovered) {
      return {
        activated: true,
        title: 'Rain expected but covered seating',
        suggestion: `Your dinner at ${mockPlan.venue} has covered seating ✓. Confirm?`,
        actions: [
          { id: 'confirm', label: 'Yes, Confirmed', action: 'confirm', primary: true },
          { id: 'change', label: 'Change Venue', action: 'change_venue' }
        ]
      };
    }

    return { activated: false };
  }

  async _checkFamilyBirthday(userId, prefs) {
    // Mock: would call TwinOS + Calendar
    const mockMomBirthday = { daysUntil: 3, name: 'Mom', date: '2026-07-04' };

    if (mockMomBirthday.daysUntil > 0 && mockMomBirthday.daysUntil <= 7) {
      return {
        activated: true,
        title: `${mockMomBirthday.name}'s birthday in ${mockMomBirthday.daysUntil} days`,
        suggestion: 'Last year: flowers + voice note (₹800, 4.8★ feedback).',
        actions: [
          { id: 'send_same', label: 'Send Same as Last Year', action: 'repeat_gift', primary: true },
          { id: 'choose_gift', label: 'Choose New Gift', action: 'browse_gifts' },
          { id: 'schedule_call', label: 'Schedule Call', action: 'schedule_call' }
        ],
        data: mockMomBirthday
      };
    }

    return { activated: false };
  }

  async _checkFamilyAnniversary(userId, prefs) {
    const mockAnniversary = { daysUntil: 5, name: 'Wedding Anniversary', date: '2026-07-06' };

    if (mockAnniversary.daysUntil > 0 && mockAnniversary.daysUntil <= 7) {
      return {
        activated: true,
        title: `Anniversary in ${mockAnniversary.daysUntil} days`,
        suggestion: 'Plan something special? Last year: dinner + custom gift.',
        actions: [
          { id: 'plan_dinner', label: 'Plan Dinner', action: 'book_restaurant', primary: true },
          { id: 'browse_gifts', label: 'Browse Gifts', action: 'browse_gifts' },
          { id: 'generate_message', label: 'Generate Message', action: 'generate_message' }
        ]
      };
    }

    return { activated: false };
  }

  async _checkFamilySick(userId, prefs) {
    // Triggered by messages or by TwinOS data
    // For now, mock
    return { activated: false };
  }

  async _checkLowWalletBalance(userId, prefs) {
    const mockBalance = 120;
    const mockDue = [
      { type: 'rent', amount: 15000, dueDate: '2026-07-02' },
      { type: 'internet', amount: 999, dueDate: '2026-07-04' }
    ];

    const totalDue = mockDue.reduce((sum, d) => sum + d.amount, 0);

    if (mockBalance < totalDue && totalDue > 0) {
      return {
        activated: true,
        title: 'Wallet balance low',
        suggestion: `Balance: ₹${mockBalance}. You have ${mockDue.length} payments due (₹${totalDue}).`,
        actions: [
          { id: 'top_up', label: 'Top Up ₹5,000', action: 'top_up_wallet', primary: true },
          { id: 'view_bills', label: 'View Bills', action: 'view_bills' },
          { id: 'pay_now', label: 'Pay Now Anyway', action: 'pay_now' }
        ],
        data: { balance: mockBalance, due: mockDue }
      };
    }

    return { activated: false };
  }

  async _checkSubscriptionRenewal(userId, prefs) {
    const mockSub = { name: 'Netflix Premium', amount: 649, daysUntil: 5 };

    if (mockSub.daysUntil > 0 && mockSub.daysUntil <= 7) {
      return {
        activated: true,
        title: `${mockSub.name} renews in ${mockSub.daysUntil} days`,
        suggestion: `₹${mockSub.amount} will be charged. Continue or cancel?`,
        actions: [
          { id: 'continue', label: 'Continue', action: 'continue_subscription', primary: true },
          { id: 'cancel', label: 'Cancel', action: 'cancel_subscription' },
          { id: 'review', label: 'Review Usage', action: 'review_usage' }
        ]
      };
    }

    return { activated: false };
  }

  async _checkFreeSlot(userId, prefs) {
    const mockCalendar = {
      today: [
        { time: '09:00-10:00', event: 'Standup' },
        { time: '14:00-15:00', event: '1:1 with manager' }
      ]
    };

    // Free slot detection (simplified)
    const freeSlots = ['11:00-13:00', '15:00-18:00'];

    if (freeSlots.length > 0) {
      return {
        activated: true,
        title: 'Free this afternoon?',
        suggestion: `Call Dad? Last call was 3 weeks ago.`,
        actions: [
          { id: 'call_dad', label: 'Call Dad', action: 'voice_call', primary: true },
          { id: 'remind_tomorrow', label: 'Remind Tomorrow', action: 'remind_later' },
          { id: 'skip', label: 'Skip', action: 'snooze' }
        ]
      };
    }

    return { activated: false };
  }

  async _checkMedicationRefill(userId, prefs) {
    const mockMed = {
      name: 'Metformin 500mg',
      lastRefill: '28 days ago',
      typicalRefillDays: 30
    };

    const daysSinceRefill = 28;
    if (daysSinceRefill >= 28) {
      return {
        activated: true,
        title: `${mockMed.name} refill due`,
        suggestion: `Last refill was ${daysSinceRefill} days ago. Refill now?`,
        actions: [
          { id: 'refill', label: 'Refill Now', action: 'order_medicine', primary: true },
          { id: 'remind_later', label: 'Remind Tomorrow', action: 'remind_later' }
        ]
      };
    }

    return { activated: false };
  }

  async _checkFestivalToday(userId, prefs) {
    if (!this.i18n) return { activated: false };

    const festival = this.i18n.getCurrentFestival(userId, prefs.region || 'india');

    if (festival) {
      const greeting = this.i18n.getFestivalGreeting(festival, prefs.language || 'en');

      return {
        activated: true,
        title: festival ? `${festival.toUpperCase()} today!` : 'Festival today',
        suggestion: `Send wishes to ${prefs.contactCount || 24} contacts?`,
        actions: [
          { id: 'send_all', label: 'Send to All', action: 'send_festival_greetings', primary: true },
          { id: 'customize', label: 'Customize Each', action: 'customize_greetings' },
          { id: 'schedule', label: 'Schedule for Later', action: 'schedule_greetings' }
        ],
        greeting
      };
    }

    return { activated: false };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  _calcLeaveTime(flightTime) {
    const leave = new Date(flightTime);
    leave.setHours(leave.getHours() - 3);
    return leave.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  _resetDailyCounterIfNeeded(userId) {
    const today = new Date().toDateString();
    const key = `${userId}:${today}`;
    if (!this.dailyCounters.has(key)) {
      // Reset counter for today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${userId}:${yesterday.toDateString()}`;
      // (in production, this would use a proper daily keying)
    }
  }

  _defaultPreferences() {
    return {
      enabledCategories: ['travel', 'weather', 'family', 'wallet', 'festival', 'health'],
      language: 'en',
      region: 'india',
      contactCount: 0,
      maxDailySuggestions: 3,
      quietHours: { start: 22, end: 7 }  // 10pm - 7am
    };
  }

  getStats() {
    return this.stats;
  }
}

module.exports = AutoLifeAssistant;