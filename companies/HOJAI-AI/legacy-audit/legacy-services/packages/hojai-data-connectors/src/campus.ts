/**
 * Insights Campus → Hojai AI Education Connector
 * Privacy Tier 2
 */
import axios from 'axios';

export interface EducationSignal {
  userId: string;
  institution: string;
  program: string;
  year: number;
  performance?: {
    gpa?: number;
    engagement: number;
    completion: number;
  };
  interests?: string[];
}

export async function emitEducationSignals(data: EducationSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/education`, {
    userId: data.userId,
    institution: data.institution,
    program: data.program,
    year: data.year,
    gpa: data.performance?.gpa,
    engagement: data.performance?.engagement
  });
}
