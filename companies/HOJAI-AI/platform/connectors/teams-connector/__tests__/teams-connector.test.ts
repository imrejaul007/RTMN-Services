import { describe, it, expect } from 'vitest';

// Teams Connector Constants
const CHANNEL_TYPES = ['private', 'standard'];
const MESSAGE_TYPES = ['message', 'reply', 'systemEvent', 'typing'];

describe('Teams Connector', () => {
  describe('Channel Types', () => {
    it('should have all channel types', () => {
      expect(CHANNEL_TYPES).toContain('private');
      expect(CHANNEL_TYPES).toContain('standard');
    });
  });

  describe('Channel Validation', () => {
    const validateChannel = (channel: {
      displayName?: string;
      description?: string;
      membershipType?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!channel.displayName) errors.push('displayName is required');
      if (channel.displayName && channel.displayName.length > 200) errors.push('displayName too long');
      if (channel.membershipType && !CHANNEL_TYPES.includes(channel.membershipType)) {
        errors.push(`invalid membershipType: ${channel.membershipType}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct channel', () => {
      const result = validateChannel({
        displayName: 'Engineering',
        description: 'Engineering team discussions',
        membershipType: 'standard'
      });
      expect(result.valid).toBe(true);
    });

    it('should require displayName', () => {
      const result = validateChannel({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('displayName is required');
    });
  });

  describe('User Validation', () => {
    const validateUser = (user: {
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
      department?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!user.displayName) errors.push('displayName is required');
      if (!user.userPrincipalName) errors.push('userPrincipalName is required');
      if (user.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.mail)) {
        errors.push('invalid mail');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct user', () => {
      const result = validateUser({
        displayName: 'John Doe',
        mail: 'john@contoso.com',
        userPrincipalName: 'john@contoso.com',
        department: 'Engineering'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Message Validation', () => {
    const validateMessage = (msg: {
      channelId?: string;
      content?: string;
      from?: { id: string; name: string };
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!msg.channelId) errors.push('channelId is required');
      if (!msg.content) errors.push('content is required');
      if (msg.content && msg.content.length > 10000) errors.push('content too long');
      if (!msg.from) errors.push('from is required');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct message', () => {
      const result = validateMessage({
        channelId: 'ch_123',
        content: 'Hello team!',
        from: { id: 'user1', name: 'John' }
      });
      expect(result.valid).toBe(true);
    });

    it('should require content', () => {
      const result = validateMessage({ channelId: 'ch_123', from: { id: 'u1', name: 'J' } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content is required');
    });
  });

  describe('Message History', () => {
    const getChannelMessages = (
      messages: Array<{ channelId: string; timestamp: string; from: { id: string } }>,
      channelId: string,
      limit: number = 50
    ) => {
      return messages
        .filter(m => m.channelId === channelId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    };

    it('should get messages for specific channel', () => {
      const messages = [
        { channelId: 'ch_1', timestamp: '2026-06-20T10:00:00Z', from: { id: 'u1' } },
        { channelId: 'ch_2', timestamp: '2026-06-20T11:00:00Z', from: { id: 'u2' } },
        { channelId: 'ch_1', timestamp: '2026-06-20T12:00:00Z', from: { id: 'u3' } }
      ];
      const results = getChannelMessages(messages, 'ch_1');
      expect(results).toHaveLength(2);
      expect(results[0].timestamp).toBe('2026-06-20T12:00:00Z'); // Most recent first
    });

    it('should respect limit', () => {
      const messages = Array(100).fill(null).map((_, i) => ({
        channelId: 'ch_1',
        timestamp: new Date(2026, 5, 20, i).toISOString(),
        from: { id: 'u1' }
      }));
      const results = getChannelMessages(messages, 'ch_1', 10);
      expect(results).toHaveLength(10);
    });
  });

  describe('User Search', () => {
    const searchUsers = (
      users: Array<{ displayName: string; mail?: string; department?: string }>,
      query: string
    ) => {
      const q = query.toLowerCase();
      return users.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        u.mail?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    };

    it('should search by name', () => {
      const users = [
        { displayName: 'John Doe', mail: 'john@contoso.com' },
        { displayName: 'Jane Smith', mail: 'jane@contoso.com' }
      ];
      const results = searchUsers(users, 'John');
      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe('John Doe');
    });

    it('should search by department', () => {
      const users = [
        { displayName: 'Alice', department: 'Engineering' },
        { displayName: 'Bob', department: 'Sales' }
      ];
      const results = searchUsers(users, 'Engineering');
      expect(results).toHaveLength(1);
    });
  });

  describe('Activity Analysis', () => {
    const analyzeActivity = (
      messages: Array<{ from: { id: string }; timestamp: string; channelId: string }>,
      userId: string,
      days: number
    ) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const userMessages = messages.filter(m =>
        m.from.id === userId && new Date(m.timestamp) >= cutoff
      );

      const byChannel: Record<string, number> = {};
      userMessages.forEach(m => {
        byChannel[m.channelId] = (byChannel[m.channelId] || 0) + 1;
      });

      return {
        totalMessages: userMessages.length,
        channelsActive: Object.keys(byChannel).length,
        byChannel
      };
    };

    it('should analyze user activity', () => {
      const now = new Date();
      const messages = [
        { from: { id: 'u1' }, timestamp: new Date(now.getTime() - 86400000).toISOString(), channelId: 'ch_1' },
        { from: { id: 'u1' }, timestamp: new Date(now.getTime() - 86400000).toISOString(), channelId: 'ch_1' },
        { from: { id: 'u1' }, timestamp: new Date(now.getTime() - 86400000).toISOString(), channelId: 'ch_2' },
        { from: { id: 'u2' }, timestamp: new Date(now.getTime() - 86400000).toISOString(), channelId: 'ch_1' }
      ];
      const analysis = analyzeActivity(messages, 'u1', 7);
      expect(analysis.totalMessages).toBe(3);
      expect(analysis.channelsActive).toBe(2);
    });
  });

  describe('Message Parsing', () => {
    const parseMentions = (content: string): string[] => {
      const regex = /<at[^>]*>([^<]*)<\/at>/g;
      const mentions: string[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) mentions.push(match[1]);
      return mentions;
    };

    it('should parse @mentions', () => {
      const content = 'Hello <at>John Doe</at>, please review this.';
      const mentions = parseMentions(content);
      expect(mentions).toContain('John Doe');
    });
  });
});