/**
 * CRM Connectors - HubSpot, Salesforce, Pipedrive, Zoho
 */

const crmConnectors = [
  // ============= HUBSPOT =============
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    description: 'CRM, marketing automation, and sales tools',
    authType: 'oauth2',
    logo: 'hubspot-logo.svg',
    capabilities: ['contacts', 'companies', 'deals', 'tickets', 'email', 'sequences', 'automation'],
    actions: {
      getContacts: {
        description: 'Get all contacts',
        params: ['limit', 'offset', 'properties']
      },
      createContact: {
        description: 'Create a new contact',
        params: ['email', 'firstName', 'lastName', 'properties']
      },
      updateContact: {
        description: 'Update an existing contact',
        params: ['email', 'properties']
      },
      searchContacts: {
        description: 'Search contacts by query',
        params: ['query', 'limit']
      },
      getDeals: {
        description: 'Get all deals',
        params: ['limit', 'offset']
      },
      createDeal: {
        description: 'Create a new deal',
        params: ['dealName', 'amount', 'stage', 'contactEmail']
      },
      updateDeal: {
        description: 'Update a deal',
        params: ['dealId', 'properties']
      },
      createTask: {
        description: 'Create a task',
        params: ['subject', 'body', 'dueDate', 'contactEmail']
      },
      createNote: {
        description: 'Create a note',
        params: ['body', 'contactIds']
      },
      enrollInSequence: {
        description: 'Enroll contact in email sequence',
        params: ['email', 'sequenceId']
      }
    },
    testConnection: async (credentials, config) => {
      // Simulated test - in production, call HubSpot API
      if (!credentials.accessToken) {
        throw new Error('Missing access token');
      }
      return { success: true, account: 'test-account' };
    },
    search: async (credentials, params) => {
      // Simulated search
      return {
        results: [
          { id: '1', type: 'contact', name: 'John Doe', email: 'john@example.com' },
          { id: '2', type: 'contact', name: 'Jane Smith', email: 'jane@example.com' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      // Pull entity from HubSpot
      console.log(`Pulling ${entity} from HubSpot`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      // Push entity to HubSpot
      console.log(`Pushing ${entity} to HubSpot`);
      return { success: true };
    }
  },

  // ============= SALESFORCE =============
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    description: 'Enterprise CRM and cloud computing platform',
    authType: 'oauth2',
    logo: 'salesforce-logo.svg',
    capabilities: ['leads', 'opportunities', 'accounts', 'contacts', 'cases', 'reports', 'custom-objects'],
    actions: {
      query: {
        description: 'Execute SOQL query',
        params: ['soql']
      },
      getLeads: {
        description: 'Get all leads',
        params: ['status', 'limit']
      },
      createLead: {
        description: 'Create a new lead',
        params: ['firstName', 'lastName', 'email', 'company', 'phone']
      },
      updateLead: {
        description: 'Update a lead',
        params: ['leadId', 'fields']
      },
      getOpportunities: {
        description: 'Get all opportunities',
        params: ['stage', 'limit']
      },
      createOpportunity: {
        description: 'Create a new opportunity',
        params: ['name', 'amount', 'stage', 'closeDate', 'accountId']
      },
      updateOpportunity: {
        description: 'Update an opportunity',
        params: ['opportunityId', 'fields']
      },
      getAccounts: {
        description: 'Get all accounts',
        params: ['industry', 'limit']
      },
      createAccount: {
        description: 'Create a new account',
        params: ['name', 'industry', 'phone', 'website']
      },
      getContacts: {
        description: 'Get all contacts',
        params: ['accountId', 'limit']
      },
      createContact: {
        description: 'Create a new contact',
        params: ['firstName', 'lastName', 'email', 'accountId']
      },
      createCase: {
        description: 'Create a support case',
        params: ['subject', 'description', 'accountId', 'priority']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.instanceUrl || !credentials.accessToken) {
        throw new Error('Missing Salesforce credentials');
      }
      return { success: true, instance: credentials.instanceUrl };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: '001xx000003GkkAAS', type: 'Account', name: 'Acme Corp' },
          { id: '00Qxx000001GkkEAS', type: 'Lead', name: 'Test Lead' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Salesforce`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Salesforce`);
      return { success: true };
    }
  },

  // ============= PIPEDRIVE =============
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    description: 'Sales CRM focused on pipeline management',
    authType: 'api_key',
    logo: 'pipedrive-logo.svg',
    capabilities: ['deals', 'persons', 'organizations', 'activities', 'products', 'pipelines'],
    actions: {
      getDeals: {
        description: 'Get all deals',
        params: ['status', 'stageId', 'ownerId']
      },
      createDeal: {
        description: 'Create a new deal',
        params: ['title', 'value', 'currency', 'stageId', 'personId', 'orgId']
      },
      updateDeal: {
        description: 'Update a deal',
        params: ['dealId', 'fields']
      },
      getPersons: {
        description: 'Get all persons (contacts)',
        params: ['limit', 'start']
      },
      createPerson: {
        description: 'Create a new person',
        params: ['name', 'email', 'phone', 'orgId']
      },
      updatePerson: {
        description: 'Update a person',
        params: ['personId', 'fields']
      },
      getOrganizations: {
        description: 'Get all organizations',
        params: ['limit', 'start']
      },
      createOrganization: {
        description: 'Create a new organization',
        params: ['name', 'address', 'phone']
      },
      getActivities: {
        description: 'Get all activities',
        params: ['type', 'limit']
      },
      createActivity: {
        description: 'Create a new activity',
        params: ['subject', 'type', 'dueDate', 'personId', 'dealId']
      },
      getPipelines: {
        description: 'Get all pipelines',
        params: []
      },
      addNote: {
        description: 'Add a note to a deal or person',
        params: ['content', 'dealId', 'personId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiToken && !credentials.accessToken) {
        throw new Error('Missing Pipedrive API token');
      }
      return { success: true, company: 'test-company' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: '1', type: 'deal', title: 'Enterprise Deal', value: 50000 },
          { id: '2', type: 'person', name: 'CEO John', email: 'ceo@company.com' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Pipedrive`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Pipedrive`);
      return { success: true };
    }
  },

  // ============= ZOHO CRM =============
  {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    category: 'crm',
    description: 'Cloud-based CRM with AI assistant',
    authType: 'oauth2',
    logo: 'zoho-logo.svg',
    capabilities: ['leads', 'deals', 'contacts', 'accounts', 'tasks', 'events', 'custom-modules'],
    actions: {
      getLeads: {
        description: 'Get all leads',
        params: ['fields', 'sortBy']
      },
      createLead: {
        description: 'Create a new lead',
        params: ['firstName', 'lastName', 'email', 'company', 'phone', 'designation']
      },
      updateLead: {
        description: 'Update a lead',
        params: ['leadId', 'fields']
      },
      getDeals: {
        description: 'Get all deals (Potentials)',
        params: ['stage', 'fields']
      },
      createDeal: {
        description: 'Create a new deal',
        params: ['dealName', 'amount', 'closingDate', 'stage', 'contactId']
      },
      updateDeal: {
        description: 'Update a deal',
        params: ['dealId', 'fields']
      },
      getContacts: {
        description: 'Get all contacts',
        params: ['fields', 'sortBy']
      },
      createContact: {
        description: 'Create a new contact',
        params: ['firstName', 'lastName', 'email', 'phone', 'accountId']
      },
      getAccounts: {
        description: 'Get all accounts',
        params: ['industry', 'fields']
      },
      createAccount: {
        description: 'Create a new account',
        params: ['accountName', 'phone', 'website', 'industry']
      },
      createTask: {
        description: 'Create a task',
        params: ['subject', 'dueDate', 'priority', 'relatedToId', 'relatedToType']
      },
      createEvent: {
        description: 'Create an event',
        params: ['subject', 'startTime', 'endTime', 'attendees', 'relatedToId']
      },
      sendEmail: {
        description: 'Send email to contacts',
        params: ['to', 'subject', 'body', 'templateId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Zoho access token');
      }
      return { success: true, organization: 'test-org' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: '123456789', module: 'Leads', name: 'Lead Name' },
          { id: '987654321', module: 'Deals', name: 'Deal Name', amount: 25000 }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Zoho CRM`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Zoho CRM`);
      return { success: true };
    }
  },

  // ============= HUBSPOT FREE =============
  {
    id: 'hubspot-free',
    name: 'HubSpot Free',
    category: 'crm',
    description: 'Free tier HubSpot CRM',
    authType: 'api_key',
    logo: 'hubspot-logo.svg',
    capabilities: ['contacts', 'deals', 'tasks', 'email-tracking'],
    actions: {
      getContacts: {
        description: 'Get all contacts',
        params: ['limit']
      },
      createContact: {
        description: 'Create a new contact',
        params: ['email', 'firstName', 'lastName']
      },
      getDeals: {
        description: 'Get all deals',
        params: []
      },
      createDeal: {
        description: 'Create a new deal',
        params: ['dealName', 'amount']
      },
      createTask: {
        description: 'Create a task',
        params: ['subject', 'dueDate']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing HubSpot API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from HubSpot Free`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to HubSpot Free`);
      return { success: true };
    }
  }
];

export default {
  list: crmConnectors
};
