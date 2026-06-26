/**
 * RAZO Action Engine
 * Routes detected intents to appropriate services
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class ActionEngine {
  constructor(logger, serviceUrls = {}) {
    this.logger = logger;
    this.services = {
      genie: serviceUrls.genieGateway || 'http://localhost:4701',
      'do-app': serviceUrls.doApp || 'http://localhost:3001',
      sutar: serviceUrls.sutar || 'http://localhost:4140',
      copilot: serviceUrls.copilot || 'http://localhost:4600',
      corpid: serviceUrls.corpid || 'http://localhost:4300',
      calendar: serviceUrls.calendar || 'http://localhost:4709',
      channel: null, // Uses ChannelBridge
      'financial-twin': serviceUrls.financialTwin || 'http://localhost:4715',
      discovery: serviceUrls.discovery || 'http://localhost:4500',
      support: serviceUrls.support || 'http://localhost:4601',
      'insurance-os': serviceUrls.insurance || 'http://localhost:5105',
      'industry-os': serviceUrls.industryOs || 'http://localhost:4399'
    };
    this.stats = { totalActions: 0, actionResults: {} };
  }

  /**
   * Execute action based on intent
   */
  async execute(intent, entities, context = {}) {
    this.stats.totalActions++;

    const actionConfig = {
      service: intent.action,
      endpoint: intent.endpoint,
      method: 'POST'
    };

    this.logger.info('Executing action', {
      intent: intent.intent,
      service: actionConfig.service,
      endpoint: actionConfig.endpoint
    });

    try {
      let result;

      switch (actionConfig.service) {
        case 'genie':
          result = await this.callGenie(intent, entities, context);
          break;
        case 'do-app':
          result = await this.callDoApp(intent, entities, context);
          break;
        case 'sutar':
          result = await this.callSutar(intent, entities, context);
          break;
        case 'copilot':
          result = await this.callCopilot(intent, entities, context);
          break;
        case 'calendar':
          result = await this.callCalendar(intent, entities, context);
          break;
        case 'financial-twin':
          result = await this.callFinancialTwin(intent, entities, context);
          break;
        case 'channel':
          result = await this.handleChannelAction(intent, entities, context);
          break;
        case 'corpid':
          result = await this.callCorpid(intent, entities, context);
          break;
        case 'discovery':
          result = await this.callDiscovery(intent, entities, context);
          break;
        case 'support':
          result = await this.callSupport(intent, entities, context);
          break;
        case 'insurance-os':
        case 'industry-os':
          result = await this.callIndustryOS(intent, entities, context);
          break;
        default:
          result = { success: false, error: `Unknown service: ${actionConfig.service}` };
      }

      // Track stats
      this.stats.actionResults[intent.intent] = this.stats.actionResults[intent.intent] || { success: 0, failed: 0 };
      if (result.success !== false) {
        this.stats.actionResults[intent.intent].success++;
      } else {
        this.stats.actionResults[intent.intent].failed++;
      }

      return {
        success: true,
        intent: intent.intent,
        action: actionConfig,
        result,
        requestId: uuidv4()
      };

    } catch (error) {
      this.logger.error('Action execution failed', {
        intent: intent.intent,
        service: actionConfig.service,
        error: error.message
      });

      return {
        success: false,
        intent: intent.intent,
        error: {
          code: 'ACTION_FAILED',
          message: error.message
        },
        requestId: uuidv4()
      };
    }
  }

  /**
   * Call Genie Gateway
   */
  async callGenie(intent, entities, context) {
    if (intent.intent === 'ask_genie') {
      const response = await axios.post(
        `${this.services.genie}/api/query`,
        {
          query: entities.query || context.conversationText,
          userId: context.userId,
          sessionId: context.sessionId,
          context: {
            location: context.locationContext,
            time: context.timeContext
          }
        },
        { timeout: 30000 }
      );
      return response.data;
    }

    // Default Genie call
    const response = await axios.post(
      `${this.services.genie}/api/intent`,
      { intent: intent.intent, entities, context },
      { timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Call DO App
   */
  async callDoApp(intent, entities, context) {
    const url = `${this.services['do-app']}${intent.endpoint}`;

    switch (intent.intent) {
      case 'order_food':
        return await this.orderFood(url, entities, context);
      case 'book_hotel':
        return await this.bookHotel(url, entities, context);
      case 'book_appointment':
        return await this.bookAppointment(url, entities, context);
      case 'get_status':
      case 'track_order':
        return await this.trackOrder(url, entities, context);
      case 'cancel_order':
        return await this.cancelOrder(url, entities, context);
      default:
        const response = await axios.post(url, {
          ...entities,
          userId: context.userId,
          sessionId: context.sessionId
        }, { timeout: 15000 });
        return response.data;
    }
  }

  async orderFood(url, entities, context) {
    const response = await axios.post(url, {
      restaurant: entities.restaurant,
      items: [{ name: entities.item, quantity: entities.quantity || 1 }],
      deliveryAddress: context.locationContext?.address || entities.delivery_address,
      userId: context.userId
    }, { timeout: 15000 });
    return response.data;
  }

  async bookHotel(url, entities, context) {
    const response = await axios.post(url, {
      hotelName: entities.hotel_name,
      checkIn: entities.check_in,
      checkOut: entities.check_out,
      guests: entities.guests || 1,
      roomType: entities.room_type,
      userId: context.userId
    }, { timeout: 15000 });
    return response.data;
  }

  async bookAppointment(url, entities, context) {
    const response = await axios.post(url, {
      service: entities.service,
      provider: entities.provider,
      dateTime: `${entities.date} ${entities.time}`,
      userId: context.userId
    }, { timeout: 15000 });
    return response.data;
  }

  async trackOrder(url, entities, context) {
    const response = await axios.get(`${url}/${entities.order_id}`, {
      timeout: 10000
    });
    return response.data;
  }

  async cancelOrder(url, entities, context) {
    const response = await axios.post(`${url}/cancel`, {
      orderId: entities.order_id,
      reason: entities.reason,
      userId: context.userId
    }, { timeout: 15000 });
    return response.data;
  }

  /**
   * Call SUTAR (Autonomous Operations)
   */
  async callSutar(intent, entities, context) {
    const url = `${this.services.sutar}${intent.endpoint}`;

    switch (intent.intent) {
      case 'make_payment':
        return await this.makePayment(url, entities, context);
      case 'request_refund':
        return await this.requestRefund(url, entities, context);
      default:
        const response = await axios.post(url, {
          ...entities,
          userId: context.userId
        }, { timeout: 15000 });
        return response.data;
    }
  }

  async makePayment(url, entities, context) {
    const response = await axios.post(url, {
      amount: parseFloat(entities.amount),
      recipient: entities.recipient,
      purpose: entities.purpose,
      method: entities.payment_method || 'upi',
      userId: context.userId,
      requestId: uuidv4()
    }, { timeout: 20000 });
    return response.data;
  }

  async requestRefund(url, entities, context) {
    const response = await axios.post(url, {
      orderId: entities.order_id,
      amount: entities.amount ? parseFloat(entities.amount) : undefined,
      reason: entities.reason,
      userId: context.userId
    }, { timeout: 15000 });
    return response.data;
  }

  /**
   * Call Business Copilot
   */
  async callCopilot(intent, entities, context) {
    const response = await axios.post(
      `${this.services.copilot}/api/query`,
      {
        query: entities.query || entities.based_on,
        type: intent.intent,
        userId: context.userId,
        preferences: context.userPreferences
      },
      { timeout: 20000 }
    );
    return response.data;
  }

  /**
   * Call Calendar Service
   */
  async callCalendar(intent, entities, context) {
    const response = await axios.post(
      `${this.services.calendar}/api/events`,
      {
        title: entities.title,
        attendees: entities.attendees,
        start: new Date(`${entities.date} ${entities.time || '09:00'}`),
        end: entities.duration ? this.addDuration(entities.date, entities.time, entities.duration) : undefined,
        platform: entities.platform,
        userId: context.userId
      },
      { timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Call Financial Twin
   */
  async callFinancialTwin(intent, entities, context) {
    const url = this.services['financial-twin'];

    switch (intent.intent) {
      case 'check_balance':
        const balanceRes = await axios.get(`${url}/api/accounts/balance`, {
          params: { userId: context.userId, accountType: entities.account_type }
        });
        return balanceRes.data;
      case 'track_expense':
        const expenseRes = await axios.post(`${url}/api/expenses`, {
          amount: parseFloat(entities.amount),
          category: entities.category,
          merchant: entities.merchant,
          date: entities.date,
          userId: context.userId
        }, { timeout: 10000 });
        return expenseRes.data;
      default:
        const response = await axios.post(`${url}${intent.endpoint}`, entities, { timeout: 15000 });
        return response.data;
    }
  }

  /**
   * Call CorpID
   */
  async callCorpid(intent, entities, context) {
    const response = await axios.put(
      `${this.services.corpid}/api/profile`,
      {
        field: entities.field,
        value: entities.value,
        userId: context.userId
      },
      { timeout: 10000 }
    );
    return response.data;
  }

  /**
   * Call Discovery Service
   */
  async callDiscovery(intent, entities, context) {
    const response = await axios.post(
      `${this.services.discovery}/api/search`,
      {
        query: entities.service || entities.query,
        location: entities.location || context.locationContext?.coordinates,
        userId: context.userId
      },
      { timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Call Support
   */
  async callSupport(intent, entities, context) {
    const response = await axios.post(
      `${this.services.support}${intent.endpoint}`,
      {
        orderId: entities.order_id,
        issueType: entities.issue_type,
        description: entities.description,
        userId: context.userId
      },
      { timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Call Industry OS (via Unified Hub)
   */
  async callIndustryOS(intent, entities, context) {
    const response = await axios.post(
      `${this.services['industry-os']}/api/workflow/process`,
      {
        intent: intent.intent,
        entities,
        userId: context.userId,
        context
      },
      { timeout: 20000 }
    );
    return response.data;
  }

  /**
   * Handle channel actions (send_message)
   */
  async handleChannelAction(intent, entities, context) {
    // This is handled by ChannelBridge, return a placeholder
    return {
      success: true,
      action: 'channel_message',
      channel: entities.channel || 'whatsapp',
      recipient: entities.recipient
    };
  }

  /**
   * Helper: Add duration to time
   */
  addDuration(date, time, duration) {
    const baseDate = new Date(`${date} ${time || '09:00'}`);
    const match = duration.match(/(\d+)\s*(hours?|minutes?)/i);
    if (match) {
      const amount = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('hour')) {
        baseDate.setHours(baseDate.getHours() + amount);
      } else {
        baseDate.setMinutes(baseDate.getMinutes() + amount);
      }
    }
    return baseDate;
  }

  /**
   * Get service health
   */
  async getServiceHealth() {
    const health = {};
    for (const [name, url] of Object.entries(this.services)) {
      if (url) {
        try {
          const response = await axios.get(`${url}/health`, { timeout: 5000 });
          health[name] = { status: 'up', url };
        } catch {
          health[name] = { status: 'down', url };
        }
      }
    }
    return health;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalActions: this.stats.totalActions,
      actionResults: this.stats.actionResults
    };
  }
}

module.exports = ActionEngine;
