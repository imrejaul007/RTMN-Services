// ============================================================================
// HOJAI VOICE PLATFORM - Voice Agents Index
// ============================================================================

export { BaseVoiceAgent, AgentConfig, ConversationTurn } from './base.agent';
export {
  CustomerServiceAgent,
  createCustomerServiceAgent,
  DEFAULT_CUSTOMER_SERVICE_INTENTS,
} from './customer-service.agent';
export {
  VoiceCommerceAgent,
  createVoiceCommerceAgent,
  DEFAULT_VOICE_COMMERCE_INTENTS,
  CartItem,
  OrderResult,
} from './voice-commerce.agent';
export {
  VoiceSearchAgent,
  createVoiceSearchAgent,
  DEFAULT_VOICE_SEARCH_INTENTS,
  SearchResult,
} from './voice-search.agent';
export {
  AppointmentAgent,
  createAppointmentAgent,
  DEFAULT_APPOINTMENT_INTENTS,
  Appointment,
} from './appointment.agent';

import { VoiceAgent, AgentType } from '../types';
import {
  BaseVoiceAgent,
  CustomerServiceAgent,
  VoiceCommerceAgent,
  VoiceSearchAgent,
  AppointmentAgent,
} from './index';

/**
 * Factory function to create a voice agent based on type
 */
export function createVoiceAgent(agent: VoiceAgent): BaseVoiceAgent {
  switch (agent.type) {
    case 'customer-service':
      return new CustomerServiceAgent({ agent });
    case 'voice-commerce':
      return new VoiceCommerceAgent({ agent });
    case 'voice-search':
      return new VoiceSearchAgent({ agent });
    case 'appointment':
      return new AppointmentAgent({ agent });
    default:
      // Default to customer service for unknown types
      return new CustomerServiceAgent({ agent });
  }
}

/**
 * Get default intents for an agent type
 */
export function getDefaultIntents(agentType: AgentType): Array<{ name: string; action: string; examples: string[] }> {
  switch (agentType) {
    case 'customer-service':
      return [
        { name: 'greeting', action: 'handleGreeting', examples: ['hello', 'hi', 'namaste'] },
        { name: 'faq', action: 'handleFAQ', examples: ['what are your hours', 'where are you located'] },
        { name: 'complaint', action: 'handleComplaint', examples: ['I have a problem', 'something is wrong'] },
        { name: 'ticket_creation', action: 'handleTicketCreation', examples: ['create a ticket', 'raise a complaint'] },
        { name: 'thanks', action: 'handleThanks', examples: ['thank you', 'thanks'] },
        { name: 'goodbye', action: 'handleGoodbye', examples: ['bye', 'goodbye'] },
      ];
    case 'voice-commerce':
      return [
        { name: 'greeting', action: 'handleGreeting', examples: ['hello', 'hi', 'namaste'] },
        { name: 'product_search', action: 'handleProductSearch', examples: ['find me a pizza', 'show me shoes'] },
        { name: 'add_to_cart', action: 'handleAddToCart', examples: ['add to cart', 'add this'] },
        { name: 'place_order', action: 'handlePlaceOrder', examples: ['checkout', 'place order'] },
        { name: 'track_order', action: 'handleOrderTracking', examples: ['where is my order', 'track order'] },
        { name: 'goodbye', action: 'handleGoodbye', examples: ['bye', 'goodbye'] },
      ];
    case 'voice-search':
      return [
        { name: 'greeting', action: 'handleGreeting', examples: ['hello', 'hi'] },
        { name: 'search', action: 'handleSearch', examples: ['find me a hotel', 'search for restaurants'] },
        { name: 'directions', action: 'handleDirections', examples: ['how do I get there', 'give me directions'] },
        { name: 'call', action: 'handleCallBusiness', examples: ['call them', 'contact'] },
        { name: 'goodbye', action: 'handleGoodbye', examples: ['bye', 'goodbye'] },
      ];
    case 'appointment':
      return [
        { name: 'greeting', action: 'handleGreeting', examples: ['hello', 'hi'] },
        { name: 'schedule', action: 'handleSchedule', examples: ['book an appointment', 'schedule a visit'] },
        { name: 'reschedule', action: 'handleReschedule', examples: ['change my appointment', 'reschedule'] },
        { name: 'cancel', action: 'handleCancel', examples: ['cancel my appointment', 'I cannot come'] },
        { name: 'confirm', action: 'handleConfirm', examples: ['confirm', 'yes book it'] },
        { name: 'goodbye', action: 'handleGoodbye', examples: ['bye', 'goodbye'] },
      ];
    default:
      return [];
  }
}
