import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface MeetingRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  attendees: Array<{
    email: string;
    name?: string;
    rsvp_status?: 'pending' | 'accepted' | 'declined';
  }>;
  location?: string;
  meeting_type?: 'video' | 'audio' | 'in-person';
  host_email: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    until?: string;
    count?: number;
  };
  reminders?: Array<{
    type: string;
    minutes_before: number;
    sent?: boolean;
  }>;
}

interface MeetingResponse {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  duration_minutes: number;
  attendees: Array<{
    email: string;
    name?: string;
    rsvp_status: string;
  }>;
  location?: string;
  meeting_type: string;
  host: {
    email: string;
    name?: string;
  };
  join_url?: string;
  calendar_event_id?: {
    google?: string;
    outlook?: string;
    ics?: string;
  };
  reminders: Array<{
    type: string;
    minutes_before: number;
    sent: boolean;
  }>;
  status: 'scheduled' | 'cancelled' | 'completed' | 'in-progress';
  created_at: string;
  recurrence?: MeetingRequest['recurrence'];
}

// In-memory meeting store
const meetings: MeetingResponse[] = [];

// Generate random join URL
function generateJoinUrl(): string {
  const meetingId = randomUUID().replace(/-/g, '').slice(0, 10);
  return `https://meet.rtmn.io/${meetingId}`;
}

// POST /api/meeting/schedule - Schedule meeting
router.post('/schedule', (req: Request, res: Response) => {
  const meeting = req.body as MeetingRequest;

  // Validation
  if (!meeting.title) {
    res.status(400).json({ success: false, error: 'Title is required.' });
    return;
  }

  if (!meeting.start_time || !meeting.end_time) {
    res.status(400).json({ success: false, error: 'Start and end time are required.' });
    return;
  }

  if (!meeting.attendees || meeting.attendees.length === 0) {
    res.status(400).json({ success: false, error: 'At least one attendee is required.' });
    return;
  }

  if (!meeting.host_email) {
    res.status(400).json({ success: false, error: 'Host email is required.' });
    return;
  }

  const startDate = new Date(meeting.start_time);
  const endDate = new Date(meeting.end_time);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  if (durationMinutes <= 0) {
    res.status(400).json({ success: false, error: 'End time must be after start time.' });
    return;
  }

  const meetingId = 'mtg_' + randomUUID().slice(0, 12);

  const response: MeetingResponse = {
    id: randomUUID(),
    meeting_id: meetingId,
    title: meeting.title,
    description: meeting.description,
    start_time: meeting.start_time,
    end_time: meeting.end_time,
    timezone: meeting.timezone || 'UTC',
    duration_minutes: durationMinutes,
    attendees: meeting.attendees.map(a => ({
      email: a.email,
      name: a.name,
      rsvp_status: a.rsvp_status || 'pending'
    })),
    location: meeting.location,
    meeting_type: meeting.meeting_type || 'video',
    host: {
      email: meeting.host_email
    },
    join_url: generateJoinUrl(),
    calendar_event_id: {
      google: 'g_' + randomUUID().slice(0, 12),
      outlook: 'out_' + randomUUID().slice(0, 12),
      ics: meetingId + '.ics'
    },
    reminders: (meeting.reminders || [
      { type: 'email', minutes_before: 60, sent: false as boolean },
      { type: 'notification', minutes_before: 15, sent: false as boolean }
    ]).map(r => ({ type: r.type, minutes_before: r.minutes_before, sent: r.sent || false })),
    status: 'scheduled',
    created_at: new Date().toISOString(),
    recurrence: meeting.recurrence
  };

  // Add join URL for non-in-person meetings
  if (meeting.meeting_type !== 'in-person') {
    response.join_url = generateJoinUrl();
  }

  // Store meeting
  meetings.push(response);

  res.status(201).json({
    success: true,
    data: response,
    message: 'Meeting scheduled successfully'
  });
});

// GET /api/meeting/:id - Get meeting details
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const meeting = meetings.find(m => m.id === id || m.meeting_id === id);

  if (!meeting) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }

  res.json({ success: true, data: meeting });
});

// PATCH /api/meeting/:id - Update meeting
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const meetingIndex = meetings.findIndex(m => m.id === id || m.meeting_id === id);

  if (meetingIndex === -1) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }

  const meeting = meetings[meetingIndex];

  // Update allowed fields
  if (updates.title) meeting.title = updates.title;
  if (updates.description) meeting.description = updates.description;
  if (updates.start_time) meeting.start_time = updates.start_time;
  if (updates.end_time) meeting.end_time = updates.end_time;
  if (updates.timezone) meeting.timezone = updates.timezone;
  if (updates.location) meeting.location = updates.location;
  if (updates.status) meeting.status = updates.status;

  // Update attendees
  if (updates.attendees) {
    meeting.attendees = updates.attendees.map((a: any) => ({
      email: a.email,
      name: a.name,
      rsvp_status: a.rsvp_status || 'pending'
    }));
  }

  res.json({
    success: true,
    data: meeting,
    message: 'Meeting updated successfully'
  });
});

// DELETE /api/meeting/:id - Cancel meeting
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const meetingIndex = meetings.findIndex(m => m.id === id || m.meeting_id === id);

  if (meetingIndex === -1) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }

  const meeting = meetings[meetingIndex];
  meeting.status = 'cancelled';

  res.json({
    success: true,
    data: meeting,
    message: 'Meeting cancelled successfully'
  });
});

// GET /api/meeting - List meetings
router.get('/', (req: Request, res: Response) => {
  const { limit = '50', status, host_email, upcoming } = req.query;

  let filtered = [...meetings];

  // Filter by status
  if (status) {
    filtered = filtered.filter(m => m.status === status);
  }

  // Filter by host
  if (host_email) {
    filtered = filtered.filter(m => m.host.email === host_email);
  }

  // Only upcoming meetings
  if (upcoming === 'true') {
    const now = new Date();
    filtered = filtered.filter(m => new Date(m.start_time) > now && m.status === 'scheduled');
  }

  // Sort by start_time
  filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const limitNum = Math.min(parseInt(limit as string) || 50, 500);
  filtered = filtered.slice(0, limitNum);

  res.json({
    success: true,
    data: {
      meetings: filtered,
      total: filtered.length,
      stats: {
        total: meetings.length,
        scheduled: meetings.filter(m => m.status === 'scheduled').length,
        cancelled: meetings.filter(m => m.status === 'cancelled').length,
        completed: meetings.filter(m => m.status === 'completed').length
      }
    }
  });
});

export default router;
