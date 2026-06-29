/**
 * HR Department Pack
 * Complete AI HR team with recruiting, onboarding, and operations
 */

import { Department } from '@hojai/agents';
import { Agent } from '@hojai/agents';

const recruitingAgent = new Agent({
  id: 'recruiting-agent',
  name: 'Recruiting Assistant',
  role: 'recruiting',
  description: 'Resume screening and candidate management',
  skills: ['resume_screening', 'candidate_sourcing', 'interview_scheduling', 'offer_letters'],
});

const onboardingAgent = new Agent({
  id: 'onboarding-agent',
  name: 'Onboarding Coordinator',
  role: 'onboarding',
  description: 'Employee onboarding and setup',
  skills: ['welcome', 'setup', 'training_scheduling', 'document_collection'],
});

const leaveAgent = new Agent({
  id: 'leave-agent',
  name: 'Leave Manager',
  role: 'leave',
  description: 'Leave management and attendance',
  skills: ['leave_requests', 'approval_workflow', 'attendance_tracking', 'holiday_calendars'],
});

const payrollAgent = new Agent({
  id: 'payroll-agent',
  name: 'Payroll Specialist',
  role: 'payroll',
  description: 'Payroll processing and compliance',
  skills: ['payroll_processing', 'tax_calculation', 'compliance', 'payslip_generation'],
});

const learningAgent = new Agent({
  id: 'learning-agent',
  name: 'Learning & Development',
  role: 'lnd',
  description: 'Training and development programs',
  skills: ['course_recommendations', 'training_scheduling', 'progress_tracking', 'certifications'],
});

export const hrDepartment = new Department({
  id: 'hr-department',
  name: 'Human Resources',
  type: 'hr',
  description: 'AI-powered HR team with recruiting, onboarding, payroll, and L&D',
  head: recruitingAgent,
  agents: [recruitingAgent, onboardingAgent, leaveAgent, payrollAgent, learningAgent],
  workflows: [
    'resume-screening',
    'interview-scheduler',
    'offer-letter-generator',
    'employee-onboarding',
    'leave-approval',
    'payroll-notification',
    'performance-review',
    'learning-recommendations',
  ],
  twins: ['employee_twin', 'candidate_twin', 'department_twin', 'skill_twin'],
  memory: ['employee_records', 'training_history', 'policy_documents'],
});

export const hrMetrics = {
  agents: 5,
  estimatedMonthlyCost: 30000,
  workflows: 8,
  integrations: ['hris', 'email', 'calendar', 'document_management'],
};

export default hrDepartment;
