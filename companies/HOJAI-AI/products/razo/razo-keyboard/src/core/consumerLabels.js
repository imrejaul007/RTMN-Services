/**
 * Consumer Labels - Translate founder-speak to consumer-speak
 *
 * The Grandma Test: No jargon. Universal words.
 *
 * Mapping:
 * - God Mode → ✨ Help Me
 * - Psychic Mode → 🔮 Smart Reply
 * - Founder Mode → 📢 Share Update
 * - Negotiation Mode → 💰 Best Deal
 * - And more...
 *
 * Same power underneath. Different words on top.
 */

const CONSUMER_LABELS = {
  // Mode mappings
  modes: {
    // Power User Modes (hidden by default, accessible via long-press)
    god_mode: {
      consumer: { icon: '✨', label: 'Help Me', tagline: 'One tap. I handle it.' },
      advanced: { icon: '🧠', label: 'God Mode', tagline: 'Full Genie + Memory + DO' }
    },
    psychic_mode: {
      consumer: { icon: '🔮', label: 'Smart Reply', tagline: 'Remembers everything' },
      advanced: { icon: '🔮', label: 'Psychic Mode', tagline: 'TwinOS + MemoryOS context' }
    },
    founder_mode: {
      consumer: { icon: '📢', label: 'Share Update', tagline: 'For investors, team, public' },
      advanced: { icon: '👨‍💼', label: 'Founder Mode', tagline: 'Strategic communications' }
    },
    negotiation_mode: {
      consumer: { icon: '💰', label: 'Best Deal', tagline: 'Get the fair price' },
      advanced: { icon: '🤝', label: 'Negotiation Mode', tagline: 'SUTAR-powered counter-offers' }
    },
    family_mode: {
      consumer: { icon: '👨‍👩‍👧', label: 'Family Help', tagline: 'Remembers birthdays, suggests gifts' },
      advanced: { icon: '👪', label: 'Family Mode', tagline: 'Family intelligence' }
    },
    islamic_mode: {
      consumer: { icon: '🕌', label: 'Faith Tools', tagline: 'Prayer times, greetings' },
      advanced: { icon: '🕌', label: 'Islamic Mode', tagline: 'Faith-aware' }
    },
    relationship_mode: {
      consumer: { icon: '💬', label: 'Reply For Me', tagline: 'Tone changes by person' },
      advanced: { icon: '🎭', label: 'Relationship Mode', tagline: 'Context-aware by recipient' }
    },
    translation_mode: {
      consumer: { icon: '🌍', label: 'Translate', tagline: 'In your language' },
      advanced: { icon: '🌐', label: 'Translation', tagline: 'Cultural adaptation' }
    },
    compose_mode: {
      consumer: { icon: '✍️', label: 'Write For Me', tagline: 'Long-form help' },
      advanced: { icon: '✍️', label: 'Compose', tagline: 'Long-form writing' }
    },
    reply_mode: {
      consumer: { icon: '⚡', label: 'Reply', tagline: 'Quick response' },
      advanced: { icon: '⚡', label: 'Reply', tagline: 'Contextual responses' }
    },

    // Universal modes (always visible)
    universal: [
      { id: 'help_me', icon: '✨', label: 'Help Me', tagline: 'I figure it out' },
      { id: 'reply_for_me', icon: '😊', label: 'Reply For Me', tagline: 'Smart reply' },
      { id: 'speak_instead', icon: '🎤', label: 'Speak Instead', tagline: 'Use voice' },
      { id: 'translate', icon: '🌍', label: 'Translate', tagline: 'Any language' },
      { id: 'remind_me', icon: '📅', label: 'Remind Me', tagline: 'Set reminder' },
      { id: 'pay_someone', icon: '💰', label: 'Pay Someone', tagline: 'Send money' },
      { id: 'order_things', icon: '🛒', label: 'Order Things', tagline: 'Food, groceries' },
      { id: 'family_help', icon: '👨‍👩‍👧', label: 'Family Help', tagline: 'Birthdays, gifts' }
    ]
  },

  // My Mom Mode (simplified, 8 buttons)
  myMomMode: {
    title: 'RAZO',
    subtitle: 'Tap what you need',
    buttons: [
      { id: 'call_family', icon: '📞', label: 'Call Family', action: 'call_family', color: '#FF6B6B' },
      { id: 'reply', icon: '💬', label: 'Reply', action: 'reply_for_me', color: '#4ECDC4' },
      { id: 'send_money', icon: '💰', label: 'Send Money', action: 'pay_someone', color: '#FFD93D' },
      { id: 'order_food', icon: '🛒', label: 'Order Food', action: 'order_things', color: '#6BCB77' },
      { id: 'book_ride', icon: '🚕', label: 'Book Ride', action: 'book_ride', color: '#4D96FF' },
      { id: 'prayer_times', icon: '🕌', label: 'Prayer Times', action: 'prayer_times', color: '#9B59B6' },
      { id: 'reminders', icon: '📅', label: 'Reminders', action: 'remind_me', color: '#FF8C42' },
      { id: 'help_me', icon: '✨', label: 'Help Me', action: 'magic_wand', color: '#A78BFA', primary: true }
    ]
  },

  // Action button labels (consumer-friendly)
  actionButtons: {
    confirm: 'Yes',
    cancel: 'No',
    call: 'Call',
    pay: 'Pay',
    book: 'Book',
    order: 'Order',
    schedule: 'Schedule',
    remind: 'Remind Me',
    reply: 'Reply',
    send: 'Send',
    save: 'Save',
    delete: 'Delete',
    share: 'Share',
    find: 'Find',
    buy: 'Buy',
    remember: 'Remember',
    delegate: 'Delegate',
    choose: 'Choose',
    best: 'Book Best One',
    more: 'See All Options',
    edit: 'Edit',
    skip: 'Skip',
    snooze: 'Remind Me Later'
  },

  // Proactive suggestions (consumer-friendly)
  proactiveSuggestions: {
    flightTomorrow: {
      title: 'Flight tomorrow at 6:30 AM',
      suggestion: 'Need airport cab? Leave at 4:00 AM.',
      actions: ['Book Cab', 'Set Alarm', 'Skip']
    },
    rainComing: {
      title: 'Rain expected at 7 PM',
      suggestion: 'Your dinner at Olive Beach has covered seating. Confirm?',
      actions: ['Yes', 'Move Inside']
    },
    momBirthday: {
      title: "Mom's birthday in 3 days",
      suggestion: 'Like last year? Flowers + voice note (₹800).',
      actions: ['Send Same', 'Choose']
    },
    lowBalance: {
      title: 'Wallet balance low',
      suggestion: 'You have rent due tomorrow (₹15,000).',
      actions: ['Top Up', 'View Bills']
    },
    freeSlot: {
      title: 'Free this afternoon?',
      suggestion: 'Call Dad? Last call was 3 weeks ago.',
      actions: ['Call', 'Remind Tomorrow']
    }
  },

  // Emotion button labels
  emotionButtons: {
    angry: { icon: '😡', label: 'Calm This Down', tagline: 'De-escalate' },
    sad: { icon: '💝', label: 'Say Something Nice', tagline: 'Show you care' },
    confused: { icon: '🤔', label: 'What Should I Reply?', tagline: 'Get 3 options' },
    busy: { icon: '⚡', label: 'Quick Reply', tagline: 'Short and done' }
  },

  // Intent labels (consumer-friendly)
  intents: {
    order_food: { icon: '🍔', label: 'Order Food', color: '#FF6B6B' },
    book_hotel: { icon: '🏨', label: 'Book Hotel', color: '#4ECDC4' },
    make_payment: { icon: '💸', label: 'Send Money', color: '#FFD93D' },
    track_expense: { icon: '📊', label: 'Track Expense', color: '#6BCB77' },
    check_balance: { icon: '💰', label: 'Check Balance', color: '#FFD93D' },
    send_message: { icon: '💬', label: 'Send Message', color: '#4D96FF' },
    schedule_meeting: { icon: '📅', label: 'Schedule Meeting', color: '#FF8C42' },
    ask_genie: { icon: '🤔', label: 'Ask AI', color: '#A78BFA' },
    get_status: { icon: '📋', label: 'Check Status', color: '#4ECDC4' },
    find_service: { icon: '🔍', label: 'Find Service', color: '#4D96FF' },
    get_recommendation: { icon: '💡', label: 'Get Suggestion', color: '#FFD93D' },
    track_order: { icon: '📦', label: 'Track Order', color: '#6BCB77' },
    cancel_order: { icon: '❌', label: 'Cancel Order', color: '#FF6B6B' },
    request_refund: { icon: '↩️', label: 'Get Refund', color: '#FF8C42' },
    update_profile: { icon: '👤', label: 'Update Profile', color: '#9B59B6' }
  }
};

/**
 * Get consumer label for an intent or mode
 */
function getConsumerLabel(type, key, mode = 'consumer') {
  if (CONSUMER_LABELS[type] && CONSUMER_LABELS[type][key]) {
    const entry = CONSUMER_LABELS[type][key];
    if (entry[mode]) return entry[mode];
    return entry.consumer || entry.advanced || entry;
  }
  return null;
}

/**
 * Get My Mom Mode UI configuration
 */
function getMyMomMode() {
  return CONSUMER_LABELS.myMomMode;
}

/**
 * Get all action button labels
 */
function getActionButtons() {
  return CONSUMER_LABELS.actionButtons;
}

/**
 * Get proactive suggestion template
 */
function getProactiveSuggestion(key) {
  return CONSUMER_LABELS.proactiveSuggestions[key] || null;
}

module.exports = {
  CONSUMER_LABELS,
  getConsumerLabel,
  getMyMomMode,
  getActionButtons,
  getProactiveSuggestion
};