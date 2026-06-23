/**
 * TypeScript declarations for the ACP JS SDK.
 */

export interface AgentIdentity {
  agentId: string;
  tenantId: string;
}

export type AcpMessageType =
  | 'QUERY' | 'QUOTE' | 'COUNTER' | 'ACCEPT' | 'REJECT'
  | 'ORDER' | 'TRACK' | 'DISPUTE' | 'RESOLVE' | 'ESCALATE';

export interface AcpEnvelope<P = unknown> {
  messageId: string;
  type: AcpMessageType;
  from: AgentIdentity;
  to: AgentIdentity;
  threadId?: string;
  inReplyTo?: string;
  occurredAt: string;
  expiresAt?: string;
  payload: P;
}

export function signBody(body: object | string, secret: string): string;
export function verifySignature(body: object | string, signatureHeader: string, secret: string): boolean;

export function build<P = unknown>(opts: {
  type: AcpMessageType;
  from: AgentIdentity;
  to: AgentIdentity;
  payload: P;
  threadId?: string;
  inReplyTo?: string;
}): AcpEnvelope<P>;

export function validateTransition(from: AcpMessageType, to: AcpMessageType): boolean;

export function send(envelope: AcpEnvelope, opts: {
  endpoint: string;
  secret: string;
  fetcher?: typeof fetch;
}): Promise<any>;

export { signBody as sign };
export { verifySignature as verify };
