/**
 * Calendar Connectors - Google Calendar, Outlook, Apple Calendar
 */

const calendarConnectors = [
  // ============= GOOGLE CALENDAR =============
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    description: 'Google calendar integration',
    authType: 'oauth2',
    logo: 'google-calendar-logo.svg',
    capabilities: ['events', 'calendars', 'attendees', 'reminders', 'availability'],
    actions: {
      getEvents: {
        description: 'Get events from calendar',
        params: ['calendarId', 'timeMin', 'timeMax', 'maxResults']
      },
      createEvent: {
        description: 'Create an event',
        params: ['summary', 'start', 'end', 'attendees', 'description', 'location']
      },
      updateEvent: {
        description: 'Update an event',
        params: ['eventId', 'calendarId', 'fields']
      },
      deleteEvent: {
        description: 'Delete an event',
        params: ['eventId', 'calendarId']
      },
      getCalendars: {
        description: 'List all calendars',
        params: []
      },
      getAvailability: {
        description: 'Get free/busy information',
        params: ['timeMin', 'timeMax', 'items']
      },
      quickAdd: {
        description: 'Quick add event from text',
        params: ['text', 'calendarId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Google Calendar access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'event1', summary: 'Team Meeting', start: '2024-01-15T10:00:00Z' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Google Calendar`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Google Calendar`);
      return { success: true };
    }
  },

  // ============= MICROSOFT OUTLOOK =============
  {
    id: 'outlook-calendar',
    name: 'Microsoft Outlook',
    category: 'calendar',
    description: 'Microsoft 365 calendar',
    authType: 'oauth2',
    logo: 'outlook-logo.svg',
    capabilities: ['events', 'calendars', 'attendees', 'room-resources', 'availability'],
    actions: {
      getEvents: {
        description: 'Get calendar events',
        params: ['calendarId', 'startDateTime', 'endDateTime', 'top']
      },
      createEvent: {
        description: 'Create an event',
        params: ['subject', 'start', 'end', 'attendees', 'body']
      },
      updateEvent: {
        description: 'Update an event',
        params: ['eventId', 'fields']
      },
      deleteEvent: {
        description: 'Delete an event',
        params: ['eventId']
      },
      getCalendars: {
        description: 'List calendars',
        params: []
      },
      getAvailability: {
        description: 'Get availability',
        params: ['startTime', 'endTime', 'attendees']
      },
      getRooms: {
        description: 'Get available rooms',
        params: ['roomList']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Outlook access token');
      }
      return { success: true, user: 'user@domain.com' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Outlook`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Outlook`);
      return { success: true };
    }
  },

  // ============= CALENDLY =============
  {
    id: 'calendly',
    name: 'Calendly',
    category: 'calendar',
    description: 'Scheduling automation',
    authType: 'api_key',
    logo: 'calendly-logo.svg',
    capabilities: ['scheduling', 'events', 'invitees', 'webhooks', 'availability'],
    actions: {
      getEventTypes: {
        description: 'Get event types',
        params: []
      },
      getScheduledEvents: {
        description: 'Get scheduled events',
        params: ['user', 'minStartTime', 'maxStartTime']
      },
      getEvent: {
        description: 'Get event by UUID',
        params: ['eventUuid']
      },
      cancelEvent: {
        description: 'Cancel an event',
        params: ['eventUuid', 'reason']
      },
      getInvitees: {
        description: 'Get event invitees',
        params: ['eventUuid']
      },
      createWebhookSubscription: {
        description: 'Create webhook',
        params: ['url', 'events', 'scope', 'scopeUuid']
      },
      getSchedulingLinks: {
        description: 'Get available scheduling links',
        params: ['user']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Calendly API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Calendly`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Calendly`);
      return { success: true };
    }
  },

  // ============= CAL.com =============
  {
    id: 'cal-com',
    name: 'Cal.com',
    category: 'calendar',
    description: 'Open source scheduling infrastructure',
    authType: 'api_key',
    logo: 'cal-logo.svg',
    capabilities: ['scheduling', 'events', 'bookings', 'users', 'teams'],
    actions: {
      getEventTypes: {
        description: 'Get event types',
        params: ['userId']
      },
      getBookings: {
        description: 'Get bookings',
        params: ['userId', 'status']
      },
      createBooking: {
        description: 'Create booking',
        params: ['eventTypeId', 'startTime', 'endTime', 'attendees']
      },
      cancelBooking: {
        description: 'Cancel booking',
        params: ['uid', 'reason']
      },
      rescheduleBooking: {
        description: 'Reschedule booking',
        params: ['uid', 'newStartTime']
      },
      getUsers: {
        description: 'Get users',
        params: []
      },
      getTeams: {
        description: 'Get teams',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Cal.com API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Cal.com`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Cal.com`);
      return { success: true };
    }
  }
];

export default {
  list: calendarConnectors
};
