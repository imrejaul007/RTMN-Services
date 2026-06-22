// ============================================================================
// HOJAI VOICE PLATFORM - Customer Service Voice Agent
// ============================================================================

import { BaseVoiceAgent, AgentConfig } from './base.agent';
import { IntentDefinition, SentimentScore, VoiceAgent } from '../types';

/**
 * Default intents for Customer Service Agent
 */
export const DEFAULT_CUSTOMER_SERVICE_INTENTS: Omit<IntentDefinition, 'id'>[] = [
  {
    name: 'greeting',
    description: 'User is greeting or starting a conversation',
    examples: [
      'hello', 'hi', 'namaste', 'good morning', 'good evening', 'hey',
      'नमस्ते', 'வணக்கம்', 'నమస్కారం', 'হ্যালো', 'ಹಲೋ'
    ],
    action: 'handleGreeting',
    followUp: 'How can I help you today?',
  },
  {
    name: 'faq',
    description: 'User is asking a frequently asked question',
    examples: [
      'what are your hours', 'where are you located', 'what services do you offer',
      'how do I track my order', 'when will my order arrive', 'what is your return policy'
    ],
    action: 'handleFAQ',
  },
  {
    name: 'complaint',
    description: 'User is filing a complaint or reporting an issue',
    examples: [
      'I have a problem', 'something is wrong', 'I am not satisfied',
      'this is not what I ordered', 'the service was bad', 'I want to complain'
    ],
    action: 'handleComplaint',
    escalationThreshold: -0.3,
  },
  {
    name: 'ticket_creation',
    description: 'User wants to create a support ticket',
    examples: [
      'I want to raise a ticket', 'create a support ticket', 'open a case',
      'file a complaint', 'report an issue'
    ],
    action: 'handleTicketCreation',
    parameters: {
      category: { name: 'category', type: 'enum', description: 'Issue category', allowedValues: ['billing', 'technical', 'general'] },
      description: { name: 'description', type: 'string', description: 'Issue description' },
    },
    requiredParameters: ['description'],
  },
  {
    name: 'order_status',
    description: 'User is asking about their order status',
    examples: [
      'where is my order', 'track my order', 'order status', 'when will it arrive',
      'my order number is', 'order id'
    ],
    action: 'handleOrderStatus',
    parameters: {
      orderId: { name: 'orderId', type: 'string', description: 'Order ID or number' },
    },
  },
  {
    name: 'account_help',
    description: 'User needs help with their account',
    examples: [
      'I cannot login', 'forgot my password', 'reset my password',
      'change my email', 'update my profile', 'account settings'
    ],
    action: 'handleAccountHelp',
  },
  {
    name: 'request_human',
    description: 'User wants to speak with a human agent',
    examples: [
      'transfer me to an agent', 'let me talk to someone', 'connect me to support',
      'speak to a human', 'get a real person', 'मनुष्य से बात करनी है'
    ],
    action: 'handleHumanRequest',
    escalationThreshold: -0.5,
  },
  {
    name: 'thanks',
    description: 'User is expressing gratitude',
    examples: [
      'thank you', 'thanks', 'dhanyavaad', 'shukriya', 'thank you so much',
      'that helps', 'appreciate it'
    ],
    action: 'handleThanks',
    followUp: 'Is there anything else I can help you with?',
  },
  {
    name: 'goodbye',
    description: 'User is ending the conversation',
    examples: [
      'goodbye', 'bye', 'that is all', 'end call', 'thank you goodbye',
      'alvida', 'पहले ही ठीक है'
    ],
    action: 'handleGoodbye',
  },
  {
    name: 'unknown',
    description: 'Intent for unrecognized queries',
    examples: [],
    action: 'handleUnknown',
  },
];

export class CustomerServiceAgent extends BaseVoiceAgent {
  private ticketQueue: Map<string, { category: string; description: string; timestamp: Date }> = new Map();

  constructor(config: AgentConfig) {
    super(config);

    // Merge default intents with agent's intents if none defined
    if (this.agent.intents.length === 0) {
      this.agent.intents = DEFAULT_CUSTOMER_SERVICE_INTENTS.map((intent, idx) => ({
        ...intent,
        id: `cs_intent_${idx}`,
      }));
    }
  }

  protected async handleIntent(
    intent: IntentDefinition,
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string> {
    switch (intent.action) {
      case 'handleGreeting':
        return this.handleGreeting();
      case 'handleFAQ':
        return this.handleFAQ(parameters);
      case 'handleComplaint':
        return this.handleComplaint(parameters, sentiment);
      case 'handleTicketCreation':
        return this.handleTicketCreation(parameters);
      case 'handleOrderStatus':
        return this.handleOrderStatus(parameters);
      case 'handleAccountHelp':
        return this.handleAccountHelp(parameters);
      case 'handleHumanRequest':
        return this.handleHumanRequest();
      case 'handleThanks':
        return this.handleThanks();
      case 'handleGoodbye':
        return this.handleGoodbye();
      default:
        return this.handleUnknown();
    }
  }

  protected getAgentCapabilities(): string {
    return 'answering frequently asked questions, tracking orders, creating support tickets, and helping with account issues';
  }

  private handleGreeting(): string {
    const greetings: Record<string, string> = {
      'en-IN': 'Namaste! Welcome to our customer service. How can I assist you today?',
      'hi-IN': 'नमस्ते! आपका स्वागत है। आज मैं आपकी कैसे मदद कर सकता हूं?',
      'ta-IN': 'வணக்கம்! எங்கள் வாடிக்கையாளர் சேவையில் வரவேற்கிறோம். இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?',
      'te-IN': 'నమస్కారం! మా కస్టమర్ సర్వీస్‌కు స్వాగతం. ఈ రోజు మీకు ఎలా సహాయం చేయాలి?',
      'bn-IN': 'হ্যালো! আমাদের গ্রাহক পরিষেবায় স্বাগতম। আজ আপনাকে কীভাবে সাহায্য করতে পারি?',
    };

    return greetings[this.session?.language || 'en-IN'] || greetings['en-IN'];
  }

  private handleFAQ(parameters: Record<string, unknown>): string {
    // In a real implementation, this would look up FAQs from a database
    const faqs: Record<string, Record<string, string>> = {
      'what are your hours': {
        'en-IN': 'Our business hours are Monday to Saturday, 9 AM to 6 PM.',
        'hi-IN': 'हमारे कार्यालय के घंटे सोमवार से शनिवार, सुबह 9 बजे से शाम 6 बजे तक हैं।',
      },
      'where are you located': {
        'en-IN': 'We are located in Mumbai, India. You can also reach us online 24/7.',
        'hi-IN': 'हम मुंबई, भारत में स्थित हैं। आप 24/7 ऑनलाइन भी हमसे संपर्क कर सकते हैं।',
      },
      'default': {
        'en-IN': 'For more information, please visit our website or I can create a support ticket for you.',
        'hi-IN': 'अधिक जानकारी के लिए, कृपया हमारी वेबसाइट देखें या मैं आपके लिए एक सपोर्ट टिकट बना सकता हूं।',
      },
    };

    const question = String(parameters.question || '').toLowerCase();
    const lang = this.session?.language || 'en-IN';

    for (const [key, responses] of Object.entries(faqs)) {
      if (question.includes(key)) {
        return responses[lang] || responses['en-IN'];
      }
    }

    return faqs['default'][lang] || faqs['default']['en-IN'];
  }

  private async handleComplaint(
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string> {
    const complaint = parameters.description || parameters.complaint || '';

    // Create a ticket for the complaint
    const ticketId = await this.createTicket('complaint', String(complaint));

    if (sentiment.score < -0.7) {
      return `I sincerely apologize for the inconvenience you've experienced. I've created a priority ticket (ID: ${ticketId}) and will ensure our team addresses this immediately. Would you like me to transfer you to a specialist?`;
    }

    return `Thank you for bringing this to our attention. I've created a support ticket (ID: ${ticketId}) for your complaint. Our team will review it and get back to you within 24 hours. Is there anything else I can help you with?`;
  }

  private async handleTicketCreation(parameters: Record<string, unknown>): Promise<string> {
    const category = String(parameters.category || 'general');
    const description = String(parameters.description || '');

    if (!description) {
      return `I'd be happy to create a support ticket. Could you please describe the issue you're experiencing?`;
    }

    const ticketId = await this.createTicket(category, description);

    return `I've successfully created a support ticket for you. Your ticket ID is ${ticketId}. Our team will respond within 24 hours. Is there anything else I can help you with?`;
  }

  private async createTicket(category: string, description: string): Promise<string> {
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

    this.ticketQueue.set(ticketId, {
      category,
      description,
      timestamp: new Date(),
    });

    // In production, this would save to a database
    this.emit('ticket:created', { ticketId, category, description });

    return ticketId;
  }

  private handleOrderStatus(parameters: Record<string, unknown>): string {
    const orderId = parameters.orderId;

    if (!orderId) {
      return `I'd be happy to check your order status. Could you please provide your order ID or the phone number used for the order?`;
    }

    // In production, this would look up the order
    return `I found your order (${orderId}). It is currently being processed and is expected to be delivered within 2-3 business days. You'll receive an SMS update when it ships.`;
  }

  private handleAccountHelp(parameters: Record<string, unknown>): string {
    const issue = String(parameters.issue || '');

    if (issue.includes('password') || issue.includes('login')) {
      return `I can help you with your account. Please visit our website and click on 'Forgot Password' to reset your password. You'll receive an email with instructions. Would you like me to email you a reset link?`;
    }

    return `For account-related issues, I recommend visiting our website's account settings section. If you need further assistance, I can create a support ticket for you.`;
  }

  private handleHumanRequest(): string {
    return `I understand you'd like to speak with a human agent. Let me transfer you to our support team. Please hold on for a moment.`;
  }

  private handleThanks(): string {
    const responses: Record<string, string> = {
      'en-IN': "You're welcome! Is there anything else I can help you with?",
      'hi-IN': 'आपका धन्यवाद! क्या आपकी कुछ और मदद कर सकता हूं?',
      'ta-IN': 'நன்றி! வேறு ஏதாவது உதவி தேவையா?',
    };

    return responses[this.session?.language || 'en-IN'] || responses['en-IN'];
  }

  private async handleGoodbye(): Promise<string> {
    await this.endSession();

    const farewells: Record<string, string> = {
      'en-IN': 'Thank you for calling. Have a great day!',
      'hi-IN': 'कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!',
      'ta-IN': 'அழைத்தமைக்கு நன்றி. உங்கள் நாள் நன்மையடையட்டும்!',
    };

    return farewells[this.session?.language || 'en-IN'] || farewells['en-IN'];
  }

  private handleUnknown(): string {
    return `I'm here to help with customer service questions, order tracking, and support tickets. How can I assist you today?`;
  }
}

/**
 * Factory function to create a Customer Service Agent
 */
export function createCustomerServiceAgent(agent: VoiceAgent): CustomerServiceAgent {
  return new CustomerServiceAgent({ agent });
}
