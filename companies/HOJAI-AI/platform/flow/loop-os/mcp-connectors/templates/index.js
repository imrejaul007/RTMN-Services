/**
 * LoopOS MCP Connector Templates
 * Pre-built tools for common integrations
 */

export const TOOL_TEMPLATES = {
  // ── Data & Storage ─────────────────────────────
  database: (config = {}) => ({
    name: config.name || 'database',
    category: 'data',
    description: 'SQL database operations (PostgreSQL, MySQL, SQLite)',
    server: 'database',
    action: 'query',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query' },
        params: { type: 'array', description: 'Query parameters' }
      },
      required: ['sql']
    }
  }),

  vector_store: (config = {}) => ({
    name: 'vector_store',
    category: 'ai',
    description: 'Vector database for semantic search (Pinecone, Weaviate, Qdrant)',
    server: 'vector_store',
    actions: ['upsert', 'search', 'delete'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['upsert', 'search', 'delete'] },
        id: { type: 'string', description: 'Document ID' },
        content: { type: 'string', description: 'Text content' },
        embedding: { type: 'array', description: 'Vector embedding' },
        metadata: { type: 'object', description: 'Document metadata' },
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results' }
      }
    }
  }),

  s3_storage: (config = {}) => ({
    name: 's3_storage',
    category: 'storage',
    description: 'AWS S3 file storage operations',
    server: 's3',
    actions: ['upload', 'download', 'list', 'delete'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['upload', 'download', 'list', 'delete'] },
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'File key' },
        content: { type: 'string', description: 'File content (for upload)' },
        prefix: { type: 'string', description: 'Prefix filter (for list)' }
      }
    },
    config: {
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  }),

  // ── Communication ───────────────────────────────
  slack: (config = {}) => ({
    name: 'slack',
    category: 'communication',
    description: 'Slack messaging and workspace operations',
    server: 'slack',
    actions: ['send_message', 'list_channels', 'search', 'get_user'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send_message', 'list_channels', 'search', 'get_user'] },
        channel: { type: 'string', description: 'Channel name or ID' },
        message: { type: 'string', description: 'Message text' },
        user: { type: 'string', description: 'User email or ID' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    config: { botToken: config.botToken }
  }),

  email: (config = {}) => ({
    name: 'email',
    category: 'communication',
    description: 'Email operations (SendGrid, AWS SES, SMTP)',
    server: 'email',
    actions: ['send', 'list', 'search'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'list', 'search'] },
        to: { type: 'string', description: 'Recipient email' },
        from: { type: 'string', description: 'Sender email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (HTML or text)' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    config: {
      provider: config.provider,
      apiKey: config.apiKey
    }
  }),

  whatsapp: (config = {}) => ({
    name: 'whatsapp',
    category: 'communication',
    description: 'WhatsApp Business API operations',
    server: 'whatsapp',
    actions: ['send', 'send_template', 'get_messages'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'send_template', 'get_messages'] },
        phone: { type: 'string', description: 'Phone number with country code' },
        message: { type: 'string', description: 'Message text' },
        template: { type: 'string', description: 'Template name' },
        params: { type: 'array', description: 'Template parameters' }
      }
    },
    config: { apiKey: config.apiKey, phoneNumberId: config.phoneNumberId }
  }),

  sms: (config = {}) => ({
    name: 'sms',
    category: 'communication',
    description: 'SMS messaging (Twilio, MSG91)',
    server: 'sms',
    actions: ['send', 'get_status'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'get_status'] },
        to: { type: 'string', description: 'Recipient phone' },
        message: { type: 'string', description: 'SMS text' },
        messageId: { type: 'string', description: 'Message ID for status check' }
      }
    },
    config: { provider: config.provider, apiKey: config.apiKey }
  }),

  // ── CRM & Business ───────────────────────────────
  crm: (config = {}) => ({
    name: 'crm',
    category: 'business',
    description: 'CRM operations (HubSpot, Salesforce, Pipedrive)',
    server: 'crm',
    actions: ['create_contact', 'update_contact', 'search', 'create_deal', 'update_deal', 'create_task'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_contact', 'update_contact', 'search', 'create_deal', 'update_deal', 'create_task'] },
        contact: { type: 'object', description: 'Contact data' },
        deal: { type: 'object', description: 'Deal data' },
        task: { type: 'object', description: 'Task data' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    config: { provider: config.provider, apiKey: config.apiKey }
  }),

  salesforce: (config = {}) => ({
    name: 'salesforce',
    category: 'business',
    description: 'Salesforce CRM operations',
    server: 'salesforce',
    actions: ['query', 'create', 'update', 'delete', 'sobject'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['query', 'create', 'update', 'delete', 'sobject'] },
        sobject: { type: 'string', description: 'Salesforce object (Lead, Contact, Account)' },
        data: { type: 'object', description: 'Record data' },
        id: { type: 'string', description: 'Record ID' }
      }
    },
    config: { instanceUrl: config.instanceUrl, accessToken: config.accessToken }
  }),

  // ── Calendar & Productivity ──────────────────────
  google_calendar: (config = {}) => ({
    name: 'google_calendar',
    category: 'productivity',
    description: 'Google Calendar operations',
    server: 'google_calendar',
    actions: ['list_events', 'create_event', 'update_event', 'delete_event'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_events', 'create_event', 'update_event', 'delete_event'] },
        event: { type: 'object', description: 'Event data' },
        eventId: { type: 'string', description: 'Event ID' },
        calendarId: { type: 'string', description: 'Calendar ID (default primary)' },
        timeMin: { type: 'string', description: 'Start time (ISO format)' },
        timeMax: { type: 'string', description: 'End time (ISO format)' }
      }
    },
    config: { accessToken: config.accessToken }
  }),

  outlook_calendar: (config = {}) => ({
    name: 'outlook_calendar',
    category: 'productivity',
    description: 'Microsoft Outlook Calendar operations',
    server: 'outlook_calendar',
    actions: ['list_events', 'create_event', 'update_event', 'delete_event'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_events', 'create_event', 'update_event', 'delete_event'] },
        event: { type: 'object', description: 'Event data' },
        eventId: { type: 'string', description: 'Event ID' }
      }
    },
    config: { accessToken: config.accessToken }
  }),

  // ── Development & Git ────────────────────────────
  github: (config = {}) => ({
    name: 'github',
    category: 'development',
    description: 'GitHub operations (repos, issues, PRs, actions)',
    server: 'github',
    actions: ['get_repo', 'list_issues', 'create_issue', 'list_prs', 'create_pr', 'run_actions', 'get_workflow'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_repo', 'list_issues', 'create_issue', 'list_prs', 'create_pr', 'run_actions', 'get_workflow'] },
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        issue: { type: 'object', description: 'Issue data' },
        pr: { type: 'object', description: 'Pull request data' },
        workflow: { type: 'string', description: 'Workflow file name' }
      }
    },
    config: { token: config.token }
  }),

  gitlab: (config = {}) => ({
    name: 'gitlab',
    category: 'development',
    description: 'GitLab operations',
    server: 'gitlab',
    actions: ['get_project', 'list_issues', 'create_issue', 'list_mrs', 'create_mr'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_project', 'list_issues', 'create_issue', 'list_mrs', 'create_mr'] },
        project: { type: 'string', description: 'Project path or ID' },
        issue: { type: 'object', description: 'Issue data' },
        mr: { type: 'object', description: 'Merge request data' }
      }
    },
    config: { url: config.url, token: config.token }
  }),

  // ── Payments & Finance ────────────────────────────
  razorpay: (config = {}) => ({
    name: 'razorpay',
    category: 'finance',
    description: 'Razorpay payment gateway operations',
    server: 'razorpay',
    actions: ['create_order', 'create_payment_link', 'get_payment', 'refund', 'create_invoice'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_order', 'create_payment_link', 'get_payment', 'refund', 'create_invoice'] },
        amount: { type: 'number', description: 'Amount in paise' },
        currency: { type: 'string', description: 'Currency code (INR, USD)' },
        receipt: { type: 'string', description: 'Receipt ID' },
        paymentId: { type: 'string', description: 'Payment ID' },
        invoice: { type: 'object', description: 'Invoice data' }
      }
    },
    config: { keyId: config.keyId, keySecret: config.keySecret }
  }),

  stripe: (config = {}) => ({
    name: 'stripe',
    category: 'finance',
    description: 'Stripe payment operations',
    server: 'stripe',
    actions: ['create_customer', 'create_payment_intent', 'confirm_payment', 'refund', 'create_invoice'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_customer', 'create_payment_intent', 'confirm_payment', 'refund', 'create_invoice'] },
        customer: { type: 'object', description: 'Customer data' },
        amount: { type: 'number', description: 'Amount in cents' },
        currency: { type: 'string', description: 'Currency code' },
        paymentIntentId: { type: 'string', description: 'Payment Intent ID' }
      }
    },
    config: { apiKey: config.apiKey }
  }),

  // ── Analytics & Monitoring ────────────────────────
  analytics: (config = {}) => ({
    name: 'analytics',
    category: 'monitoring',
    description: 'Analytics operations (Mixpanel, Amplitude, PostHog)',
    server: 'analytics',
    actions: ['track_event', 'identify_user', 'get_events', 'get_funnels', 'get_retention'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['track_event', 'identify_user', 'get_events', 'get_funnels', 'get_retention'] },
        event: { type: 'string', description: 'Event name' },
        properties: { type: 'object', description: 'Event properties' },
        userId: { type: 'string', description: 'User ID' },
        traits: { type: 'object', description: 'User traits' }
      }
    },
    config: { provider: config.provider, apiKey: config.apiKey }
  }),

  datadog: (config = {}) => ({
    name: 'datadog',
    category: 'monitoring',
    description: 'Datadog monitoring and observability',
    server: 'datadog',
    actions: ['query_metrics', 'post_event', 'get_alerts', 'create_monitor'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['query_metrics', 'post_event', 'get_alerts', 'create_monitor'] },
        query: { type: 'string', description: 'Metrics query' },
        from: { type: 'string', description: 'Start time' },
        to: { type: 'string', description: 'End time' },
        title: { type: 'string', description: 'Event/monitor title' },
        message: { type: 'string', description: 'Event/monitor message' }
      }
    },
    config: { apiKey: config.apiKey, appKey: config.appKey }
  }),

  pagerduty: (config = {}) => ({
    name: 'pagerduty',
    category: 'monitoring',
    description: 'PagerDuty incident management',
    server: 'pagerduty',
    actions: ['create_incident', 'get_incident', 'acknowledge', 'resolve', 'add_note'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_incident', 'get_incident', 'acknowledge', 'resolve', 'add_note'] },
        title: { type: 'string', description: 'Incident title' },
        serviceId: { type: 'string', description: 'PagerDuty service ID' },
        urgency: { type: 'string', enum: ['high', 'low'] },
        incidentId: { type: 'string', description: 'Incident ID' },
        note: { type: 'string', description: 'Note text' }
      }
    },
    config: { integrationKey: config.integrationKey }
  }),

  // ── AI & Knowledge ────────────────────────────────
  openai: (config = {}) => ({
    name: 'openai',
    category: 'ai',
    description: 'OpenAI operations (GPT, embeddings, images)',
    server: 'openai',
    actions: ['complete', 'chat', 'embed', 'image_create', 'transcribe'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['complete', 'chat', 'embed', 'image_create', 'transcribe'] },
        prompt: { type: 'string', description: 'Prompt text' },
        messages: { type: 'array', description: 'Chat messages' },
        model: { type: 'string', description: 'Model name' },
        maxTokens: { type: 'number', description: 'Max tokens' },
        temperature: { type: 'number', description: 'Temperature' },
        input: { type: 'string', description: 'Input for embeddings' },
        imagePrompt: { type: 'string', description: 'Image generation prompt' }
      }
    },
    config: { apiKey: config.apiKey }
  }),

  anthropic: (config = {}) => ({
    name: 'anthropic',
    category: 'ai',
    description: 'Anthropic Claude operations',
    server: 'anthropic',
    actions: ['complete', 'chat'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['complete', 'chat'] },
        prompt: { type: 'string', description: 'Prompt' },
        messages: { type: 'array', description: 'Messages' },
        model: { type: 'string', description: 'Model (claude-3-opus, etc)' },
        maxTokens: { type: 'number', description: 'Max tokens' }
      }
    },
    config: { apiKey: config.apiKey }
  }),

  memory: (config = {}) => ({
    name: 'memory',
    category: 'ai',
    description: 'MemoryOS operations for persistent memory',
    server: 'memoryos',
    actions: ['remember', 'recall', 'search', 'forget', 'get_context'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['remember', 'recall', 'search', 'forget', 'get_context'] },
        entityId: { type: 'string', description: 'Entity ID' },
        content: { type: 'string', description: 'Content to remember' },
        type: { type: 'string', description: 'Memory type' },
        query: { type: 'string', description: 'Search query' },
        importance: { type: 'number', description: 'Importance (0-1)' }
      }
    },
    config: { memoryOsUrl: config.memoryOsUrl || 'http://localhost:4703' }
  }),

  twins: (config = {}) => ({
    name: 'twins',
    category: 'ai',
    description: 'TwinOS operations for digital twins',
    server: 'twinos',
    actions: ['get_twin', 'update_twin', 'create_twin', 'link_twin', 'get_related'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_twin', 'update_twin', 'create_twin', 'link_twin', 'get_related'] },
        twinId: { type: 'string', description: 'Twin ID' },
        twinType: { type: 'string', description: 'Twin type' },
        data: { type: 'object', description: 'Twin data' },
        relatedId: { type: 'string', description: 'Related twin ID' }
      }
    },
    config: { twinOsUrl: config.twinOsUrl || 'http://localhost:4705' }
  }),

  // ── Communication Platforms ──────────────────────
  telegram: (config = {}) => ({
    name: 'telegram',
    category: 'communication',
    description: 'Telegram Bot operations',
    server: 'telegram',
    actions: ['send_message', 'send_photo', 'send_document', 'get_updates'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send_message', 'send_photo', 'send_document', 'get_updates'] },
        chatId: { type: 'string', description: 'Chat ID' },
        text: { type: 'string', description: 'Message text' },
        photo: { type: 'string', description: 'Photo URL or file_id' },
        document: { type: 'string', description: 'Document URL or file_id' }
      }
    },
    config: { botToken: config.botToken }
  }),

  discord: (config = {}) => ({
    name: 'discord',
    category: 'communication',
    description: 'Discord webhook operations',
    server: 'discord',
    actions: ['send_message', 'send_embed'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send_message', 'send_embed'] },
        webhookUrl: { type: 'string', description: 'Discord webhook URL' },
        content: { type: 'string', description: 'Message content' },
        embed: { type: 'object', description: 'Embed object' }
      }
    }
  }),

  // ── Data & Files ────────────────────────────────
  google_drive: (config = {}) => ({
    name: 'google_drive',
    category: 'storage',
    description: 'Google Drive file operations',
    server: 'google_drive',
    actions: ['list_files', 'get_file', 'upload_file', 'create_folder', 'share'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_files', 'get_file', 'upload_file', 'create_folder', 'share'] },
        folderId: { type: 'string', description: 'Folder ID' },
        name: { type: 'string', description: 'File/folder name' },
        content: { type: 'string', description: 'File content (base64)' },
        mimeType: { type: 'string', description: 'MIME type' },
        email: { type: 'string', description: 'Email to share with' }
      }
    },
    config: { accessToken: config.accessToken }
  }),

  notion: (config = {}) => ({
    name: 'notion',
    category: 'productivity',
    description: 'Notion workspace operations',
    server: 'notion',
    actions: ['get_page', 'create_page', 'update_page', 'search', 'query_database'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_page', 'create_page', 'update_page', 'search', 'query_database'] },
        pageId: { type: 'string', description: 'Page ID' },
        databaseId: { type: 'string', description: 'Database ID' },
        properties: { type: 'object', description: 'Page/database properties' },
        query: { type: 'string', description: 'Search query' }
      }
    },
    config: { apiKey: config.apiKey }
  })
};

// Helper to create tool bundle
export function createToolBundle(category) {
  const bundle = {
    name: `${category}_bundle`,
    description: `Pre-configured ${category} tools`,
    tools: []
  };

  const categoryMap = {
    'communication': ['slack', 'email', 'whatsapp', 'sms', 'telegram', 'discord'],
    'crm': ['crm', 'salesforce'],
    'payments': ['razorpay', 'stripe'],
    'ai': ['openai', 'anthropic', 'memory', 'twins'],
    'storage': ['database', 's3_storage', 'google_drive'],
    'development': ['github', 'gitlab'],
    'productivity': ['google_calendar', 'outlook_calendar', 'notion'],
    'monitoring': ['analytics', 'datadog', 'pagerduty']
  };

  const tools = categoryMap[category] || [];
  for (const tool of tools) {
    if (TOOL_TEMPLATES[tool]) {
      bundle.tools.push(TOOL_TEMPLATES[tool]());
    }
  }

  return bundle;
}

export default TOOL_TEMPLATES;
