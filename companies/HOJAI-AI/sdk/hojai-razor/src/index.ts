/**
 * @hojai/razor SDK — RAZO Keyboard Communication OS.
 *
 * 4 sub-clients, ~40 methods total:
 *   intents    — Intent router: detect, parse, validate, execute
 *   messages   — Send/schedule/broadcast across WhatsApp, SMS, email, etc.
 *   channels   — Manage connectivity + per-channel send helpers
 *   sessions   — Multi-turn conversation sessions with accumulated context
 *
 * @example
 * ```ts
 * import { Razor } from '@hojai/razor';
 *
 * const razor = new Razor({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. One-call: user says something, the right agent executes it
 * const result = await razor.intents.handleText('Order a pizza from Dominoes', 'u-1');
 * console.log(result.intent.name, result.executed?.status);
 *
 * // 2. Send a WhatsApp message
 * await razor.messages.send({ channelId: 'ch-wa-1', to: '+919876543210', body: 'Hi from HOJAI!' });
 *
 * // 3. Track a conversation session across turns
 * const session = await razor.sessions.create({ userId: 'u-1', channelId: 'ch-1' });
 * await razor.sessions.sendMessage(session.id, { body: 'I want to book a flight to Delhi' });
 * await razor.sessions.sendMessage(session.id, { body: 'For next Friday' });
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { IntentRouterClient, type DetectIntentRequest, type ExecuteIntentRequest } from './intents.js';
import { MessagesClient, type SendMessageRequest, type ScheduleMessageRequest, type BroadcastRequest } from './messages.js';
import { ChannelsClient, type CreateChannelRequest } from './channels.js';
import { SessionsClient, type CreateSessionRequest, type UpdateContextRequest } from './sessions.js';
import { RAZOR_PORT, type IntentDomain, type DetectedIntent, type ParsedIntent, type Message, type MessageTemplate, type Channel, type ChannelKind, type ConversationSession, type BroadcastResult, type IntentEntity } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { IntentRouterClient, type DetectIntentRequest, type ExecuteIntentRequest } from './intents.js';
export { MessagesClient, type SendMessageRequest, type ScheduleMessageRequest, type BroadcastRequest } from './messages.js';
export { ChannelsClient, type CreateChannelRequest } from './channels.js';
export { SessionsClient, type CreateSessionRequest, type UpdateContextRequest } from './sessions.js';
export { RAZOR_PORT, type IntentDomain, type DetectedIntent, type ParsedIntent, type Message, type MessageTemplate, type Channel, type ChannelKind, type ConversationSession, type BroadcastResult, type IntentEntity } from './types.js';

/**
 * Main RAZO Keyboard client (facade).
 *
 * 4 sub-clients: intents, messages, channels, sessions.
 */
export class Razor {
  public readonly intents: IntentRouterClient;
  public readonly messages: MessagesClient;
  public readonly channels: ChannelsClient;
  public readonly sessions: SessionsClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.intents = new IntentRouterClient(resolved);
    this.messages = new MessagesClient(resolved);
    this.channels = new ChannelsClient(resolved);
    this.sessions = new SessionsClient(resolved);
  }
}

export default Razor;
