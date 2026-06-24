/**
 * @hojai/whatsapp SDK — WhatsApp Business OS.
 *
 * Unified TypeScript client for the WhatsApp OS (port 4860) —
 * 360dialog / Twilio / Meta Cloud API provider switching,
 * template management, contact CRM, and messaging.
 *
 * @example
 * ```ts
 * import { WhatsApp } from '@hojai/whatsapp';
 *
 * const w = new WhatsApp({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Switch provider
 * await w.providers.switch('360dialog');
 *
 * // 2. Create + render a template
 * const tpl = await w.templates.create({
 *   name: 'order_shipped', language: 'en', category: 'utility',
 *   body: 'Hi {{1}}, your order {{2}} shipped!',
 *   variables: ['name', 'orderId']
 * });
 * const { rendered } = w.templates.render(tpl, { name: 'Maya', orderId: 'ORD-1' });
 *
 * // 3. Send
 * await w.messages.send({ to: '+919876543210', body: rendered });
 * ```
 */

export { WhatsApp } from './whatsapp.js';
export type {
  Provider, ProviderKind,
  Template, TemplateRenderResult,
  Contact, Message, Conversation
} from './types.js';
export type {
  CreateProviderRequest, CreateTemplateRequest, CreateContactRequest,
  SendMessageRequest
} from './whatsapp.js';
export { WHATSAPP_PORT } from './types.js';
