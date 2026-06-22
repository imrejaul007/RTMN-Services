/**
 * Beauty Genie Service
 *
 * Beauty-specific Genie extension that:
 * - Understands beauty/salon domain
 * - Provides personalized beauty advice
 * - Sends beauty follow-ups and reminders
 * - Answers beauty questions
 */

import { logger } from '../../../utils/logger.js';
import { beautyMemoryService } from './beautyMemoryService.js';
import { customerService } from './customerService.js';
import { genieBridge } from '../bridges/genieBridge.js';

// Types
export interface BeautyAdvice {
  type: 'hair_care' | 'skin_care' | 'product' | 'styling' | 'seasonal' | 'general';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  action?: {
    type: 'book' | 'buy' | 'remind';
    value: string;
  };
}

export interface BeautyReminder {
  type: 'rebooking' | 'product' | 'birthday' | 'seasonal' | 'maintenance';
  title: string;
  message: string;
  dueDate: Date;
  customerId: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BeautyConversation {
  customerId: string;
  message: string;
  intent: 'question' | 'booking' | 'complaint' | 'feedback' | 'general';
  entities: {
    service?: string;
    product?: string;
    stylist?: string;
    date?: string;
  };
  response: {
    message: string;
    advice?: BeautyAdvice[];
    actions?: { type: string; label: string; value: string }[];
  };
}

// Beauty knowledge base
const BEAUTY_KNOWLEDGE: Record<string, {
  condition: string;
  advice: string;
  products: string[];
  services: string[];
}> = {
  'dry_hair': {
    condition: 'Dry Hair',
    advice: 'Your hair needs extra moisture. Use sulfate-free shampoo, deep conditioning treatments, and avoid heat styling. Consider a hair spa treatment every 4 weeks.',
    products: ['Moisturizing Shampoo', 'Hair Mask', 'Argan Oil', 'Leave-in Conditioner'],
    services: ['Hair Spa', 'Deep Conditioning', 'Keratin Treatment']
  },
  'oily_scalp': {
    condition: 'Oily Scalp',
    advice: 'Your scalp produces excess oil. Use a clarifying shampoo, avoid heavy conditioners on roots, and consider scalp treatments to balance oil production.',
    products: ['Clarifying Shampoo', 'Scalp Serum', 'Lightweight Conditioner'],
    services: ['Scalp Treatment', 'Hair Spa']
  },
  'hair_loss': {
    condition: 'Hair Loss',
    advice: 'Hair loss can be caused by stress, diet, or hormones. Consider scalp massage, protein treatments, and consult about our hair loss prevention program.',
    products: ['Hair Growth Serum', 'Biotin Supplements', 'Gentle Shampoo'],
    services: ['Scalp Treatment', 'Hair Spa', 'Consultation']
  },
  'colored_hair': {
    condition: 'Colored Hair',
    advice: 'Protect your color with color-safe products. Use sulfate-free shampoo, UV protection, and regular gloss treatments to maintain vibrancy.',
    products: ['Color Protect Shampoo', 'Purple Shampoo', 'Color Gloss', 'Heat Protectant'],
    services: ['Gloss Treatment', 'Color Touch-up', 'Deep Conditioning']
  },
  'curly_hair': {
    condition: 'Curly Hair',
    advice: 'Embrace your curls! Use curl-defining products, avoid sulfates, and consider keratin or smoothing treatments for manageability.',
    products: ['Curl Cream', 'Leave-in Conditioner', 'Curl Gel', 'Sulfate-free Shampoo'],
    services: ['Keratin Treatment', 'Curl Definition', 'Hair Spa']
  },
  'acne_skin': {
    condition: 'Acne-Prone Skin',
    advice: 'Keep your skin clean and avoid heavy products. Consider facials with salicylic acid, and avoid touching your face. We recommend our acne facial treatment.',
    products: ['Salicylic Cleanser', 'Oil-free Moisturizer', 'Spot Treatment'],
    services: ['Acne Facial', 'Deep Cleansing Facial', 'Chemical Peel']
  },
  'dry_skin': {
    condition: 'Dry Skin',
    advice: 'Your skin needs hydration. Use gentle, hydrating products and consider our hydrating facial treatment with hyaluronic acid.',
    products: ['Hydrating Cleanser', 'Hyaluronic Acid Serum', 'Rich Moisturizer'],
    services: ['Hydrating Facial', 'Glass Skin Facial', 'Moisturizing Treatment']
  }
};

// Seasonal advice
const SEASONAL_ADVICE: Record<number, {
  title: string;
  advice: string;
  services: string[];
}> = {
  0: { // January
    title: 'New Year Hair Refresh',
    advice: 'Start the year with a fresh look! Consider a new haircut or color refresh.',
    services: ['Haircut', 'Color Refresh', 'Hair Spa']
  },
  4: { // May
    title: 'Summer Prep',
    advice: 'Get your hair ready for summer! UV protection treatments and lighter colors for summer.',
    services: ['UV Protection Treatment', 'Balayage', 'Hair Spa']
  },
  5: { // June
    title: 'Monsoon Care',
    advice: 'Monsoon is here! Protect your hair from humidity with anti-frizz treatments and products.',
    services: ['Keratin Treatment', 'Anti-Frizz Treatment', 'Scalp Treatment']
  },
  8: { // September
    title: 'Wedding Season',
    advice: 'Wedding season is approaching! Book your bridal packages early.',
    services: ['Bridal Makeup', 'Pre-Bridal Package', 'Hair Styling']
  },
  9: { // October
    title: 'Festive Glow',
    advice: 'Get ready for the festive season with our special glow packages!',
    services: ['Facial', 'Hair Spa', 'Party Makeup']
  }
};

export class BeautyGenieService {
  // Process beauty-related conversation
  async processConversation(
    customerId: string,
    message: string
  ): Promise<BeautyConversation> {
    logger.info(`Processing beauty conversation for ${customerId}: ${message}`);

    // Analyze intent
    const intent = this.analyzeIntent(message);

    // Extract entities
    const entities = this.extractEntities(message);

    // Get customer context
    const intelligence = await customerService.getCustomerIntelligence(customerId);
    const beautyProfile = await beautyMemoryService.getCustomerProfile(customerId);

    // Generate response
    const response = await this.generateResponse(customerId, message, intent, entities, intelligence, beautyProfile);

    return {
      customerId,
      message,
      intent,
      entities,
      response
    };
  }

  // Analyze message intent
  private analyzeIntent(message: string): BeautyConversation['intent'] {
    const lower = message.toLowerCase();

    if (lower.includes('?') || lower.includes('how') || lower.includes('what') || lower.includes('recommend')) {
      return 'question';
    }
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
      return 'booking';
    }
    if (lower.includes('problem') || lower.includes('issue') || lower.includes('not happy') || lower.includes('complaint')) {
      return 'complaint';
    }
    if (lower.includes('feedback') || lower.includes('review') || lower.includes('experience')) {
      return 'feedback';
    }
    return 'general';
  }

  // Extract entities from message
  private extractEntities(message: string): BeautyConversation['entities'] {
    const lower = message.toLowerCase();
    const entities: BeautyConversation['entities'] = {};

    // Services
    const services = ['haircut', 'hair cut', 'color', 'hair color', 'balayage', 'keratin', 'facial', 'spa', 'manicure', 'pedicure', 'bridal', 'makeup', 'hair spa', 'scalp treatment'];
    for (const service of services) {
      if (lower.includes(service)) {
        entities.service = service;
        break;
      }
    }

    // Products
    const products = ['shampoo', 'conditioner', 'serum', 'oil', 'mask', 'cream', 'moisturizer'];
    for (const product of products) {
      if (lower.includes(product)) {
        entities.product = product;
        break;
      }
    }

    // Dates
    const datePatterns = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
    const dateMatch = message.match(datePatterns);
    if (dateMatch) {
      entities.date = dateMatch[0];
    }

    return entities;
  }

  // Generate response based on context
  private async generateResponse(
    customerId: string,
    message: string,
    intent: BeautyConversation['intent'],
    entities: BeautyConversation['entities'],
    intelligence: any,
    beautyProfile: any
  ): Promise<BeautyConversation['response']> {
    const advice: BeautyAdvice[] = [];
    const actions: { type: string; label: string; value: string }[] = [];
    let responseMessage = '';

    switch (intent) {
      case 'question':
        responseMessage = this.generateQuestionResponse(message, intelligence, beautyProfile, advice);
        break;
      case 'booking':
        responseMessage = 'I can help you book an appointment! What service would you like?';
        actions.push({ type: 'book', label: 'Book Appointment', value: 'booking' });
        break;
      case 'complaint':
        responseMessage = 'I\'m sorry to hear that. Let me help you with this. Could you tell me more about the issue?';
        actions.push({ type: 'support', label: 'Contact Support', value: 'support' });
        break;
      case 'feedback':
        responseMessage = 'Thank you for your feedback! We always want to improve your experience.';
        break;
      default:
        responseMessage = this.generateGeneralResponse(intelligence, beautyProfile, advice);
    }

    return {
      message: responseMessage,
      advice: advice.length > 0 ? advice : undefined,
      actions: actions.length > 0 ? actions : undefined
    };
  }

  // Generate response for questions
  private generateQuestionResponse(
    message: string,
    intelligence: any,
    beautyProfile: any,
    advice: BeautyAdvice[]
  ): string {
    const lower = message.toLowerCase();

    // Hair care questions
    if (lower.includes('hair') && (lower.includes('care') || lower.includes('treat') || lower.includes('condition'))) {
      const hairType = beautyProfile?.hairType || intelligence?.beautyProfile?.hairType;
      const scalpCondition = beautyProfile?.scalpCondition || intelligence?.beautyProfile?.scalpCondition;

      const key = this.getHairConditionKey(hairType, scalpCondition);
      const knowledge = BEAUTY_KNOWLEDGE[key];

      if (knowledge) {
        advice.push({
          type: 'hair_care',
          title: knowledge.condition,
          content: knowledge.advice,
          priority: 'high',
          action: { type: 'book', value: knowledge.services[0] }
        });
        return `Based on your ${hairType || 'hair'} type and ${scalpCondition || 'scalp'} condition, here's my advice: ${knowledge.advice}`;
      }
    }

    // Product questions
    if (lower.includes('product') || lower.includes('recommend') || lower.includes('buy')) {
      const knowledge = this.getRelevantKnowledge(intelligence, beautyProfile);
      if (knowledge) {
        advice.push({
          type: 'product',
          title: 'Recommended Products',
          content: `Based on your profile, I recommend: ${knowledge.products.join(', ')}`,
          priority: 'medium'
        });
        return `I recommend these products for you: ${knowledge.products.join(', ')}`;
      }
    }

    // Color questions
    if (lower.includes('color') || lower.includes('dye')) {
      const colorFormula = intelligence?.currentColorFormula;
      if (colorFormula) {
        return `Your last color was ${colorFormula.color} (${colorFormula.brand}). Time for a touch-up?`;
      }
      return 'I can help you choose a color! Would you like to see our color options?';
    }

    // Styling questions
    if (lower.includes('style') || lower.includes('look') || lower.includes('trend')) {
      return 'We have the latest styles! Would you like to see our trending hairstyles or book a styling session?';
    }

    return 'I\'m here to help with all your beauty needs! What would you like to know?';
  }

  // Generate general response
  private generateGeneralResponse(
    intelligence: any,
    beautyProfile: any,
    advice: BeautyAdvice[]
  ): string {
    const messages: string[] = [];

    // Check for overdue services
    if (intelligence?.overdueServices?.length > 0) {
      messages.push(`It's been a while since your last ${intelligence.overdueServices[0]}. Would you like to book one?`);
      advice.push({
        type: 'maintenance',
        title: 'Service Due',
        content: `Your ${intelligence.overdueServices[0]} is due`,
        priority: 'high',
        action: { type: 'book', value: intelligence.overdueServices[0] }
      });
    }

    // Seasonal advice
    const month = new Date().getMonth();
    const seasonal = SEASONAL_ADVICE[month];
    if (seasonal) {
      messages.push(`By the way, ${seasonal.title}: ${seasonal.advice}`);
    }

    // Add personalized greeting
    if (intelligence?.churnRisk === 'high') {
      messages.push('We miss you! It\'s been a while since your last visit. How about a treat-yourself session?');
    } else if (intelligence?.customerTier === 'vip') {
      messages.push('Thank you for being a VIP! As a valued customer, you have access to exclusive offers.');
    }

    return messages.length > 0 ? messages.join(' ') : 'Hello! How can I help you today?';
  }

  // Get hair condition key
  private getHairConditionKey(hairType: string | null, scalpCondition: string | null): string {
    if (hairType === 'curly' || hairType === 'coily') return 'curly_hair';
    if (scalpCondition === 'dry') return 'dry_hair';
    if (scalpCondition === 'oily') return 'oily_scalp';
    return 'dry_hair'; // default
  }

  // Get relevant knowledge based on profile
  private getRelevantKnowledge(intelligence: any, beautyProfile: any): any {
    const hairType = beautyProfile?.hairType || intelligence?.beautyProfile?.hairType;
    const skinType = beautyProfile?.skinType || intelligence?.beautyProfile?.skinType;

    if (hairType === 'curly') return BEAUTY_KNOWLEDGE['curly_hair'];
    if (skinType === 'dry') return BEAUTY_KNOWLEDGE['dry_skin'];
    if (intelligence?.currentColorFormula) return BEAUTY_KNOWLEDGE['colored_hair'];

    return null;
  }

  // Generate beauty reminders for customer
  async generateReminders(customerId: string): Promise<BeautyReminder[]> {
    const reminders: BeautyReminder[] = [];
    const intelligence = await customerService.getCustomerIntelligence(customerId);
    const memoryHistory = await beautyMemoryService.getMemoryHistory(customerId, undefined, 50);

    if (!intelligence) return reminders;

    // Rebooking reminders
    if (intelligence.overdueServices.length > 0) {
      reminders.push({
        type: 'rebooking',
        title: 'Service Due',
        message: `Your ${intelligence.overdueServices[0]} is overdue. Book now to maintain your look!`,
        dueDate: new Date(),
        customerId,
        priority: 'high'
      });
    }

    // Color touch-up reminder
    if (intelligence.currentColorFormula) {
      const lastColor = memoryHistory.hairColorHistory[memoryHistory.hairColorHistory.length - 1];
      if (lastColor) {
        const daysSince = Math.floor((Date.now() - new Date(lastColor.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 21) {
          reminders.push({
            type: 'maintenance',
            title: 'Color Touch-up Due',
            message: `It's been ${daysSince} days since your last color. Time for a touch-up?`,
            dueDate: new Date(),
            customerId,
            priority: 'medium'
          });
        }
      }
    }

    // Seasonal reminders
    const month = new Date().getMonth();
    const seasonal = SEASONAL_ADVICE[month];
    if (seasonal) {
      reminders.push({
        type: 'seasonal',
        title: seasonal.title,
        message: seasonal.advice,
        dueDate: new Date(),
        customerId,
        priority: 'low'
      });
    }

    return reminders;
  }

  // Send beauty follow-up
  async sendFollowUp(customerId: string, type: BeautyReminder['type']): Promise<boolean> {
    const reminders = await this.generateReminders(customerId);
    const reminder = reminders.find(r => r.type === type);

    if (reminder) {
      return genieBridge.sendBeautyFollowUp(customerId, {
        type: type === 'rebooking' ? 'rebooking' : 'seasonal',
        message: reminder.message,
        offer: type === 'rebooking' ? {
          type: 'discount',
          value: 15,
          description: '15% off your next service'
        } : undefined
      });
    }

    return false;
  }
}

export const beautyGenieService = new BeautyGenieService();
