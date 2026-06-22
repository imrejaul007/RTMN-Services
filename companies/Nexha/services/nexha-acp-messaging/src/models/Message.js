/**
 * ACP Message — a single message exchanged in a negotiation.
 *
 * Implements the 8 ACP message types from HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md:
 *   QUERY, QUOTE, COUNTER, ACCEPT, REJECT, ORDER, TRACK, DISPUTE
 *
 * Each message is immutable once persisted. Subsequent edits happen by
 * appending a new message to the same negotiation.
 *
 * Per ADR-0010 Phase 4 (2026-06-22): every message carries tenantId for
 * isolation. Cross-tenant reads require the internal-token path.
 */

import mongoose from 'mongoose';

export const MESSAGE_TYPES = [
  'QUERY',
  'QUOTE',
  'COUNTER',
  'ACCEPT',
  'REJECT',
  'ORDER',
  'TRACK',
  'DISPUTE',
];

/**
 * Allowed transitions per message type.
 * Used by the state machine in src/services/stateMachine.js to reject
 * illegal sequences (e.g. QUERY → ACCEPT directly without QUOTE).
 */
export const MESSAGE_NEXT_VALID = {
  QUERY:   ['QUOTE', 'REJECT'],
  QUOTE:   ['COUNTER', 'ACCEPT', 'REJECT'],
  COUNTER: ['COUNTER', 'ACCEPT', 'REJECT', 'QUOTE'],
  ACCEPT:  ['ORDER', 'REJECT'],   // ACCEPT is internal — caller then sends ORDER
  REJECT:  [],                    // terminal
  ORDER:   ['TRACK', 'DISPUTE'],
  TRACK:   ['TRACK', 'DISPUTE', 'ORDER'],
  DISPUTE: ['REJECT', 'ACCEPT', 'TRACK'],
};

export const TERMINAL_TYPES = new Set(['REJECT']);

const MessageSchema = new mongoose.Schema(
  {
    tenantId:      { type: String, required: true, index: true },
    negotiationId: { type: String, required: true, index: true },
    messageId:     { type: String, required: true },
    type:          { type: String, required: true, enum: MESSAGE_TYPES },
    sender:        { type: String, required: true },
    receiver:      { type: String, required: true },
    intent:        { type: String, default: '' },
    context:       { type: mongoose.Schema.Types.Mixed, default: {} },
    constraints:   { type: mongoose.Schema.Types.Mixed, default: undefined },
    timeline:      { type: mongoose.Schema.Types.Mixed, default: undefined },
    attachments:   { type: mongoose.Schema.Types.Mixed, default: undefined },
    payload:       { type: mongoose.Schema.Types.Mixed, default: {} },
    parentMessageId: { type: String, default: null, index: true },
    metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt:     { type: Date, default: Date.now, index: true },
  },
  { versionKey: false, minimize: false },
);

MessageSchema.index({ tenantId: 1, negotiationId: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, sender: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, messageId: 1 }, { unique: true });

export const Message = mongoose.model('AcpMessage', MessageSchema);
export default Message;