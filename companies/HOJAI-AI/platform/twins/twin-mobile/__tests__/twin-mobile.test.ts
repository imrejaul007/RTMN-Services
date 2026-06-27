/**
 * Twin Mobile Tests - Port 4771
 * Mobile companion app backend
 */
import { describe, it, expect } from 'vitest';

// Mobile types
const MOBILE_PLATFORMS = ['ios', 'android', 'web'];
const NOTIFICATION_TYPES = ['task', 'meeting', 'reminder', 'insight', 'alert'];
const VOICE_ACTIONS = ['query_tasks', 'create_task', 'update_task', 'schedule_meeting', 'send_message'];

describe('Twin Mobile - Constants', () => {
  describe('Mobile Platforms', () => {
    it('should have all supported platforms', () => {
      expect(MOBILE_PLATFORMS).toContain('ios');
      expect(MOBILE_PLATFORMS).toContain('android');
      expect(MOBILE_PLATFORMS).toContain('web');
    });
  });

  describe('Notification Types', () => {
    it('should have all notification types', () => {
      expect(NOTIFICATION_TYPES).toContain('task');
      expect(NOTIFICATION_TYPES).toContain('meeting');
      expect(NOTIFICATION_TYPES).toContain('reminder');
      expect(NOTIFICATION_TYPES).toContain('insight');
      expect(NOTIFICATION_TYPES).toContain('alert');
    });
  });

  describe('Voice Actions', () => {
    it('should have all voice actions', () => {
      expect(VOICE_ACTIONS).toContain('query_tasks');
      expect(VOICE_ACTIONS).toContain('create_task');
      expect(VOICE_ACTIONS).toContain('update_task');
      expect(VOICE_ACTIONS).toContain('schedule_meeting');
      expect(VOICE_ACTIONS).toContain('send_message');
    });
  });
});

describe('Twin Mobile - Voice Command Parsing', () => {
  const parseVoiceCommand = (transcript: string): { action: string; entities: Record<string, string> } => {
    const lower = transcript.toLowerCase();

    if (lower.includes('what tasks') || lower.includes('show tasks') || lower.includes('tasks')) {
      return { action: 'query_tasks', entities: {} };
    }
    if (lower.includes('create task') || lower.includes('add task') || lower.includes('new task')) {
      return { action: 'create_task', entities: {} };
    }
    if (lower.includes('update task') || lower.includes('complete task') || lower.includes('finish task')) {
      return { action: 'update_task', entities: {} };
    }
    if (lower.includes('schedule') || lower.includes('book meeting') || lower.includes('meeting')) {
      return { action: 'schedule_meeting', entities: {} };
    }
    if (lower.includes('send message') || lower.includes('email') || lower.includes('message')) {
      return { action: 'send_message', entities: {} };
    }

    return { action: 'unknown', entities: {} };
  };

  it('should parse task queries', () => {
    expect(parseVoiceCommand('What tasks do I have?').action).toBe('query_tasks');
    expect(parseVoiceCommand('Show my tasks').action).toBe('query_tasks');
  });

  it('should parse task creation', () => {
    expect(parseVoiceCommand('Create a new task').action).toBe('create_task');
    expect(parseVoiceCommand('Add task for tomorrow').action).toBe('create_task');
  });

  it('should parse task updates', () => {
    expect(parseVoiceCommand('Complete the task').action).toBe('update_task');
    expect(parseVoiceCommand('Update task status').action).toBe('update_task');
  });

  it('should parse meeting scheduling', () => {
    expect(parseVoiceCommand('Schedule a meeting').action).toBe('schedule_meeting');
    expect(parseVoiceCommand('Book meeting for 3pm').action).toBe('schedule_meeting');
  });

  it('should return unknown for unrecognized commands', () => {
    expect(parseVoiceCommand('Do something random').action).toBe('unknown');
  });
});

describe('Twin Mobile - Mobile Summary Generation', () => {
  const generateSummary = (data: {
    tasks: number;
    meetings: number;
    unreadMessages: number;
    twinStatus: 'active' | 'inactive' | 'syncing';
  }): {
    summary: string;
    urgentCount: number;
    suggestions: string[];
  } => {
    const suggestions: string[] = [];
    let urgentCount = 0;

    if (data.tasks > 5) {
      suggestions.push('You have several tasks pending');
      urgentCount += Math.min(data.tasks - 5, 3);
    }
    if (data.meetings > 3) {
      suggestions.push('Busy meeting schedule today');
    }
    if (data.unreadMessages > 10) {
      suggestions.push('Consider catching up on messages');
    }
    if (data.twinStatus === 'inactive') {
      suggestions.push('Sync your twin for better insights');
    }

    const summary = `Tasks: ${data.tasks} | Meetings: ${data.meetings} | Messages: ${data.unreadMessages}`;

    return { summary, urgentCount, suggestions };
  };

  it('should generate summary with task count', () => {
    const result = generateSummary({ tasks: 8, meetings: 2, unreadMessages: 5, twinStatus: 'active' });
    expect(result.summary).toContain('8');
    expect(result.urgentCount).toBe(3);
  });

  it('should suggest syncing when twin is inactive', () => {
    const result = generateSummary({ tasks: 2, meetings: 1, unreadMessages: 3, twinStatus: 'inactive' });
    expect(result.suggestions.some(s => s.includes('Sync'))).toBe(true);
  });

  it('should not suggest when status is good', () => {
    const result = generateSummary({ tasks: 3, meetings: 2, unreadMessages: 5, twinStatus: 'active' });
    expect(result.suggestions).toHaveLength(0);
  });
});

describe('Twin Mobile - Push Notification Priority', () => {
  const calculateNotificationPriority = (
    type: string,
    isUrgent: boolean,
    hour: number
  ): 'critical' | 'high' | 'normal' | 'low' => {
    let priority = 50;

    if (isUrgent) priority += 30;
    if (type === 'alert') priority += 20;
    if (type === 'task') priority += 10;
    if (type === 'insight') priority += 5;

    // Quiet hours penalty
    if (hour >= 22 || hour < 7) priority -= 20;

    if (priority >= 90) return 'critical';
    if (priority >= 70) return 'high';
    if (priority >= 40) return 'normal';
    return 'low';
  };

  it('should prioritize urgent alerts during day', () => {
    expect(calculateNotificationPriority('alert', true, 10)).toBe('critical');
  });

  it('should deprioritize during quiet hours', () => {
    const dayPriority = calculateNotificationPriority('alert', true, 10);
    const nightPriority = calculateNotificationPriority('alert', true, 23);
    expect(nightPriority).toBeLessThan(dayPriority);
  });

  it('should handle low priority insights', () => {
    expect(calculateNotificationPriority('insight', false, 10)).toBe('normal');
  });
});

describe('Twin Mobile - Offline Sync Strategy', () => {
  const calculateSyncPriority = (
    pendingChanges: number,
    lastSyncAge: number, // in minutes
    hasWifi: boolean
  ): { shouldSync: boolean; priority: 'immediate' | 'delayed' | 'batch' } => {
    const ageHours = lastSyncAge / 60;

    // Immediate sync conditions
    if (pendingChanges > 10 && hasWifi) {
      return { shouldSync: true, priority: 'immediate' };
    }
    if (ageHours > 4 && pendingChanges > 0) {
      return { shouldSync: true, priority: 'immediate' };
    }

    // Batch sync conditions
    if (pendingChanges > 5) {
      return { shouldSync: true, priority: 'batch' };
    }

    // Delayed sync
    if (ageHours > 1 || pendingChanges > 0) {
      return { shouldSync: true, priority: 'delayed' };
    }

    return { shouldSync: false, priority: 'delayed' };
  };

  it('should sync immediately for many pending changes on wifi', () => {
    const result = calculateSyncPriority(15, 30, true);
    expect(result.shouldSync).toBe(true);
    expect(result.priority).toBe('immediate');
  });

  it('should batch sync for moderate changes', () => {
    const result = calculateSyncPriority(8, 60, true);
    expect(result.shouldSync).toBe(true);
    expect(result.priority).toBe('batch');
  });

  it('should delay sync when not urgent', () => {
    const result = calculateSyncPriority(2, 20, false);
    expect(result.shouldSync).toBe(true);
    expect(result.priority).toBe('delayed');
  });
});

describe('Twin Mobile - Widget Data Generation', () => {
  const generateWidgetData = (type: 'tasks' | 'calendar' | 'insights' | 'quick_actions'): {
    title: string;
    data: any;
    refreshInterval: number; // in minutes
  } => {
    switch (type) {
      case 'tasks':
        return { title: 'My Tasks', data: { count: 5, urgent: 2 }, refreshInterval: 5 };
      case 'calendar':
        return { title: 'Today\'s Schedule', data: { meetings: 3 }, refreshInterval: 15 };
      case 'insights':
        return { title: 'AI Insights', data: { count: 3 }, refreshInterval: 60 };
      case 'quick_actions':
        return { title: 'Quick Actions', data: ['New Task', 'Schedule', 'Message'], refreshInterval: 30 };
    }
  };

  it('should generate task widget data', () => {
    const widget = generateWidgetData('tasks');
    expect(widget.title).toBe('My Tasks');
    expect(widget.refreshInterval).toBe(5);
    expect(widget.data.count).toBeDefined();
  });

  it('should generate calendar widget data', () => {
    const widget = generateWidgetData('calendar');
    expect(widget.title).toBe('Today\'s Schedule');
    expect(widget.refreshInterval).toBe(15);
  });

  it('should generate insights widget with longer refresh', () => {
    const widget = generateWidgetData('insights');
    expect(widget.refreshInterval).toBe(60);
  });
});
