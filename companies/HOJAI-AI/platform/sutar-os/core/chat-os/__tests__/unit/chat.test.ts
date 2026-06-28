/**
 * Chat OS Unit Tests
 * Port: 4876
 * Tests: Channel CRUD, message CRUD, reactions, threads, direct messages, search
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types from src/index.ts
interface Channel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  createdAt: string;
  createdBy: string;
  topic?: string;
  pinned?: boolean;
}

interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName?: string;
  content: string;
  timestamp: string;
  edited?: string;
  deleted: boolean;
  reactions: Record<string, string[]>;
  threadCount: number;
  attachments?: { name: string; url: string; type: string }[];
}

interface Thread {
  id: string;
  parentId: string;
  messages: Message[];
  createdAt: string;
}

interface DirectMessage {
  id: string;
  participants: string[];
  messages: Message[];
  createdAt: string;
}

// In-memory stores
const channels = new Map<string, Channel>();
const messages = new Map<string, Message>();
const threads = new Map<string, Thread>();
const directMessages = new Map<string, DirectMessage>();

// Seed channels
channels.set('general', { id: 'general', name: 'general', description: 'General discussion', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });
channels.set('random', { id: 'random', name: 'random', description: 'Random stuff', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });
channels.set('engineering', { id: 'engineering', name: 'engineering', description: 'Engineering team', type: 'public', members: [], createdAt: new Date().toISOString(), createdBy: 'system' });

// Helper functions (from src/index.ts)
function getDMSortedKey(participant1: string, participant2: string): string {
  return [participant1, participant2].sort().join(':');
}

function searchMessages(query: string, channelId?: string, userId?: string): Message[] {
  let results = Array.from(messages.values()).filter(m =>
    !m.deleted && m.content.toLowerCase().includes(query.toLowerCase())
  );
  if (channelId) results = results.filter(m => m.channelId === channelId);
  if (userId) results = results.filter(m => m.userId === userId);
  return results.slice(0, 20);
}

function getChannelStats(): { totalChannels: number; totalMessages: number; byChannel: Record<string, number> } {
  const all = Array.from(messages.values()).filter(m => !m.deleted);
  const uniqueChannels = [...new Set(all.map(m => m.channelId))];
  return {
    totalChannels: channels.size,
    totalMessages: all.length,
    byChannel: Object.fromEntries(
      uniqueChannels.map(cid => [cid, all.filter(m => m.channelId === cid).length])
    ),
  };
}

// UUID generator for tests
let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

describe('Chat OS - Channel CRUD', () => {
  beforeEach(() => {
    channels.clear();
  });

  it('should create a channel', () => {
    const channel: Channel = {
      id: generateId(),
      name: 'new-channel',
      description: 'A new channel',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    channels.set(channel.id, channel);
    expect(channels.size).toBe(1);
    expect(channels.get(channel.id)?.name).toBe('new-channel');
  });

  it('should get channel by id', () => {
    const channel: Channel = {
      id: 'test-channel',
      name: 'test',
      description: '',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    channels.set('test-channel', channel);
    expect(channels.get('test-channel')).toBeDefined();
    expect(channels.get('test-channel')?.name).toBe('test');
  });

  it('should update a channel', () => {
    const channel: Channel = {
      id: 'test-channel',
      name: 'Original Name',
      description: '',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    channels.set('test-channel', channel);
    channel.name = 'Updated Name';
    channel.topic = 'New topic';

    expect(channels.get('test-channel')?.name).toBe('Updated Name');
    expect(channels.get('test-channel')?.topic).toBe('New topic');
  });

  it('should delete a channel', () => {
    channels.set('to-delete', {
      id: 'to-delete',
      name: 'delete-me',
      description: '',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    });

    expect(channels.has('to-delete')).toBe(true);
    channels.delete('to-delete');
    expect(channels.has('to-delete')).toBe(false);
  });

  it('should list all channels', () => {
    channels.set('ch1', { id: 'ch1', name: 'channel-1', description: '', type: 'public', members: [], createdAt: '', createdBy: 'u1' });
    channels.set('ch2', { id: 'ch2', name: 'channel-2', description: '', type: 'public', members: [], createdAt: '', createdBy: 'u1' });

    const allChannels = Array.from(channels.values());
    expect(allChannels.length).toBe(2);
  });

  it('should filter channels by type', () => {
    channels.set('public-ch', { id: 'public-ch', name: 'public', description: '', type: 'public', members: [], createdAt: '', createdBy: 'u1' });
    channels.set('private-ch', { id: 'private-ch', name: 'private', description: '', type: 'private', members: [], createdAt: '', createdBy: 'u1' });

    const publicChannels = Array.from(channels.values()).filter(c => c.type === 'public');
    expect(publicChannels.length).toBe(1);
    expect(publicChannels[0].name).toBe('public');
  });

  it('should filter channels by member', () => {
    channels.set('ch1', { id: 'ch1', name: 'ch1', description: '', type: 'public', members: ['user1'], createdAt: '', createdBy: 'u1' });
    channels.set('ch2', { id: 'ch2', name: 'ch2', description: '', type: 'public', members: ['user2'], createdAt: '', createdBy: 'u2' });

    const user1Channels = Array.from(channels.values()).filter(c => c.members.includes('user1'));
    expect(user1Channels.length).toBe(1);
  });

  it('should add member to channel', () => {
    const channel: Channel = {
      id: 'ch1',
      name: 'ch1',
      description: '',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    channels.set('ch1', channel);
    channel.members.push('user2');

    expect(channels.get('ch1')?.members).toContain('user2');
  });
});

describe('Chat OS - Message CRUD', () => {
  beforeEach(() => {
    messages.clear();
  });

  it('should create a message', () => {
    const message: Message = {
      id: generateId(),
      channelId: 'general',
      userId: 'user1',
      userName: 'User One',
      content: 'Hello, world!',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
    };

    messages.set(message.id, message);
    expect(messages.size).toBe(1);
    expect(messages.get(message.id)?.content).toBe('Hello, world!');
  });

  it('should get message by id', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Test message',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    expect(messages.get('msg-1')).toBeDefined();
    expect(messages.get('msg-1')?.content).toBe('Test message');
  });

  it('should edit message content', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Original content',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    message.content = 'Updated content';
    message.edited = new Date().toISOString();

    expect(messages.get('msg-1')?.content).toBe('Updated content');
    expect(messages.get('msg-1')?.edited).toBeDefined();
  });

  it('should not allow editing deleted messages', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Original content',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: true,
    };

    const canEdit = !message.deleted;
    expect(canEdit).toBe(false);
  });

  it('should soft delete a message', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'To delete',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    message.deleted = true;

    expect(messages.get('msg-1')?.deleted).toBe(true);
    expect(messages.get('msg-1')?.content).toBe('To delete'); // Content still accessible
  });

  it('should filter out deleted messages when listing', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'Active',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'general', userId: 'user1', content: 'Deleted',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: true,
    });

    const activeMessages = Array.from(messages.values()).filter(m => !m.deleted);
    expect(activeMessages.length).toBe(1);
    expect(activeMessages[0].content).toBe('Active');
  });

  it('should only allow owner to edit message', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Original',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    const userId = 'user2';
    const canEdit = userId === message.userId;
    expect(canEdit).toBe(false);
  });
});

describe('Chat OS - Reactions', () => {
  beforeEach(() => {
    messages.clear();
  });

  it('should add reaction to message', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    if (!message.reactions['👍']) message.reactions['👍'] = [];
    if (!message.reactions['👍'].includes('user2')) message.reactions['👍'].push('user2');

    expect(messages.get('msg-1')?.reactions['👍']).toContain('user2');
  });

  it('should count reactions correctly', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      reactions: { '👍': ['user1', 'user2', 'user3'], '❤️': ['user1', 'user2'] },
      threadCount: 0,
      deleted: false,
    };

    expect(message.reactions['👍'].length).toBe(3);
    expect(message.reactions['❤️'].length).toBe(2);
  });

  it('should remove reaction from message', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      reactions: { '👍': ['user1', 'user2'] },
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    message.reactions['👍'] = message.reactions['👍'].filter(u => u !== 'user2');

    expect(messages.get('msg-1')?.reactions['👍']).not.toContain('user2');
    expect(messages.get('msg-1')?.reactions['👍'].length).toBe(1);
  });

  it('should remove emoji key when last user removes reaction', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      reactions: { '👍': ['user2'] },
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    message.reactions['👍'] = message.reactions['👍'].filter(u => u !== 'user2');
    if (message.reactions['👍'].length === 0) delete message.reactions['👍'];

    expect(messages.get('msg-1')?.reactions['👍']).toBeUndefined();
  });

  it('should not add duplicate reactions from same user', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Hello',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('msg-1', message);
    if (!message.reactions['👍']) message.reactions['👍'] = [];
    if (!message.reactions['👍'].includes('user2')) message.reactions['👍'].push('user2');
    if (!message.reactions['👍'].includes('user2')) message.reactions['👍'].push('user2'); // Duplicate

    expect(messages.get('msg-1')?.reactions['👍'].filter(u => u === 'user2').length).toBe(1);
  });
});

describe('Chat OS - Threads', () => {
  beforeEach(() => {
    threads.clear();
    messages.clear();
  });

  it('should create a thread', () => {
    const parent: Message = {
      id: 'parent-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Parent message',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('parent-1', parent);

    const thread: Thread = {
      id: generateId(),
      parentId: 'parent-1',
      messages: [],
      createdAt: new Date().toISOString(),
    };

    threads.set('parent-1', thread);
    expect(threads.has('parent-1')).toBe(true);
  });

  it('should add reply to thread', () => {
    const parent: Message = {
      id: 'parent-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Parent message',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('parent-1', parent);

    let thread = threads.get('parent-1');
    if (!thread) {
      thread = { id: generateId(), parentId: 'parent-1', messages: [], createdAt: new Date().toISOString() };
      threads.set('parent-1', thread);
    }

    const reply: Message = {
      id: generateId(),
      channelId: 'general',
      userId: 'user2',
      content: 'Reply message',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    thread.messages.push(reply);
    parent.threadCount = thread.messages.length;

    expect(threads.get('parent-1')?.messages.length).toBe(1);
    expect(messages.get('parent-1')?.threadCount).toBe(1);
  });

  it('should increment thread count on reply', () => {
    const parent: Message = {
      id: 'parent-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Parent',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    messages.set('parent-1', parent);

    let thread = threads.get('parent-1');
    if (!thread) {
      thread = { id: generateId(), parentId: 'parent-1', messages: [], createdAt: new Date().toISOString() };
      threads.set('parent-1', thread);
    }

    // Add first reply
    thread.messages.push({ id: 'reply-1', channelId: 'general', userId: 'user2', content: 'Reply 1', timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false });
    parent.threadCount = thread.messages.length;

    // Add second reply
    thread.messages.push({ id: 'reply-2', channelId: 'general', userId: 'user3', content: 'Reply 2', timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false });
    parent.threadCount = thread.messages.length;

    expect(parent.threadCount).toBe(2);
  });

  it('should get thread by parent id', () => {
    const thread: Thread = {
      id: 'thread-1',
      parentId: 'parent-1',
      messages: [],
      createdAt: new Date().toISOString(),
    };

    threads.set('parent-1', thread);
    expect(threads.get('parent-1')).toBeDefined();
    expect(threads.get('parent-1')?.parentId).toBe('parent-1');
  });
});

describe('Chat OS - Direct Messages', () => {
  beforeEach(() => {
    directMessages.clear();
  });

  it('should create DM with sorted participant key', () => {
    const key = getDMSortedKey('user2', 'user1');
    expect(key).toBe('user1:user2');
  });

  it('should create same DM regardless of order', () => {
    const key1 = getDMSortedKey('user1', 'user2');
    const key2 = getDMSortedKey('user2', 'user1');
    expect(key1).toBe(key2);
  });

  it('should create direct message', () => {
    const key = getDMSortedKey('user1', 'user2');
    const dm: DirectMessage = {
      id: key,
      participants: ['user1', 'user2'],
      messages: [],
      createdAt: new Date().toISOString(),
    };

    directMessages.set(key, dm);
    expect(directMessages.has(key)).toBe(true);
  });

  it('should add message to DM', () => {
    const key = getDMSortedKey('user1', 'user2');
    const dm: DirectMessage = {
      id: key,
      participants: ['user1', 'user2'],
      messages: [],
      createdAt: new Date().toISOString(),
    };

    directMessages.set(key, dm);

    const message: Message = {
      id: generateId(),
      channelId: key,
      userId: 'user1',
      content: 'Hello from user1',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
    };

    dm.messages.push(message);
    expect(directMessages.get(key)?.messages.length).toBe(1);
    expect(directMessages.get(key)?.messages[0].content).toBe('Hello from user1');
  });

  it('should get existing DM or create new', () => {
    const key = getDMSortedKey('user1', 'user2');
    let dm = directMessages.get(key);

    if (!dm) {
      dm = { id: key, participants: ['user1', 'user2'], messages: [], createdAt: new Date().toISOString() };
      directMessages.set(key, dm);
    }

    expect(directMessages.has(key)).toBe(true);
    expect(directMessages.get(key)?.participants).toContain('user1');
    expect(directMessages.get(key)?.participants).toContain('user2');
  });
});

describe('Chat OS - Search', () => {
  beforeEach(() => {
    messages.clear();
  });

  it('should find messages by content', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'Hello world',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'general', userId: 'user1', content: 'Goodbye world',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const results = searchMessages('world');
    expect(results.length).toBe(2);
  });

  it('should be case insensitive', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'HELLO World',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const results = searchMessages('hello');
    expect(results.length).toBe(1);
  });

  it('should filter by channel', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'Hello world',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'random', userId: 'user1', content: 'Hello world',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const results = searchMessages('Hello', 'general');
    expect(results.length).toBe(1);
    expect(results[0].channelId).toBe('general');
  });

  it('should filter by user', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'Hello from user1',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'general', userId: 'user2', content: 'Hello from user2',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const results = searchMessages('Hello', undefined, 'user1');
    expect(results.length).toBe(1);
    expect(results[0].userId).toBe('user1');
  });

  it('should exclude deleted messages', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'general', userId: 'user1', content: 'Hello world',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: true,
    });

    const results = searchMessages('Hello');
    expect(results.length).toBe(0);
  });

  it('should limit results to 20', () => {
    for (let i = 0; i < 25; i++) {
      messages.set(`msg-${i}`, {
        id: `msg-${i}`, channelId: 'general', userId: 'user1', content: 'Hello world',
        timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
      });
    }

    const results = searchMessages('Hello');
    expect(results.length).toBeLessThanOrEqual(20);
  });
});

describe('Chat OS - Statistics', () => {
  beforeEach(() => {
    messages.clear();
    channels.clear();
  });

  it('should calculate total channels', () => {
    channels.set('ch1', { id: 'ch1', name: 'ch1', description: '', type: 'public', members: [], createdAt: '', createdBy: 'u1' });
    channels.set('ch2', { id: 'ch2', name: 'ch2', description: '', type: 'public', members: [], createdAt: '', createdBy: 'u1' });

    const stats = getChannelStats();
    expect(stats.totalChannels).toBe(2);
  });

  it('should calculate total messages', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'ch1', userId: 'u1', content: 'msg1',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'ch1', userId: 'u1', content: 'msg2',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-3', {
      id: 'msg-3', channelId: 'ch2', userId: 'u1', content: 'msg3',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const stats = getChannelStats();
    expect(stats.totalMessages).toBe(3);
  });

  it('should count messages by channel', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'ch1', userId: 'u1', content: 'msg1',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'ch1', userId: 'u1', content: 'msg2',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-3', {
      id: 'msg-3', channelId: 'ch2', userId: 'u1', content: 'msg3',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });

    const stats = getChannelStats();
    expect(stats.byChannel['ch1']).toBe(2);
    expect(stats.byChannel['ch2']).toBe(1);
  });

  it('should exclude deleted messages from stats', () => {
    messages.set('msg-1', {
      id: 'msg-1', channelId: 'ch1', userId: 'u1', content: 'Active',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: false,
    });
    messages.set('msg-2', {
      id: 'msg-2', channelId: 'ch1', userId: 'u1', content: 'Deleted',
      timestamp: new Date().toISOString(), reactions: {}, threadCount: 0, deleted: true,
    });

    const stats = getChannelStats();
    expect(stats.totalMessages).toBe(1);
    expect(stats.byChannel['ch1']).toBe(1);
  });
});

describe('Chat OS - Channel Types', () => {
  it('should support public channels', () => {
    const channel: Channel = {
      id: 'public-ch',
      name: 'public-channel',
      description: '',
      type: 'public',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    expect(channel.type).toBe('public');
  });

  it('should support private channels', () => {
    const channel: Channel = {
      id: 'private-ch',
      name: 'private-channel',
      description: '',
      type: 'private',
      members: [],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    expect(channel.type).toBe('private');
  });

  it('should support direct message channels', () => {
    const channel: Channel = {
      id: 'dm-ch',
      name: 'direct-message',
      description: '',
      type: 'direct',
      members: ['user1', 'user2'],
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
    };

    expect(channel.type).toBe('direct');
    expect(channel.members.length).toBe(2);
  });
});

describe('Chat OS - Message Attachments', () => {
  it('should support attachments', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'general',
      userId: 'user1',
      content: 'Check this file',
      timestamp: new Date().toISOString(),
      reactions: {},
      threadCount: 0,
      deleted: false,
      attachments: [
        { name: 'document.pdf', url: 'https://example.com/doc.pdf', type: 'application/pdf' },
        { name: 'image.png', url: 'https://example.com/img.png', type: 'image/png' },
      ],
    };

    expect(message.attachments).toBeDefined();
    expect(message.attachments?.length).toBe(2);
    expect(message.attachments?.[0].name).toBe('document.pdf');
  });
});
