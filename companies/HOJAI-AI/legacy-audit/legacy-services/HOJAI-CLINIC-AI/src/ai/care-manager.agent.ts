import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig, CarePlan } from '../models';
import { AgentType } from '../types';

export class CareManagerAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'care_manager';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async createCarePlan(
    clinicId: string,
    patientId: string,
    doctorId: string,
    data: {
      title: string;
      description: string;
      startDate: Date;
      tasks: Array<{ title: string; description?: string; dueDate?: Date }>;
      milestones?: Array<{ title: string; targetDate: Date }>;
    }
  ): Promise<CarePlan> {
    const carePlan = new CarePlan({
      clinicId,
      patientId,
      doctorId,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      tasks: data.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        status: 'pending',
      })),
      milestones: data.milestones?.map((m) => ({
        title: m.title,
        targetDate: m.targetDate,
        status: 'pending',
      })) || [],
      status: 'active',
    });

    await carePlan.save();
    return carePlan;
  }

  async generateFollowUpMessage(
    patientName: string,
    carePlan: any,
    upcomingTasks: any[]
  ): Promise<string> {
    const agentConfig = await AgentConfig.getAgentByType(carePlan.clinicId, this.agentType);

    const prompt = `Generate a follow-up message for patient ${patientName}.

Care Plan: ${carePlan.title}
Upcoming Tasks:
${upcomingTasks.map((t) => `- ${t.title} (due: ${t.dueDate})`).join('\n')}

Keep it concise, encouraging, and in Hindi/English.`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: agentConfig?.instructions || 'You are a care manager assistant.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'Please remember to follow your care plan.';
  }

  async assessPatientRisk(
    clinicId: string,
    patientId: string,
    appointmentHistory: any[],
    carePlans: any[]
  ): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  }> {
    const prompt = `Assess patient risk based on:
- ${appointmentHistory.length} past appointments
- ${carePlans.length} active care plans

Evaluate:
1. Appointment frequency
2. Missed appointments
3. Care plan adherence
4. Chronic conditions

Respond with risk level and recommendations.`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || '';

    return {
      riskLevel: response.includes('high') ? 'high' : response.includes('medium') ? 'medium' : 'low',
      factors: [],
      recommendations: response.split('\n').filter((l) => l.trim()),
    };
  }
}

export const careManagerAgent = new CareManagerAgent();
