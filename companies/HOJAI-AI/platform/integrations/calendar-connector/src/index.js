/**
 * HOJAI Calendar Connector
 * Google Calendar + Cal.com integration
 */

const axios = require('axios');

class CalendarClient {
  constructor(config) {
    this.provider = config.provider || 'google'; // google | calcom
    this.accessToken = config.accessToken;
    this.calendarId = config.calendarId || 'primary';
  }

  // Create event
  async createEvent(event) {
    if (this.provider === 'google') {
      return this.createGoogleEvent(event);
    }
    return this.createCalComEvent(event);
  }

  async createGoogleEvent(event) {
    const { title, start, end, attendees, description, location, reminders } = event;

    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        summary: title,
        location,
        description,
        start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
        attendees: attendees?.map(email => ({ email })),
        reminders: reminders ? {
          useDefault: false,
          overrides: reminders.map(r => ({ method: 'email', minutes: r }),
        } : undefined,
        conferenceData: {
          createRequest: { requestId: `event-${Date.now()}` },
        conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  // Update event
  async updateEvent(eventId, updates) {
    const response = await axios.patch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  // Delete event
  async deleteEvent(eventId) {
    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return { deleted: true };
  }

  // List events
  async listEvents(params = {}) {
    const { timeMin, timeMax, maxResults = 50, singleEvents = true } = params;

    const response = await axios.get(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        params: {
          timeMin: timeMin?.toISOString(),
          timeMax: timeMax?.toISOString(),
          maxResults,
          singleEvents,
          orderBy: 'startTime',
          timeZone: 'Asia/Kolkata',
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data.items?.map(e => ({
      id: e.id,
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      attendees: e.attendees?.map(a => a.email),
      meetLink: e.hangoutLink,
      location: e.location,
      status: e.status,
    })) || [];
  }

  // Find free slots
  async findSlots(params) {
    const { duration, startDate, endDate, attendees } = params;

    // Get busy periods
    const busy = await this.getBusyPeriods({
      timeMin: startDate,
      timeMax: endDate,
      items: attendees?.map(id => ({ id }) || [],
    });

    // Generate available slots (9 AM - 6 PM weekdays)
    const slots = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip weekends
        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          const isBusy = busy.some(b =>
            slotStart < new Date(b.end) && slotEnd > new Date(b.start)
          );

          if (!isBusy) {
            slots.push({ start: slotStart, end: slotEnd });
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  // Get busy periods
  async getBusyPeriods(params) {
    const { timeMin, timeMax, items } = params;

    const response = await axios.post(
      'https://calendar.google.com/calendar/v3/freebusy',
      {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toOString(),
        items: items || [{ id: 'primary' }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.calendars?.primary?.busy || [];
  }

  // Create booking link (Cal.com style)
  async createBookingLink(config) {
    // Returns a link for scheduling
    return {
      bookingUrl: `https://cal.com/${this.username}/${config.slug}`,
      id: config.id,
    };
  }

  // Get availability
  async getAvailability(params) {
    const { date } = params;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const events = await this.listEvents({ timeMin: day, timeMax: nextDay });

    return {
      date,
      busy: events.map(e => ({ start: e.start, end: e.end })),
      available: events.length < 8, // Assume max 8 meetings/day
    };
  }
}

// Cal.com specific
class CalComClient extends CalendarClient {
  constructor(config) {
    super({ ...config, provider: 'calcom' });
    this.apiKey = config.apiKey;
    this.username = config.username;
  }

  async createCalComEvent(event) {
    const { title, start, end, attendees, description } = event;

    const response = = await axios.post(
      'https://api.cal.com/v1/bookings',
      {
        title,
        start,
        end,
        attendees,
        description,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      joinUrl: response.data.confirmationPageUrl,
      cancelUrl: response.data.cancelUri,
    };
  }

  async getBookingLinks() {
    const response = await axios.get('https://api.cal.com/v1/event-types', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    return response.data.eventTypes?.map(e => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      duration: e.metadata?.availability?.duration,
      link: `https://cal.com/${this.username}/${e.slug}`,
    })) || [];
  }
}

module.exports = { CalendarClient, CalComClient };
