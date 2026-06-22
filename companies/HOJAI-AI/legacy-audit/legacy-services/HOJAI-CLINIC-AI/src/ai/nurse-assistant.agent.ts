import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig } from '../models';
import { AgentType } from '../types';

export interface Vitals {
  temperature?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  pulse?: number;
  weight?: number;
  height?: number;
  spo2?: number;
  respiratoryRate?: number;
}

export type TriageLevel = 'emergency' | 'urgent' | 'semi-urgent' | 'non-urgent';

export class NurseAssistantAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'nurse_assistant';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async assessTriage(symptoms: string[], vitals?: Vitals): Promise<{
    level: TriageLevel;
    reasoning: string;
    recommendedAction: string;
    waitTime?: string;
  }> {
    let level: TriageLevel = 'non-urgent';
    let reasoning = '';
    let recommendedAction = 'Schedule routine appointment';
    let waitTime = 'Within 1-2 weeks';

    // Emergency symptoms
    const emergencySymptoms = [
      'chest pain', 'difficulty breathing', 'severe bleeding',
      'unconscious', 'seizure', 'stroke', 'heart attack',
    ];

    if (symptoms.some((s) => emergencySymptoms.some((e) => s.toLowerCase().includes(e)))) {
      level = 'emergency';
      reasoning = 'Symptoms suggest potential emergency condition';
      recommendedAction = 'Call emergency services or go to ER immediately';
      waitTime = 'Immediate';
    }

    // Urgent symptoms
    const urgentSymptoms = [
      'high fever', 'severe pain', 'fracture', 'burn',
      'vomiting blood', 'severe allergic reaction',
    ];

    if (symptoms.some((s) => urgentSymptoms.some((e) => s.toLowerCase().includes(e)))) {
      level = 'urgent';
      reasoning = 'Symptoms suggest urgent care needed';
      recommendedAction = 'Visit clinic today or urgent care';
      waitTime = 'Within few hours';
    } else if (symptoms.some((s) => s.toLowerCase().includes('moderate'))) {
      level = 'semi-urgent';
      reasoning = 'Symptoms suggest semi-urgent evaluation';
      recommendedAction = 'Schedule appointment within 24-48 hours';
      waitTime = 'Within 24-48 hours';
    }

    // Check vitals
    if (vitals) {
      if (vitals.temperature && (vitals.temperature > 39 || vitals.temperature < 35)) {
        level = 'urgent';
        reasoning = 'Abnormal temperature detected';
      }

      if (vitals.bloodPressure) {
        const { systolic, diastolic } = vitals.bloodPressure;
        if (systolic > 180 || diastolic > 120) {
          level = 'emergency';
          recommendedAction = 'Hypertensive crisis - seek immediate care';
        } else if (systolic > 140 || diastolic > 90) {
          if (level !== 'emergency') level = 'urgent';
          reasoning = 'Elevated blood pressure';
        }
      }

      if (vitals.spo2 && vitals.spo2 < 90) {
        level = 'emergency';
        recommendedAction = 'Low oxygen - seek immediate care';
      }
    }

    return { level, reasoning, recommendedAction, waitTime };
  }

  async generateVitalsPrompt(patientSymptoms: string[]): Promise<string> {
    return `Guide the collection of patient vitals based on symptoms: ${patientSymptoms.join(', ')}

Ask about:
1. Temperature (if fever reported)
2. Blood Pressure (if cardiovascular symptoms)
3. Pulse rate
4. Weight and Height (for BMI calculation)
5. Oxygen levels (if respiratory symptoms)

Be conversational and reassuring.`;
  }

  async generateHomeCareInstructions(
    condition: string,
    symptoms: string[]
  ): Promise<{
    immediateCare: string[];
    warningSigns: string[];
    whenToSeekHelp: string;
    recoveryTips: string[];
  }> {
    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a nurse assistant providing home care guidance.',
        },
        {
          role: 'user',
          content: `Generate home care instructions for:
Condition: ${condition}
Symptoms: ${symptoms.join(', ')}

Provide:
1. Immediate care steps
2. Warning signs to watch for
3. When to seek professional help
4. Recovery tips`,
        },
      ],
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '';

    return {
      immediateCare: this.extractList(response, 'immediate'),
      warningSigns: this.extractList(response, 'warning'),
      whenToSeekHelp: 'If symptoms worsen or new symptoms appear, contact your healthcare provider.',
      recoveryTips: this.extractList(response, 'recovery'),
    };
  }

  private extractList(text: string, section: string): string[] {
    const lines = text.split('\n');
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes(section)) {
        inSection = true;
        continue;
      }
      if (inSection && line.match(/^[\d\.\-\•]|\n/)) {
        if (line.match(/^[A-Z]/)) break;
        items.push(line.replace(/^[\d\.\-\•\s]+/, '').trim());
      }
    }

    return items.slice(0, 5);
  }
}

export const nurseAssistantAgent = new NurseAssistantAgent();
