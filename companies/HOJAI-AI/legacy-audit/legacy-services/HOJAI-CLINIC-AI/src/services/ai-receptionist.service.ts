import OpenAI from 'openai';
import { AgentConfig, AgentConversation, Clinic, Doctor } from '../models';
import { AgentType, IApiResponse } from '../types';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class AIReceptionistService {
  private openai: OpenAI;
  private agentType: AgentType = 'receptionist';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Handle incoming receptionist query
   */
  async handleQuery(
    clinicId: string,
    message: string,
    sessionId?: string,
    patientContext?: {
      patientId?: string;
      patientName?: string;
      lastVisit?: Date;
    }
  ): Promise<{
    response: string;
    sessionId: string;
    intent?: string;
    entities?: Record<string, unknown>;
    action?: string;
  }> {
    // Get or create conversation session
    const finalSessionId = sessionId || uuidv4();

    const conversation = await AgentConversation.getOrCreateSession(
      clinicId as any,
      this.agentType,
      finalSessionId,
      patientContext?.patientId as any
    );

    // Get clinic context
    const clinic = await Clinic.findById(clinicId).lean();
    const doctors = await Doctor.find({ clinicId: clinicId as any, isActive: true })
      .select('name specialization consultationFee')
      .lean();

    // Get agent configuration
    const agentConfig = await AgentConfig.getAgentByType(clinicId as any, this.agentType);

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(
      clinic,
      doctors,
      agentConfig?.instructions || this.getDefaultInstructions(),
      agentConfig?.language || 'hi'
    );

    // Add user message to conversation
    await conversation.addMessage('user', message, { patientContext });

    // Build messages for OpenAI
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call OpenAI
    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    const response = completion.choices[0]?.message?.content || 'I am sorry, I did not understand that.';

    // Add assistant response to conversation
    await conversation.addMessage('assistant', response);

    // Parse intent and entities
    const { intent, entities, action } = this.parseResponse(response);

    return {
      response,
      sessionId: finalSessionId,
      intent,
      entities,
      action,
    };
  }

  /**
   * Build system prompt with clinic context
   */
  private buildSystemPrompt(
    clinic: any,
    doctors: any[],
    instructions: string,
    language: string
  ): string {
    const greeting = `You are an AI receptionist for a medical clinic.`;
    const languageInstruction = language === 'hi'
      ? 'Always respond in Hindi (with some English for medical terms).'
      : 'Always respond in English.';

    const clinicInfo = clinic
      ? `
Clinic Information:
- Name: ${clinic.name}
- Phone: ${clinic.phone}
- Address: ${clinic.address?.street}, ${clinic.address?.city}, ${clinic.address?.state} ${clinic.address?.pincode}
- Working Hours: ${this.formatWorkingHours(clinic.workingHours)}
- Specialties: ${clinic.specialty?.join(', ') || 'General'}
`
      : '';

    const doctorInfo = doctors.length > 0
      ? `
Available Doctors:
${doctors.map((d) => `- ${d.name} (${d.specialization}) - Consultation Fee: ₹${d.consultationFee}`).join('\n')}
`
      : '';

    const appointmentRules = `
Appointment Booking Rules:
- Ask for patient name and phone number for new appointments
- Confirm date and time preference before booking
- Inform about consultation fees before booking
- Can book: consultations, follow-ups, teleconsultations
- Cannot book: procedures or emergency appointments (escalate to staff)
`;

    const faqResponses = `
FAQ Responses:
- Fees: Provide consultation fee from doctor information
- Timings: Read from working hours
- Location: Provide full address
- Doctors: List available doctors with their specializations
- Services: Based on clinic specialties
`;

    return `${greeting}
${languageInstruction}

${instructions}

${clinicInfo}
${doctorInfo}
${appointmentRules}
${faqResponses}

Remember:
- Be polite and professional
- Collect necessary information before taking actions
- If you cannot help, ask to connect with staff
- Never provide medical advice
`;
  }

  /**
   * Format working hours for display
   */
  private formatWorkingHours(workingHours: any[]): string {
    if (!workingHours || workingHours.length === 0) {
      return '9:00 AM - 6:00 PM';
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openDays = workingHours.filter((wh) => wh.isOpen);

    if (openDays.length === 0) return 'Closed';

    const hours = openDays.map((wh) => `${dayNames[wh.day]}: ${wh.start} - ${wh.end}`);
    return hours.join(', ');
  }

  /**
   * Get default instructions for receptionist
   */
  private getDefaultInstructions(): string {
    return `You are an AI receptionist for a medical clinic. Your responsibilities include:
- Greeting patients warmly
- Answering frequently asked questions about the clinic, services, and doctors
- Booking, rescheduling, and cancelling appointments
- Collecting patient information for new registrations
- Providing clinic working hours and location details
- Being polite, patient, and professional at all times
- Never provide medical advice or diagnosis`;
  }

  /**
   * Parse response to extract intent and entities
   */
  private parseResponse(response: string): {
    intent?: string;
    entities?: Record<string, unknown>;
    action?: string;
  } {
    // Simple pattern matching for common intents
    const patterns = [
      { pattern: /book|appointment|schedule/i, intent: 'book_appointment', action: 'collect_booking_info' },
      { pattern: /cancel/i, intent: 'cancel_appointment', action: 'collect_cancellation_info' },
      { pattern: /reschedule|change.*date|change.*time/i, intent: 'reschedule_appointment', action: 'collect_reschedule_info' },
      { pattern: /fee|charge|price|₹|cost/i, intent: 'fee_inquiry', action: 'provide_fee_info' },
      { pattern: /timing|hour|open|close/i, intent: 'timing_inquiry', action: 'provide_timings' },
      { pattern: /location|address|directions/i, intent: 'location_inquiry', action: 'provide_address' },
      { pattern: /doctor|specialist/i, intent: 'doctor_inquiry', action: 'list_doctors' },
      { pattern: /thank|thanks/i, intent: 'gratitude', action: 'close_conversation' },
      { pattern: /bye|goodbye/i, intent: 'farewell', action: 'close_conversation' },
    ];

    for (const { pattern, intent, action } of patterns) {
      if (pattern.test(response)) {
        return { intent, action };
      }
    }

    return {};
  }

  /**
   * Process phone call transcript
   */
  async processCallTranscript(
    clinicId: string,
    transcript: string,
    callDuration: number
  ): Promise<{
    summary: string;
    intent: string;
    entities: Record<string, unknown>;
    recommendations: string[];
  }> {
    const prompt = `
Analyze this phone call transcript for a medical clinic and provide:
1. A brief summary (2-3 sentences)
2. Primary intent (e.g., book_appointment, cancel_appointment, inquiry)
3. Key entities extracted (patient_name, phone, date, time, doctor, reason)
4. Action recommendations for the clinic staff

Transcript:
${transcript}

Call Duration: ${Math.floor(callDuration / 60)} minutes ${callDuration % 60} seconds

Respond in JSON format:
{
  "summary": "...",
  "intent": "...",
  "entities": { ... },
  "recommendations": ["...", "..."]
}
`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    try {
      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch {
      return {
        summary: 'Call processed',
        intent: 'unknown',
        entities: {},
        recommendations: ['Review call transcript manually'],
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    clinicId: string,
    sessionId: string
  ): Promise<IApiResponse<any>> {
    const conversation = await AgentConversation.findOne({
      clinicId: clinicId as any,
      sessionId,
      isActive: true,
    });

    if (!conversation) {
      return {
        success: false,
        error: 'Conversation not found',
      };
    }

    return {
      success: true,
      data: conversation,
    };
  }
}

export const aiReceptionistService = new AIReceptionistService();
export default aiReceptionistService;
