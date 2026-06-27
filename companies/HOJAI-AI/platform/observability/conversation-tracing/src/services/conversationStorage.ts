/**
 * Conversation Tracing - Storage Service
 * Persistent storage for conversations and messages
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  Conversation,
  Message,
  Participant,
  ListConversationsRequest,
  ListConversationsResponse,
  ConversationStatus,
} from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', '..', 'data');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

const CONVERSATIONS_FILE = join(DATA_DIR, 'conversations.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// Storage structures
interface ConversationsData {
  conversations: Record<string, ConversationSummary>;
  metadata: {
    totalConversations: number;
    lastUpdated: number;
  };
}

interface ConversationSummary {
  id: string;
  title?: string;
  participantIds: string[];
  startTime: number;
  endTime?: number;
  status: ConversationStatus;
  messageCount: number;
  lastMessageAt?: number;
  metadata: {
    source: string;
    channel?: string;
    industryVertical?: string;
    useCase?: string;
    tags?: string[];
  };
}

interface MessagesData {
  messages: Record<string, Record<string, Message>>; // conversationId -> messageId -> Message
  metadata: {
    totalMessages: number;
    lastUpdated: number;
  };
}

// Load data from file
function loadConversationsData(): ConversationsData {
  ensureDataDir();
  if (!existsSync(CONVERSATIONS_FILE)) {
    return { conversations: {}, metadata: { totalConversations: 0, lastUpdated: Date.now() } };
  }
  try {
    const content = readFileSync(CONVERSATIONS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { conversations: {}, metadata: { totalConversations: 0, lastUpdated: Date.now() } };
  }
}

function saveConversationsData(data: ConversationsData): void {
  ensureDataDir();
  const tmpFile = CONVERSATIONS_FILE + '.tmp';
  writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  const { renameSync } = require('fs');
  renameSync(tmpFile, CONVERSATIONS_FILE);
}

function loadMessagesData(): MessagesData {
  ensureDataDir();
  if (!existsSync(MESSAGES_FILE)) {
    return { messages: {}, metadata: { totalMessages: 0, lastUpdated: Date.now() } };
  }
  try {
    const content = readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { messages: {}, metadata: { totalMessages: 0, lastUpdated: Date.now() } };
  }
}

function saveMessagesData(data: MessagesData): void {
  ensureDataDir();
  const tmpFile = MESSAGES_FILE + '.tmp';
  writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  const { renameSync } = require('fs');
  renameSync(tmpFile, MESSAGES_FILE);
}

// In-memory cache
let conversationsCache: ConversationsData | null = null;
let messagesCache: MessagesData | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

function getConversationsData(): ConversationsData {
  const now = Date.now();
  if (!conversationsCache || now - cacheTime > CACHE_TTL) {
    conversationsCache = loadConversationsData();
    cacheTime = now;
  }
  return conversationsCache;
}

function getMessagesData(): MessagesData {
  const now = Date.now();
  if (!messagesCache || now - cacheTime > CACHE_TTL) {
    messagesCache = loadMessagesData();
    cacheTime = now;
  }
  return messagesCache;
}

function invalidateCache(): void {
  cacheTime = 0;
}

// Conversation Storage Implementation
export class ConversationStorageService {
  private conversationsData: ConversationsData;
  private messagesData: MessagesData;

  constructor() {
    this.conversationsData = getConversationsData();
    this.messagesData = getMessagesData();
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    const summary: ConversationSummary = {
      id: conversation.id,
      title: conversation.title,
      participantIds: conversation.participants.map(p => p.id),
      startTime: conversation.startTime,
      endTime: conversation.endTime,
      status: conversation.status,
      messageCount: conversation.messages.size,
      lastMessageAt: conversation.messages.size > 0
        ? Math.max(...Array.from(conversation.messages.values()).map(m => m.timestamp))
        : undefined,
      metadata: {
        source: conversation.metadata.source,
        channel: conversation.metadata.channel,
        industryVertical: conversation.metadata.industryVertical,
        useCase: conversation.metadata.useCase,
        tags: conversation.metadata.tags,
      },
    };

    this.conversationsData.conversations[conversation.id] = summary;
    this.conversationsData.metadata.totalConversations++;
    this.conversationsData.metadata.lastUpdated = Date.now();

    // Save messages
    if (!this.messagesData.messages[conversation.id]) {
      this.messagesData.messages[conversation.id] = {};
    }

    for (const [msgId, msg] of conversation.messages.entries()) {
      this.messagesData.messages[conversation.id][msgId] = msg;
      this.messagesData.metadata.totalMessages++;
    }

    saveConversationsData(this.conversationsData);
    saveMessagesData(this.messagesData);
    invalidateCache();
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const summary = this.conversationsData.conversations[conversationId];
    if (!summary) return null;

    const messagesMap = this.messagesData.messages[conversationId] || {};
    const messages = new Map<string, Message>();
    for (const [msgId, msg] of Object.entries(messagesMap)) {
      messages.set(msgId, msg);
    }

    // Reconstruct participants (simplified - in production would store full participant info)
    const participants: Participant[] = summary.participantIds.map(id => ({
      id,
      type: 'agent',
      name: id,
    }));

    return {
      id: summary.id,
      title: summary.title,
      participants,
      messages,
      startTime: summary.startTime,
      endTime: summary.endTime,
      status: summary.status,
      metadata: {
        source: summary.metadata.source as any,
        channel: summary.metadata.channel,
        industryVertical: summary.metadata.industryVertical,
        useCase: summary.metadata.useCase,
        tags: summary.metadata.tags || [],
      },
    };
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!this.conversationsData.conversations[conversationId]) {
      return false;
    }

    delete this.conversationsData.conversations[conversationId];
    delete this.messagesData.messages[conversationId];
    this.conversationsData.metadata.lastUpdated = Date.now();

    saveConversationsData(this.conversationsData);
    saveMessagesData(this.messagesData);
    invalidateCache();

    return true;
  }

  async listConversations(query: ListConversationsRequest): Promise<ListConversationsResponse> {
    let conversations = Object.values(this.conversationsData.conversations);

    // Apply filters
    if (query.status) {
      conversations = conversations.filter(c => c.status === query.status);
    }
    if (query.participantId) {
      conversations = conversations.filter(c => c.participantIds.includes(query.participantId!));
    }
    if (query.source) {
      conversations = conversations.filter(c => c.metadata.source === query.source);
    }
    if (query.startTime) {
      conversations = conversations.filter(c => c.startTime >= query.startTime!);
    }
    if (query.endTime) {
      conversations = conversations.filter(c => c.startTime <= query.endTime!);
    }
    if (query.searchQuery) {
      const q = query.searchQuery.toLowerCase();
      conversations = conversations.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.metadata.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    const total = conversations.length;

    // Sort
    const sortBy = query.sortBy || 'startTime';
    const sortOrder = query.sortOrder || 'desc';
    conversations.sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

      if (sortBy === 'startTime') {
        aVal = a.startTime;
        bVal = b.startTime;
      } else if (sortBy === 'endTime') {
        aVal = a.endTime;
        bVal = b.endTime;
      } else if (sortBy === 'messageCount') {
        aVal = a.messageCount;
        bVal = b.messageCount;
      }

      if (aVal === undefined || bVal === undefined) return 0;
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const paginatedConversations = conversations.slice(offset, offset + limit);

    return {
      conversations: paginatedConversations.map(c => ({
        id: c.id,
        title: c.title,
        participantCount: c.participantIds.length,
        messageCount: c.messageCount,
        startTime: c.startTime,
        endTime: c.endTime,
        status: c.status,
        lastMessageAt: c.lastMessageAt,
      })),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async addMessage(message: Message): Promise<void> {
    if (!this.messagesData.messages[message.conversationId]) {
      this.messagesData.messages[message.conversationId] = {};
    }

    this.messagesData.messages[message.conversationId][message.id] = message;
    this.messagesData.metadata.totalMessages++;
    this.messagesData.metadata.lastUpdated = Date.now();

    // Update conversation summary
    const summary = this.conversationsData.conversations[message.conversationId];
    if (summary) {
      summary.messageCount++;
      summary.lastMessageAt = message.timestamp;
      if (!summary.endTime && summary.status === 'active') {
        summary.endTime = message.timestamp;
      }
    }

    saveMessagesData(this.messagesData);
    saveConversationsData(this.conversationsData);
    invalidateCache();
  }

  async getMessages(conversationId: string, limit = 100, offset = 0): Promise<Message[]> {
    const messagesMap = this.messagesData.messages[conversationId] || {};
    const messages = Object.values(messagesMap)
      .sort((a, b) => a.timestamp - b.timestamp);

    return messages.slice(offset, offset + limit);
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    const summary = this.conversationsData.conversations[conversationId];
    if (!summary) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    if (updates.title !== undefined) summary.title = updates.title;
    if (updates.endTime !== undefined) summary.endTime = updates.endTime;
    if (updates.status !== undefined) summary.status = updates.status;
    if (updates.metadata) {
      summary.metadata = { ...summary.metadata, ...updates.metadata };
    }

    this.conversationsData.metadata.lastUpdated = Date.now();
    saveConversationsData(this.conversationsData);
    invalidateCache();
  }

  async getConversationCount(status?: ConversationStatus): Promise<number> {
    if (status) {
      return Object.values(this.conversationsData.conversations)
        .filter(c => c.status === status).length;
    }
    return Object.keys(this.conversationsData.conversations).length;
  }

  async getMessageCount(conversationId?: string): Promise<number> {
    if (conversationId) {
      const messages = this.messagesData.messages[conversationId];
      return messages ? Object.keys(messages).length : 0;
    }
    return this.messagesData.metadata.totalMessages;
  }
}

// Singleton instance
let instance: ConversationStorageService | null = null;

export function getConversationStorageService(): ConversationStorageService {
  if (!instance) {
    instance = new ConversationStorageService();
  }
  return instance;
}