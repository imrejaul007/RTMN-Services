// IPC - Agent-to-agent message bus
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

const messages = new Map();
let messageLog = [];

try { if (fs.existsSync(MESSAGES_FILE)) { messageLog = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8')); messageLog.forEach(msg => { const key = msg.to; if (!messages.has(key)) messages.set(key, []); messages.get(key).push(msg); }); } } catch {}

function persist() { try { fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messageLog, null, 2)); } catch {} }
setInterval(persist, 5000);

export function sendMessage({ from, to, message, type = 'text' }) {
  const msg = { id: uuidv4(), from, to, message, type, timestamp: new Date().toISOString(), read: false };
  if (!messages.has(to)) messages.set(to, []);
  messages.get(to).push(msg);
  messageLog.push(msg);
  persist();
  return msg;
}

export function receiveMessages(agentId) {
  const msgs = messages.get(agentId) || [];
  msgs.forEach(m => { m.read = true; });
  messages.set(agentId, []);
  return msgs;
}

export function peekMessages(agentId) { return messages.get(agentId) || []; }

export function getConversations(agentId) {
  const sent = messageLog.filter(m => m.from === agentId);
  const received = messageLog.filter(m => m.to === agentId);
  const counterparties = new Set([...sent.map(m => m.to), ...received.map(m => m.from)]);
  return Array.from(counterparties).map(cp => {
    const all = [...sent, ...received].filter(m => m.from === cp || m.to === cp);
    const sorted = all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const lastMsg = sorted[sorted.length - 1];
    return { agentId: cp, lastMessage: lastMsg?.message, lastTimestamp: lastMsg?.timestamp, unread: received.filter(m => m.from === cp && !m.read).length };
  });
}

export function getMessageCount() { return messageLog.length; }
export function clearMessages() { messages.clear(); messageLog = []; persist(); }
