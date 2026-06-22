import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig } from '../models';
import { AgentType } from '../types';

export interface SessionNote {
  patientId: string;
  date: Date;
  duration: number;
  topicsDiscussed: string[];
  patientMood: string;
  keyInsights: string[];
  homework?: string[];
  followUpPlan: string;
  riskAssessment?: {
    level: 'low' | 'moderate' | 'high';
    concerns: string[];
  };
}

export class TherapistAssistantAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'therapist_assistant';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateSessionNotes(
    transcript: string,
    duration: number,
    patientId: string
  ): Promise<SessionNote> {
    const prompt = `Analyze this therapy session transcript and generate structured notes:

Transcript:
${transcript}

Provide:
1. Topics discussed (bullet points)
2. Patient mood/affect observations
3. Key therapeutic insights
4. Homework assigned
5. Follow-up plan
6. Risk assessment (if any)

Keep it professional and clinically relevant.`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a therapy session documentation assistant. Focus on objective, clinical observations.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content || '';

    return {
      patientId,
      date: new Date(),
      duration,
      topicsDiscussed: this.extractList(response, 'topic'),
      patientMood: 'Documented in notes',
      keyInsights: this.extractList(response, 'insight'),
      homework: this.extractList(response, 'homework'),
      followUpPlan: this.extractFollowUp(response),
      riskAssessment: this.assessRisk(response),
    };
  }

  private extractList(text: string, type: string): string[] {
    const lines = text.split('\n');
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes(type)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        if (line.match(/^[A-Z][a-z]+:/)) break;
        const item = line.replace(/^[\d\.\-\•\s]+/, '').trim();
        if (item && item.length > 5) {
          items.push(item);
        }
      }
    }

    return items.slice(0, 8);
  }

  private extractFollowUp(text: string): string {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('follow') || line.toLowerCase().includes('next')) {
        return line.replace(/^[\d\.\-\•\s]+/, '').trim();
      }
    }
    return 'Continue current treatment plan';
  }

  private assessRisk(text: string): SessionNote['riskAssessment'] {
    const lower = text.toLowerCase();

    if (lower.includes('high risk') || lower.includes('immediate') || lower.includes('urgent')) {
      return {
        level: 'high',
        concerns: ['Possible self-harm or harm to others ideation detected'],
      };
    }

    if (lower.includes('moderate') || lower.includes('some concern')) {
      return {
        level: 'moderate',
        concerns: ['Monitor patient closely', 'Review safety plan'],
      };
    }

    return {
      level: 'low',
      concerns: [],
    };
  }

  async generateCopingStrategies(
    condition: string,
    severity: 'mild' | 'moderate' | 'severe'
  ): Promise<{
    immediate: string[];
    dailyPractices: string[];
    whenToEscalate: string;
  }> {
    const strategies: Record<string, any> = {
      'anxiety': {
        mild: {
          immediate: ['Deep breathing (4-7-8 technique)', 'Grounding exercise (5-4-3-2-1)'],
          daily: ['15 min meditation', 'Regular exercise', 'Journaling'],
          escalate: 'If anxiety interferes with daily activities',
        },
        moderate: {
          immediate: ['Box breathing', 'Progressive muscle relaxation'],
          daily: ['30 min exercise', 'CBT techniques practice', 'Sleep hygiene'],
          escalate: 'If panic attacks occur or anxiety worsens',
        },
        severe: {
          immediate: ['Contact therapist immediately', 'Safety plan activation'],
          daily: ['As per therapist guidance', 'Regular medication review'],
          escalate: 'Seek emergency help if suicidal thoughts emerge',
        },
      },
      'depression': {
        mild: {
          immediate: ['Behavioral activation', 'Connect with support person'],
          daily: ['Regular sleep schedule', 'Light exercise', 'Pleasant activities'],
          escalate: 'If depression persists beyond 2 weeks',
        },
        moderate: {
          immediate: ['Reach out to therapist', 'Activity scheduling'],
          daily: ['Structured routine', 'Mood tracking', 'Social connection'],
          escalate: 'If thoughts of self-harm appear',
        },
        severe: {
          immediate: ['Emergency contact protocol', 'Safety plan'],
          daily: ['As per treatment plan', 'Close monitoring'],
          escalate: 'Immediate help if suicidal ideation',
        },
      },
    };

    return strategies[condition.toLowerCase()]?.[severity] || {
      immediate: ['Consult therapist for personalized strategies'],
      daily: ['Practice self-care', 'Seek support'],
      escalate: 'If symptoms worsen',
    };
  }

  async generateProgressReport(
    sessionNotes: SessionNote[],
    patientGoals: string[]
  ): Promise<{
    overallProgress: string;
    goalsProgress: Array<{ goal: string; progress: number; notes: string }>;
    treatmentRecommendations: string[];
  }> {
    const prompt = `Generate a progress report based on ${sessionNotes.length} session notes.

Patient Goals: ${patientGoals.join(', ')}

Assess:
1. Overall progress summary
2. Goal-by-goal progress (percentage)
3. Treatment recommendations

Be concise and clinically accurate.`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    return {
      overallProgress: 'See detailed assessment',
      goalsProgress: patientGoals.map((goal) => ({
        goal,
        progress: 50, // Placeholder
        notes: 'Progressing as expected',
      })),
      treatmentRecommendations: ['Continue current treatment', 'Reassess in 4 weeks'],
    };
  }
}

export const therapistAssistantAgent = new TherapistAssistantAgent();
