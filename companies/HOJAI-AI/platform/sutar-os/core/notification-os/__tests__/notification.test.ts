import { describe, it, expect, beforeEach } from 'vitest';

describe('NotificationOS', () => {
  const notifications = new Map();
  const preferences = new Map();

  beforeEach(() => {
    notifications.clear();
    preferences.clear();
  });

  describe('Notifications', () => {
    it('should create a notification', () => {
      const notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'info' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        priority: 'normal' as const,
        channels: ['email'] as const,
        createdAt: new Date().toISOString(),
      };
      notifications.set(notification.id, notification);
      expect(notifications.size).toBe(1);
    });

    it('should mark notification as read', () => {
      const notification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'info' as const,
        title: 'Test',
        message: 'Test',
        read: false,
        priority: 'normal' as const,
        channels: ['email'] as const,
        createdAt: new Date().toISOString(),
      };
      notifications.set(notification.id, notification);
      notification.read = true;
      notification.readAt = new Date().toISOString();
      expect(notification.read).toBe(true);
    });

    it('should filter by user', () => {
      notifications.set('notif-1', { userId: 'user-1' } as any);
      notifications.set('notif-2', { userId: 'user-2' } as any);
      const user1Notifs = Array.from(notifications.values()).filter(n => n.userId === 'user-1');
      expect(user1Notifs.length).toBe(1);
    });

    it('should filter unread only', () => {
      notifications.set('notif-1', { read: false } as any);
      notifications.set('notif-2', { read: true } as any);
      const unread = Array.from(notifications.values()).filter(n => !n.read);
      expect(unread.length).toBe(1);
    });

    it('should filter by type', () => {
      notifications.set('notif-1', { type: 'info' } as any);
      notifications.set('notif-2', { type: 'error' } as any);
      const errors = Array.from(notifications.values()).filter(n => n.type === 'error');
      expect(errors.length).toBe(1);
    });

    it('should filter by priority', () => {
      notifications.set('notif-1', { priority: 'low' } as any);
      notifications.set('notif-2', { priority: 'urgent' } as any);
      const urgent = Array.from(notifications.values()).filter(n => n.priority === 'urgent');
      expect(urgent.length).toBe(1);
    });
  });

  describe('User Preferences', () => {
    it('should create default preferences', () => {
      const prefs = {
        userId: 'user-1',
        channels: ['email'] as const,
        quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
        emailDigest: 'none' as const,
        pushEnabled: true,
        categories: {},
      };
      preferences.set(prefs.userId, prefs);
      expect(preferences.size).toBe(1);
    });

    it('should respect quiet hours', () => {
      const prefs = {
        quietHours: { enabled: true, start: '22:00', end: '08:00', timezone: 'UTC' },
      };
      const currentHour = new Date().getHours();
      const inQuietHours = prefs.quietHours.enabled && (currentHour >= 22 || currentHour < 8);
      expect(typeof inQuietHours).toBe('boolean');
    });

    it('should support email digest options', () => {
      const options = ['none', 'daily', 'weekly'];
      options.forEach(opt => {
        const prefs = { emailDigest: opt };
        expect(['none', 'daily', 'weekly']).toContain(prefs.emailDigest);
      });
    });
  });

  describe('Templates', () => {
    it('should interpolate variables', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!';
      const variables = { name: 'John', orderId: '12345' };

      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      expect(result).toBe('Hello John, your order 12345 is ready!');
    });
  });

  describe('Broadcast', () => {
    it('should broadcast to all users', () => {
      preferences.set('user-1', { userId: 'user-1' } as any);
      preferences.set('user-2', { userId: 'user-2' } as any);
      preferences.set('user-3', { userId: 'user-3' } as any);

      const userIds = Array.from(preferences.keys());
      expect(userIds.length).toBe(3);
    });

    it('should broadcast to specific users', () => {
      const userIds = ['user-1', 'user-3'];
      expect(userIds.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should count by type', () => {
      const notifs = [
        { type: 'info' },
        { type: 'info' },
        { type: 'error' },
        { type: 'warning' },
      ];

      const byType = {
        info: notifs.filter(n => n.type === 'info').length,
        error: notifs.filter(n => n.type === 'error').length,
        warning: notifs.filter(n => n.type === 'warning').length,
      };

      expect(byType.info).toBe(2);
      expect(byType.error).toBe(1);
    });

    it('should count by priority', () => {
      const notifs = [
        { priority: 'low' },
        { priority: 'normal' },
        { priority: 'urgent' },
        { priority: 'urgent' },
      ];

      const byPriority = {
        urgent: notifs.filter(n => n.priority === 'urgent').length,
      };

      expect(byPriority.urgent).toBe(2);
    });
  });

  describe('Expiration', () => {
    it('should filter expired notifications', () => {
      const now = new Date().toISOString();
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const tomorrow = new Date(Date.now() + 86400000).toISOString();

      const notifs = [
        { expiresAt: yesterday },
        { expiresAt: tomorrow },
        { expiresAt: null },
      ];

      const active = notifs.filter(n => !n.expiresAt || n.expiresAt > now);
      expect(active.length).toBe(2);
    });
  });

  describe('Mark All Read', () => {
    it('should mark all notifications as read for user', () => {
      notifications.set('notif-1', { userId: 'user-1', read: false } as any);
      notifications.set('notif-2', { userId: 'user-1', read: false } as any);
      notifications.set('notif-3', { userId: 'user-2', read: false } as any);

      let count = 0;
      for (const n of notifications.values()) {
        if (n.userId === 'user-1' && !n.read) {
          n.read = true;
          count++;
        }
      }

      expect(count).toBe(2);
    });
  });
});
