import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig } from '../models';
import { AgentType } from '../types';

export class DoctorAssistantAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'doctor_assistant';

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
      doctorId?: string;
      sessionId?: string;
    }
  ): Promise<{
    response: string;
    vitals?: Record<string, number>;
    summary?: string;
    recommendations?: string[];
  }> {
    const agentConfig = await AgentConfig.getAgentByType(clinicId as any, this.agentType);
    const systemPrompt = this.buildSystemPrompt(agentConfig);

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: config.openai.maxTokens,
      temperature: 0.3, // Lower temperature for clinical accuracy
    });

    const response = completion.choices[0]?.message?.content || '';

    return {
      response,
      summary: this.generateSummary(response),
      recommendations: this.extractRecommendations(response),
    };
  }

  private buildSystemPrompt(agentConfig: any): string {
    return agentConfig?.instructions || `You are a clinical assistant helping doctors. Your responsibilities:
- Collect patient vitals (BP, temperature, pulse, weight, height)
- Assist with patient history taking
- Provide clinical decision support
- Help prepare consultation notes
- Suggest referrals when needed

Always defer to the doctor's judgment. Never make final medical decisions.`;
  }

  private generateSummary(response: string): string {
    // Extract key points from response
    return response.substring(0, 200);
  }

  private extractRecommendations(response: string): string[] {
    const recommendations: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      if (line.includes('-') || line.includes('•') || line.match(/^\d+\./)) {
        recommendations.push(line.replace(/^[\d\.\-\•\s]+/, '').trim());
      }
    }

    return recommendations.slice(0, 5);
  }
}

export const doctorAssistantAgent = new DoctorAssistantAgent();
