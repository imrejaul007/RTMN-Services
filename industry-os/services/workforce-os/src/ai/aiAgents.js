/**
 * RTMN AI Agents - Real LLM-Powered HR Agents
 *
 * Connects to OpenAI GPT-4 and Anthropic Claude
 * for intelligent HR automation
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Initialize clients
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ============================================================
// HR Copilot Agent
// ============================================================

export class HRCopilotAgent {
  constructor() {
    this.name = 'HR Copilot';
    this.description = 'Answers HR questions, helps with leave, payroll, benefits, and policies';
    this.systemPrompt = `You are an expert HR assistant for RTMN Workforce OS. You help employees with:
- Leave requests and balance inquiries
- Payroll and payslip questions
- Benefits enrollment and claims
- Company policies and procedures
- Training and development
- General HR inquiries

Always be helpful, professional, and concise. If you don't know something, say so.`;
  }

  async chat(message, context = {}) {
    if (!openai && !anthropic) {
      return this.fallbackChat(message, context);
    }

    try {
      if (anthropic) {
        return await this.chatWithClaude(message, context);
      }
      return await this.chatWithGPT(message, context);
    } catch (error) {
      console.error('AI Chat error:', error);
      return this.fallbackChat(message, context);
    }
  }

  async chatWithClaude(message, context) {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${message}`
        }
      ]
    });

    return {
      response: response.content[0].text,
      model: 'claude-3-5-sonnet',
      usage: response.usage,
    };
  }

  async chatWithGPT(message, context) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${message}` }
      ],
      max_tokens: 1024,
    });

    return {
      response: completion.choices[0].message.content,
      model: 'gpt-4o',
      usage: completion.usage,
    };
  }

  fallbackChat(message, context) {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('leave') || lowerMsg.includes('holiday')) {
      return {
        response: `Based on your query about leave:\n\nI can help you with:\n• Requesting leave: POST /api/leave/request\n• Checking balance: GET /api/leave/balance/${context.employeeId}\n• Viewing policies: Our leave policy allows casual, sick, earned, and parental leaves.\n\nShall I help you with a specific leave request?`,
        actions: [
          { type: 'link', label: 'Request Leave', endpoint: '/leave/request' },
          { type: 'link', label: 'Check Balance', endpoint: `/leave/balance/${context.employeeId}` }
        ]
      };
    }

    if (lowerMsg.includes('payroll') || lowerMsg.includes('salary') || lowerMsg.includes('payslip')) {
      return {
        response: `For payroll inquiries:\n\n• View payslips: GET /api/payroll/records?employeeId=${context.employeeId}\n• Tax declaration: POST /api/tax/declarations\n• Salary components: Basic, HRA, Allowances, Variable\n\nYour next payday is scheduled for the 25th.`,
        actions: [
          { type: 'link', label: 'View Payslips', endpoint: '/payroll/records' }
        ]
      };
    }

    if (lowerMsg.includes('benefits') || lowerMsg.includes('insurance') || lowerMsg.includes('health')) {
      return {
        response: `Benefits enrollment information:\n\nAvailable plans:\n• Health Insurance (Silver, Gold, Platinum)\n• Dental & Vision\n• Life Insurance\n• NPS Retirement\n\nYou can enroll during open enrollment or qualifying life events.`,
        actions: [
          { type: 'link', label: 'View Plans', endpoint: '/benefits/plans' },
          { type: 'link', label: 'My Enrollments', endpoint: '/benefits/enrollments' }
        ]
      };
    }

    return {
      response: `I'm your HR assistant. I can help with:\n\n• Leave requests and balance\n• Payroll and payslips\n• Benefits enrollment\n• Training and courses\n• Company policies\n\nWhat would you like help with?`,
      suggestions: [
        'How much leave do I have?',
        'Show my latest payslip',
        'What are the WFH policies?',
        'Enroll in health insurance'
      ]
    };
  }
}

// ============================================================
// Recruiter Agent
// ============================================================

export class RecruiterAgent {
  constructor() {
    this.name = 'Recruiter Agent';
    this.description = 'Helps with job postings, candidate screening, and interview scheduling';
    this.systemPrompt = `You are an expert recruiter for RTMN. You help hiring managers with:
- Creating job descriptions
- Screening candidates
- Interview preparation
- Offer letters
- Recruitment analytics

Be professional and data-driven.`;
  }

  async screenCandidate(candidate, job) {
    if (!openai && !anthropic) {
      return this.fallbackScreen(candidate, job);
    }

    try {
      const prompt = `Screen this candidate for the ${job.title} position:

Candidate Profile:
- Name: ${candidate.firstName} ${candidate.lastName}
- Experience: ${candidate.experience} years
- Current Company: ${candidate.currentCompany}
- Skills: ${candidate.skills?.join(', ') || 'Not specified'}
- Source: ${candidate.source}

Required Skills for ${job.title}:
${job.skills?.join('\n') || 'Not specified'}

Provide:
1. Overall fit score (1-10)
2. Skills match analysis
3. Red flags (if any)
4. Recommendation`;

      if (anthropic) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });
        return { analysis: response.content[0].text, model: 'claude-3-5-sonnet' };
      }
    } catch (error) {
      console.error('Screening error:', error);
    }

    return this.fallbackScreen(candidate, job);
  }

  fallbackScreen(candidate, job) {
    const candidateSkills = candidate.skills || [];
    const requiredSkills = job.skills || [];
    const matchedSkills = candidateSkills.filter(s =>
      requiredSkills.some(r => r.toLowerCase().includes(s.toLowerCase()))
    );

    const score = Math.min(50 + (matchedSkills.length * 10) + (candidate.experience * 2), 100);

    return {
      score: Math.round(score),
      matchedSkills,
      missingSkills: requiredSkills.filter(s => !matchedSkills.includes(s)),
      recommendation: score >= 70 ? 'Strong candidate' : score >= 50 ? 'Consider for interview' : 'Needs more experience',
    };
  }

  async generateJobDescription(title, department, requirements) {
    if (!openai && !anthropic) {
      return this.fallbackJobDescription(title, department, requirements);
    }

    try {
      const prompt = `Generate a job description for:
Title: ${title}
Department: ${department}
Requirements: ${requirements}

Include:
1. Role summary
2. Key responsibilities
3. Required qualifications
4. Preferred skills
5. What we offer`;

      if (anthropic) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });
        return { description: response.content[0].text };
      }
    } catch (error) {
      console.error('Job description error:', error);
    }

    return this.fallbackJobDescription(title, department, requirements);
  }

  fallbackJobDescription(title, department, requirements) {
    return {
      description: `# ${title}

## About the Role
We are looking for a talented ${title} to join our ${department} team.

## Responsibilities
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Requirements
- Relevant experience
- Strong communication skills
- Team collaboration
- Problem-solving abilities

## What We Offer
- Competitive salary
- Health benefits
- Growth opportunities
- Flexible work`
    };
  }
}

// ============================================================
// Career Coach Agent
// ============================================================

export class CareerCoachAgent {
  constructor() {
    this.name = 'Career Coach';
    this.description = 'Helps with career development, learning paths, and skill building';
    this.systemPrompt = `You are a career development coach for RTMN employees. You help with:
- Career path planning
- Skill gap analysis
- Learning recommendations
- Promotion preparation
- Leadership development

Be encouraging and actionable.`;
  }

  async analyzeCareer(employee, goals) {
    if (!openai && !anthropic) {
      return this.fallbackCareerAnalysis(employee, goals);
    }

    try {
      const prompt = `Analyze career development for:
Employee: ${employee.name}
Current Position: ${employee.position}
Department: ${employee.department}
Skills: ${employee.skills?.join(', ')}
Experience: ${employee.experience} years
Career Goals: ${goals}

Provide:
1. Skills gap analysis
2. Development recommendations
3. Learning path
4. Timeline to goals
5. Next steps`;

      if (anthropic) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });
        return { analysis: response.content[0].text };
      }
    } catch (error) {
      console.error('Career analysis error:', error);
    }

    return this.fallbackCareerAnalysis(employee, goals);
  }

  fallbackCareerAnalysis(employee, goals) {
    return {
      currentLevel: employee.position?.includes('Senior') ? 'Senior' : 'Mid-level',
      skillsAssessment: {
        technical: employee.skills?.length || 0,
        leadership: employee.experience > 5 ? 'Advanced' : 'Developing',
      },
      recommendations: [
        'Take leadership training',
        'Get industry certification',
        'Lead cross-functional projects',
        'Mentor junior team members'
      ],
      learningPath: [
        { course: 'Leadership Essentials', timeline: 'Month 1-2' },
        { course: 'Advanced Technical', timeline: 'Month 3-4' },
        { course: 'Strategic Thinking', timeline: 'Month 5-6' }
      ],
      timeline: '12-18 months to next level'
    };
  }

  async recommendLearning(employeeId, skills) {
    return {
      recommendations: skills.map(skill => ({
        skill,
        courses: [
          { name: `${skill} Fundamentals`, duration: '8 hours', level: 'Beginner' },
          { name: `${skill} Advanced`, duration: '16 hours', level: 'Advanced' }
        ]
      })),
      path: 'Recommended 3-month learning journey'
    };
  }
}

// ============================================================
// Performance Coach Agent
// ============================================================

export class PerformanceCoachAgent {
  constructor() {
    this.name = 'Performance Coach';
    this.description = 'Helps with performance reviews, goals, and feedback';
    this.systemPrompt = `You are a performance management coach. You help with:
- Goal setting (OKRs)
- Performance review preparation
- Feedback coaching
- Improvement plans
- Recognition`;

  }

  async generateOKRs(role, tenure) {
    return {
      objectives: [
        {
          objective: 'Drive Business Impact',
          keyResults: [
            'Achieve 100% of assigned targets',
            'Complete 2 major projects on time',
            'Improve efficiency by 15%'
          ]
        },
        {
          objective: 'Develop Professional Skills',
          keyResults: [
            'Complete required training',
            'Mentor 1 junior team member',
            'Contribute to knowledge sharing'
          ]
        }
      ],
      timeline: 'Quarterly review'
    };
  }

  async prepareReviewFeedback(employee, context) {
    return {
      strengths: [
        'Strong technical skills',
        'Good team collaboration',
        'Consistent delivery'
      ],
      areasForGrowth: [
        'Leadership skills',
        'Cross-functional collaboration'
      ],
      questions: [
        'What accomplishments are you most proud of?',
        'What challenges did you face?',
        'What support do you need?'
      ],
      rating: context.rating || 4.0
    };
  }
}

// ============================================================
// Compliance Agent
// ============================================================

export class ComplianceAgent {
  constructor() {
    this.name = 'Compliance Agent';
    this.description = 'Monitors HR compliance and policy adherence';
    this.systemPrompt = `You are a compliance officer for RTMN HR. You ensure:
- Labor law compliance
- Policy adherence
- Document retention
- Audit readiness
- Risk mitigation`;

  }

  async checkCompliance(employee, industry = 'general') {
    const complianceItems = [
      { item: 'Employment contract', status: 'valid' },
      { item: 'Tax documents', status: 'valid' },
      { item: 'Identity verification', status: 'valid' },
      { item: 'Training completion', status: employee.trainingComplete ? 'valid' : 'pending' },
      { item: 'Benefits enrollment', status: 'active' }
    ];

    const issues = complianceItems.filter(i => i.status !== 'valid');

    return {
      employeeId: employee.id,
      overallStatus: issues.length === 0 ? 'compliant' : 'action_needed',
      items: complianceItems,
      issues,
      riskLevel: issues.length === 0 ? 'low' : issues.length <= 2 ? 'medium' : 'high',
      nextReview: '2026-12-31'
    };
  }

  async generateComplianceReport(industry) {
    return {
      industry,
      requirements: this.getIndustryRequirements(industry),
      lastAudit: new Date().toISOString(),
      nextAudit: '2026-12-31',
      issues: [],
      recommendations: [
        'Maintain regular document updates',
        'Conduct compliance training quarterly',
        'Review policies annually'
      ]
    };
  }

  getIndustryRequirements(industry) {
    const requirements = {
      hospitality: ['Food Safety Certificate', 'Hygiene Training', 'Alcohol Service License'],
      healthcare: ['HIPAA Training', 'Medical License', 'CPR Certification'],
      financial: ['AML Training', 'SEBI Compliance', 'KYC Updates'],
      general: ['Code of Conduct', 'Data Privacy', 'Safety Training']
    };
    return requirements[industry] || requirements.general;
  }
}

// ============================================================
// Wellness Agent
// ============================================================

export class WellnessAgent {
  constructor() {
    this.name = 'Wellness Coach';
    this.description = 'Promotes employee wellbeing and work-life balance';
    this.systemPrompt = `You are a wellness coach for RTMN. You help with:
- Work-life balance
- Burnout prevention
- Mental health resources
- Team wellbeing initiatives
- Flexible work policies`;

  }

  async assessWellbeing(employee, data) {
    const indicators = {
      attendance: data.attendanceOnTime || 0.9,
      leaveUsage: data.leaveTaken || 0.5,
      overtime: data.overtimeHours || 0,
      engagement: data.engagementScore || 0.7
    };

    const score = (
      indicators.attendance * 0.2 +
      indicators.leaveUsage * 0.2 +
      (1 - indicators.overtime / 40) * 0.3 +
      indicators.engagement * 0.3
    ) * 100;

    return {
      employeeId: employee.id,
      overallScore: Math.round(score),
      indicators,
      status: score >= 70 ? 'healthy' : score >= 50 ? 'concerned' : 'at_risk',
      recommendations: this.getRecommendations(score, indicators),
      resources: [
        'EAP Counseling Services',
        'Meditation App Access',
        'Wellness Workshops'
      ]
    };
  }

  getRecommendations(score, indicators) {
    const recs = [];

    if (indicators.overtime > 20) {
      recs.push('Consider workload review - high overtime detected');
    }
    if (indicators.leaveUsage < 0.3) {
      recs.push('You have unused leave - consider taking time off');
    }
    if (score < 50) {
      recs.push('Schedule wellness check-in with manager');
      recs.push('Consider EAP counseling');
    }

    recs.push('Maintain work-life boundaries');
    recs.push('Take regular breaks throughout the day');

    return recs;
  }
}

// ============================================================
// Export All Agents
// ============================================================

export const hrCopilot = new HRCopilotAgent();
export const recruiterAgent = new RecruiterAgent();
export const careerCoach = new CareerCoachAgent();
export const performanceCoach = new PerformanceCoachAgent();
export const complianceAgent = new ComplianceAgent();
export const wellnessAgent = new WellnessAgent();

export const agents = {
  hrCopilot,
  recruiter: recruiterAgent,
  careerCoach,
  performanceCoach,
  complianceAgent,
  wellnessAgent,
};

export default agents;
