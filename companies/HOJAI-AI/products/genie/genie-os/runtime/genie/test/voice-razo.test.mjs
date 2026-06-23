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

  // === Phase 8: Memory-inbox + Universal-search + Serendipity wiring ===

  // genie-services health includes the 3 new specialists
  a('genie-services health lists genie-memory-inbox', health.data?.data?.services?.['genie-memory-inbox'] !== undefined);
  a('genie-services health lists genie-universal-search', health.data?.data?.services?.['genie-universal-search'] !== undefined);
  a('genie-services health lists genie-serendipity', health.data?.data?.services?.['genie-serendipity'] !== undefined);

  // Routes exist + auth-gated
  const inboxCapture = await req('POST', '/api/genie-inbox/capture', { content: 'remember this' });
  a('genie-inbox/capture requires auth (401)', inboxCapture.status === 401);

  const inboxRecent = await req('GET', '/api/genie-inbox/recent');
  a('genie-inbox/recent requires auth (401)', inboxRecent.status === 401);

  const searchNoQ = await req('GET', '/api/genie-search');
  a('genie-search requires auth (401)', searchNoQ.status === 401);

  const serendipity = await req('GET', '/api/genie-serendipity/random');
  a('genie-serendipity/random requires auth (401)', serendipity.status === 401);

  // === Phase 8 (cont.): Memory-graph + Relationship-os + Learning-os wiring ===

  // genie-services health includes the 3 new specialists
  a('genie-services health lists genie-memory-graph', health.data?.data?.services?.['genie-memory-graph'] !== undefined);
  a('genie-services health lists genie-relationship-os', health.data?.data?.services?.['genie-relationship-os'] !== undefined);
  a('genie-services health lists genie-learning-os', health.data?.data?.services?.['genie-learning-os'] !== undefined);

  // --- memory-graph ---
  const graph = await req('GET', '/api/genie-graph/user-1');
  a('genie-graph/:userId requires auth (401)', graph.status === 401);

  // --- relationship-os ---
  const relDash = await req('GET', '/api/genie-relationships/user-1/dashboard');
  a('genie-relationships/:userId/dashboard requires auth (401)', relDash.status === 401);

  const relInsights = await req('GET', '/api/genie-relationships/user-1/insights');
  a('genie-relationships/:userId/insights requires auth (401)', relInsights.status === 401);

  const relStale = await req('GET', '/api/genie-relationships/user-1/stale');
  a('genie-relationships/:userId/stale requires auth (401)', relStale.status === 401);

  const relPeople = await req('GET', '/api/genie-relationships/user-1/people');
  a('genie-relationships/:userId/people requires auth (401)', relPeople.status === 401);

  const relPeoplePost = await req('POST', '/api/genie-relationships/user-1/people', { name: 'Alice' });
  a('genie-relationships/:userId/people POST requires auth (401)', relPeoplePost.status === 401);

  const relInteract = await req('POST', '/api/genie-relationships/user-1/interactions', { personId: 'p-1', type: 'call' });
  a('genie-relationships/:userId/interactions requires auth (401)', relInteract.status === 401);

  const relReminders = await req('GET', '/api/genie-relationships/user-1/reminders');
  a('genie-relationships/:userId/reminders requires auth (401)', relReminders.status === 401);

  // --- learning-os ---
  const learnCurr = await req('GET', '/api/genie-learning/user-1/curriculum');
  a('genie-learning/:userId/curriculum requires auth (401)', learnCurr.status === 401);

  const learnBiz = await req('GET', '/api/genie-learning/business/curriculum');
  a('genie-learning/business/curriculum requires auth (401)', learnBiz.status === 401);

  const learnProgress = await req('GET', '/api/genie-learning/user-1/progress');
  a('genie-learning/:userId/progress requires auth (401)', learnProgress.status === 401);

  const learnRecs = await req('GET', '/api/genie-learning/user-1/recommendations');
  a('genie-learning/:userId/recommendations requires auth (401)', learnRecs.status === 401);

  const learnEnroll = await req('POST', '/api/genie-learning/user-1/enroll', { trackId: 't-1' });
  a('genie-learning/:userId/enroll requires auth (401)', learnEnroll.status === 401);

  const learnStart = await req('POST', '/api/genie-learning/user-1/course/c-1/start', {});
  a('genie-learning/:userId/course/:courseId/start requires auth (401)', learnStart.status === 401);

  // === Phase 9: Final 8 specialists wiring ===

  // genie-services health includes the 8 new specialists
  a('genie-services health lists genie-companion-service', health.data?.data?.services?.['genie-companion-service'] !== undefined);
  a('genie-services health lists genie-smart-forgetting-service', health.data?.data?.services?.['genie-smart-forgetting-service'] !== undefined);
  a('genie-services health lists genie-thinking-engine', health.data?.data?.services?.['genie-thinking-engine'] !== undefined);
  a('genie-services health lists genie-life-gps', health.data?.data?.services?.['genie-life-gps'] !== undefined);
  a('genie-services health lists genie-execution-engine', health.data?.data?.services?.['genie-execution-engine'] !== undefined);
  a('genie-services health lists genie-life-university', health.data?.data?.services?.['genie-life-university'] !== undefined);
  a('genie-services health lists genie-creation-os', health.data?.data?.services?.['genie-creation-os'] !== undefined);
  a('genie-services health lists genie-consultant-agent', health.data?.data?.services?.['genie-consultant-agent'] !== undefined);

  // --- companion-service ---
  const compStory = await req('GET', '/api/genie-companion/user-1/story');
  a('genie-companion/:userId/story requires auth (401)', compStory.status === 401);

  const compJournal = await req('GET', '/api/genie-companion/user-1/journal');
  a('genie-companion/:userId/journal GET requires auth (401)', compJournal.status === 401);

  const compJournalPost = await req('POST', '/api/genie-companion/user-1/journal', { content: 'today was great' });
  a('genie-companion/:userId/journal POST requires auth (401)', compJournalPost.status === 401);

  // --- thinking-engine ---
  const thinkProsCons = await req('POST', '/api/genie-thinking/decide/pros-cons', { question: 'should I move?' });
  a('genie-thinking/decide/pros-cons requires auth (401)', thinkProsCons.status === 401);

  const thinkGoNoGo = await req('POST', '/api/genie-thinking/decide/go-no-go', { question: 'should I invest?' });
  a('genie-thinking/decide/go-no-go requires auth (401)', thinkGoNoGo.status === 401);

  const thinkBrainstorm = await req('POST', '/api/genie-thinking/brainstorm', { topic: 'apps' });
  a('genie-thinking/brainstorm requires auth (401)', thinkBrainstorm.status === 401);

  const thinkSwot = await req('POST', '/api/genie-thinking/analyze/swot', { subject: 'product X' });
  a('genie-thinking/analyze/swot requires auth (401)', thinkSwot.status === 401);

  const thinkResearch = await req('POST', '/api/genie-thinking/research/summarize', { text: 'long text' });
  a('genie-thinking/research/summarize requires auth (401)', thinkResearch.status === 401);

  // --- life-gps ---
  const gpsFuture = await req('GET', '/api/genie-life-gps/user-1/future-self');
  a('genie-life-gps/:userId/future-self requires auth (401)', gpsFuture.status === 401);

  const gpsNext = await req('GET', '/api/genie-life-gps/user-1/next');
  a('genie-life-gps/:userId/next requires auth (401)', gpsNext.status === 401);

  const gpsGoals = await req('GET', '/api/genie-life-gps/user-1/goals');
  a('genie-life-gps/:userId/goals requires auth (401)', gpsGoals.status === 401);

  const gpsGoalsPost = await req('POST', '/api/genie-life-gps/user-1/goals', { title: 'retire at 50' });
  a('genie-life-gps/:userId/goals POST requires auth (401)', gpsGoalsPost.status === 401);

  // --- execution-engine ---
  const execTasks = await req('GET', '/api/genie-execution/user-1/tasks');
  a('genie-execution/:userId/tasks requires auth (401)', execTasks.status === 401);

  const execTasksPost = await req('POST', '/api/genie-execution/user-1/tasks', { title: 'finish report' });
  a('genie-execution/:userId/tasks POST requires auth (401)', execTasksPost.status === 401);

  const execAuto = await req('POST', '/api/genie-execution/user-1/automations/auto-1/run', {});
  a('genie-execution/:userId/automations/:id/run requires auth (401)', execAuto.status === 401);

  // --- life-university ---
  const uni = await req('GET', '/api/genie-university/user-1');
  a('genie-university/:userId requires auth (401)', uni.status === 401);

  const uniCourses = await req('GET', '/api/genie-university/courses');
  a('genie-university/courses requires auth (401)', uniCourses.status === 401);

  const uniComplete = await req('POST', '/api/genie-university/courses/c-1/lessons/l-1/complete', {});
  a('genie-university/courses/:courseId/lessons/:lessonId/complete requires auth (401)', uniComplete.status === 401);

  const uniVerify = await req('GET', '/api/genie-university/verify/ver-1');
  a('genie-university/verify/:verificationId requires auth (401)', uniVerify.status === 401);

  // --- creation-os ---
  const createTts = await req('POST', '/api/genie-creation/tts', { text: 'hello' });
  a('genie-creation/tts requires auth (401)', createTts.status === 401);

  const createPodcast = await req('POST', '/api/genie-creation/podcast', { topic: 'tech' });
  a('genie-creation/podcast requires auth (401)', createPodcast.status === 401);

  const createMusic = await req('POST', '/api/genie-creation/music', { mood: 'calm' });
  a('genie-creation/music requires auth (401)', createMusic.status === 401);

  const createVoiceover = await req('POST', '/api/genie-creation/voiceover', { script: 'hi' });
  a('genie-creation/voiceover requires auth (401)', createVoiceover.status === 401);

  const createProjects = await req('GET', '/api/genie-creation/user-1/projects');
  a('genie-creation/:userId/projects requires auth (401)', createProjects.status === 401);

  // --- consultant-agent ---
  const consult = await req('POST', '/api/genie-consult', { question: 'how do I scale my restaurant?' });
  a('genie-consult requires auth (401)', consult.status === 401);

  const consultDomains = await req('GET', '/api/genie-consult/domains');
  a('genie-consult/domains requires auth (401)', consultDomains.status === 401);

  const consultHistory = await req('GET', '/api/genie-consult/user-1/history');
  a('genie-consult/:userId/history requires auth (401)', consultHistory.status === 401);

  // --- smart-forgetting-service ---
  const forgetGet = await req('GET', '/api/genie-forgetting/config');
  a('genie-forgetting/config requires auth (401)', forgetGet.status === 401);

  const forgetPut = await req('PUT', '/api/genie-forgetting/config', { retentionDays: 90 });
  a('genie-forgetting/config PUT requires auth (401)', forgetPut.status === 401);

  const forgetPresets = await req('GET', '/api/genie-forgetting/presets');
  a('genie-forgetting/presets requires auth (401)', forgetPresets.status === 401);

  const forgetCleanup = await req('POST', '/api/genie-forgetting/cleanup', {});
  a('genie-forgetting/cleanup requires auth (401)', forgetCleanup.status === 401);

  // === Phase 9 (cont.): Aggregator + intent-engine integration ===

  // /api/genie/personal/:userId requires auth
  const personal = await req('GET', '/api/genie/personal/user-1');
  a('genie/personal/:userId requires auth (401)', personal.status === 401);

  // /api/genie/intent requires auth
  const intentAuth = await req('POST', '/api/genie/intent', { text: 'hi' });
  a('genie/intent requires auth (401)', intentAuth.status === 401);

  // Verify /api/ask still works (regression)
  const askQuick = await req('POST', '/api/ask', { question: 'remember this' });
  a('ask still works (no crash from intent-engine integration)', askQuick.status === 200 || askQuick.status === 401);

  // === Summary ===
  console.log(`\n${p} passed, ${f} failed`);
  server.close();
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => { console.error('TEST CRASH:', e); process.exit(1); });