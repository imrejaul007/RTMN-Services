/**
 * PeopleOS → Hojai AI Employment Connector
 * Privacy Tier 2
 */
import axios from 'axios';

export interface EmploymentSignal {
  userId: string;
  employer: string;
  role: string;
  department?: string;
  salary?: number;
  tenure?: number;
  skills?: string[];
}

export async function emitEmploymentSignals(data: EmploymentSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/employment`, {
    userId: data.userId,
    employer: data.employer,
    role: data.role,
    department: data.department,
    skills: data.skills
  });
}
