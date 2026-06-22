import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { merchantService } from './merchantService.js';
import { paymentService } from './paymentService.js';

// ============================================================================
// ONBOARDING MODEL
// ============================================================================

export interface OnboardingSession {
  id: string;
  email: string;
  phone: string;
  status: 'pending' | 'email_verified' | 'phone_verified' | 'completed';

  // Business info
  businessName?: string;
  businessType?: string;
  city?: string;

  // Verification
  emailOtp?: string;
  emailOtpExpiry?: Date;
  phoneOtp?: string;
  phoneOtpExpiry?: Date;

  // Steps completed
  steps: {
    basicInfo: boolean;
    whatsappConnected: boolean;
    knowledgeAdded: boolean;
    paymentDone: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSchema = new Schema({
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'email_verified', 'phone_verified', 'completed'],
    default: 'pending'
  },
  businessName: String,
  businessType: String,
  city: String,
  emailOtp: String,
  emailOtpExpiry: Date,
  phoneOtp: String,
  phoneOtpExpiry: Date,
  steps: {
    basicInfo: { type: Boolean, default: false },
    whatsappConnected: { type: Boolean, default: false },
    knowledgeAdded: { type: Boolean, default: false },
    paymentDone: { type: Boolean, default: false }
  }
}, { timestamps: true });

OnboardingSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
OnboardingSchema.set('toJSON', { virtuals: true });
OnboardingSchema.set('toObject', { virtuals: true });

export const OnboardingModel: Model<OnboardingSession> = mongoose.model('OnboardingSession', OnboardingSchema);

// ============================================================================
// ONBOARDING SERVICE
// ============================================================================

export class OnboardingService {
  /**
   * Start onboarding - create session
   */
  async startOnboarding(params: {
    email: string;
    phone: string;
  }): Promise<{ sessionId: string; nextStep: string }> {
    // Check if already exists
    const existing = await OnboardingModel.findOne({ email: params.email });
    if (existing) {
      // Return existing session
      return {
        sessionId: (existing as any)._id.toString(),
        nextStep: this.getNextStep(existing.status, existing.steps)
      };
    }

    // Create new session
    const session = new OnboardingModel({
      email: params.email,
      phone: params.phone
    });
    await session.save();

    // Send email OTP
    await this.sendEmailOtp(session);

    return {
      sessionId: (session as any)._id.toString(),
      nextStep: 'verify_email'
    };
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOtp(sessionId: string, otp: string): Promise<{ verified: boolean; nextStep: string }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.emailOtpExpiry && session.emailOtpExpiry < new Date()) {
      throw new Error('OTP expired');
    }

    if (session.emailOtp !== otp) {
      throw new Error('Invalid OTP');
    }

    session.status = 'email_verified';
    session.emailOtp = undefined;
    session.emailOtpExpiry = undefined;
    await session.save();

    return {
      verified: true,
      nextStep: 'business_info'
    };
  }

  /**
   * Save business info
   */
  async saveBusinessInfo(sessionId: string, params: {
    businessName: string;
    businessType: string;
    city: string;
  }): Promise<{ saved: boolean; nextStep: string }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.businessName = params.businessName;
    session.businessType = params.businessType;
    session.city = params.city;
    session.steps.basicInfo = true;
    await session.save();

    return {
      saved: true,
      nextStep: 'connect_whatsapp'
    };
  }

  /**
   * Connect WhatsApp
   */
  async connectWhatsApp(sessionId: string, params: {
    whatsappNumber: string;
  }): Promise<{ connected: boolean; webhookUrl: string }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.steps.whatsappConnected = true;
    await session.save();

    // Generate webhook URL
    const webhookUrl = `/webhook/whatsapp?merchant=${sessionId}`;

    return {
      connected: true,
      webhookUrl
    };
  }

  /**
   * Add initial knowledge base items
   */
  async addInitialKnowledge(sessionId: string, items: Array<{
    question: string;
    answer: string;
    category?: string;
    keywords?: string[];
  }>): Promise<{ added: number; nextStep: string }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Create merchant first
    const merchant = await merchantService.createMerchant({
      name: session.businessName || 'My Business',
      email: session.email,
      phone: session.phone,
      businessType: session.businessType || 'general',
      whatsappNumber: session.businessName, // Will be updated
      city: session.city
    });

    // Add knowledge items
    let added = 0;
    for (const item of items) {
      await merchantService.addKnowledgeItem({
        tenantId: merchant.tenantId,
        merchantId: merchant.id,
        category: item.category || 'general',
        question: item.question,
        answer: item.answer,
        keywords: item.keywords
      });
      added++;
    }

    session.steps.knowledgeAdded = true;
    await session.save();

    return {
      added,
      nextStep: 'payment'
    };
  }

  /**
   * Create subscription (payment)
   */
  async createSubscription(sessionId: string, plan: 'trial' | 'starter'): Promise<{
    subscriptionId: string;
    checkoutUrl?: string;
  }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get merchant by email
    const merchants = await merchantService.getMerchantByTenantId(session._id.toString());

    const result = await paymentService.createSubscription({
      tenantId: merchants?.tenantId || sessionId,
      merchantId: merchants?.id || sessionId,
      plan,
      customerEmail: session.email,
      customerPhone: session.phone
    });

    if (result.checkoutUrl) {
      return result;
    }

    // Trial - no payment needed
    session.steps.paymentDone = true;
    session.status = 'completed';
    await session.save();

    return {
      subscriptionId: result.subscriptionId,
      checkoutUrl: undefined
    };
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(sessionId: string): Promise<{
    merchantId: string;
    apiKey: string;
    webhookUrl: string;
  }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get merchant
    const merchant = await merchantService.getMerchantByTenantId(session._id.toString());
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    session.status = 'completed';
    session.steps.paymentDone = true;
    await session.save();

    return {
      merchantId: merchant.id,
      apiKey: merchant.apiKey,
      webhookUrl: `/webhook/whatsapp?merchant=${sessionId}`
    };
  }

  /**
   * Resend email OTP
   */
  async resendEmailOtp(sessionId: string): Promise<void> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await this.sendEmailOtp(session);
  }

  /**
   * Send email OTP
   */
  private async sendEmailOtp(session: any): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    session.emailOtp = otp;
    session.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await session.save();

    // In production, send email
    console.log(`[Onboarding] Email OTP for ${session.email}: ${otp}`);

    // TODO: Send via email service
    // await emailService.send({
    //   to: session.email,
    //   subject: 'Verify your Hojai AI account',
    //   body: `Your OTP is: ${otp}`
    // });
  }

  /**
   * Get onboarding status
   */
  async getStatus(sessionId: string): Promise<{
    status: string;
    steps: Record<string, boolean>;
    nextStep: string;
    progress: number;
  }> {
    const session = await OnboardingModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const stepCount = Object.values(session.steps).filter(Boolean).length;
    const progress = Math.round((stepCount / 4) * 100);

    return {
      status: session.status,
      steps: session.steps,
      nextStep: this.getNextStep(session.status, session.steps),
      progress
    };
  }

  /**
   * Get next step based on current state
   */
  private getNextStep(status: string, steps: Record<string, boolean>): string {
    if (status === 'pending') return 'verify_email';
    if (!steps.basicInfo) return 'business_info';
    if (!steps.whatsappConnected) return 'connect_whatsapp';
    if (!steps.knowledgeAdded) return 'add_knowledge';
    if (!steps.paymentDone) return 'payment';
    return 'completed';
  }

  /**
   * Get onboarding templates by business type
   */
  getKnowledgeTemplates(businessType: string): Array<{
    category: string;
    question: string;
    answer: string;
  }> {
    const templates: Record<string, Array<any>> = {
      salon: [
        { category: 'greeting', question: 'Hi / Hello', answer: 'Hello! Welcome to {{businessName}}. How can I help you today? We offer hair cuts, coloring, facials and more!' },
        { category: 'pricing', question: 'What are your prices?', answer: 'Our services:\n• Haircut: ₹200-500\n• Haircolor: ₹1500-5000\n• Facial: ₹500-1500\n• Hair treatment: ₹2000+' },
        { category: 'hours', question: 'What are your hours?', answer: 'We are open Monday-Saturday, 9 AM to 8 PM. Closed on Sundays.' },
        { category: 'booking', question: 'I want to book', answer: 'I would love to help you book! What service would you like and when would you prefer to come in?' },
        { category: 'location', question: 'Where are you located?', answer: 'We are located at [Your Address]. Free parking available!' },
        { category: 'home', question: 'Do you offer home service?', answer: 'Yes! We offer home service with ₹200 extra charge within 10km. Would you like to schedule?' }
      ],
      restaurant: [
        { category: 'greeting', question: 'Hi / Hello', answer: 'Hello! Welcome to {{businessName}}. Ready to take your order!' },
        { category: 'menu', question: 'What\'s on the menu?', answer: 'We serve:\n• Starters: ₹150-400\n• Main Course: ₹250-600\n• Desserts: ₹150-300\n• Beverages: ₹80-200' },
        { category: 'hours', question: 'When are you open?', answer: 'We are open 11 AM to 11 PM daily.' },
        { category: 'order', question: 'I want to order', answer: 'Great choice! What would you like to order? Check out our menu and let me know!' },
        { category: 'delivery', question: 'Do you deliver?', answer: 'Yes! We deliver within 5km. ₹50 delivery charge. Minimum order ₹300.' },
        { category: 'reservation', question: 'I want to book a table', answer: 'I would be happy to help with a reservation! How many people and what date/time?' }
      ],
      clinic: [
        { category: 'greeting', question: 'Hi / Hello', answer: 'Hello! Welcome to {{businessName}}. How may I assist you today?' },
        { category: 'hours', question: 'What are your hours?', answer: 'We are open Monday-Saturday, 9 AM to 6 PM. Emergency services available 24/7.' },
        { category: 'appointment', question: 'I want to book', answer: 'I will help you schedule an appointment. What is the reason for your visit?' },
        { category: 'fees', question: 'What are the consultation fees?', answer: 'Consultation fees:\n• General: ₹300-500\n• Specialist: ₹800-1500\n• Health checkup: ₹1500+' },
        { category: 'location', question: 'Where are you located?', answer: 'We are at [Address]. Near [Landmark].' },
        { category: 'emergency', question: 'Emergency', answer: 'For emergencies, please call our 24/7 helpline: [Number].' }
      ]
    };

    return templates[businessType] || templates.salon;
  }
}

export const onboardingService = new OnboardingService();
