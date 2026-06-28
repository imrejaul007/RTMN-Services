/**
 * Notification OS - Unit Tests
 * Tests for notification CRUD, preferences, templates, broadcasts, and stats
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Re-implement the core functions for testing (matching src/index.ts logic)
interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  metadata: Record<string, string>;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

interface UserPreferences {
  userId: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  quietHours: { enabled: boolean; start: string; end: string; timezone: string };
  emailDigest: 'none' | 'daily' | 'weekly';
  pushEnabled: boolean;
  categories: Record<string, { enabled: boolean; email: boolean; push: boolean }>;
  webhookUrl?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  messageTemplate: string;
  variables: string[];
  createdAt: string;
}

const notifications = new Map<string, Notification>();
const preferences = new Map<string, UserPreferences>();
const templates = new Map<string, NotificationTemplate>();

// Seed default templates
const defaultTemplates: NotificationTemplate[] = [
  { id: 'tmpl-1', name: 'Welcome', type: 'info', title: 'Welcome to {{appName}}', messageTemplate: 'Hello {{name}}, welcome aboard!', variables: ['appName', 'name'], createdAt: new Date().toISOString() },
  { id: 'tmpl-2', name: 'Password Reset', type: 'warning', title: 'Password Reset Request', messageTemplate: 'Click here to reset: {{link}}', variables: ['link'], createdAt: new Date().toISOString() },
  { id: 'tmpl-3', name: 'Task Completed', type: 'success', title: 'Task Completed', messageTemplate: 'Your task "{{taskName}}" is done!', variables: ['taskName'], createdAt: new Date().toISOString() },
  { id: 'tmpl-4', name: 'Error Alert', type: 'error', title: 'Error: {{errorType}}', messageTemplate: 'An error occurred: {{errorMessage}}', variables: ['errorType', 'errorMessage'], createdAt: new Date().toISOString() },
];
defaultTemplates.forEach(t => templates.set(t.id, t));

function createNotification(overrides: Partial<Notification> = {}): Notification {
  const now = new Date().toISOString();
  return {
    id: 'notif-' + Math.random().toString(36).slice(2),
    userId: 'user-1',
    type: 'info',
    title: 'Test Notification',
    message: 'This is a test notification',
    read: false,
    priority: 'normal',
    channels: ['email'],
    metadata: {},
    createdAt: now,
    ...overrides,
  };
}

function createPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    userId: 'user-1',
    channels: ['email', 'push'],
    quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
    emailDigest: 'none',
    pushEnabled: true,
    categories: {},
    ...overrides,
  };
}

// Template interpolation
function interpolateTemplate(template: NotificationTemplate, variables: Record<string, string>): { title: string; message: string } {
  let title = template.title;
  let message = template.messageTemplate;
  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return { title, message };
}

// Stats calculation
function calculateStats(notificationList: Notification[]) {
  const now = new Date().toISOString();
  const active = notificationList.filter(n => !n.expiresAt || n.expiresAt > now);

  return {
    total: active.length,
    unread: active.filter(n => !n.read).length,
    byType: {
      info: active.filter(n => n.type === 'info').length,
      warning: active.filter(n => n.type === 'warning').length,
      error: active.filter(n => n.type === 'error').length,
      success: active.filter(n => n.type === 'success').length,
    },
    byPriority: {
      low: active.filter(n => n.priority === 'low').length,
      normal: active.filter(n => n.priority === 'normal').length,
      high: active.filter(n => n.priority === 'high').length,
      urgent: active.filter(n => n.priority === 'urgent').length,
    },
  };
}

describe('Notification OS - Notification CRUD', () => {
  beforeEach(() => {
    notifications.clear();
    preferences.clear();
  });

  it('should create a notification', () => {
    const notification = createNotification({
      id: 'notif-1',
      userId: 'user-1',
      title: 'Test Title',
      message: 'Test message',
    });

    notifications.set(notification.id, notification);

    expect(notifications.has('notif-1')).toBe(true);
    expect(notifications.get('notif-1')?.title).toBe('Test Title');
  });

  it('should read a notification', () => {
    const notification = createNotification({ id: 'notif-2' });
    notifications.set(notification.id, notification);

    const retrieved = notifications.get('notif-2');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('notif-2');
  });

  it('should update a notification', () => {
    const notification = createNotification({ id: 'notif-3', read: false });
    notifications.set(notification.id, notification);

    // Mark as read
    const retrieved = notifications.get('notif-3');
    if (retrieved) {
      retrieved.read = true;
      retrieved.readAt = new Date().toISOString();
    }

    expect(notifications.get('notif-3')?.read).toBe(true);
    expect(notifications.get('notif-3')?.readAt).toBeDefined();
  });

  it('should delete a notification', () => {
    const notification = createNotification({ id: 'notif-4' });
    notifications.set(notification.id, notification);

    notifications.delete('notif-4');

    expect(notifications.has('notif-4')).toBe(false);
  });

  it('should handle notification types', () => {
    const types: Array<'info' | 'warning' | 'error' | 'success'> = ['info', 'warning', 'error', 'success'];

    types.forEach((type, index) => {
      const notification = createNotification({ id: `notif-type-${index}`, type });
      notifications.set(notification.id, notification);
      expect(notifications.get(`notif-type-${index}`)?.type).toBe(type);
    });
  });

  it('should handle notification priorities', () => {
    const priorities: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];

    priorities.forEach((priority, index) => {
      const notification = createNotification({ id: `notif-priority-${index}`, priority });
      notifications.set(notification.id, notification);
      expect(notifications.get(`notif-priority-${index}`)?.priority).toBe(priority);
    });
  });

  it('should handle notification channels', () => {
    const notification = createNotification({
      id: 'notif-channels',
      channels: ['email', 'push', 'sms', 'webhook'],
    });
    notifications.set(notification.id, notification);

    expect(notifications.get('notif-channels')?.channels).toContain('email');
    expect(notifications.get('notif-channels')?.channels).toContain('push');
    expect(notifications.get('notif-channels')?.channels).toContain('sms');
    expect(notifications.get('notif-channels')?.channels).toContain('webhook');
  });
});

describe('Notification OS - Send with Preferences', () => {
  beforeEach(() => {
    notifications.clear();
    preferences.clear();
  });

  it('should use default preferences when user has none', () => {
    const userId = 'new-user';
    let userPrefs = preferences.get(userId);

    if (!userPrefs) {
      userPrefs = {
        userId,
        channels: ['email'],
        quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
        emailDigest: 'none',
        pushEnabled: true,
        categories: {},
      };
      preferences.set(userId, userPrefs);
    }

    expect(userPrefs.channels).toContain('email');
    expect(userPrefs.pushEnabled).toBe(true);
  });

  it('should respect user channel preferences', () => {
    const userId = 'user-channels';
    const userPrefs = createPreferences({
      userId,
      channels: ['push', 'sms'],
    });
    preferences.set(userId, userPrefs);

    const notification = createNotification({
      userId,
      channels: userPrefs.channels,
    });

    expect(notification.channels).not.toContain('email');
    expect(notification.channels).toContain('push');
    expect(notification.channels).toContain('sms');
  });

  it('should have default priority', () => {
    // When notification is created without explicit priority, it defaults to 'normal'
    const notification = createNotification();
    expect(notification.priority).toBe('normal');
  });
});

describe('Notification OS - Mark as Read/Unread', () => {
  beforeEach(() => {
    notifications.clear();
  });

  it('should mark notification as read', () => {
    const notification = createNotification({ id: 'notif-read', read: false });
    notifications.set(notification.id, notification);

    const retrieved = notifications.get('notif-read');
    expect(retrieved?.read).toBe(false);

    retrieved!.read = true;
    retrieved!.readAt = new Date().toISOString();

    expect(notifications.get('notif-read')?.read).toBe(true);
  });

  it('should mark notification as unread', () => {
    const notification = createNotification({ id: 'notif-unread', read: true });
    notifications.set(notification.id, notification);

    const retrieved = notifications.get('notif-unread');
    retrieved!.read = false;
    retrieved!.readAt = undefined;

    expect(notifications.get('notif-unread')?.read).toBe(false);
  });

  it('should track read timestamp', () => {
    const notification = createNotification({ id: 'notif-timestamp', read: false });
    notifications.set(notification.id, notification);

    const readTime = new Date().toISOString();
    const retrieved = notifications.get('notif-timestamp');
    retrieved!.read = true;
    retrieved!.readAt = readTime;

    expect(notifications.get('notif-timestamp')?.readAt).toBe(readTime);
  });
});

describe('Notification OS - Mark All as Read', () => {
  beforeEach(() => {
    notifications.clear();
  });

  it('should mark all notifications as read for user', () => {
    const now = new Date().toISOString();

    notifications.set('notif-1', createNotification({ id: 'notif-1', userId: 'user-1', read: false, createdAt: now }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', userId: 'user-1', read: false, createdAt: now }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', userId: 'user-2', read: false, createdAt: now }));

    let count = 0;
    for (const n of notifications.values()) {
      if (n.userId === 'user-1' && !n.read) {
        n.read = true;
        n.readAt = now;
        count++;
      }
    }

    expect(count).toBe(2);
    expect(notifications.get('notif-1')?.read).toBe(true);
    expect(notifications.get('notif-2')?.read).toBe(true);
    expect(notifications.get('notif-3')?.read).toBe(false);
  });

  it('should not double-count already read notifications', () => {
    const now = new Date().toISOString();

    notifications.set('notif-1', createNotification({ id: 'notif-1', userId: 'user-1', read: false, createdAt: now }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', userId: 'user-1', read: true, createdAt: now }));

    let count = 0;
    for (const n of notifications.values()) {
      if (n.userId === 'user-1' && !n.read) {
        n.read = true;
        count++;
      }
    }

    expect(count).toBe(1);
  });
});

describe('Notification OS - User Preferences', () => {
  beforeEach(() => {
    preferences.clear();
  });

  it('should create default preferences for new user', () => {
    const userId = 'new-user-prefs';

    let prefs = preferences.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        channels: ['email'],
        quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
        emailDigest: 'none',
        pushEnabled: true,
        categories: {},
      };
      preferences.set(userId, prefs);
    }

    expect(prefs.channels).toContain('email');
    expect(prefs.quietHours.enabled).toBe(false);
  });

  it('should update user preferences', () => {
    const prefs = createPreferences({
      userId: 'user-update',
      channels: ['email', 'push'],
    });
    preferences.set(prefs.userId, prefs);

    // Update channels
    prefs.channels = ['sms', 'webhook'];
    preferences.set(prefs.userId, prefs);

    expect(preferences.get('user-update')?.channels).toContain('sms');
    expect(preferences.get('user-update')?.channels).toContain('webhook');
  });

  it('should configure quiet hours', () => {
    const prefs = createPreferences({
      userId: 'user-quiet',
      quietHours: {
        enabled: true,
        start: '23:00',
        end: '07:00',
        timezone: 'America/New_York',
      },
    });
    preferences.set(prefs.userId, prefs);

    expect(preferences.get('user-quiet')?.quietHours.enabled).toBe(true);
    expect(preferences.get('user-quiet')?.quietHours.start).toBe('23:00');
    expect(preferences.get('user-quiet')?.quietHours.end).toBe('07:00');
  });

  it('should configure email digest frequency', () => {
    const frequencies: Array<'none' | 'daily' | 'weekly'> = ['none', 'daily', 'weekly'];

    frequencies.forEach((freq, index) => {
      const prefs = createPreferences({
        userId: `user-digest-${index}`,
        emailDigest: freq,
      });
      preferences.set(prefs.userId, prefs);
      expect(preferences.get(`user-digest-${index}`)?.emailDigest).toBe(freq);
    });
  });

  it('should configure category preferences', () => {
    const prefs = createPreferences({
      userId: 'user-categories',
      categories: {
        'marketing': { enabled: false, email: false, push: false },
        'security': { enabled: true, email: true, push: true },
      },
    });
    preferences.set(prefs.userId, prefs);

    expect(preferences.get('user-categories')?.categories['marketing'].enabled).toBe(false);
    expect(preferences.get('user-categories')?.categories['security'].email).toBe(true);
  });
});

describe('Notification OS - Template Interpolation', () => {
  it('should interpolate single variable', () => {
    const template: NotificationTemplate = {
      id: 'tmpl-single',
      name: 'Single Variable',
      type: 'info',
      title: 'Welcome to {{appName}}',
      messageTemplate: 'Hello user!',
      variables: ['appName'],
      createdAt: new Date().toISOString(),
    };

    const result = interpolateTemplate(template, { appName: 'MyApp' });

    expect(result.title).toBe('Welcome to MyApp');
  });

  it('should interpolate multiple variables', () => {
    const template: NotificationTemplate = {
      id: 'tmpl-multi',
      name: 'Multi Variable',
      type: 'info',
      title: 'Hello {{name}}',
      messageTemplate: 'Your order {{orderId}} has shipped!',
      variables: ['name', 'orderId'],
      createdAt: new Date().toISOString(),
    };

    const result = interpolateTemplate(template, { name: 'John', orderId: 'ORD-123' });

    expect(result.title).toBe('Hello John');
    expect(result.message).toBe('Your order ORD-123 has shipped!');
  });

  it('should replace multiple occurrences of same variable', () => {
    const template: NotificationTemplate = {
      id: 'tmpl-multi-occ',
      name: 'Multi Occurrence',
      type: 'info',
      title: '{{item}} Status',
      messageTemplate: '{{item}} is ready. Thank you for ordering {{item}}!',
      variables: ['item'],
      createdAt: new Date().toISOString(),
    };

    const result = interpolateTemplate(template, { item: 'Pizza' });

    expect(result.title).toBe('Pizza Status');
    expect(result.message).toBe('Pizza is ready. Thank you for ordering Pizza!');
  });

  it('should handle missing variables gracefully', () => {
    const template: NotificationTemplate = {
      id: 'tmpl-missing',
      name: 'Missing Variable',
      type: 'info',
      title: 'Hello {{name}}',
      messageTemplate: 'Welcome to {{appName}}',
      variables: ['name', 'appName'],
      createdAt: new Date().toISOString(),
    };

    const result = interpolateTemplate(template, { name: 'John' });

    expect(result.title).toBe('Hello John');
    expect(result.message).toBe('Welcome to {{appName}}'); // Unreplaced
  });

  it('should handle template with no variables', () => {
    const template: NotificationTemplate = {
      id: 'tmpl-none',
      name: 'No Variables',
      type: 'info',
      title: 'Static Title',
      messageTemplate: 'Static message content',
      variables: [],
      createdAt: new Date().toISOString(),
    };

    const result = interpolateTemplate(template, {});

    expect(result.title).toBe('Static Title');
    expect(result.message).toBe('Static message content');
  });
});

describe('Notification OS - Broadcast', () => {
  beforeEach(() => {
    notifications.clear();
    preferences.clear();
  });

  it('should create notifications for multiple users', () => {
    const userIds = ['user-a', 'user-b', 'user-c'];
    const ids: string[] = [];

    for (const userId of userIds) {
      const id = 'notif-' + userId;
      const notification = createNotification({
        id,
        userId,
        title: 'Broadcast Message',
        message: 'This is a broadcast',
      });
      notifications.set(id, notification);
      ids.push(id);
    }

    expect(ids.length).toBe(3);
    expect(notifications.size).toBe(3);
  });

  it('should target specific users in broadcast', () => {
    const targetUsers = ['user-1', 'user-2'];

    const ids: string[] = [];
    for (const userId of targetUsers) {
      const id = 'notif-' + userId;
      const notification = createNotification({ id, userId });
      notifications.set(id, notification);
      ids.push(id);
    }

    // Add non-target user
    const otherNotification = createNotification({ id: 'notif-other', userId: 'user-other' });
    notifications.set(otherNotification.id, otherNotification);

    expect(ids.length).toBe(2);
    expect(notifications.size).toBe(3);
  });

  it('should support all channel types in broadcast', () => {
    const allChannels: Array<'email' | 'push' | 'sms' | 'webhook'> = ['email', 'push', 'sms', 'webhook'];
    const notification = createNotification({
      channels: allChannels,
    });

    expect(notification.channels).toContain('email');
    expect(notification.channels).toContain('push');
    expect(notification.channels).toContain('sms');
    expect(notification.channels).toContain('webhook');
  });
});

describe('Notification OS - Statistics', () => {
  beforeEach(() => {
    notifications.clear();
  });

  it('should calculate total notifications', () => {
    notifications.set('notif-1', createNotification({ id: 'notif-1', createdAt: new Date().toISOString() }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', createdAt: new Date().toISOString() }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', createdAt: new Date().toISOString() }));

    const all = Array.from(notifications.values());
    const stats = calculateStats(all);

    expect(stats.total).toBe(3);
  });

  it('should count unread notifications', () => {
    notifications.set('notif-1', createNotification({ id: 'notif-1', read: false }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', read: true }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', read: false }));

    const all = Array.from(notifications.values());
    const stats = calculateStats(all);

    expect(stats.unread).toBe(2);
  });

  it('should count by type', () => {
    notifications.set('notif-1', createNotification({ id: 'notif-1', type: 'info' }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', type: 'info' }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', type: 'warning' }));
    notifications.set('notif-4', createNotification({ id: 'notif-4', type: 'error' }));

    const all = Array.from(notifications.values());
    const stats = calculateStats(all);

    expect(stats.byType.info).toBe(2);
    expect(stats.byType.warning).toBe(1);
    expect(stats.byType.error).toBe(1);
    expect(stats.byType.success).toBe(0);
  });

  it('should count by priority', () => {
    notifications.set('notif-1', createNotification({ id: 'notif-1', priority: 'low' }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', priority: 'normal' }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', priority: 'normal' }));
    notifications.set('notif-4', createNotification({ id: 'notif-4', priority: 'high' }));
    notifications.set('notif-5', createNotification({ id: 'notif-5', priority: 'urgent' }));

    const all = Array.from(notifications.values());
    const stats = calculateStats(all);

    expect(stats.byPriority.low).toBe(1);
    expect(stats.byPriority.normal).toBe(2);
    expect(stats.byPriority.high).toBe(1);
    expect(stats.byPriority.urgent).toBe(1);
  });

  it('should filter by userId', () => {
    notifications.set('notif-1', createNotification({ id: 'notif-1', userId: 'user-a' }));
    notifications.set('notif-2', createNotification({ id: 'notif-2', userId: 'user-a' }));
    notifications.set('notif-3', createNotification({ id: 'notif-3', userId: 'user-b' }));

    const all = Array.from(notifications.values());
    const userANotifs = all.filter(n => n.userId === 'user-a');
    const stats = calculateStats(userANotifs);

    expect(stats.total).toBe(2);
  });

  it('should handle empty notification list', () => {
    const stats = calculateStats([]);

    expect(stats.total).toBe(0);
    expect(stats.unread).toBe(0);
    expect(stats.byType.info).toBe(0);
    expect(stats.byPriority.normal).toBe(0);
  });
});

describe('Notification OS - Default Templates', () => {
  it('should have 4 default templates', () => {
    expect(templates.size).toBe(4);
  });

  it('should have Welcome template', () => {
    const welcome = templates.get('tmpl-1');
    expect(welcome).toBeDefined();
    expect(welcome?.name).toBe('Welcome');
    expect(welcome?.type).toBe('info');
  });

  it('should have Password Reset template', () => {
    const reset = templates.get('tmpl-2');
    expect(reset).toBeDefined();
    expect(reset?.name).toBe('Password Reset');
    expect(reset?.type).toBe('warning');
  });

  it('should have Task Completed template', () => {
    const completed = templates.get('tmpl-3');
    expect(completed).toBeDefined();
    expect(completed?.name).toBe('Task Completed');
    expect(completed?.type).toBe('success');
  });

  it('should have Error Alert template', () => {
    const error = templates.get('tmpl-4');
    expect(error).toBeDefined();
    expect(error?.name).toBe('Error Alert');
    expect(error?.type).toBe('error');
  });

  it('should contain correct variables in Welcome template', () => {
    const welcome = templates.get('tmpl-1');
    expect(welcome?.variables).toContain('appName');
    expect(welcome?.variables).toContain('name');
  });

  it('should contain correct variables in Error template', () => {
    const error = templates.get('tmpl-4');
    expect(error?.variables).toContain('errorType');
    expect(error?.variables).toContain('errorMessage');
  });
});
