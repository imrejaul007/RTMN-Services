// IPC - Agent-to-agent message bus
// In-memory with optional file persistence

import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// In-memory message store
const messages = new Map(); // agentId → message[]
let messageLog = [];

// Load persisted messages on startup
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    messageLog = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    messageLog.forEach(msg => {
      const key = msg.to;
      if (!messages.has(key)) messages.set(key, []);
      messages.get(key).push(msg);
    });
  }
} catch {}

// Persist to disk periodically
function persist() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messageLog, null, 2));
  } catch {}
}

setInterval(persist, 5000);

/**
 * Send a message from one agent to another
 * @param {Object} params
 * @returns {Object} the created message
 */
export function sendMessage({ from, to, message, type = 'text' }) {
  const msg = {
    id: uuidv4(),
    from,
    to,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };

  if (!messages.has(to)) messages.set(to, []);
  messages.get(to).push(msg);
  messageLog.push(msg);
  persist();
  return msg;
}

/**
 * Receive (and mark as read) messages for an agent
 * @param {string} agentId
 * @returns {Object[]}
 */
export function receiveMessages(agentId) {
  const msgs = messages.get(agentId) || [];
  msgs.forEach(m => { m.read = true; });
  messages.set(agentId, []);
  return msgs;
}

/**
 * Peek at messages without marking as read
 * @param {string} agentId
 * @returns {Object[]}
 */
export function peekMessages(agentId) {
  return messages.get(agentId) || [];
}

/**
 * Get all conversations for an agent (unique senders)
 * @param {string} agentId
 * @returns {Object[]}
 */
export function getConversations(agentId) {
  const sent = messageLog.filter(m => m.from === agentId);
  const received = messageLog.filter(m => m.to === agentId);
  const counterparties = new Set([
    ...sent.map(m => m.to),
    ...received.map(m => m.from),
  ]);
  return Array.from(counterparties).map(cp => {
    const lastMsg = [...sent, ...received]
      .filter(m => m.from === cp || m.to === cp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .pop();
    return {
      agentId: cp,
      lastMessage: lastMsg?.message,
      lastTimestamp: lastMsg?.timestamp,
      unread: received.filter(m => m.from === cp && !m.read).length,
    };
  });
}

/**
 * Get total message count
 * @returns {number}
 */
export function getMessageCount() {
  return messageLog.length;
}

/**
 * Clear all messages
 */
export function clearMessages() {
  messages.clear();
  messageLog = [];
  persist();
}