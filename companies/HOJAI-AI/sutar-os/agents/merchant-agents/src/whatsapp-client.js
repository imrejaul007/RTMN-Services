/**
 * WhatsApp Channel Client — wires merchant-agents into WhatsApp OS (port 4860).
 *
 * When an agent needs to notify a customer (order confirmed, negotiation
 * complete, payment received), it sends a WhatsApp template message.
 *
 * Pattern mirrors rez-intel-client.js (same wire-in convention).
 *
 * Setup: WHATSAPP_OS_URL env var (default http://localhost:4860)
 * Toggle: WHATSAPP_ENABLED env var (default true)
 *
 * Graceful degradation: if WhatsApp OS is down, logs a warning and
 * returns null — never blocks agent decisions.
 */

const WHATSAPP_OS_URL = process.env.WHATSAPP_OS_URL || 'http://localhost:4860';
const WHATSAPP_TIMEOUT = parseInt(process.env.WHATSAPP_TIMEOUT_MS || '3000');
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED !== 'false';

/**
 * Switch the active WhatsApp provider.
 * Call once at startup or when the user changes their WhatsApp setup.
 *
 * @param {'360dialog'|'twilio'|'meta-cloud-api'|'mock'} provider
 */
async function switchProvider(provider) {
  if (!WHATSAPP_ENABLED) return { switched: false, reason: 'disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT);
  try {
    const res = await fetch(`${WHATSAPP_OS_URL}/api/providers/switch`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ provider })
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[whatsapp] provider switch failed: HTTP ${res.status}`);
      return { switched: false, reason: `HTTP ${res.status}` };
    }
    return { switched: true, provider };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[whatsapp] provider switch unavailable: ${err.message}`);
    return { switched: false, reason: err.message };
  }
}

/**
 * Send a templated WhatsApp message to a customer.
 * Templates are pre-approved WhatsApp Business API templates.
 *
 * @param {Object} opts
 * @param {string} opts.to          — phone number (E.164 format, e.g. +919876543210)
 * @param {string} opts.template   — template name (e.g. 'order_confirmed', 'payment_received')
 * @param {string[]} [opts.variables] — template variable values in order
 * @param {string} [opts.businessId]  — for logging which business sent this
 * @param {string} [opts.agentId]     — for logging which agent triggered this
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
async function sendTemplateMessage({ to, template, variables = [], businessId, agentId }) {
  if (!WHATSAPP_ENABLED) return { success: false, error: 'whatsapp-disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT);
  try {
    // 1. Render the template with variables
    const renderRes = await fetch(`${WHATSAPP_OS_URL}/api/templates/${template}/render`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ variables })
    });
    clearTimeout(timer);
    if (!renderRes.ok) {
      const err = await renderRes.text();
      return { success: false, error: `template-render-failed: ${err}` };
    }
    const { rendered } = await renderRes.json();

    // 2. Send the rendered message
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), WHATSAPP_TIMEOUT);
    const sendRes = await fetch(`${WHATSAPP_OS_URL}/api/messages/send`, {
      method: 'POST',
      signal: controller2.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ to, body: rendered, templateId: template })
    });
    clearTimeout(timer2);
    if (!sendRes.ok) {
      const err = await sendRes.text();
      return { success: false, error: `send-failed: ${err}` };
    }
    const data = await sendRes.json();
    console.log(`[whatsapp] sent ${template} to ${to} (id=${data.messageId || data.id}) agent=${agentId} business=${businessId}`);
    return { success: true, messageId: data.messageId || data.id };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[whatsapp] send unavailable: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Simulate an inbound WhatsApp webhook event.
 * Useful for testing agent reactions to incoming WhatsApp messages
 * without a real WhatsApp Business API account.
 *
 * @param {{ from: string, body: string, agentId?: string }} event
 */
async function simulateInbound({ from, body, agentId }) {
  if (!WHATSAPP_ENABLED) return { success: false, error: 'whatsapp-disabled' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT);
  try {
    const res = await fetch(`${WHATSAPP_OS_URL}/api/webhook/simulate`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOJAI_API_KEY || 'dev-key'}` },
      body: JSON.stringify({ from, body, agentId })
    });
    clearTimeout(timer);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true, ...(await res.json()) };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[whatsapp] simulate unavailable: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { switchProvider, sendTemplateMessage, simulateInbound };
