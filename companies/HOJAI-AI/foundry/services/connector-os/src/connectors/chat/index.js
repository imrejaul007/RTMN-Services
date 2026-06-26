/**
 * Chat Connectors - Slack, Teams, Discord, WhatsApp, Intercom
 */

const chatConnectors = [
  // ============= SLACK =============
  {
    id: 'slack',
    name: 'Slack',
    category: 'chat',
    description: 'Business communication platform',
    authType: 'oauth2',
    logo: 'slack-logo.svg',
    capabilities: ['channels', 'messages', 'files', 'users', 'workflows', 'apps'],
    actions: {
      postMessage: {
        description: 'Post message to channel',
        params: ['channel', 'text', 'blocks', 'attachments']
      },
      getMessages: {
        description: 'Get channel messages',
        params: ['channel', 'oldest', 'latest', 'limit']
      },
      createChannel: {
        description: 'Create a channel',
        params: ['name', 'isPrivate']
      },
      inviteToChannel: {
        description: 'Invite user to channel',
        params: ['channel', 'users']
      },
      uploadFile: {
        description: 'Upload file to channel',
        params: ['channels', 'file', 'filename', 'initialComment']
      },
      createScheduleMessage: {
        description: 'Schedule a message',
        params: ['channel', 'text', 'postAt']
      },
      getUsers: {
        description: 'Get workspace users',
        params: ['limit']
      },
      openDirectMessage: {
        description: 'Open DM with user',
        params: ['userId']
      },
      createWorkflow: {
        description: 'Create workflow',
        params: ['name', 'trigger', 'steps']
      },
      getChannels: {
        description: 'List channels',
        params: ['types', 'excludeArchived']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.botToken) {
        throw new Error('Missing Slack bot token');
      }
      return { success: true, team: 'Test Workspace' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Slack`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Slack`);
      return { success: true };
    }
  },

  // ============= MICROSOFT TEAMS =============
  {
    id: 'ms-teams',
    name: 'Microsoft Teams',
    category: 'chat',
    description: 'Team collaboration platform',
    authType: 'oauth2',
    logo: 'teams-logo.svg',
    capabilities: ['channels', 'messages', 'meetings', 'files', 'tabs', 'webhooks'],
    actions: {
      sendMessage: {
        description: 'Send message to channel',
        params: ['channelId', 'content', 'importance']
      },
      getMessages: {
        description: 'Get channel messages',
        params: ['channelId', 'top']
      },
      createChannel: {
        description: 'Create channel',
        params: ['teamId', 'displayName', 'description']
      },
      getChannels: {
        description: 'Get channels',
        params: ['teamId']
      },
      createChat: {
        description: 'Create chat',
        params: ['members', 'topic']
      },
      sendChatMessage: {
        description: 'Send chat message',
        params: ['chatId', 'content']
      },
      scheduleMeeting: {
        description: 'Schedule meeting',
        params: ['subject', 'startTime', 'endTime', 'attendees', 'content']
      },
      getUsers: {
        description: 'Get users',
        params: []
      },
      uploadFile: {
        description: 'Upload file to channel',
        params: ['channelId', 'file', 'filename']
      },
      createIncomingWebhook: {
        description: 'Create incoming webhook',
        params: ['channelId', 'name']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Teams access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Microsoft Teams`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Microsoft Teams`);
      return { success: true };
    }
  },

  // ============= DISCORD =============
  {
    id: 'discord',
    name: 'Discord',
    category: 'chat',
    description: 'Community communication platform',
    authType: 'bot_token',
    logo: 'discord-logo.svg',
    capabilities: ['channels', 'messages', 'webhooks', 'roles', 'threads'],
    actions: {
      sendMessage: {
        description: 'Send message to channel',
        params: ['channelId', 'content', 'embeds']
      },
      getMessages: {
        description: 'Get channel messages',
        params: ['channelId', 'limit', 'before', 'after']
      },
      createChannel: {
        description: 'Create channel',
        params: ['guildId', 'name', 'type', 'parentId']
      },
      createThread: {
        description: 'Create thread',
        params: ['channelId', 'name', 'messageId']
      },
      getGuildChannels: {
        description: 'Get guild channels',
        params: ['guildId']
      },
      addRole: {
        description: 'Add role to member',
        params: ['guildId', 'userId', 'roleId']
      },
      createWebhook: {
        description: 'Create webhook',
        params: ['channelId', 'name']
      },
      executeWebhook: {
        description: 'Execute webhook',
        params: ['webhookId', 'token', 'content']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.botToken) {
        throw new Error('Missing Discord bot token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Discord`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Discord`);
      return { success: true };
    }
  },

  // ============= WHATSAPP BUSINESS =============
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'chat',
    description: 'Business messaging via WhatsApp',
    authType: 'api_key',
    logo: 'whatsapp-logo.svg',
    capabilities: ['messages', 'templates', 'media', 'contacts', 'webhooks'],
    actions: {
      sendMessage: {
        description: 'Send message',
        params: ['to', 'body', 'type']
      },
      sendTemplate: {
        description: 'Send template message',
        params: ['to', 'templateName', 'languageCode', 'components']
      },
      sendMedia: {
        description: 'Send media message',
        params: ['to', 'mediaUrl', 'caption', 'type']
      },
      sendInteractive: {
        description: 'Send interactive message',
        params: ['to', 'type', 'body', 'action', 'header']
      },
      markAsRead: {
        description: 'Mark message as read',
        params: ['messageId']
      },
      getContacts: {
        description: 'Get contact info',
        params: ['phoneNumbers']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.phoneNumberId || !credentials.accessToken) {
        throw new Error('Missing WhatsApp credentials');
      }
      return { success: true, phoneNumber: credentials.phoneNumberId };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from WhatsApp`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to WhatsApp`);
      return { success: true };
    }
  },

  // ============= INTERCOM =============
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'chat',
    description: 'Customer messaging platform',
    authType: 'api_key',
    logo: 'intercom-logo.svg',
    capabilities: ['conversations', 'users', 'leads', 'messages', 'articles', 'bots'],
    actions: {
      sendMessage: {
        description: 'Send message to user',
        params: ['to', 'body', 'type', 'template']
      },
      getConversations: {
        description: 'Get conversations',
        params: ['state', 'orderBy', 'perPage']
      },
      getConversation: {
        description: 'Get conversation',
        params: ['conversationId']
      },
      replyToConversation: {
        description: 'Reply to conversation',
        params: ['conversationId', 'messageType', 'body']
      },
      getUsers: {
        description: 'Get users',
        params: ['perPage']
      },
      createUser: {
        description: 'Create/update user',
        params: ['email', 'name', 'customAttributes']
      },
      getLeads: {
        description: 'Get leads',
        params: ['perPage']
      },
      createLead: {
        description: 'Create lead',
        params: ['email', 'name', 'customAttributes']
      },
      createArticle: {
        description: 'Create help article',
        params: ['title', 'description', 'body', 'authorId']
      },
      getArticles: {
        description: 'Get articles',
        params: ['state']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Intercom access token');
      }
      return { success: true, appId: 'AppId' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Intercom`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Intercom`);
      return { success: true };
    }
  },

  // ============= TWILIO (SMS) =============
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'chat',
    description: 'SMS, Voice, and WhatsApp API',
    authType: 'api_key',
    logo: 'twilio-logo.svg',
    capabilities: ['sms', 'whatsapp', 'voice', 'verify', ' programmable-chat'],
    actions: {
      sendSms: {
        description: 'Send SMS',
        params: ['to', 'from', 'body']
      },
      sendBulkSms: {
        description: 'Send bulk SMS',
        params: ['messages']
      },
      getSms: {
        description: 'Get SMS message',
        params: ['smsId']
      },
      listSms: {
        description: 'List SMS messages',
        params: ['to', 'from', 'dateSent']
      },
      sendWhatsApp: {
        description: 'Send WhatsApp message',
        params: ['to', 'body', 'mediaUrl']
      },
      createCall: {
        description: 'Make voice call',
        params: ['to', 'from', 'twiml']
      },
      sendVerification: {
        description: 'Send verification code',
        params: ['to', 'channel']
      },
      checkVerification: {
        description: 'Check verification code',
        params: ['to', 'code']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accountSid || !credentials.authToken) {
        throw new Error('Missing Twilio credentials');
      }
      return { success: true, accountSid: credentials.accountSid };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Twilio`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Twilio`);
      return { success: true };
    }
  }
];

export default {
  list: chatConnectors
};
