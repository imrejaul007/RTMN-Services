/**
 * Family Quick Reply - Relationship-aware reply generator
 *
 * When a message comes from a family member, RAZO automatically:
 * 1. Recognizes the relationship (Mom/Dad/Spouse/Sibling/Child/Grandparent)
 * 2. Adapts tone (warm/respectful/casual/protective)
 * 3. Suggests contextually-appropriate actions
 * 4. Includes memory + relationship twin data
 *
 * The biggest differentiator. Nobody else has this.
 */

class FamilyQuickReply {
  constructor({ intentRouter, contextEngine, logger } = {}) {
    this.intentRouter = intentRouter;
    this.contextEngine = contextEngine;
    this.logger = logger || console;

    // Relationship configurations
    this.relationships = {
      mother: {
        tone: 'warm-respctful',
        language: 'auto',
        greeting: ['hi', 'as', 'bn', 'en'],
        suggestedActions: ['call', 'visit', 'gift', 'event_reminder', 'health_check'],
        culturalContext: ['festival', 'family_event']
      },
      father: {
        tone: 'respectful-brief',
        language: 'auto',
        greeting: ['hi', 'en'],
        suggestedActions: ['call', 'birthday', 'event_reminder'],
        culturalContext: ['festival']
      },
      spouse: {
        tone: 'personal-intimate',
        language: 'auto',
        greeting: ['en', 'hi'],
        suggestedActions: ['plan_date', 'reminder', 'gift', 'anniversary'],
        culturalContext: ['anniversary', 'personal_event']
      },
      sibling: {
        tone: 'casual-fun',
        language: 'auto',
        greeting: ['en', 'hi'],
        suggestedActions: ['plan_hangout', 'share_meme', 'gift'],
        culturalContext: ['birthday']
      },
      child: {
        tone: 'protective-encouraging',
        language: 'auto',
        greeting: ['auto'],
        suggestedActions: ['school_reminder', 'praise', 'safety_check', 'activity'],
        culturalContext: ['school_event']
      },
      grandparent: {
        tone: 'patient-loving',
        language: 'auto',
        greeting: ['auto'],
        suggestedActions: ['voice_call', 'health_check', 'visit', 'festival_greeting'],
        culturalContext: ['health', 'festival']
      },
      uncle_aunt: {
        tone: 'warm-respectful',
        language: 'auto',
        greeting: ['auto'],
        suggestedActions: ['call', 'festival_greeting', 'gift', 'visit'],
        culturalContext: ['festival', 'family_event']
      },
      cousin: {
        tone: 'casual-friendly',
        language: 'auto',
        greeting: ['auto'],
        suggestedActions: ['plan_hangout', 'wishes', 'gift'],
        culturalContext: ['festival', 'wedding']
      }
    };

    // Mock family data (in production, from TwinOS)
    this.mockFamily = {
      'mom_id': {
        name: 'Mom',
        relation: 'mother',
        language: 'hi',
        lastCall: '3 days ago',
        lastMessage: 'Your cousin engagement is Sunday',
        upcomingEvents: [
          { type: 'birthday', date: '2026-08-15', name: 'Mom Birthday' },
          { type: 'anniversary', date: '2026-12-01', name: 'Parents Anniversary' }
        ],
        preferences: { communicationStyle: 'warm', preferredChannel: 'whatsapp' }
      }
    };

    this.stats = {
      familyMessagesDetected: 0,
      repliesGenerated: 0,
      actionsSuggested: 0,
      relationshipBreakdown: {}
    };
  }

  /**
   * Detect if incoming message is from a family member
   * Returns relationship type or null
   */
  async detectFamilyRelationship(senderId, userId) {
    // In production: query CorpID + TwinOS for relationship
    // For now: mock data lookup
    const contact = this.mockFamily[senderId];

    if (contact && this.relationships[contact.relation]) {
      this.stats.familyMessagesDetected++;
      this.stats.relationshipBreakdown[contact.relation] =
        (this.stats.relationshipBreakdown[contact.relation] || 0) + 1;
      return contact;
    }

    // Try to infer from message metadata
    return null;
  }

  /**
   * Generate family-aware reply suggestions
   */
  async generateFamilyReply({ message, senderId, userId, language = 'auto' }) {
    this.stats.repliesGenerated++;

    const contact = await this.detectFamilyRelationship(senderId, userId);

    if (!contact) {
      return { isFamily: false, replies: [], actions: [] };
    }

    const relationConfig = this.relationships[contact.relation];

    // 1. Detect intent of the incoming message
    const intentResult = await this.intentRouter.detect(message, userId);
    const intent = intentResult.intent || intentResult.data?.intent || 'unknown';

    // 2. Generate style-appropriate replies
    const replies = await this._generateReplies({
      message,
      intent,
      relation: contact.relation,
      tone: relationConfig.tone,
      language: contact.language || language
    });

    // 3. Suggest contextual actions
    const actions = this._suggestFamilyActions({
      intent,
      contact,
      relationConfig
    });

    return {
      isFamily: true,
      relationship: contact.relation,
      relationshipName: contact.name,
      tone: relationConfig.tone,
      language: contact.language,
      replies,
      actions,
      memoryContext: this._getMemoryContext(contact)
    };
  }

  /**
   * Generate replies based on relationship and tone
   */
  async _generateReplies({ message, intent, relation, tone, language }) {
    // In production, this would use Genie/LLM with relationship context
    // For now, return tone-appropriate templates

    const replyTemplates = {
      mother: {
        question: [
          { tone: 'warm', text: 'हाँ माँ, मैं आ रहा हूँ। इंशाअल्लाह।', language: 'hi' },
          { tone: 'brief', text: 'हाँ माँ, सब ठीक है।', language: 'hi' },
          { tone: 'loving', text: 'माँ, आपकी बहुत याद आती है। जल्दी मिलते हैं।', language: 'hi' }
        ],
        event: [
          { tone: 'warm', text: 'ज़रूर माँ, मैं आ रहा हूँ। ❤️', language: 'hi' },
          { tone: 'brief', text: 'हाँ माँ, पक्का आऊँगा।', language: 'hi' }
        ],
        reminder: [
          { tone: 'grateful', text: 'शुक्रिया माँ, याद दिलाने के लिए। ज़रूर करूँगा।', language: 'hi' }
        ]
      },
      father: {
        question: [
          { tone: 'respectful', text: 'जी पापा, सब ठीक है।', language: 'hi' },
          { tone: 'brief', text: 'हाँ पापा।', language: 'hi' }
        ]
      },
      spouse: {
        question: [
          { tone: 'loving', text: 'Of course, love. See you soon ❤️', language: 'en' },
          { tone: 'playful', text: 'Always! Count me in 😊', language: 'en' }
        ],
        plan: [
          { tone: 'enthusiastic', text: 'Sounds perfect! When?', language: 'en' },
          { tone: 'romantic', text: 'Just us? I love it ❤️', language: 'en' }
        ]
      },
      sibling: {
        question: [
          { tone: 'casual', text: 'haan bhai, chalte hain!', language: 'hi' },
          { tone: 'fun', text: 'obviously! 🎉', language: 'en' }
        ]
      },
      child: {
        question: [
          { tone: 'encouraging', text: 'That\'s wonderful, beta! So proud of you!', language: 'en' },
          { tone: 'loving', text: 'My brave child! Tell me more.', language: 'en' }
        ]
      },
      grandparent: {
        question: [
          { tone: 'loving', text: 'जी दादी/नानी, ज़रूर आऊँगा। आपका आशीर्वाद चाहिए।', language: 'hi' },
          { tone: 'patient', text: 'हाँ, मैं सुन रहा हूँ। बताइए।', language: 'hi' }
        ]
      }
    };

    const relReplies = replyTemplates[relation] || replyTemplates.mother;

    // Pick the right category based on intent
    let category = 'question';
    if (['event', 'birthday', 'wedding', 'engagement'].includes(intent)) category = 'event';
    if (['reminder', 'update_profile'].includes(intent)) category = 'reminder';
    if (['plan', 'schedule_meeting'].includes(intent)) category = 'plan';

    return relReplies[category] || relReplies.question || [];
  }

  /**
   * Suggest family-specific actions
   */
  _suggestFamilyActions({ intent, contact, relationConfig }) {
    this.stats.actionsSuggested++;

    const actions = [];
    const upcomingEvents = contact.upcomingEvents || [];

    // Add upcoming event actions FIRST (priority - they have time sensitivity)
    for (const event of upcomingEvents.slice(0, 2)) {
      actions.push(this._getEventAction(event, contact));
    }

    // Add relation-specific actions (deduped against existing)
    const existingIds = new Set(actions.map(a => a.id));
    for (const actionType of relationConfig.suggestedActions) {
      if (actions.length >= 4) break;
      const action = this._getActionDefinition(actionType, contact);
      if (action && !existingIds.has(action.id)) {
        actions.push(action);
        existingIds.add(action.id);
      }
    }

    return actions.slice(0, 4); // Max 4 actions
  }

  _getActionDefinition(actionType, contact) {
    const actions = {
      call: {
        id: 'call_family',
        icon: '📞',
        label: `Call ${contact.name}`,
        action: 'voice_call',
        primary: true,
        reason: `${contact.name} prefers voice calls`
      },
      visit: {
        id: 'plan_visit',
        icon: '🚗',
        label: 'Plan Visit',
        action: 'plan_visit',
        reason: 'Set a reminder to visit'
      },
      gift: {
        id: 'buy_gift',
        icon: '🎁',
        label: 'Buy Gift',
        action: 'suggest_gift',
        reason: 'Gift suggestions based on relationship'
      },
      event_reminder: {
        id: 'set_reminder',
        icon: '📅',
        label: 'Set Reminder',
        action: 'set_reminder'
      },
      health_check: {
        id: 'health_check',
        icon: '💊',
        label: 'Health Check',
        action: 'health_reminder'
      },
      voice_call: {
        id: 'voice_call',
        icon: '📞',
        label: 'Voice Call',
        action: 'voice_call',
        primary: true,
        reason: `${contact.name} usually prefers voice (last 3 calls)`
      },
      plan_date: {
        id: 'plan_date',
        icon: '💕',
        label: 'Plan Date',
        action: 'plan_date'
      },
      anniversary: {
        id: 'anniversary_gift',
        icon: '💝',
        label: 'Anniversary Gift',
        action: 'gift'
      },
      school_reminder: {
        id: 'school_reminder',
        icon: '🎒',
        label: 'School Reminder',
        action: 'school_reminder'
      },
      praise: {
        id: 'send_praise',
        icon: '🌟',
        label: 'Send Encouragement',
        action: 'praise_message'
      },
      safety_check: {
        id: 'safety_check',
        icon: '🛡️',
        label: 'Safety Check',
        action: 'safety_message'
      },
      activity: {
        id: 'suggest_activity',
        icon: '🎨',
        label: 'Suggest Activity',
        action: 'activity'
      },
      festival_greeting: {
        id: 'festival_greeting',
        icon: '🎊',
        label: 'Festival Wishes',
        action: 'greeting'
      },
      plan_hangout: {
        id: 'plan_hangout',
        icon: '🎉',
        label: 'Plan Hangout',
        action: 'plan_hangout'
      },
      share_meme: {
        id: 'share_meme',
        icon: '😂',
        label: 'Share Meme',
        action: 'share_meme'
      },
      wishes: {
        id: 'send_wishes',
        icon: '🎊',
        label: 'Send Wishes',
        action: 'wishes'
      }
    };

    return actions[actionType] || null;
  }

  _getEventAction(event, contact) {
    const daysUntil = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));

    return {
      id: `event_${event.type}`,
      icon: event.type === 'birthday' ? '🎂' : event.type === 'anniversary' ? '💍' : '📅',
      label: `${event.name} in ${daysUntil} days`,
      action: 'event_action',
      event: event.type,
      date: event.date,
      daysUntil
    };
  }

  /**
   * Get memory context for the contact
   */
  _getMemoryContext(contact) {
    return {
      name: contact.name,
      relation: contact.relation,
      language: contact.language,
      lastContact: contact.lastCall || contact.lastMessage,
      upcomingEvents: contact.upcomingEvents || [],
      preferences: contact.preferences || {}
    };
  }

  getStats() {
    return this.stats;
  }
}

module.exports = FamilyQuickReply;