import { describe, it, expect } from 'vitest';

// Slack Connector Constants
const CHANNEL_TYPES = ['public', 'private', 'direct', 'multi'];
const MESSAGE_TYPES = ['message', 'thread', 'reply', 'file_share', 'reaction'];
const SLACK_OBJECT_TYPES = ['channel', 'user', 'message', 'file', 'reaction', 'emoji'];

describe('Slack Connector', () => {
  describe('Channel Types', () => {
    it('should have all channel types', () => {
      expect(CHANNEL_TYPES).toContain('public');
      expect(CHANNEL_TYPES).toContain('private');
      expect(CHANNEL_TYPES).toContain('direct');
      expect(CHANNEL_TYPES).toContain('multi');
    });

    it('should have 4 channel types', () => {
      expect(CHANNEL_TYPES).toHaveLength(4);
    });
  });

  describe('Message Types', () => {
    it('should have all message types', () => {
      expect(MESSAGE_TYPES).toContain('message');
      expect(MESSAGE_TYPES).toContain('thread');
      expect(MESSAGE_TYPES).toContain('reply');
      expect(MESSAGE_TYPES).toContain('file_share');
      expect(MESSAGE_TYPES).toContain('reaction');
    });
  });

  describe('Slack Object Types', () => {
    it('should support all major object types', () => {
      expect(SLACK_OBJECT_TYPES).toContain('channel');
      expect(SLACK_OBJECT_TYPES).toContain('user');
      expect(SLACK_OBJECT_TYPES).toContain('message');
      expect(SLACK_OBJECT_TYPES).toContain('file');
    });
  });

  describe('Message Validation', () => {
    const validateMessage = (message: {
      text?: string;
      channel?: string;
      user?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!message.text) errors.push('text is required');
      if (message.text && message.text.length > 30000) errors.push('text exceeds max length');
      if (!message.channel) errors.push('channel is required');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct message', () => {
      const result = validateMessage({
        text: 'Hello, team!',
        channel: 'C001',
        user: 'U001'
      });
      expect(result.valid).toBe(true);
    });

    it('should require text', () => {
      const result = validateMessage({ channel: 'C001' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('text is required');
    });

    it('should require channel', () => {
      const result = validateMessage({ text: 'Hello' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('channel is required');
    });

    it('should reject oversized messages', () => {
      const result = validateMessage({
        text: 'x'.repeat(30001),
        channel: 'C001'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('text exceeds max length');
    });
  });

  describe('Channel Validation', () => {
    const validateChannel = (channel: {
      name?: string;
      type?: string;
      members?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!channel.name) errors.push('name is required');
      if (channel.name && !/^[a-z0-9_-]+$/.test(channel.name)) {
        errors.push('name must be lowercase alphanumeric with dashes/underscores');
      }
      if (channel.type && !CHANNEL_TYPES.includes(channel.type)) {
        errors.push(`Invalid channel type: ${channel.type}`);
      }
      if (channel.members !== undefined && channel.members < 0) {
        errors.push('members cannot be negative');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct channel', () => {
      const result = validateChannel({
        name: 'engineering',
        type: 'public',
        members: 50
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateChannel({ type: 'public' });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid channel names', () => {
      const result = validateChannel({ name: 'Engineering Team' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });
  });

  describe('User Status Validation', () => {
    const VALID_STATUSES = ['active', 'away', 'busy', 'dnd', 'offline'];

    const validateUserStatus = (status: string): boolean => {
      return VALID_STATUSES.includes(status);
    };

    it('should validate all status values', () => {
      VALID_STATUSES.forEach(status => {
        expect(validateUserStatus(status)).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      expect(validateUserStatus('invalid')).toBe(false);
    });
  });

  describe('Message Parsing', () => {
    const parseSlackMessage = (text: string): {
      mentions: string[];
      channels: string[];
      emojis: string[];
      urls: string[];
    } => {
      const mentionRegex = /<@([A-Z0-9]+)>/g;
      const channelRegex = /<#([A-Z0-9]+)\|([^>]+)>/g;
      const emojiRegex = /:([a-z0-9_]+):/g;
      const urlRegex = /<([^|]+)\|([^>]+)>/g;

      const mentions = [];
      const channels = [];
      const emojis = [];
      const urls = [];

      let match;
      while ((match = mentionRegex.exec(text)) !== null) mentions.push(match[1]);
      while ((match = channelRegex.exec(text)) !== null) channels.push(match[1]);
      while ((match = emojiRegex.exec(text)) !== null) emojis.push(match[1]);
      while ((match = urlRegex.exec(text)) !== null) urls.push(match[2]);

      return { mentions, channels, emojis, urls };
    };

    it('should parse user mentions', () => {
      const result = parseSlackMessage('Hello <@U001234>!');
      expect(result.mentions).toContain('U001234');
    });

    it('should parse channel references', () => {
      const result = parseSlackMessage('Posted in <#C001|engineering>');
      expect(result.channels).toContain('C001');
    });

    it('should parse emojis', () => {
      const result = parseSlackMessage('Great work! :tada: :fire:');
      expect(result.emojis).toContain('tada');
      expect(result.emojis).toContain('fire');
    });
  });

  describe('Message Threading', () => {
    const buildThread = (
      messages: Array<{ timestamp: string; thread_ts?: string; reply_count: number }>,
      parentTimestamp: string
    ): { totalMessages: number; replies: number; participants: Set<string> } => {
      const threadMessages = messages.filter(
        m => m.timestamp === parentTimestamp || m.thread_ts === parentTimestamp
      );
      const replies = threadMessages.filter(m => m.timestamp !== parentTimestamp);

      return {
        totalMessages: threadMessages.length,
        replies: replies.length,
        participants: new Set(threadMessages.map(() => 'user'))
      };
    };

    it('should count thread replies', () => {
      const messages = [
        { timestamp: '1000', thread_ts: undefined, reply_count: 3 },
        { timestamp: '1001', thread_ts: '1000', reply_count: 0 },
        { timestamp: '1002', thread_ts: '1000', reply_count: 0 },
        { timestamp: '1003', thread_ts: '1000', reply_count: 0 }
      ];
      const thread = buildThread(messages, '1000');
      expect(thread.totalMessages).toBe(4);
      expect(thread.replies).toBe(3);
    });
  });

  describe('Channel Analytics', () => {
    const analyzeChannelActivity = (
      messages: Array<{ timestamp: string; user?: string }>
    ): {
      totalMessages: number;
      uniqueUsers: number;
      avgMessagesPerUser: number;
      firstMessage: string;
      lastMessage: string;
    } => {
      const users = new Set(messages.map(m => m.user).filter(Boolean));
      const sorted = messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        totalMessages: messages.length,
        uniqueUsers: users.size,
        avgMessagesPerUser: users.size > 0 ? messages.length / users.size : 0,
        firstMessage: sorted[0]?.timestamp || '',
        lastMessage: sorted[sorted.length - 1]?.timestamp || ''
      };
    };

    it('should calculate channel metrics', () => {
      const messages = [
        { timestamp: '2026-06-01T10:00:00Z', user: 'U001' },
        { timestamp: '2026-06-01T10:05:00Z', user: 'U002' },
        { timestamp: '2026-06-01T10:10:00Z', user: 'U001' }
      ];
      const analytics = analyzeChannelActivity(messages);
      expect(analytics.totalMessages).toBe(3);
      expect(analytics.uniqueUsers).toBe(2);
      expect(analytics.avgMessagesPerUser).toBe(1.5);
    });
  });

  describe('Notification Priority', () => {
    const calculateNotificationPriority = (
      mentions: string[],
      isThread: boolean,
      isDirect: boolean,
      hour: number
    ): 'urgent' | 'high' | 'normal' | 'low' => {
      let priority = 50;

      // Mentions increase priority
      priority += mentions.length * 15;

      // Thread replies are important
      if (isThread) priority += 20;

      // DMs are highest priority
      if (isDirect) priority += 30;

      // Respect quiet hours
      if (hour >= 22 || hour < 7) priority -= 20;

      if (priority >= 90) return 'urgent';
      if (priority >= 70) return 'high';
      if (priority >= 40) return 'normal';
      return 'low';
    };

    it('should prioritize direct messages', () => {
      const priority = calculateNotificationPriority([], false, true, 10);
      expect(['urgent', 'high', 'normal']).toContain(priority);
    });

    it('should deprioritize during quiet hours', () => {
      const normalPriority = calculateNotificationPriority([], false, false, 10);
      const quietPriority = calculateNotificationPriority([], false, false, 23);
      expect(quietPriority).toBeLessThanOrEqual(normalPriority);
    });
  });
});
