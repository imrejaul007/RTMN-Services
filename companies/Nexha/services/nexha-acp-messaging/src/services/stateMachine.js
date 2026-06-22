/**
 * ACP State Machine — validates transitions between message types.
 *
 * Rules (from HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md):
 *   - QUERY   → QUOTE | REJECT
 *   - QUOTE   → COUNTER | ACCEPT | REJECT
 *   - COUNTER → COUNTER | ACCEPT | REJECT
 *   - ACCEPT  → ORDER | REJECT  (caller then sends ORDER)
 *   - REJECT  → (terminal)
 *   - ORDER   → TRACK | DISPUTE
 *   - TRACK   → TRACK | DISPUTE
 *   - DISPUTE → TRACK | ACCEPT (resolved in merchant's favor)
 *
 * Phase 4 (ADR-0010, 2026-06-22) adds per-tenant isolation.
 */

import { randomUUID } from 'node:crypto';
import { MESSAGE_TYPES, MESSAGE_NEXT_VALID, TERMINAL_TYPES, Message } from '../models/Message.js';
import { Negotiation, NEGOTIATION_STATUS } from '../models/Negotiation.js';

export class StateTransitionError extends Error {
  constructor(message, from, to) {
    super(message);
    this.name = 'StateTransitionError';
    this.status = 422;
    this.code = 'ACP_INVALID_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

export class ValidationError extends Error {
  constructor(message, issues) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = 'ACP_VALIDATION_ERROR';
    this.issues = issues;
  }
}

export function isTerminal(type) {
  return TERMINAL_TYPES.has(type);
}

export function isValidTransition(from, to) {
  if (from === null) return to === 'QUERY';
  return (MESSAGE_NEXT_VALID[from] || []).includes(to);
}

export function validateMessageBody(type, body) {
  if (!MESSAGE_TYPES.includes(type)) {
    throw new ValidationError(`Unknown message type: ${type}`, { allowedTypes: MESSAGE_TYPES });
  }
  const cleaned = { ...body };

  for (const field of ['sender', 'receiver']) {
    if (typeof cleaned[field] !== 'string' || !cleaned[field]) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }

  switch (type) {
    case 'QUERY':
      if (typeof cleaned.intent !== 'string' || !cleaned.intent) {
        throw new ValidationError('QUERY requires intent (string)');
      }
      if (cleaned.context !== undefined && (typeof cleaned.context !== 'object' || cleaned.context === null || Array.isArray(cleaned.context))) {
        throw new ValidationError('context must be an object');
      }
      break;
    case 'QUOTE':
    case 'COUNTER':
      if (!cleaned.payload || typeof cleaned.payload !== 'object') {
        throw new ValidationError(`${type} requires payload (object) with pricing/terms`);
      }
      break;
    case 'ACCEPT':
    case 'REJECT':
      if (cleaned.payload !== undefined && (typeof cleaned.payload !== 'object' || cleaned.payload === null)) {
        throw new ValidationError(`${type} payload must be an object`);
      }
      break;
    case 'ORDER':
      if (!cleaned.payload || typeof cleaned.payload !== 'object') {
        throw new ValidationError('ORDER requires payload (object) with order details');
      }
      break;
    case 'TRACK':
      if (cleaned.payload !== undefined && (typeof cleaned.payload !== 'object' || cleaned.payload === null)) {
        throw new ValidationError('TRACK payload must be an object');
      }
      break;
    case 'DISPUTE':
      if (!cleaned.payload || typeof cleaned.payload !== 'object' || !('reason' in cleaned.payload)) {
        throw new ValidationError('DISPUTE requires payload.reason (string)');
      }
      break;
  }
  return cleaned;
}

function computeStatus(currentStatus, messageType) {
  if (messageType === 'REJECT') return { status: 'REJECTED', completedAt: new Date() };
  if (messageType === 'DISPUTE') return { status: 'DISPUTED', completedAt: null };
  if (messageType === 'ORDER' && currentStatus === 'ACCEPTED') {
    return { status: 'COMPLETED', completedAt: new Date() };
  }
  // ORDER is "terminal-ish" — once we reach COMPLETED, stay there even if more TRACK messages arrive.
  if (currentStatus === 'COMPLETED') return { status: 'COMPLETED', completedAt: currentStatus === 'COMPLETED' ? new Date() : null };
  if (messageType === 'ACCEPT') return { status: 'ACCEPTED', completedAt: null };
  if (currentStatus === 'EXPIRED') return { status: 'EXPIRED', completedAt: null };
  return { status: 'ACTIVE', completedAt: null };
}

export async function appendMessage(tenantId, negotiationId, messageBody) {
  if (!tenantId) throw new ValidationError('tenantId is required');
  const type = messageBody.type;
  const cleaned = validateMessageBody(type, messageBody);

  let negotiation;
  let created = false;
  if (negotiationId) {
    negotiation = await Negotiation.findOne({ tenantId, negotiationId });
    if (!negotiation) {
      throw new ValidationError(`Negotiation not found: ${negotiationId}`);
    }
  } else {
    if (type !== 'QUERY') {
      throw new StateTransitionError(
        `Cannot start a negotiation with ${type}; first message must be QUERY`,
        null,
        type,
      );
    }
    negotiation = await Negotiation.create({
      tenantId,
      negotiationId: randomUUID(),
      initiator: cleaned.sender,
      responder: cleaned.receiver,
      intent: cleaned.intent,
      context: cleaned.context || {},
      status: 'ACTIVE',
      currentType: null,
      messageCount: 0,
      metadata: cleaned.metadata || {},
    });
    created = true;
    negotiationId = negotiation.negotiationId;
  }

  if (!isValidTransition(negotiation.currentType, type)) {
    throw new StateTransitionError(
      `Invalid transition: ${negotiation.currentType ?? '<start>'} → ${type}`,
      negotiation.currentType,
      type,
    );
  }

  if (negotiation.status === 'REJECTED') {
    throw new StateTransitionError(
      `Negotiation is REJECTED; no further messages accepted`,
      negotiation.currentType,
      type,
    );
  }

  const messageDoc = {
    tenantId,
    negotiationId: negotiation.negotiationId,
    messageId: cleaned.messageId || randomUUID(),
    type,
    sender: cleaned.sender,
    receiver: cleaned.receiver,
    intent: cleaned.intent || negotiation.intent,
    context: cleaned.context || negotiation.context,
    constraints: cleaned.constraints,
    timeline: cleaned.timeline,
    attachments: cleaned.attachments,
    payload: cleaned.payload || {},
    parentMessageId: cleaned.parentMessageId || null,
    metadata: cleaned.metadata || {},
  };
  const message = await Message.create(messageDoc);

  const { status, completedAt } = computeStatus(negotiation.status, type);
  negotiation.currentType = type;
  negotiation.messageCount = negotiation.messageCount + 1;
  negotiation.lastActivityAt = new Date();
  negotiation.status = status;
  if (completedAt) negotiation.completedAt = completedAt;
  await negotiation.save();

  return { negotiation: negotiation.toObject(), message: message.toObject(), created };
}

export async function listMessages(tenantId, negotiationId) {
  if (!tenantId) throw new ValidationError('tenantId is required');
  const docs = await Message.find({ tenantId, negotiationId }).sort({ createdAt: 1 });
  return docs.map((d) => d.toObject());
}

export async function listNegotiations(tenantId, filters = {}) {
  if (!tenantId) throw new ValidationError('tenantId is required');
  const q = { tenantId };
  if (filters.status) q.status = filters.status;
  if (filters.agent) {
    q.$or = [{ initiator: filters.agent }, { responder: filters.agent }];
  }
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const docs = await Negotiation.find(q).sort({ lastActivityAt: -1 }).limit(limit);
  return docs.map((d) => d.toObject());
}

export async function getNegotiation(tenantId, negotiationId) {
  if (!tenantId) throw new ValidationError('tenantId is required');
  const doc = await Negotiation.findOne({ tenantId, negotiationId });
  return doc ? doc.toObject() : null;
}

export async function getStats(tenantId) {
  if (!tenantId) throw new ValidationError('tenantId is required');
  const [negCount, msgCount, byStatusAgg, byTypeAgg] = await Promise.all([
    Negotiation.countDocuments({ tenantId }),
    Message.countDocuments({ tenantId }),
    Negotiation.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Message.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$type', n: { $sum: 1 } } },
    ]),
  ]);
  const byStatus = {};
  for (const row of byStatusAgg) byStatus[row._id] = row.n;
  const byType = {};
  for (const row of byTypeAgg) byType[row._id] = row.n;
  return { negotiations: negCount, messages: msgCount, byStatus, byType };
}

export { NEGOTIATION_STATUS, MESSAGE_TYPES, MESSAGE_NEXT_VALID };