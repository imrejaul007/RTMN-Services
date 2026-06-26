/**
 * Email Connectors - Gmail, SendGrid, Mailchimp, SES, etc.
 */

const emailConnectors = [
  // ============= GMAIL =============
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    description: 'Google email service',
    authType: 'oauth2',
    logo: 'gmail-logo.svg',
    capabilities: ['send', 'read', 'drafts', 'labels', 'threads', 'attachments', 'calendar-integration'],
    actions: {
      sendEmail: {
        description: 'Send an email',
        params: ['to', 'subject', 'body', 'cc', 'bcc', 'attachments']
      },
      getEmails: {
        description: 'Get emails from inbox',
        params: ['label', 'maxResults', 'q']
      },
      getEmail: {
        description: 'Get email by ID',
        params: ['emailId']
      },
      createDraft: {
        description: 'Create a draft email',
        params: ['to', 'subject', 'body']
      },
      trashEmail: {
        description: 'Move email to trash',
        params: ['emailId']
      },
      createLabel: {
        description: 'Create a label',
        params: ['name']
      },
      addLabel: {
        description: 'Add label to email',
        params: ['emailId', 'labelId']
      },
      getContacts: {
        description: 'Get Google contacts',
        params: ['maxResults']
      },
      createContact: {
        description: 'Create a contact',
        params: ['name', 'email', 'phone']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Gmail access token');
      }
      return { success: true, email: 'user@gmail.com' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'msg1', subject: 'Test Email', from: 'sender@example.com', date: '2024-01-01' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Gmail`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Gmail`);
      return { success: true };
    }
  },

  // ============= SENDGRID =============
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    description: 'Email delivery and marketing platform',
    authType: 'api_key',
    logo: 'sendgrid-logo.svg',
    capabilities: ['send', 'templates', 'campaigns', 'scheduling', 'analytics', 'webhooks'],
    actions: {
      sendEmail: {
        description: 'Send a single email',
        params: ['to', 'from', 'subject', 'content', 'attachments']
      },
      sendTemplatedEmail: {
        description: 'Send templated email',
        params: ['to', 'templateId', 'dynamicData']
      },
      createContact: {
        description: 'Add contact to list',
        params: ['email', 'firstName', 'lastName', 'customFields']
      },
      createList: {
        description: 'Create a contact list',
        params: ['name', 'description']
      },
      addToList: {
        description: 'Add contact to list',
        params: ['listId', 'contacts']
      },
      createCampaign: {
        description: 'Create email campaign',
        params: ['title', 'subject', 'listId', 'templateId', 'scheduleTime']
      },
      sendCampaign: {
        description: 'Send campaign immediately',
        params: ['campaignId']
      },
      scheduleCampaign: {
        description: 'Schedule campaign',
        params: ['campaignId', 'sendAt']
      },
      getStatistics: {
        description: 'Get email statistics',
        params: ['startDate', 'endDate']
      },
      getBounces: {
        description: 'Get bounced emails',
        params: ['startDate', 'limit']
      },
      getUnsubscribes: {
        description: 'Get unsubscribed emails',
        params: ['startDate', 'limit']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing SendGrid API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from SendGrid`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to SendGrid`);
      return { success: true };
    }
  },

  // ============= MAILCHIMP =============
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'email',
    description: 'Email marketing and automation',
    authType: 'api_key',
    logo: 'mailchimp-logo.svg',
    capabilities: ['campaigns', 'lists', 'templates', 'automation', 'audience', 'reports'],
    actions: {
      getLists: {
        description: 'Get all audience lists',
        params: ['count', 'offset']
      },
      createList: {
        description: 'Create an audience list',
        params: ['name', 'permissionReminder', 'emailTypeOption']
      },
      addSubscriber: {
        description: 'Add subscriber to list',
        params: ['listId', 'emailAddress', 'status', 'mergeFields']
      },
      updateSubscriber: {
        description: 'Update subscriber',
        params: ['listId', 'subscriberHash', 'mergeFields']
      },
      removeSubscriber: {
        description: 'Remove subscriber',
        params: ['listId', 'subscriberHash', 'deleteMember']
      },
      getCampaigns: {
        description: 'Get all campaigns',
        params: ['count', 'offset', 'status']
      },
      createCampaign: {
        description: 'Create a campaign',
        params: ['type', 'listId', 'settings']
      },
      sendCampaign: {
        description: 'Send campaign',
        params: ['campaignId']
      },
      scheduleCampaign: {
        description: 'Schedule campaign',
        params: ['campaignId', 'scheduleTime']
      },
      createTemplate: {
        description: 'Create email template',
        params: ['name', 'html']
      },
      getAutomations: {
        description: 'Get automations',
        params: ['count', 'offset']
      },
      addSubscriberToAutomation: {
        description: 'Add subscriber to automation',
        params: ['workflowId', 'workflowEmailId', 'emailAddress']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Mailchimp API key');
      }
      return { success: true, accountName: 'Test Account' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Mailchimp`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Mailchimp`);
      return { success: true };
    }
  },

  // ============= AMAZON SES =============
  {
    id: 'aws-ses',
    name: 'Amazon SES',
    category: 'email',
    description: 'Scalable email service by AWS',
    authType: 'aws_v4',
    logo: 'aws-logo.svg',
    capabilities: ['send', 'templates', 'stats', 'identities', 'sandbox'],
    actions: {
      sendEmail: {
        description: 'Send raw email',
        params: ['Source', 'Destination', 'RawMessage']
      },
      sendTemplatedEmail: {
        description: 'Send templated email',
        params: ['Source', 'Template', 'TemplateData', 'Destinations']
      },
      createTemplate: {
        description: 'Create email template',
        params: ['TemplateName', 'SubjectPart', 'HtmlPart', 'TextPart']
      },
      getTemplate: {
        description: 'Get template',
        params: ['TemplateName']
      },
      deleteTemplate: {
        description: 'Delete template',
        params: ['TemplateName']
      },
      listIdentities: {
        description: 'List verified identities',
        params: ['IdentityType']
      },
      verifyEmailIdentity: {
        description: 'Verify email address',
        params: ['EmailAddress']
      },
      getSendStatistics: {
        description: 'Get sending statistics',
        params: []
      },
      getSendQuota: {
        description: 'Get sending quota',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        throw new Error('Missing AWS credentials');
      }
      return { success: true, region: credentials.region || 'us-east-1' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from AWS SES`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to AWS SES`);
      return { success: true };
    }
  },

  // ============= RESEND =============
  {
    id: 'resend',
    name: 'Resend',
    category: 'email',
    description: 'Modern email API for developers',
    authType: 'api_key',
    logo: 'resend-logo.svg',
    capabilities: ['send', 'domains', 'audiences', 'contacts'],
    actions: {
      sendEmail: {
        description: 'Send an email',
        params: ['from', 'to', 'subject', 'html', 'text', 'attachments']
      },
      sendBatch: {
        description: 'Send batch emails',
        params: ['emails']
      },
      getDomains: {
        description: 'List domains',
        params: []
      },
      addDomain: {
        description: 'Add domain',
        params: ['name']
      },
      verifyDomain: {
        description: 'Verify domain DNS',
        params: ['domainId']
      },
      getAudiences: {
        description: 'List audiences',
        params: []
      },
      createAudience: {
        description: 'Create audience',
        params: ['name', 'description']
      },
      addContact: {
        description: 'Add contact to audience',
        params: ['audienceId', 'email', 'firstName', 'lastName']
      },
      getContacts: {
        description: 'Get audience contacts',
        params: ['audienceId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Resend API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Resend`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Resend`);
      return { success: true };
    }
  },

  // ============= BREVO (SENDINBLUE) =============
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    category: 'email',
    description: 'All-in-one marketing platform',
    authType: 'api_key',
    logo: 'brevo-logo.svg',
    capabilities: ['email', 'sms', 'chat', 'crm', 'marketing'],
    actions: {
      sendEmail: {
        description: 'Send email',
        params: ['to', 'subject', 'htmlContent', 'sender']
      },
      sendTransactionalEmail: {
        description: 'Send transactional email',
        params: ['templateId', 'to', 'params']
      },
      getLists: {
        description: 'Get contact lists',
        params: ['limit', 'offset']
      },
      createList: {
        description: 'Create contact list',
        params: ['name']
      },
      addContact: {
        description: 'Add contact',
        params: ['email', 'listIds', 'attributes']
      },
      updateContact: {
        description: 'Update contact',
        params: ['identifier', 'attributes']
      },
      deleteContact: {
        description: 'Delete contact',
        params: ['identifier']
      },
      getCampaigns: {
        description: 'Get campaigns',
        params: ['status', 'limit']
      },
      createCampaign: {
        description: 'Create campaign',
        params: ['name', 'subject', 'listIds', 'htmlContent']
      },
      sendCampaign: {
        description: 'Send campaign',
        params: ['id', 'sendImmediately']
      },
      getSmsCampaigns: {
        description: 'Get SMS campaigns',
        params: []
      },
      sendSms: {
        description: 'Send SMS',
        params: ['sender', 'recipient', 'content']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Brevo API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Brevo`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Brevo`);
      return { success: true };
    }
  }
];

export default {
  list: emailConnectors
};
