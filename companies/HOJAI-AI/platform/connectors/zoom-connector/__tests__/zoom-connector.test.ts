import { describe, it, expect } from 'vitest';

// Zoom Connector Constants
const MEETING_TYPES = { scheduled: 1, recurring: 2, recurring_no_fixed_time: 3 };
const USER_TYPES = { basic: 1, pro: 2, corporate: 3 };

describe('Zoom Connector', () => {
  describe('Meeting Types', () => {
    it('should have all meeting types', () => {
      expect(MEETING_TYPES.scheduled).toBe(1);
      expect(MEETING_TYPES.recurring).toBe(2);
    });
  });

  describe('User Types', () => {
    it('should have all user types', () => {
      expect(USER_TYPES.basic).toBe(1);
      expect(USER_TYPES.pro).toBe(2);
      expect(USER_TYPES.corporate).toBe(3);
    });
  });

  describe('Meeting Validation', () => {
    const validateMeeting = (meeting: {
      topic?: string;
      start_time?: string;
      duration?: number;
      host_id?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!meeting.topic) errors.push('topic is required');
      if (!meeting.start_time) errors.push('start_time is required');
      if (meeting.start_time && isNaN(Date.parse(meeting.start_time))) {
        errors.push('invalid start_time');
      }
      if (meeting.duration !== undefined && (meeting.duration < 15 || meeting.duration > 1440)) {
        errors.push('duration must be 15-1440 minutes');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct meeting', () => {
      const result = validateMeeting({
        topic: 'Team Standup',
        start_time: '2026-06-27T10:00:00Z',
        duration: 30,
        host_id: 'host123'
      });
      expect(result.valid).toBe(true);
    });

    it('should require topic and start_time', () => {
      const result = validateMeeting({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('topic is required');
      expect(result.errors).toContain('start_time is required');
    });
  });

  describe('Meeting Filtering', () => {
    const filterMeetings = (
      meetings: Array<{ host_id: string; start_time: string; topic: string }>,
      filters: { host_id?: string; from?: string; to?: string }
    ) => {
      let filtered = [...meetings];

      if (filters.host_id) filtered = filtered.filter(m => m.host_id === filters.host_id);
      if (filters.from) filtered = filtered.filter(m => m.start_time >= filters.from!);
      if (filters.to) filtered = filtered.filter(m => m.start_time <= filters.to!);

      return filtered;
    };

    it('should filter by host', () => {
      const meetings = [
        { host_id: 'host1', start_time: '2026-06-27T10:00:00Z', topic: 'Meeting 1' },
        { host_id: 'host2', start_time: '2026-06-27T11:00:00Z', topic: 'Meeting 2' }
      ];
      const results = filterMeetings(meetings, { host_id: 'host1' });
      expect(results).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const meetings = [
        { host_id: 'host1', start_time: '2026-06-20T10:00:00Z', topic: 'Past' },
        { host_id: 'host1', start_time: '2026-06-27T10:00:00Z', topic: 'Future' }
      ];
      const results = filterMeetings(meetings, { from: '2026-06-25T00:00:00Z' });
      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('Future');
    });
  });

  describe('User Validation', () => {
    const validateUser = (user: {
      email?: string;
      name?: string;
      type?: number;
      department?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!user.email) errors.push('email is required');
      if (!user.name) errors.push('name is required');
      if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        errors.push('invalid email');
      }
      if (user.type !== undefined && !Object.values(USER_TYPES).includes(user.type)) {
        errors.push('invalid type');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct user', () => {
      const result = validateUser({
        email: 'john@company.com',
        name: 'John Doe',
        type: 2,
        department: 'Engineering'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Meeting Analytics', () => {
    const analyzeMeetings = (
      meetings: Array<{ duration: number; participants: string[]; start_time: string }>
    ) => {
      const totalDuration = meetings.reduce((sum, m) => sum + m.duration, 0);
      const totalParticipants = meetings.reduce((sum, m) => sum + m.participants.length, 0);
      const avgDuration = meetings.length > 0 ? totalDuration / meetings.length : 0;
      const avgParticipants = meetings.length > 0 ? totalParticipants / meetings.length : 0;

      return { totalMeetings: meetings.length, totalDuration, avgDuration, avgParticipants };
    };

    it('should calculate meeting analytics', () => {
      const meetings = [
        { duration: 60, participants: ['u1', 'u2', 'u3'], start_time: '2026-06-20T10:00:00Z' },
        { duration: 30, participants: ['u1', 'u2'], start_time: '2026-06-21T10:00:00Z' }
      ];
      const analytics = analyzeMeetings(meetings);
      expect(analytics.totalMeetings).toBe(2);
      expect(analytics.totalDuration).toBe(90);
      expect(analytics.avgDuration).toBe(45);
      expect(analytics.avgParticipants).toBe(2.5);
    });
  });

  describe('Recording Analysis', () => {
    const analyzeRecordings = (
      meetings: Array<{ recordings?: Array<{ file_type: string; download_url: string }> }>
    ) => {
      const withRecordings = meetings.filter(m => m.recordings && m.recordings.length > 0);
      const totalRecordings = withRecordings.reduce((sum, m) => sum + (m.recordings?.length || 0), 0);

      return {
        totalMeetings: meetings.length,
        meetingsWithRecordings: withRecordings.length,
        totalRecordings,
        recordingRate: meetings.length > 0 ? (withRecordings.length / meetings.length) * 100 : 0
      };
    };

    it('should calculate recording rate', () => {
      const meetings = [
        { recordings: [{ file_type: 'MP4', download_url: 'http://...' }] },
        { recordings: [] },
        { recordings: undefined }
      ];
      const analytics = analyzeRecordings(meetings);
      expect(analytics.totalMeetings).toBe(3);
      expect(analytics.meetingsWithRecordings).toBe(1);
      expect(analytics.recordingRate).toBeCloseTo(33.33, 0);
    });
  });

  describe('Conflict Detection', () => {
    const hasConflict = (
      meetings: Array<{ start_time: string; duration: number }>,
      newStart: string,
      newDuration: number
    ): boolean => {
      const newStartTime = new Date(newStart).getTime();
      const newEndTime = newStartTime + newDuration * 60 * 1000;

      return meetings.some(m => {
        const mStart = new Date(m.start_time).getTime();
        const mEnd = mStart + m.duration * 60 * 1000;
        return (newStartTime < mEnd && newEndTime > mStart);
      });
    };

    it('should detect overlapping meetings', () => {
      const meetings = [
        { start_time: '2026-06-27T10:00:00Z', duration: 60 }
      ];
      expect(hasConflict(meetings, '2026-06-27T10:30:00Z', 60)).toBe(true);
      expect(hasConflict(meetings, '2026-06-27T12:00:00Z', 30)).toBe(false);
    });
  });
});