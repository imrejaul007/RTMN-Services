/**
 * Voice OS + Voice Twin + RAZO Keyboard wiring tests for runtime/genie.
 *
 * These tests verify that the new routes are mounted and respond correctly
 * even when the downstream services are unreachable (graceful degradation).
 *
 * No MongoDB needed — we test the routing surface and the disabled flags.
 */

process.env.NODE_ENV = 'test';
process.env.SUPPRESS_LISTEN = '1';

import { app } from '../src/index.js';
import http from 'node:http';

let server;
let port;
let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

async function req(m, p, b) {
  return new Promise((resolve) => {
    const body = b ? JSON.stringify(b) : null;
    const r = http.request({
      host: '127.0.0.1', port, path: p, method: m,
      headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {},
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (body) r.write(body);
    r.end();
  });
}

async function run() {
  await new Promise((r) => { server = app.listen(0, r); });
  port = server.address().port;

  console.log('\n[Voice OS + RAZO wiring] tests:');

  // === Health check includes voice-os + razo ===
  const health = await req('GET', '/api/genie-services/health');
  a('genie-services health returns 200', health.status === 200);
  a('health includes voice_os_enabled flag', typeof health.data?.data?.voice_os_enabled === 'boolean');
  a('health includes razo_enabled flag', typeof health.data?.data?.razo_enabled === 'boolean');
  a('health lists voice-os service', health.data?.data?.services?.['voice-os'] !== undefined);
  a('health lists voice-commerce service', health.data?.data?.services?.['voice-commerce'] !== undefined);
  a('health lists voice-ai-service service', health.data?.data?.services?.['voice-ai-service'] !== undefined);
  a('health lists voice-twin service', health.data?.data?.services?.['voice-twin'] !== undefined);
  a('health lists razo-keyboard service', health.data?.data?.services?.['razo-keyboard'] !== undefined);

  // === /api/pios/health lists all 22 PIOS services ===
  const pios = await req('GET', '/api/pios/health');
  a('pios health returns 200', pios.status === 200);
  a('pios health lists 22 services', pios.data?.data?.total === 22);
  a('pios health lists intent-engine', pios.data?.data?.services?.['intent-engine'] !== undefined);
  a('pios health lists background-agents', pios.data?.data?.services?.['background-agents'] !== undefined);
  a('pios health lists long-running-tasks', pios.data?.data?.services?.['long-running-tasks'] !== undefined);

  // === Voice routes exist (POST routes need auth, so we expect 401) ===
  const synth = await req('POST', '/api/voice/synthesize', { text: 'hello' });
  a('voice/synthesize requires auth (401)', synth.status === 401);

  const transcribe = await req('POST', '/api/voice/transcribe', { audio: 'x' });
  a('voice/transcribe requires auth (401)', transcribe.status === 401);

  const nlu = await req('POST', '/api/voice/nlu/intent', { text: 'hi' });
  a('voice/nlu/intent requires auth (401)', nlu.status === 401);

  const calls = await req('POST', '/api/voice/calls', { to: '+1' });
  a('voice/calls requires auth (401)', calls.status === 401);

  const agentInvoke = await req('POST', '/api/voice/agents/agent-1/invoke', {});
  a('voice/agents/:id/invoke requires auth (401)', agentInvoke.status === 401);

  const commerce = await req('POST', '/api/voice/commerce/checkout', { item: 'x' });
  a('voice/commerce/checkout requires auth (401)', commerce.status === 401);

  // === Voice Twin routes (no USE_VOICE_OS gate) ===
  const vtProfiles = await req('GET', '/api/voice/twin/user-1/profiles');
  a('voice/twin/:userId/profiles requires auth (401)', vtProfiles.status === 401);

  const vtSynth = await req('POST', '/api/voice/twin/synthesize', { text: 'x' });
  a('voice/twin/synthesize requires auth (401)', vtSynth.status === 401);

  // === Wake-word pipeline (no auth on /api/voice/wake — internal flow) ===
  const wake = await req('POST', '/api/voice/wake', { userId: 'u-1', deviceId: 'd-1' });
  a('voice/wake returns 200', wake.status === 200);
  a('voice/wake returns a sessionId', typeof wake.data?.data?.sessionId === 'string' && wake.data.data.sessionId.startsWith('vsess_'));
  a('voice/wake returns audioEndpoint', wake.data?.data?.audioEndpoint === `/api/voice/wake/${wake.data.data.sessionId}/audio`);
  a('voice/wake status is listening', wake.data?.data?.status === 'listening');

  // === Wake-word session needs userId ===
  const wakeNoUser = await req('POST', '/api/voice/wake', { deviceId: 'd-1' });
  a('voice/wake without userId returns 400', wakeNoUser.status === 400);

  // === Wake audio route exists ===
  const audio = await req('POST', '/api/voice/wake/vsess_test/audio', { userId: 'u-1' });
  // Without Voice OS up, this should 503 (USE_VOICE_OS=false) or fail downstream
  // Just verify the route exists by checking it's not 404
  a('voice/wake/:sessionId/audio route exists (not 404)', audio.status !== 404);

  // === RAZO routes exist ===
  const razoIntent = await req('POST', '/api/razo/intent', { text: 'hi' });
  a('razo/intent requires auth (401)', razoIntent.status === 401);

  const razoSend = await req('POST', '/api/razo/send', { channel: 'whatsapp', to: '+1', text: 'hi' });
  a('razo/send requires auth (401)', razoSend.status === 401);

  const razoWebhook = await req('POST', '/api/razo/webhook', { event: 'message.delivered', messageId: 'm-1' });
  a('razo/webhook returns 200 (no auth needed)', razoWebhook.status === 200);
  a('razo/webhook acknowledges event', razoWebhook.data?.data?.received === true || razoWebhook.data?.success === true);

  const razoAsk = await req('POST', '/api/razo/ask-genie', { text: 'hi' });
  a('razo/ask-genie requires auth (401)', razoAsk.status === 401);

  // === PIOS routes exist ===
  const widget = await req('GET', '/api/pios/widget/user-1');
  a('pios/widget requires auth (401)', widget.status === 401);

  const piosHealthToday = await req('GET', '/api/pios/health/user-1/today');
  a('pios/health/:userId/today requires auth (401)', piosHealthToday.status === 401);

  const piosTasksToday = await req('GET', '/api/pios/tasks/user-1/today');
  a('pios/tasks/:userId/today requires auth (401)', piosTasksToday.status === 401);

  const piosAgentsList = await req('GET', '/api/pios/agents/user-1/agents');
  a('pios/agents/:userId/agents requires auth (401)', piosAgentsList.status === 401);

  const piosSkillsCatalog = await req('GET', '/api/pios/skills/catalog');
  a('pios/skills/catalog requires auth (401)', piosSkillsCatalog.status === 401);

  const piosLrtTasks = await req('GET', '/api/pios/lrt/user-1/tasks');
  a('pios/lrt/:userId/tasks requires auth (401)', piosLrtTasks.status === 401);

  // === /api/voice/wake with no UserId returns 400 ===
  // (already covered above, but explicit)
  a('voice/wake rejects missing userId', wakeNoUser.data?.error?.code === 'INVALID_INPUT');

  // === Summary ===
  console.log(`\n${p} passed, ${f} failed`);
  server.close();
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => { console.error('TEST CRASH:', e); process.exit(1); });