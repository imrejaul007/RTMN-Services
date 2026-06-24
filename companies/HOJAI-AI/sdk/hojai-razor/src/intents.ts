/**
 * RAZO Keyboard — Intent Router client.
 *
 * Detects intents from natural-language text, parses them into
 * structured parameters, validates against the schema, and executes
 * them by routing to the right Department/Industry OS or SUTAR agent.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';
import type { DetectedIntent, ParsedIntent, IntentDomain } from './types.js';

export interface DetectIntentRequest {
  text: string;
  userId?: string;
  sessionId?: string;
  /** Restrict detection to specific domains */
  domains?: IntentDomain[];
  /** Minimum confidence threshold (0-1); below this, returns null */
  minConfidence?: number;
}

export interface ExecuteIntentRequest {
  intentId: string;
  /** Optional parameter overrides */
  parameters?: Record<string, unknown>;
  /** Who is asking — for audit */
  userId?: string;
}

export class IntentRouterClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:${config.baseUrl?.includes('localhost') ? '4725' : extractPort(config)}` }; }

  /** Detect the intent(s) in a piece of natural-language text. */
  async detect(input: DetectIntentRequest): Promise<DetectedIntent | null> {
    return request<DetectedIntent | null>(this.config, 'POST', '/api/intents/detect', input);
  }

  /** Parse a detected intent into structured parameters ready for execution. */
  async parse(intent: DetectedIntent): Promise<ParsedIntent> {
    return request<ParsedIntent>(this.config, 'POST', '/api/intents/parse', intent);
  }

  /** Validate that an intent + parameters are complete and well-formed. */
  async validate(parsed: ParsedIntent): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    return request(this.config, 'POST', '/api/intents/validate', parsed);
  }

  /** Execute an intent — routes to the right SUTAR agent / Industry OS. */
  async execute(input: ExecuteIntentRequest): Promise<{ executionId: string; result: Record<string, unknown>; status: 'pending' | 'completed' | 'failed'; error?: string }> {
    return request(this.config, 'POST', '/api/intents/execute', input);
  }

  /** One-call helper: detect → parse → validate → execute (if valid). */
  async handleText(text: string, userId?: string): Promise<{
    intent: DetectedIntent;
    parsed?: ParsedIntent;
    executed?: { executionId: string; result: Record<string, unknown>; status: string };
    skipped?: string;
  }> {
    const intent = await this.detect({ text, userId });
    if (!intent) return { intent: null as any, skipped: 'no intent detected' };
    if (intent.confidence < 0.6) return { intent, skipped: `low confidence (${intent.confidence})` };
    const parsed = await this.parse(intent);
    const v = await this.validate(parsed);
    if (!v.valid) return { intent, parsed, skipped: `validation failed: ${v.errors.map(e => e.field).join(', ')}` };
    const executed = await this.execute({ intentId: parsed.id, parameters: parsed.parameters, userId });
    return { intent, parsed, executed };
  }
}

function extractPort(config: HojaiConfig): number {
  if (!config.baseUrl) return 4725;
  try {
    const u = new URL(config.baseUrl);
    if (u.port) return Number(u.port);
  } catch { /* */ }
  return 4725;
}
