/**
 * Voice Channel Client — wires merchant-agents into Voice OS.
 *
 * Enables voice capabilities for agents:
 * - Text-to-speech announcements (e.g. "Your order is ready")
 * - Inbound voice call handling (agents receive voice calls)
 * - Voice agent routing (direct calls to the right agent role)
 *
 * Setup: VOICE_OS_URL env var (default http://localhost:4870)
 * Toggle: VOICE_ENABLED env var (default true)
 *
 * Graceful degradation: if Voice OS is down, logs a warning and
 * returns null — never blocks agent decisions.
 */

const VOICE_OS_URL = process.env.VOICE_OS_URL || 'http://localhost:4880';
const VOICE_TIMEOUT = parseInt(process.env.VOICE_TIMEOUT_MS || '5000');
const VOICE_ENABLED = process.env.VOICE_ENABLED !== 'false';

/**
 * Synthesize speech from text.
 *
 * @param {Object} opts
 * @param {string} opts.text          — text to synthesize
 * @param {string} [opts.lang='en-IN'] — BCP-47 language tag
 * @param {string} [opts.voice='female'] — 'male' | 'female'
 * @param {number} [opts.speed=1.0]   — speech rate multiplier
 * @param {string} [opts.agentId]     — for logging
 * @returns {{ success: boolean, audioUrl?: string, error?: string }}
 */
async function synthesize({ text, lang = 'en-IN', voice = 'female', speed = 1.0, agentId }) {
  if (!VOICE_ENABLED) return { success: false, error: 'voice-disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VOICE_TIMEOUT);
  try {
    const res = await fetch(`${VOICE_OS_URL}/api/v1/tts`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ text, lang, voice, speed })
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `tts-failed: ${err}` };
    }
    const data = await res.json();
    console.log(`[voice] synthesized ${text.length} chars for agent=${agentId}`);
    return { success: true, audioUrl: data.audioUrl || data.url };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[voice] synthesize unavailable: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Handle an inbound voice call routed to a specific agent.
 *
 * @param {{ from: string, agentId: string, context?: Object }} opts
 * @returns {{ success: boolean, callId?: string, error?: string }}
 */
async function routeInboundCall({ from, agentId, context = {} }) {
  if (!VOICE_ENABLED) return { success: false, error: 'voice-disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VOICE_TIMEOUT);
  try {
    const res = await fetch(`${VOICE_OS_URL}/api/v1/calls/inbound`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ from, agentId, context })
    });
    clearTimeout(timer);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    console.log(`[voice] inbound call ${data.callId} from ${from} → agent=${agentId}`);
    return { success: true, callId: data.callId };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[voice] inbound routing unavailable: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a voice call notification (ringless voicemail / missed call alert).
 * Uses a short synthesized message to alert the customer.
 *
 * @param {{ to: string, message: string, agentId?: string, businessId?: string }} opts
 */
async function sendVoiceAlert({ to, message, agentId, businessId }) {
  if (!VOICE_ENABLED) return { success: false, error: 'voice-disabled' };
  // Two-step: synthesize + then initiate call
  const tts = await synthesize({ text: message, agentId });
  if (!tts.success) return { success: false, error: tts.error };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VOICE_TIMEOUT);
  try {
    const res = await fetch(`${VOICE_OS_URL}/api/v1/calls/outbound`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ to, audioUrl: tts.audioUrl, agentId, businessId })
    });
    clearTimeout(timer);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: true, callId: data.callId };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[voice] outbound call unavailable: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { synthesize, routeInboundCall, sendVoiceAlert };
