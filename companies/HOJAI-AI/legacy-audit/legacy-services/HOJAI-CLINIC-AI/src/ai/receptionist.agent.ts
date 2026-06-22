import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig, AgentConversation, Clinic, Doctor } from '../models';
import { AgentType } from '../types';

export class ReceptionistAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'receptionist';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async processMessage(
    clinicId: string,
    message: string,
    context: {
      patientId?: string;
      patientName?: string;
      sessionId?: string;
      channel: 'whatsapp' | 'voice' | 'chat' | 'api';
    }
  ): Promise<{
    response: string;
    intent: string;
    entities: Record<string, unknown>;
    action: string;
  }> {
    // Get clinic context
    const clinic = await Clinic.findById(clinicId).lean();
    const doctors = await Doctor.find({ clinicId, isActive: true })
      .select('name specialization consultationFee')
      .lean();

    // Get agent config
    const agentConfig = await AgentConfig.getAgentByType(clinicId as any, this.agentType);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(clinic, doctors, agentConfig);

    // Generate response
    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    const response = completion.choices[0]?.message?.content || 'I am sorry, I could not understand that.';

    // Parse intent and entities
    const { intent, entities, action } = this.extractIntent(response);

    return { response, intent, entities, action };
  }

  private buildSystemPrompt(clinic: any, doctors: any[], agentConfig: any): string {
    const greeting = agentConfig?.greeting || 'Namaste! Welcome to our clinic. How can I help you today?';
    const instructions = agentConfig?.instructions || this.getDefaultInstructions();
    const language = agentConfig?.language || 'hi';

    const languageInstruction = language === 'hi'
      ? 'Respond in Hindi (with some English for medical terms).'
      : 'Respond in English.';

    const clinicInfo = clinic ? `
Clinic: ${clinic.name}
Phone: ${clinic.phone}
Address: ${clinic.address?.street}, ${clinic.address?.city}, ${clinic.address?.state}
Hours: ${this.formatWorkingHours(clinic.workingHours)}
` : '';

    const doctorInfo = doctors.length > 0 ? `
Available Doctors:
${doctors.map((d) => `- ${d.name} (${d.specialization}) - ₹${d.consultationFee}`).join('\n')}
` : '';

    return `${greeting}

${languageInstruction}

${instructions}

${clinicInfo}
${doctorInfo}

Always be polite, professional, and helpful. Never provide medical advice.
`;
  }

  private getDefaultInstructions(): string {
    return `You are an AI receptionist for a medical clinic. You help patients:
- Book, reschedule, and cancel appointments
- Get information about doctors and services
- Answer FAQs about the clinic
- Provide clinic hours and location

Always ask clarifying questions before taking action.
Never provide medical advice or diagnosis.`;
  }

  private formatWorkingHours(workingHours: any[]): string {
    if (!workingHours) return '9:00 AM - 6:00 PM';
    const openDays = workingHours.filter((wh: any) => wh.isOpen);
    if (openDays.length === 0) return 'Closed';
    const first = openDays[0];
    return `${first.start} - ${first.end}`;
  }

  private extractIntent(response: string): { intent: string; entities: Record<string, unknown>; action: string } {
    const lower = response.toLowerCase();

    if (lower.includes('book') || lower.includes('appointment')) {
      return { intent: 'book_appointment', entities: {}, action: 'collect_booking_info' };
    }
    if (lower.includes('cancel')) {
      return { intent: 'cancel_appointment', entities: {}, action: 'collect_cancellation_info' };
    }
    if (lower.includes('doctor') || lower.includes('specialist')) {
      return { intent: 'doctor_inquiry', entities: {}, action: 'list_doctors' };
    }
    if (lower.includes('fee') || lower.includes('cost') || lower.includes('₹')) {
      return { intent: 'fee_inquiry', entities: {}, action: 'provide_fee_info' };
    }
    if (lower.includes('hour') || lower.includes('open') || lower.includes('timing')) {
      return { intent: 'timing_inquiry', entities: {}, action: 'provide_timings' };
    }
    if (lower.includes('address') || lower.includes('location')) {
      return { intent: 'location_inquiry', entities: {}, action: 'provide_address' };
    }

    return { intent: 'general_inquiry', entities: {}, action: 'provide_info' };
  }
}

export const receptionistAgent = new ReceptionistAgent();
