/**
 * Cost tracking for LLM calls.
 *
 * Per-model USD pricing (per 1M tokens). Override via env if you have a custom deal.
 *
 * Sources:
 *   - Anthropic: https://docs.anthropic.com/en/docs/about-claude/pricing
 *   - OpenAI: https://openai.com/api/pricing/
 *   - Google: https://ai.google.dev/pricing
 *   - Ollama: free (local) — 0.00
 */

const MODEL_PRICING = {
  // Anthropic Claude 4.5 family (Jan 2026)
  'claude-haiku-4-5-20251001':  { input: 1.00, output: 5.00 },
  'claude-sonnet-4-6':          { input: 3.00, output: 15.00 },
  'claude-opus-4-8':            { input: 15.00, output: 75.00 },
  // OpenAI GPT-5 family
  'gpt-5-mini':                 { input: 0.25, output: 2.00 },
  'gpt-5':                      { input: 2.50, output: 10.00 },
  'gpt-5-pro':                  { input: 15.00, output: 60.00 },
  // Google Gemini 3 family
  'gemini-3-flash':             { input: 0.075, output: 0.30 },
  'gemini-3-pro':               { input: 1.25, output: 5.00 },
  // Ollama (local) — no cost
  'llama-3.3-70b':              { input: 0.00, output: 0.00 },
  'llama-3.3-8b':               { input: 0.00, output: 0.00 },
};

const DEFAULT_PRICING = { input: 1.00, output: 3.00 };

/**
 * Calculate cost in USD for a given model + token usage.
 * inputTokens + outputTokens → { inputUsd, outputUsd, totalUsd }.
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;

  // Allow env override for negotiated rates
  if (process.env.LLM_COST_INPUT_OVERRIDE_USD) {
    pricing = { ...pricing, input: parseFloat(process.env.LLM_COST_INPUT_OVERRIDE_USD) };
  }
  if (process.env.LLM_COST_OUTPUT_OVERRIDE_USD) {
    pricing = { ...pricing, output: parseFloat(process.env.LLM_COST_OUTPUT_OVERRIDE_USD) };
  }

  const inputUsd = (inputTokens / 1_000_000) * pricing.input;
  const outputUsd = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputUsd: Math.round(inputUsd * 1_000_000) / 1_000_000,   // round to micro-USD
    outputUsd: Math.round(outputUsd * 1_000_000) / 1_000_000,
    totalUsd: Math.round((inputUsd + outputUsd) * 1_000_000) / 1_000_000,
  };
}

export { MODEL_PRICING };