/**
 * Structured output — extract a JSON object matching a schema from an LLM response.
 *
 * Wraps the provider's tool_use / response_format / responseSchema into a single
 * API so call sites can use any provider and any JSON schema.
 *
 * Usage:
 *   import { withStructuredOutput } from '@rtmn/shared/lib/llm';
 *   import { z } from 'zod';
 *
 *   const intentSchema = {
 *     type: 'object',
 *     properties: {
 *       intent: { type: 'string', enum: ['calendar.schedule', 'money.budget', ...] },
 *       entities: { type: 'object' },
 *       confidence: { type: 'number', minimum: 0, maximum: 1 },
 *     },
 *     required: ['intent', 'entities', 'confidence'],
 *   };
 *
 *   const result = await withStructuredOutput(llm, intentSchema, {
 *     messages: [{ role: 'user', content: 'Book meeting with Ahmed Tuesday' }],
 *   });
 *   // result = { intent: 'calendar.schedule', entities: { person: 'Ahmed', date: 'Tuesday' }, confidence: 0.92 }
 *
 * Provider behavior:
 *   - anthropic: uses tool_use with input_schema
 *   - openai:    uses response_format=json_schema with strict: true
 *   - google:    uses responseSchema with GENERATE_CONTENT
 *   - ollama:    uses format: 'json' with manual schema in prompt
 */

import { calculateCost } from './cost.js';

/**
 * Call the LLM with a JSON schema and return the parsed object.
 * The schema can be a JSON Schema object OR a Zod schema (auto-converted).
 */
export async function withStructuredOutput(llm, schema, { messages, ...options } = {}) {
  // Normalize Zod → JSON Schema if needed
  const jsonSchema = schema._def ? zodToJsonSchema(schema) : schema;

  // Provider-specific dispatch
  const providerHandlers = {
    anthropic: () => structuredAnthropic(llm, jsonSchema, { messages, ...options }),
    openai:    () => structuredOpenAI(llm, jsonSchema, { messages, ...options }),
    google:    () => structuredGoogle(llm, jsonSchema, { messages, ...options }),
    ollama:    () => structuredOllama(llm, jsonSchema, { messages, ...options }),
  };

  const handler = providerHandlers[llm.provider];
  if (!handler) throw new Error(`Structured output not supported for provider: ${llm.provider}`);

  const result = await handler();

  // Validate + return. If the LLM produced invalid JSON, throw a structured error.
  try {
    return JSON.parse(result.text);
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${result.text.slice(0, 200)}`);
  }
}

// === Provider-specific implementations ===

async function structuredAnthropic(llm, jsonSchema, { messages, ...options }) {
  // Anthropic uses tool_use. We define a single tool named "extract" that
  // takes the schema as input_schema, and force the model to use it.
  const tools = [{
    name: 'extract',
    description: 'Extract structured data matching the schema.',
    input_schema: jsonSchema,
  }];
  // System message hints to use the tool
  const sysMsg = {
    role: 'system',
    content: 'You must use the extract tool to return your answer as structured JSON. Do not respond with plain text.',
  };
  const messagesWithSys = messages[0]?.role === 'system' ? messages : [sysMsg, ...messages];

  const result = await llm.complete({
    messages: messagesWithSys,
    tools,
    tool_choice: { type: 'tool', name: 'extract' },
    ...options,
  });

  // Find the tool_use block
  // (For SDK parity — here we just look at the raw text since our adapter normalizes)
  return result;
}

async function structuredOpenAI(llm, jsonSchema, { messages, ...options }) {
  return llm.complete({
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'extract',
        schema: jsonSchema,
        strict: true,
      },
    },
    ...options,
  });
}

async function structuredGoogle(llm, jsonSchema, { messages, ...options }) {
  return llm.complete({
    messages,
    responseSchema: jsonSchema,
    responseMimeType: 'application/json',
    ...options,
  });
}

async function structuredOllama(llm, jsonSchema, { messages, ...options }) {
  // Ollama has no native structured output; inject schema into the system prompt
  const sysMsg = {
    role: 'system',
    content: `You must respond with a JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}\nRespond with ONLY the JSON object, no preamble or markdown.`,
  };
  const messagesWithSys = messages[0]?.role === 'system' ? messages : [sysMsg, ...messages];
  return llm.complete({ messages: messagesWithSys, format: 'json', ...options });
}

// === Zod → JSON Schema (minimal converter) ===
// In production, use `zod-to-json-schema` package. This is a fallback for environments
// without that dependency.

function zodToJsonSchema(zodSchema) {
  try {
    // Try to use zod-to-json-schema if available
    const mod = require('zod-to-json-schema');
    return mod.zodToJsonSchema(zodSchema);
  } catch {
    throw new Error('Zod schemas require zod-to-json-schema. Either install it or pass a plain JSON Schema object.');
  }
}