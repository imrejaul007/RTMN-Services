/**
 * WhatsApp OS — unified client.
 *
 * 4 sub-clients, ~25 methods:
 *   providers — switch between 360dialog / Twilio / Meta Cloud API
 *   templates — manage WhatsApp message templates + render
 *   contacts  — CRM for phone contacts
 *   messages  — send + conversations
 *
 * @example
 * ```ts
 * import { WhatsApp } from '@hojai/whatsapp';
 *
 * const w = new WhatsApp({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. List available providers
 * const providers = await w.providers.list();
 *
 * // 2. Switch active provider
 * await w.providers.switch('360dialog');
 *
 * // 3. Create a template
 * const tpl = await w.templates.create({
 *   name: 'order_shipped', language: 'en', category: 'utility',
 *   body: 'Hi {{1}}, your order {{2}} has shipped!',
 *   variables: ['name', 'orderId']
 * });
 *
 * // 4. Render + send
 * const rendered = w.templates.render(tpl, { name: 'Maya', orderId: 'ORD-1' });
 * await w.messages.send({
 *   to: '+919876543210', body: rendered.rendered, templateId: tpl.id
 * });
 *
 * // 5. Get conversation history
 * const conv = await w.messages.getConversation('+919876543210');
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Provider, ProviderKind, Template, TemplateRenderResult, Contact, Message, Conversation } from './types.js';

// ─── Providers ────────────────────────────────────────────────

export interface CreateProviderRequest {
  kind: ProviderKind;
  name: string;
  /** Provider-specific credentials (apiKey, accountSid, etc.) */
  credentials: Record<string, string>;
  webhookUrl?: string;
}

export class ProvidersClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4860` }; }

  async list(): Promise<Provider[]> {
    return request<Provider[]>(this.config, 'GET', '/api/providers');
  }

  async create(input: CreateProviderRequest): Promise<Provider> {
    return request<Provider>(this.config, 'POST', '/api/providers/switch', input);
  }

  async switch(providerId: string): Promise<{ switched: boolean; current: string }> {
    return request(this.config, 'POST', '/api/providers/switch', { providerId });
  }
}

// ─── Templates ──────────────────────────────────────────────────

export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: Template['category'];
  body: string;
  variables: string[];
}

export class TemplatesClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4860` }; }

  async list(input: { category?: Template['category']; status?: Template['status'] } = {}): Promise<Template[]> {
    return request<Template[]>(this.config, 'GET', `/api/templates${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(id: string): Promise<Template> {
    return request<Template>(this.config, 'GET', `/api/templates/${encodeURIComponent(id)}`);
  }

  async create(input: CreateTemplateRequest): Promise<Template> {
    return request<Template>(this.config, 'POST', '/api/templates', input);
  }

  /** Render a template by substituting {{1}}, {{2}}, ... placeholders. */
  render(tpl: Template, variables: Record<string, string>): TemplateRenderResult {
    const resolved: Record<string, string> = {};
    for (const key of tpl.variables) {
      if (variables[key] !== undefined) resolved[key] = variables[key];
    }
    const rendered = tpl.body.replace(/\{\{\s*(\d+|[A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_match, name) => {
      if (/^\d+$/.test(name)) {
        // numeric {{1}} → lookup by index
        const idx = Number(name) - 1;
        const key = tpl.variables[idx];
        return key && resolved[key] != null ? resolved[key] : '';
      }
      return resolved[name] != null ? resolved[name] : '';
    });
    return { rendered, resolved };
  }

  async renderAndSend(templateId: string, variables: Record<string, string>, send: { to: string }): Promise<Message> {
    const tpl = await this.get(templateId);
    const { rendered } = this.render(tpl, variables);
    return request<Message>(this.config, 'POST', '/api/templates/' + encodeURIComponent(templateId) + '/render',
      { to: send.to, body: rendered, variables });
  }
}

// ─── Contacts ──────────────────────────────────────────────────

export interface CreateContactRequest {
  phone: string;
  name?: string;
  tags?: string[];
  fields?: Record<string, string>;
}

export class ContactsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4860` }; }

  async list(input: { tag?: string; limit?: number } = {}): Promise<Contact[]> {
    return request<Contact[]>(this.config, 'GET', `/api/contacts${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(id: string): Promise<Contact> {
    return request<Contact>(this.config, 'GET', `/api/contacts/${encodeURIComponent(id)}`);
  }

  async create(input: CreateContactRequest): Promise<Contact> {
    return request<Contact>(this.config, 'POST', '/api/contacts', input);
  }

  async update(id: string, patch: Partial<CreateContactRequest>): Promise<Contact> {
    return request<Contact>(this.config, 'PUT', `/api/contacts/${encodeURIComponent(id)}`, patch);
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/contacts/${encodeURIComponent(id)}`);
  }
}

// ─── Messages + conversations ──────────────────────────────────

export interface SendMessageRequest {
  to: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export class MessagesClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4860` }; }

  async send(input: SendMessageRequest): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/messages/send', input);
  }

  async list(input: { status?: Message['status']; to?: string; limit?: number } = {}): Promise<Message[]> {
    return request<Message[]>(this.config, 'GET', `/api/messages${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  /** Get a conversation by phone number. */
  async getConversation(phone: string): Promise<Conversation> {
    return request<Conversation>(this.config, 'GET', `/api/conversations/${encodeURIComponent(phone)}`);
  }

  async listConversations(): Promise<Conversation[]> {
    return request<Conversation[]>(this.config, 'GET', '/api/conversations');
  }

  /** Simulate an incoming webhook (for testing). */
  async simulateWebhook(payload: { from: string; body: string }): Promise<{ received: boolean }> {
    return request(this.config, 'POST', '/api/webhook/simulate', payload);
  }
}

// ─── Facade ──────────────────────────────────────────────────────

export class WhatsApp {
  public readonly providers: ProvidersClient;
  public readonly templates: TemplatesClient;
  public readonly contacts: ContactsClient;
  public readonly messages: MessagesClient;
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.providers = new ProvidersClient(config);
    this.templates = new TemplatesClient(config);
    this.contacts = new ContactsClient(config);
    this.messages = new MessagesClient(config);
    this.config = config;
  }
}

export default WhatsApp;
