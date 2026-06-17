import { v4 as uuidv4 } from 'uuid';
import { GeneratedEmail, EmailTemplateType, EmailRequest } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Email templates for different scenarios
const EMAIL_TEMPLATES: Record<EmailTemplateType, { subject: string; body: (data: any) => string }> = {
  [EmailTemplateType.INTRODUCTORY]: {
    subject: (data) => `Quick question about ${data.company || 'your team'}`,
    body: (data) => `
Hi ${data.firstName || 'there'},

I hope this email finds you well. I came across ${data.company || 'your company'} and was impressed by ${data.impressiveThing || 'what you do'}.

I wanted to reach out because we've helped similar ${data.industry || 'companies'} achieve ${data.benefit || 'significant improvements in their operations'}.

Would you be open to a brief 15-minute call this week to explore if there might be a fit?

Best regards,
${data.senderName || 'Your Name'}
    `.trim()
  },

  [EmailTemplateType.FOLLOW_UP]: {
    subject: (data) => `Following up - ${data.topic || 'quick question'}`,
    body: (data) => `
Hi ${data.firstName || 'there'},

I wanted to follow up on my previous email regarding ${data.topic || 'how we might help'}.

I understand you're busy, so I'll keep this brief. ${data.followUpValue || 'We have helped companies similar to yours achieve impressive results'}:

${data.bulletPoints || '• 30% improvement in efficiency\n• Significant cost savings\n• Better customer outcomes'}

Would you have 15 minutes this week for a quick call?

Looking forward to hearing from you.

Best,
${data.senderName || 'Your Name'}
    `.trim()
  },

  [EmailTemplateType.PROPOSAL]: {
    subject: (data) => `Proposal for ${data.company || 'your organization'}`,
    body: (data) => `
Hi ${data.firstName || 'there'},

Thank you for taking the time to discuss your needs with me. Based on our conversation, I've put together a proposal tailored to ${data.company || 'your organization'}.

Here's a summary of the proposed solution:

${data.proposalSummary || '• Tailored approach based on your requirements\n• Implementation timeline: 4-6 weeks\n• Expected ROI within 6 months'}

The investment for this solution would be ${data.pricing || 'based on your specific requirements'}.

I'd love to walk you through the details and address any questions you might have. Would you be available for a call this week?

Best regards,
${data.senderName || 'Your Name'}
    `.trim()
  },

  [EmailTemplateType.DISCOVERY]: {
    subject: (data) => `Quick discovery questions for ${data.company || 'you'}`,
    body: (data) => `
Hi ${data.firstName || 'there'},

Thank you for your interest in learning more. To make sure our conversation is valuable, I wanted to ask a few quick questions:

${data.discoveryQuestions || '1. What are your current challenges?\n2. What does success look like for your team?\n3. What timeline are you working with?\n4. Who else is involved in this decision?'}

Feel free to respond at your convenience, and I'll prepare accordingly.

Best,
${data.senderName || 'Your Name'}
    `.trim()
  },

  [EmailTemplateType.RE_ENGAGEMENT]: {
    subject: (data) => `Been thinking about ${data.company || 'you'}`,
    body: (data) => `
Hi ${data.firstName || 'there'},

It's been a while since we last connected, and I wanted to check in.

I remember you mentioned ${data.pastTopic || 'some interest in improving your processes'}. Since then, we've made some exciting improvements that I thought you might find valuable.

${data.update || 'We've helped companies like yours achieve even better results with our latest features.'}

Would you be open to a brief conversation to catch up and explore if the timing might be better now?

Best,
${data.senderName || 'Your Name'}
    `.trim()
  },

  [EmailTemplateType.CUSTOM]: {
    subject: (data) => data.customSubject || 'Quick question',
    body: (data) => data.customBody || ''
  }
};

interface EmailGeneratorParams {
  leadId: string;
  templateType: EmailTemplateType;
  context?: string;
  tone?: 'formal' | 'casual' | 'aggressive' | 'friendly';
  goal?: string;
}

// Demo lead data
function getDemoLeadData(leadId: string) {
  return {
    leadId,
    firstName: 'John',
    lastName: 'Smith',
    company: 'Acme Corporation',
    industry: 'Technology',
    impressiveThing: 'your innovative approach to customer success',
    benefit: '40% improvement in customer retention',
    bulletPoints: '• 40% improvement in customer retention\n• 25% reduction in operational costs\n• Faster time to value',
    topic: 'helping teams like yours',
    followUpValue: 'We recently helped a similar company achieve a 40% improvement in their key metrics',
    senderName: 'Sarah Johnson',
    discoveryQuestions: `Based on your profile, here are some questions I'd love to explore:

1. What are the biggest challenges you're facing in ${new Date().getFullYear()}?
2. How are you currently measuring success in this area?
3. What would "the perfect solution" look like for your team?
4. What's your timeline for making a decision?
5. Who else should be involved in this conversation?`,
    proposalSummary: `Based on our discussion, I'm proposing:

• A tailored implementation plan for ${new Date().getFullYear()}
• Dedicated support and onboarding
• Quarterly business reviews
• Flexible pricing based on your needs

I've attached a detailed proposal document for your review.`,
    pricing: '$2,500/month with annual contract',
    pastTopic: 'streamlining your customer processes',
    update: 'We\'ve launched several new features including advanced analytics, automated workflows, and improved integrations.',
    customSubject: 'Opportunity to connect',
    customBody: 'Looking forward to hearing from you.'
  };
}

export async function generateEmail(params: EmailGeneratorParams): Promise<GeneratedEmail> {
  const { leadId, templateType, context, tone, goal } = params;

  logger.info(`Generating ${templateType} email for lead: ${leadId}`);

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get template
  const template = EMAIL_TEMPLATES[templateType];

  if (!template) {
    throw new Error(`Unknown email template type: ${templateType}`);
  }

  // Get lead data (demo or from database)
  const leadData = getDemoLeadData(leadId);

  // Add context if provided
  if (context) {
    Object.assign(leadData, { context });
  }

  // Add goal if provided
  if (goal) {
    Object.assign(leadData, { goal });
  }

  // Generate subject and body
  const subject = template.subject(leadData);
  const body = template.body(leadData);

  // Create preview (first 100 chars of body)
  const preview = body.substring(0, 100).replace(/\n/g, ' ') + '...';

  // Determine call to action based on template
  const callToAction = getCallToAction(templateType);

  // Apply tone adjustments if specified
  const adjustedBody = applyTone(body, tone || 'friendly');

  const email: GeneratedEmail = {
    subject,
    body: adjustedBody,
    preview,
    callToAction
  };

  logger.info(`Generated email for lead: ${leadId}`, { templateType, subjectLength: subject.length });

  return email;
}

function getCallToAction(templateType: EmailTemplateType): string | undefined {
  const callToActions: Record<EmailTemplateType, string> = {
    [EmailTemplateType.INTRODUCTORY]: 'Schedule a 15-minute discovery call',
    [EmailTemplateType.FOLLOW_UP]: 'Reply with your availability',
    [EmailTemplateType.PROPOSAL]: 'Review the attached proposal',
    [EmailTemplateType.DISCOVERY]: 'Share your thoughts via reply',
    [EmailTemplateType.RE_ENGAGEMENT]: 'Schedule a catch-up call',
    [EmailTemplateType.CUSTOM]: 'Reply to continue the conversation'
  };

  return callToActions[templateType];
}

function applyTone(body: string, tone: 'formal' | 'casual' | 'aggressive' | 'friendly'): string {
  switch (tone) {
    case 'formal':
      return body
        .replace(/Hi/g, 'Dear')
        .replace(/hey/g, '')
        .replace(/I wanted to/g, 'I am writing to')
        .replace(/you might find/g, 'you may find');

    case 'casual':
      return body
        .replace(/I hope this email finds you well/g, 'Hope you\'re doing well')
        .replace(/I wanted to reach out/g, 'I wanted to reach out')
        .replace(/Would you be open to/g, 'Would love to grab some time with you to')
        .replace(/Best regards/g, 'Cheers');

    case 'aggressive':
      return body
        .replace(/I hope this email finds you well/g, 'I\'m following up')
        .replace(/Would you be open to/g, 'I need you to')
        .replace(/I understand you're busy/g, '')
        .replace(/Looking forward to hearing from you/g, 'Please respond by end of week');

    case 'friendly':
    default:
      return body;
  }
}

export async function personalizeEmail(
  template: string,
  leadData: Record<string, string>
): Promise<string> {
  let personalized = template;

  // Replace all {{variable}} placeholders
  Object.entries(leadData).forEach(([key, value]) => {
    personalized = personalized.replace(
      new RegExp(`{{${key}}}`, 'gi'),
      value
    );
  });

  // Common replacements
  personalized = personalized
    .replace(/{{firstName}}/gi, leadData.firstName || 'there')
    .replace(/{{lastName}}/gi, leadData.lastName || '')
    .replace(/{{company}}/gi, leadData.company || 'your company')
    .replace(/{{title}}/gi, leadData.title || '')
    .replace(/{{senderName}}/gi, leadData.senderName || 'Your Name');

  return personalized;
}
